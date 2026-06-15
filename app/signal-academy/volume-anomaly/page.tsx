'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import VolumeAnomalySimulator from '@/components/signal-academy/VolumeAnomalySimulator'

export default function VolumeAnomalyPage() {
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
        <span style={{ color: 'var(--ink-3)' }}>Signal 5</span>
      </div>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--gold)',
            background: 'rgba(200,114,10,0.08)', border: '1px solid rgba(200,114,10,0.3)',
            padding: '2px 8px', borderRadius: 3, letterSpacing: '0.1em',
          }}>
            SIGNAL 5 · ALL MCX TRADERS
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--up)',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
            padding: '2px 8px', borderRadius: 3, letterSpacing: '0.08em',
          }}>
            FINAL SIGNAL
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px,4vw,30px)', fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px', lineHeight: 1.2 }}>
          Volume Anomaly
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>
          Volume is the lie detector of the market. A price move on thin volume is a rumour. The same move on 3× normal volume is a fact. Understanding what kind of participation is behind a volume spike — and what it means combined with price and open interest — separates noise from institutional signal.
        </p>
      </div>

      {!unlocked ? (
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
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12 }}>
              Why the 20-day average matters
            </div>
            <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.65, margin: '0 0 10px', fontWeight: 300 }}>
              The 20-session average volume represents normal market participation — the baseline of retail, hedging, and routine institutional flow. When today's volume exceeds this baseline by 2× or more, something has changed: a new catalyst, a forced position unwind, or deliberate institutional accumulation or distribution.
            </p>
            <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>
              Volume alone does not tell you the direction. But combined with price direction and OI change, it classifies exactly what type of participant is driving the move — and whether that move has the conviction to continue.
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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                Interactive simulator — illustrative thresholds
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                Not real-time · Educational only
              </span>
            </div>
            <div style={{ padding: '24px 20px' }}>
              <VolumeAnomalySimulator />
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
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 14 }}>
              Illustrative historical patterns
            </div>
            {[
              {
                period: 'RBI surprise rate decisions — Gold (multiple instances)',
                signal: 'High volume + price up/down + OI up → Institutional accumulation/distribution',
                detail: 'Unexpected RBI rate decisions or monetary policy guidance changes consistently produce 2–4× normal MCX Gold volume in the session following the announcement. The price + OI direction tells you immediately whether institutions are building longs (rate cut surprise) or shorts (hawkish surprise).',
              },
              {
                period: 'OPEC production cut announcements — Crude Oil',
                signal: 'Extreme volume (3×+) + price up + OI up → Institutional accumulation',
                detail: 'Major OPEC+ supply decisions — particularly surprise cuts — routinely generate extreme MCX Crude volume. The 2022 OPEC+ 2 million barrel/day cut produced some of the highest single-session MCX Crude volumes on record. Extreme volume on a gap-up with rising OI is the purest institutional accumulation signal.',
              },
              {
                period: 'Budget day commodity tax changes — Multiple commodities',
                signal: 'Extreme volume + price spike/drop + OI often falling → Technical, not trend',
                detail: 'Union Budget announcements affecting import duties on Gold/Silver, or excise on crude downstream products, produce extreme volume spikes that are often technical rather than trend-setting — jewellers and importers scrambling to close existing positions, not building new structural trades.',
              },
            ].map((c, i) => (
              <div key={i} style={{
                borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                paddingBottom: i < 2 ? 14 : 0,
                marginBottom: i < 2 ? 14 : 0,
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 3, flexShrink: 0 }}>
                    Illustrative
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>{c.period}</span>
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

          {/* All 5 signals summary */}
          <div style={{
            background: 'rgba(200,114,10,0.05)',
            border: '1px solid rgba(200,114,10,0.25)',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 28,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14 }}>
              All 5 signals — the combined framework
            </div>
            {[
              { n: 1, name: 'OI Divergence',     use: 'Is the move backed by new money (conviction) or position exits (exhaustion)?', href: '/signal-academy/oi-divergence' },
              { n: 2, name: 'IV Percentile',      use: 'Are options cheap or expensive? Should I buy or sell volatility?',             href: '/signal-academy/iv-percentile' },
              { n: 3, name: 'Basis Convergence',  use: 'Is the physical market in distress? What is the carry structure telling me?',   href: '/signal-academy/basis-convergence' },
              { n: 4, name: 'Seasonal Patterns',  use: 'Is there a cultural or agricultural tailwind or headwind right now?',           href: '/signal-academy/seasonal-patterns' },
              { n: 5, name: 'Volume Anomaly',     use: 'Is this an institutional move? Am I reading accumulation or distribution?',     href: '/signal-academy/volume-anomaly' },
            ].map((s, i) => (
              <div key={s.n} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                borderBottom: i < 4 ? '1px solid rgba(200,114,10,0.15)' : 'none',
                paddingBottom: i < 4 ? 10 : 0, marginBottom: i < 4 ? 10 : 0,
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--gold)', background: 'rgba(200,114,10,0.1)',
                  border: '1px solid rgba(200,114,10,0.3)',
                  borderRadius: 3, width: 22, height: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontWeight: 600,
                }}>
                  {s.n}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={s.href} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>
                    {s.name}
                  </Link>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.5, marginTop: 2 }}>{s.use}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Back to hub CTA */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Link href="/signal-academy" style={{
              display: 'inline-block',
              border: '1px solid var(--border)',
              color: 'var(--ink-3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.05em',
              padding: '11px 24px',
              textDecoration: 'none',
              borderRadius: 4,
            }}>
              ← Back to Signal Academy
            </Link>
          </div>

          {/* Disclaimer */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', lineHeight: 1.7, margin: 0 }}>
              Educational content only. BhaavBrief is not a SEBI-registered Research Analyst or Investment Adviser. All simulator data is illustrative. Past patterns are not indicative of future market behaviour. Consult a SEBI-registered RA or IA before making trading decisions.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
