// Subscription status for BhaavBrief Pro.
//
// Redis key schema (Upstash, via redisCommand):
//   sub:{userId}:status          → "active" | "cancelled" | "expired"
//   sub:{userId}:plan            → "daily" | "monthly" | "yearly"
//   sub:{userId}:provider        → "cashfree"
//   sub:{userId}:provider_sub_id → external subscription id
//   sub:{userId}:expires_at      → ISO 8601 timestamp
//
// Clerk publicMetadata.isPro mirrors status for client-side use without Redis
// (see scalability note in plan: options pages use ISR + client-side override).

import { redisCommand } from './redis'
import { clerkClient } from '@clerk/nextjs/server'

export type Plan = 'daily' | 'monthly' | 'yearly'
export type SubStatus = 'active' | 'cancelled' | 'expired'

export async function isProUser(userId: string | null): Promise<boolean> {
  if (!userId) return false
  const status = await redisCommand('GET', `sub:${userId}:status`)
  if (status !== 'active') return false
  const expiresAt = await redisCommand('GET', `sub:${userId}:expires_at`)
  if (!expiresAt) return false
  return new Date(expiresAt as string) > new Date()
}

export async function activateSubscription(
  userId: string,
  providerSubId: string,
  plan: Plan,
  expiresAt: Date,
): Promise<void> {
  const expiresISO = expiresAt.toISOString()
  await redisCommand(
    'MSET',
    `sub:${userId}:status`, 'active',
    `sub:${userId}:plan`, plan,
    `sub:${userId}:provider`, 'cashfree',
    `sub:${userId}:provider_sub_id`, providerSubId,
    `sub:${userId}:expires_at`, expiresISO,
  )
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
