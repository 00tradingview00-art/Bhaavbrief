'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'idle' | 'picking' | 'confirming' | 'loading' | 'error'
type Plan = 'daily' | 'monthly' | 'yearly'

const PLAN_LABEL: Record<Plan, string> = { yearly: 'Annual', daily: 'Daily', monthly: 'Monthly' }
const PLAN_PRICE: Record<Plan, string> = { yearly: '₹2,999/year', daily: '₹33/day', monthly: '₹333/month' }
const ALL_PLANS: Plan[] = ['daily', 'monthly', 'yearly']

export default function ChangePlanButton({ currentPlan }: { currentPlan: Plan }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('idle')
  const [selected, setSelected] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)

  const otherPlans = ALL_PLANS.filter(p => p !== currentPlan)

  async function handleConfirm() {
    if (!selected) return
    setStep('loading')
    setError(null)
    try {
      const res = await fetch('/api/cashfree/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Plan change failed')
      router.push('/pro')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Plan change failed')
      setStep('error')
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('picking')}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.88rem',
          padding: '0.6rem 1.4rem', borderRadius: 'var(--radius-sm)',
          background: 'var(--ink)', color: '#fff', border: '1px solid var(--ink)', cursor: 'pointer',
        }}
      >
        Change plan
      </button>
    )
  }

  if (step === 'picking') {
    return (
      <div style={{ fontSize: '0.85rem' }}>
        <p style={{ margin: '0 0 0.6rem', color: 'var(--ink-2)' }}>Switch to:</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.7rem' }}>
          {otherPlans.map(p => (
            <button
              key={p}
              onClick={() => { setSelected(p); setStep('confirming') }}
              style={{
                fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.9rem',
                cursor: 'pointer',
              }}
            >
              {PLAN_LABEL[p]} — {PLAN_PRICE[p]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setStep('idle')}
          style={{ fontSize: '0.78rem', color: 'var(--ink-3)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Never mind
        </button>
      </div>
    )
  }

  if (step === 'confirming' || step === 'loading') {
    return (
      <div style={{ fontSize: '0.85rem' }}>
        <p style={{ margin: '0 0 0.6rem', color: 'var(--ink-2)' }}>
          Switch to {selected && PLAN_LABEL[selected]} ({selected && PLAN_PRICE[selected]})? This cancels
          your current plan immediately and takes you to checkout for the new one — there&apos;s a short
          gap with no active Pro access until you complete it. No refund for time remaining on your
          current plan.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={handleConfirm}
            disabled={step === 'loading'}
            style={{
              fontSize: '0.8rem', fontWeight: 600, color: '#fff', background: 'var(--ink)',
              border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.85rem',
              cursor: step === 'loading' ? 'not-allowed' : 'pointer', opacity: step === 'loading' ? 0.6 : 1,
            }}
          >
            {step === 'loading' ? 'Switching…' : 'Yes, switch plan'}
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
            Keep current plan
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
        onClick={() => setStep('picking')}
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
