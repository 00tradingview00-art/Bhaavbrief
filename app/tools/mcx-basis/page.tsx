import type { Metadata } from 'next'
import { getBasisHistory } from '@/lib/basis'
import Link from 'next/link'

export const revalidate = 900

export const metadata: Metadata = {
  title:       'MCX Basis Today — BhaavBrief',
  description: 'Current MCX Gold, Silver, and Crude Oil basis vs COMEX/WTI import parity. See whether MCX is trading at a premium or discount to global benchmarks.',
  keywords:    [
    'MCX gold basis today India', 'MCX crude oil basis near far', 'MCX COMEX gold premium India',
    'MCX copper basis LME', 'MCX basis explained', 'MCX silver basis India',
    'MCX crude oil import parity India',
  ],
}

export default function MCXBasisPage() {
  const history = getBasisHistory()
  const latest  = history[history.length - 1]

  const items = [
    { label: 'Gold',       key: 'goldSpreadPct',   unit: 'vs COMEX import parity (INR/10g)' },
    { label: 'Silver',     key: 'silverSpreadPct', unit: 'vs COMEX import parity (INR/kg)' },
    { label: 'Crude Oil',  key: 'crudeSpreadPct',  unit: 'vs WTI import parity (INR/bbl)' },
    { label: 'Copper',     key: 'copperSpreadPct', unit: 'vs COMEX HG (coming soon)' },
  ] as const

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        MCX Commodity Basis
      </h1>
      <p style={{ fontSize: '0.85rem', opacity: 0.65, marginBottom: '1.5rem' }}>
        How much MCX prices trade above (+) or below (−) their import-parity equivalent.
        {latest && <> Data as of {latest.date}.</>}
      </p>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {items.map(({ label, key, unit }) => {
          const val = latest?.[key] ?? null
          const color = val === null ? '#888' : val > 0 ? '#22c55e' : '#ef4444'
          return (
            <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{label}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.55 }}>{unit}</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>
                {val !== null ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : '—'}
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '0.78rem', opacity: 0.55, marginTop: '1.5rem' }}>
        30-day spread history with ±1σ/±2σ bands →{' '}
        <Link href="/basis" style={{ color: '#1a1a1a' }}>Full Basis Dashboard (Pro)</Link>
      </p>
    </main>
  )
}
