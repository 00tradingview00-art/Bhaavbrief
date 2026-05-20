import { NextResponse } from 'next/server'
import { getPrices } from '@/lib/prices'

export const revalidate = 0

export async function GET() {
  try {
    const prices = await getPrices()
    return NextResponse.json(prices, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch {
    return NextResponse.json({ error: 'Price fetch failed' }, { status: 500 })
  }
}
