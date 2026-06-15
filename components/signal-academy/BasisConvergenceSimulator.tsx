'use client'

import { useState } from 'react'

const COMMODITIES = ['MCX Gold', 'MCX Silver', 'MCX Crude Oil'] as const
type Commodity = typeof COMMODITIES[number]

interface CommodityData {
  unit:           string
  basisMin:       number
  basisMax:       number
  defaultBasis:   number
  normalRange:    [number, number]  // at 30 days
  notes:          string
  priceRef:       string
}

const DATA: Record<Commodity, CommodityData> = {
  'MCX Gold': {
    unit:         '/10g',
    basisMin:     -500,
    basisMax:     1500,
    defaultBasis: 350,
    normalRange:  [200, 500],
    notes:        'Import duty changes, RBI gold policy, and festival season demand drive basis away from carry.',
    priceRef:     '₹72,450',
  },
  'MCX Silver': {
    unit:         '/kg',
    basisMin:     -500,
    basisMax:     2000,
    defaultBasis: 700,
    normalRange:  [400, 1000],
    notes:        'Industrial demand shocks (solar panels, electronics) can push Silver into sharp backwardation.',
    priceRef:     '₹92,800',
  },
  'MCX Crude Oil': {
    unit:         '/bbl',
    basisMin:     -200,
    basisMax:     300,
    defaultBasis: 55,
    normalRange:  [20, 90],
    notes:        'Global WTI/Brent structure directly transmits to MCX basis. OPEC cut announcements regularly flip structure to backwardation.',
    priceRef:     '₹6,840',
  },
}

type BasisState = 'backwardation' | 'tight' | 'normal' | 'elevated'

function getBasisState(basis: number, daysToExpiry: number, normalRange: [number, number]): BasisState {
  if (basis < 0) return 'backwardation'
  const scaledLow  = normalRange[0] * (daysToExpiry / 30)
  const scaledHigh = normalRange[1] * (daysToExpiry / 30)
  if (basis < scaledLow)  return 'tight'
  if (basis <= scaledHigh) return 'normal'
  return 'elevated'
}

const STATE_META: Record<BasisState, {
  label: string; color: string; bg: string; border: string;
  implication: string; description: string; action: string
}> = {
  backwardation: {
    label:       'Backwardation',
    color:       'var(--down)',
    bg:          'rgba(239,68,68,0.06)',
    border:      'rgba(239,68,68,0.3)',
    implication: 'Near-term supply squeeze or demand emergency',
    description: 'Futures are trading below spot — the market is paying a premium for immediate physical delivery. This is abnormal and signals urgent near-term demand that cannot be deferred, or a supply disruption in the physical market.',
    action:      'Watch physical demand indicators. Backwardation that persists into expiry forces futures sellers to deliver at a discount — a powerful squeeze mechanism. Typically resolves as spot demand eases or new supply arrives.',
  },
  tight: {
    label:       'Tight contango',
    color:       '#D4A830',
    bg:          'rgba(212,168,48,0.06)',
    border:      'rgba(212,168,48,0.3)',
    implication: 'Mild surplus or falling financing costs',
    description: 'Basis is positive but below what the cost of carry would normally justify. Someone is willing to hold physical inventory at less than full carry — suggesting mild surplus, cheap storage, or low interest rates reducing the financing component.',
    action:      'Not a strong signal on its own, but combined with falling OI it can indicate market participants expecting further price softness.',
  },
  normal: {
    label:       'Normal contango',
    color:       'var(--up)',
    bg:          'rgba(34,197,94,0.06)',
    border:      'rgba(34,197,94,0.3)',
    implication: 'No distortion — standard market structure',
    description: 'Futures are priced above spot by an amount that reflects normal cost of carry — financing cost plus storage. This is the equilibrium state for commodity futures. No physical market signal here.',
    action:      'Market structure is neutral. Look to other signals (OI divergence, volume anomaly) for directional guidance.',
  },
  elevated: {
    label:       'Elevated contango',
    color:       '#E07020',
    bg:          'rgba(224,112,32,0.06)',
    border:      'rgba(224,112,32,0.3)',
    implication: 'Supply tightness or excess forward demand',
    description: 'Basis is higher than normal carry justifies. The futures market is paying an unusual premium over spot — often reflecting tight physical availability, excess forward buying by hedgers, or supply disruption concerns.',
    action:      'Physical buyers may be accelerating purchases ahead of expected supply tightness. Watch import data and warehouse stocks. Elevated contango often precedes inventory draws.',
  },
}

