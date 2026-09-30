import { NextRequest, NextResponse } from 'next/server'
import {
  activateSubscription,
  deactivateSubscription,
  isCurrentSubscription,
  isSubscriptionEnded,
  markSubscriptionEnded,
  refreshSubscriptionExpiry,
  type Plan,
} from '@/lib/subscription'
import { createHash } from 'crypto'
import {
  WEBHOOK_MAX_AGE_MS,
  expiryFromPlan,
  isWebhookTimestampFresh,
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

// Durable trail of every webhook outcome for a subscription — not just
// unresolved-user misses. console.error alone isn't enough to debug this:
// Vercel's function-log retention for this project turned out to hold only
// a couple of minutes of history, nowhere near enough to see what happened
// hours (or days) after the fact. Founder-only diagnostic, queryable via
// direct Redis LRANGE — never exposed through any API response.
async function logWebhookEvent(
  merchantSubId: string | undefined,
  entry: { type: string; status?: string; action: string },
): Promise<void> {
  const key = `cf-webhook-log:${merchantSubId || 'unknown'}`
  const value = JSON.stringify({ ts: new Date().toISOString(), ...entry })
  await redisCommand('lpush', key, value).catch(() => {})
  await redisCommand('ltrim', key, '0', '19').catch(() => {})
}

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
  if (!isWebhookTimestampFresh(timestamp)) {
    return NextResponse.json({ error: 'Stale webhook' }, { status: 401 })
  }

  let body: CashfreeWebhookBody
  try {
    body = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Each signed delivery is processed at most once. Released again if
  // processing fails, so Cashfree's retry of the same delivery still lands.
  const dedupeKey = `cf-evt:${createHash('sha256').update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex')}`
  const claimed = await redisCommand(
    'SET', dedupeKey, '1', 'NX', 'EX', String(Math.ceil(WEBHOOK_MAX_AGE_MS / 1000) + 3600),
  )
  if (claimed === null) {
    return NextResponse.json({ ok: true, duplicate: true })
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

  let resolved: Awaited<ReturnType<typeof resolveUserAndPlan>>
  try {
    resolved = await resolveUserAndPlan(
      merchantSubId,
      details?.subscription_tags ?? undefined,
      body.data?.plan_details?.plan_id,
    )
  } catch (err) {
    console.error('[cashfree/webhook] resolve failed', err)
    await redisCommand('DEL', dedupeKey).catch(() => {})
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  if (!resolved) {
    // Not a BhaavBrief checkout (or mapping expired) — ack and ignore, but
    // log it: a real subscription hitting this path would otherwise fail to
    // activate with zero signal anywhere that it happened.
    console.error('[cashfree/webhook] unresolved', { type, merchantSubId, providerSubId })
    await logWebhookEvent(merchantSubId, { type, action: 'unresolved' })
    return NextResponse.json({ ok: true })
  }

  const { userId, plan } = resolved

  try {
    if (type === 'SUBSCRIPTION_STATUS_CHANGED') {
      const status = details?.subscription_status ?? ''
      if (status === 'ACTIVE') {
        if (await isSubscriptionEnded(merchantSubId)) {
          await logWebhookEvent(merchantSubId, { type, status, action: 'ignored: subscription already ended' })
          return NextResponse.json({ ok: true })
        }
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
          await logWebhookEvent(merchantSubId, { type, status, action: 'refreshed' })
        } else {
          await activateSubscription(userId, providerSubId, plan, capped, merchantSubId)
          await logWebhookEvent(merchantSubId, { type, status, action: 'activated' })
        }
      } else if (DEACTIVATE_STATUSES.has(status)) {
        await markSubscriptionEnded(merchantSubId)
        if (!(await isCurrentSubscription(userId, merchantSubId))) {
          // e.g. the old plan's CANCELLED event arriving after a change-plan
          // purchase — must not touch the user's current, paid subscription.
          await logWebhookEvent(merchantSubId, { type, status, action: 'ignored: not current subscription' })
          return NextResponse.json({ ok: true })
        }
        await deactivateSubscription(userId)
        await logWebhookEvent(merchantSubId, { type, status, action: 'deactivated' })
      } else {
        // A recognized user/subscription, but a status this route has no
        // branch for — e.g. an intermediate "still processing" state on a
        // recurring auto-debit (INITIALIZED, ON_HOLD, PENDING, ...). Not
        // acted on (correctly — nothing confirmed yet), but previously not
        // even logged, which is exactly what made an in-flight charge
        // impossible to debug.
        await logWebhookEvent(merchantSubId, { type, status, action: 'ignored: unhandled status' })
      }
    } else if (type === 'SUBSCRIPTION_PAYMENT_SUCCESS') {
      if (await isSubscriptionEnded(merchantSubId)) {
        await logWebhookEvent(merchantSubId, { type, action: 'ignored: subscription already ended' })
        return NextResponse.json({ ok: true })
      }
      const expiresAt =
        parseCashfreeDate(details?.next_schedule_date ?? undefined) ??
        parseCashfreeDate(body.data?.payment_schedule_date) ??
        expiryFromPlan(plan)
      const existing = await redisCommand('GET', `sub:${userId}:status`)
      if (existing !== 'active') {
        await activateSubscription(userId, providerSubId, plan, expiresAt, merchantSubId)
        await logWebhookEvent(merchantSubId, { type, action: 'activated' })
      } else {
        await refreshSubscriptionExpiry(userId, expiresAt)
        await logWebhookEvent(merchantSubId, { type, action: 'refreshed' })
      }
    } else {
      // e.g. SUBSCRIPTION_PAYMENT_FAILED, SUBSCRIPTION_AUTH_STATUS — event
      // types this route has never handled. Same "correctly inert but
      // previously invisible" gap as above, one level up (unhandled type
      // rather than unhandled status).
      await logWebhookEvent(merchantSubId, {
        type,
        status: details?.subscription_status ?? body.data?.payment_status ?? undefined,
        action: 'ignored: unhandled type',
      })
    }
  } catch (err) {
    console.error('[cashfree/webhook]', err)
    await redisCommand('DEL', dedupeKey).catch(() => {})
    await logWebhookEvent(merchantSubId, { type, action: `error: ${(err as Error).message}` })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

function planPeriodCap(plan: Plan): number {
  if (plan === 'yearly') return 400 * 24 * 3600 * 1000
  if (plan === 'daily') return 3 * 24 * 3600 * 1000
  return 45 * 24 * 3600 * 1000
}
