'use client'

import { useState } from 'react'

const COMMODITIES = ['MCX Gold', 'MCX Silver', 'MCX Crude Oil', 'MCX Natural Gas'] as const
type Commodity = typeof COMMODITIES[number]

const IV_RANGES: Record<Commodity, { low: number; high: number; unit: string; notes: string }> = {
  'MCX Gold':        { low: 11, high: 38, unit: '%', notes: 'Spikes on INR/DXY events and pre-festival accumulation' },
  'MCX Silver':      { low: 14, high: 52, unit: '%', notes: 'Higher beta to Gold — amplified IV moves in both directions' },
  'MCX Crude Oil':   { low: 22, high: 78, unit: '%', notes: 'Geopolitical sensitivity and OPEC decisions drive sharp spikes' },
  'MCX Natural Gas': { low: 28, high: 95, unit: '%', notes: 'Highest seasonal IV variance on MCX — winter/summer extremes' },
}

type Zone = 'cheap' | 'neutral' | 'elevated' | 'expensive'

function getZone(percentile: number): Zone {
  if (percentile < 25)  return 'cheap'
  if (percentile < 60)  return 'neutral'
  if (percentile < 80)  return 'elevated'
  return 'expensive'
}

const ZONE_META: Record<Zone, {
  label: string; color: string; bg: string; border: string;
  status: string; bias: string; description: string; caution: string
}> = {
  cheap: {
    label:       'Cheap (vol compression)',
    color:       'var(--up)',
    bg:          'rgba(34,197,94,0.06)',
    border:      'rgba(34,197,94,0.3)',
    status:      '0–25th percentile',
    bias:        'Long options — straddles, strangles',
    description: 'IV is historically low. Options are cheap relative to the past 52 weeks. When vol is compressed, it tends to mean-revert upward — buying options here gives you convexity at a below-average cost.',
    caution:     'Low IV can persist for extended periods. Buying options in a vol compression requires a catalyst view — without a trigger, theta decay erodes the position.',
  },
  neutral: {
    label:       'Neutral',
    color:       '#D4A830',
    bg:          'rgba(212,168,48,0.06)',
    border:      'rgba(212,168,48,0.3)',
    status:      '25–60th percentile',
    bias:        'Directional spreads, defined-risk structures',
    description: 'IV is in the middle of its historical range. Neither cheap enough to be a pure long-vol trade nor expensive enough to favour selling. Directional structures with defined risk are appropriate.',
    caution:     'No strong vol signal here. Trade the direction, not the volatility regime.',
  },
  elevated: {
    label:       'Elevated',
    color:       '#E07020',
    bg:          'rgba(224,112,32,0.06)',
    border:      'rgba(224,112,32,0.3)',
    status:      '60–80th percentile',
    bias:        'Premium selling with hedges',
    description: 'IV is above its historical median. Options are pricing in more uncertainty than usual. Premium sellers have an edge here — but the elevated IV often reflects genuine risk, so selling naked is dangerous.',
    caution:     'Elevated IV can spike further in event-driven moves. Use defined-risk credit structures (spreads) rather than naked shorts.',
  },
  expensive: {
    label:       'Expensive',
    color:       'var(--down)',
    bg:          'rgba(239,68,68,0.06)',
    border:      'rgba(239,68,68,0.3)',
    status:      '80–100th percentile',
    bias:        'Credit spreads, iron condors',
    description: 'IV is at historically high levels. Options are expensive relative to realised volatility over the past year. Mean reversion in IV favours premium sellers — but this regime usually corresponds to genuine market stress.',
    caution:     'IV spikes can overshoot for longer than expected. High IV often precedes a directional resolution — selling premium into a trend move can be catastrophic. Use defined-risk structures only.',
  },
}

