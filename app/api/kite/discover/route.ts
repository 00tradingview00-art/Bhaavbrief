import { NextResponse } from 'next/server'
import { KiteClient } from '@/lib/kite'

// GET /api/kite/discover
// Discovers current MCX front-month instrument tokens from Kite
// Called automatically at morning auth — also callable manually

export async function GET() {
  const apiKey      = process.env.KITE_API_KEY
  const accessToken = process.env.KITE_ACCESS_TOKEN

  if (!apiKey || !accessToken) {
    return NextResponse.json(
      { error: 'KITE_API_KEY or KITE_ACCESS_TOKEN not set' },
      { status: 401 }
    )
  }

  try {
    const client = new KiteClient(apiKey, accessToken)
    const tokens = await client.discoverAndCacheTokens()

    return NextResponse.json({
      ok: true,
      tokens,
      message: 'MCX instrument tokens discovered and cached successfully',
    })
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}
