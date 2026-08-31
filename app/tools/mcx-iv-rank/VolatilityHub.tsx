'use client'

import { useEffect, useState } from 'react'
import IVSkewChart from '@/components/mcx/IVSkewChart'
import OIBuildupChart from '@/components/mcx/OIBuildupChart'

interface ChainRow {
  strike: number
  isATM?: boolean
  CE: { iv: number | null; tier: string }
  PE: { iv: number | null; tier: string }
}

interface Props {
  instruments: { key: string; label: string }[]
  isPro: boolean
}

export default function VolatilityHub({ instruments, isPro }: Props) {
  const [instrument, setInstrument] = useState(instruments[0]?.key ?? '')
  const [chain, setChain]     = useState<ChainRow[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!instrument) return
    setLoading(true)
    fetch(`/api/options?instrument=${instrument}`)
      .then(r => r.json())
      .then(d => setChain(d.chain ?? null))
      .catch(() => setChain(null))
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

      {!loading && chain && (
        <>
          <IVSkewChart chain={chain} isPro={isPro} />
          {atmStrike != null && (
            <div style={{ marginTop: '1.5rem' }}>
              <OIBuildupChart instrument={instrument} strike={atmStrike} isPro={isPro} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
