'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import ProBlurGate from '@/components/ProBlurGate'

interface OIPoint {
  date: string
  ceOI: number
  peOI: number
}

interface Props {
  instrument: string
  strike: number
  isPro: boolean
  initialData?: OIPoint[]
  initialPreview?: boolean
}

export default function OIBuildupChart({ instrument, strike, isPro, initialData, initialPreview }: Props) {
  const [data, setData]       = useState<OIPoint[]>(initialData ?? [])
  const [preview, setPreview] = useState(initialPreview ?? !isPro)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Skip the client fetch only for the exact (instrument, strike) pair the
  // server already seeded — any later change (user picks a different
  // strike/instrument) falls through to the normal client fetch below.
  const seededKey = useRef(initialData ? `${instrument}:${strike}` : null)

  useEffect(() => {
    if (!instrument || !strike) return
    if (seededKey.current === `${instrument}:${strike}`) {
      seededKey.current = null
      return
    }
    setLoading(true)
    setError(null)
    fetch(`/api/options/oi-history?instrument=${instrument}&strike=${strike}`, { signal: AbortSignal.timeout(10000) })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d.history ?? [])
        setPreview(!!d.preview)
      })
      .catch(() => setError('Failed to load OI history'))
      .finally(() => setLoading(false))
  }, [instrument, strike])

  if (loading) return <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Loading OI history…</p>
  if (error)   return <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>{error}</p>
  if (data.length < 2) return <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>No OI history yet for this strike.</p>

  const display = data.slice(-90).map(d => ({
    date:  d.date.slice(5),  // MM-DD
    ceOI:  d.ceOI,
    peOI:  d.peOI,
  }))

  const chart = (
    <div style={{ marginTop: '1rem' }}>
      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.75 }}>
        OI Buildup — Strike {strike} ({display.length}-day)
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={display} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
          <Tooltip formatter={(v) => [typeof v === 'number' ? v.toLocaleString() : String(v)]} labelFormatter={d => `Date: ${d}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="ceOI" name="Call OI" fill="#22c55e" radius={[2,2,0,0]} />
          <Bar dataKey="peOI" name="Put OI"  fill="#f97316" radius={[2,2,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )

  if (!preview) return chart

  return (
    <ProBlurGate isPro={false} label="OI Buildup — full 90-day history by strike" timestamp="Live">
      {chart}
    </ProBlurGate>
  )
}
