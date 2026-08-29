import type { Metadata } from 'next'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import Link from 'next/link'

export const revalidate = 60

export const metadata: Metadata = {
  title:       'MCX Max Pain Today — BhaavBrief',
  description: 'Live MCX Max Pain strike price for Gold, Silver, Crude Oil, Natural Gas, and Copper. The max pain strike is where aggregate option-holder losses are maximized at expiry.',
  keywords:    [
    'MCX max pain today India', 'MCX gold max pain strike',
    'MCX options max pain theory India', 'MCX silver max pain expiry',
    'MCX crude max pain strike', 'MCX max pain calculator India',
  ],
}

async function getMaxPainData() {
  const results: Record<string, { maxPain: number | null; futurePrice: number; gap: number | null } | null> = {}
  for (const instrument of Object.keys(MCX_INSTRUMENTS)) {
    try {
      const data = await getOptionsChain(instrument)
      const maxPain = (data as { maxPain?: number }).maxPain ?? null
      const gap     = (maxPain !== null && data.futurePrice > 0)
        ? parseFloat((((data.futurePrice - maxPain) / maxPain) * 100).toFixed(2))
        : null
      results[instrument] = { maxPain, futurePrice: data.futurePrice, gap }
    } catch {
      results[instrument] = null
    }
  }
  return results
}

export default async function MCXMaxPainPage() {
  const data = await getMaxPainData()

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        MCX Max Pain Today
      </h1>
      <p style={{ fontSize: '0.85rem', opacity: 0.65, marginBottom: '1.5rem' }}>
        Max Pain = the strike price where option buyers collectively lose the most at expiry, calculated from aggregate CE+PE OI.
        Futures often gravitate toward max pain in the last week before expiry.
      </p>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => {
          const row = data[key]
          const gapAbs   = row?.gap != null ? Math.abs(row.gap) : Infinity
          const gapColor = row?.gap == null ? '#888'
            : gapAbs < 1 ? '#22c55e'
            : gapAbs < 3 ? '#f97316'
            : '#888'
          return (
            <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{meta.label}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.55 }}>
                  {row ? `Futures: ${row.futurePrice.toLocaleString()}` : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                    {row?.maxPain !== null && row?.maxPain !== undefined
                      ? row.maxPain.toLocaleString()
                      : '—'}
                  </div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.55 }}>Max Pain</div>
                </div>
                {row?.gap !== null && row?.gap !== undefined && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: gapColor }}>
                      {row.gap > 0 ? '+' : ''}{row.gap}%
                    </div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.55 }}>Futures vs Max Pain</div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <section style={{ marginTop: '1.25rem', padding: '0.9rem 1.1rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.82rem', opacity: 0.8 }}>
        <h2 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>How to use Max Pain</h2>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.7 }}>
          <li>Futures within 1% of max pain — market writers have strong incentive to pin here.</li>
          <li>Futures far above max pain — call writers may hedge aggressively, creating drag.</li>
          <li>Most effective as an expiry-week tool (last 5 trading days).</li>
        </ul>
      </section>

      <p style={{ fontSize: '0.78rem', opacity: 0.55, marginTop: '1.25rem' }}>
        Full option chain with OI distribution →{' '}
        <Link href="/options" style={{ color: '#1a1a1a' }}>MCX Options</Link>
      </p>
    </main>
  )
}
