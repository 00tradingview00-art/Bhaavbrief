import { redisCommand } from './redis'
import { tradingSessionDate } from './tradingCalendar'

// Sole reader of the composite history hashes written by
// app/api/cron/iv-snapshot/route.ts: `iv-hist:COMPOSITE` and
// `volpremium-hist:COMPOSITE`, the 5-commodity composites of the full-chain
// ivix/volPremium that Market Pulse renders live. NOT the same series as the
// per-instrument `iv-hist:{instrument}` keys behind the Pro-gated IV Rank
// feature — those are a single-strike ATM IV, a different metric.
//
// The store is nowhere near long enough for a regime label or a percentile
// claim (see MarketPulsePanel's own comment on why those stay off a free
// page), but a day-over-day read needs exactly ONE prior session, which has
// existed since 2026-09-26. Hence `priorSessionReading` below: the previous
// session's close, and nothing derived from the distribution.

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

// Per-key rather than one try/catch around both reads: one unreachable key
// must not blank out the other tile's line. Never throws — a Redis outage
// renders the panel exactly as it does before any history exists.
async function readHist(key: string): Promise<HistoryPoint[]> {
  try {
    return parseHistHash(await redisCommand('hgetall', key) as string[] | null)
  } catch (e) {
    console.error(`[compositeHistory] ${key} read failed:`, (e as Error).message)
    return []
  }
}

export async function getCompositeHistory(): Promise<{ ivix: HistoryPoint[]; volPremium: HistoryPoint[] }> {
  const [ivix, volPremium] = await Promise.all([
    readHist('iv-hist:COMPOSITE'),
    readHist('volpremium-hist:COMPOSITE'),
  ])
  return { ivix, volPremium }
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
  entries: HistoryPoint[],
  now = new Date(),
): HistoryPoint | null {
  if (entries.length === 0) return null
  const cutoff = tradingSessionDate(now) ?? entries[entries.length - 1].date
  const prior = entries.filter(e => e.date < cutoff)
  return prior.length ? prior[prior.length - 1] : null
}

// iVIX only: Market Pulse's other composite tile shows delivered volatility,
// which intentionally carries no change line (see MarketPulsePanel). The
// volPremium series is still read by getCompositeHistory() and still written
// daily by the cron — it is the only record of that history — it just has no
// prior-session consumer.
export interface CompositePriorSession {
  ivix: HistoryPoint | null
}

export async function getCompositePriorSession(): Promise<CompositePriorSession> {
  const history = await getCompositeHistory()
  return { ivix: priorSessionReading(history.ivix) }
}
