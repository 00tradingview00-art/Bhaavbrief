import { NextResponse } from 'next/server'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const snap = loadSnapshot()
  if (!snap) {
    return NextResponse.json(
      { error: 'snapshot_unavailable' },
      { status: 503 },
    )
  }

  const prices = snapshotToPriceData(snap)
  return NextResponse.json(prices, {
    headers: {
      'Cache-Control':  'no-store, max-age=0',
      'X-Price-Source': prices.source,
      'X-Market-Open':  String(prices.marketOpen),
      'X-Snapshot-Age': String(Math.round((Date.now() - new Date(snap.generatedAt).getTime()) / 60000)) + 'min',
    },
  })
}
