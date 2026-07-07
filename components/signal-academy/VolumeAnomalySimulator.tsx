'use client'

import { useState } from 'react'

type PriceDir = 'up' | 'flat' | 'down'
type OIDir    = 'up' | 'down'

interface Classification {
  label:       string
  tag:         string
  color:       string
  bg:          string
  border:      string
  description: string
  action:      string
}

function classify(multiplier: number, price: PriceDir, oi: OIDir): Classification {
  if (multiplier < 1.5) {
    return {
      label:       'Low conviction',
      tag:         'BELOW THRESHOLD',
      color:       'var(--ink-4)',
      bg:          'var(--surface)',
      border:      'var(--border)',
      description: 'Volume is within normal range — no anomaly. Any price move here is driven by ordinary participants and carries higher reversal risk. Institutional money is not confirming the move.',
      action:      'Do not trade price moves on low volume alone. Wait for volume confirmation before taking a position.',
    }
  }

  if (multiplier >= 1.5 && multiplier < 2.0) {
    return {
      label:       'Elevated — watch closely',
      tag:         'ELEVATED',
      color:       '#D4A830',
      bg:          'rgba(212,168,48,0.06)',
      border:      'rgba(212,168,48,0.3)',
      description: 'Volume is above normal but not yet at anomaly threshold. Participation is rising — something is attracting attention. Combine with OI and price direction before acting.',
      action:      'Watch the next 1–2 sessions. If volume continues to climb and price + OI align, the setup becomes actionable.',
    }
  }

  // High or Extreme — full matrix
  const extreme = multiplier >= 3.0

  if (price === 'up' && oi === 'up') {
    return {
      label:       extreme ? 'Large participation (extreme volume)' : 'Rising participation',
      tag:         extreme ? 'Extreme volume surge (rising price)' : 'High volume surge (rising price)',
      color:       'var(--up)',
      bg:          'rgba(34,197,94,0.06)',
      border:      'rgba(34,197,94,0.3)',
      description: `Price up, OI up, volume ${extreme ? 'extreme (3×+)' : 'high (2–3×)'}: new positions are being built on the long side alongside rising prices. Both fresh buying and price appreciation together — historically, this combination has been associated with sustained moves rather than short covering or position unwinding.`,
      action:      extreme
        ? 'Extreme volume (3×+) with rising price and OI has historically marked the beginning of significant moves — but also, in extended trends, exhaustion tops. Cross-reference basis direction (Signal 3) and seasonals (Signal 4) for context.'
        : 'Volume surge with rising price and OI: historically associated with sustained upward momentum. Refer to OI divergence (Signal 1) and basis direction (Signal 3) for fuller context.',
    }
  }

  if (price === 'down' && oi === 'up') {
    return {
      label:       extreme ? 'Large participation (extreme volume)' : 'Falling participation',
      tag:         extreme ? 'Extreme volume surge (falling price)' : 'High volume surge (falling price)',
      color:       'var(--down)',
      bg:          'rgba(239,68,68,0.06)',
      border:      'rgba(239,68,68,0.3)',
      description: `Price down, OI up, volume ${extreme ? 'extreme (3×+)' : 'high (2–3×)'}: new positions are being built on the short side alongside falling prices. Fresh short entry into declining price — not panic exits from longs. Historically, this combination has been associated with sustained downward moves funded by new positioning rather than position unwinding.`,
      action:      extreme
        ? 'Extreme volume (3×+) with falling price and rising OI has historically followed macro catalysts — data releases, policy announcements, supply shocks. Cross-reference OI divergence (Signal 1) for confirmation.'
        : 'Volume surge with falling price and rising OI: historically associated with sustained downward momentum. Cross-reference OI divergence for confirmation.',
    }
  }

  if (price === 'up' && oi === 'down') {
    return {
      label:       'Short covering',
      tag:         'HIGH ANOMALY — NOT A TREND SIGNAL',
      color:       '#E07020',
      bg:          'rgba(224,112,32,0.06)',
      border:      'rgba(224,112,32,0.3)',
      description: 'Price up, OI down, volume high: existing shorts are being forced to cover — buying to close positions. Price rises because shorts must buy, not because new longs are entering. This is a technical squeeze, not conviction buying. The rally typically runs out when the short overhang is cleared.',
      action:      'Do not chase. Short-covering rallies exhaust themselves when the squeezable shorts are gone. Watch for price to stall and OI to stabilize — that is when the squeeze has run its course.',
    }
  }

  if (price === 'down' && oi === 'down') {
    return {
      label:       'Long liquidation',
      tag:         'HIGH ANOMALY — NOT A TREND SIGNAL',
      color:       '#E07020',
      bg:          'rgba(224,112,32,0.06)',
      border:      'rgba(224,112,32,0.3)',
      description: 'Price down, OI down, volume high: existing longs are exiting — not new shorts entering. Price falls because longs are selling to close positions. This is capitulation or profit-taking at scale, not new bearish conviction. Trend may reverse once the long overhang is cleared.',
      action:      'Look for OI to stabilize and price to find support. If selling exhausts and OI stops falling, the liquidation is complete — potential for a bounce or base-building.',
    }
  }

  // price === 'flat'
  return {
    label:       'High-volume indecision',
    tag:         'HIGH ANOMALY — REVERSAL WARNING',
    color:       '#D4A830',
    bg:          'rgba(212,168,48,0.06)',
    border:      'rgba(212,168,48,0.3)',
    description: `Volume ${extreme ? 'extreme (3×+)' : 'high (2–3×)'}, price flat: large participation but no directional resolution. Bulls and bears are fighting at roughly equal strength. High-volume indecision at a key level frequently precedes a sharp directional move in either direction.`,
    action:      'This is a setup, not a signal — wait for price to break and OI to confirm direction. The breakout from a high-volume consolidation is often more reliable than most other entries.',
  }
}

