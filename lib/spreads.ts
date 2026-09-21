// Calendar-spread maths: same commodity, two futures expiries.
//
// A calendar spread is priced on the gap between two contracts, not on either
// price alone, so it is deliberately separate from lib/strategy.ts (whose
// payoff model is one underlying, one expiry). Pure functions only — no data
// fetching — so lib/spreads.test.ts can pin the sign conventions.
//
// Convention used everywhere (API, UI, tests): spread = far minus near.
// "BUY" the spread = buy the far month, sell the near month.

export interface CurveQuote {
  expiry: string          // YYYY-MM-DD
  tradingsymbol: string
  price: number | null    // null = no usable live quote
}

export type CurvePoint = CurveQuote

export type SpreadStructure = 'far-higher' | 'near-higher' | 'flat'

export interface SpreadRow {
  nearExpiry: string
  farExpiry: string
  near: number | null
  far: number | null
  spread: number | null       // far - near; null unless both legs have a live price
  spreadPct: number | null    // spread as % of the near price
  structure: SpreadStructure | null
}

export type SpreadSide = 'BUY' | 'SELL'

const isUsablePrice = (p: unknown): p is number => typeof p === 'number' && Number.isFinite(p) && p > 0

/**
 * Sort by expiry and normalise prices. A month with no usable quote keeps its
 * row with price null — never 0, never a last-known value — so the UI can show
 * "unavailable" instead of a number that looks real.
 */
export function buildCurve(quotes: CurveQuote[]): CurvePoint[] {
  return [...quotes]
    .sort((a, b) => a.expiry.localeCompare(b.expiry))
    .map(q => ({ ...q, price: isUsablePrice(q.price) ? q.price : null }))
}

/** far - near for each pair of consecutive listed months. */
export function adjacentSpreads(curve: CurvePoint[]): SpreadRow[] {
  const rows: SpreadRow[] = []
  for (let i = 0; i < curve.length - 1; i++) {
    rows.push(spreadBetween(curve[i], curve[i + 1]))
  }
  return rows
}

export function spreadBetween(near: CurvePoint, far: CurvePoint): SpreadRow {
  const n = isUsablePrice(near.price) ? near.price : null
  const f = isUsablePrice(far.price) ? far.price : null
  if (n == null || f == null) {
    return { nearExpiry: near.expiry, farExpiry: far.expiry, near: n, far: f, spread: null, spreadPct: null, structure: null }
  }
  const spread = f - n
  return {
    nearExpiry: near.expiry,
    farExpiry: far.expiry,
    near: n,
    far: f,
    spread,
    spreadPct: (spread / n) * 100,
    structure: spread > 0 ? 'far-higher' : spread < 0 ? 'near-higher' : 'flat',
  }
}

/**
 * Rupee P&L of a calendar spread when the spread moves from entry to exit.
 * Linear in the spread change: BUY gains when the spread widens, SELL when it
 * narrows. Returns null on any non-finite input rather than a NaN that would
 * render as a number.
 */
export function spreadPnl(args: {
  side: SpreadSide
  lots: number
  lotSize: number
  entrySpread: number
  exitSpread: number
}): number | null {
  const { side, lots, lotSize, entrySpread, exitSpread } = args
  if (![lots, lotSize, entrySpread, exitSpread].every(Number.isFinite)) return null
  const sign = side === 'BUY' ? 1 : -1
  return sign * (exitSpread - entrySpread) * lots * lotSize
}
