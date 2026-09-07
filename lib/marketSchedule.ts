// Server-only: pulls in lib/tradingCalendar.ts -> scripts/lib/holidays.js, which reads
// data/market-holidays.json off disk via `fs`. Deliberately kept out of lib/options.ts —
// that file is imported by client components (StrategyBuilder.tsx, for MCX_INSTRUMENTS),
// and pulling this in there breaks the client webpack bundle ("Module not found: Can't
// resolve 'fs'"). Only import this from server-only code (API routes, scripts).
import { isTradingDay, todayIST } from '@/lib/tradingCalendar'

const MCX_OPEN_MINUTES_IST = 9 * 60 // 09:00 IST

// ISO instant (UTC) of the next MCX session open (09:00 IST on the next trading day).
// Reuses lib/tradingCalendar's isTradingDay/todayIST — the repo's single holiday-calendar
// source of truth (see CLAUDE.md's C-01 ownership map) — rather than lib/options.ts's
// isMCXMarketOpen, whose Sunday-only check ignores Saturdays and declared MCX holidays.
export function nextMCXSessionOpenISO(): string {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const mins = ist.getHours() * 60 + ist.getMinutes()
  let d = todayIST()
  if (!(isTradingDay(d) && mins < MCX_OPEN_MINUTES_IST)) {
    do {
      const next = new Date(d + 'T00:00:00Z')
      next.setUTCDate(next.getUTCDate() + 1)
      d = next.toISOString().slice(0, 10)
    } while (!isTradingDay(d))
  }
  return `${d}T03:30:00.000Z` // 09:00 IST
}