const ZONE_THRESHOLDS = [
  { max: 1.5, label: 'Normal',         sublabel: 'Below 1.5×',   color: 'var(--ink-4)',  bg: 'rgba(0,0,0,0.04)' },
  { max: 2.0, label: 'Elevated',       sublabel: '1.5–2.0×',     color: '#D4A830',       bg: 'rgba(212,168,48,0.1)' },
  { max: 3.0, label: 'High anomaly',   sublabel: '2.0–3.0×',     color: '#E07020',       bg: 'rgba(224,112,32,0.1)' },
  { max: 9999,label: 'Extreme',        sublabel: 'Above 3.0×',   color: 'var(--down)',   bg: 'rgba(239,68,68,0.1)' },
]

function getZone(m: number) {
  return ZONE_THRESHOLDS.find(z => m < z.max) ?? ZONE_THRESHOLDS[3]
}

// Bar chart visualization
function VolumeChart({ multiplier, zone }: { multiplier: number; zone: typeof ZONE_THRESHOLDS[0] }) {
  const W = 280, H = 130
  const padL = 36, padR = 12, padT = 10, padB = 26
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const MAX_DISPLAY = 4.5
  const barCount = 7  // 6 historical + 1 current

  // Fake historical bars: roughly at 1.0×
  const historical = [0.88, 1.05, 0.92, 1.14, 0.97, 0.83]

  function toY(val: number): number {
    return padT + chartH * (1 - Math.min(val, MAX_DISPLAY) / MAX_DISPLAY)
  }

  const barW    = (chartW / barCount) * 0.6
  const barGap  = chartW / barCount
  const avgY    = toY(1.0)
  const zoneY1  = toY(1.5)
  const zoneY2  = toY(2.0)
  const zoneY3  = toY(3.0)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {/* Zone bands */}
      <rect x={padL} y={padT}        width={chartW} height={zoneY1 - padT}       fill="rgba(239,68,68,0.06)" />
      <rect x={padL} y={zoneY1}      width={chartW} height={zoneY2 - zoneY1}     fill="rgba(224,112,32,0.06)" />
      <rect x={padL} y={zoneY2}      width={chartW} height={zoneY3 - zoneY2}     fill="rgba(212,168,48,0.06)" />
      <rect x={padL} y={zoneY3}      width={chartW} height={padT + chartH - zoneY3} fill="rgba(0,0,0,0.02)" />

      {/* Zone threshold lines */}
      {[{ y: avgY, label: '1×', dash: '4,3' }, { y: zoneY1, label: '1.5×', dash: '3,3' }, { y: zoneY2, label: '2×', dash: '3,3' }, { y: zoneY3, label: '3×', dash: '3,3' }].map(t => (
        <g key={t.label}>
          <line x1={padL} y1={t.y} x2={padL + chartW} y2={t.y} stroke="var(--border)" strokeWidth={t.label === '1×' ? 1 : 0.6} strokeDasharray={t.dash} />
          <text x={padL - 4} y={t.y + 3} textAnchor="end" fontFamily="monospace" fontSize={7} fill="var(--ink-4)">{t.label}</text>
        </g>
      ))}

      {/* Historical bars */}
      {historical.map((v, i) => {
        const x  = padL + i * barGap + (barGap - barW) / 2
        const y  = toY(v)
        const bH = padT + chartH - y
        return (
          <rect key={i} x={x} y={y} width={barW} height={bH}
            fill="var(--ink-4)" opacity={0.35} rx={2} />
        )
      })}

      {/* Current session bar */}
      {(() => {
        const i   = 6
        const v   = multiplier
        const x   = padL + i * barGap + (barGap - barW) / 2
        const y   = toY(v)
        const bH  = padT + chartH - y
        return (
          <>
            <rect x={x} y={y} width={barW} height={bH} fill={zone.color} rx={2} />
            <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontFamily="monospace" fontSize={7} fill={zone.color} fontWeight={600}>
              {multiplier.toFixed(1)}×
            </text>
          </>
        )
      })()}

      {/* X labels */}
      {[...historical.map((_, i) => `D-${6 - i}`), 'Today'].map((label, i) => (
        <text key={label} x={padL + i * barGap + barGap / 2} y={H - 4}
          textAnchor="middle" fontFamily="monospace" fontSize={6} fill="var(--ink-4)">
          {label}
        </text>
      ))}

      {/* Border */}
      <rect x={padL} y={padT} width={chartW} height={chartH} fill="none" stroke="var(--border)" strokeWidth={0.5} rx={2} />
    </svg>
  )
}

