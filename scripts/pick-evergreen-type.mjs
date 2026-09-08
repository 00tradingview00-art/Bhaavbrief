#!/usr/bin/env node
/**
 * scripts/pick-evergreen-type.mjs — decides today's evergreen reel type
 * ('learn' or 'campaign'), persists the choice to
 * data/evergreen-rotation.json, and emits it as a GitHub Actions step
 * output for generate-evergreen-reel.yml's conditional steps.
 *
 * Usage: node scripts/pick-evergreen-type.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pickNextEvergreenType } from './lib/evergreenRotation.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const STATE_FILE = join(ROOT, 'data/evergreen-rotation.json')

function readState() {
  if (!existsSync(STATE_FILE)) return { lastType: null }
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')) } catch { return { lastType: null } }
}

const state = readState()
const type = pickNextEvergreenType(state.lastType)

writeFileSync(STATE_FILE, JSON.stringify({
  _note: 'Rotation state for the shared evergreen reel slot (learn vs campaign) — see scripts/lib/evergreenRotation.mjs and .github/workflows/generate-evergreen-reel.yml.',
  lastType: type,
}, null, 2), 'utf8')

console.log(`Today's evergreen type: ${type}`)

if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `type=${type}\n`, { flag: 'a' })
}
