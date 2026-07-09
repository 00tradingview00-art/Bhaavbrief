/**
 * lib/eventImpactStats.ts — single reader for data/event-impact-stats.json
 *
 * Output of scripts/compute-event-impact.mjs (Phase 2). This file does not
 * exist until Phase 2 ships — every function here degrades gracefully
 * (returns null/undefined) rather than throwing, so Phase 1 UI can safely
 * reference it before that data exists.
 */

import fs from 'fs'
import path from 'path'

export interface EventImpactEntry {
  avgAbsMovePct: number
  maxAbsMovePct: number
  sampleSize:    number
  computedAt:    string
}

type EventImpactStats = Record<string, Record<string, EventImpactEntry>>

const STATS_PATH = path.join(process.cwd(), 'data/event-impact-stats.json')

let cache: EventImpactStats | null | undefined

function loadStats(): EventImpactStats | null {
  if (cache !== undefined) return cache
  if (!fs.existsSync(STATS_PATH)) {
    cache = null
    return cache
  }
  try {
    cache = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8')) as EventImpactStats
  } catch {
    cache = null
  }
  return cache
}

export function getImpactStats(eventId: string, commodityKey: string): EventImpactEntry | null {
  const stats = loadStats()
  if (!stats) return null
  return stats[eventId]?.[commodityKey] ?? null
}
