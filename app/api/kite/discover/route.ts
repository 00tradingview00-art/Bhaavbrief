import { NextRequest, NextResponse } from 'next/server'
import { KiteClient } from '@/lib/kite'

// GET /api/kite/discover
// Discovers current MCX front-month instrument tokens from Kite.
// Manual ops trigger — requires the same bearer secret as /api/cron/*.

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
