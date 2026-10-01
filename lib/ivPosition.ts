import type { IVRegime } from '@/lib/ivAnalysis'

export type IVPositionView = {
  // 0–100 along the Low → High track.
  position: number
  description: string
  ariaLabel: string
}

const DIRECTION_BOUNDARY = 'This reflects expected movement, not direction.'

const STATE_COPY: Record<IVRegime['regime'], { short: string; description: string }> = {
  RICH:   { short: 'higher than usual', description: `Options are priced higher than usual for this market. ${DIRECTION_BOUNDARY}` },
  NORMAL: { short: 'in its usual range', description: `Options pricing is in its usual range for this market. ${DIRECTION_BOUNDARY}` },
  CHEAP:  { short: 'lower than usual', description: `Options are priced lower than usual for this market. ${DIRECTION_BOUNDARY}` },
}

export const IV_RANK_EXPLAINER = {
  metric: 'IV Rank',
  shows: 'Where current options pricing sits between calmer and more active conditions for this market.',
  doesNotMean: 'It does not predict whether the market will move up or down.',
  linkLabel: 'Explore the option chain',
} as const

/**
 * Dot position and sentence both come from the percentile — the same reading
 * the card's Cheap/Normal/Rich label uses — so the visual and its text can't
 * disagree. Returns null when the history has no range (placeholder reading).
 */
export function ivPositionView(regime: IVRegime | null): IVPositionView | null {
  if (!regime || !regime.hasRange) return null
  const copy = STATE_COPY[regime.regime]
  return {
    position: Math.max(0, Math.min(100, regime.percentile)),
    description: copy.description,
    ariaLabel: `Options pricing is ${copy.short} for this market`,
  }
}
