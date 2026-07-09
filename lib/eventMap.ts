/**
 * lib/eventMap.ts — single reader for data/event-map.json
 *
 * Scheduled recurring macro/data-release events mapped to MCX contracts.
 * This is display-layer data only — it is NOT fed into brief generation
 * (unlike data/impact-map.json, which is). All filtering/sorting lives
 * here so page components stay thin.
 *
 * Server-only (imports fs/path) — client components must import types and
 * the COMMODITY_* constants from lib/eventMapTypes.ts instead.
 */

import fs from 'fs'
import path from 'path'
import type { EventMapEntry } from './eventMapTypes'

export type { EventMapEntry, EventPriorField, ImpactTier, CadenceType } from './eventMapTypes'
export { COMMODITY_URL_SLUGS, COMMODITY_LABELS } from './eventMapTypes'

interface EventMapFile {
  _note:  string
  events: EventMapEntry[]
}

const EVENT_MAP_PATH = path.join(process.cwd(), 'data/event-map.json')

let cache: EventMapEntry[] | null = null

export function loadEventMap(): EventMapEntry[] {
  if (cache) return cache
  if (!fs.existsSync(EVENT_MAP_PATH)) return []
  const raw = fs.readFileSync(EVENT_MAP_PATH, 'utf8')
  const parsed = JSON.parse(raw) as EventMapFile
  cache = parsed.events ?? []
  return cache
}

export function getUpcomingEvents(withinHours?: number): EventMapEntry[] {
  const now = Date.now()
  const events = loadEventMap()
    .filter(e => new Date(e.next_release_utc).getTime() > now)
    .sort((a, b) => new Date(a.next_release_utc).getTime() - new Date(b.next_release_utc).getTime())

  if (withinHours == null) return events

  const cutoff = now + withinHours * 3600_000
  return events.filter(e => new Date(e.next_release_utc).getTime() <= cutoff)
}

export function getEventsForCommodity(commodityKey: string): EventMapEntry[] {
  return getUpcomingEvents().filter(e => e.affected_contracts.includes(commodityKey))
}

export function getNextHighImpactEvent(): EventMapEntry | null {
  const upcoming = getUpcomingEvents().filter(e => e.impact_tier === 'high')
  return upcoming[0] ?? null
}
