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
 * Irregular-cadence events (FOMC, OPEC+, CPI, NFP, PMI, WASDE, MPOB, RBI MPC)
 * are NOT touched here — they keep a manually-maintained date, refreshed by hand.
 *
 * Usage: node scripts/refresh-event-calendar.mjs
 */

import fs from 'node:fs'
import path from 'node:path'

const EVENT_MAP_PATH = path.join(process.cwd(), 'data/event-map.json')

// Weekday+UTC-time rule per rule_based event id. dow: 0=Sun..6=Sat.
const RULES = {
  eia_natural_gas_storage:  { dow: 4, hourUtc: 14, minUtc: 30 }, // Thu
  eia_petroleum_status_report: { dow: 3, hourUtc: 14, minUtc: 30 }, // Wed
  api_crude_inventories:    { dow: 2, hourUtc: 20, minUtc: 30 }, // Tue
  baker_hughes_rig_count:   { dow: 5, hourUtc: 17, minUtc: 0 },  // Fri
  cftc_cot_report:          { dow: 5, hourUtc: 19, minUtc: 30 }, // Fri
}

function nextOccurrence(fromUtc, dow, hourUtc, minUtc) {
  const d = new Date(fromUtc)
  d.setUTCHours(hourUtc, minUtc, 0, 0)
  let diff = (dow - d.getUTCDay() + 7) % 7
  if (diff === 0 && d.getTime() <= fromUtc.getTime()) diff = 7
  d.setUTCDate(d.getUTCDate() + diff)
  return d
}

const data = JSON.parse(fs.readFileSync(EVENT_MAP_PATH, 'utf8'))
const now = new Date()
let updated = 0

for (const event of data.events) {
  if (event.cadence_type !== 'rule_based') continue
  const rule = RULES[event.id]
  if (!rule) {
    console.warn(`No roll-forward rule for rule_based event "${event.id}" — skipping`)
    continue
  }
  const current = new Date(event.next_release_utc)
  if (current.getTime() > now.getTime()) continue // still upcoming, nothing to do

  const next = nextOccurrence(now, rule.dow, rule.hourUtc, rule.minUtc)
  event.next_release_utc = next.toISOString()
  updated++
  console.log(`${event.id}: ${current.toISOString()} → ${event.next_release_utc}`)
}

if (updated > 0) {
  fs.writeFileSync(EVENT_MAP_PATH, JSON.stringify(data, null, 2) + '\n')
  console.log(`\nUpdated ${updated} event(s).`)
} else {
  console.log('All rule_based events already upcoming — nothing to update.')
}
