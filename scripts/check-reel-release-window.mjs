#!/usr/bin/env node
/**
 * scripts/check-reel-release-window.mjs
 *
 * Workflow gate for the V3 Reel release. Prints the decision and writes
 * `release=true|false` to $GITHUB_OUTPUT so the render/publish job can be
 * skipped without wasting a render — see scripts/lib/reelReleaseWindow.mjs
 * for why the cron alone cannot be trusted to hit 7:30 PM IST.
 *
 * Always exits 0: "not now" is a normal outcome, not a failure, and must not
 * fire the pipeline's failure alert.
 *
 * Usage: node scripts/check-reel-release-window.mjs
 */

import { readFileSync, existsSync, appendFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { shouldReleaseNow } from './lib/reelReleaseWindow.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const HISTORY_FILE = join(ROOT, 'data/reel-history.json')

let history = []
if (existsSync(HISTORY_FILE)) {
  try { history = JSON.parse(readFileSync(HISTORY_FILE, 'utf8')) }
  catch (e) { console.warn(`⚠️  Could not parse data/reel-history.json: ${e.message} — treating as empty`) }
}

const { release, reason } = shouldReleaseNow({ now: Date.now(), history })
console.log(`${release ? '🎬  Release' : '⏸️   Hold'}: ${reason}`)

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `release=${release}\n`)
}
