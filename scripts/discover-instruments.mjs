#!/usr/bin/env node
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const API_KEY   = process.env.KITE_API_KEY
const API_TOKEN = process.env.KITE_ACCESS_TOKEN

if (!API_KEY || !API_TOKEN) {
  console.log('No Kite credentials — skipping instrument discovery')
  process.exit(0)
}

// Kite's instrument CSV wraps some fields (observed: `name`) in a literal
// surrounding pair of double quotes — e.g. a row's name column is the 8
// characters `"GOLD"`, not `GOLD`. A naive split(',') never strips that, so
// every `i.name === 'GOLD'` comparison silently failed and frontMonth()
// returned null for all ten commodities for at least a week (2026-07-14
// through 2026-07-20) before this was caught — MCX Crude's contract expiring
// mid-week is what made the resulting stale token visibly break on-site.
const unquote = (s) => s.replace(/^"(.*)"$/, '$1')

function parseInstrumentsCsv(csv) {
  const lines  = csv.split('\n').filter(Boolean)
  const header = lines[0].split(',')
  const idx    = col => header.indexOf(col)
  return lines.slice(1).map(line => {
    const cols = line.split(',')
    return {
      token:  parseInt(unquote(cols[idx('instrument_token')] ?? '0')),
      name:   unquote(cols[idx('name')] ?? '').toUpperCase(),
      symbol: unquote(cols[idx('tradingsymbol')] ?? ''),
      expiry: unquote(cols[idx('expiry')] ?? ''),
      type:   unquote(cols[idx('instrument_type')] ?? ''),
    }
  }).filter(i => i.token > 0 && i.type === 'FUT' && i.expiry)
}

const today = new Date(); today.setHours(0, 0, 0, 0)

function frontMonth(instruments, name) {
  return instruments
    .filter(i => i.name === name && new Date(i.expiry) >= today)
    .sort((a, b) => new Date(a.expiry) - new Date(b.expiry))[0] ?? null
}

// ── MCX — commodity futures ──────────────────────────────────────────────────

const res = await fetch('https://api.kite.trade/instruments/MCX', {
  headers: { 'X-Kite-Version': '3', Authorization: `token ${API_KEY}:${API_TOKEN}` },
  signal: AbortSignal.timeout(15000),
})

if (!res.ok) {
  console.warn(`Kite instruments API returned ${res.status} — token may be expired`)
  process.exit(0)
}

const instruments = parseInstrumentsCsv(await res.text())

const gold      = frontMonth(instruments, 'GOLD')
const goldM     = frontMonth(instruments, 'GOLDM')
const silver    = frontMonth(instruments, 'SILVER')
const crude     = frontMonth(instruments, 'CRUDEOIL')
const copper    = frontMonth(instruments, 'COPPER')
const natgas    = frontMonth(instruments, 'NATURALGAS')
const zinc      = frontMonth(instruments, 'ZINC')
const lead      = frontMonth(instruments, 'LEAD')
const aluminium = frontMonth(instruments, 'ALUMINIUM')
const nickel    = frontMonth(instruments, 'NICKEL')

if (!gold || !silver || !crude || !copper || !natgas) {
  console.error('Could not find all core front-month contracts')
  process.exit(1)
}

console.log(`Gold:      ${gold.symbol} (${gold.token}) expiry ${gold.expiry}`)
console.log(`Silver:    ${silver.symbol} (${silver.token}) expiry ${silver.expiry}`)
console.log(`Crude:     ${crude.symbol} (${crude.token}) expiry ${crude.expiry}`)
console.log(`Copper:    ${copper.symbol} (${copper.token}) expiry ${copper.expiry}`)
console.log(`NatGas:    ${natgas.symbol} (${natgas.token}) expiry ${natgas.expiry}`)
if (zinc)      console.log(`Zinc:      ${zinc.symbol} (${zinc.token}) expiry ${zinc.expiry}`)
if (lead)      console.log(`Lead:      ${lead.symbol} (${lead.token}) expiry ${lead.expiry}`)
if (aluminium) console.log(`Aluminium: ${aluminium.symbol} (${aluminium.token}) expiry ${aluminium.expiry}`)
if (nickel)    console.log(`Nickel:    ${nickel.symbol} (${nickel.token}) expiry ${nickel.expiry}`)

