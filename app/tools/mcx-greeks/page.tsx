import type { Metadata } from 'next'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import Link from 'next/link'

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

async function getATMGreeks() {
  const results: Record<string, {
    strike: number
    CE: { delta: number | null; gamma: number | null; theta: number | null; vega: number | null; iv: number | null }
    PE: { delta: number | null; gamma: number | null; theta: number | null; vega: number | null; iv: number | null }
  } | null> = {}

  for (const instrument of Object.keys(MCX_INSTRUMENTS)) {
    try {
      const { chain } = await getOptionsChain(instrument)
      const atm = chain.find(r => r.isATM)
      if (!atm) { results[instrument] = null; continue }
      results[instrument] = {
        strike: atm.strike,
        CE: { delta: atm.CE.delta ?? null, gamma: atm.CE.gamma ?? null, theta: atm.CE.theta ?? null, vega: atm.CE.vega ?? null, iv: atm.CE.iv ?? null },
        PE: { delta: atm.PE.delta ?? null, gamma: atm.PE.gamma ?? null, theta: atm.PE.theta ?? null, vega: atm.PE.vega ?? null, iv: atm.PE.iv ?? null },
      }
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
  const greeks = await getATMGreeks()

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        MCX Options Greeks (ATM)
      </h1>
      <p style={{ fontSize: '0.85rem', opacity: 0.65, marginBottom: '1.5rem' }}>
        Black-76 model Greeks for the at-the-money strike. Refreshed every 60 seconds.
      </p>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => {
          const data = greeks[key]
          return (
            <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.9rem 1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{meta.label}</h2>
                {data && <span style={{ fontSize: '0.75rem', opacity: 0.55 }}>ATM Strike: {data.strike.toLocaleString()}</span>}
              </div>
              {data ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ opacity: 0.55 }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Side</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>IV %</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Delta</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Gamma</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Theta/day</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Vega/1%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['CE', 'PE'] as const).map(side => (
                        <tr key={side} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '4px 8px', fontWeight: 600, color: side === 'CE' ? '#22c55e' : '#f97316' }}>{side}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmt(data[side].iv, 1)}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmt(data[side].delta)}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmt(data[side].gamma, 6)}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmt(data[side].theta, 2)}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmt(data[side].vega, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>No live data available.</p>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '0.78rem', opacity: 0.55, marginTop: '1.5rem' }}>
        Full option chain with all strikes →{' '}
        <Link href="/options" style={{ color: '#1a1a1a' }}>MCX Options</Link>
        {' '}· Strategy builder →{' '}
        <Link href="/options/strategy" style={{ color: '#1a1a1a' }}>Strategy Builder</Link>
      </p>
    </main>
  )
}
