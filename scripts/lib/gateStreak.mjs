/**
 * scripts/lib/gateStreak.mjs — G-12 human-approval-gate streak tracking.
 * "Until 30 consecutive editions pass G-01..G-11 with zero overrides" —
 * a pure, testable function computing the next streak state.
 */

import fs from 'node:fs'
import path from 'node:path'

const STREAK_PATH = path.join(process.cwd(), 'data/gate-streak.json')
export const AUTO_PUBLISH_THRESHOLD = 30

export function readStreak() {
  try {
    const raw = JSON.parse(fs.readFileSync(STREAK_PATH, 'utf8'))
    return { consecutiveCleanPasses: raw.consecutiveCleanPasses ?? 0, lastEdition: raw.lastEdition ?? null }
  } catch {
    return { consecutiveCleanPasses: 0, lastEdition: null }
  }
}

/**
 * @param {boolean} wasClean - true if the gate ran with zero issues at all
 *   (not just zero blockers — a WARN-level issue also resets the streak,
 *   since "zero overrides" means the gate had nothing to say, not merely
 *   nothing bad enough to block)
 * @param {number} edition
 * @returns {{consecutiveCleanPasses: number, lastEdition: number, autoPublishEligible: boolean}}
 */
export function computeNextStreak(wasClean, edition) {
  const current = readStreak()
  const consecutiveCleanPasses = wasClean ? current.consecutiveCleanPasses + 1 : 0
  return {
    consecutiveCleanPasses,
    lastEdition: edition,
    autoPublishEligible: consecutiveCleanPasses >= AUTO_PUBLISH_THRESHOLD,
  }
}

export function writeStreak(state) {
  fs.mkdirSync(path.dirname(STREAK_PATH), { recursive: true })
  fs.writeFileSync(STREAK_PATH, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2) + '\n')
}
