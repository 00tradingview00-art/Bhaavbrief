import { NextResponse } from 'next/server'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import { redisCommand, todayIST } from '@/lib/redis'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

/**
 * Daily EOD snapshot of ATM implied volatility, per MCX instrument.
 * ATM IV = average of the nearest LIVE-tier strike's Call IV and Put IV
 * (nearest-expiry chain). Written to a Redis hash `iv-hist:{instrument}` keyed
 * by IST trading date, so /api/options/iv-history can serve a 5/10/30/60-day
 * series with zero backfill lag.
 */

// Mirrors the client-side fallback in components/mcx/OptionChain.tsx
// (IVHistoryChart): the ATM strike's own IV is only trustworthy when at least
// one side classified LIVE (traded today, tight two-sided spread) — a
// STALE-tier side still gets a Black-76 IV computed from a thin/stale quote
// and can be wildly wrong (2026-07-21, Silver: a clean 37% LIVE call averaged
// with a stale ~95% put read as "66%"). This route previously averaged
// CE.iv/PE.iv straight off the ATM row with no tier check at all, so a bad
// ATM print could get written into Redis permanently rather than just
// flashing on one page load. Walk outward from the ATM row to the nearest
// strike with a LIVE side instead of averaging non-LIVE data.
function nearestLiveATMIV(chain: Awaited<ReturnType<typeof getOptionsChain>>['chain']): number | null {
  const atmIdx = chain.findIndex(r => r.isATM)
  if (atmIdx === -1) return null

  const order = chain.map((_, i) => i).sort((a, b) => Math.abs(a - atmIdx) - Math.abs(b - atmIdx))
  for (const idx of order) {
    const row = chain[idx]
    const ivs = [row.CE, row.PE]
      .filter(side => side.tier === 'LIVE' && side.iv != null && side.iv > 0)
      .map(side => side.iv as number)
    if (ivs.length) return parseFloat((ivs.reduce((s, v) => s + v, 0) / ivs.length).toFixed(2))
  }
  return null
}

// Most recent stored IV for an instrument, or null if none exists yet.
async function mostRecentIV(instrument: string): Promise<number | null> {
  const raw = await redisCommand('hgetall', `iv-hist:${instrument}`) as string[] | null
  if (!raw) return null
  const entries: { date: string; iv: number }[] = []
  for (let i = 0; i < raw.length; i += 2) {
    const iv = parseFloat(raw[i + 1])
    if (!isNaN(iv)) entries.push({ date: raw[i], iv })
  }
  if (!entries.length) return null
  entries.sort((a, b) => b.date.localeCompare(a.date))
  return entries[0].iv
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    // A rejected invocation here writes nothing to Redis and returns before
    // the results-logging line below ever runs, so this was previously the
    // one failure mode in this route with zero trace in Vercel function logs
    // — a missing/rotated CRON_SECRET could silently blank out days of IV
    // history with nothing to grep for.
    console.error('[cron/iv-snapshot] Unauthorized —', process.env.CRON_SECRET ? 'bearer token mismatch' : 'CRON_SECRET not set')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = todayIST()
  const results: Record<string, number | string> = {}

  for (const instrument of Object.keys(MCX_INSTRUMENTS)) {
    try {
      const { chain, futurePrice } = await getOptionsChain(instrument)
      if (!(futurePrice > 0)) {
        const carried = await mostRecentIV(instrument)
        if (carried != null) {
          await redisCommand('hset', `iv-hist:${instrument}`, date, String(carried))
          results[instrument] = `carried-forward: ${carried} (no futures price today)`
        } else {
          results[instrument] = 'skipped (no futures price, no prior history to carry forward)'
        }
        continue
      }

      const atmIV = nearestLiveATMIV(chain)

      if (atmIV == null) {
        const carried = await mostRecentIV(instrument)
        if (carried != null) {
          await redisCommand('hset', `iv-hist:${instrument}`, date, String(carried))
          results[instrument] = `carried-forward: ${carried} (no LIVE-tier ATM IV today)`
        } else {
          results[instrument] = 'skipped (no LIVE-tier ATM IV, no prior history to carry forward)'
        }
        continue
      }

      await redisCommand('hset', `iv-hist:${instrument}`, date, String(atmIV))
      results[instrument] = atmIV
    } catch (e) {
      // Same silent-gap problem as the skip branches above (e.g. an expired
      // Kite session throws here rather than returning futurePrice = 0) —
      // carry the last known value forward instead of losing the day.
      const carried = await mostRecentIV(instrument).catch(() => null)
      if (carried != null) {
        await redisCommand('hset', `iv-hist:${instrument}`, date, String(carried)).catch(() => {})
        results[instrument] = `carried-forward: ${carried} (error: ${(e as Error).message})`
      } else {
        results[instrument] = `error: ${(e as Error).message}`
      }
    }
  }

  console.log('[cron/iv-snapshot]', date, results)
  return NextResponse.json({ ok: true, date, results })
}
