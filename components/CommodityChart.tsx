'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface ChartPoint {
  date:   string
  price:  number
  open:   number
  high:   number
  low:    number
  volume: number
}

type Period = '1m' | '3m' | '6m'

const PERIODS: { label: string; value: Period }[] = [
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
]

function fmtPrice(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function fmtDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface TooltipProps {
  active?:  boolean
  payload?: { value: number; payload: ChartPoint }[]
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: '#18180F', border: '0.5px solid #3A3A2A',
      padding: '8px 12px', borderRadius: 4, fontSize: 11,
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ color: '#8A8A7A', marginBottom: 4, letterSpacing: '0.03em' }}>{fmtDateFull(d.date)}</div>
      <div style={{ color: '#FAFAF6', fontSize: 15, fontWeight: 500 }}>{fmtPrice(d.price)}</div>
      {d.high !== d.low && (
        <div style={{ color: '#8A8A7A', marginTop: 3, fontSize: 10 }}>
          H {fmtPrice(d.high)} · L {fmtPrice(d.low)}
        </div>
      )}
    </div>
  )
}

interface Props {
  commodity: string   // URL slug: gold, silver, crude-oil, copper, natural-gas
  color:     string   // commodity accent colour
  unit:      string   // e.g. ₹/10g
}

export default function CommodityChart({ commodity, color, unit }: Props) {
  const [period,  setPeriod]  = useState<Period>('1m')
  const [data,    setData]    = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  const load = useCallback(async (p: Period) => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/chart/${commodity}?period=${p}`)
      if (!res.ok) throw new Error('bad response')
      const raw = await res.json()
      if (!Array.isArray(raw) || raw.length === 0) throw new Error('no data')
      setData(raw)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [commodity])

  useEffect(() => { load(period) }, [period, load])

  // Derived stats
  const first     = data[0]?.price ?? 0
  const last      = data[data.length - 1]?.price ?? 0
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0
  const isUp      = changePct >= 0
  const minPrice  = data.length ? Math.min(...data.map(d => d.low  || d.price)) : 0
  const maxPrice  = data.length ? Math.max(...data.map(d => d.high || d.price)) : 0
  const gradId    = `grad-${commodity}`

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px 0',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>
            MCX Historical · {unit}
          </div>
          {!loading && !error && data.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>
                {fmtPrice(last)}
              </span>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                color: isUp ? '#1B7A4A' : '#B53A2A',
              }}>
                {isUp ? '+' : ''}{changePct.toFixed(2)}%
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                {PERIODS.find(p => p.value === period)?.label}
              </span>
            </div>
          )}
        </div>

        {/* Period tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
                padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer',
                background: period === p.value ? color : 'var(--surface-3)',
                color:      period === p.value ? '#fff' : 'var(--ink-4)',
                fontWeight: period === p.value ? 600 : 400,
                transition: 'all .12s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 200, marginTop: 12 }}>
        {loading && (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)',
          }}>
            Loading…
          </div>
        )}

        {error && (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)',
          }}>
            Chart data unavailable
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={color} stopOpacity={0}    />
                </linearGradient>
              </defs>

              <XAxis dataKey="date" hide />
              <YAxis domain={[minPrice * 0.998, maxPrice * 1.002]} hide />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3' }}
              />

              <ReferenceLine
                y={first}
                stroke="var(--border)"
                strokeDasharray="2 4"
                strokeWidth={0.8}
              />

              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 3, fill: color, stroke: '#fff', strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer: date range */}
      {!loading && !error && data.length > 0 && (
        <div style={{
          padding: '8px 20px 12px',
          display: 'flex', justifyContent: 'space-between',
          fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--ink-4)',
          borderTop: '0.5px solid var(--border)',
          letterSpacing: '0.03em',
        }}>
          <span>{fmtDate(data[0].date)}</span>
          <span>Range: {fmtPrice(minPrice)} – {fmtPrice(maxPrice)}</span>
          <span>{fmtDate(data[data.length - 1].date)}</span>
        </div>
      )}
    </div>
  )
}
