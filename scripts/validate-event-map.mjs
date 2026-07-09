#!/usr/bin/env node
/**
 * validate-event-map.mjs — schema check for data/event-map.json
 *
 * Usage: node scripts/validate-event-map.mjs [path/to/event-map.json]
 * Exit 0 = valid. Exit 1 = schema violation(s) printed.
 */

import fs from 'node:fs'

const path = process.argv[2] || 'data/event-map.json'

if (!fs.existsSync(path)) {
  console.error(`Not found: ${path}`)
  process.exit(1)
}

const REQUIRED_FIELDS = [
  'id', 'name', 'source_url', 'frequency', 'cadence_type',
  'next_release_utc', 'affected_contracts', 'impact_tier',
  'consensus_field', 'prior_field', 'description_educational',
]
const VALID_TIERS = new Set(['high', 'medium', 'low', 'context', 'structural'])
const VALID_CADENCE = new Set(['rule_based', 'manual', 'mcx_expiry'])
const VALID_COMMODITIES = new Set([
  'gold', 'silver', 'crude', 'copper', 'natgas', 'zinc', 'aluminium', 'lead', 'nickel',
])

let data
try {
  data = JSON.parse(fs.readFileSync(path, 'utf8'))
} catch (e) {
  console.error(`Invalid JSON: ${e.message}`)
  process.exit(1)
}

const issues = []

if (!Array.isArray(data.events)) {
  issues.push('root "events" field must be an array')
} else {
  const seenIds = new Set()
  for (const [i, e] of data.events.entries()) {
    const where = `events[${i}] (id: ${e.id ?? '?'})`

    for (const field of REQUIRED_FIELDS) {
      if (!(field in e)) issues.push(`${where}: missing field "${field}"`)
    }
    if (e.id) {
      if (seenIds.has(e.id)) issues.push(`${where}: duplicate id "${e.id}"`)
      seenIds.add(e.id)
    }
    if (e.consensus_field !== null) {
      issues.push(`${where}: consensus_field must be null (reserved, unused — never scrape consensus estimates)`)
    }
    if (e.impact_tier && !VALID_TIERS.has(e.impact_tier)) {
      issues.push(`${where}: invalid impact_tier "${e.impact_tier}"`)
    }
    if (e.cadence_type && !VALID_CADENCE.has(e.cadence_type)) {
      issues.push(`${where}: invalid cadence_type "${e.cadence_type}"`)
    }
    if (e.next_release_utc && Number.isNaN(new Date(e.next_release_utc).getTime())) {
      issues.push(`${where}: next_release_utc is not a valid ISO timestamp`)
    }
    if (Array.isArray(e.affected_contracts)) {
      for (const c of e.affected_contracts) {
        if (!VALID_COMMODITIES.has(c)) issues.push(`${where}: unknown commodity key "${c}" in affected_contracts`)
      }
    } else {
      issues.push(`${where}: affected_contracts must be an array`)
    }
  }
}

console.log('\n=== event-map.json schema validation ===')
if (issues.length === 0) {
  console.log(`PASS — ${data.events.length} events, schema OK.\n`)
  process.exit(0)
}
for (const i of issues) console.log(` - ${i}`)
console.error(`\nBLOCKED: ${issues.length} schema issue(s).\n`)
process.exit(1)
