export type MaxPainRelevance = 'High' | 'Moderate' | 'Low'

// Max Pain's "futures gravitate here" framing only has any real basis when
// expiry is near, price is already close, and OI is genuinely concentrated
// at that strike — not as a standing property of the number itself. This
// mirrors that instead of asserting it unconditionally in page copy.
export function relevanceOf(dte: number | null, gapAbs: number | null, oiConcentrationPct: number | null): MaxPainRelevance {
  if (dte === null || gapAbs === null) return 'Low'
  if (dte <= 7 && gapAbs < 2 && (oiConcentrationPct ?? 0) >= 8) return 'High'
  if (dte <= 15 && gapAbs < 5) return 'Moderate'
  return 'Low'
}
