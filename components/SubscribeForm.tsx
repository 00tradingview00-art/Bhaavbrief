'use client'
import { useState } from 'react'
import { usePostHog } from 'posthog-js/react'

export default function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const ph = usePostHog()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    ph?.capture('subscribe_attempted', { location: compact ? 'sidebar' : 'page' })
    try {
      const res  = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        setMessage(data.message ?? 'You\'re in! First brief at 9:30 AM.')
        setEmail('')
        ph?.capture('subscribe_success', { location: compact ? 'sidebar' : 'page' })
        ph?.identify(email.trim())
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Something went wrong. Try again.')
        ph?.capture('subscribe_error', { error: data.error })
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '10px 12px',
    border: '0.5px solid #C8C8B8', background: '#FAFAF6',
    fontFamily: 'var(--font-sans)', fontSize: 13, color: '#18180F',
    outline: 'none', marginBottom: 8,
  }
  const btnStyle: React.CSSProperties = {
    display: 'block', width: '100%', background: status === 'loading' ? '#8A8A7A' : '#18180F',
    color: '#FAFAF6', fontFamily: 'var(--font-mono)',
    fontSize: 11, letterSpacing: '0.05em', padding: 11,
    border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  }

  if (status === 'success') {
    return (
      <div style={{ background: '#EAF5EE', border: '0.5px solid #5AAA70', padding: '1rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6630', marginBottom: 4 }}>✓ Subscribed</div>
        <p style={{ fontSize: 13, color: '#1E6630', margin: 0 }}>{message}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {!compact && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8720A', marginBottom: '0.75rem' }}>
            Daily brief
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.5rem' }}>
            Start your morning with an edge
          </div>
          <p style={{ fontSize: 12, color: '#48483A', lineHeight: 1.65, fontWeight: 300, marginBottom: '1.1rem' }}>
            Join traders, investors and merchants who track Indian commodity markets. Every weekday at 9:30 AM.
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
        <p style={{ fontSize: 11, color: '#991818', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{message}</p>
      )}
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.04em', color: '#8A8A7A', textAlign: 'center', marginTop: 8 }}>
        No spam · Unsubscribe anytime
      </p>
    </form>
  )
}
