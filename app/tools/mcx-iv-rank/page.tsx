import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { isProUser } from '@/lib/subscription'
import { redisCommand } from '@/lib/redis'
import { computeIVRegime, liveAtmIV, ivRankSeries, type IVRegime, type IVHistoryPoint } from '@/lib/ivAnalysis'
import { MCX_INSTRUMENTS, getOptionsChain } from '@/lib/options'
import { getCachedOptionsChain } from '@/lib/optionsChainCache'
import { getOIHistory } from '@/lib/oiHistory'
import Link from 'next/link'
import VolatilityHub from './VolatilityHub'
import IVRankHistoryChart from './IVRankHistoryChart'
import { safeJsonLd } from '@/lib/seo'

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'MCX IV Rank',
      url: 'https://bhaavbrief.in/tools/mcx-iv-rank',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (web browser)',
      description: 'Live MCX Implied Volatility Rank (IV Rank) and IV Percentile for Gold, Silver, Crude Oil, Natural Gas, and Copper.',
      offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'INR', description: 'Current IV Rank per instrument' },
        { '@type': 'Offer', name: 'Pro', price: '333', priceCurrency: 'INR', description: 'IV Rank history, IV Skew, and OI Buildup' },
      ],
      provider: { '@id': 'https://bhaavbrief.in/#organization' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://bhaavbrief.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'MCX IV Rank' },
      ],
    },
  ],
}

export const revalidate = 900

export const metadata: Metadata = {
  title:       'MCX IV Rank — BhaavBrief',
  description: 'Live MCX Implied Volatility Rank (IV Rank) and IV Percentile for Gold, Silver, Crude Oil, Natural Gas, and Copper. Know if MCX options are cheap or expensive today.',
  keywords:    [
    'MCX IV rank India', 'MCX implied volatility rank today', 'MCX gold IV rank',
    'MCX crude oil IV percentile', 'is MCX options cheap or expensive India',
    'MCX options IV rank analysis', 'MCX silver IV rank today',
  ],
}

// Fetches a live ATM IV per instrument via the same liveAtmIV() helper
// OptionChain.tsx uses, instead of reusing the last *stored daily snapshot*
// as "current" — those two notions of "now" could diverge by hours,
// producing a different IV Rank/percentile for the same instrument than the
// Options page shows at the same moment (confirmed live: Gold read IV Rank
// 60 here vs 28 on /options). Falls back to the last stored snapshot only if
// the live chain fetch fails or has no LIVE-tier quote anywhere (e.g. a Kite
// outage) — never regresses to "No history yet" over a live-fetch hiccup
// when real historical data already exists.
async function getIVRanks(): Promise<Record<string, { regime: IVRegime | null; history: IVHistoryPoint[] }>> {
  const entries = await Promise.all(
    Object.keys(MCX_INSTRUMENTS).map(async (instrument): Promise<[string, { regime: IVRegime | null; history: IVHistoryPoint[] }]> => {
      try {
        const raw = await redisCommand('hgetall', `iv-hist:${instrument}`) as string[] | null
        if (!raw || raw.length < 4) return [instrument, { regime: null, history: [] }]
        const points: { date: string; iv: number }[] = []
        for (let i = 0; i < raw.length; i += 2) {
          const iv = parseFloat(raw[i + 1])
          if (!isNaN(iv)) points.push({ date: raw[i], iv })
        }
        points.sort((a, b) => a.date.localeCompare(b.date))
        const history = points.map(e => ({ date: e.date, iv: e.iv }))

        let currentIV = points[points.length - 1]?.iv ?? 0
        try {
          const chain = await getOptionsChain(instrument)
          const live = liveAtmIV(chain.chain)
          if (live.iv != null) currentIV = live.iv
        } catch {
          // Live fetch failed (stale Kite auth, outage) — keep the snapshot fallback.
        }

        return [instrument, { regime: computeIVRegime(history, currentIV), history: history.slice(-90) }]
      } catch {
        return [instrument, { regime: null, history: [] }]
      }
    }),
  )
  return Object.fromEntries(entries)
}

function regimeColor(regime: string | undefined): string {
  if (regime === 'HIGH')   return 'var(--down)'
  if (regime === 'NORMAL') return 'var(--up)'
  if (regime === 'LOW')    return 'var(--gold-dark)'
  return 'var(--ink-3)'
}

