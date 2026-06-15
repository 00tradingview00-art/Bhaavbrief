'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import OIDivergenceSimulator from '@/components/signal-academy/OIDivergenceSimulator'

const HISTORICAL_CASES = [
  {
    tag: 'Bullish confirmation',
    tagColor: 'var(--up)',
    tagBg: 'rgba(34,197,94,0.08)',
    event: 'MCX Gold — pre-Dhanteras accumulation',
    detail: 'Price +2.8%, OI +18% over 12 sessions. Illustrative of how institutional pre-festival accumulation looks: sustained OI expansion as price grinds higher, no single-day spike.',
  },
  {
    tag: 'Weak rally',
    tagColor: '#D4A830',
    tagBg: 'rgba(212,168,48,0.08)',
    event: 'MCX Crude Oil — geopolitical spike',
    detail: 'Price +4.2%, OI −12% same session. Price surged on geopolitical headlines but OI fell — short covering, not fresh longs. Illustrative: the initial rally stalled within 2 sessions as no new buyers appeared.',
  },
  {
    tag: 'Long unwinding',
    tagColor: 'var(--ink-3)',
    tagBg: 'var(--surface)',
    event: 'MCX Natural Gas — post-winter liquidation',
    detail: 'Price −5.5%, OI −19% over 8 sessions. Classic long unwinding as heating season ended — longs exited but no new shorts entered. Illustrative: price found support earlier than a bearish-confirmation pattern would have.',
  },
]

export default function OIDivergencePage() {
  const [unlocked, setUnlocked] = useState(true) // Signal 1 is always accessible

  useEffect(() => {
    // Signal 1 is always live — no gate needed
    setUnlocked(true)
  }, [])

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(24px,4vw,40px) clamp(16px,4vw,24px)' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
        <Link href="/signal-academy" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>Signal Academy</Link>
        <span>›</span>
        <span style={{ color: 'var(--ink-3)' }}>Signal 1</span>
      </div>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--up)',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
            padding: '2px 8px', borderRadius: 3, letterSpacing: '0.1em',
          }}>
            SIGNAL 1 · LIVE
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)' }}>
            All MCX traders
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px,4vw,30px)', fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px', lineHeight: 1.2 }}>
          OI Divergence
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>
          Open interest change relative to price change reveals the conviction — or lack of it — behind market moves. The same price move reads completely differently depending on what OI does alongside it.
        </p>
      </div>

      {/* Concept primer */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '16px 20px',
        marginBottom: 28,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12 }}>
          The four-state matrix
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { price: '↑', oi: '↑', state: 'Bullish confirmation', note: 'New longs entering', strength: 'High', color: 'var(--up)' },
            { price: '↑', oi: '↓', state: 'Weak rally', note: 'Short covering only', strength: 'Low', color: '#D4A830' },
            { price: '↓', oi: '↑', state: 'Bearish confirmation', note: 'New shorts entering', strength: 'High', color: 'var(--down)' },
            { price: '↓', oi: '↓', state: 'Long unwinding', note: 'Longs exiting', strength: 'Medium', color: 'var(--ink-3)' },
          ].map(row => (
            <div key={row.state} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${row.color}`,
              borderRadius: '0 6px 6px 0',
              padding: '10px 12px',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', marginBottom: 4 }}>
                Price {row.price} · OI {row.oi}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: row.color, marginBottom: 3 }}>
                {row.state}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{row.note}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', marginTop: 3 }}>
                Signal strength: {row.strength}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulator */}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 32,
      }}>
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
          <OIDivergenceSimulator />
        </div>
      </div>

      {/* Historical illustrative cases */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 16 }}>
          Illustrative historical-style cases
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {HISTORICAL_CASES.map((c, i) => (
            <div key={i} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 8,
                  color: c.tagColor, background: c.tagBg,
                  border: `1px solid ${c.tagColor}`,
                  padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em',
                }}>
                  {c.tag}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', fontWeight: 600 }}>
                  {c.event}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
                {c.detail}
              </p>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', marginTop: 12 }}>
          These are illustrative patterns for educational purposes. They do not represent verified historical data or audited backtests.
        </p>
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
            Next — Signal 2
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            IV Percentile — are MCX options cheap or expensive?
          </div>
        </div>
        <Link href="/signal-academy" style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--ink-4)', textDecoration: 'none',
          padding: '7px 14px', border: '1px solid var(--border)',
          borderRadius: 4, flexShrink: 0,
        }}>
          Unlock all →
        </Link>
      </div>

      {/* Disclaimer footer */}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 32, paddingTop: 16 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', lineHeight: 1.7, margin: 0 }}>
          Educational content only. BhaavBrief is not a SEBI-registered Research Analyst or Investment Adviser. All simulator data is illustrative. Past patterns are not indicative of future market behaviour. Consult a SEBI-registered RA or IA before making trading decisions.
        </p>
      </div>

    </div>
  )
}
