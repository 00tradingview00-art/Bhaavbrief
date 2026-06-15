'use client'

import { useEffect, useState } from 'react'
import type { EIAResponse, EIAData, EIAWeek } from '@/lib/eia'
import { isEIAData } from '@/lib/eia'

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins   = Math.floor(diffMs / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtPeriod(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short',
    })
  } catch { return iso }
}


function BarChart({ history }: { history: EIAWeek[] }) {
  // Show oldest → newest left to right (reverse the array)
  const weeks = [...history].reverse()
  const values = weeks.map(w => w.stocksM)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--ink-4)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        8-week inventory trend (M bbls)
      </div>

      {/* Chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
        {weeks.map((week, i) => {
          const isLatest = i === weeks.length - 1
          const heightPct = ((week.stocksM - min) / range) * 70 + 30 // 30–100%
          const barColor = isLatest
            ? (week.direction === 'draw' ? 'var(--up)' : 'var(--down)')
            : (week.direction === 'draw' ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)')

          return (
            <div
              key={week.period}
              title={`${fmtPeriod(week.period)}: ${week.stocksM}M bbls (${week.direction === 'draw' ? '−' : '+'}${Math.abs(week.changeM).toFixed(1)}M)`}
              style={{
                flex: 1,
                height: `${heightPct}%`,
                background: barColor,
                borderRadius: '2px 2px 0 0',
                transition: 'height 0.3s ease',
                cursor: 'default',
                position: 'relative',
                outline: isLatest ? `1.5px solid ${week.direction === 'draw' ? 'var(--up)' : 'var(--down)'}` : 'none',
              }}
            />
          )
        })}
      </div>

      {/* X-axis labels — show first, middle, last */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)' }}>
          {fmtPeriod(weeks[0]?.period ?? '')}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)' }}>
          {fmtPeriod(weeks[Math.floor(weeks.length / 2)]?.period ?? '')}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink)', fontWeight: 600 }}>
          Now
        </span>
      </div>

      {/* Range labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)' }}>
          Low {min.toFixed(0)}M
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-4)' }}>
          High {max.toFixed(0)}M
        </span>
      </div>
    </div>
  )
}

export default function EIACard({ initialData }: { initialData?: EIAResponse }) {
  const [data, setData]       = useState<EIAResponse | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)

  useEffect(() => {
    if (initialData) return  // SSR data provided — skip client fetch
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    fetch('/api/eia', { cache: 'no-store', signal: controller.signal })
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ error: 'api_down', updatedAt: new Date().toISOString() }))
      .finally(() => { clearTimeout(timeout); setLoading(false) })
  }, [initialData])

  const draw        = isEIAData(data) && data.direction === 'draw'
  const accentColor = isEIAData(data) ? (draw ? 'var(--up)' : 'var(--down)') : 'var(--border)'

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: 10,
      overflow:     'hidden',
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{
        display:        'flex',
        padding:        '10px 16px',
        borderBottom:   '1px solid var(--border)',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:         'var(--ink-3)',
          fontWeight:    500,
        }}>
          EIA Crude Stocks
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize:   9,
          color:      'var(--ink-4)',
        }}>
          Wed weekly
        </span>
      </div>

      {/* Body */}
      <div style={{
        padding:    '14px 16px',
        borderLeft: `3px solid ${accentColor}`,
      }}>

        {loading && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-4)' }}>
            Fetching…
          </div>
        )}

        {!loading && data && !isEIAData(data) && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.6 }}>
            Data unavailable
            <div style={{ fontSize: 9, marginTop: 4 }}>EIA publishes Wednesdays ~8:30 PM IST</div>
          </div>
        )}

        {!loading && data && isEIAData(data) && (
          <div>
            {/* Direction badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      9,
                fontWeight:    500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         accentColor,
                background:    draw ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                padding:       '2px 7px',
                border:        `1px solid ${accentColor}`,
                borderRadius:  3,
              }}>
                {draw ? 'Draw' : 'Build'}{data.isSignificant ? ' ★' : ''}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)' }}>
                {draw ? 'Inventories fell' : 'Inventories rose'}
              </span>
            </div>

            {/* Change figure */}
            <div style={{
              fontFamily:   'var(--font-mono)',
              fontSize:     22,
              fontWeight:   500,
              color:        'var(--ink)',
              lineHeight:   1,
              marginBottom: 4,
            }}>
              {draw ? '−' : '+'}{Math.abs(data.changeM).toFixed(1)}M
              <span style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 4 }}>
                bbls this week
              </span>
            </div>

            {/* Total stocks */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', marginBottom: 2 }}>
              Total: {data.stocksM.toFixed(0)}M bbls
            </div>

            {/* Plain-language context */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', lineHeight: 1.5, marginBottom: 4 }}>
              {draw
                ? 'Less oil in storage → supply tighter → supports crude prices'
                : 'More oil in storage → supply building → weighs on crude prices'}
            </div>

            {/* Bar chart */}
            {data.history && data.history.length >= 3 && (
              <BarChart history={data.history} />
            )}

            {/* Footer */}
            <div style={{
              borderTop:      '1px solid var(--border)',
              paddingTop:     8,
              marginTop:      10,
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)' }}>
                Week ending {new Date(data.period + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)' }}>
                {timeAgo(data.updatedAt)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
