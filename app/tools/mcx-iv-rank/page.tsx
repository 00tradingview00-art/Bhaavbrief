import type { Metadata } from 'next'
import { redisCommand } from '@/lib/redis'
import { computeIVRegime, type IVRegime } from '@/lib/ivAnalysis'
import { MCX_INSTRUMENTS } from '@/lib/options'
import Link from 'next/link'
import ProBlurGate from '@/components/ProBlurGate'

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

async function getIVRanks(): Promise<Record<string, { regime: IVRegime | null }>> {
  const result: Record<string, { regime: IVRegime | null }> = {}
  for (const instrument of Object.keys(MCX_INSTRUMENTS)) {
    try {
      const raw = await redisCommand('hgetall', `iv-hist:${instrument}`) as string[] | null
      if (!raw || raw.length < 4) { result[instrument] = { regime: null }; continue }
      const entries: { date: string; iv: number }[] = []
      for (let i = 0; i < raw.length; i += 2) {
        const iv = parseFloat(raw[i + 1])
        if (!isNaN(iv)) entries.push({ date: raw[i], iv })
      }
      entries.sort((a, b) => a.date.localeCompare(b.date))
      const currentIV = entries[entries.length - 1]?.iv ?? 0
      const history   = entries.map(e => ({ date: e.date, iv: e.iv }))
      result[instrument] = { regime: computeIVRegime(history, currentIV) }
    } catch {
      result[instrument] = { regime: null }
    }
  }
  return result
}

function regimeColor(regime: string | undefined): string {
  if (regime === 'HIGH')   return '#ef4444'
  if (regime === 'NORMAL') return '#22c55e'
  if (regime === 'LOW')    return '#3b82f6'
  return '#6b7280'
}

export default async function MCXIVRankPage() {
  const ivRanks = await getIVRanks()

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        MCX Implied Volatility Rank
      </h1>
      <p style={{ fontSize: '0.85rem', opacity: 0.65, marginBottom: '1.5rem' }}>
        IV Rank 0–100: how current IV compares to the past year. &gt;70 = expensive options, &lt;30 = cheap options.
      </p>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {Object.entries(MCX_INSTRUMENTS).map(([key, meta]) => {
          const { regime } = ivRanks[key] ?? { regime: null }
          const color = regimeColor(regime?.regime)
          return (
            <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{meta.label}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.55 }}>{key}</div>
              </div>
              {regime ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{regime.ivRank.toFixed(0)}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color }}>IV Rank</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>Pctl: {regime.percentile.toFixed(0)} · {regime.label}</div>
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>No history yet</div>
              )}
            </div>
          )
        })}
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>90-Day IV Rank History</h2>
        <ProBlurGate label="90-day IV rank trend — see how volatility has moved over time" timestamp="Updated today">
          <svg width="100%" height="160" viewBox="0 0 500 160" style={{ display: 'block' }}>
            {Object.keys(MCX_INSTRUMENTS).map((_, row) => (
              <g key={row}>
                {Array.from({ length: 20 }, (__, i) => {
                  const h = 10 + Math.abs(Math.sin((i + row * 3) * 0.8)) * 18
                  return <rect key={i} x={i * 24 + 4} y={row * 28 + 28 - h} width={18} height={h} rx="2" fill="#3b82f6" opacity={0.35 + i * 0.02}/>
                })}
              </g>
            ))}
          </svg>
        </ProBlurGate>
      </section>

      <p style={{ fontSize: '0.78rem', opacity: 0.55, marginTop: '1.5rem' }}>
        For full option chains, Greeks, and strategy builder →{' '}
        <Link href="/options" style={{ color: '#1a1a1a' }}>MCX Options</Link>
      </p>
    </main>
  )
}
