'use client'

import { useState } from 'react'

const COMMODITIES = ['MCX Gold', 'MCX Silver', 'MCX Crude Oil', 'MCX Natural Gas', 'MCX Copper']

const BASE_DATA: Record<string, { price: string; oi: string; unit: string }> = {
  'MCX Gold':        { price: '₹72,450', oi: '2,08,000 lots', unit: '/10g' },
  'MCX Silver':      { price: '₹92,800', oi: '1,15,000 lots', unit: '/kg' },
  'MCX Crude Oil':   { price: '₹6,840',  oi: '89,000 lots',   unit: '/bbl' },
  'MCX Natural Gas': { price: '₹218',    oi: '42,000 lots',    unit: '/mmBtu' },
  'MCX Copper':      { price: '₹784',    oi: '67,000 lots',    unit: '/kg' },
}

type State = 'bullish' | 'weak' | 'bearish' | 'unwinding'

function getState(pricePct: number, oiPct: number): State {
  if (pricePct >= 0 && oiPct >= 0) return 'bullish'
  if (pricePct >= 0 && oiPct < 0)  return 'weak'
  if (pricePct < 0  && oiPct >= 0) return 'bearish'
  return 'unwinding'
}

const STATE_META: Record<State, { label: string; strength: string; color: string; bg: string; border: string; description: string; action: string }> = {
  bullish: {
    label: 'Bullish confirmation',
    strength: 'High conviction',
    color: 'var(--up)',
    bg: 'rgba(34,197,94,0.06)',
    border: 'rgba(34,197,94,0.3)',
    description: 'New longs are entering the market. Fresh capital is driving the price up — this is not short covering. The move has conviction behind it.',
    action: 'Watch for follow-through over the next 1–3 sessions. High OI expansion (+10%+) over multiple sessions is stronger than a single-day spike.',
  },
  weak: {
    label: 'Weak rally',
    strength: 'Low conviction',
    color: '#D4A830',
    bg: 'rgba(212,168,48,0.06)',
    border: 'rgba(212,168,48,0.3)',
    description: 'Price is rising but open interest is falling — shorts are covering, not new longs entering. When short covering exhausts, the rally typically stalls or reverses.',
    action: 'Treat this rally with caution. Short covering rallies frequently retrace once the covering is done. Requires fresh buying to sustain.',
  },
  bearish: {
    label: 'Bearish confirmation',
    strength: 'High conviction',
    color: 'var(--down)',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.3)',
    description: 'New shorts are entering as price falls. This is conviction selling — participants are actively building bearish positions, not just old longs exiting.',
    action: 'The decline has structural support. Watch for OI to keep expanding on further down moves. If OI starts falling as price falls, the narrative shifts to long unwinding.',
  },
  unwinding: {
    label: 'Long unwinding',
    strength: 'Medium — limited downside',
    color: 'var(--ink-3)',
    bg: 'var(--surface)',
    border: 'var(--border)',
    description: 'Price is falling and OI is also falling — existing longs are exiting, not new shorts entering. This is position liquidation, not fresh bearish conviction.',
    action: 'Downside is typically limited once long unwinding runs its course. No fresh shorts means the selling pressure self-exhausts. Watch for price stabilisation as OI bottoms.',
  },
}

const SIGNAL_STRENGTH = [
  'OI change <2–3%: noise — likely rollover or expiry positioning',
  'OI change ≥5% in a single session: meaningful signal',
  'OI change ≥10% over 3 sessions: strong, high-conviction signal',
]

const READING_RULES = [
  'Watch OI change (delta), not OI level (absolute). A 5% OI change on 2L lots is more meaningful than 10K lots on 20L.',
  'Always combine with volume — high vol + rising OI = confirmed move; low vol + rising OI near expiry = rollover.',
  'Ignore expiry week OI — mechanical fall as contracts roll is not a signal.',
  'Context changes meaning: same setup reads differently in risk-on vs risk-off macro environment.',
  'OI data on MCX is published end-of-day; intraday OI is estimated and should be weighted less.',
]

