import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import { isProUser } from '@/lib/subscription'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const revalidate = 0

type ChainRow = {
  strike: number
  isATM?: boolean
  CE: Record<string, unknown>
  PE: Record<string, unknown>
}

type OptionsPayload = {
  chain: ChainRow[]
  [key: string]: unknown
}

// Strips Greeks and limits chain to ATM ±5 strikes for unauthenticated / non-Pro.
// Returns truncated data (not 403) because MarketsClient.tsx fetches this route
// client-side without auth for the embedded preview on the Markets page.
function limitChainForFree(payload: OptionsPayload): OptionsPayload {
  const atmIdx = payload.chain.findIndex(r => r.isATM)
  const start = Math.max(0, atmIdx - 5)
  const end   = Math.min(payload.chain.length, atmIdx + 6)
  const sliced = payload.chain.slice(start, end)

  const stripped = sliced.map(row => ({
    ...row,
    CE: { ...row.CE, delta: null, gamma: null, theta: null, vega: null },
    PE: { ...row.PE, delta: null, gamma: null, theta: null, vega: null },
  }))

  return { ...payload, chain: stripped }
}

export async function GET(request: NextRequest) {
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
    let payload = await getOptionsChain(instrument, requestedExpiry) as OptionsPayload

    const { userId } = await auth()
    const pro = await isProUser(userId)
    if (!pro) {
      payload = limitChainForFree(payload)
    }

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
