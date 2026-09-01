import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cancelCashfreeSubscription } from '@/lib/cashfree'
import { deactivateSubscription, isProUser } from '@/lib/subscription'
import { redisCommand } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(): Promise<NextResponse> {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rlKey = `rl:cancel:${userId}`
  const count = Number(await redisCommand('INCR', rlKey))
  if (count === 1) await redisCommand('EXPIRE', rlKey, '3600')
  if (count > 5) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const pro = await isProUser(userId)
  if (!pro) {
    return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 })
  }

  const merchantSubId = (await redisCommand('GET', `sub:${userId}:merchant_sub_id`)) as string | null
  if (!merchantSubId) {
    // Subscription activated before this field was tracked, or a non-Cashfree
    // provider — nothing we can call Cashfree's API with. Caller falls back to
    // the manual "contact support" path.
    return NextResponse.json(
      { error: 'Unable to cancel automatically — please contact support' },
      { status: 409 },
    )
  }

  try {
    await cancelCashfreeSubscription(merchantSubId)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cancellation failed'
    console.error('[cashfree/cancel]', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // Deactivate immediately for instant UI feedback rather than waiting on the
  // webhook — safe to do twice; the webhook's own CANCELLED event will just
  // set the same status again when it arrives.
  await deactivateSubscription(userId)

  return NextResponse.json({ ok: true })
}
