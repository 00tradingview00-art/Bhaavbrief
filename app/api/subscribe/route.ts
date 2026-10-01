import { NextRequest, NextResponse } from 'next/server'
import { addSubscriber, sendWelcomeEmail } from '@/lib/brevo'
import { getAllBriefs } from '@/lib/briefs'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const allowed = await checkRateLimit(`rl:subscribe:${ip}`, 3, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const { email, name } = await req.json()

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    await addSubscriber(email, typeof name === 'string' ? name.slice(0, 100) : undefined)

    // Send welcome email — awaited so it completes before serverless fn exits
    try {
      const briefs = await getAllBriefs()
      const latest = briefs[0]
      await sendWelcomeEmail(email, latest ? {
        title:   latest.title,
        slug:    latest.slug,
        edition: latest.edition,
      } : undefined)
      console.log('[subscribe] Welcome email sent to', email)
    } catch (e) {
      console.error('[subscribe] Welcome email failed:', (e as Error).message)
    }

    return NextResponse.json({ success: true, message: 'Subscribed! Welcome email on its way.' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Subscription failed'
    if (msg.includes('Contact already exist')) {
      return NextResponse.json({ success: true, message: 'You\'re already subscribed!' })
    }
    // Log the provider's error; never echo it (or a JS error) to the caller.
    console.error('[subscribe] failed:', msg)
    return NextResponse.json({ error: 'Subscription failed — please try again later.' }, { status: 500 })
  }
}