export default function VolumeAnomalySimulator() {
  const [multiplier, setMultiplier] = useState(2.4)
  const [priceDir,   setPriceDir]   = useState<PriceDir>('up')
  const [oiDir,      setOIDir]      = useState<OIDir>('up')

  const zone   = getZone(multiplier)
  const result = classify(multiplier, priceDir, oiDir)

  return (
    <div>
      {/* Volume slider */}
      <div style={{ marginBottom: 28 }}>
        <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
          Today&apos;s volume vs 20-day average
          <span style={{ marginLeft: 12, fontSize: 22, fontWeight: 600, color: zone.color, verticalAlign: 'middle' }}>
            {multiplier.toFixed(1)}×
          </span>
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--ink-4)', verticalAlign: 'middle' }}>
            {zone.label}
          </span>
        </label>
        <input type="range" min={0.4} max={4.5} step={0.1} value={multiplier}
          onChange={e => setMultiplier(Number(e.target.value))}
          style={{ width: '100%', accentColor: zone.color }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)', marginTop: 4 }}>
          <span>0.4× (very thin)</span><span>4.5× (extreme)</span>
        </div>
      </div>

      {/* Zone indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 24 }}>
        {ZONE_THRESHOLDS.map(z => {
          const active = zone.label === z.label
          return (
            <div key={z.label} style={{
              background: active ? z.bg : 'var(--surface)',
              border: `1px solid ${active ? z.color : 'var(--border)'}`,
              borderRadius: 5, padding: '8px 10px',
              transition: 'all 0.12s',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: z.color, fontWeight: active ? 600 : 400, marginBottom: 2 }}>
                {z.label}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--ink-4)' }}>{z.sublabel}</div>
            </div>
          )
        })}
      </div>

      {/* Bar chart */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 4, padding: '14px 16px', marginBottom: 24,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          Volume pattern — last 7 sessions (illustrative)
        </div>
        <VolumeChart multiplier={multiplier} zone={zone} />
      </div>

      {/* Direction inputs — only meaningful if high volume */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        marginBottom: 24,
        opacity: multiplier < 1.5 ? 0.45 : 1,
        transition: 'opacity 0.2s',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
            Price direction (session)
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['up', 'flat', 'down'] as PriceDir[]).map(d => (
              <button key={d} onClick={() => setPriceDir(d)} style={{
                flex: 1, padding: '8px 0', fontFamily: 'var(--font-mono)', fontSize: 10,
                border: `1px solid ${priceDir === d ? (d === 'up' ? 'rgba(34,197,94,0.6)' : d === 'down' ? 'rgba(239,68,68,0.6)' : 'rgba(212,168,48,0.6)') : 'var(--border)'}`,
                background: priceDir === d ? (d === 'up' ? 'rgba(34,197,94,0.08)' : d === 'down' ? 'rgba(239,68,68,0.08)' : 'rgba(212,168,48,0.08)') : 'var(--surface)',
                color: priceDir === d ? (d === 'up' ? 'var(--up)' : d === 'down' ? 'var(--down)' : '#D4A830') : 'var(--ink-3)',
                borderRadius: 4, cursor: 'pointer', textTransform: 'uppercase',
              }}>
                {d === 'up' ? '↑ Up' : d === 'flat' ? '→ Flat' : '↓ Down'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
            OI change (vs prev close)
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['up', 'down'] as OIDir[]).map(d => (
              <button key={d} onClick={() => setOIDir(d)} style={{
                flex: 1, padding: '8px 0', fontFamily: 'var(--font-mono)', fontSize: 10,
                border: `1px solid ${oiDir === d ? (d === 'up' ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)') : 'var(--border)'}`,
                background: oiDir === d ? (d === 'up' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)') : 'var(--surface)',
                color: oiDir === d ? (d === 'up' ? 'var(--up)' : 'var(--down)') : 'var(--ink-3)',
                borderRadius: 4, cursor: 'pointer', textTransform: 'uppercase',
              }}>
                {d === 'up' ? '↑ Rising' : '↓ Falling'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Combined signal matrix quick reference */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '12px 14px', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          Combined signal matrix (Vol 2×+)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {[
            { price: 'Up',   oi: 'Up',   result: 'Institutional accumulation', color: 'var(--up)' },
            { price: 'Down', oi: 'Up',   result: 'Institutional distribution',  color: 'var(--down)' },
            { price: 'Up',   oi: 'Down', result: 'Short covering',               color: '#E07020' },
            { price: 'Down', oi: 'Down', result: 'Long liquidation',             color: '#E07020' },
            { price: 'Flat', oi: 'Any',  result: 'High-vol indecision',          color: '#D4A830' },
          ].map((row, i) => {
            const active =
              multiplier >= 2.0 &&
              ((row.price === 'Up' && priceDir === 'up') ||
               (row.price === 'Down' && priceDir === 'down') ||
               (row.price === 'Flat' && priceDir === 'flat')) &&
              (row.oi === 'Any' || (row.oi === 'Up' && oiDir === 'up') || (row.oi === 'Down' && oiDir === 'down'))

            return (
              <div key={i} style={{
                display: 'flex', gap: 8, alignItems: 'center',
                padding: '5px 7px', borderRadius: 4,
                background: active ? `${row.color}18` : 'transparent',
                border: active ? `1px solid ${row.color}50` : '1px solid transparent',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)', width: 52, flexShrink: 0 }}>
                  P:{row.price} O:{row.oi}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: row.color, fontWeight: active ? 600 : 400 }}>
                  {row.result}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Result */}
      <div style={{
        background: result.bg,
        border: `1px solid ${result.border}`,
        borderRadius: 4,
        padding: '16px 18px',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: result.color, background: 'var(--surface)',
            padding: '2px 8px', border: `1px solid ${result.border}`, borderRadius: 3,
          }}>
            {result.tag}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
          {result.label}
        </div>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.65, margin: '0 0 10px', fontWeight: 300 }}>
          {result.description}
        </p>
        <div style={{ borderTop: `1px solid ${result.border}`, paddingTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', lineHeight: 1.6 }}>
          → {result.action}
        </div>
      </div>

      {/* 5 rules */}
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12 }}>
          5 rules for reading volume anomalies
        </div>
        {[
          'Volume is authentication, not direction. It tells you whether a price move has institutional backing — not which way price will go next. Always combine with price and OI.',
          'The 20-day average is the baseline. Volume below 1.5× is noise. Above 2× is a signal. Above 3× is an event — something changed.',
          'High-volume + rising OI is the purest signal. New money is flowing in with conviction. High-volume + falling OI is technical (short covering or long liquidation) — not trend confirmation.',
          'High-volume indecision (flat price) at a key support or resistance level is often the most reliable setup. A break from that congestion, confirmed by another high-volume session, is a high-probability entry.',
          'Extreme volume (3×+) is frequently both a signal and an exhaustion marker. In extended trends, extreme volume can mark a climax — the last wave of participation before reversal. Context matters: is this early in a move or late?',
        ].map((rule, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--surface)',
              background: 'var(--ink-3)', borderRadius: '50%',
              width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1,
            }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, fontWeight: 300 }}>{rule}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
