/**
 * lib/cashfree.ts — thin Cashfree Subscriptions API helper.
 *
 * Billing lives in this Next.js app only (no Cloudflare Workers).
 * Docs: https://www.cashfree.com/docs/api-reference/payments/latest/subscription/create-subscription
 */

import { createHmac, timingSafeEqual } from 'crypto'
import type { Plan } from './subscription'

export const CASHFREE_API_VERSION = '2025-01-01'

const PLAN_AMOUNTS: Record<Plan, number> = {
  daily: 33,
  monthly: 333,
  yearly: 2999,
}

export function cashfreePlanId(plan: Plan): string {
  const id =
    plan === 'yearly' ? process.env.CASHFREE_PLAN_ID_YEARLY :
    plan === 'daily'  ? process.env.CASHFREE_PLAN_ID_DAILY :
    process.env.CASHFREE_PLAN_ID_MONTHLY
  if (!id) throw new Error(`CASHFREE_PLAN_ID_${plan.toUpperCase()} not configured`)
  return id
}

export function planFromCashfreePlanId(planId: string | undefined): Plan {
  if (!planId) return 'monthly'
  if (planId === process.env.CASHFREE_PLAN_ID_YEARLY || planId === 'Prabal_2999') return 'yearly'
  if (planId === process.env.CASHFREE_PLAN_ID_DAILY || planId === 'Prabal_33') return 'daily'
  return 'monthly'
}

export function planAmountInr(plan: Plan): number {
  return PLAN_AMOUNTS[plan]
}

export function planPeriodMs(plan: Plan): number {
  if (plan === 'yearly') return 366 * 24 * 3600 * 1000
  if (plan === 'daily') return 24 * 3600 * 1000
  return 31 * 24 * 3600 * 1000
}

export function cashfreeBaseUrl(): string {
  const env = (process.env.CASHFREE_ENV ?? 'sandbox').toLowerCase()
  return env === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg'
}

export function cashfreeCheckoutMode(): 'sandbox' | 'production' {
  return (process.env.CASHFREE_ENV ?? 'sandbox').toLowerCase() === 'production'
    ? 'production'
    : 'sandbox'
}

export interface CreateSubscriptionParams {
  subscriptionId: string
  plan: Plan
  customerName: string
  customerEmail: string
  customerPhone: string
  returnUrl: string
  clerkUserId: string
}

export interface CashfreeSubscriptionResponse {
  subscription_id: string
  cf_subscription_id?: string
  subscription_session_id: string
  subscription_status?: string
}

export async function createCashfreeSubscription(
  params: CreateSubscriptionParams,
): Promise<CashfreeSubscriptionResponse> {
  const clientId = process.env.CASHFREE_CLIENT_ID
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Cashfree credentials not configured')
  }

  const body = {
    subscription_id: params.subscriptionId,
    customer_details: {
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
    },
    plan_details: {
      plan_id: cashfreePlanId(params.plan),
    },
    authorization_details: {
      authorization_amount: planAmountInr(params.plan),
      authorization_amount_refund: false,
      payment_methods: ['upi', 'card'],
    },
    subscription_meta: {
      return_url: params.returnUrl,
    },
    subscription_tags: {
      clerk_user_id: params.clerkUserId,
      plan: params.plan,
    },
  }

  const res = await fetch(`${cashfreeBaseUrl()}/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': CASHFREE_API_VERSION,
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
    },
    body: JSON.stringify(body),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      (json as { message?: string }).message ??
      (json as { error?: string }).error ??
      `Cashfree create subscription failed (${res.status})`
    throw new Error(msg)
  }

  const sessionId = (json as CashfreeSubscriptionResponse).subscription_session_id
  const subscriptionId = (json as CashfreeSubscriptionResponse).subscription_id
  if (!sessionId || !subscriptionId) {
    throw new Error('Cashfree response missing subscription_session_id')
  }

  return json as CashfreeSubscriptionResponse
}

/**
 * Cancel a subscription via Cashfree's Manage Subscription API.
 * Docs: https://www.cashfree.com/docs/api-reference/payments/latest/subscription/mandate/manage
 * POST /subscriptions/{subscription_id}/manage — the path/body subscription_id is our
 * own merchant-supplied id (the "bb_..." string from checkout), NOT Cashfree's
 * cf_subscription_id — confirmed against Cashfree's docs, since the two look similar
 * enough to mix up and using the wrong one would 404 rather than cancel anything.
 */
export async function cancelCashfreeSubscription(merchantSubscriptionId: string): Promise<void> {
  const clientId = process.env.CASHFREE_CLIENT_ID
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Cashfree credentials not configured')
  }

  const res = await fetch(`${cashfreeBaseUrl()}/subscriptions/${encodeURIComponent(merchantSubscriptionId)}/manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': CASHFREE_API_VERSION,
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
    },
    body: JSON.stringify({ subscription_id: merchantSubscriptionId, action: 'CANCEL' }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      (json as { message?: string }).message ??
      (json as { error?: string }).error ??
      `Cashfree cancel subscription failed (${res.status})`
    throw new Error(msg)
  }
}

/**
 * Verify Cashfree subscription webhook: HMAC-SHA256(timestamp + rawBody) → Base64.
 * Cashfree has no separate webhook secret — the dashboard's webhook setup is just a
 * URL field. Signing uses the same Client Secret issued for API auth (confirmed
 * against Cashfree's own docs, whose signature-verification code example names the
 * HMAC key "<client-secret>"), so this reads CASHFREE_CLIENT_SECRET, not a
 * CASHFREE_WEBHOOK_SECRET that doesn't exist.
 */
export function verifyCashfreeWebhookSignature(
  rawBody: Buffer,
  signature: string | null,
  timestamp: string | null,
): boolean {
  const secret = process.env.CASHFREE_CLIENT_SECRET
  if (!secret || !signature || !timestamp) return false
  const expected = createHmac('sha256', secret)
    .update(timestamp + rawBody.toString('utf8'))
    .digest('base64')
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export interface CashfreeSubscriptionPayment {
  cf_payment_id?: number
  payment_amount?: number
  payment_status?: string
  payment_type?: string
  payment_initiated_date?: string
}

/**
 * Fetch a subscription's payment/transaction history via Cashfree's Fetch Payments API.
 * Docs: https://www.cashfree.com/docs/api-reference/payments/latest/subscription/payment/fetch-payments-for-mandate
 * GET /subscriptions/{subscription_id}/payments — same merchant-supplied subscription_id
 * as cancelCashfreeSubscription, not cf_subscription_id.
 */
export async function getCashfreeSubscriptionPayments(
  merchantSubscriptionId: string,
): Promise<CashfreeSubscriptionPayment[]> {
  const clientId = process.env.CASHFREE_CLIENT_ID
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Cashfree credentials not configured')
  }

  const res = await fetch(`${cashfreeBaseUrl()}/subscriptions/${encodeURIComponent(merchantSubscriptionId)}/payments`, {
    headers: {
      'x-api-version': CASHFREE_API_VERSION,
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
    },
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      (json as { message?: string }).message ??
      (json as { error?: string }).error ??
      `Cashfree fetch payments failed (${res.status})`
    throw new Error(msg)
  }

  return Array.isArray(json) ? (json as CashfreeSubscriptionPayment[]) : []
}

export function expiryFromPlan(plan: Plan, from = new Date()): Date {
  return new Date(from.getTime() + planPeriodMs(plan))
}

export function parseCashfreeDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}
