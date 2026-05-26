'use client'

import { useEffect, useState } from 'react'
import type { EIAResponse, EIAData } from '@/app/api/eia/route'

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
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return iso }
}

function isEIAData(r: EIAResponse): r is EIAData {
  return !('error' in r)
}

export default function EIACard() {
  const [data, setData]       = useState<EIAResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/eia')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ error: 'api_down', updatedAt: new Date().toISOString() }))
      .finally(() => setLoading(false))
  }, [])

  const draw    = isEIAData(data!) && data.direction === 'draw'
  const accentColor = isEIAData(data!) ? (draw ? 'var(--up)' : 'var(--down)') : 'var(--border)'

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
        padding:        '10px 16px',
        borderBottom:   '1px solid var(--border)',
        display:        'flex',
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
        padding:     '14px 16px',
        borderLeft:  `3px solid ${accentColor}`,
      }}>

        {/* Loading */}
        {loading && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize:   12,
            color:      'var(--ink-4)',
          }}>
            Fetching…
          </div>
        )}

        {/* No API key configured */}
        {!loading && data && !isEIAData(data) && data.error === 'no_key' && (
          <div>
            <div style={{
              fontFamily:  'var(--font-mono)',
              fontSize:    10,
              color:       'var(--ink-4)',
              lineHeight:  1.6,
            }}>
              EIA_API_KEY not configured.
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   9,
              color:      'var(--ink-4)',
              marginTop:  4,
            }}>
              Free key at api.eia.gov/opendata
            </div>
          </div>
        )}

        {/* API down or no data */}
        {!loading && data && !isEIAData(data) && data.error !== 'no_key' && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize:   11,
            color:      'var(--ink-4)',
            lineHeight: 1.6,
          }}>
            Data unavailable
            <div style={{ fontSize: 9, marginTop: 4 }}>
              EIA publishes Wednesdays ~8:30 PM IST
            </div>
          </div>
        )}

        {/* Live data */}
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
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   9,
                color:      draw ? 'var(--up)' : 'var(--down)',
              }}>
                {draw ? 'Bullish crude' : 'Bearish crude'}
              </span>
            </div>

            {/* Change figure */}
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   22,
              fontWeight: 500,
              color:      'var(--ink)',
              lineHeight: 1,
              marginBottom: 4,
            }}>
              {draw ? '−' : '+'}{Math.abs(data.changeM).toFixed(1)}M
              <span style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 4 }}>
                bbls
              </span>
            </div>

            {/* Total stocks */}
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   10,
              color:      'var(--ink-3)',
              marginBottom: 10,
            }}>
              Total stocks: {data.stocksM.toFixed(0)}M bbls
            </div>

            {/* Week ending + timestamp */}
            <div style={{
              borderTop:  '1px solid var(--border)',
              paddingTop: 8,
              display:    'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   9,
                color:      'var(--ink-4)',
              }}>
                Week ending {fmtPeriod(data.period)}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   9,
                color:      'var(--ink-4)',
              }}>
                {timeAgo(data.updatedAt)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
