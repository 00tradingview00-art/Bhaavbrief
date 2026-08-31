import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import { cacheOptionsChain, getCachedOptionsChain } from '@/lib/optionsChainCache'
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

  const { userId } = await auth()
  const pro = await isProUser(userId)

  try {
    const rawPayload = await getOptionsChain(instrument, requestedExpiry) as OptionsPayload

    // Cache only the default (nearest-expiry) chain as the fallback — an
    // explicit ?expiry= request is a less common case and not worth a cache
    // key per expiry for what's meant to be a last-known-good safety net.
    // Cache the full payload, before free-tier limiting is applied below.
    if (requestedExpiry === null) {
      void cacheOptionsChain(instrument, rawPayload)
    }

    let payload = rawPayload
    if (!pro) {
      payload = limitChainForFree(payload)
    }

    return NextResponse.json(payload, {
      headers: {
        // Only the free/anonymous response is identical for every visitor and
        // safe to share-cache at the edge. The Pro (full-chain) response must
        // never be shared-cached — a cache hit skips this handler entirely,
        // which would otherwise let a free user transiently receive full
        // Greeks data (or a Pro user get the truncated free view) at this URL.
        'Cache-Control': pro ? 'private, no-store' : 'public, s-maxage=30, stale-while-revalidate=10',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[MCX Options API]', msg)

    // "No options found"/invalid instrument are real errors, not staleness —
    // no fallback makes sense for those. Everything else (expired Kite token,
    // API outage) is exactly what the last-known-good cache exists for.
    if (!msg.startsWith('No options found') && requestedExpiry === null) {
      const cached = await getCachedOptionsChain(instrument)
      if (cached && Array.isArray(cached.chain)) {
        let payload = { ...cached, stale: true } as unknown as OptionsPayload
        if (!pro) {
          payload = limitChainForFree(payload)
        }
        return NextResponse.json(payload, {
          headers: {
            'Cache-Control': pro ? 'private, no-store' : 'public, s-maxage=30, stale-while-revalidate=10',
            'X-Chain-Source': 'stale-cache',
          },
        })
      }
    }

    const status = msg === 'Kite credentials not configured' ? 503 : msg.startsWith('No options found') ? 404 : 500
    const publicMsg = msg.startsWith('No options found')
      ? msg
      : 'Option chain data is temporarily unavailable. Please check back shortly.'
    return NextResponse.json({ error: publicMsg }, { status })
  }
}
