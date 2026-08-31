'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import ProBlurGate from '@/components/ProBlurGate'
import type { PCRPoint } from '@/lib/pcrAnalysis'

interface Props {
  label: string
  history: PCRPoint[]
  isPro: boolean
}

export default function PCRTrendChart({ label, history, isPro }: Props) {
  if (history.length < 2) {
    return (
      <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>
        {label}: not enough PCR history yet — this builds up one real trading day at a time.
      </p>
    )
  }

  const data = history.map(p => ({ date: p.date.slice(5), pcr: p.pcr }))

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>
        {label} — {data.length}-day PCR trend
      </div>
      <ProBlurGate isPro={isPro} label={`${label} PCR trend — daily Put/Call OI ratio`} timestamp="Live">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="date" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
            <Tooltip formatter={(v) => [typeof v === 'number' ? v.toFixed(2) : String(v), 'PCR']} labelFormatter={d => `Date: ${d}`} />
            <ReferenceLine y={1} stroke="#888" strokeDasharray="3 3" />
            <Bar dataKey="pcr" fill="var(--gold-dark, #8B6520)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ProBlurGate>
    </div>
  )
}
