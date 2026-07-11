import { NextResponse } from 'next/server'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const instrument = searchParams.get('instrument')?.toUpperCase()
  const requestedExpiry = searchParams.get('expiry') ?? null

  if (!instrument || !MCX_INSTRUMENTS[instrument]) {
    return NextResponse.json(
      { error: `Invalid instrument. Valid: ${Object.keys(MCX_INSTRUMENTS).join(', ')}` },
      { status: 400 },
    )
  }

  try {
    const payload = await getOptionsChain(instrument, requestedExpiry)
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=10' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[MCX Options API]', msg)
    const status = msg === 'Kite credentials not configured' ? 503 : msg.startsWith('No options found') ? 404 : 500
    const publicMsg = msg.startsWith('No options found')
      ? msg
      : 'Option chain data is temporarily unavailable. Please check back shortly.'
    return NextResponse.json({ error: publicMsg }, { status })
  }
}
