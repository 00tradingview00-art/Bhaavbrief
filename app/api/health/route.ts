import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { loadSnapshot, snapshotAgeMinutes, isMCXOpenNow } from '@/lib/snapshot'
import { todayIST, isTradingDay, toISTDate, istMinutesSinceMidnight, BRIEF_DEADLINE_IST_MINUTES } from '@/lib/tradingCalendar'

export const runtime    = 'nodejs'
export const dynamic    = 'force-dynamic'
export const revalidate = 0

// Matches the amber/grey thresholds already used in lib/snapshot.ts snapshotToPriceData —
// keep these in sync, don't invent a second definition of "stale".
const SNAPSHOT_STALE_MARKET_OPEN_MIN   = 120
const SNAPSHOT_STALE_MARKET_CLOSED_MIN = 720

// intelligence-engine.yml runs every 15-30min during MCX hours; >60min silent during
// market hours means the pipeline is stuck, not just between runs.
const ENGINE_STALE_MARKET_OPEN_MIN = 60

// Code-review follow-up: todayIST/isWeekend/holiday-loading used to be
// reimplemented inline here, a third copy of logic that also lives in
// scripts/lib/holidays.js and lib/tradingCalendar.ts. Now imported from
// lib/tradingCalendar.ts, which fixes a real bug this duplication caused:
// isWeekend anchored on `dateStr + 'T00:00:00+05:30'` (midnight IST), which
// falls on the PREVIOUS calendar day in UTC — under Vercel's UTC-default
// runtime, `.getDay()` on that returned the previous day's weekday. Verified
// concretely: a real Monday (2026-07-20) evaluated as Sunday, so this health
// check has been silently unable to detect a missing Monday brief. See
// lib/tradingCalendar.ts for the full writeup and the fix (isTradingDay,
// which delegates to scripts/lib/holidays.js's already-correct anchor).

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

    if (!isTradingDay(today)) return { ok: true, reason: 'weekend or market holiday, no brief expected' }

    if (istMinutesSinceMidnight() < BRIEF_DEADLINE_IST_MINUTES) {
      return { ok: true, reason: 'before deadline' }
    }

    // content-index.json is rebuilt on every generate-brief.yml run — the reliable
    // source of truth. data/daily-brief-state.json is orphaned (generate-brief.js no
    // longer writes it) and must NOT be used here.
    const index = loadJSON<Array<{ type: string; date: string }>>('data/content-index.json')
    if (!index) return { ok: false, reason: 'content-index.json missing' }

    // toISTDate, not a raw slice(0,10) — the raw UTC slice was the same
    // date-basis bug fixed elsewhere in this pass (see lib/tradingCalendar.ts).
    const latestBriefDate = index
      .filter(e => e.type === 'brief')
      .map(e => toISTDate(e.date))
      .filter((d): d is string => d !== null)
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
