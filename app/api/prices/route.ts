import { NextResponse } from 'next/server'
import { getPrices } from '@/lib/prices'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const prices = await getPrices()

  if (!prices) {
    return NextResponse.json(
      { error: 'Price fetch failed' },
      { status: 503 }
    )
  }

  return NextResponse.json(prices, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Price-Source': prices.source,
      'X-Market-Open':  String(prices.marketOpen),
    },
  })
}
