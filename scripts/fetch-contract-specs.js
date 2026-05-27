#!/usr/bin/env node
/**
 * Fetches MCX contract specs from the Kite Connect instruments CSV.
 * Parses lot_size, tick_size, expiry, and tradingsymbol for each commodity.
 * Saves to data/contract-specs.json for the Learn section.
 *
 * Run: node scripts/fetch-contract-specs.js
 * Runs after kite-morning-auth updates data/kite-instruments.json
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')
const OUT_FILE  = path.join(ROOT, 'data/contract-specs.json')

// Exact Kite `name` field + official MCX contract specs.
// Kite's lot_size in the instruments CSV is always 1 for MCX futures (it's their
// minimum trading lot, not the actual contract size). We hardcode the real specs
// from the MCX exchange — Kite is used only for tick_size and current expiry.
//
// priceUnitsPerLot: the number of quoted-unit increments in one lot.
//   Gold: 1 kg = 1000g → 100 × 10g units → tickValuePerLot = tick × 100
//   Others: price is per the same unit as contract size → tickValuePerLot = tick × contractSize
const COMMODITY_MAP = {
  gold:   {
    name: 'GOLD', quotedUnit: '₹/10g',
    contractSize: 1000, contractSizeStr: '1 kg',
    priceQuote: 'per 10 grams', priceUnitsPerLot: 100,
  },
  silver: {
    name: 'SILVER', quotedUnit: '₹/kg',
    contractSize: 30, contractSizeStr: '30 kg',
    priceQuote: 'per kg', priceUnitsPerLot: 30,
  },
  crude: {
    name: 'CRUDEOIL', quotedUnit: '₹/bbl',
    contractSize: 100, contractSizeStr: '100 barrels',
    priceQuote: 'per barrel', priceUnitsPerLot: 100,
  },
  copper: {
    name: 'COPPER', quotedUnit: '₹/kg',
    contractSize: 2500, contractSizeStr: '2.5 MT (2500 kg)',
    priceQuote: 'per kg', priceUnitsPerLot: 2500,
  },
  natgas: {
    name: 'NATURALGAS', quotedUnit: '₹/mmBtu',
    contractSize: 1250, contractSizeStr: '1250 mmBtu',
    priceQuote: 'per mmBtu', priceUnitsPerLot: 1250,
  },
}

async function fetchInstrumentsCSV(apiKey, accessToken) {
  const res = await fetch('https://api.kite.trade/instruments/MCX', {
    headers: {
      'X-Kite-Version': '3',
      Authorization: `token ${apiKey}:${accessToken}`,
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`Kite instruments ${res.status}`)
  return res.text()
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    // Handle quoted fields
    const fields = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = '' }
      else cur += ch
    }
    fields.push(cur.trim())
    return Object.fromEntries(headers.map((h, i) => [h.trim(), fields[i] ?? '']))
  })
}

function findNearestExpiry(rows, exactName) {
  const now = Date.now()
  // Match exact `name` column — avoids picking mini/guinea variants
  const matching = rows.filter(r =>
    r.exchange === 'MCX' &&
    r.name?.toUpperCase() === exactName.toUpperCase() &&
    r.instrument_type === 'FUT' &&
    r.expiry
  )
  matching.sort((a, b) => new Date(a.expiry) - new Date(b.expiry))
  return matching.find(r => new Date(r.expiry).getTime() > now) ?? matching[0] ?? null
}

async function main() {
  const KITE_API_KEY      = process.env.KITE_API_KEY
  const KITE_ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN

  if (!KITE_API_KEY || !KITE_ACCESS_TOKEN) {
    console.error('KITE_API_KEY and KITE_ACCESS_TOKEN required')
    process.exit(1)
  }

  console.log('Fetching Kite MCX instruments...')
  let rows
  try {
    const csv = await fetchInstrumentsCSV(KITE_API_KEY, KITE_ACCESS_TOKEN)
    rows = parseCSV(csv)
    console.log(`Parsed ${rows.length} MCX instruments`)
  } catch (e) {
    console.error('Failed to fetch instruments:', e.message)
    process.exit(1)
  }

  const specs = {}
  for (const [key, meta] of Object.entries(COMMODITY_MAP)) {
    const row = findNearestExpiry(rows, meta.name)
    if (!row) {
      console.warn(`  No match for ${key} (${meta.name})`)
      continue
    }
    const tickSize = parseFloat(row.tick_size) || null
    specs[key] = {
      name:             row.name,
      tradingsymbol:    row.tradingsymbol,
      expiry:           row.expiry,
      contractSize:     meta.contractSize,
      contractSizeStr:  meta.contractSizeStr,
      priceQuote:       meta.priceQuote,
      tickSize,
      tickValuePerLot:  tickSize != null ? tickSize * meta.priceUnitsPerLot : null,
      quotedUnit:       meta.quotedUnit,
      exchange:         'MCX',
    }
    console.log(`  ${key}: ${row.tradingsymbol} contractSize=${meta.contractSizeStr} tick=${row.tick_size} expiry=${row.expiry}`)
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(specs, null, 2), 'utf8')
  console.log(`\nSaved contract specs to data/contract-specs.json`)
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
