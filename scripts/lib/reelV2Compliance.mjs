/**
 * The publication contract for a BhaavBrief V2 reel.
 *
 * This is deliberately separate from the brief gate: a reel has its own
 * script, overlay copy, and Instagram caption, so passing the source brief
 * does not make a derived reel safe to publish.
 */

import { checkClaims } from './claimsCheck.mjs'

export const REQUIRED_DISCLAIMER = 'Educational data, not investment advice.'
export const REQUIRED_VOICE_PROFILE = 'female'
const MAX_STORYBOARD_LINES = 2
const MAX_STORYBOARD_LINE_WORDS = 8
const EDITORIAL_BRIEF_FIELDS = [
  'viewer_question',
  'misconception',
  'mechanism',
  'proof_plan',
  'boundary',
  'memory_check',
  // A content-correct Reel can still fail if it opens like a textbook.
  // These fields make the audience, source, and save payoff reviewable before render.
  'human_opening',
  'primary_source',
  'save_frame',
  'voice_tone',
]

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
    // Storyboard copy is burned onto the video as on-screen text, same as an
    // overlay — advisory/prediction language hiding only here would
    // otherwise ship unscanned.
    ...(reel.storyboard ?? []).map((scene) => scene.copy),
  ].filter(Boolean).join('\n')
}

/**
 * @param {Record<string, unknown>} reel
 * @param {Array<{claim_id: string, values?: {avgAbsMovePct?: number, maxAbsMovePct?: number}}>} [claims]
 *   The data/claims.json ledger — pass [] to skip the check (every
 *   historical-% claim then fails closed, since nothing can match). Caller
 *   loads the file; this stays a pure function like checkClaims itself.
 * @returns {string[]} blocking issues; an empty list means review-ready
 */
export function validateReelV2(reel, claims = []) {
  const issues = []
  const required = ['id', 'series', 'hook', 'voiceover', 'caption', 'review_status', 'voice_profile']
  for (const field of required) {
    if (!reel?.[field]) issues.push(`Missing required field: ${field}`)
  }

  if (reel?.review_status !== 'approved') {
    issues.push('Reel is not human-approved')
  }

  // A V2 release is an explanation, not just a styled sequence. The brief
  // ensures each published idea begins with a real question, names the wrong
  // shortcut, states one mechanism, and has an evidence/caveat plan.
  for (const field of EDITORIAL_BRIEF_FIELDS) {
    if (!reel?.editorial_brief?.[field]) issues.push(`Missing editorial brief field: ${field}`)
  }

  if (reel?.editorial_brief?.human_opening && words(reel.editorial_brief.human_opening).length < 4) {
    issues.push('Human opening must describe the viewer moment, not just a title')
  }
  if (reel?.editorial_brief?.primary_source && /\b(?:social|news|youtube|reddit|google)\b/i.test(reel.editorial_brief.primary_source)) {
    issues.push('Primary source must be an original document or exchange/data publisher')
  }
  if (reel?.editorial_brief?.save_frame && /\b(?:follow|comment|like|share)\b/i.test(reel.editorial_brief.save_frame)) {
    issues.push('Save frame must give a repeatable check, not an engagement CTA')
  }

  if (reel?.voice_profile && reel.voice_profile !== REQUIRED_VOICE_PROFILE) {
    issues.push(`Voice profile must be "${REQUIRED_VOICE_PROFILE}"`)
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

  // Same G-07 ledger requirement the brief gate enforces (checkClaims is the
  // exact same function). Checked unconditionally, not just for
  // uses_live_data reels — an "evergreen" reel can still cite an unverified
  // historical pattern, and the disclaimer-gated check above would miss that.
  for (const msg of checkClaims(rawCopy, claims)) {
    issues.push(msg)
  }

  // Storyboard copy is rendered at a fixed pixel width/height (see
  // render-reel-v2-preview.mjs's drawCopy) with no runtime overflow
  // handling — a word-count ceiling is the same proxy already used for
  // hook/voiceover, calibrated to what every currently-approved reel's
  // longest line actually uses (8 words), so this only catches new content
  // that would risk running off-frame.
  for (const scene of reel?.storyboard ?? []) {
    if (!scene?.copy) continue
    const lines = scene.copy.split('\n')
    if (lines.length > MAX_STORYBOARD_LINES) {
      issues.push(`Storyboard copy has more than ${MAX_STORYBOARD_LINES} lines (may run off-frame): "${scene.copy}"`)
    }
    for (const line of lines) {
      if (words(line).length > MAX_STORYBOARD_LINE_WORDS) {
        issues.push(`Storyboard copy line exceeds ${MAX_STORYBOARD_LINE_WORDS} words (may overflow the frame): "${line.trim()}"`)
      }
    }
  }

  if (reel?.uses_synthetic_persona) {
    issues.push('Synthetic human presenters are not permitted in V2')
  }

  return issues
}
