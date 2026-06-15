import { NextResponse } from 'next/server'
import { getPrices } from '@/lib/prices'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  // Live Kite path — full OHLC + volume + OI, all 9 MCX + 4 CDS pairs
  const live = await getPrices()
  if (live) {
    return NextResponse.json(live, {
      headers: {
        'Cache-Control':  'no-store, max-age=0',
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
        'Cache-Control':  'no-store, max-age=0',
        'X-Price-Source': 'snapshot-fallback',
        'X-Market-Open':  String(prices.marketOpen),
        'X-Snapshot-Age': String(Math.round((Date.now() - new Date(snap.generatedAt).getTime()) / 60000)) + 'min',
      },
    })
  }

  return NextResponse.json({ error: 'snapshot_unavailable' }, { status: 503 })
}
