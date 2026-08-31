import type { Metadata } from 'next'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import Link from 'next/link'
import ProBlurGate from '@/components/ProBlurGate'

export const revalidate = 60

export const metadata: Metadata = {
  title:       'MCX Open Interest Analysis — BhaavBrief',
  description: 'Top-5 OI strikes by Call and Put open interest for MCX Gold, Silver, Crude Oil, Natural Gas, and Copper. Live OI data updated every 60 seconds.',
  keywords:    [
    'MCX open interest analysis India', 'MCX OI data today gold silver crude',
    'how to read MCX open interest', 'MCX long short OI India',
    'MCX OI buildup analysis', 'MCX gold open interest today',
  ],
}

async function getOIData() {
  const results: Record<string, {
    futurePrice: number
    topCE: { strike: number; oi: number }[]
    topPE: { strike: number; oi: number }[]
  } | null> = {}

  for (const instrument of Object.keys(MCX_INSTRUMENTS)) {
    try {
      const { chain, futurePrice } = await getOptionsChain(instrument)
      const topCE = [...chain]
        .sort((a, b) => b.CE.oi - a.CE.oi)
        .slice(0, 5)
        .map(r => ({ strike: r.strike, oi: r.CE.oi }))
      const topPE = [...chain]
        .sort((a, b) => b.PE.oi - a.PE.oi)
        .slice(0, 5)
        .map(r => ({ strike: r.strike, oi: r.PE.oi }))
      results[instrument] = { futurePrice, topCE, topPE }
    } catch {
      results[instrument] = null
    }
  }
  return results
}

export default async function MCXOpenInterestPage() {
  const oi = await getOIData()

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        MCX Open Interest Analysis
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginBottom: '1.5rem' }}>
        Top-5 OI strikes by Call and Put for each instrument. High OI = strong support/resistance.
      </p>

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        {Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => {
          const data = oi[key]
          return (
            <div key={key} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.9rem 1.1rem', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{meta.label}</h2>
                {data && <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>Futures: {data.futurePrice.toLocaleString()}</span>}
              </div>
              {data ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {(['topCE', 'topPE'] as const).map(side => (
                    <div key={side}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: side === 'topCE' ? 'var(--up)' : 'var(--gold-dark)', marginBottom: 4 }}>
                        {side === 'topCE' ? 'Call' : 'Put'} OI (Top 5)
                      </div>
                      {data[side].map(r => (
                        <div key={r.strike} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '2px 0' }}>
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.strike.toLocaleString()}</span>
                          <span style={{ color: 'var(--ink-3)' }}>{r.oi.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)' }}>No live data available.</p>
              )}
            </div>
          )
        })}
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.75rem' }}>OI Buildup History — 90 Days by Strike</h2>
        <ProBlurGate label="OI buildup history — see how open interest has shifted across strikes over 90 days" timestamp="Updated today">
          <svg width="100%" height="180" viewBox="0 0 500 180" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="oigrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--up)" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="var(--up)" stopOpacity="0.1"/>
              </linearGradient>
              <linearGradient id="oigrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold-dark)" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="var(--gold-dark)" stopOpacity="0.05"/>
              </linearGradient>
            </defs>
            <polyline points="0,160 50,140 100,120 150,90 200,60 250,80 300,100 350,130 400,150 450,145 500,160"
              fill="url(#oigrad1)" stroke="var(--up)" strokeWidth="2"/>
            <polyline points="0,160 50,150 100,145 150,130 200,110 250,100 300,120 350,140 400,155 450,160 500,160"
              fill="url(#oigrad2)" stroke="var(--gold-dark)" strokeWidth="2"/>
            <text x="6" y="170" fontSize="9" fill="var(--up)">Call OI concentration</text>
            <text x="130" y="170" fontSize="9" fill="var(--gold-dark)">Put OI concentration</text>
          </svg>
        </ProBlurGate>
      </section>

      <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', marginTop: '1.5rem' }}>
        90-day OI buildup history by strike →{' '}
        <Link href="/options" style={{ color: 'var(--gold)', fontWeight: 600 }}>MCX Options (Pro)</Link>
      </p>
    </main>
  )
}
