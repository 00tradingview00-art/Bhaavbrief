'use client'

import { useMemo, useState } from 'react'
import OIBuildupChart from '@/components/mcx/OIBuildupChart'

interface InstrumentOI {
  key: string
  label: string
  strikes: number[]
}

interface InitialOIData {
  instrument: string
  strike: number
  history: { date: string; ceOI: number; peOI: number }[]
  preview: boolean
}

interface Props {
  instruments: InstrumentOI[]
  isPro: boolean
  initialOIData?: InitialOIData
}

export default function OIBuildupSection({ instruments, isPro, initialOIData }: Props) {
  const withData = instruments.filter(i => i.strikes.length > 0)
  const [instrument, setInstrument] = useState(withData[0]?.key ?? '')
  const active = withData.find(i => i.key === instrument) ?? withData[0]
  const [strike, setStrike] = useState<number | null>(active?.strikes[0] ?? null)

  const strikeOptions = useMemo(() => active?.strikes ?? [], [active])

  if (!withData.length) {
    return <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)' }}>No live OI data available.</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {withData.map(i => (
          <button
            key={i.key}
            onClick={() => { setInstrument(i.key); setStrike(i.strikes[0] ?? null) }}
            style={{
              padding: '10px 14px', minHeight: 44, fontSize: 12, borderRadius: 6, cursor: 'pointer',
              fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center',
              border: `1px solid ${i.key === active?.key ? 'var(--gold)' : 'var(--border)'}`,
              background: i.key === active?.key ? 'var(--gold-pale, #FFF6E0)' : 'transparent',
              color: i.key === active?.key ? 'var(--gold-dark, #8A5A00)' : 'var(--ink-3)',
              fontWeight: 600,
            }}
          >
            {i.label}
          </button>
        ))}
        {strikeOptions.length > 0 && (
          <select
            value={strike ?? ''}
            onChange={e => setStrike(Number(e.target.value))}
            style={{
              padding: '10px 12px', minHeight: 44, fontSize: 12, borderRadius: 6, border: '1px solid var(--border)',
              fontFamily: 'var(--font-sans)', color: 'var(--ink)', background: 'var(--surface)',
            }}
          >
            {strikeOptions.map(s => (
              <option key={s} value={s}>Strike {s.toLocaleString('en-IN')}</option>
            ))}
          </select>
        )}
      </div>

      {active && strike != null && (
        <OIBuildupChart
          instrument={active.key}
          strike={strike}
          isPro={isPro}
          initialData={initialOIData?.instrument === active.key && initialOIData.strike === strike ? initialOIData.history : undefined}
          initialPreview={initialOIData?.instrument === active.key && initialOIData.strike === strike ? initialOIData.preview : undefined}
        />
      )}
    </div>
  )
}
