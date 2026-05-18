import { NextResponse } from 'next/server'
import { fetchPrices } from '@/lib/prices'

export const revalidate = 900 // 15 minutes

export async function GET() {
  try {
    const prices = await fetchPrices()
    return NextResponse.json({ prices, updatedAt: new Date().toISOString() })
  } catch {
    return NextResponse.json({ prices: [], error: 'Price fetch failed' }, { status: 500 })
  }
}
