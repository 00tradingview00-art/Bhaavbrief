/**
 * scripts/lib/eventSurprise.mjs — splits historical event-reaction moves into
 * "release was above its own trailing average" vs "below" buckets, instead of
 * comparing against a third-party consensus estimate. data/event-map.json's
 * header note is explicit: this repo never scrapes consensus estimates from
 * third-party calendars (ToS risk, product decision) — so "surprise" here is
 * measured against the release series' own history (e.g. EIA's own past
 * storage/inventory changes), not an external forecast.
 */

/**
 * @param {number[]} releaseValues - historical release values, releaseValues[i]
 *   must correspond to moves[i] (same occurrence). Any consistent order works.
 * @param {number[]} moves - absolute % price reaction for the same occurrences.
 * @param {number} minSampleSize - a bucket smaller than this is reported as
 *   null rather than a noisy stat from a handful of points.
 */
/**
 * Pairs each occurrence's price-reaction move with its corresponding
 * historical release value by index — both rawMoves and recentValues must
 * be ordered most-recent-first on the same weekly cadence (see
 * scripts/compute-event-impact.mjs's use of this). Drops any index where
 * either side is missing (a null price reaction, or no matching historical
 * value), so the two returned arrays stay aligned 1:1 and the same length.
 *
 * @param {(number|null)[]} rawMoves - NOT pre-filtered; nulls preserve the
 *   original occurrence index so pairing with recentValues[i] stays correct.
 * @param {{period: string, value: number}[]} recentValues
 */
export function pairOccurrencesWithValues(rawMoves, recentValues) {
  const pairedValues = []
  const pairedMoves = []
  for (let i = 0; i < rawMoves.length; i++) {
    if (rawMoves[i] == null) continue
    const rv = recentValues[i]
    if (!rv) continue
    pairedValues.push(rv.value)
    pairedMoves.push(rawMoves[i])
  }
  return { pairedValues, pairedMoves }
}

export function splitMovesBySurprise(releaseValues, moves, minSampleSize = 3) {
  if (releaseValues.length !== moves.length || releaseValues.length === 0) return null
  const baselineAvg = releaseValues.reduce((a, b) => a + b, 0) / releaseValues.length

  const above = []
  const below = []
  for (let i = 0; i < releaseValues.length; i++) {
    (releaseValues[i] > baselineAvg ? above : below).push(moves[i])
  }

  const summarize = (arr) => (arr.length >= minSampleSize
    ? {
        avgAbsMovePct: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100,
        maxAbsMovePct: Math.round(Math.max(...arr) * 100) / 100,
        sampleSize: arr.length,
      }
    : null)

  return {
    baselineAvg: Math.round(baselineAvg * 100) / 100,
    aboveAvg: summarize(above),
    belowAvg: summarize(below),
  }
}
