'use client'

import { useState } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 0-indexed months
interface SeasonalWindow {
  id:        string
  commodity: string
  months:    number[]  // 0-indexed
  bias:      'strong-positive' | 'positive' | 'negative' | 'mild-negative'
  driver:    string
  detail:    string
  what:      string   // what to watch
}

const WINDOWS: SeasonalWindow[] = [
  {
    id:        'akshaya-gold',
    commodity: 'MCX Gold',
    months:    [3, 4],  // Apr, May
    bias:      'positive',
    driver:    'Akshaya Tritiya physical demand',
    detail:    'Akshaya Tritiya — the most auspicious day to buy gold in Hindu and Jain tradition — falls on the third lunar day of the bright fortnight of Vaishakha (typically late April or early May). Physical gold demand from jewellers and retail buyers typically spikes 2–4 weeks before the festival and normalises 1–2 weeks after.',
    what:      'Watch MCX Gold basis widening into the festival. Rising OI into April alongside elevated contango is the setup. Basis usually normalises sharply after the date.',
  },
  {
    id:        'monsoon-crude',
    commodity: 'MCX Crude Oil',
    months:    [5, 6, 7, 8],  // Jun–Sep
    bias:      'mild-negative',
    driver:    'Monsoon demand compression',
    detail:    'The Indian monsoon (June–September) compresses road and industrial activity across large parts of the country. Vehicle usage, construction, and small-scale manufacturing — all major crude consumers — slow during heavy rainfall months. This creates a domestic demand headwind that partially offsets global crude price direction.',
    what:      'Monsoon onset (around June 1, Kerala) and withdrawal (around October, NW India) are the bookends. The demand compression is mild — global OPEC/geopolitical factors typically dominate. Treat this as a marginal headwind, not a reversal signal on its own.',
  },
  {
    id:        'festive-gold-silver',
    commodity: 'MCX Gold + Silver',
    months:    [8, 9, 10],  // Sep–Nov
    bias:      'strong-positive',
    driver:    'Navratri → Dhanteras window',
    detail:    'The strongest recurring seasonal pattern in Indian commodity markets. The window runs from Navratri (typically September–October) through Dussehra to Dhanteras (2 days before Diwali, typically October–November) — approximately 6–8 weeks. Physical gold and silver demand from jewellers, retail buyers, and gifting drives this period. Import volumes routinely jump in the months preceding Dhanteras.',
    what:      'The pre-Dhanteras window (6–4 weeks before) is typically where the pattern is strongest. Watch gold imports data, premium over international prices in the physical market, and MCX basis. Pattern can and does fail when INR weakens sharply or global gold falls hard.',
  },
  {
    id:        'winter-gas',
    commodity: 'MCX Natural Gas',
    months:    [10, 11, 0, 1],  // Nov–Feb
    bias:      'positive',
    driver:    'Winter heating demand (North India + global)',
    detail:    'MCX Natural Gas tracks Henry Hub (US) and TTF (Europe) pricing with import parity adjustments. Northern hemisphere winter heating demand — both domestic Indian demand in Punjab, Haryana, UP, and the global LNG supply/demand balance — typically supports gas prices from November through February. Indian city gas distribution expansion has added a growing domestic demand layer.',
    what:      'US weather forecasts (cold snaps, heating degree days) move Henry Hub and cascade to MCX. Watch global LNG supply news from Qatar, Australia, and US export terminals alongside weather. This is more of a global carry-through pattern than a pure India seasonal.',
  },
  {
    id:        'rabi-harvest',
    commodity: 'Agri (NCDEX)',
    months:    [1, 2, 3],  // Feb–Apr
    bias:      'negative',
    driver:    'Rabi harvest arrivals',
    detail:    'Rabi (winter crop) harvest begins arriving in mandis from February and peaks through March–April. The surge in arrivals typically creates downward price pressure on wheat, mustard, chana, and other rabi crops. India\'s procurement program (FCI for wheat) provides a price floor, but open-market prices often drift below MSP or hover at MSP levels during peak arrival weeks.',
    what:      'Track APMC mandi arrival data (Agmarknet) for the commodity. MSP announcement dates and FCI procurement pace are the key variables. Note: This is an NCDEX / agri commodity pattern — MCX metals/energy are largely unaffected.',
  },
]

const BIAS_META: Record<SeasonalWindow['bias'], { label: string; color: string; bg: string; border: string; barColor: string }> = {
  'strong-positive': { label: 'Strong positive bias', color: 'var(--up)',   bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.35)',  barColor: 'rgba(34,197,94,0.85)' },
  'positive':        { label: 'Positive bias',        color: 'var(--up)',   bg: 'rgba(34,197,94,0.05)',  border: 'rgba(34,197,94,0.25)',  barColor: 'rgba(34,197,94,0.55)' },
  'mild-negative':   { label: 'Mild negative bias',   color: '#D4A830',     bg: 'rgba(212,168,48,0.06)', border: 'rgba(212,168,48,0.3)',  barColor: 'rgba(212,168,48,0.6)' },
  'negative':        { label: 'Negative bias',        color: 'var(--down)', bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.3)',   barColor: 'rgba(239,68,68,0.7)' },
}

const ALL_COMMODITIES = ['All', 'MCX Gold', 'MCX Silver', 'MCX Crude Oil', 'MCX Natural Gas', 'Agri (NCDEX)']

// Current month (0-indexed)
const NOW_MONTH = new Date().getMonth()

