#!/usr/bin/env node
/**
 * CI gate: flags analyst-kb.json commodity sections whose _meta.lastVerified
 * is older than MAX_AGE_DAYS. Exit 1 if any are stale.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KB_FILE = path.join(ROOT, 'data/analyst-kb.json')
const MAX_AGE_DAYS = 90
const REQUIRED_COMMODITIES = ['crude', 'gold', 'silver', 'copper', 'natgas']

const kb = JSON.parse(fs.readFileSync(KB_FILE, 'utf8'))
const now = new Date()
let failed = false

for (const commodity of REQUIRED_COMMODITIES) {
  const section = kb[commodity]
  if (!section) {
    console.error(`FAIL: analyst-kb.json missing section "${commodity}"`)
    failed = true
    continue
  }
  const meta = section._meta
  if (!meta?.lastVerified) {
    console.error(`FAIL: ${commodity}._meta.lastVerified is missing`)
    failed = true
    continue
  }
  // lastVerified is "YYYY-MM" — parse as first of that month
  const verified = new Date(`${meta.lastVerified}-01`)
  const ageDays = (now - verified) / (1000 * 60 * 60 * 24)
  if (ageDays > MAX_AGE_DAYS) {
    console.error(`FAIL: analyst-kb.json ${commodity} last verified ${meta.lastVerified} (${Math.floor(ageDays)} days ago — exceeds ${MAX_AGE_DAYS}-day limit)`)
    failed = true
  } else {
    console.log(`OK: ${commodity} verified ${meta.lastVerified} (${Math.floor(ageDays)} days ago)`)
  }
}

if (failed) process.exit(1)
console.log('check-kb-freshness: all sections current')
