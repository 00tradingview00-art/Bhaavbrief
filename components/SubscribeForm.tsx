'use client'
import { useState } from 'react'

export default function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res  = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        setMessage(data.message ?? 'You\'re in! First brief at 7 AM.')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Something went wrong. Try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '10px 12px',
    border: '0.5px solid #C8C8B8', background: '#FAFAF6',
    fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, color: '#18180F',
    outline: 'none', marginBottom: 8,
  }
  const btnStyle: React.CSSProperties = {
    display: 'block', width: '100%', background: status === 'loading' ? '#8A8A7A' : '#18180F',
    color: '#FAFAF6', fontFamily: 'IBM Plex Mono, monospace',
    fontSize: 11, letterSpacing: '0.05em', padding: 11,
    border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  }

  if (status === 'success') {
    return (
      <div style={{ background: '#EAF5EE', border: '0.5px solid #5AAA70', padding: '1rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6630', marginBottom: 4 }}>✓ Subscribed</div>
        <p style={{ fontSize: 13, color: '#1E6630', margin: 0 }}>{message}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {!compact && (
        <>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8720A', marginBottom: '0.75rem' }}>
            Free daily brief
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.5rem' }}>
            Start your morning with an edge
          </div>
          <p style={{ fontSize: 12, color: '#48483A', lineHeight: 1.65, fontWeight: 300, marginBottom: '1.1rem' }}>
            Join India's sharpest commodity traders. MCX intelligence every weekday at 7 AM. Free forever.
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
        {status === 'loading' ? 'Subscribing...' : 'Subscribe free →'}
      </button>
      {status === 'error' && (
        <p style={{ fontSize: 11, color: '#991818', marginTop: 6, fontFamily: 'IBM Plex Mono, monospace' }}>{message}</p>
      )}
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.04em', color: '#8A8A7A', textAlign: 'center', marginTop: 8 }}>
        No spam · Unsubscribe anytime
      </p>
      <hr style={{ border: 'none', borderTop: '0.5px solid #DDDDD0', margin: '1rem 0' }} />
      <a
        href="https://wa.me/message/YOUR_WHATSAPP_LINK"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: '#25D366', color: '#fff', fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 11, letterSpacing: '0.04em', padding: 10, textDecoration: 'none',
          width: '100%',
        }}
      >
        📲 Get alerts on WhatsApp instead
      </a>
    </form>
  )
}
