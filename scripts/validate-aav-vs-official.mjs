#!/usr/bin/env node
/**
 * validate-aav-vs-official.mjs — compare the AAV our site shows against the
 * exchange's official AAV export, for the commodities we serve a chain for.
 *
 * Usage:
 *   node scripts/validate-aav-vs-official.mjs <official-AAV-file.xls> [--base https://bhaavbrief.in]
 *
 * It GETs /api/options?instrument=… (the same numbers visitors see) and prints
 * a diff table. It writes nothing and needs no market-data credentials.
 *
 * Alignment caveat: the API's AAV is built from daily candles up to the previous
 * calendar day, so the comparison is only meaningful when the newest candle is
 * the same trading day as the official file's date — e.g. run on a weekend after
 * a Friday close, or on any day when the file is for the previous session.
 * The official file is a local reference only: never commit it (this repo is
 * public and the exchange's terms forbid republishing its data).
 *
 * Exit codes: 0 = compared (differences are reported, not treated as failure),
 *             1 = bad input or the API could not be reached.
 */

import fs from 'node:fs'
import { parseOfficialAav, diffAav, maxAbsDiff, WINDOWS } from './lib/aavCompare.mjs'

// Our /api/options instrument key -> the official file's commodity name.
const INSTRUMENTS = {
  GOLD: 'GOLD',
  SILVER: 'SILVER',
  CRUDEOIL: 'CRUDEOIL',
  COPPER: 'COPPER',
  NATURALGAS: 'NATURALGAS',
}

const args = process.argv.slice(2)
const baseIdx = args.indexOf('--base')
const base = (baseIdx >= 0 ? args[baseIdx + 1] : 'https://bhaavbrief.in').replace(/\/$/, '')
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--base')

if (!file) {
  console.error('usage: node scripts/validate-aav-vs-official.mjs <official-AAV-file.xls> [--base <url>]')
  process.exit(1)
}

let official
try {
  official = parseOfficialAav(fs.readFileSync(file, 'utf8'))
} catch (e) {
  console.error(`Could not read official file: ${e.message}`)
  process.exit(1)
}

console.log(`Official file date: ${official.date}   Site: ${base}`)
console.log('Values are "ours / official"; the last column is the largest absolute gap in vol points.\n')

const pad = (s, n) => String(s).padEnd(n)
console.log(pad('', 12) + WINDOWS.map(w => pad(w, 16)).join('') + 'max gap')

let failed = 0
for (const [key, commodity] of Object.entries(INSTRUMENTS)) {
  const off = official.byCommodity[commodity]
  if (!off) {
    console.log(`${pad(key, 12)}(no ${commodity} row in the official file)`)
    continue
  }
  let ours
  try {
    const res = await fetch(`${base}/api/options?instrument=${key}`, { signal: AbortSignal.timeout(60_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    ours = (await res.json()).aav
  } catch (e) {
    console.log(`${pad(key, 12)}API error: ${e.message}`)
    failed++
    continue
  }
  const d = diffAav(ours, off)
  const cells = WINDOWS.map(w => pad(`${d[w].ours ?? '–'} / ${d[w].official}`, 16)).join('')
  const gap = maxAbsDiff(d)
  console.log(pad(key, 12) + cells + (gap == null ? '–' : gap.toFixed(2)))
}

process.exit(failed ? 1 : 0)
