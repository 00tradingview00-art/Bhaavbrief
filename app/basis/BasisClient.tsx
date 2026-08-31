'use client'

import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { BasisPoint, BasisConstituents } from '@/lib/basis'
import ProBlurGate from '@/components/ProBlurGate'

interface CommodityMeta {
  id: string
  label: string
  unit: string
  key: keyof BasisPoint
  stats: { mean: number; std: number; latest: number | null } | null
}

interface Props {
  commodities: CommodityMeta[]
  history:     BasisPoint[]
  isPro:       boolean
}

const TIMEFRAMES = [
  { label: '7D',  days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: Infinity },
] as const

function spreadColor(latest: number | null, mean: number, std: number): string {
  if (latest === null) return '#888'
  const z = std > 0 ? Math.abs(latest - mean) / std : 0
  if (z >= 2) return '#ef4444'
  if (z >= 1) return '#f97316'
  return '#22c55e'
}

// Direction-aware: a deviation below the mean is "Compressed"/"Depressed",
// not "Elevated" — that word means unusually high, and using it for a
// negative deviation reads backwards to a trader (e.g. crude basis at -0.36%
// against a +0.25% mean is unusually LOW, not "Elevated").
function spreadLabel(latest: number | null, mean: number, std: number): string {
  if (latest === null) return 'No data'
  const z = std > 0 ? (latest - mean) / std : 0
  const az = Math.abs(z)
  if (az >= 2) return z > 0 ? 'Extreme high' : 'Extreme low'
  if (az >= 1) return z > 0 ? 'Elevated' : 'Compressed'
  return 'Normal'
}

function calcWindowStats(history: BasisPoint[], key: keyof BasisPoint) {
  const vals = history.map(p => p[key]).filter((v): v is number => typeof v === 'number')
  if (!vals.length) return null
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length
  return { mean, std: Math.sqrt(variance) }
}

