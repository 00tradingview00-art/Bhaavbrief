import { NextRequest, NextResponse } from 'next/server'
import { getFuturesOnlyChain, FUTURES_ONLY_INSTRUMENTS, isMCXMarketOpen } from '@/lib/options'
import { nextMCXSessionOpenISO } from '@/lib/marketSchedule'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const revalidate = 0

// Companion to /api/options for instruments that structurally have no
// options chain (Electricity today) — see lib/options.ts's
// FUTURES_ONLY_INSTRUMENTS comment for why this is a separate path rather
// than a branch on MCX_INSTRUMENTS. Used only by the Strategy Builder's
// futures-only mode; there is nothing here to Pro-gate or chain-limit since
// there are no strikes/Greeks to strip.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const instrument = searchParams.get('instrument')?.toUpperCase()
  const requestedExpiry = searchParams.get('expiry') ?? null

  if (!instrument || !FUTURES_ONLY_INSTRUMENTS[instrument]) {
    return NextResponse.json(
      { error: `Invalid instrument. Valid: ${Object.keys(FUTURES_ONLY_INSTRUMENTS).join(', ')}` },
      { status: 400 },
    )
  }

  try {
    const payload = await getFuturesOnlyChain(instrument, requestedExpiry)
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=10' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[MCX Futures-Only API]', msg)

    const status = msg === 'Kite credentials not configured' ? 503
      : msg.startsWith('No futures contracts found') ? 404
      : 500
    const publicMsg = msg.startsWith('No futures contracts found')
      ? msg
      : 'Futures price data is temporarily unavailable. Please check back shortly.'
    const nextOpenAt = isMCXMarketOpen() ? null : nextMCXSessionOpenISO()
    return NextResponse.json({ error: publicMsg, nextOpenAt }, { status })
  }
}
