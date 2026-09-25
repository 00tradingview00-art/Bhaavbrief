import { redisCommand } from './redis'

export interface HistoryPoint { date: string; value: number }

function parseHistHash(raw: string[] | null): HistoryPoint[] {
  const points: HistoryPoint[] = []
  if (!raw) return points
  for (let i = 0; i < raw.length; i += 2) {
    const value = parseFloat(raw[i + 1])
    if (!isNaN(value)) points.push({ date: raw[i], value })
  }
  points.sort((a, b) => a.date.localeCompare(b.date))
  return points
}

// Real daily history of the composite iVIX / Vol Premium written by
// app/api/cron/iv-snapshot/route.ts — not yet wired into any UI (see that
// route's header comment). Not the same series as the per-instrument
// iv-hist:{instrument} keys behind the Pro-gated IV Rank feature.
export async function getCompositeHistory(): Promise<{ ivix: HistoryPoint[]; volPremium: HistoryPoint[] }> {
  try {
    const [ivixRaw, volPremiumRaw] = await Promise.all([
      redisCommand('hgetall', 'iv-hist:COMPOSITE') as Promise<string[] | null>,
      redisCommand('hgetall', 'volpremium-hist:COMPOSITE') as Promise<string[] | null>,
    ])
    return { ivix: parseHistHash(ivixRaw), volPremium: parseHistHash(volPremiumRaw) }
  } catch (e) {
    console.error('[compositeHistory] redis error:', (e as Error).message)
    return { ivix: [], volPremium: [] }
  }
}
