import { NextResponse } from 'next/server'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import { redisCommand, todayIST } from '@/lib/redis'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

// TTL: 90 days in seconds
const TTL_SECONDS = 90 * 24 * 60 * 60

// Days to look back for a prior snapshot to carry forward — mirrors
// iv-snapshot's mostRecentIV() fallback, which exists because a stale Kite
// token or transient API error otherwise leaves a permanent, silent gap in
// the "90-day" history this data backs (components/mcx/OIBuildupChart.tsx).
// Unlike iv-hist (one Redis hash per instrument, cheap to scan in full),
// oi-snap is one key per instrument per day, so this is a bounded backward
// scan rather than an unbounded one — 14 days is far more than enough to
// bridge any real outage without a per-cron-run cost blowup.
const CARRY_FORWARD_LOOKBACK_DAYS = 14

async function mostRecentOISnapshot(instrument: string, fromDate: string): Promise<string | null> {
  const from = new Date(fromDate)
  for (let i = 1; i <= CARRY_FORWARD_LOOKBACK_DAYS; i++) {
    const d = new Date(from)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const raw = await redisCommand('get', `oi-snap:${instrument}:${dateStr}`) as string | null
    if (raw) return raw
  }
  return null
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[cron/oi-snapshot] Unauthorized —', process.env.CRON_SECRET ? 'bearer token mismatch' : 'CRON_SECRET not set')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = todayIST()
  const results: Record<string, string | number> = {}

  for (const instrument of Object.keys(MCX_INSTRUMENTS)) {
    try {
      const { chain, expiry } = await getOptionsChain(instrument)

      // Top-10 OI strikes by combined CE+PE OI
      const top = chain
        .map(r => ({ strike: r.strike, ceOI: r.CE.oi, peOI: r.PE.oi, total: r.CE.oi + r.PE.oi }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map(({ strike, ceOI, peOI }) => ({ strike, ceOI, peOI }))

      const key   = `oi-snap:${instrument}:${date}`
      const value = JSON.stringify({ expiry, chain: top })
      await redisCommand('set', key, value, 'EX', String(TTL_SECONDS))

      results[instrument] = top.length
    } catch (e) {
      // Same silent-gap failure mode iv-snapshot already had to fix — an
      // expired Kite session throws here rather than returning empty data.
      // Carry the last known snapshot forward instead of losing the day.
      const carried = await mostRecentOISnapshot(instrument, date).catch(() => null)
      if (carried != null) {
        await redisCommand('set', `oi-snap:${instrument}:${date}`, carried, 'EX', String(TTL_SECONDS)).catch(() => {})
        results[instrument] = `carried-forward (error: ${(e as Error).message})`
      } else {
        results[instrument] = `error: ${(e as Error).message}`
      }
    }
  }

  console.log('[cron/oi-snapshot]', date, results)
  return NextResponse.json({ ok: true, date, results })
}
