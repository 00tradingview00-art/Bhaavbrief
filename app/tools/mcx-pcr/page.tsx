import type { Metadata } from 'next'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import Link from 'next/link'
import ProBlurGate from '@/components/ProBlurGate'

export const revalidate = 60

export const metadata: Metadata = {
  title:       'MCX Put-Call Ratio Today — BhaavBrief',
  description: 'Live MCX Put-Call Ratio (PCR) and IVIX for Gold, Silver, Crude Oil, Natural Gas, and Copper. PCR above 1 is bullish; below 0.7 is bearish.',
  keywords:    [
    'MCX put call ratio today India', 'MCX PCR gold silver crude',
    'MCX options PCR analysis India', 'MCX IVIX today',
    'MCX PCR live India', 'MCX put call ratio analysis',
  ],
}

async function getPCRData() {
  const results: Record<string, { pcr: number | null; ivix: number | null; futurePrice: number } | null> = {}
  for (const instrument of Object.keys(MCX_INSTRUMENTS)) {
    try {
      const data = await getOptionsChain(instrument)
      results[instrument] = {
        pcr:         (data as { pcr?: number }).pcr ?? null,
        ivix:        (data as { ivix?: number }).ivix ?? null,
        futurePrice: data.futurePrice,
      }
    } catch {
      results[instrument] = null
    }
  }
  return results
}

function pcrSignal(pcr: number | null): { label: string; color: string } {
  if (pcr === null) return { label: 'N/A', color: 'var(--ink-3)' }
  if (pcr > 1.2)   return { label: 'Bullish', color: 'var(--up)' }
  if (pcr > 0.8)   return { label: 'Neutral', color: 'var(--ink-3)' }
  return { label: 'Bearish', color: 'var(--down)' }
}

export default async function MCXPCRPage() {
  const data = await getPCRData()

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        MCX Put-Call Ratio (PCR)
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginBottom: '1.5rem' }}>
        PCR &gt; 1.2 = more puts than calls = market expects downside, short-sellers protecting = contrarian bullish signal.
        PCR &lt; 0.8 = complacency = contrarian bearish. Live data, updated every 60 seconds.
      </p>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => {
          const row = data[key]
          const { label, color } = pcrSignal(row?.pcr ?? null)
          return (
            <div key={key} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'var(--surface)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>{meta.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)' }}>
                  {row ? `Futures: ${row.futurePrice.toLocaleString()}` : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                {row?.ivix !== null && row?.ivix !== undefined && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>{row.ivix.toFixed(1)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--ink-3)' }}>iVIX</div>
                  </div>
                )}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color }}>
                    {row?.pcr !== null && row?.pcr !== undefined ? row.pcr.toFixed(2) : '—'}
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color }}>{label}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.75rem' }}>PCR Trend — 30 Days</h2>
        <ProBlurGate label="PCR trend chart — 30-day history of Call vs Put open interest ratio" timestamp="Live">
          <svg width="100%" height="160" viewBox="0 0 500 160" style={{ display: 'block' }}>
            {Array.from({ length: 30 }, (_, i) => {
              const ceH = 30 + Math.abs(Math.sin(i * 0.4)) * 40
              const peH = 25 + Math.abs(Math.cos(i * 0.4 + 1)) * 45
              return (
                <g key={i}>
                  <rect x={i * 16 + 2} y={140 - ceH} width={7} height={ceH} fill="var(--up)" opacity="0.7"/>
                  <rect x={i * 16 + 9} y={140 - peH} width={7} height={peH} fill="var(--gold-dark)" opacity="0.7"/>
                </g>
              )
            })}
            <text x="4" y="156" fontSize="9" fill="var(--up)">Call OI</text>
            <text x="48" y="156" fontSize="9" fill="var(--gold-dark)">Put OI</text>
          </svg>
        </ProBlurGate>
      </section>

      <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', marginTop: '1.5rem' }}>
        PCR trend chart history →{' '}
        <Link href="/options" style={{ color: 'var(--gold)', fontWeight: 600 }}>MCX Options (Pro)</Link>
      </p>
    </main>
  )
}
