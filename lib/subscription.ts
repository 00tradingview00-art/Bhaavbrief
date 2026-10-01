// Subscription status for BhaavBrief Pro.
//
// Redis key schema (Upstash, via redisCommand):
//   sub:{userId}:status          → "active" | "cancelling" | "cancelled" | "expired"
//                                   ("cancelling" = renewal stopped, Pro kept until expires_at)
//   sub:{userId}:plan            → "daily" | "monthly" | "yearly"
//   sub:{userId}:provider        → "cashfree"
//   sub:{userId}:provider_sub_id → Cashfree's cf_subscription_id (display/support use)
//   sub:{userId}:merchant_sub_id → our own merchant-supplied subscription_id — this,
//                                   not provider_sub_id, is what Cashfree's Manage
//                                   Subscription API (POST /subscriptions/{id}/manage)
//                                   expects in its path, per their docs
//   sub:{userId}:expires_at      → ISO 8601 timestamp
//
// Clerk publicMetadata.isPro mirrors status for client-side use without Redis
// (see scalability note in plan: options pages use ISR + client-side override).
//
// Internal access — for backend scripts (e.g. the reel campaign pipeline)
// that need real Pro-tier data with no Clerk session at all, see
// hasInternalAccess() below. Browser-based Pro verification (does the real
// UI/UX work) goes through the dev.bhaavbrief.in staging domain instead —
// Cashfree sandbox mode (lib/cashfree.ts) already runs the real subscribe
// flow there with test cards, so no auth-bypass code is needed for that.

import { redisCommand } from './redis'
import { clerkClient } from '@clerk/nextjs/server'
import type { Plan } from './proPlans'

export type { Plan } from './proPlans'
export type SubStatus = 'active' | 'cancelling' | 'cancelled' | 'expired'

// Statuses that still grant Pro until expires_at. A cancelled plan keeps the
// days the user already paid for — access ends when the period does.
const PRO_STATUSES = new Set(['active', 'cancelling'])

export async function isProUser(userId: string | null): Promise<boolean> {
  if (!userId) return false
  const status = await redisCommand('GET', `sub:${userId}:status`)
  if (!PRO_STATUSES.has(status as string)) return false
  const expiresAt = await redisCommand('GET', `sub:${userId}:expires_at`)
  if (!expiresAt) return false
  return new Date(expiresAt as string) > new Date()
}

// For routes that serve free data to everyone and only *extra* data to Pro:
// a Redis outage should degrade a signed-in user to the free tier, not turn
// the whole response into a 500 (anonymous users never reach Redis at all).
export async function isProUserOrFree(userId: string | null): Promise<boolean> {
  try {
    return await isProUser(userId)
  } catch (err) {
    console.error('[subscription] Pro check failed, serving free tier', err)
    return false
  }
}

// Bearer-secret check for server-to-server internal access (backend scripts
// hitting Pro-gated API routes with no Clerk session at all). A real
// customer's browser never sends this header — there is no UI, cookie, or
// normal request path that would ever attach it. Deliberately a separate
// secret from CRON_SECRET: that one scopes to the app's own cron/ops infra,
// this one grants Pro-data access — a different privilege, kept on a
// different secret so a leak of one doesn't grant the other.
export function hasInternalAccess(headers: Headers): boolean {
  const auth = headers.get('authorization')
  return !!process.env.INTERNAL_ACCESS_SECRET && auth === `Bearer ${process.env.INTERNAL_ACCESS_SECRET}`
}

export async function activateSubscription(
  userId: string,
  providerSubId: string,
  plan: Plan,
  expiresAt: Date,
  merchantSubId?: string,
): Promise<void> {
  const expiresISO = expiresAt.toISOString()
  const kv = [
    `sub:${userId}:status`, 'active',
    `sub:${userId}:plan`, plan,
    `sub:${userId}:provider`, 'cashfree',
    `sub:${userId}:provider_sub_id`, providerSubId,
    `sub:${userId}:expires_at`, expiresISO,
  ]
  if (merchantSubId) kv.push(`sub:${userId}:merchant_sub_id`, merchantSubId)
  await redisCommand('MSET', ...kv)
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { isPro: true, planExpires: expiresISO, plan, cancelling: false },
  })
}

// Renewal stopped (user cancelled, or Cashfree reported the mandate ended):
// Pro stays on until the existing expires_at, which is left untouched.
export async function markCancelling(userId: string): Promise<void> {
  await redisCommand('SET', `sub:${userId}:status`, 'cancelling')
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { cancelling: true },
  })
}

export async function deactivateSubscription(userId: string): Promise<void> {
  await redisCommand('SET', `sub:${userId}:status`, 'cancelled')
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { isPro: false, planExpires: null, plan: null, cancelling: false },
  })
}

// A user can have more than one Cashfree subscription over time (change-plan,
// abandoned checkouts, re-subscribing). Webhooks for a subscription that is
// no longer the user's current one must never change their access — e.g. the
// old plan's CANCELLED event arriving after the new plan was bought.
// Legacy rows with no stored merchant_sub_id are treated as current.
export async function isCurrentSubscription(
  userId: string,
  merchantSubId: string | undefined,
): Promise<boolean> {
  if (!merchantSubId) return true
  const stored = (await redisCommand('GET', `sub:${userId}:merchant_sub_id`)) as string | null
  return !stored || stored === merchantSubId
}

// Subscriptions we have cancelled (or Cashfree reported as ended) are recorded
// so a late or replayed activation/payment webhook for them can never turn
// Pro back on. Kept a little over a year — longer than any plan period.
const ENDED_TTL_SECONDS = String(400 * 24 * 3600)

export async function markSubscriptionEnded(merchantSubId: string | undefined): Promise<void> {
  if (!merchantSubId) return
  await redisCommand('SET', `cfsub:ended:${merchantSubId}`, '1', 'EX', ENDED_TTL_SECONDS)
}

export async function isSubscriptionEnded(merchantSubId: string | undefined): Promise<boolean> {
  if (!merchantSubId) return false
  return (await redisCommand('GET', `cfsub:ended:${merchantSubId}`)) !== null
}

export async function refreshSubscriptionExpiry(
  userId: string,
  expiresAt: Date,
): Promise<void> {
  const expiresISO = expiresAt.toISOString()
  await redisCommand('SET', `sub:${userId}:expires_at`, expiresISO)
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { isPro: true, planExpires: expiresISO },
  })
}
