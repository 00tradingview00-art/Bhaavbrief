import { NextRequest, NextResponse } from 'next/server'
import { addSubscriber } from '@/lib/brevo'

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    await addSubscriber(email, name)

    return NextResponse.json({ success: true, message: 'Subscribed! First brief arrives at 11 AM.' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Subscription failed'
    // If already subscribed, Brevo throws — treat as success
    if (msg.includes('Contact already exist')) {
      return NextResponse.json({ success: true, message: 'You\'re already subscribed!' })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
