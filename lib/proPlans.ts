// Plan identifiers + prices — kept separate from lib/subscription.ts because
// that file imports @clerk/nextjs/server (server-only), and this needs to be
// importable from client components (ProCheckout.tsx, ProPaidPoller.tsx) for
// the GA4 purchase event's value.

export type Plan = 'daily' | 'monthly' | 'yearly'

export const PLAN_PRICES: Record<Plan, number> = { daily: 33, monthly: 333, yearly: 2999 }
