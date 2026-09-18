// "Since your last visit" price memory — a tiny localStorage-backed store,
// keyed by the same URL slug used by WatchlistStar/CommodityVisitTracker.
// Purely a local convenience: not synced anywhere, no server involved.

const STORAGE_KEY = 'bb_last_seen_prices'

// Below this gap, a reload/backgrounded tab is treated as the same visit —
// long enough to avoid a near-meaningless delta from a quick refresh, short
// enough to still catch same-day return checks (e.g. morning vs. evening).
export const MIN_GAP_MS = 4 * 60 * 60 * 1000

interface SeenEntry {
  price: number
  ts: number
}

export interface SinceLastVisit {
  previousPrice: number
  previousTs: number
  delta: number
  deltaPct: number
}

function readStore(): Record<string, SeenEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, SeenEntry>) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, SeenEntry>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — fail open
  }
}

/**
 * Compares `currentPrice` against the last recorded visit for `slug`.
 * Returns null when there's nothing meaningful to show (first-ever visit,
 * or the previous visit was too recent to count as a return visit) — in
 * both cases the stored baseline is left as-is or seeded, never faked.
 */
export function getSinceLastVisit(
  slug: string,
  currentPrice: number,
  now: number = Date.now(),
): SinceLastVisit | null {
  if (!(currentPrice > 0)) return null

  const store = readStore()
  const entry = store[slug]

  if (!entry) {
    store[slug] = { price: currentPrice, ts: now }
    writeStore(store)
    return null
  }

  if (now - entry.ts < MIN_GAP_MS) {
    // Same visit (refresh, backgrounded tab) — don't disturb the baseline.
    return null
  }

  const result: SinceLastVisit = {
    previousPrice: entry.price,
    previousTs: entry.ts,
    delta: currentPrice - entry.price,
    deltaPct: entry.price > 0 ? ((currentPrice - entry.price) / entry.price) * 100 : 0,
  }

  store[slug] = { price: currentPrice, ts: now }
  writeStore(store)

  return result
}
