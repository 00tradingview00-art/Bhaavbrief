import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cancelCashfreeSubscription } from '@/lib/cashfree'
import { deactivateSubscription, isProUser, type Plan } from '@/lib/subscription'
import { redisCommand } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_PLANS: Plan[] = ['daily', 'monthly', 'yearly']

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rlKey = `rl:change-plan:${userId}`
  const count = Number(await redisCommand('INCR', rlKey))
  if (count === 1) await redisCommand('EXPIRE', rlKey, '3600')
  if (count > 5) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let plan: string
  try {
    const body = await req.json()
    plan = typeof body.plan === 'string' ? body.plan : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!VALID_PLANS.includes(plan as Plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const pro = await isProUser(userId)
  if (!pro) {
    return NextResponse.json({ error: 'No active subscription to change' }, { status: 400 })
  }

  const currentPlan = (await redisCommand('GET', `sub:${userId}:plan`)) as string | null
  if (currentPlan === plan) {
    return NextResponse.json({ error: 'Already on this plan' }, { status: 400 })
  }

  const merchantSubId = (await redisCommand('GET', `sub:${userId}:merchant_sub_id`)) as string | null
  if (!merchantSubId) {
    return NextResponse.json(
      { error: 'Unable to change plan automatically — please contact support' },
      { status: 409 },
    )
  }

  try {
    await cancelCashfreeSubscription(merchantSubId)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Plan change failed'
    console.error('[cashfree/change-plan]', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // Deactivate immediately so the account page reflects "no active plan" right
  // away — the caller then sends the user through a fresh checkout for the new
  // plan. Same pattern as /api/cashfree/cancel.
  await deactivateSubscription(userId)

  return NextResponse.json({ ok: true })
}
