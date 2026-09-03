'use client'

import { useEffect, useRef, useState } from 'react'
import IVSkewChart from '@/components/mcx/IVSkewChart'
import OIBuildupChart from '@/components/mcx/OIBuildupChart'

interface ChainRow {
  strike: number
  isATM?: boolean
  CE: { iv: number | null; tier: string }
  PE: { iv: number | null; tier: string }
}

interface OIPoint {
  date: string
  ceOI: number
  peOI: number
}

interface Props {
  instruments: { key: string; label: string }[]
  isPro: boolean
  initialInstrument?: string
  initialChain?: ChainRow[]
  initialOIHistory?: OIPoint[]
  initialPreview?: boolean
}

export default function VolatilityHub({ instruments, isPro, initialInstrument, initialChain, initialOIHistory, initialPreview }: Props) {
  const [instrument, setInstrument] = useState(initialInstrument ?? instruments[0]?.key ?? '')
  const [chain, setChain]     = useState<ChainRow[] | null>(initialChain ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Skip the client fetch only for the exact instrument the server already
  // seeded — switching to a different instrument still fetches client-side.
  const seededInstrument = useRef(initialChain ? initialInstrument : null)

  useEffect(() => {
    if (!instrument) return
    if (seededInstrument.current === instrument) {
      seededInstrument.current = null
      return
    }
    setLoading(true)
    setError(null)
    fetch(`/api/options?instrument=${instrument}`, { signal: AbortSignal.timeout(10000) })
      .then(r => r.json())
      .then(d => setChain(d.chain ?? null))
      .catch(() => { setChain(null); setError('Failed to load options chain') })
      .finally(() => setLoading(false))
  }, [instrument])

  const atmStrike = chain?.find(r => r.isATM)?.strike ?? null

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {instruments.map(i => (
          <button
            key={i.key}
            onClick={() => setInstrument(i.key)}
            style={{
              padding: '10px 14px', minHeight: 44, fontSize: 12, borderRadius: 6, cursor: 'pointer',
              fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center',
              border: `1px solid ${i.key === instrument ? 'var(--gold)' : 'var(--border)'}`,
              background: i.key === instrument ? 'var(--gold-pale, #FFF6E0)' : 'transparent',
              color: i.key === instrument ? 'var(--gold-dark, #8A5A00)' : 'var(--ink-3)',
              fontWeight: 600,
            }}
          >
            {i.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)' }}>Loading…</p>}
      {!loading && error && <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>{error}</p>}

      {!loading && !error && chain && (
        <>
          <IVSkewChart chain={chain} isPro={isPro} />
          {atmStrike != null && (
            <div style={{ marginTop: '1.5rem' }}>
              <OIBuildupChart
                instrument={instrument}
                strike={atmStrike}
                isPro={isPro}
                initialData={initialOIHistory}
                initialPreview={initialPreview}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
