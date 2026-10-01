import type { Snapshot } from '@/lib/snapshot'
import { snapshotToPriceData } from '@/lib/snapshot'
import { getEventsForCommodity } from '@/lib/eventMap'
import { importGap, loadDutyFactors } from '@/lib/importDuty'

export type DriverEvent = { name: string; releaseUtc: string }

// Server-computed extras for the driver maps — things the client can't derive
// from live PriceData (duty factors and the event calendar are server-only).
export type DriverContext = {
  goldImportGapPct: number | null
  events: Partial<Record<'crude' | 'natgas', DriverEvent>>
}

const EIA_EVENT: Record<'crude' | 'natgas', string> = {
  crude: 'eia_petroleum_status_report',
  natgas: 'eia_natural_gas_storage',
}

export function getDriverContext(snap: Snapshot | null): DriverContext {
  const events: DriverContext['events'] = {}
  for (const key of ['crude', 'natgas'] as const) {
    const next = getEventsForCommodity(key).find(e => e.id === EIA_EVENT[key])
    if (next) events[key] = { name: next.name, releaseUtc: next.next_release_utc }
  }

  let goldImportGapPct: number | null = null
  if (snap) {
    const prices = snapshotToPriceData(snap)
    const usdinr = snap.instruments?.USDINR?.price ?? 0
    // Same inputs as the commodity page's duty-inclusive import parity; a
    // carried-forward MCX price is not compared.
    if (usdinr > 0 && !prices.gold.mcxStale) {
      goldImportGapPct = importGap(prices.gold.mcx, snap.derived?.importParityGoldINR, loadDutyFactors().gold)?.gapPct ?? null
    }
  }

  return { goldImportGapPct, events }
}
