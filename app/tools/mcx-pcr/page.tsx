import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { isProUser } from '@/lib/subscription'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import { getPCRHistory } from '@/lib/pcrAnalysis'
import PCRTrendChart from './PCRTrendChart'
import { safeJsonLd } from '@/lib/seo'

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'MCX Put-Call Ratio',
      url: 'https://bhaavbrief.in/tools/mcx-pcr',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (web browser)',
      description: 'Live MCX Put-Call Ratio (PCR) and IVIX for Gold, Silver, Crude Oil, Natural Gas, and Copper.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      provider: { '@id': 'https://bhaavbrief.in/#organization' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://bhaavbrief.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'MCX Put-Call Ratio' },
      ],
    },
  ],
}

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
  const entries = await Promise.all(
    Object.keys(MCX_INSTRUMENTS).map(async (instrument): Promise<[string, { pcr: number | null; ivix: number | null; futurePrice: number } | null]> => {
      try {
        const data = await getOptionsChain(instrument)
        return [instrument, {
          pcr:         (data as { pcr?: number }).pcr ?? null,
          ivix:        (data as { ivix?: number }).ivix ?? null,
          futurePrice: data.futurePrice,
        }]
      } catch {
        return [instrument, null]
      }
    }),
  )
  return Object.fromEntries(entries)
}

function pcrSignal(pcr: number | null): { label: string; color: string } {
  if (pcr === null) return { label: 'N/A', color: 'var(--ink-3)' }
  if (pcr > 1.2)   return { label: 'Bullish', color: 'var(--up)' }
  if (pcr > 0.8)   return { label: 'Neutral', color: 'var(--ink-3)' }
  return { label: 'Bearish', color: 'var(--down)' }
}

export default async function MCXPCRPage() {
  const { userId } = await auth()
  const isPro = await isProUser(userId)
  const data = await getPCRData()
  const trends = await Promise.all(
    Object.entries(MCX_INSTRUMENTS).map(async ([key, meta]) => ({
      key, label: meta.label, history: await getPCRHistory(key),
    })),
  )

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(SCHEMA) }} />
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
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>{row.ivix.toFixed(1)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--ink-3)' }}>iVIX</div>
                  </div>
                )}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '1.4rem', fontWeight: 700, color }}>
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
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.75rem' }}>PCR Trend</h2>
        {trends.map(t => (
          <PCRTrendChart key={t.key} label={t.label} history={t.history} isPro={isPro} />
        ))}
      </section>
    </main>
  )
}
