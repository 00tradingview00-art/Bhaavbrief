import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Razorpay from 'razorpay'
import { redisCommand } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Plan = 'monthly' | 'yearly'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: max 3 checkout attempts per 10 minutes per user (S-04)
  const rlKey = `rl:checkout:${userId}`
  const count = Number(await redisCommand('INCR', rlKey))
  if (count === 1) await redisCommand('EXPIRE', rlKey, '600')
  if (count > 3) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let plan: Plan
  try {
    const body = await req.json()
    plan = body.plan === 'yearly' ? 'yearly' : 'monthly'
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const planId = plan === 'yearly'
    ? process.env.RAZORPAY_PLAN_ID_YEARLY
    : process.env.RAZORPAY_PLAN_ID_MONTHLY
  if (!planId) {
    return NextResponse.json({ error: 'Plan not configured' }, { status: 500 })
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID ?? '',
    key_secret: process.env.RAZORPAY_KEY_SECRET ?? '',
  })

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: plan === 'yearly' ? 12 : 120,
    notes: { clerk_user_id: userId, plan },
  })

  return NextResponse.json({
    subscriptionId: subscription.id,
    keyId: process.env.RAZORPAY_KEY_ID,
  })
}
