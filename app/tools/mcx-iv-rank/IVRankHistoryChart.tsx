'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import ProBlurGate from '@/components/ProBlurGate'

interface Props {
  title: string
  instruments: { key: string; label: string; series: { date: string; ivRank: number }[] }[]
  isPro: boolean
}

const COLORS: Record<string, string> = {
  GOLD:        'var(--gold-dark, #8A5A00)',
  SILVER:      '#6B7280',
  CRUDEOIL:    '#1B7A4A',
  NATURALGAS:  '#2563EB',
  COPPER:      '#B53A2A',
}

export default function IVRankHistoryChart({ title, instruments, isPro }: Props) {
  const withData = instruments.filter(i => i.series.length >= 2)

  if (withData.length === 0) {
    return (
      <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>
        Not enough IV Rank history yet — this builds up one real trading day at a time.
      </p>
    )
  }

  // Merge each instrument's own {date, ivRank} series into one array of rows
  // keyed by instrument, one row per date, for a single multi-line chart.
  const byDate = new Map<string, Record<string, number>>()
  for (const inst of withData) {
    for (const point of inst.series) {
      const row = byDate.get(point.date) ?? {}
      row[inst.key] = point.ivRank
      byDate.set(point.date, row)
    }
  }
  const data = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date: date.slice(5), ...values }))

  return (
    <ProBlurGate isPro={isPro} label={`${title} — see how volatility has moved over time`} timestamp="Updated today">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={v => `${v}`} />
          <Tooltip formatter={(v) => [typeof v === 'number' ? v.toFixed(0) : String(v), 'IV Rank']} labelFormatter={d => `Date: ${d}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={70} stroke="var(--down)" strokeDasharray="3 3" />
          <ReferenceLine y={30} stroke="var(--up)" strokeDasharray="3 3" />
          {withData.map(inst => (
            <Line
              key={inst.key}
              type="monotone"
              dataKey={inst.key}
              name={inst.label}
              stroke={COLORS[inst.key] ?? 'var(--ink-3)'}
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ProBlurGate>
  )
}
