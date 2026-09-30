import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cancelCashfreeSubscription } from '@/lib/cashfree'
import { isProUser, markCancelling, markSubscriptionEnded, type Plan } from '@/lib/subscription'
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

  // Already cancelled: renewal is stopped, nothing to cancel at Cashfree —
  // the caller just goes on to checkout for the new plan.
  const status = (await redisCommand('GET', `sub:${userId}:status`)) as string | null
  if (status === 'cancelling') {
    return NextResponse.json({ ok: true })
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

  // Stop the old plan renewing but keep its paid days, so a user who abandons
  // the new checkout still has Pro until the old period ends (previously they
  // were left with nothing). When the new plan's payment lands, its webhook
  // activates it as the current subscription, and the old plan's late
  // CANCELLED event is ignored as not-current.
  await markSubscriptionEnded(merchantSubId)
  await markCancelling(userId)

  return NextResponse.json({ ok: true })
}
