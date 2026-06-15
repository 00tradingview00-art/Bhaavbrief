'use client'

import { useState, useEffect } from 'react'

const UNLOCK_THRESHOLD = 5

/** Deterministic ref code — same logic as server-side getRefCode() via SubtleCrypto */
async function computeRefCode(email: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.toLowerCase().trim()))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12)
}

function getOrCreateVisitorId(): string {
  const key = 'bb_visitor_id'
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
}

interface Props {
  onUnlock: () => void
  alreadyUnlocked: boolean
}

export default function ReferralGate({ onUnlock, alreadyUnlocked }: Props) {
  const [email,    setEmail]    = useState('')
  const [refCode,  setRefCode]  = useState<string | null>(null)
  const [visits,   setVisits]   = useState(0)
  const [unlocked, setUnlocked] = useState(alreadyUnlocked)
  const [loading,  setLoading]  = useState(false)
  const [copied,   setCopied]   = useState(false)

  const refUrl = refCode ? `https://bhaavbrief.in/?ref=${refCode}` : ''

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    const code = await computeRefCode(email.trim())
    setRefCode(code)

    const res = await fetch(`/api/referral-status?ref=${code}`).catch(() => null)
    if (res?.ok) {
      const data = await res.json() as { visits: number; unlocked: boolean }
      setVisits(data.visits)
      if (data.unlocked) {
        setUnlocked(true)
        localStorage.setItem('bb_sa_unlocked', '1')
        localStorage.setItem('bb_sa_ref', code)
        onUnlock()
      }
    }
    setLoading(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(refUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (unlocked) {
    return (
      <div style={{
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid var(--up)',
        borderRadius: 10,
        padding: '20px 24px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🎓</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
          Signal Academy unlocked
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
          All 5 simulators are now accessible
        </div>
      </div>
    )
  }

  if (!refCode) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '24px',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
          Unlock Signal Academy
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, lineHeight: 1.35 }}>
          Share BhaavBrief with 5 people → get full access
        </div>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.65, marginBottom: 20 }}>
          Enter your subscriber email to get your referral link. When 5 people visit BhaavBrief through your link, all 5 simulators unlock permanently.
        </p>
        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{
              flex: 1, minWidth: 200,
              padding: '10px 12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
              color: 'var(--ink)',
              outline: 'none',
              borderRadius: 4,
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: 'var(--ink)',
              color: 'var(--surface)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.05em',
              border: 'none',
              borderRadius: 4,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Checking…' : 'Get my link →'}
          </button>
        </form>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 12 }}>
          Not subscribed yet?{' '}
          <a href="/#subscribe" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Subscribe free</a>
          {' '}— then come back here.
        </p>
      </div>
    )
  }

  const shareText = encodeURIComponent(
    `Check out BhaavBrief's Signal Academy — teaches you how to read MCX commodity signals (OI divergence, IV percentile, basis, seasonal patterns). Actually useful, completely free: ${refUrl}`
  )
  const tweetText = encodeURIComponent(
    `Been using @BhaavBrief to understand MCX commodity signals better. Their Signal Academy explains OI divergence, IV percentile and basis convergence interactively. Free: ${refUrl}`
  )

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '24px',
    }}>
      {/* Progress */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Referral progress
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: visits >= UNLOCK_THRESHOLD ? 'var(--up)' : 'var(--ink)' }}>
            {visits} / {UNLOCK_THRESHOLD} visits
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, (visits / UNLOCK_THRESHOLD) * 100)}%`,
            background: visits >= UNLOCK_THRESHOLD ? 'var(--up)' : 'var(--gold)',
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }} />
        </div>
        {visits > 0 && visits < UNLOCK_THRESHOLD && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 8 }}>
            {UNLOCK_THRESHOLD - visits} more visit{UNLOCK_THRESHOLD - visits !== 1 ? 's' : ''} to unlock all simulators
          </p>
        )}
      </div>

      {/* Ref link */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          Your referral link
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: 1,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '9px 12px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {refUrl}
          </div>
          <button
            onClick={copyLink}
            style={{
              padding: '9px 16px',
              background: copied ? 'var(--up)' : 'var(--ink)',
              color: 'var(--surface)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.05em',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Share buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a
          href={`https://wa.me/?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1, minWidth: 100, textAlign: 'center',
            padding: '9px 12px',
            background: '#25D366',
            color: '#fff',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.05em',
            textDecoration: 'none',
            borderRadius: 4,
          }}
        >
          WhatsApp
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${tweetText}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1, minWidth: 100, textAlign: 'center',
            padding: '9px 12px',
            background: '#000',
            color: '#fff',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.05em',
            textDecoration: 'none',
            borderRadius: 4,
          }}
        >
          Post on X
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(refUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1, minWidth: 100, textAlign: 'center',
            padding: '9px 12px',
            background: '#0A66C2',
            color: '#fff',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.05em',
            textDecoration: 'none',
            borderRadius: 4,
          }}
        >
          LinkedIn
        </a>
      </div>
    </div>
  )
}
