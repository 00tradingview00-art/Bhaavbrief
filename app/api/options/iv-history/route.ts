import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { MCX_INSTRUMENTS } from '@/lib/options'
import { hasInternalAccess, isProUser } from '@/lib/subscription'
import { readIVHistory } from '@/lib/ivRankHistory'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

// Free callers get the last FREE_POINTS days (real data, enough for the
// free teaser); full history is Pro-only, like /api/options/oi-history. It
// used to be fully public, although the Volatility tab it feeds is sold as
// Pro. Monitoring (CRON_SECRET) and internal scripts get full history.
const FREE_POINTS = 5

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const instrument = searchParams.get('instrument')?.toUpperCase()

  if (!instrument || !MCX_INSTRUMENTS[instrument]) {
    return NextResponse.json(
      { error: `Invalid instrument. Valid: ${Object.keys(MCX_INSTRUMENTS).join(', ')}` },
      { status: 400 },
    )
  }

  const isMonitoring = !!process.env.CRON_SECRET
    && request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
  let full = isMonitoring || hasInternalAccess(request.headers)
  if (!full) {
    const { userId } = await auth()
    full = await isProUser(userId).catch(() => false)
  }

  let history: { date: string; iv: number }[] = []
  try {
    history = await readIVHistory(instrument)
  } catch (e) {
    console.error('[iv-history] redis error:', (e as Error).message)
  }

  return NextResponse.json(
    { instrument, history: full ? history : history.slice(-FREE_POINTS), preview: !full },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
