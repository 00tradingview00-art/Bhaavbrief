import { redisCommand } from './redis'
import { tradingSessionDate } from './tradingCalendar'

// Prior-session composite readings for the free Market Pulse panel.
//
// app/api/cron/iv-snapshot writes a 5-commodity composite of the full-chain
// ivix/volPremium every trading session (`iv-hist:COMPOSITE`,
// `volpremium-hist:COMPOSITE`) — the same two numbers the panel renders
// live. That store is nowhere near long enough for a regime label or a
// percentile claim (see MarketPulsePanel's own comment on why those stay
// out), but a day-over-day change only needs ONE prior session, which has
// existed since 2026-09-26. So: the previous session's close, and nothing
// derived from the distribution.

export interface PriorSessionReading {
  date:  string
  value: number
}

export interface CompositePulseHistory {
  ivix:       PriorSessionReading | null
  volPremium: PriorSessionReading | null
}

function parseHash(raw: string[] | null): PriorSessionReading[] {
  const entries: PriorSessionReading[] = []
  if (raw) {
    for (let i = 0; i < raw.length; i += 2) {
      const value = parseFloat(raw[i + 1])
      if (!isNaN(value)) entries.push({ date: raw[i], value })
    }
  }
  entries.sort((a, b) => a.date.localeCompare(b.date))
  return entries
}

// The newest stored session STRICTLY BEFORE the session the live panel
// numbers belong to — never the live session's own close, which would read
// as a ~0 change against itself.
//
// On a weekend/holiday tradingSessionDate() is null and the live chain is
// serving the last trading day's closing values, so the newest stored entry
// IS the live session: fall back to it as the cutoff and compare against the
// day before, rather than against itself.
export function priorSessionReading(
  entries: PriorSessionReading[],
  now = new Date(),
): PriorSessionReading | null {
  if (entries.length === 0) return null
  const cutoff = tradingSessionDate(now) ?? entries[entries.length - 1].date
  const prior = entries.filter(e => e.date < cutoff)
  return prior.length ? prior[prior.length - 1] : null
}

// Never throws: an unreachable/unconfigured Redis means the panel simply
// renders today's levels with no change line, exactly as it did before.
export async function getCompositePulseHistory(): Promise<CompositePulseHistory> {
  const [ivixRaw, volPremiumRaw] = await Promise.all([
    redisCommand('hgetall', 'iv-hist:COMPOSITE').catch(() => null) as Promise<string[] | null>,
    redisCommand('hgetall', 'volpremium-hist:COMPOSITE').catch(() => null) as Promise<string[] | null>,
  ])
  return {
    ivix:       priorSessionReading(parseHash(ivixRaw)),
    volPremium: priorSessionReading(parseHash(volPremiumRaw)),
  }
}