// Convergence chart as SVG
function ConvergenceChart({
  basis, daysToExpiry, normalRange, basisMax, basisMin, state
}: {
  basis: number; daysToExpiry: number; normalRange: [number, number];
  basisMax: number; basisMin: number; state: BasisState
}) {
  const meta     = STATE_META[state]
  const W = 280, H = 140
  const padL = 36, padR = 16, padT = 12, padB = 24
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  // Y-axis: map basis value to SVG y
  const totalRange = basisMax - basisMin
  const yZero      = padT + chartH * (basisMax / totalRange)

  function toY(val: number): number {
    return padT + chartH * ((basisMax - val) / totalRange)
  }

  // Normal carry band scaled to daysToExpiry
  const scaledLow  = normalRange[0] * (daysToExpiry / 30)
  const scaledHigh = normalRange[1] * (daysToExpiry / 30)

  // SVG x positions
  const xToday  = padL
  const xExpiry = padL + chartW

  // Y positions
  const yBasis     = toY(basis)
  const yNormLow   = toY(scaledLow)
  const yNormHigh  = toY(scaledHigh)
  const yZeroLine  = toY(0)

  // Normal carry band polygon (today: [yNormHigh, yNormLow] → expiry: [yZeroLine, yZeroLine])
  const bandPath = `M ${xToday} ${yNormHigh} L ${xExpiry} ${yZeroLine} L ${xExpiry} ${yZeroLine} L ${xToday} ${yNormLow} Z`

  // Actual convergence line (today: yBasis → expiry: yZeroLine)
  const linePath = `M ${xToday} ${yBasis} L ${xExpiry} ${yZeroLine}`

  // Y-axis tick values
  const ticks = [basisMax, Math.round(basisMax * 0.5), 0, Math.round(basisMin * 0.5)].filter(
    v => v > basisMin && v < basisMax
  )

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {/* Background */}
      <rect x={padL} y={padT} width={chartW} height={chartH} fill="var(--surface)" rx={3} />

      {/* Backwardation zone (below zero) */}
      {yZeroLine < padT + chartH && (
        <rect
          x={padL} y={yZeroLine}
          width={chartW} height={padT + chartH - yZeroLine}
          fill="rgba(239,68,68,0.04)"
        />
      )}

      {/* Y-axis ticks */}
      {ticks.map(v => {
        const y = toY(v)
        return (
          <g key={v}>
            <line x1={padL - 4} y1={y} x2={padL + chartW} y2={y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray={v === 0 ? '0' : '3,3'} />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontFamily="monospace" fontSize={7} fill="var(--ink-4)">
              {v > 0 ? `+${v}` : v}
            </text>
          </g>
        )
      })}

      {/* Zero line (prominent) */}
      <line x1={padL} y1={yZeroLine} x2={padL + chartW} y2={yZeroLine} stroke="var(--border)" strokeWidth={1} />
      <text x={padL - 6} y={yZeroLine + 3} textAnchor="end" fontFamily="monospace" fontSize={7} fill="var(--ink-3)" fontWeight={600}>0</text>

      {/* Normal carry band */}
      <path d={bandPath} fill="rgba(34,197,94,0.12)" />
      <line x1={xToday} y1={yNormHigh} x2={xExpiry} y2={yZeroLine} stroke="rgba(34,197,94,0.4)" strokeWidth={0.8} strokeDasharray="3,3" />
      <line x1={xToday} y1={yNormLow}  x2={xExpiry} y2={yZeroLine} stroke="rgba(34,197,94,0.4)" strokeWidth={0.8} strokeDasharray="3,3" />

      {/* Band label */}
      <text x={padL + 4} y={Math.min(yNormHigh, yNormLow) - 3} fontFamily="monospace" fontSize={6} fill="rgba(34,197,94,0.7)">
        Normal carry band
      </text>

      {/* Actual convergence line */}
      <line x1={xToday} y1={yBasis} x2={xExpiry} y2={yZeroLine}
        stroke={meta.color} strokeWidth={2}
        strokeDasharray={basis < 0 ? '4,3' : '0'}
      />

      {/* Current basis dot */}
      <circle cx={xToday} cy={yBasis} r={5} fill={meta.color} stroke="var(--surface)" strokeWidth={2} />

      {/* Expiry point */}
      <circle cx={xExpiry} cy={yZeroLine} r={3} fill="var(--ink-3)" stroke="var(--surface)" strokeWidth={1.5} />

      {/* X-axis labels */}
      <text x={xToday}  y={H - 4} fontFamily="monospace" fontSize={7} fill="var(--ink-4)" textAnchor="middle">Today</text>
      <text x={xToday + chartW * 0.5} y={H - 4} fontFamily="monospace" fontSize={7} fill="var(--ink-4)" textAnchor="middle">D-{Math.round(daysToExpiry / 2)}</text>
      <text x={xExpiry} y={H - 4} fontFamily="monospace" fontSize={7} fill="var(--ink-4)" textAnchor="middle">Expiry</text>

      {/* Border */}
      <rect x={padL} y={padT} width={chartW} height={chartH} fill="none" stroke="var(--border)" strokeWidth={0.5} rx={3} />
    </svg>
  )
}

