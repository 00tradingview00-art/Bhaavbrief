#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { validateReelV2 } from './lib/reelV2Compliance.mjs'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/validate-reel-v2.mjs <reel-manifest.json>')
  process.exit(2)
}
if (!existsSync(file)) {
  console.error(`Manifest not found: ${file}`)
  process.exit(2)
}

let reel
try {
  reel = JSON.parse(readFileSync(file, 'utf8'))
} catch (error) {
  console.error(`Invalid JSON: ${error.message}`)
  process.exit(2)
}

let claims = []
try {
  claims = JSON.parse(readFileSync('data/claims.json', 'utf8')).claims ?? []
} catch {
  // No ledger file yet — every historical-% claim below correctly fails
  // closed (nothing to match against), which is the safe default.
}
const issues = validateReelV2(reel, claims)
if (issues.length) {
  console.error(`BLOCKED — ${issues.length} issue(s):`)
  for (const issue of issues) console.error(`- ${issue}`)
  process.exit(1)
}

console.log(`PASS — ${reel.id} is review-ready.`)
