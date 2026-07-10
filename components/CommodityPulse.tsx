'use client'
import { useState, useEffect } from 'react'
import type { PulseData, PulseRow } from '@/app/api/commodity-pulse/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowColors(pct: number) {
  const intensity = Math.min(Math.abs(pct) / 2.5, 1)
  if (pct > 0.05)  return { bg: `rgba(27,122,74,${0.05 + intensity * 0.09})`,  bar: '#1B7A4A', text: '#1B7A4A', arrow: '▲' }
  if (pct < -0.05) return { bg: `rgba(181,58,42,${0.05 + intensity * 0.09})`,  bar: '#B53A2A', text: '#B53A2A', arrow: '▼' }
  return { bg: 'transparent', bar: '#AAAAAA', text: '#888888', arrow: '─' }
}

function barWidth(pct: number): number {
  return Math.min((Math.abs(pct) / 2.5) * 100, 100)
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  }) + ' IST'
}

// ── Row ───────────────────────────────────────────────────────────────────────

function PulseRowItem({ row }: { row: PulseRow }) {
  const colors = rowColors(row.pct)
  const width  = barWidth(row.pct)

  return (
    <div className="pulse-grid" style={{
      display: 'grid',
      gridTemplateColumns: '100px 1fr 68px 100px',
      alignItems: 'center',
      gap: '0 12px',
      padding: '11px 16px',
      background: colors.bg,
      borderBottom: '1px solid var(--border)',
      transition: 'background 0.2s',
    }}>

      {/* Commodity name */}
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 13,
          fontWeight: 600, letterSpacing: '0.06em',
          color: 'var(--ink)', marginBottom: 2,
        }}>
          {row.name}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--ink-4)', letterSpacing: '0.04em',
        }}>
          MCX {row.unit}
        </div>
      </div>

      {/* Driver + bar — hidden on mobile */}
      <div className="pulse-driver">
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 13,
          color: 'var(--ink-3)', fontWeight: 400,
          marginBottom: 5, lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {row.driver || '—'}
        </div>
        <div style={{ height: 2, background: 'rgba(0,0,0,0.08)', borderRadius: 1 }}>
          <div style={{
            height: '100%', borderRadius: 1,
            width: `${width}%`,
            background: colors.bar,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* % change */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 14,
        fontWeight: 700, color: colors.text,
        textAlign: 'right', letterSpacing: '-0.02em',
      }}>
        {colors.arrow}{Math.abs(row.pct).toFixed(2)}%
      </div>

      {/* Price */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 14,
        fontWeight: 600, color: 'var(--ink)',
        textAlign: 'right', letterSpacing: '-0.02em',
      }}>
        {row.price}
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PulseSkeleton() {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 4, overflow: 'hidden',
    }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="pulse-grid" style={{
          display: 'grid', gridTemplateColumns: '100px 1fr 68px 100px', // overridden on mobile via .pulse-grid
          gap: '0 12px', padding: '11px 16px',
          borderBottom: '1px solid var(--border)',
          alignItems: 'center',
        }}>
          <div style={{ height: 10, borderRadius: 2, background: 'rgba(0,0,0,0.06)', width: 48 }} />
          <div className="pulse-driver" style={{ height: 8, borderRadius: 2, background: 'rgba(0,0,0,0.06)', width: '60%' }} />
          <div style={{ height: 10, borderRadius: 2, background: 'rgba(0,0,0,0.06)', marginLeft: 'auto', width: 36 }} />
          <div style={{ height: 10, borderRadius: 2, background: 'rgba(0,0,0,0.06)', marginLeft: 'auto', width: 52 }} />
        </div>
      ))}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ height: 9, borderRadius: 2, background: 'rgba(0,0,0,0.06)', width: '55%' }} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CommodityPulse() {
  const [data,    setData]    = useState<PulseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    fetch('/api/commodity-pulse')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.rows) { setData(d); setError(false) }
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ marginBottom: 40 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--saffron)',
          }}>
            India Commodity Pulse
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--ink-4)', letterSpacing: '0.06em',
          }}>
            MCX live
          </span>
        </div>
        {data?.generatedAt && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)' }}>
            {fmtTime(data.generatedAt)}
          </span>
        )}
      </div>

      {/* Body */}
      {loading ? <PulseSkeleton /> : error || !data ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
          overflow: 'hidden', padding: '48px 16px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8A8A7A', letterSpacing: '0.04em', margin: 0 }}>
            Commodity pulse offline — retrying in 5 min
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--surface)',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}>

          {/* Column headers */}
          <div className="pulse-grid" style={{
            display: 'grid', gridTemplateColumns: '100px 1fr 68px 100px', // overridden on mobile via .pulse-grid
            gap: '0 12px', padding: '8px 16px',
            borderBottom: '2px solid var(--border)',
            background: 'var(--paper2)',
          }}>
            {['COMMODITY', 'DRIVER', 'CHG %', 'PRICE'].map((h, i) => (
              <div key={h} className={h === 'DRIVER' ? 'pulse-driver' : ''} style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--ink-4)',
                textAlign: i >= 2 ? 'right' : 'left',
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {data.rows.map(row => (
            <PulseRowItem key={row.name} row={row} />
          ))}

          {/* Theme */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--paper2)',
            display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--saffron)', flexShrink: 0,
            }}>
              Today&apos;s Theme
            </span>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 13,
              color: 'var(--ink-2)', fontWeight: 400,
              fontStyle: 'italic', lineHeight: 1.5,
            }}>
              {data.theme}
            </span>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 480px) {
          .pulse-grid { grid-template-columns: 90px 60px 90px !important; }
          .pulse-driver { display: none !important; }
        }
      `}</style>
    </div>
  )
}
