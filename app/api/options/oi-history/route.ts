import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isProUser } from '@/lib/subscription'
import { redisCommand } from '@/lib/redis'
import { MCX_INSTRUMENTS } from '@/lib/options'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!await isProUser(userId)) {
    return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const instrument = searchParams.get('instrument')?.toUpperCase()
  const strikeParam = searchParams.get('strike')

  if (!instrument || !MCX_INSTRUMENTS[instrument]) {
    return NextResponse.json(
      { error: `Invalid instrument. Valid: ${Object.keys(MCX_INSTRUMENTS).join(', ')}` },
      { status: 400 },
    )
  }

  const strike = strikeParam ? parseFloat(strikeParam) : null
  if (strike === null || !Number.isFinite(strike)) {
    return NextResponse.json({ error: 'Missing or invalid strike' }, { status: 400 })
  }

  try {
    // Collect oi-snap:{instrument}:{date} keys — scan the last 90 days
    const history: { date: string; ceOI: number; peOI: number }[] = []
    const today = new Date()

    for (let i = 0; i < 90; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const key = `oi-snap:${instrument}:${dateStr}`
      const raw = await redisCommand('get', key) as string | null
      if (!raw) continue
      try {
        const { chain } = JSON.parse(raw) as { expiry: string; chain: { strike: number; ceOI: number; peOI: number }[] }
        const row = chain.find(r => r.strike === strike)
        if (row) history.push({ date: dateStr, ceOI: row.ceOI, peOI: row.peOI })
      } catch {
        // skip malformed entries
      }
    }

    history.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ instrument, strike, history }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (e) {
    console.error('[oi-history] error:', (e as Error).message)
    return NextResponse.json({ error: 'Failed to fetch OI history' }, { status: 500 })
  }
}
