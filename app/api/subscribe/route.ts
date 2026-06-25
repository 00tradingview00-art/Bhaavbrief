import { NextRequest, NextResponse } from 'next/server'
import { addSubscriber, sendWelcomeEmail } from '@/lib/brevo'
import { getAllBriefs } from '@/lib/briefs'

// Simple sliding-window rate limiter via Upstash Redis REST API.
// Allows 3 subscribe attempts per IP per hour.
async function checkRateLimit(ip: string): Promise<boolean> {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return true  // fail open if Redis not configured

  const key = `rl:subscribe:${ip}`
  const now  = Date.now()
  const windowMs = 60 * 60 * 1000  // 1 hour
  const limit = 3

  try {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // Remove entries older than 1 hour, add current timestamp, count window entries
    await fetch(`${url}/zremrangebyscore/${key}/0/${now - windowMs}`, { method: 'POST', headers })
    await fetch(`${url}/zadd/${key}/${now}/${now}`,                   { method: 'POST', headers })
    await fetch(`${url}/expire/${key}/3600`,                          { method: 'POST', headers })
    const countRes = await fetch(`${url}/zcard/${key}`,               { method: 'POST', headers })
    const { result } = await countRes.json() as { result: number }
    return result <= limit
  } catch {
    return true  // fail open on Redis error
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

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
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
