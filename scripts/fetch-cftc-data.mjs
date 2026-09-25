#!/usr/bin/env node
/**
 * fetch-cftc-data.mjs — pulls CFTC Commitments of Traders (Legacy, Futures
 * Only) non-commercial net positioning for the 5 MCX-relevant commodities
 * that actually trade on a CFTC-jurisdiction exchange (COMEX/NYMEX, both
 * CME Group), and writes them into data/event-map.json's cftc_cot_report
 * event as recent_values, keyed by commodity.
 *
 * zinc/aluminium/lead/nickel are deliberately NOT covered here — those
 * trade primarily on the LME (a UK exchange, not CFTC-regulated), which
 * publishes its own separate Commitments of Traders Report (COTR) through
 * licensed data distributors, not a free public API. See
 * docs/decision-support-roadmap.md's Calendar section for the research.
 *
 * Free, official, no API key required (Socrata public dataset) — contract
 * codes confirmed live against https://publicreporting.cftc.gov/resource/
 * 6dca-aqww.json (Legacy - Futures Only) on 2026-09-26:
 *   GOLD - COMMODITY EXCHANGE INC.        088691
 *   SILVER - COMMODITY EXCHANGE INC.      084691
 *   COPPER- #1 - COMMODITY EXCHANGE INC.  085692
 *   WTI-PHYSICAL - NEW YORK MERCANTILE EXCHANGE  067651
 *   NAT GAS NYME - NEW YORK MERCANTILE EXCHANGE  023651
 * Filtered by cftc_contract_market_code (stable) rather than
 * market_and_exchange_names (has drifted before — natural gas's display
 * name changed from "NATURAL GAS" to "NAT GAS NYME" under the same code
 * sometime after Feb 2022).
 *
 * The "value" stored per week is non-commercial (speculative) net
 * positioning — long minus short — the standard COT metric traders watch,
 * not a week-over-week change (unlike EIA's storage/inventory numbers,
 * which are inherently a change). cftc_cot_report's prior_field stays
 * untouched: it's a single scalar field and this event now has 5 distinct
 * per-commodity series, so one "prior" value can't represent all of them
 * honestly — recent_values is the real data here.
 *
 * Usage: node scripts/fetch-cftc-data.mjs
 * Env:   CFTC_APP_TOKEN (optional — raises the unauthenticated rate limit,
 *        not required for this data volume)
 */

import fs from 'node:fs'
import path from 'node:path'

const envFile = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim()
  }
}

const EVENT_MAP_PATH = path.join(process.cwd(), 'data/event-map.json')
const APP_TOKEN = process.env.CFTC_APP_TOKEN
const HISTORY_ROWS = 24
const THROTTLE_MS = 300

// Matches scripts/fetch-eia-data.mjs's HISTORY_ROWS convention — one
// trailing value per historical occurrence compute-event-impact.mjs pairs
// a price reaction against.
const CONTRACTS = {
  gold:   '088691',
  silver: '084691',
  copper: '085692',
  crude:  '067651',
  natgas: '023651',
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchNetPositioning(contractCode) {
  const params = new URLSearchParams({
    '$where': `cftc_contract_market_code='${contractCode}'`,
    '$order': 'report_date_as_yyyy_mm_dd DESC',
    '$limit': String(HISTORY_ROWS),
    '$select': 'report_date_as_yyyy_mm_dd,noncomm_positions_long_all,noncomm_positions_short_all',
  })
  const headers = APP_TOKEN ? { 'X-App-Token': APP_TOKEN } : {}
  const res = await fetch(`https://publicreporting.cftc.gov/resource/6dca-aqww.json?${params}`, {
    headers,
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`CFTC API error ${res.status} for contract ${contractCode}`)
  const rows = await res.json()
  if (rows.length === 0) throw new Error(`No rows returned for contract ${contractCode}`)
  return rows.map(r => ({
    period: String(r.report_date_as_yyyy_mm_dd).slice(0, 10),
    value: Math.round(Number(r.noncomm_positions_long_all) - Number(r.noncomm_positions_short_all)),
  }))
}

const data = JSON.parse(fs.readFileSync(EVENT_MAP_PATH, 'utf8'))
const cotEvent = data.events.find(e => e.id === 'cftc_cot_report')

if (!cotEvent) {
  console.error('cftc_cot_report event not found in data/event-map.json — aborting')
  process.exit(1)
}

cotEvent.recent_values = cotEvent.recent_values ?? {}
let updated = 0

for (const [commodity, code] of Object.entries(CONTRACTS)) {
  try {
    const recentValues = await fetchNetPositioning(code)
    cotEvent.recent_values[commodity] = recentValues
    updated++
    console.log(`${commodity} (${code}): latest net non-commercial ${recentValues[0].value >= 0 ? '+' : ''}${recentValues[0].value} contracts (${recentValues[0].period}), ${recentValues.length} trailing values`)
  } catch (err) {
    console.warn(`${commodity} (${code}): fetch failed — ${err.message}`)
  }
  await sleep(THROTTLE_MS)
}

if (updated > 0) {
  fs.writeFileSync(EVENT_MAP_PATH, JSON.stringify(data, null, 2) + '\n')
  console.log(`\nUpdated ${updated}/${Object.keys(CONTRACTS).length} commodities in ${EVENT_MAP_PATH}`)
} else {
  console.log('No commodities updated.')
  process.exit(1)
}
