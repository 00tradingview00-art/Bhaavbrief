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
  const today = new Date()
  const dates = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    return d.toISOString().slice(0, 10)
  })

  // Fired concurrently, not sequentially — each redisCommand() call is
  // individually timed out (lib/redis.ts), so one slow/stuck day can no
  // longer stall the other 89 behind it.
  const raws = await Promise.all(
    dates.map(dateStr => redisCommand('get', `oi-snap:${instrument}:${dateStr}`).catch(() => null) as Promise<string | null>),
  )

  const history: OIHistoryPoint[] = []
  dates.forEach((dateStr, i) => {
    const raw = raws[i]
    if (!raw) return
    try {
      const { chain } = JSON.parse(raw) as { expiry: string; chain: { strike: number; ceOI: number; peOI: number }[] }
      const row = chain.find(r => r.strike === strike)
      if (row) history.push({ date: dateStr, ceOI: row.ceOI, peOI: row.peOI })
    } catch {
      // skip malformed entries
    }
  })

  history.sort((a, b) => a.date.localeCompare(b.date))
  return history
}