interface VolatilityChainRow {
  strike: number
  isATM?: boolean
  CE: { iv: number | null; tier: string }
  PE: { iv: number | null; tier: string }
}

// Server-seeds VolatilityHub's default-instrument view (IV Skew chart + OI
// Buildup chart) so it's present in the initial HTML instead of appearing
// only after a client-side fetch — mirrors app/options/page.tsx's
// getOptionsChain()/getCachedOptionsChain() → initialData prop pattern.
async function getDefaultVolatilityData(instrument: string, isPro: boolean) {
  const chainResult = await getOptionsChain(instrument).catch(async () => {
    const cached = await getCachedOptionsChain(instrument)
    return cached as { chain: VolatilityChainRow[] } | null
  })
  const chain = (chainResult?.chain ?? null) as VolatilityChainRow[] | null
  const atmStrike = chain?.find(r => r.isATM)?.strike ?? null

  if (!chain || atmStrike == null) {
    return { initialChain: chain, initialOIHistory: undefined, initialPreview: undefined }
  }

  const history = await getOIHistory(instrument, atmStrike).catch(() => [])
  return {
    initialChain: chain,
    initialOIHistory: isPro ? history : history.slice(-5),
    initialPreview: !isPro,
  }
}

export default async function MCXIVRankPage() {
  const { userId } = await auth()
  const isPro = await isProUser(userId)
  const ivRanks = await getIVRanks()
  const instrumentList = Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => ({ key, label: meta.label }))
  const defaultInstrument = instrumentList[0]?.key ?? ''
  const { initialChain, initialOIHistory, initialPreview } = defaultInstrument
    ? await getDefaultVolatilityData(defaultInstrument, isPro)
    : { initialChain: null, initialOIHistory: undefined, initialPreview: undefined }

  // The comparison window grows daily as the IV-snapshot cron accumulates
  // history — state the real depth available today rather than a fixed
  // "past year"/"90-Day" claim the data doesn't support yet (D-07: never
  // overclaim). Uses the longest real per-instrument window currently
  // available; each instrument's own card still shows its exact count.
  const maxHistoryDays = Math.max(
    0,
    ...Object.values(ivRanks).map(r => (r.regime ? Number(r.regime.label.match(/past (\d+) days/)?.[1] ?? 0) : 0)),
  )
  const windowLabel = maxHistoryDays >= 365 ? 'the past year' : `the past ${maxHistoryDays} day${maxHistoryDays === 1 ? '' : 's'}`
  const chartTitle = maxHistoryDays >= 90 ? '90-Day IV Rank History' : `${maxHistoryDays}-Day IV Rank History (growing daily)`

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(SCHEMA) }} />
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        MCX Implied Volatility Rank
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginBottom: '1.5rem' }}>
        IV Rank 0–100: how current IV compares to {windowLabel}. &gt;70 = expensive options, &lt;30 = cheap options.
      </p>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => {
          const { regime } = ivRanks[key] ?? { regime: null, history: [] }
          const color = regimeColor(regime?.regime)
          return (
            <div key={key} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'var(--surface)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>{meta.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>{key}</div>
              </div>
              {regime ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 700, color }}>{regime.ivRank.toFixed(0)}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color }}>IV Rank</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)' }}>Pctl: {regime.percentile.toFixed(0)} · {regime.label}</div>
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-3)' }}>No history yet</div>
              )}
            </div>
          )
        })}
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.75rem' }}>{chartTitle}</h2>
        <IVRankHistoryChart
          title={chartTitle}
          isPro={isPro}
          instruments={Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => ({
            key, label: meta.label, series: ivRankSeries(ivRanks[key]?.history ?? []),
          }))}
        />
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.75rem' }}>
          IV Skew &amp; OI Buildup
        </h2>
        <VolatilityHub
          instruments={instrumentList}
          isPro={isPro}
          initialInstrument={defaultInstrument}
          initialChain={initialChain ?? undefined}
          initialOIHistory={initialOIHistory}
          initialPreview={initialPreview}
        />
      </section>

      <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', marginTop: '1.5rem' }}>
        For full option chains, Greeks, and strategy builder →{' '}
        <Link href="/options" style={{ color: 'var(--gold)', fontWeight: 600 }}>MCX Options</Link>
      </p>
    </main>
  )
}
