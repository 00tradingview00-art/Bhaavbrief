import { redisCommand } from '@/lib/redis'

export interface OIHistoryPoint {
  date: string
  ceOI: number
  peOI: number
}

export interface OISnapshotRow {
  strike: number
  ceOI: number
  peOI: number
}

interface ChainRowForSnapshot {
  strike: number
  isATM?: boolean
  CE: { oi: number }
  PE: { oi: number }
}

// The cron (app/api/cron/oi-snapshot/route.ts) can only afford to persist a
// handful of strikes per instrument per day (Upstash free-tier budget), so it
// keeps the top-10 by combined OI. But getOIHistory() below always looks up
// the ATM strike, which is purely price-driven (lib/options.ts) and has no
// relation to OI ranking — nothing guaranteed ATM was ever among that day's
// top-10, so the strike the UI actually queries could permanently never
// accumulate history. Always including today's ATM strike (in addition to
// the top-10) fixes that without giving up the top-10 list. Fixed 2026-09-03.
export function buildOiSnapshotRows(chain: ChainRowForSnapshot[]): OISnapshotRow[] {
  const top = chain
    .map(r => ({ strike: r.strike, ceOI: r.CE.oi, peOI: r.PE.oi, total: r.CE.oi + r.PE.oi }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(({ strike, ceOI, peOI }) => ({ strike, ceOI, peOI }))

  const atm = chain.find(r => r.isATM)
  if (atm && !top.some(r => r.strike === atm.strike)) {
    top.push({ strike: atm.strike, ceOI: atm.CE.oi, peOI: atm.PE.oi })
  }
  return top
}

// IST-anchored, matching todayIST() (lib/redis.ts -> lib/tradingCalendar.ts
// -> scripts/lib/holidays.js) rather than a plain UTC Date walk, so this
// window can't silently drift out of sync with the IST calendar dates the
// cron writes under if its schedule ever moves closer to the UTC/IST
// boundary (currently 18:10 UTC / 23:40 IST, comfortably clear of it).
function istDateWindow(days: number): string[] {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowIST = Date.now() + IST_OFFSET_MS
  return Array.from({ length: days }, (_, i) => new Date(nowIST - i * 86400000).toISOString().slice(0, 10))
}

// Shared by app/api/options/oi-history/route.ts and any server component that
// wants to seed OIBuildupChart's initial render (e.g. app/tools/mcx-iv-rank,
// app/tools/mcx-open-interest) — mirrors lib/options.ts's getOptionsChain()
// being reused by both the API route and app/options/page.tsx. Returns full,
// untruncated history; free/Pro slicing is a presentation concern the caller
// decides, not this function's job.
export async function getOIHistory(instrument: string, strike: number): Promise<OIHistoryPoint[]> {
  const dates = istDateWindow(90)

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
