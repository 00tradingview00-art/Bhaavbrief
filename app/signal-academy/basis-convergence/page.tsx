'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BasisConvergenceSimulator from '@/components/signal-academy/BasisConvergenceSimulator'

export default function BasisConvergencePage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null)

  useEffect(() => {
    setUnlocked(localStorage.getItem('bb_sa_unlocked') === '1')
  }, [])

  if (unlocked === null) return null

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(24px,4vw,40px) clamp(16px,4vw,24px)' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
        <Link href="/signal-academy" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>Signal Academy</Link>
        <span>›</span>
        <span style={{ color: 'var(--ink-3)' }}>Signal 3</span>
      </div>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--gold)',
            background: 'rgba(200,114,10,0.08)', border: '1px solid rgba(200,114,10,0.3)',
            padding: '2px 8px', borderRadius: 3, letterSpacing: '0.1em',
          }}>
            SIGNAL 3 · HEDGERS & ARBITRAGEURS
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px,4vw,30px)', fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px', lineHeight: 1.2 }}>
          Basis Convergence
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>
          Basis — the gap between futures price and spot price — must converge to zero at expiry. When that gap is too wide, too narrow, or negative, the physical market is sending a signal that price alone cannot reveal.
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
              The four market structures
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[
                {
                  label: 'Normal contango',
                  desc: 'Basis within carry range — equilibrium. No signal.',
                  color: 'var(--up)', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.3)',
                },
                {
                  label: 'Elevated contango',
                  desc: 'Basis above carry range — physical tightness or excess forward buying.',
                  color: '#E07020', bg: 'rgba(224,112,32,0.06)', border: 'rgba(224,112,32,0.3)',
                },
                {
                  label: 'Tight contango',
                  desc: 'Basis below carry range — mild surplus or cheap financing.',
                  color: '#D4A830', bg: 'rgba(212,168,48,0.06)', border: 'rgba(212,168,48,0.3)',
                },
                {
                  label: 'Backwardation',
                  desc: 'Basis negative — near-term supply squeeze or demand emergency.',
                  color: 'var(--down)', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.3)',
                },
              ].map(z => (
                <div key={z.label} style={{
                  background: z.bg,
                  border: `1px solid ${z.border}`,
                  borderRadius: 6,
                  padding: '10px 12px',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: z.color, marginBottom: 4 }}>{z.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.45 }}>{z.desc}</div>
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
              <BasisConvergenceSimulator />
            </div>
          </div>

          {/* Historical illustrative cases */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 28,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 14 }}>
              Illustrative historical patterns
            </div>
            {[
              {
                period: 'COVID demand collapse — Crude (Apr 2020)',
                signal: 'Deep backwardation briefly, then violent contango',
                detail: 'WTI spot turned negative as storage hit capacity. MCX Crude basis collapsed into the widest contango seen in decades — storage operators were the only buyers. The structure normalized within 3 months as demand recovered.',
              },
              {
                period: 'Dhanteras demand surge — Gold (Oct–Nov, most years)',
                signal: 'Elevated contango in the 15–20 days before expiry',
                detail: 'Physical gold demand spikes in the 10 days leading to Dhanteras. Jewellers buy forward, pushing basis above normal carry. Basis normalizes sharply after the festival window closes.',
              },
              {
                period: 'Russia-Ukraine supply shock — Natural Gas (Feb–Mar 2022)',
                signal: 'Persistent backwardation across European gas benchmarks',
                detail: 'Spot prices reflected immediate supply disruption premium. Forward markets priced in eventual normalization. MCX Natural Gas basis followed global structure into backwardation before recovering as LNG supply routes adjusted.',
              },
            ].map((c, i) => (
              <div key={i} style={{
                borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                paddingBottom: i < 2 ? 14 : 0,
                marginBottom: i < 2 ? 14 : 0,
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 3, flexShrink: 0 }}>
                    Illustrative
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-3)' }}>{c.period}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>
                  {c.signal}
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
                  {c.detail}
                </p>
              </div>
            ))}
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
                Next — Signal 4
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                Seasonal Patterns — India-specific demand calendar for each commodity
              </div>
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--ink-4)',
              padding: '7px 14px', border: '1px solid var(--border)',
              borderRadius: 4, flexShrink: 0,
            }}>
              Coming soon
            </span>
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