// Zone boundaries as percentages of the bar width
const ZONE_WIDTHS = [
  { zone: 'cheap',    pct: 25, label: 'Cheap',    color: 'rgba(34,197,94,0.25)' },
  { zone: 'neutral',  pct: 35, label: 'Neutral',  color: 'rgba(212,168,48,0.25)' },
  { zone: 'elevated', pct: 20, label: 'Elevated', color: 'rgba(224,112,32,0.25)' },
  { zone: 'expensive',pct: 20, label: 'Expensive',color: 'rgba(239,68,68,0.25)' },
]

const HISTORICAL_CASES = [
  {
    commodity: 'MCX Gold',
    percentile: 18,
    zone: 'cheap' as Zone,
    event: 'Post-global risk-off compression',
    detail: 'Gold IV fell to the 18th percentile as a period of low macro volatility persisted. Illustrative of how festival-season demand creates a predictable vol cycle — pre-Dhanteras, IV often compresses before expanding as the event approaches.',
  },
  {
    commodity: 'MCX Crude Oil',
    percentile: 88,
    zone: 'expensive' as Zone,
    event: 'Geopolitical supply shock',
    detail: 'Crude IV spiked to the 88th percentile on supply disruption news. Illustrative of event-driven vol expansion — in these regimes, option premium looks expensive in hindsight only if the event resolves quickly. Directional resolution often follows.',
  },
  {
    commodity: 'MCX Natural Gas',
    percentile: 72,
    zone: 'elevated' as Zone,
    event: 'Winter heating season onset',
    detail: 'NatGas IV moved to the 72nd percentile as weather uncertainty increased entering winter. Illustrative of seasonal vol elevation — a well-known pattern that creates recurring credit spread opportunities in the post-winter compression.',
  },
]

