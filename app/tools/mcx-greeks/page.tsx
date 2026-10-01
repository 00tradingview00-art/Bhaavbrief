import type { Metadata } from 'next'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import Link from 'next/link'
import { safeJsonLd } from '@/lib/seo'
import MetricExplainDrawer from '@/components/visuals/MetricExplainDrawer'
import { METRIC_EXPLAINERS } from '@/lib/metricExplainers'

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
  const entries = await Promise.all(
    Object.keys(MCX_INSTRUMENTS).map(async (instrument): Promise<[string, { atm: StrikeRow; otm: StrikeRow[] } | null]> => {
      try {
        const { chain } = await getOptionsChain(instrument)
        const toSide = (s: { delta: number | null; gamma: number | null; theta: number | null; vega: number | null; iv: number | null }): Side => ({
          delta: s.delta ?? null, gamma: s.gamma ?? null, theta: s.theta ?? null, vega: s.vega ?? null, iv: s.iv ?? null,
        })
        const rows: StrikeRow[] = chain.map(r => ({ strike: r.strike, isATM: r.isATM, CE: toSide(r.CE), PE: toSide(r.PE) }))
        const atmIdx = rows.findIndex(r => r.isATM)
        if (atmIdx === -1) return [instrument, null]
        // Same free depth as the option chain (/api/options: ATM ±5 strikes).
        // Every strike with Greeks is a Pro feature; this page used to give it
        // all away free — and at ~2,400 rows it was a multi-MB page.
        const window = rows.slice(Math.max(0, atmIdx - 5), atmIdx + 6)
        return [instrument, { atm: rows[atmIdx], otm: window.filter(r => !r.isATM) }]
      } catch {
        return [instrument, null]
      }
    }),
  )
  return Object.fromEntries(entries)
}

function fmt(v: number | null, decimals = 4): string {
  return v !== null ? v.toFixed(decimals) : '—'
}

export default async function MCXGreeksPage() {
  const greeks = await getGreeksData()

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(SCHEMA) }} />
      {/* One stylesheet for the ~2,400 table rows instead of seven inline style
          objects per row — those were serialized into the page twice (HTML +
          RSC payload) and made it ~4 MB on production. */}
      <style>{`
        .gk-table tbody tr { border-top: 1px solid var(--border); }
        .gk-table tbody tr.gk-atm { background: var(--gold-pale, #FFF6E0); }
        .gk-table td { padding: 4px 8px; color: var(--ink); }
        .gk-table td.gk-strike { font-weight: 500; }
        .gk-table tr.gk-atm td.gk-strike { font-weight: 700; }
        .gk-table td.gk-ce { font-weight: 600; color: var(--up); }
        .gk-table td.gk-pe { font-weight: 600; color: var(--gold-dark); }
        .gk-table td.gk-num { text-align: right; }
      `}</style>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        MCX Options Greeks — Around the Money
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginBottom: '1.5rem' }}>
        Black-76 model Delta, Gamma, Theta, and Vega for the 11 strikes around the money, free. Refreshed every 60 seconds.
        Every strike and expiry is on <Link href="/pro" style={{ color: 'var(--gold)', fontWeight: 600 }}>BhaavBrief Pro</Link>.
      </p>
      <MetricExplainDrawer {...METRIC_EXPLAINERS.greeks} style={{ marginTop: '-1rem', marginBottom: '1.25rem' }} />

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
                  <table className="gk-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
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
                          <tr key={`${row.strike}-${side}`} className={row.isATM ? 'gk-atm' : undefined}>
                            <td className="gk-strike">{side === 'CE' ? row.strike.toLocaleString() : ''}</td>
                            <td className={side === 'CE' ? 'gk-ce' : 'gk-pe'}>{side}</td>
                            <td className="gk-num">{fmt(row[side].iv, 1)}</td>
                            <td className="gk-num">{fmt(row[side].delta)}</td>
                            <td className="gk-num">{fmt(row[side].gamma, 6)}</td>
                            <td className="gk-num">{fmt(row[side].theta, 2)}</td>
                            <td className="gk-num">{fmt(row[side].vega, 2)}</td>
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
