'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'idle' | 'confirming' | 'loading' | 'error'

export default function CancelSubscriptionButton() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setStep('loading')
    setError(null)
    try {
      const res = await fetch('/api/cashfree/cancel', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Cancellation failed')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancellation failed')
      setStep('error')
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('confirming')}
        style={{
          fontSize: '0.8rem', color: 'var(--down)', background: 'none', border: 'none',
          padding: 0, cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        Cancel subscription
      </button>
    )
  }

  if (step === 'confirming' || step === 'loading') {
    return (
      <div style={{ fontSize: '0.85rem', color: 'var(--ink-2)' }}>
        <p style={{ margin: '0 0 0.6rem' }}>
          Cancel your Pro subscription? You&apos;ll keep access until your current billing period ends — no refund for the remaining time.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={handleConfirm}
            disabled={step === 'loading'}
            style={{
              fontSize: '0.8rem', fontWeight: 600, color: '#fff', background: 'var(--down)',
              border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.85rem',
              cursor: step === 'loading' ? 'not-allowed' : 'pointer', opacity: step === 'loading' ? 0.6 : 1,
            }}
          >
            {step === 'loading' ? 'Cancelling…' : 'Yes, cancel'}
          </button>
          <button
            onClick={() => setStep('idle')}
            disabled={step === 'loading'}
            style={{
              fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-2)', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.85rem',
              cursor: step === 'loading' ? 'not-allowed' : 'pointer',
            }}
          >
            Keep subscription
          </button>
        </div>
      </div>
    )
  }

  // step === 'error'
  return (
    <div style={{ fontSize: '0.85rem' }}>
      <p style={{ color: 'var(--down)', margin: '0 0 0.4rem' }}>{error}</p>
      <button
        onClick={() => setStep('confirming')}
        style={{
          fontSize: '0.8rem', color: 'var(--gold-dark)', background: 'none', border: 'none',
          padding: 0, cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        Try again
      </button>
    </div>
  )
}
