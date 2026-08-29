import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import {
  activateSubscription,
  deactivateSubscription,
  refreshSubscriptionExpiry,
  type Plan,
} from '@/lib/subscription'
import { redisCommand } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RazorpayEvent =
  | 'subscription.activated'
  | 'subscription.charged'
  | 'subscription.cancelled'
  | 'subscription.expired'

interface RazorpaySubscription {
  id: string
  plan_id: string
  notes?: { clerk_user_id?: string; plan?: string }
  current_end?: number
  charge_at?: number
}

interface RazorpayWebhookPayload {
  event: RazorpayEvent
  payload: { subscription?: { entity?: RazorpaySubscription } }
}

function verifySignature(rawBody: Buffer, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

function planFromId(planId: string | undefined): Plan {
  if (planId === process.env.RAZORPAY_PLAN_ID_YEARLY) return 'yearly'
  return 'monthly'
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = Buffer.from(await req.arrayBuffer())
  const signature = req.headers.get('x-razorpay-signature')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: RazorpayWebhookPayload
  try {
    body = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sub = body.payload?.subscription?.entity
  const userId = sub?.notes?.clerk_user_id
  if (!userId) {
    // Webhook for a subscription not created via BhaavBrief checkout — ignore
    return NextResponse.json({ ok: true })
  }

  const plan = planFromId(sub?.plan_id)

  switch (body.event) {
    case 'subscription.activated': {
      // Idempotency: skip if already active
      const existing = await redisCommand('GET', `sub:${userId}:status`)
      if (existing === 'active') break
      const expiresAt = sub?.current_end
        ? new Date(sub.current_end * 1000)
        : new Date(Date.now() + 31 * 24 * 3600 * 1000)
      await activateSubscription(userId, sub?.id ?? '', plan, expiresAt)
      break
    }
    case 'subscription.charged': {
      // Renewal: extend expiry by the new billing period
      const expiresAt = sub?.charge_at
        ? new Date(sub.charge_at * 1000)
        : new Date(Date.now() + 31 * 24 * 3600 * 1000)
      await refreshSubscriptionExpiry(userId, expiresAt)
      break
    }
    case 'subscription.cancelled':
    case 'subscription.expired': {
      await deactivateSubscription(userId)
      break
    }
  }

  // Always return 200 on verified events — Razorpay retries on non-200
  return NextResponse.json({ ok: true })
}
