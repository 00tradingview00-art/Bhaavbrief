import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import {
  cashfreeCheckoutMode,
  createCashfreeSubscription,
  type CreateSubscriptionParams,
} from '@/lib/cashfree'
import type { Plan } from '@/lib/subscription'
import { redisCommand } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bhaavbrief.in'

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return null
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rlKey = `rl:checkout:${userId}`
  const count = Number(await redisCommand('INCR', rlKey))
  if (count === 1) await redisCommand('EXPIRE', rlKey, '600')
  if (count > 3) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let plan: Plan
  let phoneRaw = ''
  try {
    const body = await req.json()
    plan = body.plan === 'yearly' ? 'yearly' : body.plan === 'daily' ? 'daily' : 'monthly'
    phoneRaw = typeof body.phone === 'string' ? body.phone : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const phone = normalizePhone(phoneRaw)
  if (!phone) {
    return NextResponse.json(
      { error: 'A valid 10-digit Indian mobile number is required' },
      { status: 400 },
    )
  }

  const user = await currentUser()
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress
  if (!email) {
    return NextResponse.json({ error: 'Email required on your account' }, { status: 400 })
  }

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    email.split('@')[0] ||
    'BhaavBrief user'

  // Merchant subscription_id: alphanumeric + underscore; unique per attempt
  const subscriptionId = `bb_${userId.replace(/[^a-zA-Z0-9]/g, '').slice(-12)}_${plan}_${Date.now()}`

  const params: CreateSubscriptionParams = {
    subscriptionId,
    plan,
    customerName: name.slice(0, 100),
    customerEmail: email,
    customerPhone: phone,
    returnUrl: `${SITE}/pro/return`,
    clerkUserId: userId,
  }

  try {
    const sub = await createCashfreeSubscription(params)

    // Resolve userId/plan on webhook even if tags are missing
    await redisCommand('SET', `cfsub:${sub.subscription_id}`, userId)
    await redisCommand('EXPIRE', `cfsub:${sub.subscription_id}`, String(14 * 24 * 3600))
    await redisCommand('SET', `cfsub:plan:${sub.subscription_id}`, plan)
    await redisCommand('EXPIRE', `cfsub:plan:${sub.subscription_id}`, String(14 * 24 * 3600))

    return NextResponse.json({
      subscriptionId: sub.subscription_id,
      subscriptionSessionId: sub.subscription_session_id,
      mode: cashfreeCheckoutMode(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    console.error('[cashfree/checkout]', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
