import type { Metadata } from 'next'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import { relevanceOf, type MaxPainRelevance } from '@/lib/maxPainRelevance'
import Link from 'next/link'
import { safeJsonLd } from '@/lib/seo'

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'MCX Max Pain',
      url: 'https://bhaavbrief.in/tools/mcx-max-pain',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (web browser)',
      description: 'Live MCX Max Pain strike price for Gold, Silver, Crude Oil, Natural Gas, and Copper.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      provider: { '@id': 'https://bhaavbrief.in/#organization' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://bhaavbrief.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'MCX Max Pain Today' },
      ],
    },
  ],
}

export const revalidate = 60

export const metadata: Metadata = {
  title:       'MCX Max Pain Today — Crude Oil, Natural Gas, Gold, Silver',
  description: 'Live MCX Max Pain strike price for Gold, Silver, Crude Oil, Natural Gas, and Copper — where the options market may be pulling price toward by expiry.',
  keywords:    [
    'MCX max pain today India', 'MCX gold max pain strike',
    'MCX options max pain theory India', 'MCX silver max pain expiry',
    'MCX crude max pain strike', 'MCX max pain calculator India',
  ],
}

interface MaxPainRow {
  maxPain: number | null
  futurePrice: number
  gap: number | null
  dte: number | null
  oiConcentrationPct: number | null
  relevance: MaxPainRelevance
}

async function getMaxPainData(): Promise<Record<string, MaxPainRow | null>> {
  const entries = await Promise.all(
    Object.keys(MCX_INSTRUMENTS).map(async (instrument): Promise<[string, MaxPainRow | null]> => {
      try {
        const data = await getOptionsChain(instrument)
        const chain   = (data as { chain?: { strike: number; CE: { oi: number }; PE: { oi: number } }[] }).chain ?? []
        const maxPain = (data as { maxPain?: number }).maxPain ?? null
        const expiry  = (data as { expiry?: string }).expiry ?? null

        const gap = (maxPain !== null && data.futurePrice > 0)
          ? parseFloat((((data.futurePrice - maxPain) / maxPain) * 100).toFixed(2))
          : null

        const dte = expiry
          ? Math.max(0, Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000))
          : null

        const totalOI = chain.reduce((s, r) => s + r.CE.oi + r.PE.oi, 0)
        const maxPainRow = maxPain !== null ? chain.find(r => r.strike === maxPain) : undefined
        const oiConcentrationPct = (maxPainRow && totalOI > 0)
          ? parseFloat((((maxPainRow.CE.oi + maxPainRow.PE.oi) / totalOI) * 100).toFixed(1))
          : null

        const relevance = relevanceOf(dte, gap !== null ? Math.abs(gap) : null, oiConcentrationPct)

        return [instrument, { maxPain, futurePrice: data.futurePrice, gap, dte, oiConcentrationPct, relevance }]
      } catch {
        return [instrument, null]
      }
    }),
  )
  return Object.fromEntries(entries)
}

export default async function MCXMaxPainPage() {
  const data = await getMaxPainData()

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(SCHEMA) }} />
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        MCX Max Pain Today
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginBottom: '1.5rem' }}>
        The strike where option writers as a group would owe the least — sometimes cited as a
        level futures drift toward into expiry. How much that applies right now depends on days
        to expiry, distance, and whether OI is actually concentrated there — see Relevance below.
      </p>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => {
          const row = data[key]
          const gapAbs   = row?.gap != null ? Math.abs(row.gap) : Infinity
          const gapColor = row?.gap == null ? 'var(--ink-3)'
            : gapAbs < 1 ? 'var(--up)'
            : gapAbs < 3 ? 'var(--gold-dark)'
            : 'var(--ink-3)'
          const relColor = row?.relevance === 'High' ? 'var(--up)'
            : row?.relevance === 'Moderate' ? 'var(--gold-dark)'
            : 'var(--ink-3)'
          return (
            <div key={key} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'var(--surface)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>{meta.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)' }}>
                  {row ? `Futures: ${row.futurePrice.toLocaleString()}` : '—'}
                </div>
                {row?.dte !== null && row?.dte !== undefined && (
                  <div style={{ fontSize: '0.7rem', color: relColor, marginTop: 2, fontWeight: 600 }}>
                    {row.dte}d to expiry · Relevance: {row.relevance}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
                    {row?.maxPain !== null && row?.maxPain !== undefined
                      ? row.maxPain.toLocaleString()
                      : '—'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--ink-3)' }}>Max Pain</div>
                </div>
                {row?.gap !== null && row?.gap !== undefined && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 700, color: gapColor }}>
                      {row.gap > 0 ? '+' : ''}{row.gap}%
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--ink-3)' }}>Futures vs Max Pain</div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <section style={{ marginTop: '1.25rem', padding: '0.9rem 1.1rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--ink-2)', background: 'var(--surface-2)' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.4rem' }}>How to read Relevance</h2>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.7 }}>
          <li><strong>High</strong> — within 7 days of expiry, futures within 2% of max pain, and OI is genuinely concentrated at that strike. The &ldquo;pin&rdquo; idea has the most basis here.</li>
          <li><strong>Moderate</strong> — within 15 days of expiry and futures within 5% of max pain. Worth watching, not yet decision-grade.</li>
          <li><strong>Low</strong> — far from expiry, far from the strike, or OI too spread out for one strike to matter. Max pain here is closer to background noise than a pull on price.</li>
        </ul>
      </section>

      <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', marginTop: '1.25rem' }}>
        Full option chain with OI distribution →{' '}
        <Link href="/options" style={{ color: 'var(--gold)', fontWeight: 600 }}>MCX Options</Link>
      </p>
    </main>
  )
}
