import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isProUser } from '@/lib/subscription'
import { redisCommand } from '@/lib/redis'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Account — BhaavBrief',
  robots: { index: false },
}

const PLAN_LABEL: Record<string, string> = {
  yearly: 'Annual',
  daily: 'Daily',
  monthly: 'Monthly',
}

const PLAN_PRICE: Record<string, string> = {
  yearly: '₹2,999/year',
  daily: '₹33/day',
  monthly: '₹333/month',
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 'var(--space-1)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--ink)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default async function AccountPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const pro = await isProUser(userId)
  const plan = pro ? (await redisCommand('GET', `sub:${userId}:plan`)) as string | null : null
  const expiresAt = pro ? (await redisCommand('GET', `sub:${userId}:expires_at`)) as string | null : null
  const subId = pro ? (await redisCommand('GET', `sub:${userId}:provider_sub_id`)) as string | null : null
  const provider = pro
    ? ((await redisCommand('GET', `sub:${userId}:provider`)) as string | null) ?? 'cashfree'
    : null

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const planKey = plan && PLAN_LABEL[plan] ? plan : 'monthly'

  return (
    <main style={{ maxWidth: 640, margin: '3rem auto', padding: '0 1rem', fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 'var(--space-8)' }}>
        My Account
      </h1>

      <Card padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>
            Subscription
          </div>
          {pro && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: '0.72rem', fontWeight: 700, color: 'var(--up)',
              background: 'var(--up-bg)', padding: '3px 10px', borderRadius: 'var(--radius-pill)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--up)', display: 'inline-block' }} />
              Active
            </span>
          )}
        </div>

        {pro ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
              <StatTile label="Plan" value={`BhaavBrief Pro — ${PLAN_LABEL[planKey]}`} sub={PLAN_PRICE[planKey]} />
              <StatTile label="Renews" value={expiryLabel ?? '—'} />
            </div>
            {subId && (
              <div style={{
                fontSize: '0.8rem', color: 'var(--ink-3)',
                borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)',
              }}>
                To cancel, contact support with subscription ID
                {provider ? ` (${provider})` : ''}:{' '}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-2)' }}>{subId}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <p style={{ color: 'var(--ink-3)', marginBottom: 'var(--space-5)', fontSize: '0.92rem' }}>
              You are on the free plan.
            </p>
            <Button href="/pro" variant="primary">Upgrade to Pro →</Button>
          </>
        )}
      </Card>
    </main>
  )
}
