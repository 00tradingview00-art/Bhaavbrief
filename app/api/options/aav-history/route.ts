import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isProUser } from '@/lib/subscription'
import { KiteClient, getFullMCXInstrumentsCached } from '@/lib/kite'
import { computeRollingAAV } from '@/lib/vix'
import { MCX_INSTRUMENTS } from '@/lib/options'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

/**
 * Realized Volatility (AAV) history — unlike ATM IV, this can be reconstructed
 * for any past date from ordinary daily futures closes, so it needs no snapshot
 * pipeline. ~200 calendar days back is the lookback empirically confirmed
 * working against Kite's MCX continuous-futures history elsewhere in this repo
 * (scripts/compute-event-impact.mjs).
 */
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!await isProUser(userId)) {
    return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const instrument = searchParams.get('instrument')?.toUpperCase()

  if (!instrument || !MCX_INSTRUMENTS[instrument]) {
    return NextResponse.json(
      { error: `Invalid instrument. Valid: ${Object.keys(MCX_INSTRUMENTS).join(', ')}` },
      { status: 400 },
    )
  }
  if (!process.env.KITE_API_KEY || !process.env.KITE_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Kite credentials not configured' }, { status: 500 })
  }

  try {
    const instruments = await getFullMCXInstrumentsCached()
    const front = KiteClient.findFrontMonth(instruments, instrument)
    if (!front) {
      return NextResponse.json({ instrument, history: [] })
    }

    const kc = new KiteClient(process.env.KITE_API_KEY, process.env.KITE_ACCESS_TOKEN)
    const toDate   = new Date(); toDate.setDate(toDate.getDate() - 1)
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - 200)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)

    const candles = await kc.getHistorical(front.instrument_token, 'day', fmt(fromDate), fmt(toDate))
    const closes  = candles.map(c => ({ date: c.date, price: c.price }))
    const history = computeRollingAAV(closes, 20)

    return NextResponse.json({ instrument, history }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' },
    })
  } catch (e) {
    console.error('[aav-history] error:', (e as Error).message)
    return NextResponse.json({ error: 'Failed to compute realized volatility history' }, { status: 500 })
  }
}
