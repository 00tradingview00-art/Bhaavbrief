import { NextResponse } from 'next/server'
import { MCX_INSTRUMENTS } from '@/lib/options'
import { redisCommand } from '@/lib/redis'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const instrument = searchParams.get('instrument')?.toUpperCase()

  if (!instrument || !MCX_INSTRUMENTS[instrument]) {
    return NextResponse.json(
      { error: `Invalid instrument. Valid: ${Object.keys(MCX_INSTRUMENTS).join(', ')}` },
      { status: 400 },
    )
  }

  const raw = await redisCommand('hgetall', `iv-hist:${instrument}`) as string[] | null
  const history: { date: string; iv: number }[] = []
  if (raw) {
    for (let i = 0; i < raw.length; i += 2) {
      const iv = parseFloat(raw[i + 1])
      if (!isNaN(iv)) history.push({ date: raw[i], iv })
    }
  }
  history.sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ instrument, history }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  })
}
