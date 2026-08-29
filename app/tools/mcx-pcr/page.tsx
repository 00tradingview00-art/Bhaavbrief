import type { Metadata } from 'next'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import Link from 'next/link'

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
  if (pcr === null) return { label: 'N/A', color: '#888' }
  if (pcr > 1.2)   return { label: 'Bullish', color: '#22c55e' }
  if (pcr > 0.8)   return { label: 'Neutral', color: '#6b7280' }
  return { label: 'Bearish', color: '#ef4444' }
}

export default async function MCXPCRPage() {
  const data = await getPCRData()

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        MCX Put-Call Ratio (PCR)
      </h1>
      <p style={{ fontSize: '0.85rem', opacity: 0.65, marginBottom: '1.5rem' }}>
        PCR &gt; 1.2 = more puts than calls = market expects downside, short-sellers protecting = contrarian bullish signal.
        PCR &lt; 0.8 = complacency = contrarian bearish. Live data, updated every 60 seconds.
      </p>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => {
          const row = data[key]
          const { label, color } = pcrSignal(row?.pcr ?? null)
          return (
            <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{meta.label}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.55 }}>
                  {row ? `Futures: ${row.futurePrice.toLocaleString()}` : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                {row?.ivix !== null && row?.ivix !== undefined && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{row.ivix.toFixed(1)}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.55 }}>iVIX</div>
                  </div>
                )}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>
                    {row?.pcr !== null && row?.pcr !== undefined ? row.pcr.toFixed(2) : '—'}
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color }}>{label}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '0.78rem', opacity: 0.55, marginTop: '1.5rem' }}>
        PCR trend chart history →{' '}
        <Link href="/options" style={{ color: '#1a1a1a' }}>MCX Options (Pro)</Link>
      </p>
    </main>
  )
}