export default function OIDivergenceSimulator() {
  const [commodity, setCommodity] = useState('MCX Gold')
  const [pricePct,  setPricePct]  = useState(0)
  const [oiPct,     setOiPct]     = useState(0)

  const state = getState(pricePct, oiPct)
  const meta  = STATE_META[state]
  const base  = BASE_DATA[commodity]

  // Quadrant chart positions — map sliders to 0-100% in the SVG quadrant
  const dotX = ((pricePct + 8) / 16) * 100   // 0% = left, 100% = right
  const dotY = (1 - (oiPct + 15) / 30) * 100  // 0% = top, 100% = bottom

  return (
    <div>
      {/* Commodity selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {COMMODITIES.map(c => (
          <button
            key={c}
            onClick={() => setCommodity(c)}
            style={{
              padding: '6px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.04em',
              border: `1px solid ${commodity === c ? 'var(--gold)' : 'var(--border)'}`,
              background: commodity === c ? 'rgba(200,114,10,0.08)' : 'var(--surface)',
              color: commodity === c ? 'var(--gold)' : 'var(--ink-3)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Base data */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span style={{ color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 9 }}>Illustrative price</span><br />
          <span style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 16 }}>{base.price}<span style={{ fontSize: 9, color: 'var(--ink-4)', marginLeft: 3 }}>{base.unit}</span></span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span style={{ color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 9 }}>Illustrative OI base</span><br />
          <span style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 16 }}>{base.oi}</span>
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
            Price change
            <span style={{
              marginLeft: 8,
              color: pricePct >= 0 ? 'var(--up)' : 'var(--down)',
              fontSize: 13,
              fontWeight: 600,
              verticalAlign: 'middle',
            }}>
              {pricePct >= 0 ? '+' : ''}{pricePct.toFixed(1)}%
            </span>
          </label>
          <input
            type="range" min={-8} max={8} step={0.5} value={pricePct}
            onChange={e => setPricePct(Number(e.target.value))}
            style={{ width: '100%', accentColor: pricePct >= 0 ? 'var(--up)' : 'var(--down)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)', marginTop: 4 }}>
            <span>−8%</span><span>0</span><span>+8%</span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
            OI change
            <span style={{
              marginLeft: 8,
              color: oiPct >= 0 ? 'var(--up)' : 'var(--down)',
              fontSize: 13,
              fontWeight: 600,
              verticalAlign: 'middle',
            }}>
              {oiPct >= 0 ? '+' : ''}{oiPct.toFixed(1)}%
            </span>
          </label>
          <input
            type="range" min={-15} max={15} step={0.5} value={oiPct}
            onChange={e => setOiPct(Number(e.target.value))}
            style={{ width: '100%', accentColor: oiPct >= 0 ? 'var(--up)' : 'var(--down)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)', marginTop: 4 }}>
            <span>−15%</span><span>0</span><span>+15%</span>
          </div>
        </div>
      </div>

      {/* Quadrant diagram + result side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, marginBottom: 32, alignItems: 'start' }}>

        {/* Quadrant SVG */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>
            Signal map
          </div>
          <svg viewBox="0 0 160 160" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 6, display: 'block' }}>
            {/* Quadrant backgrounds */}
            <rect x={0}  y={0}   width={80} height={80} fill="rgba(239,68,68,0.06)" />
            <rect x={80} y={0}   width={80} height={80} fill="rgba(34,197,94,0.06)" />
            <rect x={0}  y={80}  width={80} height={80} fill="rgba(150,150,150,0.04)" />
            <rect x={80} y={80}  width={80} height={80} fill="rgba(212,168,48,0.06)" />

            {/* Axes */}
            <line x1={80} y1={0} x2={80} y2={160} stroke="var(--border)" strokeWidth={1} />
            <line x1={0} y1={80} x2={160} y2={80} stroke="var(--border)" strokeWidth={1} />

            {/* Quadrant labels */}
            <text x={40} y={20}  textAnchor="middle" fontFamily="monospace" fontSize={7} fill="rgba(239,68,68,0.7)">Bearish</text>
            <text x={40} y={30}  textAnchor="middle" fontFamily="monospace" fontSize={7} fill="rgba(239,68,68,0.7)">confirm</text>
            <text x={120} y={20} textAnchor="middle" fontFamily="monospace" fontSize={7} fill="rgba(34,197,94,0.8)">Bullish</text>
            <text x={120} y={30} textAnchor="middle" fontFamily="monospace" fontSize={7} fill="rgba(34,197,94,0.8)">confirm</text>
            <text x={40} y={108} textAnchor="middle" fontFamily="monospace" fontSize={7} fill="rgba(120,120,120,0.7)">Long</text>
            <text x={40} y={118} textAnchor="middle" fontFamily="monospace" fontSize={7} fill="rgba(120,120,120,0.7)">unwind</text>
            <text x={120} y={108} textAnchor="middle" fontFamily="monospace" fontSize={7} fill="rgba(212,168,48,0.9)">Weak</text>
            <text x={120} y={118} textAnchor="middle" fontFamily="monospace" fontSize={7} fill="rgba(212,168,48,0.9)">rally</text>

            {/* Axis labels */}
            <text x={80} y={8}   textAnchor="middle" fontFamily="monospace" fontSize={6} fill="var(--ink-4)">OI ↑</text>
            <text x={80} y={158} textAnchor="middle" fontFamily="monospace" fontSize={6} fill="var(--ink-4)">OI ↓</text>
            <text x={4}  y={83}  fontFamily="monospace" fontSize={6} fill="var(--ink-4)">P↓</text>
            <text x={148} y={83} fontFamily="monospace" fontSize={6} fill="var(--ink-4)">P↑</text>

            {/* Moving dot */}
            <circle
              cx={dotX / 100 * 160}
              cy={dotY / 100 * 160}
              r={6}
              fill={meta.color}
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </svg>
        </div>

        {/* Result panel */}
        <div style={{
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          borderRadius: 8,
          padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: meta.color,
              background: 'var(--surface)',
              padding: '3px 8px',
              border: `1px solid ${meta.border}`,
              borderRadius: 3,
            }}>
              {meta.label}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {meta.strength}
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65, margin: '0 0 10px', fontWeight: 300 }}>
            {meta.description}
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-mono)' }}>
            {meta.action}
          </p>
        </div>
      </div>

      {/* Signal strength thresholds */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '16px 18px',
        marginBottom: 24,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>
          Signal strength benchmarks
        </div>
        {SIGNAL_STRENGTH.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < SIGNAL_STRENGTH.length - 1 ? 6 : 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', flexShrink: 0 }}>→</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Reading rules */}
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12 }}>
          5 rules for reading OI divergence
        </div>
        {READING_RULES.map((rule, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--surface)',
              background: 'var(--ink-3)', borderRadius: '50%',
              width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1,
            }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, fontWeight: 300 }}>{rule}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
