import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { isProUser } from '@/lib/subscription'
import { redisCommand } from '@/lib/redis'
import { computeIVRegime, liveAtmIV, type IVRegime, type IVHistoryPoint } from '@/lib/ivAnalysis'
import { MCX_INSTRUMENTS, getOptionsChain } from '@/lib/options'
import Link from 'next/link'
import ProBlurGate from '@/components/ProBlurGate'
import VolatilityHub from './VolatilityHub'

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

// Rolling IV Rank per day — computeIVRegime(history, currentIV) already does
// the min/max-rank math for "today vs all history"; walking it forward one
// day at a time (using only the data available up to that day) turns that
// single snapshot into the real 90-day series the chart below needs, instead
// of the hardcoded Math.sin() placeholder this replaced.
function ivRankSeries(history: IVHistoryPoint[]): { date: string; ivRank: number }[] {
  return history.map((point, i) => ({
    date:   point.date,
    ivRank: computeIVRegime(history.slice(0, i + 1), point.iv).ivRank,
  }))
}

function regimeColor(regime: string | undefined): string {
  if (regime === 'HIGH')   return 'var(--down)'
  if (regime === 'NORMAL') return 'var(--up)'
  if (regime === 'LOW')    return 'var(--gold-dark)'
  return 'var(--ink-3)'
}

export default async function MCXIVRankPage() {
  const { userId } = await auth()
  const isPro = await isProUser(userId)
  const ivRanks = await getIVRanks()
  const instrumentList = Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => ({ key, label: meta.label }))

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
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color }}>{regime.ivRank.toFixed(0)}</div>
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
        <ProBlurGate label="90-day IV rank trend — see how volatility has moved over time" timestamp="Updated today">
          <svg width="100%" height="170" viewBox="0 0 500 170" style={{ display: 'block' }}>
            {Object.entries(MCX_INSTRUMENTS).map(([key, meta], row) => {
              const series = ivRankSeries(ivRanks[key]?.history ?? [])
              const rowTop = row * 32
              if (series.length < 2) {
                return (
                  <text key={key} x="4" y={rowTop + 18} fontSize="10" fill="var(--ink-4)">
                    {meta.label}: not enough history yet
                  </text>
                )
              }
              const barW  = Math.min(18, 480 / series.length - 2)
              const gap   = 480 / series.length
              return (
                <g key={key}>
                  <text x="0" y={rowTop + 8} fontSize="9" fill="var(--ink-3)">{meta.label}</text>
                  {series.map((point, i) => {
                    const h = 2 + (point.ivRank / 100) * 20
                    return (
                      <rect
                        key={point.date}
                        x={i * gap + 4}
                        y={rowTop + 26 - h}
                        width={Math.max(1.5, barW)}
                        height={h}
                        rx="1"
                        fill="var(--gold)"
                        opacity={0.4 + (i / series.length) * 0.5}
                      />
                    )
                  })}
                </g>
              )
            })}
          </svg>
        </ProBlurGate>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.75rem' }}>
          IV Skew &amp; OI Buildup
        </h2>
        <VolatilityHub instruments={instrumentList} isPro={isPro} />
      </section>

      <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', marginTop: '1.5rem' }}>
        For full option chains, Greeks, and strategy builder →{' '}
        <Link href="/options" style={{ color: 'var(--gold)', fontWeight: 600 }}>MCX Options</Link>
      </p>
    </main>
  )
}
