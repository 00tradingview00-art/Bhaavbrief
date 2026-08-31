import { redisCommand } from './redis'

export interface PCRPoint {
  date: string
  pcr: number
}

const LOOKBACK_DAYS = 90

// Reads the same oi-snap:{instrument}:{date} keys the OI Buildup chart uses
// (app/api/cron/oi-snapshot/route.ts), pulling the `pcr` field persisted
// there — the same full-chain total-PE-OI/total-CE-OI figure lib/options.ts
// computes live, so this trend never disagrees with the live PCR number
// shown elsewhere on the same page. Snapshots taken before that field
// existed are skipped (real gap, never backfilled/estimated).
export async function getPCRHistory(instrument: string): Promise<PCRPoint[]> {
  const history: PCRPoint[] = []
  const today = new Date()

  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const raw = await redisCommand('get', `oi-snap:${instrument}:${dateStr}`) as string | null
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as { pcr?: number }
      if (typeof parsed.pcr === 'number') history.push({ date: dateStr, pcr: parsed.pcr })
    } catch {
      // skip malformed entries
    }
  }

  history.sort((a, b) => a.date.localeCompare(b.date))
  return history
}
