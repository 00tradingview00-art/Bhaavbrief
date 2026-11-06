import { NextRequest, NextResponse } from 'next/server'
import { getPrices } from '@/lib/prices'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'
import { checkFixedWindowRateLimit, getClientIp } from '@/lib/rateLimit'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const revalidate = 0

// Generous enough for many concurrent visitors behind one IP polling every
// 30s (the frontend's own cadence during market hours) — only a real flood
// of distinct requests exceeds this.
const RATE_LIMIT = Number(process.env.PRICES_RATE_LIMIT ?? 750)

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  if (!(await checkFixedWindowRateLimit(`rl:prices:${ip}`, RATE_LIMIT, 60))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Live Kite path — full OHLC + volume + OI, all 9 MCX + 4 CDS pairs
  const live = await getPrices()
  if (live) {
    return NextResponse.json(live, {
      headers: {
        'Cache-Control':  'public, s-maxage=15, stale-while-revalidate=5',
        'X-Price-Source': live.source,
        'X-Market-Open':  String(live.marketOpen),
      },
    })
  }

  // Snapshot fallback — when Kite token is expired or API is down
  const snap = loadSnapshot()
  if (snap) {
    const prices = snapshotToPriceData(snap)
    return NextResponse.json(prices, {
      headers: {
        'Cache-Control':  'public, s-maxage=15, stale-while-revalidate=5',
        'X-Price-Source': 'snapshot-fallback',
        'X-Market-Open':  String(prices.marketOpen),
        'X-Snapshot-Age': String(Math.round((Date.now() - new Date(snap.generatedAt).getTime()) / 60000)) + 'min',
      },
    })
  }

  return NextResponse.json({ error: 'snapshot_unavailable' }, { status: 503 })
}
