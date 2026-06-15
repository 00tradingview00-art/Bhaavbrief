'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ReferralGate from '@/components/signal-academy/ReferralGate'

const DISCLAIMER = `This content is for educational purposes only. BhaavBrief is not a SEBI-registered Research Analyst or Investment Adviser. All data used in simulators is illustrative and does not represent real-time or historical market data. Simulated patterns are for learning purposes only and are not indicative of future market behaviour. Past patterns, whether real or illustrative, are not a guarantee of future returns. Please consult a SEBI-registered Research Analyst or Investment Adviser before making any trading or investment decisions.`

const SIGNALS = [
  {
    slug:     'oi-divergence',
    number:   1,
    title:    'OI Divergence',
    tagline:  'Money flow conviction behind price moves',
    audience: 'All MCX traders',
    preview:  'Four-state matrix: price + OI tell you if a move has conviction or is exhaustion.',
    live:     true,
  },
  {
    slug:     'iv-percentile',
    number:   2,
    title:    'IV Percentile',
    tagline:  'Whether options are cheap or expensive vs history',
    audience: 'Options traders',
    preview:  'Rank today\'s implied volatility against the past 52 weeks. Know when to buy or sell options.',
    live:     false,
  },
  {
    slug:     'basis-convergence',
    number:   3,
    title:    'Basis Convergence',
    tagline:  'Futures vs spot spread and what distortion signals',
    audience: 'Hedgers, arbitrageurs',
    preview:  'Normal contango, elevated contango, backwardation — what each tells you about physical markets.',
    live:     false,
  },
  {
    slug:     'seasonal-patterns',
    number:   4,
    title:    'Seasonal Patterns',
    tagline:  'India-specific demand calendar for each commodity',
    audience: 'All MCX traders',
    preview:  'Akshaya Tritiya, Dhanteras, monsoon, winter heating — the recurring cycles that move MCX.',
    live:     false,
  },
  {
    slug:     'volume-anomaly',
    number:   5,
    title:    'Volume Anomaly',
    tagline:  'Authenticating price moves with participation data',
    audience: 'All MCX traders',
    preview:  'When volume is 2× the 20-day average, it\'s an institutional move. Combined signal matrix shows you how to classify it.',
    live:     false,
  },
]

export default function SignalAcademyPage() {
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('bb_sa_unlocked') === '1') setUnlocked(true)
  }, [])

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(24px,4vw,40px) clamp(16px,4vw,24px)' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
          BhaavBrief
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(26px,4vw,36px)', fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px', lineHeight: 1.2 }}>
          Signal Academy
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0, fontWeight: 300, maxWidth: 540 }}>
          Five interactive simulators that teach you how to read the signals beneath MCX price moves — open interest, implied volatility, basis, seasonal demand, and volume anomalies.
        </p>
      </div>

      {/* SEBI disclaimer */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--ink-4)',
        borderRadius: '0 6px 6px 0',
        padding: '12px 16px',
        marginBottom: 32,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>
          Educational content only — SEBI compliance notice
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', lineHeight: 1.7, margin: 0 }}>
          {DISCLAIMER}
        </p>
      </div>

      {/* Signal cards */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 16 }}>
          5 signals · {unlocked ? 'all unlocked' : '1 live · 4 locked'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SIGNALS.map(signal => {
            const accessible = signal.live || unlocked

            return (
              <div
                key={signal.slug}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '16px 18px',
                  opacity: accessible ? 1 : 0.7,
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                }}
              >
                {/* Number */}
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: accessible ? 'var(--gold)' : 'var(--ink-4)',
                  background: accessible ? 'rgba(200,114,10,0.08)' : 'var(--surface)',
                  border: `1px solid ${accessible ? 'rgba(200,114,10,0.3)' : 'var(--border)'}`,
                  borderRadius: 4,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontWeight: 600,
                }}>
                  {signal.number}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                      {signal.title}
                    </span>
                    {signal.live && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--up)', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', padding: '1px 6px', borderRadius: 3, letterSpacing: '0.08em' }}>
                        LIVE
                      </span>
                    )}
                    {!accessible && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 3 }}>
                        🔒 LOCKED
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', marginBottom: 6 }}>
                    {signal.tagline} · {signal.audience}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55, margin: 0, fontWeight: 300 }}>
                    {signal.preview}
                  </p>
                </div>

                {/* CTA */}
                {accessible ? (
                  <Link
                    href={`/signal-academy/${signal.slug}`}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--gold)',
                      textDecoration: 'none',
                      flexShrink: 0,
                      padding: '6px 12px',
                      border: '1px solid rgba(200,114,10,0.3)',
                      borderRadius: 4,
                      alignSelf: 'center',
                    }}
                  >
                    Open →
                  </Link>
                ) : (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--ink-4)',
                    flexShrink: 0,
                    padding: '6px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    alignSelf: 'center',
                  }}>
                    Coming
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Referral gate */}
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 16 }}>
          Unlock all 5 simulators — free
        </div>
        <ReferralGate
          alreadyUnlocked={unlocked}
          onUnlock={() => setUnlocked(true)}
        />
      </div>

    </div>
  )
}
