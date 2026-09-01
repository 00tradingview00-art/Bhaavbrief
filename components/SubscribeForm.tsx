'use client'
import { useState } from 'react'
import { trackSubscribe, trackSubscribeCompleted, trackEvent } from '@/lib/analytics'

export default function SubscribeForm({ compact = false, primary = false, location, onSuccess }: { compact?: boolean; primary?: boolean; location?: string; onSuccess?: () => void }) {
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const loc = location ?? (compact ? 'sidebar' : 'page')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')

    // posthog is already loaded by PostHogProvider by the time a user submits;
    // import() here just resolves the cached module — no extra network request
    const ph = await import('posthog-js').then(m => m.default).catch(() => null)
    ph?.capture('subscribe_attempted', { location: loc })

    try {
      const res  = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        document.cookie = 'bb_sub=1; max-age=31536000; path=/; SameSite=Lax'
        setStatus('success')
        setMessage(data.message ?? 'You\'re in! First brief at 9:30 AM.')
        setEmail('')
        ph?.capture('subscribe_success', { location: loc })
        ph?.identify(email.trim())
        trackSubscribe(loc)
        trackSubscribeCompleted(loc)
        onSuccess?.()
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Something went wrong. Try again.')
        ph?.capture('subscribe_error', { error: data.error })
        trackEvent('subscribe_error', { source: loc, status: res.status })
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  // Radius is primary-only, matching btnStyle below — everywhere else
  // (~11 non-primary call sites: learn pages, about, brief_page, brief_gate
  // modal, email capture modal) stays pixel-identical to the pre-Part-12
  // styling, not just visually similar.
  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '10px 12px',
    border: '0.5px solid #C8C8B8', background: '#FAFAF6',
    fontFamily: 'var(--font-sans)', fontSize: 15, color: '#18180F',
    ...(primary ? { borderRadius: 6 } : {}),
    marginBottom: 8,
  }
  // Part 12 §12.4.8 PRIMARY CTA — gold fill only when `primary` is explicitly
  // set (the page's single designated Subscribe CTA block). Left as the
  // original neutral/ink button everywhere else: this component renders on
  // ~12 different pages/contexts, and making every instance gold would
  // itself violate the Gold Rule's "max 1-2 gold elements per viewport"
  // scarcity contract audited in Phase 3.
  const btnStyle: React.CSSProperties = primary
    ? {
        display: 'block', width: '100%',
        background: status === 'loading' ? 'var(--ink-4)' : 'var(--gold)',
        color: '#080A0C', fontFamily: 'var(--font-sans)',
        fontSize: 14, fontWeight: 800, letterSpacing: '0.01em', padding: '13px 20px',
        borderRadius: 9, border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
      }
    : {
        display: 'block', width: '100%', background: status === 'loading' ? '#8A8A7A' : '#18180F',
        color: '#FAFAF6', fontFamily: 'var(--font-sans)',
        fontSize: 11, letterSpacing: '0.05em', padding: 11,
        border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
      }

  if (status === 'success') {
    return (
      <div style={{ background: '#EAF5EE', border: '0.5px solid #5AAA70', padding: '1rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6630', marginBottom: 4 }}>✓ Subscribed</div>
        <p style={{ fontSize: 15, color: '#1E6630', margin: 0 }}>{message}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {!compact && (
        <>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8720A', marginBottom: '0.75rem' }}>
            Daily brief
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.5rem' }}>
            Get the brief by 9:30 AM IST
          </div>
          <p style={{ fontSize: 12, color: '#48483A', lineHeight: 1.65, fontWeight: 300, marginBottom: '1.1rem' }}>
            Full MCX analysis — gold, crude, silver, what to watch — in your inbox by 9:30 AM IST. Every weekday.
          </p>
        </>
      )}
      <input
        style={inputStyle}
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter your email address"
        required
      />
      <button style={btnStyle} type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Subscribing...' : 'Subscribe →'}
      </button>
      {status === 'error' && (
        <p style={{ fontSize: 11, color: '#991818', marginTop: 6, fontFamily: 'var(--font-sans)' }}>{message}</p>
      )}
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.04em', color: '#8A8A7A', textAlign: 'center', marginTop: 8 }}>
        No spam · Unsubscribe anytime
      </p>
    </form>
  )
}