export default function BasisConvergenceSimulator() {
  const [commodity,    setCommodity]    = useState<Commodity>('MCX Gold')
  const [daysToExpiry, setDaysToExpiry] = useState(20)
  const [basis,        setBasis]        = useState(350)

  const d     = DATA[commodity]
  const state = getBasisState(basis, daysToExpiry, d.normalRange)
  const meta  = STATE_META[state]

  const scaledNormalLow  = d.normalRange[0] * (daysToExpiry / 30)
  const scaledNormalHigh = d.normalRange[1] * (daysToExpiry / 30)
  const dailyConvergence = daysToExpiry > 0 ? Math.abs(basis) / daysToExpiry : 0
  const normalDailyLow   = d.normalRange[0] / 30
  const normalDailyHigh  = d.normalRange[1] / 30
  const distortionRatio  = dailyConvergence / ((normalDailyLow + normalDailyHigh) / 2)

  function handleCommodityChange(c: Commodity) {
    setCommodity(c)
    setBasis(DATA[c].defaultBasis)
  }

  return (
    <div>
      {/* Commodity selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {COMMODITIES.map(c => (
          <button key={c} onClick={() => handleCommodityChange(c)} style={{
            padding: '6px 14px',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em',
            border: `1px solid ${commodity === c ? 'var(--gold)' : 'var(--border)'}`,
            background: commodity === c ? 'rgba(200,114,10,0.08)' : 'var(--surface)',
            color: commodity === c ? 'var(--gold)' : 'var(--ink-3)',
            borderRadius: 4, cursor: 'pointer',
          }}>
            {c}
          </button>
        ))}
      </div>

      {/* Reference price */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', marginBottom: 24 }}>
        Illustrative price: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{d.priceRef}{d.unit}</span>
        &ensp;·&ensp;Normal basis at 30d: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>₹{d.normalRange[0]}–{d.normalRange[1]}{d.unit}</span>
      </div>

      {/* Sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
            Days to expiry
            <span style={{ marginLeft: 10, fontSize: 18, fontWeight: 600, color: 'var(--ink)', verticalAlign: 'middle' }}>
              {daysToExpiry}d
            </span>
          </label>
          <input type="range" min={1} max={30} step={1} value={daysToExpiry}
            onChange={e => setDaysToExpiry(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--ink-3)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)', marginTop: 4 }}>
            <span>1d (expiry)</span><span>30d</span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
            Current basis (futures − spot)
            <span style={{ marginLeft: 10, fontSize: 18, fontWeight: 600, color: meta.color, verticalAlign: 'middle' }}>
              {basis >= 0 ? '+' : ''}₹{basis}{d.unit}
            </span>
          </label>
          <input type="range" min={d.basisMin} max={d.basisMax} step={5} value={basis}
            onChange={e => setBasis(Number(e.target.value))}
            style={{ width: '100%', accentColor: meta.color }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)', marginTop: 4 }}>
            <span>₹{d.basisMin} (backwardation)</span><span>₹{d.basisMax}</span>
          </div>
        </div>
      </div>

      {/* Convergence chart */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: 20,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>
          Convergence path to expiry (illustrative)
        </div>
        <ConvergenceChart
          basis={basis}
          daysToExpiry={daysToExpiry}
          normalRange={d.normalRange}
          basisMax={d.basisMax}
          basisMin={d.basisMin}
          state={state}
        />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)', marginTop: 8 }}>
          Green band = normal carry range. Dot = today's basis. Line = required convergence path.
        </div>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          {
            label: 'Daily convergence needed',
            value: `₹${dailyConvergence.toFixed(1)}${d.unit}/day`,
            color: distortionRatio > 1.5 || state === 'backwardation' ? 'var(--down)' : distortionRatio < 0.5 ? '#D4A830' : 'var(--up)',
          },
          {
            label: 'Normal daily carry range',
            value: `₹${normalDailyLow.toFixed(1)}–${normalDailyHigh.toFixed(1)}${d.unit}/day`,
            color: 'var(--ink-3)',
          },
          {
            label: 'Expected basis at this DTE',
            value: `₹${scaledNormalLow.toFixed(0)}–${scaledNormalHigh.toFixed(0)}${d.unit}`,
            color: 'var(--ink-3)',
          },
        ].map(m => (
          <div key={m.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '10px 12px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 5 }}>
              {m.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: m.color }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* State result */}
      <div style={{
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        borderRadius: 8,
        padding: '16px 18px',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: meta.color, background: 'var(--surface)',
            padding: '3px 8px', border: `1px solid ${meta.border}`, borderRadius: 3,
          }}>
            {meta.label}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)' }}>
            {meta.implication}
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65, margin: '0 0 10px', fontWeight: 300 }}>
          {meta.description}
        </p>
        <div style={{ borderTop: `1px solid ${meta.border}`, paddingTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', lineHeight: 1.6 }}>
          → {meta.action}
        </div>
      </div>

      {/* Commodity notes */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '12px 14px', marginBottom: 24,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {commodity} — what distorts basis
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
          {d.notes}
        </p>
      </div>

      {/* Reading rules */}
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12 }}>
          5 rules for reading basis
        </div>
        {[
          'Basis must converge to zero at expiry — this is non-negotiable. A large basis with 2 days to expiry is a violent squeeze in the making.',
          'Divide basis by days to expiry to get the daily convergence rate. Compare to normal daily carry. Anything more than 2× normal carry is a signal.',
          'Backwardation in a normally contango commodity is the highest-signal distortion. It almost always reflects genuine physical market stress.',
          'Elevated contango near delivery can indicate hedgers building large forward positions — a forward-demand signal, not necessarily a spot-demand signal.',
          'Watch basis alongside OI. Rising basis + rising OI = more participants pricing in the distortion. Falling basis + falling OI = distortion resolving.',
        ].map((rule, i) => (
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
