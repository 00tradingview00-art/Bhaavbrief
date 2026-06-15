'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SeasonalPatternsSimulator from '@/components/signal-academy/SeasonalPatternsSimulator'

export default function SeasonalPatternsPage() {
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
        <span style={{ color: 'var(--ink-3)' }}>Signal 4</span>
      </div>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--gold)',
            background: 'rgba(200,114,10,0.08)', border: '1px solid rgba(200,114,10,0.3)',
            padding: '2px 8px', borderRadius: 3, letterSpacing: '0.1em',
          }}>
            SIGNAL 4 · ALL MCX TRADERS
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px,4vw,30px)', fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px', lineHeight: 1.2 }}>
          Seasonal Patterns
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>
          Indian commodity markets run on two calendars — the Gregorian and the Hindu. Akshaya Tritiya, Dhanteras, monsoon onset, Rabi harvest: each creates recurring demand and supply patterns that professional traders build into their seasonal playbooks.
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
              Why India has distinctive commodity seasonals
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                {
                  label: 'Cultural demand',
                  desc: 'Wedding season, Akshaya Tritiya, and Dhanteras create predictable jewellery and investment demand windows — visible in import data and MCX OI weeks in advance.',
                  icon: '🪙',
                },
                {
                  label: 'Agricultural cycles',
                  desc: 'Rabi (winter) and Kharif (monsoon) crop calendars drive NCDEX agri commodity prices through harvest arrival, storage, and export windows.',
                  icon: '🌾',
                },
                {
                  label: 'Monsoon impact',
                  desc: 'The June–September monsoon compresses road transport, construction, and rural consumption — creating a mild seasonal headwind for crude and industrial metals.',
                  icon: '🌧️',
                },
                {
                  label: 'Winter heating',
                  desc: 'Growing city gas distribution networks mean Indian natural gas demand now has a domestic winter heating component layered on top of global LNG price cycles.',
                  icon: '🔥',
                },
              ].map(z => (
                <div key={z.label} style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{z.icon}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{z.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>{z.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SEBI compliance notice */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--ink-4)',
            borderRadius: '0 6px 6px 0',
            padding: '12px 16px',
            marginBottom: 24,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>
              SEBI compliance — important
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', lineHeight: 1.7, margin: 0 }}>
              Seasonal patterns shown here are historical tendencies based on illustrative multi-year data — not verified backtest results and not forward forecasts. They represent one input among several and can and do fail in any given year. Global macro factors (USD, oil prices, OPEC decisions) frequently override domestic seasonal patterns. This content teaches the concept of seasonal analysis — not a seasonal trading strategy.
            </p>
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
                Seasonal calendar — illustrative patterns
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)' }}>
                Not real-time · Educational only
              </span>
            </div>
            <div style={{ padding: '24px 20px' }}>
              <SeasonalPatternsSimulator />
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
                Next — Signal 5
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                Volume Anomaly — authenticating price moves with participation data
              </div>
            </div>
            <Link href="/signal-academy/volume-anomaly" style={{
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
              Educational content only. BhaavBrief is not a SEBI-registered Research Analyst or Investment Adviser. All seasonal data is illustrative — historical tendencies, not verified backtests or forward forecasts. Past patterns are not indicative of future market behaviour. Consult a SEBI-registered RA or IA before making trading decisions.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
