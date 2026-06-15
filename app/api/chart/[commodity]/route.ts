import { NextRequest, NextResponse } from 'next/server'
import { KiteClient } from '@/lib/kite'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COMMODITY_KEY: Record<string, string> = {
  gold:          'gold',
  silver:        'silver',
  'crude-oil':   'crude',
  copper:        'copper',
  'natural-gas': 'natgas',
  zinc:          'zinc',
  lead:          'lead',
  aluminium:     'aluminium',
  nickel:        'nickel',
}

// Period → days back + interval
const PERIOD_CONFIG: Record<string, { days: number; interval: 'day' | '60minute' }> = {
  '1m':  { days: 30,  interval: 'day' },
  '3m':  { days: 90,  interval: 'day' },
  '6m':  { days: 180, interval: 'day' },
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ commodity: string }> },
) {
  const { commodity } = await params
  const period = req.nextUrl.searchParams.get('period') ?? '1m'

  const key = COMMODITY_KEY[commodity]
  if (!key) return NextResponse.json({ error: 'unknown commodity' }, { status: 404 })

  const cfg = PERIOD_CONFIG[period] ?? PERIOD_CONFIG['1m']

  const apiKey     = process.env.KITE_API_KEY
  const accessToken = process.env.KITE_ACCESS_TOKEN
  if (!apiKey || !accessToken) {
    return NextResponse.json({ error: 'kite_not_configured' }, { status: 503 })
  }

  // Load instrument token
  let token: number
  try {
    const instruments = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/kite-instruments.json'), 'utf8')
    )
    token = instruments[key]?.token
    if (!token) throw new Error('no token')
  } catch {
    return NextResponse.json({ error: 'instrument_not_found' }, { status: 503 })
  }

  const to   = isoDate(new Date())
  const from = isoDate(new Date(Date.now() - cfg.days * 86400000))

  try {
    const client = new KiteClient(apiKey, accessToken)
    const candles = await client.getHistorical(token, cfg.interval, from, to)

    const ttl = period === '1m' ? 3600 : 14400
    return NextResponse.json(candles, {
      headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=300` },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error(`[chart/${commodity}] ${msg}`)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
