'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import ProBlurGate from '@/components/ProBlurGate'
import { useIsPro } from '@/lib/useIsPro'

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
  // The server pages now always seed the free-tier preview regardless of the
  // real visitor (calling auth() there would force those pages off ISR) — so
  // a genuinely Pro visitor needs a client-side nudge to upgrade past it.
  const clientIsPro = useIsPro()

  // Skip the client fetch only for the exact (instrument, strike) pair the
  // server already seeded — any later change (user picks a different
  // strike/instrument) falls through to the normal client fetch below.
  const seededKey = useRef(initialData ? `${instrument}:${strike}` : null)
  // True only while still showing the server-seeded data with no real fetch
  // having happened yet — cleared the moment fetchHistory actually runs, for
  // any reason. Distinct from seededKey (which only guards the one skip) so
  // the Pro-upgrade effect below knows whether an upgrade fetch is still owed.
  const neverFetchedRef = useRef(!!initialData)

  const fetchHistory = useCallback(() => {
    if (!instrument || !strike) return
    neverFetchedRef.current = false
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

  useEffect(() => {
    if (!instrument || !strike) return
    if (seededKey.current === `${instrument}:${strike}`) {
      seededKey.current = null
      return
    }
    fetchHistory()
  }, [instrument, strike, fetchHistory])

  // Real Pro status resolves asynchronously (useIsPro's own fetch) — once it
  // comes back true while we're still sitting on the never-fetched seeded
  // preview, upgrade to full history via the same (already Pro-aware)
  // endpoint the instrument/strike-change path above uses.
  useEffect(() => {
    if (clientIsPro && neverFetchedRef.current) fetchHistory()
  }, [clientIsPro, fetchHistory])

  if (loading) return <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Loading OI history…</p>
  if (error)   return <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>{error}</p>
  if (data.length < 2) return <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>Building history for this strike — grows one real trading day at a time.</p>

  const display = data.slice(-90).map(d => ({
    date:  d.date.slice(5),  // MM-DD
    ceOI:  d.ceOI,
    peOI:  d.peOI,
  }))

  const chart = (
    <div style={{ marginTop: '1rem' }}>
      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.75 }}>
        OI Buildup — Strike {strike.toLocaleString('en-IN')} ({display.length}-day)
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={display} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
          <Tooltip formatter={(v) => [typeof v === 'number' ? v.toLocaleString() : String(v)]} labelFormatter={d => `Date: ${d}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="ceOI" name="Call OI" fill="var(--up)" radius={[2,2,0,0]} />
          <Bar dataKey="peOI" name="Put OI"  fill="var(--down)" radius={[2,2,0,0]} />
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
