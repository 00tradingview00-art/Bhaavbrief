import { NextResponse } from 'next/server'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import { redisCommand, todayIST } from '@/lib/redis'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

// TTL: 90 days in seconds
const TTL_SECONDS = 90 * 24 * 60 * 60

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
      results[instrument] = `error: ${(e as Error).message}`
    }
  }

  console.log('[cron/oi-snapshot]', date, results)
  return NextResponse.json({ ok: true, date, results })
}
