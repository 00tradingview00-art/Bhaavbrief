'use client'

import { useEffect } from 'react'
import SubscribeForm from './SubscribeForm'

function revealContent() {
  const gate   = document.getElementById('brief-gate')
  const locked = document.getElementById('brief-locked')
  const fade   = document.getElementById('brief-fade')
  if (gate)   gate.style.display   = 'none'
  if (locked) locked.style.display = 'block'
  if (fade)   fade.style.display   = 'none'
}

export default function BriefGate() {
  useEffect(() => {
    if (document.cookie.split(';').some(c => c.trim() === 'bb_sub=1')) {
      revealContent()
    }
  }, [])

  return (
    <div id="brief-gate" style={{
      margin: '1.5rem 0 2rem',
      border: '1px solid rgba(181,134,42,0.35)',
      borderLeft: '3px solid var(--gold)',
      background: 'var(--gold-pale)',
      borderRadius: '0 4px 4px 0',
      padding: '1.5rem 1.75rem',
    }}>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 10,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--gold)', fontWeight: 700, marginBottom: 10,
      }}>
        Subscriber exclusive
      </div>
      <h3 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
        fontWeight: 700, lineHeight: 1.25,
        color: 'var(--ink)', margin: '0 0 0.5rem',
      }}>
        Get the full analysis by 9:30 AM IST
      </h3>
      <p style={{ fontSize: 13, color: '#48483A', lineHeight: 1.65, margin: '0 0 1.25rem' }}>
        The rest of this brief — what the market is actually saying, historical context, what kills the trade, and who is affected — lands in your inbox by 9:30 AM IST. Not on this page.
      </p>
      <div style={{ maxWidth: 380 }}>
        <SubscribeForm compact location="brief_gate" onSuccess={revealContent} />
      </div>
    </div>
  )
}
