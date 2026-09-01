import type { Metadata } from 'next'
import { getBasisHistory } from '@/lib/basis'
import Link from 'next/link'
import { safeJsonLd } from '@/lib/seo'

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Dataset',
      '@id': 'https://bhaavbrief.in/tools/mcx-basis',
      name: 'MCX Basis Today',
      description: 'Current MCX Gold, Silver, and Crude Oil basis vs COMEX/WTI import parity.',
      url: 'https://bhaavbrief.in/tools/mcx-basis',
      creator: { '@type': 'Organization', name: 'BhaavBrief', url: 'https://bhaavbrief.in' },
      variableMeasured: ['Gold basis %', 'Silver basis %', 'Crude Oil basis %'],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://bhaavbrief.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'MCX Basis Today' },
      ],
    },
  ],
}

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
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(SCHEMA) }} />
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        MCX Commodity Basis
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginBottom: '1.5rem' }}>
        How much MCX prices trade above (+) or below (−) their import-parity equivalent.
        {latest && <> Data as of {latest.date}.</>}
      </p>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {items.map(({ label, key, unit }) => {
          const val = latest?.[key] ?? null
          const color = val === null ? 'var(--ink-3)' : val > 0 ? 'var(--up)' : 'var(--down)'
          return (
            <div key={key} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>{label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)' }}>{unit}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 700, color }}>
                {val !== null ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : '—'}
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', marginTop: '1.5rem' }}>
        30-day spread history with ±1σ/±2σ bands →{' '}
        <Link href="/basis" style={{ color: 'var(--gold)', fontWeight: 600 }}>Full Basis Dashboard (Pro)</Link>
      </p>
    </main>
  )
}
