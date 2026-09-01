import { NextRequest, NextResponse } from 'next/server'
import {
  activateSubscription,
  deactivateSubscription,
  refreshSubscriptionExpiry,
  type Plan,
} from '@/lib/subscription'
import {
  expiryFromPlan,
  parseCashfreeDate,
  planFromCashfreePlanId,
  verifyCashfreeWebhookSignature,
} from '@/lib/cashfree'
import { redisCommand } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface CashfreeWebhookBody {
  type?: string
  data?: {
    subscription_id?: string
    cf_subscription_id?: string
    subscription_details?: {
      subscription_id?: string
      cf_subscription_id?: string
      subscription_status?: string
      subscription_expiry_time?: string
      next_schedule_date?: string | null
      subscription_tags?: Record<string, string> | null
    }
    plan_details?: {
      plan_id?: string
    }
    payment_schedule_date?: string
    payment_status?: string
  }
}

const DEACTIVATE_STATUSES = new Set([
  'CANCELLED',
  'CUSTOMER_CANCELLED',
  'EXPIRED',
  'COMPLETED',
  'CARD_EXPIRED',
])

async function resolveUserAndPlan(
  merchantSubId: string | undefined,
  tags: Record<string, string> | null | undefined,
  planId: string | undefined,
): Promise<{ userId: string; plan: Plan } | null> {
  let userId = tags?.clerk_user_id ?? null
  let planTag = tags?.plan as Plan | undefined

  if ((!userId || !planTag) && merchantSubId) {
    if (!userId) {
      userId = (await redisCommand('GET', `cfsub:${merchantSubId}`)) as string | null
    }
    if (!planTag) {
      planTag = (await redisCommand('GET', `cfsub:plan:${merchantSubId}`)) as Plan | null ?? undefined
    }
  }

  if (!userId) return null
  const plan: Plan =
    planTag === 'daily' || planTag === 'yearly' || planTag === 'monthly'
      ? planTag
      : planFromCashfreePlanId(planId)
  return { userId, plan }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = Buffer.from(await req.arrayBuffer())
  const signature = req.headers.get('x-webhook-signature')
  const timestamp = req.headers.get('x-webhook-timestamp')

  if (!verifyCashfreeWebhookSignature(rawBody, signature, timestamp)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: CashfreeWebhookBody
  try {
    body = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = body.type ?? ''
  const details = body.data?.subscription_details
  const merchantSubId =
    details?.subscription_id ?? body.data?.subscription_id
  const providerSubId =
    details?.cf_subscription_id ??
    body.data?.cf_subscription_id ??
    merchantSubId ??
    ''

  const resolved = await resolveUserAndPlan(
    merchantSubId,
    details?.subscription_tags ?? undefined,
    body.data?.plan_details?.plan_id,
  )

  if (!resolved) {
    // Not a BhaavBrief checkout (or mapping expired) — ack and ignore
    return NextResponse.json({ ok: true })
  }

  const { userId, plan } = resolved

  try {
    if (type === 'SUBSCRIPTION_STATUS_CHANGED') {
      const status = details?.subscription_status ?? ''
      if (status === 'ACTIVE') {
        const existing = await redisCommand('GET', `sub:${userId}:status`)
        const expiresAt =
          parseCashfreeDate(details?.next_schedule_date ?? undefined) ??
          parseCashfreeDate(details?.subscription_expiry_time) ??
          expiryFromPlan(plan)
        // Cap absurd far-future Cashfree plan expiry to one billing period from now
        // when next_schedule_date is missing (PERIODIC plans often set expiry decades out).
        const capped =
          !details?.next_schedule_date &&
          expiresAt.getTime() > Date.now() + planPeriodCap(plan)
            ? expiryFromPlan(plan)
            : expiresAt

        if (existing === 'active') {
          await refreshSubscriptionExpiry(userId, capped)
        } else {
          await activateSubscription(userId, providerSubId, plan, capped, merchantSubId)
        }
      } else if (DEACTIVATE_STATUSES.has(status)) {
        await deactivateSubscription(userId)
      }
    } else if (type === 'SUBSCRIPTION_PAYMENT_SUCCESS') {
      const expiresAt =
        parseCashfreeDate(details?.next_schedule_date ?? undefined) ??
        parseCashfreeDate(body.data?.payment_schedule_date) ??
        expiryFromPlan(plan)
      const existing = await redisCommand('GET', `sub:${userId}:status`)
      if (existing !== 'active') {
        await activateSubscription(userId, providerSubId, plan, expiresAt, merchantSubId)
      } else {
        await refreshSubscriptionExpiry(userId, expiresAt)
      }
    }
  } catch (err) {
    console.error('[cashfree/webhook]', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

function planPeriodCap(plan: Plan): number {
  if (plan === 'yearly') return 400 * 24 * 3600 * 1000
  if (plan === 'daily') return 3 * 24 * 3600 * 1000
  return 45 * 24 * 3600 * 1000
}
