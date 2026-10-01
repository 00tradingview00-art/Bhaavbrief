import type { MCXData, PriceData } from '@/lib/prices'

export type MarketPulseKey = 'gold' | 'silver' | 'crude' | 'copper' | 'natgas' | 'zinc' | 'lead' | 'aluminium' | 'nickel' | 'electricity'
export type MarketPulseTone = 'up' | 'down' | 'neutral'

export type MarketPulseItem = {
  key: MarketPulseKey
  label: string
  href: string
  price: number
  changePct: number
  tone: MarketPulseTone
  stale: boolean
}

export type MarketPulse = {
  items: MarketPulseItem[]
  lead: MarketPulseItem | null
  timestamp: string | null
  // False outside MCX hours: the moves shown are the last session's, not today's.
  sessionOpen: boolean
}

// Fixed component copy, kept here so the visual copy compliance test covers it.
export const MARKET_PULSE_COPY = {
  eyebrow: 'Visual market read',
  title: 'Market Pulse',
  listLabel: 'MCX commodity moves',
  delayed: 'Delayed',
  awaiting: 'Awaiting data',
  explore: 'Explore its current market context and the data behind it.',
  sinceVisit: 'since you last opened it',
} as const

const INSTRUMENTS: Array<{ key: MarketPulseKey; label: string; href: string }> = [
  { key: 'gold',        label: 'Gold',        href: '/commodities/gold' },
  { key: 'silver',      label: 'Silver',      href: '/commodities/silver' },
  { key: 'crude',       label: 'Crude Oil',   href: '/commodities/crude-oil' },
  { key: 'copper',      label: 'Copper',      href: '/commodities/copper' },
  { key: 'natgas',      label: 'Natural Gas', href: '/commodities/natural-gas' },
  { key: 'zinc',        label: 'Zinc',        href: '/commodities/zinc' },
  { key: 'lead',        label: 'Lead',        href: '/commodities/lead' },
  { key: 'aluminium',   label: 'Aluminium',   href: '/commodities/aluminium' },
  { key: 'nickel',      label: 'Nickel',      href: '/commodities/nickel' },
  { key: 'electricity', label: 'Electricity', href: '/commodities/electricity' },
]

function isUsable(data: MCXData | undefined): data is MCXData {
  return Boolean(data && Number.isFinite(data.mcx) && data.mcx > 0 && Number.isFinite(data.mcxChangePct))
}

function tone(changePct: number): MarketPulseTone {
  if (changePct > 0) return 'up'
  if (changePct < 0) return 'down'
  return 'neutral'
}

/**
 * Produces visual-only market facts from the live-serving PriceData shape.
 * It intentionally contains no user-visible movement thresholds: “among today's
 * largest moves” is a rank claim, not a directional or predictive signal.
 */
export function getMarketPulse(prices: PriceData | null): MarketPulse {
  if (!prices) return { items: [], lead: null, timestamp: null, sessionOpen: false }

  const items = INSTRUMENTS
    .flatMap(meta => {
      const data = prices[meta.key] as MCXData | undefined
      if (!isUsable(data)) return []
      return [{
        ...meta,
        price: data.mcx,
        changePct: data.mcxChangePct,
        tone: tone(data.mcxChangePct),
        stale: Boolean(prices.snapshotStale || data.mcxStale),
      }]
    })
    .sort((a, b) => {
      // Fresh data comes first. Within each state, larger absolute moves lead.
      if (a.stale !== b.stale) return a.stale ? 1 : -1
      return Math.abs(b.changePct) - Math.abs(a.changePct)
    })

  const fresh = items.filter(item => !item.stale)
  const top = fresh[0]
  return {
    items,
    // A single instrument is not enough market context to call it a lead move,
    // and a flat market has no largest move to name.
    lead: fresh.length >= 3 && top && top.changePct !== 0 ? top : null,
    timestamp: prices.generatedAtIST ?? prices.updatedAt ?? null,
    sessionOpen: prices.marketOpen,
  }
}

export function marketPulseSummary(lead: MarketPulseItem | null, sessionOpen = true): string | null {
  if (!lead) return null
  return sessionOpen
    ? `${lead.label} is among today's largest moves.`
    : `${lead.label} was among the largest moves in the last session.`
}

/**
 * "HH:MM IST" for the header. generatedAtIST is already IST text; updatedAt is
 * an ISO UTC string and must be converted, never shown raw.
 */
export function formatPulseTime(timestamp: string | null): string | null {
  if (!timestamp) return null
  const ist = timestamp.match(/\s(\d{2}:\d{2})(?:\s|$)/)
  if (ist && /IST/.test(timestamp)) return `${ist[1]} IST`
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(date)
  return `${time} IST`
}

/** URL slug used by the since-last-visit store — the commodity page path segment. */
export function pulseSlug(item: Pick<MarketPulseItem, 'href'>): string {
  return item.href.split('/').pop() ?? ''
}
