import type { Metadata } from 'next'
import ProBlurGate from '@/components/ProBlurGate'
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
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        MCX Options Greeks (ATM)
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginBottom: '1.5rem' }}>
        Black-76 model Greeks for the at-the-money strike. Refreshed every 60 seconds.
      </p>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => {
          const data = greeks[key]
          return (
            <div key={key} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.9rem 1.1rem', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{meta.label}</h2>
                {data && <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>ATM Strike: {data.strike.toLocaleString()}</span>}
              </div>
              {data ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--ink-3)' }}>
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
                        <tr key={side} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '4px 8px', fontWeight: 600, color: side === 'CE' ? 'var(--up)' : 'var(--gold-dark)' }}>{side}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--ink)' }}>{fmt(data[side].iv, 1)}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--ink)' }}>{fmt(data[side].delta)}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--ink)' }}>{fmt(data[side].gamma, 6)}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--ink)' }}>{fmt(data[side].theta, 2)}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--ink)' }}>{fmt(data[side].vega, 2)}</td>
                        </tr>
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

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.75rem' }}>Full Strike Greeks — OTM Depth</h2>
        <ProBlurGate label="OTM strike Greeks — delta, gamma, theta, vega for all strikes" timestamp="Live">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left' }}>Strike</th>
                  <th style={{ padding: '4px 8px' }}>Δ Delta</th>
                  <th style={{ padding: '4px 8px' }}>Γ Gamma</th>
                  <th style={{ padding: '4px 8px' }}>Θ Theta</th>
                  <th style={{ padding: '4px 8px' }}>V Vega</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 8px', fontWeight: 600 }}>——</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>0.{30 + i * 8}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>0.00{4 + i}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>-{12 + i * 3}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{80 + i * 15}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ProBlurGate>
      </section>

      <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', marginTop: '1.5rem' }}>
        Full option chain with all strikes →{' '}
        <Link href="/options" style={{ color: 'var(--gold)', fontWeight: 600 }}>MCX Options</Link>
        {' '}· Strategy builder →{' '}
        <Link href="/options/strategy" style={{ color: 'var(--gold)', fontWeight: 600 }}>Strategy Builder</Link>
      </p>
    </main>
  )
}
