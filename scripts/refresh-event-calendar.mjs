#!/usr/bin/env node
/**
 * refresh-event-calendar.mjs — pure date-arithmetic roll-forward for
 * cadence_type: "rule_based" events in data/event-map.json.
 *
 * These events fire on a fixed weekday + UTC time every week (EIA storage,
 * API inventories, Baker Hughes rig count, CFTC COT). No external calls —
 * just advances next_release_utc past "now" using each event's rule, so
 * the calendar never shows a past-due date for these entries.
 *
 * cadence_type: "mcx_expiry" events take their date from
 * data/kite-instruments.json (the live front-month contracts).
 *
 * Irregular-cadence events (FOMC, OPEC+, CPI, NFP, PMI, WASDE, MPOB, RBI MPC)
 * are NOT touched here — they keep a manually-maintained date, refreshed by hand.
 *
 * Usage: node scripts/refresh-event-calendar.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { RULES, applyComputedDates } from './lib/eventRules.mjs'

const EVENT_MAP_PATH = path.join(process.cwd(), 'data/event-map.json')

const data = JSON.parse(fs.readFileSync(EVENT_MAP_PATH, 'utf8'))
let instruments = null
try {
  instruments = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/kite-instruments.json'), 'utf8'))
} catch {
  console.warn('data/kite-instruments.json unreadable — MCX expiry dates not refreshed')
}

// Same rules lib/eventMap.ts applies at read time (scripts/lib/eventRules.mjs);
// persisting them keeps the file itself honest for any other reader.
const refreshed = applyComputedDates(data.events, new Date(), instruments)
let updated = 0
refreshed.forEach((event, i) => {
  const before = data.events[i].next_release_utc
  if (event.next_release_utc !== before) {
    updated++
    console.log(`${event.id}: ${before} → ${event.next_release_utc}`)
  }
})
for (const event of data.events) {
  if (event.cadence_type === 'rule_based' && !RULES[event.id]) {
    console.warn(`No roll-forward rule for rule_based event "${event.id}" — skipping`)
  }
}
data.events = refreshed

if (updated > 0) {
  fs.writeFileSync(EVENT_MAP_PATH, JSON.stringify(data, null, 2) + '\n')
  console.log(`\nUpdated ${updated} event(s).`)
} else {
  console.log('All rule_based / MCX expiry events already current — nothing to update.')
}
