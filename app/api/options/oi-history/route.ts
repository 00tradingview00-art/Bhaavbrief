import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isProUser, hasInternalAccess } from '@/lib/subscription'
import { redisCommand } from '@/lib/redis'
import { MCX_INSTRUMENTS } from '@/lib/options'
import { getOIHistory } from '@/lib/oiHistory'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

export async function GET(request: Request) {
  // Monitoring bypass: the watchdog needs to read this route unauthenticated
  // to verify the OI-snapshot cron is actually writing data — same
  // CRON_SECRET already used to authenticate the crons themselves, checked
  // before the Pro gate so it isn't subject to a real user session.
  const isMonitoring = process.env.CRON_SECRET
    && request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`

  let isPro = true
  if (!isMonitoring && !hasInternalAccess(request.headers)) {
    const { userId } = await auth()
    isPro = await isProUser(userId)
  }

  const { searchParams } = new URL(request.url)
  const instrument = searchParams.get('instrument')?.toUpperCase()
  const strikeParam = searchParams.get('strike')
  const dateParam = searchParams.get('date')

  if (!instrument || !MCX_INSTRUMENTS[instrument]) {
    return NextResponse.json(
      { error: `Invalid instrument. Valid: ${Object.keys(MCX_INSTRUMENTS).join(', ')}` },
      { status: 400 },
    )
  }

  // Existence-check mode for monitoring: ?instrument=X&date=YYYY-MM-DD with no
  // strike just confirms whether that day's snapshot was written at all —
  // watchdog has no way to know "the" strike to check, and doesn't need one.
  if (!strikeParam && dateParam) {
    const raw = await redisCommand('get', `oi-snap:${instrument}:${dateParam}`).catch(() => null)
    return NextResponse.json({ instrument, date: dateParam, exists: !!raw }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const strike = strikeParam ? parseFloat(strikeParam) : null
  if (strike === null || !Number.isFinite(strike)) {
    return NextResponse.json({ error: 'Missing or invalid strike' }, { status: 400 })
  }

  try {
    const history = await getOIHistory(instrument, strike)

    // Non-Pro requests get a real (not fabricated) but short preview — the
    // last 5 days only — so the free-tier teaser is honest data, not a fake
    // shape, without handing over the full history for free.
    const payload = isPro ? history : history.slice(-5)

    return NextResponse.json({ instrument, strike, history: payload, preview: !isPro }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (e) {
    console.error('[oi-history] error:', (e as Error).message)
    return NextResponse.json({ error: 'Failed to fetch OI history' }, { status: 500 })
  }
}
