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
  const subId = pro ? (await redisCommand('GET', `sub:${userId}:razorpay_sub_id`)) as string | null : null

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <main style={{ maxWidth: 600, margin: '3rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>My Account</h1>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Subscription</h2>
        {pro ? (
          <>
            <p><strong>Plan:</strong> BhaavBrief Pro — {plan === 'yearly' ? 'Annual (₹2,999/year)' : 'Monthly (₹333/month)'}</p>
            <p style={{ marginTop: '0.5rem' }}><strong>Renews:</strong> {expiryLabel}</p>
            {subId && (
              <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
                To cancel, contact support with subscription ID: {subId}
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>You are on the free plan.</p>
            <a
              href="/pro"
              style={{
                display: 'inline-block', background: '#1a1a1a', color: '#fff',
                padding: '0.6rem 1.25rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.9rem',
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
