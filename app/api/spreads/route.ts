import { NextRequest, NextResponse } from 'next/server'
import { getFuturesCurve, SPREAD_INSTRUMENTS, isMCXMarketOpen } from '@/lib/options'
import { nextMCXSessionOpenISO } from '@/lib/marketSchedule'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const revalidate = 0

// Futures curve + adjacent-month calendar spreads for one commodity. Public by
// design: the spread table is the free tier of the Strategy Builder's Spreads
// tab (the calculator and margin on top of it are Pro). Live prices only —
// nothing is stored or replayed from history.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const instrument = searchParams.get('instrument')?.toUpperCase()

  if (!instrument || !SPREAD_INSTRUMENTS.includes(instrument)) {
    return NextResponse.json(
      { error: `Invalid instrument. Valid: ${SPREAD_INSTRUMENTS.join(', ')}` },
      { status: 400 },
    )
  }

  try {
    const payload = await getFuturesCurve(instrument)
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=10' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Spreads API]', msg)

    const status = msg === 'Kite credentials not configured' ? 503
      : msg.startsWith('No futures contracts found') ? 404
      : 500
    const publicMsg = msg.startsWith('No futures contracts found')
      ? msg
      : 'Spread data is temporarily unavailable. Please check back shortly.'
    const nextOpenAt = isMCXMarketOpen() ? null : nextMCXSessionOpenISO()
    return NextResponse.json({ error: publicMsg, nextOpenAt }, { status })
  }
}
