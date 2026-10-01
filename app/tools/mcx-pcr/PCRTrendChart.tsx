'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import ProBlurGate from '@/components/ProBlurGate'
import type { PCRPoint } from '@/lib/pcrAnalysis'
import { previewDates, previewWave } from '@/lib/proPreview'
import { useProData } from '@/lib/useProData'

interface Props {
  instrument: string
  label: string
}

function PCRBars({ history }: { history: PCRPoint[] }) {
  const data = history.map(p => ({ date: p.date.slice(5), pcr: p.pcr }))
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
        <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
        <Tooltip formatter={(v) => [typeof v === 'number' ? v.toFixed(2) : String(v), 'PCR']} labelFormatter={d => `Date: ${d}`} />
        <ReferenceLine y={1} stroke="#888" strokeDasharray="3 3" />
        <Bar dataKey="pcr" fill="var(--gold-dark, #8B6520)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// The PCR history is Pro-only. This page is ISR-cached and shared by every
// visitor, so the history is no longer rendered into it (it was, blurred);
// Pro browsers fetch it from /api/pro/data, everyone else sees a synthetic
// preview. This also removed ~90 Redis reads per instrument from every
// page rebuild.
export default function PCRTrendChart({ instrument, label }: Props) {
  const { isPro, data, failed } = useProData<{ history: PCRPoint[] }>(`kind=pcr-history&instrument=${instrument}`)
  const title = (
    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>
      {label} — {isPro && data ? `${data.history.length}-day ` : 'daily '}PCR trend
    </div>
  )

  if (!isPro) {
    const dates = previewDates(30)
    const values = previewWave(30, 1, 0.25, instrument.length)
    const preview = dates.map((date, i) => ({ date, pcr: values[i] }))
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        {title}
        <ProBlurGate
          label={`${label} PCR trend — daily Put/Call OI ratio`}
          timestamp="Live"
          preview={<PCRBars history={preview} />}
        />
      </div>
    )
  }

  if (failed) {
    return <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)' }}>{label}: PCR history is unavailable right now — try again shortly.</p>
  }
  if (!data) {
    return <div style={{ height: 160, marginBottom: '1.25rem', borderRadius: 'var(--radius-md)' }} className="bb-skeleton-bar" />
  }
  if (data.history.length < 2) {
    return (
      <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>
        {label}: not enough PCR history yet — this builds up one real trading day at a time.
      </p>
    )
  }
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {title}
      <PCRBars history={data.history} />
    </div>
  )
}
