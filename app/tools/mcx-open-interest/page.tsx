import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { isProUser } from '@/lib/subscription'
import { getOptionsChain, MCX_INSTRUMENTS } from '@/lib/options'
import { getCachedOptionsChain } from '@/lib/optionsChainCache'
import { getOIHistory } from '@/lib/oiHistory'
import OIBuildupSection from './OIBuildupSection'
import { safeJsonLd } from '@/lib/seo'

type OptionsChainResult = Awaited<ReturnType<typeof getOptionsChain>>

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'MCX Open Interest Analysis',
      url: 'https://bhaavbrief.in/tools/mcx-open-interest',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (web browser)',
      description: 'Top-5 OI strikes by Call and Put open interest for MCX Gold, Silver, Crude Oil, Natural Gas, and Copper, with OI buildup history by strike.',
      offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'INR', description: 'Top-5 OI strikes per instrument' },
        { '@type': 'Offer', name: 'Pro', price: '333', priceCurrency: 'INR', description: 'Full 90-day OI buildup history by strike' },
      ],
      provider: { '@id': 'https://bhaavbrief.in/#organization' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://bhaavbrief.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'MCX Open Interest Analysis' },
      ],
    },
  ],
}

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
  type OIResult = { futurePrice: number; topCE: { strike: number; oi: number }[]; topPE: { strike: number; oi: number }[]; stale?: boolean } | null

  const entries = await Promise.all(
    Object.keys(MCX_INSTRUMENTS).map(async (instrument): Promise<[string, OIResult]> => {
      try {
        // Live fetch failed (stale Kite auth, upstream error, etc.) — fall back to
        // the last-known-good chain, same pattern app/options/page.tsx already
        // uses, so this page shows real (if stale) OI data instead of going blank.
        const result = await getOptionsChain(instrument).catch(async () => {
          const cached = await getCachedOptionsChain(instrument)
          return cached ? ({ ...cached, stale: true } as unknown as OptionsChainResult & { stale: true }) : null
        })
        if (!result) return [instrument, null]
        const { chain, futurePrice } = result
        const topCE = [...chain]
          .sort((a, b) => b.CE.oi - a.CE.oi)
          .slice(0, 5)
          .map(r => ({ strike: r.strike, oi: r.CE.oi }))
        const topPE = [...chain]
          .sort((a, b) => b.PE.oi - a.PE.oi)
          .slice(0, 5)
          .map(r => ({ strike: r.strike, oi: r.PE.oi }))
        return [instrument, { futurePrice, topCE, topPE, stale: 'stale' in result ? result.stale : false }]
      } catch {
        return [instrument, null]
      }
    }),
  )
  return Object.fromEntries(entries)
}

export default async function MCXOpenInterestPage() {
  const { userId } = await auth()
  const isPro = await isProUser(userId)
  const oi = await getOIData()
  const anyStale = Object.values(oi).some(d => d?.stale)
  const buildupInstruments = Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => {
    const data = oi[key]
    const strikes = data
      ? Array.from(new Set([...data.topCE.map(r => r.strike), ...data.topPE.map(r => r.strike)])).sort((a, b) => a - b)
      : []
    return { key, label: meta.label, strikes }
  })

  // Server-seed OIBuildupSection's default (instrument, strike) selection —
  // same pair it would otherwise only resolve after a client-side fetch —
  // so the OI Buildup chart is present in the initial HTML.
  const defaultBuildup = buildupInstruments.find(i => i.strikes.length > 0)
  const defaultStrike  = defaultBuildup?.strikes[0] ?? null
  const initialOIHistory = defaultBuildup && defaultStrike != null
    ? await getOIHistory(defaultBuildup.key, defaultStrike).catch(() => [])
    : undefined
  const initialOIData = initialOIHistory
    ? { instrument: defaultBuildup!.key, strike: defaultStrike!, history: isPro ? initialOIHistory : initialOIHistory.slice(-5), preview: !isPro }
    : undefined

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(SCHEMA) }} />
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        MCX Open Interest Analysis
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginBottom: anyStale ? '0.5rem' : '1.5rem' }}>
        Top-5 OI strikes by Call and Put for each instrument. High OI = strong support/resistance.
      </p>
      {anyStale && (
        <p style={{ fontSize: '0.78rem', color: 'var(--gold-dark)', marginBottom: '1.5rem' }}>
          Showing the last known data for one or more instruments — live feed temporarily unavailable.
        </p>
      )}

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
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.75rem' }}>OI Buildup History — by Strike</h2>
        <OIBuildupSection instruments={buildupInstruments} isPro={isPro} initialOIData={initialOIData} />
      </section>
    </main>
  )
}
