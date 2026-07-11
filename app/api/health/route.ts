import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { loadSnapshot, snapshotAgeMinutes, isMCXOpenNow } from '@/lib/snapshot'

export const runtime    = 'nodejs'
export const dynamic    = 'force-dynamic'
export const revalidate = 0

// Matches the amber/grey thresholds already used in lib/snapshot.ts snapshotToPriceData —
// keep these in sync, don't invent a second definition of "stale".
const SNAPSHOT_STALE_MARKET_OPEN_MIN   = 120
const SNAPSHOT_STALE_MARKET_CLOSED_MIN = 720

// Public promise is 9:30 AM IST; generation cron fires ~9:00 AM IST with a 30min buffer
// for GH Actions scheduling lag. 10:00 AM gives another 30min before alerting.
const BRIEF_DEADLINE_IST_MINUTES = 10 * 60

// intelligence-engine.yml runs every 15-30min during MCX hours; >60min silent during
// market hours means the pipeline is stuck, not just between runs.
const ENGINE_STALE_MARKET_OPEN_MIN = 60

function todayIST(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function istMinutesSinceMidnight(): number {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  return ist.getHours() * 60 + ist.getMinutes()
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + 'T00:00:00+05:30').getDay()
  return day === 0 || day === 6
}

function loadJSON<T>(relPath: string): T | null {
  try {
    const file = path.join(process.cwd(), relPath)
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T
  } catch { return null }
}

function checkSnapshot() {
  try {
    const snap = loadSnapshot()
    if (!snap) return { ok: false, reason: 'market-snapshot.json missing' }
    const ageMinutes  = snapshotAgeMinutes(snap)
    const marketOpen  = isMCXOpenNow()
    const threshold   = marketOpen ? SNAPSHOT_STALE_MARKET_OPEN_MIN : SNAPSHOT_STALE_MARKET_CLOSED_MIN
    return {
      ok: ageMinutes <= threshold,
      ageMinutes: Math.round(ageMinutes),
      marketOpen,
      generatedAtIST: snap.generatedAtIST,
    }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'unknown error' }
  }
}

function checkBrief() {
  try {
    const today = todayIST()

    if (isWeekend(today)) return { ok: true, reason: 'weekend, no brief expected' }

    const holidays = loadJSON<Array<{ date: string }>>('data/market-holidays.json') ?? []
    if (holidays.some(h => h.date === today)) return { ok: true, reason: 'market holiday, no brief expected' }

    if (istMinutesSinceMidnight() < BRIEF_DEADLINE_IST_MINUTES) {
      return { ok: true, reason: 'before 10:00 AM IST deadline' }
    }

    // content-index.json is rebuilt on every generate-brief.yml run — the reliable
    // source of truth. data/daily-brief-state.json is orphaned (generate-brief.js no
    // longer writes it) and must NOT be used here.
    const index = loadJSON<Array<{ type: string; date: string }>>('data/content-index.json')
    if (!index) return { ok: false, reason: 'content-index.json missing' }

    const latestBriefDate = index
      .filter(e => e.type === 'brief')
      .map(e => e.date.slice(0, 10))
      .sort()
      .pop() ?? null

    return { ok: latestBriefDate === today, latestBriefDate, today }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'unknown error' }
  }
}

function checkEngine() {
  try {
    const state = loadJSON<{ lastChecked?: string }>('data/engine-state.json')
    if (!state?.lastChecked) return { ok: false, reason: 'engine-state.json missing lastChecked' }

    const ageMinutes = (Date.now() - new Date(state.lastChecked).getTime()) / 60000
    const marketOpen = isMCXOpenNow()
    const stale       = marketOpen && ageMinutes > ENGINE_STALE_MARKET_OPEN_MIN

    return { ok: !stale, ageMinutes: Math.round(ageMinutes), marketOpen }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'unknown error' }
  }
}

export async function GET() {
  const checks = {
    snapshot: checkSnapshot(),
    brief:    checkBrief(),
    engine:   checkEngine(),
  }

  const ok = checks.snapshot.ok && checks.brief.ok && checks.engine.ok

  return NextResponse.json(
    { ok, checks, timestamp: new Date().toISOString() },
    {
      status: ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag':  'noindex',
      },
    },
  )
}