export default function SeasonalPatternsSimulator() {
  const [filter,   setFilter]   = useState('All')
  const [selected, setSelected] = useState<string | null>(null)

  const visibleWindows = WINDOWS.filter(w => {
    if (filter === 'All') return true
    if (filter === 'MCX Silver') return w.commodity === 'MCX Gold + Silver'
    return w.commodity.includes(filter)
  })

  const selectedWindow = WINDOWS.find(w => w.id === selected) ?? null

  // Which windows are active in a given month
  function activeFor(monthIdx: number): SeasonalWindow[] {
    return visibleWindows.filter(w => w.months.includes(monthIdx))
  }

  // Current-month active windows
  const currentMonthWindows = WINDOWS.filter(w => w.months.includes(NOW_MONTH))

  return (
    <div>
      {/* Commodity filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {ALL_COMMODITIES.map(c => (
          <button key={c} onClick={() => { setFilter(c); setSelected(null) }} style={{
            padding: '6px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em',
            border: `1px solid ${filter === c ? 'var(--gold)' : 'var(--border)'}`,
            background: filter === c ? 'rgba(200,114,10,0.08)' : 'var(--surface)',
            color: filter === c ? 'var(--gold)' : 'var(--ink-3)',
            borderRadius: 4, cursor: 'pointer',
          }}>
            {c}
          </button>
        ))}
      </div>

      {/* 12-month calendar */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: 20,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Full-year seasonal map — click a month to explore
        </div>

        {/* Month grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
          {MONTHS.map((m, i) => {
            const windows = activeFor(i)
            const isNow   = i === NOW_MONTH
            const isSelected = selectedWindow && selectedWindow.months.includes(i)

            return (
              <button
                key={m}
                onClick={() => {
                  if (windows.length > 0) setSelected(windows[0].id)
                }}
                style={{
                  background: isNow
                    ? 'rgba(200,114,10,0.12)'
                    : isSelected
                    ? 'rgba(200,114,10,0.06)'
                    : 'var(--bg)',
                  border: `1px solid ${isNow ? 'var(--gold)' : isSelected ? 'rgba(200,114,10,0.3)' : 'var(--border)'}`,
                  borderRadius: 4,
                  padding: '6px 0',
                  cursor: windows.length > 0 ? 'pointer' : 'default',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: isNow ? 'var(--gold)' : 'var(--ink-4)', textAlign: 'center', marginBottom: 4, fontWeight: isNow ? 600 : 400 }}>
                  {m}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 2px', minHeight: 24 }}>
                  {windows.map(w => (
                    <div
                      key={w.id}
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: BIAS_META[w.bias].barColor,
                      }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
          {Object.entries(BIAS_META).map(([key, m]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 20, height: 4, borderRadius: 2, background: m.barColor }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)' }}>{m.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(200,114,10,0.12)', border: '1px solid var(--gold)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)' }}>Current month</span>
          </div>
        </div>
      </div>

      {/* Current month callout */}
      <div style={{
        background: 'rgba(200,114,10,0.05)',
        border: '1px solid rgba(200,114,10,0.25)',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 20,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          {MONTHS[NOW_MONTH]} — active seasonal windows right now
        </div>
        {currentMonthWindows.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {currentMonthWindows.map(w => {
              const m = BIAS_META[w.bias]
              return (
                <button
                  key={w.id}
                  onClick={() => setSelected(w.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, background: 'none',
                    border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.barColor, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', fontWeight: 600 }}>
                    {w.commodity}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                    {m.label} · {w.driver}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
            No strong seasonal pattern active this month. Look to OI divergence and IV percentile for signals.
          </div>
        )}
      </div>

      {/* Seasonal windows list */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          All seasonal windows — click to expand
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleWindows.map(w => {
            const m    = BIAS_META[w.bias]
            const open = selected === w.id

            return (
              <div
                key={w.id}
                style={{
                  background: open ? m.bg : 'var(--surface)',
                  border: `1px solid ${open ? m.border : 'var(--border)'}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                  transition: 'all 0.15s',
                }}
              >
                <button
                  onClick={() => setSelected(open ? null : w.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {/* Month range pill */}
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 8,
                    color: m.color, background: 'var(--surface)',
                    border: `1px solid ${m.border}`,
                    padding: '2px 7px', borderRadius: 3,
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {MONTHS[w.months[0]]}{w.months.length > 1 ? `–${MONTHS[w.months[w.months.length - 1]]}` : ''}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                      {w.commodity}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                      {m.label} · {w.driver}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', flexShrink: 0 }}>
                    {open ? '▲' : '▼'}
                  </span>
                </button>

                {open && (
                  <div style={{ padding: '0 14px 14px' }}>
                    <div style={{ borderTop: `1px solid ${m.border}`, paddingTop: 12 }}>
                      <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.65, margin: '0 0 12px', fontWeight: 300 }}>
                        {w.detail}
                      </p>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                        What to watch
                      </div>
                      <div style={{ borderLeft: `2px solid ${m.border}`, paddingLeft: 10 }}>
                        <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
                          {w.what}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Framework */}
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12 }}>
          How to use seasonal patterns
        </div>
        {[
          'Seasonal patterns are tailwinds and headwinds, not forecasts. They shift the probability distribution — they do not predict the direction with certainty in any given year.',
          'Always combine with at least one other signal. A seasonal tailwind confirmed by rising OI (Signal 1) and elevated IV (Signal 2) is a higher-conviction setup than seasonality alone.',
          'Know the season-breakers: a sharp INR depreciation, global risk-off, or OPEC surprise can override any domestic seasonal pattern in metals and crude in a single session.',
          'The strongest window historically is September–November for gold and silver. The pre-Dhanteras basis widening is one of the most consistent recurring patterns in MCX.',
          'Agri seasonals (Rabi harvest) operate independently of metals and energy. Treat them as a separate market — NCDEX mandis, MSP policy, and rainfall are the inputs, not global macro.',
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