export default function IVPercentileSimulator() {
  const [commodity, setCommodity] = useState<Commodity>('MCX Gold')
  const [currentIV,  setCurrentIV]  = useState<number>(20)

  const range = IV_RANGES[commodity]

  // Clamp IV within the commodity's range on commodity change
  const clampedIV  = Math.min(range.high, Math.max(range.low, currentIV))
  const percentile = Math.round(((clampedIV - range.low) / (range.high - range.low)) * 100)
  const zone       = getZone(percentile)
  const meta       = ZONE_META[zone]

  function handleCommodityChange(c: Commodity) {
    setCommodity(c)
    // Reset to midpoint of new commodity's range
    setCurrentIV(Math.round((IV_RANGES[c].low + IV_RANGES[c].high) / 2))
  }

  return (
    <div>
      {/* Commodity selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {COMMODITIES.map(c => (
          <button
            key={c}
            onClick={() => handleCommodityChange(c)}
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

      {/* IV range reference */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span style={{ color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 9 }}>52-week low (illustrative)</span><br />
          <span style={{ color: 'var(--up)', fontWeight: 600, fontSize: 16 }}>{range.low}%</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span style={{ color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 9 }}>52-week high (illustrative)</span><br />
          <span style={{ color: 'var(--down)', fontWeight: 600, fontSize: 16 }}>{range.high}%</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, flex: 1, minWidth: 180 }}>
          <span style={{ color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 9 }}>Commodity notes</span><br />
          <span style={{ color: 'var(--ink-3)', fontSize: 11, lineHeight: 1.5 }}>{range.notes}</span>
        </div>
      </div>

      {/* IV slider */}
      <div style={{ marginBottom: 32 }}>
        <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
          Current IV (annualised)
          <span style={{ marginLeft: 12, fontSize: 20, fontWeight: 600, color: meta.color, verticalAlign: 'middle' }}>
            {clampedIV}%
          </span>
        </label>
        <input
          type="range"
          min={range.low}
          max={range.high}
          step={1}
          value={clampedIV}
          onChange={e => setCurrentIV(Number(e.target.value))}
          style={{ width: '100%', accentColor: meta.color }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)', marginTop: 4 }}>
          <span>{range.low}% (low)</span>
          <span>{range.high}% (high)</span>
        </div>
      </div>

      {/* Percentile bar + result */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 32 }}>

        {/* Percentile gauge */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              IV Percentile
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: meta.color }}>
              {percentile}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-4)' }}>th</span>
            </span>
          </div>

          {/* Zone bar */}
          <div style={{ position: 'relative', height: 28, borderRadius: 4, overflow: 'hidden', display: 'flex', marginBottom: 6 }}>
            {ZONE_WIDTHS.map(z => (
              <div key={z.zone} style={{ width: `${z.pct}%`, background: z.color, height: '100%' }} />
            ))}
            {/* Marker */}
            <div style={{
              position: 'absolute',
              left: `calc(${percentile}% - 2px)`,
              top: 0,
              bottom: 0,
              width: 4,
              background: meta.color,
              borderRadius: 2,
              boxShadow: `0 0 6px ${meta.color}`,
              transition: 'left 0.2s ease',
            }} />
          </div>

          {/* Zone labels */}
          <div style={{ display: 'flex', fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--ink-4)' }}>
            <span style={{ width: '25%', textAlign: 'center' }}>Cheap</span>
            <span style={{ width: '35%', textAlign: 'center' }}>Neutral</span>
            <span style={{ width: '20%', textAlign: 'center' }}>Elevated</span>
            <span style={{ width: '20%', textAlign: 'center' }}>Expensive</span>
          </div>
          <div style={{ display: 'flex', fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--ink-4)', marginTop: 2 }}>
            <span style={{ width: '25%', textAlign: 'left' }}>0</span>
            <span style={{ width: '25%', textAlign: 'right' }}>25</span>
            <span style={{ width: '35%', textAlign: 'right' }}>60</span>
            <span style={{ width: '8%',  textAlign: 'right' }}>80</span>
            <span style={{ width: '7%',  textAlign: 'right' }}>100</span>
          </div>
        </div>

        {/* Result panel */}
        <div style={{
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          borderRadius: 8,
          padding: '16px 18px',
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
              {meta.status}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', marginBottom: 8, letterSpacing: '0.04em' }}>
            Strategic bias → <span style={{ color: meta.color }}>{meta.bias}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65, margin: '0 0 10px', fontWeight: 300 }}>
            {meta.description}
          </p>
          <div style={{
            borderTop: `1px solid ${meta.border}`,
            paddingTop: 10,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            lineHeight: 1.6,
          }}>
            ⚠ {meta.caution}
          </div>
        </div>
      </div>

      {/* SEBI compliance note */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '12px 14px',
        marginBottom: 28,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--ink-3)' }}>SEBI note:</strong> This simulator shows illustrative IV ranges and percentile position. It does not recommend specific option strikes, contract months, or position sizes. Consult a SEBI-registered Research Analyst before acting on any options strategy.
        </div>
      </div>

      {/* Formula */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: 24,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>
          How IV percentile is calculated
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--ink-3)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '10px 14px',
          marginBottom: 10,
          lineHeight: 1.8,
        }}>
          IV-P = (sessions in past 252 where IV &lt; today's IV) ÷ 252 × 100
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
          This simulator uses illustrative min/max ranges for each commodity. In live data (Phase 2), it would rank today's actual IV against 252 real trading sessions. The zones and strategy implications are identical — only the precision of the percentile calculation changes.
        </p>
      </div>

      {/* Historical illustrative cases */}
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 14 }}>
          Illustrative historical-style cases
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {HISTORICAL_CASES.map((c, i) => {
            const m = ZONE_META[c.zone]
            return (
              <div key={i} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 8,
                    color: m.color, background: m.bg,
                    border: `1px solid ${m.border}`,
                    padding: '2px 7px', borderRadius: 3,
                  }}>
                    {m.label} · {c.percentile}th
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', fontWeight: 600 }}>
                    {c.commodity} — {c.event}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
                  {c.detail}
                </p>
              </div>
            )
          })}
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', marginTop: 12 }}>
          Illustrative patterns for educational purposes only. Not verified historical data or audited backtests.
        </p>
      </div>
    </div>
  )
}
