'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
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
  const [status, setStatus] = useState<'idle' | 'paying' | 'activating' | 'done' | 'error'>('idle')

  async function handleClick() {
    if (!isSignedIn) {
      openSignIn({ fallbackRedirectUrl: '/pro' })
      return
    }
    setLoading(true)
    setStatus('paying')
    try {
      const res = await fetch('/api/razorpay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { subscriptionId, keyId } = await res.json()

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId,
          subscription_id: subscriptionId,
          name: 'BhaavBrief',
          description:
            plan === 'yearly' ? 'Pro Annual — ₹2,999/year' :
            plan === 'daily'  ? 'Pro Daily — ₹33/day' :
            'Pro Monthly — ₹333/month',
          theme: { color: '#1a1a1a' },
          handler: () => resolve(),
          modal: { ondismiss: () => reject(new Error('dismissed')) },
        })
        rzp.open()
      })

      // Payment confirmed — poll until webhook propagates Pro status
      setStatus('activating')
      await pollUntilPro()
      setStatus('done')
      router.push('/options')
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'dismissed') {
        setStatus('idle')
      } else {
        setStatus('error')
      }
    } finally {
      setLoading(false)
    }
  }

  async function pollUntilPro(maxAttempts = 15) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const res = await fetch('/api/razorpay/poll-status')
      if (res.ok) {
        const { isPro } = await res.json()
        if (isPro) return
      }
    }
  }

  const label =
    status === 'paying' ? 'Processing...' :
    status === 'activating' ? 'Activating Pro...' :
    status === 'done' ? 'Redirecting...' :
    status === 'error' ? 'Something went wrong — try again' :
    cta

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        width: '100%',
        marginTop: '0.6rem',
        padding: '0.55rem',
        background: loading ? '#6b7280' : '#1a1a1a',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  )
}