function downloadCSV(filename: string, rows: (string | number | null)[][]) {
  const csv = rows.map(r => r.map(v => v == null ? '' : String(v)).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function CommodityCard({ c, history, isPro }: { c: CommodityMeta; history: BasisPoint[]; isPro: boolean }) {
  const [timeframe, setTimeframe] = useState<number>(30)
  const [showPrices, setShowPrices] = useState(false)

  const stats = c.stats
  const latest = stats?.latest ?? null
  const color  = stats ? spreadColor(latest, stats.mean, stats.std) : '#888'
  const badge  = stats ? spreadLabel(latest, stats.mean, stats.std) : 'No data'

  const windowed = Number.isFinite(timeframe) ? history.slice(-timeframe) : history
  const windowStats = calcWindowStats(windowed, c.key)

  const chartData = windowed.map(p => ({
    date:   p.date.slice(5),
    spread: typeof p[c.key] === 'number' ? p[c.key] : null,
    mean:   windowStats?.mean ?? null,
    plus1:  windowStats ? windowStats.mean + windowStats.std : null,
    minus1: windowStats ? windowStats.mean - windowStats.std : null,
    plus2:  windowStats ? windowStats.mean + 2 * windowStats.std : null,
    minus2: windowStats ? windowStats.mean - 2 * windowStats.std : null,
  }))

  const constituentKey = c.id === 'gold' || c.id === 'silver' || c.id === 'crude' ? c.id : null
  const constituents = constituentKey
    ? windowed.map(p => ({ date: p.date, spread: p[c.key] as number | null, ...(p[constituentKey] as BasisConstituents) }))
    : []

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{c.label}</h2>
        <span style={{ fontSize: '0.75rem', opacity: 0.55 }}>{c.unit}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color }}>
          {latest !== null ? `${latest > 0 ? '+' : ''}${latest.toFixed(2)}%` : '—'}
        </span>
        <span style={{
          fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px',
          borderRadius: 99, background: color + '22', color,
        }}>
          {badge}
        </span>
      </div>

      {stats && (
        <div style={{ fontSize: '0.78rem', opacity: 0.6, marginBottom: '0.75rem', display: 'flex', gap: '1.25rem' }}>
          <span>30d avg: {stats.mean.toFixed(2)}%</span>
          <span>±1σ: {stats.std.toFixed(2)}%</span>
        </div>
      )}

      {stats && chartData.filter(d => d.spread !== null).length > 1 ? (
        <>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.label}
                onClick={() => setTimeframe(tf.days)}
                style={{
                  padding: '8px 12px', minHeight: 36, fontSize: 11, borderRadius: 5, cursor: 'pointer',
                  border: `1px solid ${timeframe === tf.days ? 'var(--gold, #B5862A)' : '#e5e7eb'}`,
                  background: timeframe === tf.days ? 'var(--gold-pale, #FFF6E0)' : 'transparent',
                  color: timeframe === tf.days ? 'var(--gold-dark, #8A5A00)' : '#666',
                  fontWeight: 600,
                }}
              >
                {tf.label}
              </button>
            ))}
            {isPro && (
              <>
                <button
                  onClick={() => setShowPrices(v => !v)}
                  style={{
                    padding: '8px 12px', minHeight: 36, fontSize: 11, borderRadius: 5, cursor: 'pointer',
                    border: '1px dashed #e5e7eb', background: 'transparent', color: '#666', fontWeight: 600,
                    marginLeft: 'auto',
                  }}
                >
                  {showPrices ? '− Hide prices' : '+ Show prices'}
                </button>
                <button
                  onClick={() => downloadCSV(
                    `bhaavbrief-${c.id}-basis.csv`,
                    [
                      ['date', 'spread_pct', 'mcx_price', 'benchmark_price', 'usdinr'],
                      ...constituents.map(row => [row.date, row.spread, row.mcx, row.benchmark, row.usdinr]),
                    ],
                  )}
                  style={{
                    padding: '8px 12px', minHeight: 36, fontSize: 11, borderRadius: 5, cursor: 'pointer',
                    border: '1px dashed #e5e7eb', background: 'transparent', color: '#666', fontWeight: 600,
                  }}
                >
                  Export CSV
                </button>
              </>
            )}
          </div>

          <ProBlurGate isPro={isPro} label={`${c.label} spread chart — ±1σ / ±2σ reference bands`} timestamp="Live">
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id={`grad-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"   stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%"  stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
                <Tooltip formatter={(v) => [typeof v === 'number' ? `${v.toFixed(2)}%` : String(v)]} labelFormatter={d => `Date: ${d}`} />
                {windowStats && <ReferenceLine y={windowStats.mean}                    stroke="#888" strokeDasharray="3 3" />}
                {windowStats && <ReferenceLine y={windowStats.mean + windowStats.std}  stroke="#f97316" strokeDasharray="2 4" />}
                {windowStats && <ReferenceLine y={windowStats.mean - windowStats.std}  stroke="#f97316" strokeDasharray="2 4" />}
                {windowStats && <ReferenceLine y={windowStats.mean + 2*windowStats.std} stroke="#ef4444" strokeDasharray="2 4" />}
                {windowStats && <ReferenceLine y={windowStats.mean - 2*windowStats.std} stroke="#ef4444" strokeDasharray="2 4" />}
                <Area
                  type="monotone"
                  dataKey="spread"
                  stroke={color}
                  fill={`url(#grad-${c.id})`}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </ProBlurGate>

          {isPro && showPrices && constituents.length > 0 && (
            <div style={{ marginTop: '0.75rem', maxHeight: 220, overflowY: 'auto', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ color: '#888', position: 'sticky', top: 0, background: '#fff' }}>
                    <th style={{ textAlign: 'left', padding: '3px 6px' }}>Date</th>
                    <th style={{ textAlign: 'right', padding: '3px 6px' }}>MCX</th>
                    <th style={{ textAlign: 'right', padding: '3px 6px' }}>Benchmark</th>
                    <th style={{ textAlign: 'right', padding: '3px 6px' }}>USD/INR</th>
                    <th style={{ textAlign: 'right', padding: '3px 6px' }}>Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {[...constituents].reverse().map(row => (
                    <tr key={row.date} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '3px 6px' }}>{row.date}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'right' }}>{row.mcx != null ? row.mcx.toLocaleString('en-IN') : '—'}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'right' }}>{row.benchmark != null ? row.benchmark.toLocaleString('en-IN') : '—'}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'right' }}>{row.usdinr != null ? row.usdinr.toFixed(2) : '—'}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'right' }}>{row.spread != null ? `${row.spread.toFixed(2)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      {!stats && (
        <p style={{ fontSize: '0.78rem', opacity: 0.5, fontStyle: 'italic' }}>
          No history data yet for this commodity.
        </p>
      )}
    </div>
  )
}

export default function BasisClient({ commodities, history, isPro }: Props) {
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {commodities.map(c => (
        <CommodityCard key={c.id} c={c} history={history} isPro={isPro} />
      ))}
    </div>
  )
}
