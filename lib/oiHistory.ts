import { redisCommand } from '@/lib/redis'

export interface OIHistoryPoint {
  date: string
  ceOI: number
  peOI: number
}

// Shared by app/api/options/oi-history/route.ts and any server component that
// wants to seed OIBuildupChart's initial render (e.g. app/tools/mcx-iv-rank,
// app/tools/mcx-open-interest) — mirrors lib/options.ts's getOptionsChain()
// being reused by both the API route and app/options/page.tsx. Returns full,
// untruncated history; free/Pro slicing is a presentation concern the caller
// decides, not this function's job.
export async function getOIHistory(instrument: string, strike: number): Promise<OIHistoryPoint[]> {
  const history: OIHistoryPoint[] = []
  const today = new Date()

  for (let i = 0; i < 90; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const key = `oi-snap:${instrument}:${dateStr}`
    const raw = await redisCommand('get', key) as string | null
    if (!raw) continue
    try {
      const { chain } = JSON.parse(raw) as { expiry: string; chain: { strike: number; ceOI: number; peOI: number }[] }
      const row = chain.find(r => r.strike === strike)
      if (row) history.push({ date: dateStr, ceOI: row.ceOI, peOI: row.peOI })
    } catch {
      // skip malformed entries
    }
  }

  history.sort((a, b) => a.date.localeCompare(b.date))
  return history
}
