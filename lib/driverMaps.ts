import type { MCXData, PriceData } from '@/lib/prices'

export type DriverTone = 'up' | 'down' | 'neutral'
export type DriverRelationship = 'same' | 'opposite' | 'none'

// A change that is null was not received — never a real 0%.
export type DriverReading = { changePct: number | null; tone: DriverTone }

export type DriverMap = {
  key: 'gold' | 'silver' | 'crude' | 'natgas'
  label: string
  href: string
  mcx: DriverReading
  mcxStale: boolean
  benchmarkLabel: string
  benchmark: DriverReading
  usdinr: DriverReading
  relationship: DriverRelationship
  sentence: string
}

export type DriverMapsView = {
  maps: DriverMap[]
  timestamp: string | null
  sessionOpen: boolean
}

// Fixed component copy, kept here so the visual copy compliance test covers it.
export const DRIVER_MAPS_COPY = {
  eyebrow: 'Market context',
  title: 'What’s moving alongside MCX',
  subtitleOpen: 'Live market context, not a prediction or a causal model.',
  subtitleClosed: 'Last session’s market context, not a prediction or a causal model.',
  unavailable: 'Unavailable',
  delayed: 'Delayed',
  usdinrLabel: 'USD/INR',
  usdinrNote: 'USD/INR is additional India-market context.',
  noComparison: 'No clear comparison right now.',
} as const

const MAPS: Array<{
  key: DriverMap['key']
  label: string
  href: string
  benchmarkLabel: string
  benchmark: (p: PriceData) => { price: number; changePct: number }
}> = [
  { key: 'gold',   label: 'MCX Gold',        href: '/commodities/gold',        benchmarkLabel: 'Global gold',   benchmark: p => ({ price: p.comexGold,   changePct: p.goldComexPct }) },
  { key: 'silver', label: 'MCX Silver',      href: '/commodities/silver',      benchmarkLabel: 'Global silver', benchmark: p => ({ price: p.comexSilver, changePct: p.silverComexPct }) },
  { key: 'crude',  label: 'MCX Crude Oil',   href: '/commodities/crude-oil',   benchmarkLabel: 'WTI crude',     benchmark: p => ({ price: p.wti,         changePct: p.crudePct }) },
  { key: 'natgas', label: 'MCX Natural Gas', href: '/commodities/natural-gas', benchmarkLabel: 'Henry Hub',     benchmark: p => ({ price: p.henryHub,    changePct: p.gasPct }) },
]

function reading(price: number | undefined, changePct: number | undefined): DriverReading {
  // lib/prices.ts fills a failed fetch with 0 for both price and change, so a
  // missing price is the only reliable "not received" signal.
  if (!price || price <= 0 || changePct == null || !Number.isFinite(changePct)) return { changePct: null, tone: 'neutral' }
  return { changePct, tone: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'neutral' }
}

function relationshipOf(mcx: DriverReading, benchmark: DriverReading, mcxStale: boolean): DriverRelationship {
  if (mcxStale || mcx.tone === 'neutral' || benchmark.tone === 'neutral') return 'none'
  return mcx.tone === benchmark.tone ? 'same' : 'opposite'
}

function sentenceFor(relationship: DriverRelationship, benchmarkLabel: string, label: string): string {
  if (relationship === 'same') return `${benchmarkLabel} and ${label} are moving in the same direction.`
  if (relationship === 'opposite') return `${benchmarkLabel} and ${label} are moving in opposite directions.`
  return DRIVER_MAPS_COPY.noComparison
}

export function getDriverMaps(prices: PriceData | null): DriverMapsView {
  if (!prices) return { maps: [], timestamp: null, sessionOpen: false }
  const usdinr = reading(prices.usdinr, prices.usdinrChangePct)

  const maps = MAPS.flatMap(meta => {
    const data = prices[meta.key] as MCXData | undefined
    if (!data) return []
    const mcx = reading(data.mcx, data.mcxChangePct)
    const mcxStale = Boolean(prices.snapshotStale || data.mcxStale)
    const b = meta.benchmark(prices)
    const benchmark = reading(b.price, b.changePct)
    const relationship = relationshipOf(mcx, benchmark, mcxStale)
    return [{
      key: meta.key,
      label: meta.label,
      href: meta.href,
      mcx,
      mcxStale,
      benchmarkLabel: meta.benchmarkLabel,
      benchmark,
      usdinr,
      relationship,
      sentence: sentenceFor(relationship, meta.benchmarkLabel, meta.label),
    }]
  })

  return {
    maps,
    timestamp: prices.generatedAtIST ?? prices.updatedAt ?? null,
    sessionOpen: prices.marketOpen,
  }
}
