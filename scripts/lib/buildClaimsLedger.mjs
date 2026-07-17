#!/usr/bin/env node
/**
 * scripts/lib/buildClaimsLedger.mjs — regenerates data/claims.json from
 * data/event-impact-stats.json (itself produced by
 * scripts/compute-event-impact.mjs, which fetches real Kite historical
 * candles — see that script's own comments for why "manual" cadence events
 * like FOMC are deliberately left at sampleSize 0 rather than guessed).
 *
 * FIX-07 (D-07): the brief generator may ONLY cite a historical/statistical
 * claim by instantiating one of these entries — never invent one. This
 * script is how the ledger gets (re)built whenever event-impact-stats.json
 * is refreshed; run it after scripts/compute-event-impact.mjs.
 *
 * Deliberately does NOT contain claims for geopolitical-reaction patterns
 * (ceasefire announcements, rupee-lag timing, "self-limiting" price
 * thresholds) — the kind of claim previous editions invented freely. There
 * is no verified dataset backing those in this repo. Per the master doc's
 * own rule ("if a claim can't be verified, it dies"), they are excluded
 * rather than fabricated. If you have a real backtest for one of these,
 * add it as a new entry here with its actual sample_period/n/source — do
 * not add a plausible-sounding one without the data behind it.
 */

import fs from 'node:fs'
import path from 'node:path'

const STATS_PATH  = path.join(process.cwd(), 'data/event-impact-stats.json')
const MAP_PATH     = path.join(process.cwd(), 'data/event-map.json')
const CLAIMS_PATH = path.join(process.cwd(), 'data/claims.json')

const COMMODITY_LABEL = {
  gold: 'MCX Gold', silver: 'MCX Silver', crude: 'MCX Crude',
  copper: 'MCX Copper', natgas: 'MCX Natural Gas', zinc: 'MCX Zinc',
  aluminium: 'MCX Aluminium', lead: 'MCX Lead', nickel: 'MCX Nickel',
}

const stats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'))
const eventMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'))
const eventNames = Object.fromEntries(eventMap.events.map(e => [e.id, e.name ?? e.id]))

const claims = []
for (const [eventId, byCommodity] of Object.entries(stats)) {
  for (const [commodity, s] of Object.entries(byCommodity)) {
    if (!s.sampleSize || s.sampleSize < 5) continue // too thin a sample to cite as "historically"
    const label = COMMODITY_LABEL[commodity] ?? commodity
    const eventName = eventNames[eventId] ?? eventId
    claims.push({
      claim_id: `${eventId}__${commodity}`,
      statement_template: `${eventName} releases have historically moved ${label} by an average of {avgAbsMovePct}% (max {maxAbsMovePct}%) in the following session, based on the last {n} occurrences.`,
      values: { avgAbsMovePct: s.avgAbsMovePct, maxAbsMovePct: s.maxAbsMovePct, n: s.sampleSize },
      sample_period: `trailing ${s.sampleSize} occurrences as of ${s.computedAt.slice(0, 10)}`,
      n: s.sampleSize,
      source: 'Computed from MCX Kite historical daily candles — reaction-day close vs. prior trading day close, absolute % move (scripts/compute-event-impact.mjs)',
      last_verified: s.computedAt,
    })
  }
}

fs.writeFileSync(CLAIMS_PATH, JSON.stringify({ claims, generatedAt: new Date().toISOString() }, null, 2) + '\n')
console.log(`Wrote ${claims.length} verified claims to ${CLAIMS_PATH}`)
