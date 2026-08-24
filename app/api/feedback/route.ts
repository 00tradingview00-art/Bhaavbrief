import { NextRequest, NextResponse } from 'next/server'
import { submitFeedback } from '@/lib/feedback'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const allowed = await checkRateLimit(`rl:feedback:${ip}`, 3, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400 })
    }

    await submitFeedback(body)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Submission failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