const tokenMap = {
  _note: 'Auto-updated by morning auth. Do not edit manually.',
  gold:      { token: gold.token,                  symbol: gold.symbol,       expiry: gold.expiry      },
  goldMini:  { token: goldM?.token ?? gold.token,  symbol: goldM?.symbol ?? gold.symbol, expiry: goldM?.expiry ?? gold.expiry },
  silver:    { token: silver.token,                symbol: silver.symbol,     expiry: silver.expiry    },
  crude:     { token: crude.token,                 symbol: crude.symbol,      expiry: crude.expiry     },
  copper:    { token: copper.token,                symbol: copper.symbol,     expiry: copper.expiry    },
  natgas:    { token: natgas.token,                symbol: natgas.symbol,     expiry: natgas.expiry    },
  ...(zinc      ? { zinc:      { token: zinc.token,      symbol: zinc.symbol,      expiry: zinc.expiry      } } : {}),
  ...(lead      ? { lead:      { token: lead.token,      symbol: lead.symbol,      expiry: lead.expiry      } } : {}),
  ...(aluminium ? { aluminium: { token: aluminium.token, symbol: aluminium.symbol, expiry: aluminium.expiry } } : {}),
  ...(nickel    ? { nickel:    { token: nickel.token,    symbol: nickel.symbol,    expiry: nickel.expiry    } } : {}),
  updatedAt: new Date().toISOString(),
}

const outPath = path.join(__dirname, '../data/kite-instruments.json')
const existing = (() => {
  try { return JSON.parse(fs.readFileSync(outPath, 'utf8')) } catch { return null }
})()

// ── CDS — currency futures (USD/EUR/GBP/JPY-INR) ─────────────────────────────
//
// The CDS instrument dump mixes monthly contracts (tradingsymbol ending
// e.g. "26AUGFUT") with weekly contracts sharing the same `name` (e.g.
// "26731FUT", "26807FUT" — a day-of-month suffix, not a month code).
// frontMonth() alone would happily pick a weekly contract expiring today or
// next week instead of the monthly one this site has always used — filter
// to the monthly-symbol shape first.
const MONTHLY_SYMBOL = name => new RegExp(`^${name}\\d{2}[A-Z]{3}FUT$`)

const CURRENCIES = [
  { key: 'usdinr', name: 'USDINR' },
  { key: 'eurinr', name: 'EURINR' },
  { key: 'gbpinr', name: 'GBPINR' },
  { key: 'jpyinr', name: 'JPYINR' },
]

let cdsInstruments = null
try {
  const cdsRes = await fetch('https://api.kite.trade/instruments/CDS', {
    headers: { 'X-Kite-Version': '3', Authorization: `token ${API_KEY}:${API_TOKEN}` },
    signal: AbortSignal.timeout(15000),
  })
  if (cdsRes.ok) {
    cdsInstruments = parseInstrumentsCsv(await cdsRes.text())
  } else {
    console.warn(`  Kite CDS instruments API returned ${cdsRes.status} — carrying forward existing currency tokens`)
  }
} catch (e) {
  console.warn(`  Kite CDS instruments fetch failed: ${e.message} — carrying forward existing currency tokens`)
}

const currencies = {}
for (const { key, name } of CURRENCIES) {
  const monthly = cdsInstruments
    ? cdsInstruments.filter(i => MONTHLY_SYMBOL(name).test(i.symbol))
    : []
  const contract = frontMonth(monthly, name)
  if (contract) {
    currencies[key] = { token: contract.token, symbol: contract.symbol, expiry: contract.expiry }
    console.log(`${name}:    ${contract.symbol} (${contract.token}) expiry ${contract.expiry}`)
  } else if (existing?.currencies?.[key]) {
    currencies[key] = existing.currencies[key]
    console.warn(`  ${key}: no live CDS match — carrying forward existing token (${existing.currencies[key].symbol})`)
  } else {
    console.warn(`  ${key}: no live CDS match and no existing token to carry forward`)
  }
}
if (Object.keys(currencies).length > 0) tokenMap.currencies = currencies

fs.writeFileSync(outPath, JSON.stringify(tokenMap, null, 2), 'utf8')
console.log(`Saved to ${outPath}`)
