import type { MCXData, PriceData } from '@/lib/prices'

export type MarketPulseKey = 'gold' | 'silver' | 'crude' | 'copper' | 'natgas' | 'zinc' | 'lead' | 'aluminium' | 'nickel' | 'electricity'
export type MarketPulseTone = 'up' | 'down' | 'neutral'

export type MarketPulseItem = {
  key: MarketPulseKey
  label: string
  href: string
  changePct: number
  tone: MarketPulseTone
  stale: boolean
}

export type MarketPulse = {
  items: MarketPulseItem[]
  lead: MarketPulseItem | null
  timestamp: string | null
}

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
  if (!prices) return { items: [], lead: null, timestamp: null }

  const items = INSTRUMENTS
    .flatMap(meta => {
      const data = prices[meta.key] as MCXData | undefined
      if (!isUsable(data)) return []
      return [{
        ...meta,
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
  return {
    items,
    // A single instrument is not enough market context to call it a lead move.
    lead: fresh.length >= 3 ? fresh[0] ?? null : null,
    timestamp: prices.generatedAtIST ?? prices.updatedAt ?? null,
  }
}

export function marketPulseSummary(lead: MarketPulseItem | null): string | null {
  if (!lead) return null
  return `${lead.label} is among today's largest moves.`
}
