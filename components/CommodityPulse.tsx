'use client'
import { useState, useEffect } from 'react'
import type { PulseData, PulseRow } from '@/app/api/commodity-pulse/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowColors(pct: number) {
  const abs = Math.abs(pct)
  const intensity = Math.min(abs / 2.5, 1)        // 2.5% = max intensity
  if (pct > 0.05)  return { bg: `rgba(200,114,10,${0.05 + intensity * 0.10})`,  bar: '#C8720A', text: '#D4882A', arrow: '▲' }
  if (pct < -0.05) return { bg: `rgba(181,58,42,${0.05 + intensity * 0.10})`,   bar: '#B53A2A', text: '#C84432', arrow: '▼' }
  return { bg: 'rgba(138,138,122,0.04)', bar: '#6A6A5A', text: '#8A8A7A', arrow: '─' }
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

function PulseRowItem({ row, maxAbs }: { row: PulseRow; maxAbs: number }) {
  const colors  = rowColors(row.pct)
  const width   = barWidth(row.pct)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '88px 1fr 60px 90px',
      alignItems: 'center',
      gap: '0 12px',
      padding: '11px 20px',
      background: colors.bg,
      borderBottom: '0.5px solid rgba(255,255,255,0.04)',
      transition: 'background 0.2s',
    }}>

      {/* Commodity name */}
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          fontWeight: 600, letterSpacing: '0.1em',
          color: '#FAFAF6', marginBottom: 2,
        }}>
          {row.name}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(250,250,246,0.35)', letterSpacing: '0.05em' }}>
          MCX {row.unit}
        </div>
      </div>

      {/* Driver + bar */}
      <div>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 11,
          color: 'rgba(250,250,246,0.65)', fontWeight: 300,
          marginBottom: 5, lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {row.driver || '—'}
        </div>
        {/* Intensity bar */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1 }}>
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
        fontFamily: 'var(--font-mono)', fontSize: 12,
        fontWeight: 600, color: colors.text,
        textAlign: 'right', letterSpacing: '-0.02em',
      }}>
        {colors.arrow}{Math.abs(row.pct).toFixed(2)}%
      </div>

      {/* Price */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 12,
        fontWeight: 500, color: 'rgba(250,250,246,0.9)',
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
    <div style={{ background: '#1C1B10', borderRadius: 6, overflow: 'hidden' }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '88px 1fr 60px 90px',
          gap: '0 12px', padding: '11px 20px',
          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
          alignItems: 'center',
        }}>
          <div style={{ height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.06)', width: 48 }} />
          <div style={{ height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.06)', width: '60%' }} />
          <div style={{ height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginLeft: 'auto', width: 36 }} />
          <div style={{ height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginLeft: 'auto', width: 52 }} />
        </div>
      ))}
      <div style={{ padding: '14px 20px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ height: 9, borderRadius: 2, background: 'rgba(255,255,255,0.06)', width: '55%' }} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CommodityPulse() {
  const [data,    setData]    = useState<PulseData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/commodity-pulse')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rows) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const maxAbs = data ? Math.max(...data.rows.map(r => Math.abs(r.pct)), 0.01) : 1

  return (
    <div style={{ marginBottom: 40 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: '#C8720A',
          }}>
            India Commodity Pulse
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 8,
            color: '#8A8A7A', letterSpacing: '0.06em',
          }}>
            MCX live
          </span>
        </div>
        {data?.generatedAt && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#8A8A7A' }}>
            {fmtTime(data.generatedAt)}
          </span>
        )}
      </div>

      {/* Body */}
      {loading ? <PulseSkeleton /> : !data ? null : (
        <div style={{
          background: '#1C1B10',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid rgba(200,114,10,0.18)',
        }}>

          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '88px 1fr 60px 90px',
            gap: '0 12px', padding: '7px 20px',
            borderBottom: '0.5px solid rgba(200,114,10,0.15)',
          }}>
            {['COMMODITY', 'DRIVER', 'CHG %', 'PRICE'].map((h, i) => (
              <div key={h} style={{
                fontFamily: 'var(--font-mono)', fontSize: 7.5,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'rgba(200,114,10,0.6)',
                textAlign: i >= 2 ? 'right' : 'left',
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {data.rows.map(row => (
            <PulseRowItem key={row.name} row={row} maxAbs={maxAbs} />
          ))}

          {/* Theme */}
          <div style={{
            padding: '13px 20px',
            borderTop: '0.5px solid rgba(200,114,10,0.15)',
            display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 8,
              fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#C8720A', flexShrink: 0,
            }}>
              Today&apos;s Theme
            </span>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 12,
              color: 'rgba(250,250,246,0.75)', fontWeight: 300,
              fontStyle: 'italic', lineHeight: 1.5,
            }}>
              {data.theme}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
