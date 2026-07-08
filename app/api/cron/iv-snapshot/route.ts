import { NextResponse } from 'next/server'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import { redisCommand, todayIST } from '@/lib/redis'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

/**
 * Daily EOD snapshot of ATM implied volatility, per MCX instrument.
 * ATM IV = average of the ATM strike's Call IV and Put IV (nearest-expiry chain).
 * Written to a Redis hash `iv-hist:{instrument}` keyed by IST trading date,
 * so /api/options/iv-history can serve a 5/10/30/60-day series with zero backfill lag.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = todayIST()
  const results: Record<string, number | string> = {}

  for (const instrument of Object.keys(MCX_INSTRUMENTS)) {
    try {
      const { chain, futurePrice } = await getOptionsChain(instrument)
      if (!(futurePrice > 0)) { results[instrument] = 'skipped (no futures price)'; continue }

      const atmIVs = chain
        .filter(r => r.isATM)
        .flatMap(r => [r.CE.iv, r.PE.iv])
        .filter((v): v is number => v != null && v > 0)

      if (!atmIVs.length) { results[instrument] = 'skipped (no ATM IV)'; continue }

      const atmIV = parseFloat((atmIVs.reduce((s, v) => s + v, 0) / atmIVs.length).toFixed(2))
      await redisCommand('hset', `iv-hist:${instrument}`, date, String(atmIV))
      results[instrument] = atmIV
    } catch (e) {
      results[instrument] = `error: ${(e as Error).message}`
    }
  }

  console.log('[cron/iv-snapshot]', date, results)
  return NextResponse.json({ ok: true, date, results })
}
