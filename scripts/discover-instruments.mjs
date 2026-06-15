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

const res = await fetch('https://api.kite.trade/instruments/MCX', {
  headers: { 'X-Kite-Version': '3', Authorization: `token ${API_KEY}:${API_TOKEN}` },
  signal: AbortSignal.timeout(15000),
})

if (!res.ok) {
  console.warn(`Kite instruments API returned ${res.status} — token may be expired`)
  process.exit(0)
}

const csv   = await res.text()
const lines = csv.split('\n').filter(Boolean)
const header= lines[0].split(',')
const idx   = col => header.indexOf(col)
const today = new Date(); today.setHours(0, 0, 0, 0)

const instruments = lines.slice(1).map(line => {
  const cols = line.split(',')
  return {
    token:  parseInt(cols[idx('instrument_token')] ?? '0'),
    name:   (cols[idx('name')] ?? '').toUpperCase(),
    symbol: cols[idx('tradingsymbol')] ?? '',
    expiry: cols[idx('expiry')] ?? '',
    type:   cols[idx('instrument_type')] ?? '',
  }
}).filter(i => i.token > 0 && i.type === 'FUT' && i.expiry)

function frontMonth(name) {
  return instruments
    .filter(i => i.name === name && new Date(i.expiry) >= today)
    .sort((a, b) => new Date(a.expiry) - new Date(b.expiry))[0] ?? null
}

const gold      = frontMonth('GOLD')
const goldM     = frontMonth('GOLDM')
const silver    = frontMonth('SILVER')
const crude     = frontMonth('CRUDEOIL')
const copper    = frontMonth('COPPER')
const natgas    = frontMonth('NATURALGAS')
const zinc      = frontMonth('ZINC')
const lead      = frontMonth('LEAD')
const aluminium = frontMonth('ALUMINIUM')
const nickel    = frontMonth('NICKEL')

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
fs.writeFileSync(outPath, JSON.stringify(tokenMap, null, 2), 'utf8')
console.log(`Saved to ${outPath}`)
