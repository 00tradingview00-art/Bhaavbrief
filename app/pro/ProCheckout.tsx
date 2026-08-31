'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

declare global {
  interface Window {
    Cashfree?: (opts: { mode: 'sandbox' | 'production' }) => {
      subscriptionsCheckout: (opts: {
        subsSessionId: string
        redirectTarget?: string
      }) => Promise<{ error?: { message?: string } }>
    }
  }
}

interface Props {
  plan: 'daily' | 'monthly' | 'yearly'
  cta: string
}

export default function ProCheckout({ plan, cta }: Props) {
  const { isSignedIn } = useUser()
  const { openSignIn } = useClerk()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [needPhone, setNeedPhone] = useState(false)
  const [status, setStatus] = useState<'idle' | 'paying' | 'activating' | 'done' | 'delayed' | 'error'>('idle')

  async function handleClick() {
    if (!isSignedIn) {
      openSignIn({ fallbackRedirectUrl: '/pro' })
      return
    }

    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setNeedPhone(true)
      return
    }

    setLoading(true)
    setStatus('paying')
    try {
      const res = await fetch('/api/cashfree/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, phone }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error((errBody as { error?: string }).error ?? 'Checkout failed')
      }
      const { subscriptionSessionId, mode } = await res.json() as {
        subscriptionSessionId: string
        mode: 'sandbox' | 'production'
      }

      if (!window.Cashfree) {
        throw new Error('Cashfree SDK failed to load — refresh and try again')
      }

      const cashfree = window.Cashfree({ mode: mode ?? 'sandbox' })
      const result = await cashfree.subscriptionsCheckout({
        subsSessionId: subscriptionSessionId,
        redirectTarget: '_self',
      })
      if (result?.error) {
        throw new Error(result.error.message ?? 'Checkout failed')
      }
      // redirectTarget _self normally navigates away; if not, poll here
      setStatus('activating')
      const activated = await pollUntilPro()
      if (activated) {
        setStatus('done')
        router.push('/options')
      } else {
        setStatus('delayed')
      }
    } catch (err: unknown) {
      console.error('[ProCheckout]', err)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  async function pollUntilPro(maxAttempts = 15): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const res = await fetch('/api/cashfree/poll-status')
      if (res.ok) {
        const { isPro } = await res.json()
        if (isPro) return true
      }
    }
    return false
  }

  const label =
    status === 'paying' ? 'Processing...' :
    status === 'activating' ? 'Activating Pro...' :
    status === 'done' ? 'Redirecting...' :
    status === 'delayed' ? 'Payment received — activating (check My Account shortly)' :
    status === 'error' ? 'Something went wrong — try again' :
    cta

  const disabled = loading || status === 'delayed' || status === 'done'

  return (
    <div>
      {(needPhone || phone.length > 0) && status === 'idle' && (
        <input
          type="tel"
          inputMode="numeric"
          placeholder="10-digit mobile (required)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          aria-label="Mobile number for payment"
          style={{
            width: '100%',
            marginTop: '0.55rem',
            padding: '0.45rem 0.55rem',
            border: '1px solid var(--border)',
            borderRadius: 6,
            fontSize: '0.78rem',
            fontFamily: 'var(--font-sans)',
            color: 'var(--ink)',
            background: 'var(--surface)',
          }}
        />
      )}
      <button
        onClick={handleClick}
        disabled={disabled}
        style={{
          width: '100%',
          marginTop: '0.6rem',
          padding: '0.55rem',
          background: disabled ? '#6b7280' : '#1a1a1a',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {label}
      </button>
      {needPhone && phone.replace(/\D/g, '').length < 10 && status === 'idle' && (
        <p style={{ marginTop: '0.4rem', fontSize: '0.68rem', color: 'var(--ink-3)', lineHeight: 1.35 }}>
          Enter your mobile number to continue — required for UPI / card mandate.
        </p>
      )}
    </div>
  )
}
