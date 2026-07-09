#!/usr/bin/env node
/**
 * fetch-eia-data.mjs — pulls EIA natural gas storage + petroleum status
 * actuals and writes them into data/event-map.json's prior_field for the
 * two EIA-sourced events. Writes to disk — does NOT serve live on the
 * request path (unlike lib/eia.ts, which fetches on every request; that
 * pattern is not repeated here).
 *
 * Usage: node scripts/fetch-eia-data.mjs
 * Env:   EIA_API_KEY
 */

import fs from 'node:fs'
import path from 'node:path'

// Load .env.local for standalone/local runs — CI sets EIA_API_KEY directly.
const envFile = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim()
  }
}

const EVENT_MAP_PATH = path.join(process.cwd(), 'data/event-map.json')
const API_KEY = process.env.EIA_API_KEY

if (!API_KEY) {
  console.error('EIA_API_KEY not set — aborting')
  process.exit(1)
}

async function fetchSeries(url, params) {
  const qs = new URLSearchParams({ api_key: API_KEY, ...params })
  const res = await fetch(`${url}?${qs}`, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`EIA API error ${res.status} for ${url}`)
  const json = await res.json()
  return json?.response?.data ?? []
}

async function fetchNaturalGasStorage() {
  // Confirmed via `curl https://api.eia.gov/v2/natural-gas/stor/wkly/facet/*` —
  // duoarea=R48 (Lower 48 states total, the headline weekly number),
  // product=EPG0 (Natural Gas), process=SWO (Underground Storage - Working Gas).
  const rows = await fetchSeries('https://api.eia.gov/v2/natural-gas/stor/wkly/data/', {
    frequency: 'weekly',
    'data[0]': 'value',
    'facets[duoarea][]': 'R48',
    'facets[product][]': 'EPG0',
    'facets[process][]': 'SWO',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    offset: '0',
    length: '2',
  })
  if (rows.length < 2) throw new Error('Not enough natural gas storage rows returned')
  const change = Number(rows[0].value) - Number(rows[1].value)
  return {
    value: Math.round(change),
    unit: 'Bcf',
    as_of_period: `week ending ${rows[0].period}`,
  }
}

async function fetchPetroleumStatus() {
  // Same query lib/eia.ts already uses in production for the homepage EIACard.
  const rows = await fetchSeries('https://api.eia.gov/v2/petroleum/stoc/wstk/data/', {
    frequency: 'weekly',
    'data[0]': 'value',
    'facets[product][]': 'EPC0',
    'facets[duoarea][]': 'NUS',
    'facets[process][]': 'SAE',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    offset: '0',
    length: '2',
  })
  if (rows.length < 2) throw new Error('Not enough petroleum stock rows returned')
  const changeKb = Number(rows[0].value) - Number(rows[1].value)
  return {
    value: Math.round((changeKb / 1000) * 10) / 10,
    unit: 'million barrels',
    as_of_period: `week ending ${rows[0].period}`,
  }
}

const data = JSON.parse(fs.readFileSync(EVENT_MAP_PATH, 'utf8'))
const now = new Date().toISOString().slice(0, 10)
let updated = 0

const natgas = await fetchNaturalGasStorage()
const natgasEvent = data.events.find(e => e.id === 'eia_natural_gas_storage')
if (natgasEvent) {
  natgasEvent.prior_field = { ...natgas, source: 'eia_api', as_of: now }
  updated++
  console.log(`eia_natural_gas_storage: ${natgas.value >= 0 ? '+' : ''}${natgas.value} ${natgas.unit} (${natgas.as_of_period})`)
}

const petroleum = await fetchPetroleumStatus()
const petroleumEvent = data.events.find(e => e.id === 'eia_petroleum_status_report')
if (petroleumEvent) {
  petroleumEvent.prior_field = { ...petroleum, source: 'eia_api', as_of: now }
  updated++
  console.log(`eia_petroleum_status_report: ${petroleum.value >= 0 ? '+' : ''}${petroleum.value} ${petroleum.unit} (${petroleum.as_of_period})`)
}

if (updated > 0) {
  fs.writeFileSync(EVENT_MAP_PATH, JSON.stringify(data, null, 2) + '\n')
  console.log(`\nUpdated ${updated} event(s) in ${EVENT_MAP_PATH}`)
} else {
  console.log('No matching events found to update.')
}
