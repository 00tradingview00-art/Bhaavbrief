#!/usr/bin/env node
/**
 * compute-event-impact.mjs — historical impact stats for event-map.json events
 *
 * For each "rule_based" event (deterministic weekday+time cadence — EIA storage,
 * API inventories, Baker Hughes rig count, CFTC COT), computes the trailing
 * ~24-occurrence average/max absolute % move of each affected MCX contract in
 * the session following the event, using Kite historical day-candles.
 *
 * "Manual" cadence events (FOMC, OPEC+, CPI, NFP, PMI, WASDE, MPOB, RBI MPC) are
 * NOT computed here — there is no API that enumerates their past release dates,
 * and fabricating plausible-but-unverified historical dates would be worse than
 * no data. They stay at sampleSize: 0 until a real historical date list is
 * seeded by hand (documented scope limit, not an oversight).
 *
 * Fetches each unique commodity's historical series ONCE (not once per event)
 * and reuses it across every rule_based event that references that commodity —
 * keeps total Kite calls to one per commodity (~9), not hundreds.
 *
 * Usage: node scripts/compute-event-impact.mjs
 * Env:   KITE_API_KEY, KITE_ACCESS_TOKEN
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

const KITE_API_KEY = process.env.KITE_API_KEY
const KITE_ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN
if (!KITE_API_KEY || !KITE_ACCESS_TOKEN) {
  console.error('KITE_API_KEY / KITE_ACCESS_TOKEN not set — aborting')
  process.exit(1)
}

const EVENT_MAP_PATH = path.join(process.cwd(), 'data/event-map.json')
const INSTRUMENTS_PATH = path.join(process.cwd(), 'data/kite-instruments.json')
const STATS_PATH = path.join(process.cwd(), 'data/event-impact-stats.json')

const OCCURRENCES_WANTED = 24
const LOOKBACK_DAYS = 200 // wide enough to contain 24 weekly occurrences plus buffer
const THROTTLE_MS = 250

// Weekday+UTC-time rule per rule_based event id — mirrors refresh-event-calendar.mjs.
const RULES = {
  eia_natural_gas_storage:     { dow: 4, hourUtc: 14, minUtc: 30 }, // Thu
  eia_petroleum_status_report: { dow: 3, hourUtc: 14, minUtc: 30 }, // Wed
  api_crude_inventories:       { dow: 2, hourUtc: 20, minUtc: 30 }, // Tue
  baker_hughes_rig_count:      { dow: 5, hourUtc: 17, minUtc: 0 },  // Fri
  cftc_cot_report:             { dow: 5, hourUtc: 19, minUtc: 30 }, // Fri
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function pastOccurrences(rule, count, fromUtc) {
  const dates = []
  const d = new Date(fromUtc)
  d.setUTCHours(rule.hourUtc, rule.minUtc, 0, 0)
  // Step back to the most recent occurrence strictly before "now"
  let diff = (d.getUTCDay() - rule.dow + 7) % 7
  if (diff === 0) diff = 7
  d.setUTCDate(d.getUTCDate() - diff)
  for (let i = 0; i < count; i++) {
    dates.push(new Date(d))
    d.setUTCDate(d.getUTCDate() - 7)
  }
  return dates
}

async function fetchHistorical(token, from, to) {
  const params = new URLSearchParams({ from, to, continuous: '1', oi: '0' })
  const url = `https://api.kite.trade/instruments/historical/${token}/day?${params}`
  const res = await fetch(url, {
    headers: {
      'X-Kite-Version': '3',
      Authorization: `token ${KITE_API_KEY}:${KITE_ACCESS_TOKEN}`,
    },
    signal: AbortSignal.timeout(10000),
  })
  if (res.status === 403) throw new Error('Kite access token expired — run kite-morning-auth.js')
  if (!res.ok) throw new Error(`Kite historical ${res.status} for token ${token}`)
  const data = await res.json()
  if (data.status !== 'success') throw new Error(data.message ?? 'Historical fetch failed')
  return (data.data.candles ?? []).map(([ts, open, high, low, close, volume]) => ({
    date: ts.slice(0, 10),
    close,
  }))
}

// Given a full candle series and an event date, find the reaction-day close
// (first trading day on/after the event date) and the prior trading day's
// close, returning the absolute % move between them.
function reactionMove(candles, eventDate) {
  const eventStr = eventDate.toISOString().slice(0, 10)
  const idx = candles.findIndex(c => c.date >= eventStr)
  if (idx <= 0 || idx >= candles.length) return null
  const prior = candles[idx - 1]
  const reaction = candles[idx]
  if (!prior.close || !reaction.close) return null
  return Math.abs((reaction.close - prior.close) / prior.close) * 100
}

const eventMap = JSON.parse(fs.readFileSync(EVENT_MAP_PATH, 'utf8'))
const instruments = JSON.parse(fs.readFileSync(INSTRUMENTS_PATH, 'utf8'))

const ruleBasedEvents = eventMap.events.filter(e => e.cadence_type === 'rule_based' && RULES[e.id])

const neededCommodities = new Set()
for (const e of ruleBasedEvents) for (const c of e.affected_contracts) neededCommodities.add(c)

const now = new Date()
const to = now.toISOString().slice(0, 10)
const fromDate = new Date(now)
fromDate.setUTCDate(fromDate.getUTCDate() - LOOKBACK_DAYS)
const from = fromDate.toISOString().slice(0, 10)

console.log(`Fetching historical series for ${neededCommodities.size} commodities (${from} to ${to})...`)

const seriesByCommodity = {}
for (const commodity of neededCommodities) {
  const token = instruments[commodity]?.token
  if (!token) {
    console.warn(`No Kite token for commodity "${commodity}" — skipping`)
    continue
  }
  try {
    seriesByCommodity[commodity] = await fetchHistorical(token, from, to)
    console.log(`  ${commodity}: ${seriesByCommodity[commodity].length} candles`)
  } catch (err) {
    console.warn(`  ${commodity}: fetch failed — ${err.message}`)
  }
  await sleep(THROTTLE_MS)
}

const stats = {}
for (const event of ruleBasedEvents) {
  const rule = RULES[event.id]
  const occurrences = pastOccurrences(rule, OCCURRENCES_WANTED, now)
  stats[event.id] = {}

  for (const commodity of event.affected_contracts) {
    const series = seriesByCommodity[commodity]
    if (!series) continue

    const moves = occurrences
      .map(d => reactionMove(series, d))
      .filter((m) => m != null)

    if (moves.length === 0) continue

    stats[event.id][commodity] = {
      avgAbsMovePct: Math.round((moves.reduce((a, b) => a + b, 0) / moves.length) * 100) / 100,
      maxAbsMovePct: Math.round(Math.max(...moves) * 100) / 100,
      sampleSize: moves.length,
      computedAt: now.toISOString(),
    }
  }
}

fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2) + '\n')
console.log(`\nWrote ${STATS_PATH}`)
for (const [eventId, byCommodity] of Object.entries(stats)) {
  for (const [commodity, s] of Object.entries(byCommodity)) {
    console.log(`  ${eventId} / ${commodity}: avg ±${s.avgAbsMovePct}%, max ±${s.maxAbsMovePct}%, n=${s.sampleSize}`)
  }
}
