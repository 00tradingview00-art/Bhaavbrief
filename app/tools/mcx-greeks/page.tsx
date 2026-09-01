import type { Metadata } from 'next'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import Link from 'next/link'
import { safeJsonLd } from '@/lib/seo'

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'MCX Options Greeks',
      url: 'https://bhaavbrief.in/tools/mcx-greeks',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (web browser)',
      description: 'Live ATM delta, gamma, theta, and vega for MCX Gold, Silver, Crude Oil, Natural Gas, and Copper options.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      provider: { '@id': 'https://bhaavbrief.in/#organization' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://bhaavbrief.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'MCX Options Greeks' },
      ],
    },
  ],
}

export const revalidate = 60

export const metadata: Metadata = {
  title:       'MCX Options Greeks — BhaavBrief',
  description: 'Live ATM delta, gamma, theta, and vega for MCX Gold, Silver, Crude Oil, Natural Gas, and Copper options. Updated every 60 seconds during market hours.',
  keywords:    [
    'MCX gold options greeks', 'MCX options delta gamma theta vega India',
    'MCX gold ATM delta', 'MCX options greeks calculator India',
    'MCX silver options greeks', 'MCX crude options greeks live',
  ],
}

type Side = { delta: number | null; gamma: number | null; theta: number | null; vega: number | null; iv: number | null }
type StrikeRow = { strike: number; isATM?: boolean; CE: Side; PE: Side }

async function getGreeksData() {
  const results: Record<string, { atm: StrikeRow; otm: StrikeRow[] } | null> = {}

  for (const instrument of Object.keys(MCX_INSTRUMENTS)) {
    try {
      const { chain } = await getOptionsChain(instrument)
      const toSide = (s: { delta: number | null; gamma: number | null; theta: number | null; vega: number | null; iv: number | null }): Side => ({
        delta: s.delta ?? null, gamma: s.gamma ?? null, theta: s.theta ?? null, vega: s.vega ?? null, iv: s.iv ?? null,
      })
      const rows: StrikeRow[] = chain.map(r => ({ strike: r.strike, isATM: r.isATM, CE: toSide(r.CE), PE: toSide(r.PE) }))
      const atm = rows.find(r => r.isATM)
      if (!atm) { results[instrument] = null; continue }
      results[instrument] = { atm, otm: rows.filter(r => !r.isATM) }
    } catch {
      results[instrument] = null
    }
  }
  return results
}

function fmt(v: number | null, decimals = 4): string {
  return v !== null ? v.toFixed(decimals) : '—'
}

export default async function MCXGreeksPage() {
  const greeks = await getGreeksData()

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(SCHEMA) }} />
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        MCX Options Greeks — Full Strike Depth
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginBottom: '1.5rem' }}>
        Black-76 model Delta, Gamma, Theta, and Vega for every strike, free. Refreshed every 60 seconds.
      </p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => {
          const data = greeks[key]
          const rows = data ? [data.atm, ...data.otm].sort((a, b) => a.strike - b.strike) : []
          return (
            <div key={key} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.9rem 1.1rem', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{meta.label}</h2>
                {data && <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>ATM Strike: {data.atm.strike.toLocaleString()}</span>}
              </div>
              {rows.length ? (
                <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--ink-3)' }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Strike</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Side</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>IV %</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Delta</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Gamma</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Theta/day</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Vega/1%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => (
                        (['CE', 'PE'] as const).map(side => (
                          <tr key={`${row.strike}-${side}`} style={{
                            borderTop: '1px solid var(--border)',
                            background: row.isATM ? 'var(--gold-pale, #FFF6E0)' : 'transparent',
                          }}>
                            <td style={{ padding: '4px 8px', fontWeight: row.isATM ? 700 : 500, color: 'var(--ink)' }}>
                              {side === 'CE' ? row.strike.toLocaleString() : ''}
                            </td>
                            <td style={{ padding: '4px 8px', fontWeight: 600, color: side === 'CE' ? 'var(--up)' : 'var(--gold-dark)' }}>{side}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--ink)' }}>{fmt(row[side].iv, 1)}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--ink)' }}>{fmt(row[side].delta)}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--ink)' }}>{fmt(row[side].gamma, 6)}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--ink)' }}>{fmt(row[side].theta, 2)}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--ink)' }}>{fmt(row[side].vega, 2)}</td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)' }}>No live data available.</p>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', marginTop: '1.5rem' }}>
        Full option chain with live prices and OI →{' '}
        <Link href="/options" style={{ color: 'var(--gold)', fontWeight: 600 }}>MCX Options</Link>
        {' '}· Strategy builder →{' '}
        <Link href="/options/strategy" style={{ color: 'var(--gold)', fontWeight: 600 }}>Strategy Builder</Link>
      </p>
    </main>
  )
}
