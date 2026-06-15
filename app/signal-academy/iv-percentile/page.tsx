'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import IVPercentileSimulator from '@/components/signal-academy/IVPercentileSimulator'

export default function IVPercentilePage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null)

  useEffect(() => {
    setUnlocked(localStorage.getItem('bb_sa_unlocked') === '1')
  }, [])

  if (unlocked === null) return null // hydration guard

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(24px,4vw,40px) clamp(16px,4vw,24px)' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
        <Link href="/signal-academy" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>Signal Academy</Link>
        <span>›</span>
        <span style={{ color: 'var(--ink-3)' }}>Signal 2</span>
      </div>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--gold)',
            background: 'rgba(200,114,10,0.08)', border: '1px solid rgba(200,114,10,0.3)',
            padding: '2px 8px', borderRadius: 3, letterSpacing: '0.1em',
          }}>
            SIGNAL 2 · OPTIONS TRADERS
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px,4vw,30px)', fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px', lineHeight: 1.2 }}>
          IV Percentile
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>
          Implied volatility tells you how much the market expects a commodity to move. IV percentile tells you whether that expectation is cheap or expensive relative to the past year — the difference between buying insurance at a fair price and overpaying for it.
        </p>
      </div>

      {!unlocked ? (
        /* Gate */
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '40px 32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
            Unlock Signal Academy to access this simulator
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.65, maxWidth: 380, margin: '0 auto 24px' }}>
            Share BhaavBrief with 5 people using your referral link. When 5 people visit, all 5 simulators unlock permanently.
          </p>
          <Link href="/signal-academy" style={{
            display: 'inline-block',
            background: 'var(--ink)',
            color: 'var(--surface)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.05em',
            padding: '11px 24px',
            textDecoration: 'none',
            borderRadius: 4,
          }}>
            Get my referral link →
          </Link>
        </div>
      ) : (
        <>
          {/* Concept primer */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 28,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12 }}>
              The four zones
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[
                { range: '0–25th', zone: 'Cheap', bias: 'Buy options — straddles, strangles', color: 'var(--up)', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.3)' },
                { range: '25–60th', zone: 'Neutral', bias: 'Directional spreads, defined risk', color: '#D4A830', bg: 'rgba(212,168,48,0.06)', border: 'rgba(212,168,48,0.3)' },
                { range: '60–80th', zone: 'Elevated', bias: 'Premium selling with hedges', color: '#E07020', bg: 'rgba(224,112,32,0.06)', border: 'rgba(224,112,32,0.3)' },
                { range: '80–100th', zone: 'Expensive', bias: 'Credit spreads, iron condors', color: 'var(--down)', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.3)' },
              ].map(z => (
                <div key={z.zone} style={{
                  background: z.bg,
                  border: `1px solid ${z.border}`,
                  borderRadius: 6,
                  padding: '10px 12px',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', marginBottom: 3 }}>{z.range}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: z.color, marginBottom: 4 }}>{z.zone}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.45 }}>{z.bias}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Simulator */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 32 }}>
            <div style={{
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                Interactive simulator — illustrative data
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)' }}>
                Not real-time · Educational only
              </span>
            </div>
            <div style={{ padding: '24px 20px' }}>
              <IVPercentileSimulator />
            </div>
          </div>

          {/* Next signal teaser */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                Next — Signal 3
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                Basis Convergence — futures vs spot and what distortion signals
              </div>
            </div>
            <Link href="/signal-academy/basis-convergence" style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--gold)', textDecoration: 'none',
              padding: '7px 14px', border: '1px solid rgba(200,114,10,0.3)',
              borderRadius: 4, flexShrink: 0,
            }}>
              Open →
            </Link>
          </div>

          {/* Disclaimer */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 32, paddingTop: 16 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', lineHeight: 1.7, margin: 0 }}>
              Educational content only. BhaavBrief is not a SEBI-registered Research Analyst or Investment Adviser. All simulator data is illustrative. Past patterns are not indicative of future market behaviour. Consult a SEBI-registered RA or IA before making trading decisions.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
