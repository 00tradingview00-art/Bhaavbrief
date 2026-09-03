'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ReferenceArea,
  ResponsiveContainer, useYAxisScale, usePlotArea, useChartWidth,
} from 'recharts'
import Card from '@/components/ui/Card'
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

// Below this a right-margin label row ("Copper 18") stops fitting without
// crowding the plot itself — the legend + tap tooltip already cover mobile.
const END_LABEL_MIN_WIDTH = 480

interface EndLabelItem {
  key: string
  label: string
  value: number
  color: string
}

// Draws each line's name + current value at its own right-edge y-position,
// so the reader isn't stuck tracing a color from a tangled line back to a
// legend below. Recharts 3 no longer needs the <Customized> wrapper for
// this — a plain component rendered inside <LineChart> can read chart
// layout straight from context via these hooks.
function EndLabels({ items }: { items: EndLabelItem[] }) {
  const yScale = useYAxisScale()
  const plotArea = usePlotArea()
  const chartWidth = useChartWidth()

  if (!yScale || !plotArea || !chartWidth || chartWidth < END_LABEL_MIN_WIDTH || items.length === 0) return null

  const MIN_GAP = 14
  const positioned = items
    .map(item => ({ ...item, y: (yScale(item.value) as number | undefined) ?? plotArea.y + plotArea.height / 2 }))
    .sort((a, b) => a.y - b.y)

  for (let i = 1; i < positioned.length; i++) {
    if (positioned[i].y - positioned[i - 1].y < MIN_GAP) {
      positioned[i].y = positioned[i - 1].y + MIN_GAP
    }
  }

  const x = plotArea.x + plotArea.width + 6

  return (
    <g>
      {positioned.map(item => (
        <text key={item.key} x={x} y={item.y} dy={4} fontSize={10.5} fontWeight={600} fill={item.color} fontFamily="var(--font-sans)">
          {item.label} {item.value.toFixed(0)}
        </text>
      ))}
    </g>
  )
}

function ChartTooltip({ active, payload, label }: { active?: boolean; label?: string; payload?: { dataKey?: string | number; name?: string; value?: number; color?: string }[] }) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
      boxShadow: 'var(--shadow-sm)', padding: '8px 10px', fontFamily: 'var(--font-sans)', fontSize: 11, minWidth: 140,
    }}>
      <div style={{ color: 'var(--ink-3)', marginBottom: 5, fontSize: 10 }}>Date: {label}</div>
      {sorted.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--ink-2)' }}>{p.name}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--ink)' }}>
            {typeof p.value === 'number' ? p.value.toFixed(0) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function IVRankHistoryChart({ title, instruments, isPro }: Props) {
  const withData = instruments.filter(i => i.series.length >= 2)

  if (withData.length === 0) {
    return (
      <Card padding="md">
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.5rem' }}>{title}</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>
          Not enough IV Rank history yet — this builds up one real trading day at a time.
        </p>
      </Card>
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

  const endLabelItems: EndLabelItem[] = withData.map(inst => ({
    key: inst.key,
    label: inst.label,
    value: inst.series[inst.series.length - 1]?.ivRank ?? 0,
    color: COLORS[inst.key] ?? 'var(--ink-3)',
  }))

  // First ~10 sessions of any instrument's history are ranked against a
  // handful of prior days at most — real small-sample noise, not a data bug.
  // Shade it rather than let the reader wonder why early points swing so
  // much harder than later, better-supported ones.
  const buildingHistoryEnd = data[Math.min(9, data.length - 1)]?.date

  return (
    <Card padding="md">
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>{title}</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', marginBottom: '1rem' }}>
        How current IV compares to its own recent range — above 70 is rich, below 30 is cheap.
      </p>

      <ProBlurGate isPro={isPro} label={`${title} — see how volatility has moved over time`} timestamp="Updated today">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 8, right: 80, bottom: 4, left: -8 }}>
            <CartesianGrid horizontal vertical={false} stroke="var(--border)" />
            {data.length > 1 && (
              <ReferenceArea
                x1={data[0].date} x2={buildingHistoryEnd} y1={0} y2={100}
                fill="var(--surface-3)" fillOpacity={0.5} ifOverflow="visible"
                label={{ value: 'Building history', position: 'insideTopLeft', fontSize: 9, fill: 'var(--ink-4)' }}
              />
            )}
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} tickLine={false} axisLine={{ stroke: 'var(--border-2)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-3)' }} domain={[0, 100]} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              y={70} stroke="var(--ink-4)" strokeDasharray="3 3" strokeWidth={1}
              label={{ value: 'Expensive >70', position: 'insideTopLeft', fontSize: 9, fill: 'var(--ink-4)' }}
            />
            <ReferenceLine
              y={30} stroke="var(--ink-4)" strokeDasharray="3 3" strokeWidth={1}
              label={{ value: 'Cheap <30', position: 'insideBottomLeft', fontSize: 9, fill: 'var(--ink-4)' }}
            />
            {withData.map(inst => (
              <Line
                key={inst.key}
                type="linear"
                dataKey={inst.key}
                name={inst.label}
                stroke={COLORS[inst.key] ?? 'var(--ink-3)'}
                dot={false}
                strokeWidth={1.5}
                connectNulls
              />
            ))}
            <EndLabels items={endLabelItems} />
          </LineChart>
        </ResponsiveContainer>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.1rem', justifyContent: 'center', marginTop: 10 }}>
          {withData.map(inst => (
            <div key={inst.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[inst.key] ?? 'var(--ink-3)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--ink-2)', fontFamily: 'var(--font-sans)' }}>{inst.label}</span>
            </div>
          ))}
        </div>
      </ProBlurGate>
    </Card>
  )
}
