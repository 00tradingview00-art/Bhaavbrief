import { NextRequest, NextResponse } from 'next/server'
import { addSubscriber, sendWelcomeEmail } from '@/lib/brevo'
import { getAllBriefs } from '@/lib/briefs'

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    await addSubscriber(email, name)

    // Send welcome email — awaited so it completes before serverless fn exits
    try {
      const briefs = await getAllBriefs()
      const latest = briefs[0]
      await sendWelcomeEmail(email, latest ? {
        title:   latest.title,
        slug:    latest.slug,
        edition: latest.edition,
      } : undefined)
    } catch {}

    return NextResponse.json({ success: true, message: 'Subscribed! Welcome email on its way.' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Subscription failed'
    if (msg.includes('Contact already exist')) {
      return NextResponse.json({ success: true, message: 'You\'re already subscribed!' })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
