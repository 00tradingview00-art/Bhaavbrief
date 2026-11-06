import { NextRequest, NextResponse } from 'next/server'
import { loadEIA } from '@/lib/eia'
import { checkFixedWindowRateLimit, getClientIp } from '@/lib/rateLimit'
export type { EIAWeek, EIAData, EIAError, EIAResponse } from '@/lib/eia'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

const RATE_LIMIT = Number(process.env.EIA_RATE_LIMIT ?? 120)

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req)
  if (!(await checkFixedWindowRateLimit(`rl:eia:${ip}`, RATE_LIMIT, 60))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const data = await loadEIA()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
  })
}
