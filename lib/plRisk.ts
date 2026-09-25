export interface AdverseMove {
  pct: number
  amount: number
}

/** Notional exposure of a position: entry price × lot size × number of lots. */
export function notionalExposure(entryPrice: number, lotSize: number, lots: number): number | null {
  if (!(entryPrice > 0) || !(lotSize > 0) || !(lots > 0)) return null
  return entryPrice * lotSize * lots
}

/** ₹ impact of a 1%/3%/5% adverse price move against the given notional. */
export function adverseMoveImpacts(notional: number, pcts: number[] = [1, 3, 5]): AdverseMove[] {
  return pcts.map(pct => ({ pct, amount: notional * (pct / 100) }))
}
