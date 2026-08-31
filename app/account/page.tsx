import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isProUser } from '@/lib/subscription'
import { redisCommand } from '@/lib/redis'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Account — BhaavBrief',
  robots: { index: false },
}

export default async function AccountPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const pro = await isProUser(userId)
  const plan = pro ? (await redisCommand('GET', `sub:${userId}:plan`)) as string | null : null
  const expiresAt = pro ? (await redisCommand('GET', `sub:${userId}:expires_at`)) as string | null : null
  const subId = pro
    ? (
        (await redisCommand('GET', `sub:${userId}:provider_sub_id`)) as string | null
        ?? (await redisCommand('GET', `sub:${userId}:razorpay_sub_id`)) as string | null
      )
    : null
  const provider = pro
    ? ((await redisCommand('GET', `sub:${userId}:provider`)) as string | null) ?? 'cashfree'
    : null

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <main style={{ maxWidth: 600, margin: '3rem auto', padding: '0 1rem', fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '2rem' }}>My Account</h1>

      <section style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem', background: 'var(--surface-2)' }}>
        <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: '1rem' }}>Subscription</h2>
        {pro ? (
          <>
            <p style={{ color: 'var(--ink)', marginBottom: '0.5rem' }}>
              <strong>Plan:</strong> BhaavBrief Pro — {
                plan === 'yearly' ? 'Annual (₹2,999/year)' :
                plan === 'daily'  ? 'Daily (₹33/day)' :
                'Monthly (₹333/month)'
              }
            </p>
            <p style={{ color: 'var(--ink-2)' }}><strong>Renews:</strong> {expiryLabel}</p>
            {subId && (
              <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--ink-3)', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                To cancel, contact support with subscription ID
                {provider ? ` (${provider})` : ''}:{' '}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{subId}</span>
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ color: 'var(--ink-3)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>You are on the free plan.</p>
            <a
              href="/pro"
              style={{
                display: 'inline-block', background: 'var(--ink)', color: '#fff',
                padding: '0.6rem 1.4rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
              }}
            >
              Upgrade to Pro →
            </a>
          </>
        )}
      </section>
    </main>
  )
}
