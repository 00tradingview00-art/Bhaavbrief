'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { BasisPoint } from '@/lib/basis'
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

export default function BasisClient({ commodities, history, isPro }: Props) {
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {commodities.map(c => {
        const stats = c.stats
        const latest = stats?.latest ?? null
        const color  = stats ? spreadColor(latest, stats.mean, stats.std) : '#888'
        const badge  = stats ? spreadLabel(latest, stats.mean, stats.std) : 'No data'

        // 30-day chart data for Pro
        const chartData = history.slice(-30).map(p => ({
          date:   p.date.slice(5),
          spread: typeof p[c.key] === 'number' ? p[c.key] : null,
          mean:   stats?.mean ?? null,
          plus1:  stats ? stats.mean + stats.std : null,
          minus1: stats ? stats.mean - stats.std : null,
          plus2:  stats ? stats.mean + 2 * stats.std : null,
          minus2: stats ? stats.mean - 2 * stats.std : null,
        }))

        return (
          <div
            key={c.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '1rem 1.25rem',
            }}
          >
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
              <ProBlurGate isPro={isPro} label="30-Day Spread Chart — ±1σ / ±2σ reference bands" timestamp="Live">
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
                    <ReferenceLine y={stats.mean}            stroke="#888" strokeDasharray="3 3" />
                    <ReferenceLine y={stats.mean + stats.std}  stroke="#f97316" strokeDasharray="2 4" />
                    <ReferenceLine y={stats.mean - stats.std}  stroke="#f97316" strokeDasharray="2 4" />
                    <ReferenceLine y={stats.mean + 2*stats.std} stroke="#ef4444" strokeDasharray="2 4" />
                    <ReferenceLine y={stats.mean - 2*stats.std} stroke="#ef4444" strokeDasharray="2 4" />
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
            ) : null}

            {!stats && (
              <p style={{ fontSize: '0.78rem', opacity: 0.5, fontStyle: 'italic' }}>
                No history data yet for this commodity.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
