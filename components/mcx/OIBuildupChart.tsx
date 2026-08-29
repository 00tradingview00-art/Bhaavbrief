'use client'

import { useEffect, useState } from 'react'
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
}

export default function OIBuildupChart({ instrument, strike, isPro }: Props) {
  const [data, setData]   = useState<OIPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPro || !instrument || !strike) return
    setLoading(true)
    setError(null)
    fetch(`/api/options/oi-history?instrument=${instrument}&strike=${strike}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d.history ?? [])
      })
      .catch(() => setError('Failed to load OI history'))
      .finally(() => setLoading(false))
  }, [instrument, strike, isPro])

  if (!isPro) {
    return (
      <div style={{ marginTop: '1rem' }}>
        <ProBlurGate label="OI Buildup — Call vs Put open interest by strike (30-day)" timestamp="Live">
          <svg width="100%" height="180" viewBox="0 0 400 180" style={{ display: 'block' }}>
            {[60, 110, 160, 210, 260, 310].map((x, i) => (
              <g key={i}>
                <rect x={x} y={180 - 40 - i * 12} width={14} height={40 + i * 12} fill="#22c55e" opacity="0.7"/>
                <rect x={x + 16} y={180 - 30 - (5 - i) * 10} width={14} height={30 + (5 - i) * 10} fill="#f97316" opacity="0.7"/>
              </g>
            ))}
            <text x="6" y="174" fontSize="9" fill="#22c55e">Call OI</text>
            <text x="50" y="174" fontSize="9" fill="#f97316">Put OI</text>
          </svg>
        </ProBlurGate>
      </div>
    )
  }
  if (loading) return <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Loading OI history…</p>
  if (error)   return <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>{error}</p>
  if (data.length < 2) return <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>No OI history yet for this strike.</p>

  const display = data.slice(-30).map(d => ({
    date:  d.date.slice(5),  // MM-DD
    ceOI:  d.ceOI,
    peOI:  d.peOI,
  }))

  return (
    <div style={{ marginTop: '1rem' }}>
      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.75 }}>
        OI Buildup — Strike {strike} (30-day)
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
}
