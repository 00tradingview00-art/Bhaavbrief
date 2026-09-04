// Subscription status for BhaavBrief Pro.
//
// Redis key schema (Upstash, via redisCommand):
//   sub:{userId}:status          → "active" | "cancelled" | "expired"
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
// Internal access — two separate, additive mechanisms, neither of which
// loosens or replaces the Redis check above for a real customer:
//   ADMIN_USER_IDS       → a hand-maintained allowlist of Clerk userIds (the
//                           founder's own account) that always reads as Pro,
//                           so real Pro UI/UX can be verified in the browser
//                           without an actual Cashfree subscription. Checked
//                           first in isProUser() so every existing call site
//                           (server components AND /api/cashfree/poll-status,
//                           which useIsPro() polls client-side) picks it up
//                           automatically — no other file needs to change.
//   INTERNAL_ACCESS_SECRET → a bearer-token secret for server-to-server
//                           access (backend scripts, e.g. the reel campaign
//                           pipeline) — see hasInternalAccess() below.
// Deliberately a separate secret from CRON_SECRET: that one scopes to the
// app's own cron/ops infra, this one grants Pro-data access — a different
// privilege, kept on a different secret so a leak of one doesn't grant the
// other.

import { redisCommand } from './redis'
import { clerkClient } from '@clerk/nextjs/server'
import type { Plan } from './proPlans'

export type { Plan } from './proPlans'
export type SubStatus = 'active' | 'cancelled' | 'expired'

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS ?? '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean)

export async function isProUser(userId: string | null): Promise<boolean> {
  if (userId && ADMIN_USER_IDS.includes(userId)) return true
  if (!userId) return false
  const status = await redisCommand('GET', `sub:${userId}:status`)
  if (status !== 'active') return false
  const expiresAt = await redisCommand('GET', `sub:${userId}:expires_at`)
  if (!expiresAt) return false
  return new Date(expiresAt as string) > new Date()
}

// Bearer-secret check for server-to-server internal access (backend scripts
// hitting Pro-gated API routes with no Clerk session at all). A real
// customer's browser never sends this header — there is no UI, cookie, or
// normal request path that would ever attach it.
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
    publicMetadata: { isPro: true, planExpires: expiresISO, plan },
  })
}

export async function deactivateSubscription(userId: string): Promise<void> {
  await redisCommand('SET', `sub:${userId}:status`, 'cancelled')
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { isPro: false, planExpires: null, plan: null },
  })
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
