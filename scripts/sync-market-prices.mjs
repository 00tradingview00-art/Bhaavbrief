/**
 * sync-market-prices.mjs
 *
 * Updates contractValue and typicalMargin in data/market-structure.json
 * using live prices from data/market-snapshot.json.
 * Also syncs expiry date from data/contract-specs.json for the 5 main commodities.
 *
 * Runs every 15 min inside the intelligence-engine workflow — no Claude needed.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')

const SNAPSHOT_FILE  = path.join(ROOT, 'data/market-snapshot.json')
const SPECS_FILE     = path.join(ROOT, 'data/contract-specs.json')
const STRUCTURE_FILE = path.join(ROOT, 'data/market-structure.json')

// market-structure key → { snapshot instrument key, price unit multiplier, quoted unit }
// lotMultiplier: how many price-quote units make one lot
//   Gold: 1000g lot, quoted per 10g → 100 units/lot
//   Silver: 30kg lot, quoted per kg → 30 units/lot
//   Crude: 100bbl lot, quoted per bbl → 100 units/lot
//   Copper: 2500kg lot, quoted per kg → 2500 units/lot
//   NatGas: 1250mmBtu lot, quoted per mmBtu → 1250 units/lot
//   Zinc/Alu/Lead: 5000kg lot, quoted per kg → 5000 units/lot
//   Nickel: 1500kg lot, quoted per kg → 1500 units/lot
const COMMODITY_MAP = {
  gold:      { snapshotKey: 'MCX_GOLD',      contractKey: 'gold',   lotMultiplier: 100,  unit: '10g'    },
  silver:    { snapshotKey: 'MCX_SILVER',     contractKey: 'silver', lotMultiplier: 30,   unit: 'kg'     },
  crude:     { snapshotKey: 'MCX_CRUDE',      contractKey: 'crude',  lotMultiplier: 100,  unit: 'bbl'    },
  copper:    { snapshotKey: 'MCX_COPPER',     contractKey: 'copper', lotMultiplier: 2500, unit: 'kg'     },
  natgas:    { snapshotKey: 'MCX_NATGAS',     contractKey: 'natgas', lotMultiplier: 1250, unit: 'mmBtu'  },
  zinc:      { snapshotKey: 'MCX_ZINC',       contractKey: null,     lotMultiplier: 5000, unit: 'kg'     },
  aluminium: { snapshotKey: 'MCX_ALUMINIUM',  contractKey: null,     lotMultiplier: 5000, unit: 'kg'     },
  lead:      { snapshotKey: 'MCX_LEAD',       contractKey: null,     lotMultiplier: 5000, unit: 'kg'     },
  nickel:    { snapshotKey: 'MCX_NICKEL',     contractKey: null,     lotMultiplier: 1500, unit: 'kg'     },
}

// Format a rupee amount into human-readable string
function fmtINR(amount) {
  if (amount >= 1_00_00_000) return `~₹${(amount / 1_00_00_000).toFixed(1)} crore`
  if (amount >= 1_00_000)    return `~₹${(amount / 1_00_000).toFixed(1)} lakh`
  if (amount >= 1000)        return `~₹${Math.round(amount / 1000)}K`
  return `~₹${Math.round(amount)}`
}

// Format a margin range (low–high values in rupees)
function fmtMargin(low, high) {
  if (high >= 1_00_00_000) {
    return `₹${(low / 1_00_00_000).toFixed(1)}–${(high / 1_00_00_000).toFixed(1)} crore`
  }
  if (high >= 1_00_000) {
    return `₹${(low / 1_00_000).toFixed(1)}–${(high / 1_00_000).toFixed(1)} lakh`
  }
  return `₹${Math.round(low / 1000)}–${Math.round(high / 1000)}K`
}

let snapshot, specs, structure
try { snapshot  = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'))  } catch { console.log('No snapshot — skipping'); process.exit(0) }
try { specs     = JSON.parse(fs.readFileSync(SPECS_FILE, 'utf8'))     } catch { specs = {} }
try { structure = JSON.parse(fs.readFileSync(STRUCTURE_FILE, 'utf8')) } catch { console.log('No market-structure.json'); process.exit(0) }

let updated = 0

for (const [key, map] of Object.entries(COMMODITY_MAP)) {
  const commodity = structure[key]
  if (!commodity) continue

  const inst = snapshot.instruments?.[map.snapshotKey]
  if (!inst?.price) continue

  const price         = inst.price
  const contractValue = price * map.lotMultiplier
  const marginLow     = contractValue * 0.05
  const marginHigh    = contractValue * 0.07

  const newContractValue = `${fmtINR(contractValue)} at ₹${price.toLocaleString('en-IN')}/${map.unit}`
  const newMargin        = fmtMargin(marginLow, marginHigh)

  // Expiry note from contract-specs (5 main commodities only)
  let newExpiryNote = commodity.expiryNote
  if (map.contractKey && specs[map.contractKey]?.expiry) {
    const expDate = new Date(specs[map.contractKey].expiry)
    const expStr  = expDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    newExpiryNote = `Front-month contract expires ${expStr}`
  }

  const changed =
    commodity.contractValue !== newContractValue ||
    commodity.typicalMargin !== newMargin ||
    (newExpiryNote && commodity.expiryNote !== newExpiryNote)

  if (changed) {
    structure[key] = {
      ...commodity,
      contractValue: newContractValue,
      typicalMargin: newMargin,
      ...(newExpiryNote ? { expiryNote: newExpiryNote } : {}),
    }
    updated++
    console.log(`  ${key}: ${newContractValue} | margin ${newMargin}`)
  }
}

if (updated > 0) {
  fs.writeFileSync(STRUCTURE_FILE, JSON.stringify(structure, null, 2), 'utf8')
  console.log(`Synced ${updated} commodity/ies in market-structure.json`)
} else {
  console.log('Market prices in sync — no update needed')
}
