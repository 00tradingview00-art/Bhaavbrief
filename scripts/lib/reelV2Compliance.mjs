/**
 * The publication contract for a BhaavBrief V2 reel.
 *
 * This is deliberately separate from the brief gate: a reel has its own
 * script, overlay copy, and Instagram caption, so passing the source brief
 * does not make a derived reel safe to publish.
 */

export const REQUIRED_DISCLAIMER = 'Educational data, not investment advice.'

const ACTION_LANGUAGE = [
  /\b(?:buy|sell|go long|go short|enter|exit|accumulate|book profits?)\b/i,
  /\b(?:should|recommend|advice|call|tip)\b/i,
  /\b(?:target price|stop[- ]?loss)\b/i,
]

const PREDICTION_LANGUAGE = [
  /\b(?:will|expected to|likely to)\s+(?:rise|fall|rally|crash|surge|plunge|soar|tank)\b/i,
  /\b(?:breakout|breakdown)\b/i,
]

function words(value = '') {
  return value.trim().split(/\s+/).filter(Boolean)
}

function allCopy(reel) {
  return [
    reel.hook,
    reel.voiceover,
    reel.caption,
    ...(reel.overlays ?? []),
  ].filter(Boolean).join('\n')
}

/**
 * @param {Record<string, unknown>} reel
 * @returns {string[]} blocking issues; an empty list means review-ready
 */
export function validateReelV2(reel) {
  const issues = []
  const required = ['id', 'series', 'hook', 'voiceover', 'caption', 'review_status']
  for (const field of required) {
    if (!reel?.[field]) issues.push(`Missing required field: ${field}`)
  }

  if (reel?.review_status !== 'approved') {
    issues.push('Reel is not human-approved')
  }

  if (words(reel?.hook).length > 9) {
    issues.push('Hook exceeds 9 words')
  }
  if (words(reel?.voiceover).length > 48) {
    issues.push('Voiceover exceeds 48 words (~18 seconds)')
  }

  const rawCopy = allCopy(reel)
  // The required legal sentence itself contains the word "advice". Remove
  // that exact boilerplate before scanning generated editorial copy.
  const copy = rawCopy.split(REQUIRED_DISCLAIMER).join('')
  for (const re of ACTION_LANGUAGE) {
    const match = copy.match(re)
    if (match) issues.push(`Action/advice language: "${match[0]}"`)
  }
  for (const re of PREDICTION_LANGUAGE) {
    const match = copy.match(re)
    if (match) issues.push(`Prediction language: "${match[0]}"`)
  }

  if (reel?.uses_live_data && !rawCopy.includes(REQUIRED_DISCLAIMER)) {
    issues.push(`Live-data reel must include: "${REQUIRED_DISCLAIMER}"`)
  }

  if (reel?.uses_synthetic_persona) {
    issues.push('Synthetic human presenters are not permitted in V2')
  }

  return issues
}
