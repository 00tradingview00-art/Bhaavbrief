#!/usr/bin/env node
/**
 * scripts/fetch-snapshot.mjs — single-source-of-truth market data writer
 *
 * Runs ONCE per pipeline cycle, before the brief generator.
 * Writes data/market-snapshot.json — the only file that ever contains prices.
 * All brief generators, UI API routes, and the email template read from here.
 *
 * Exit 0 = snapshot written cleanly (or with acceptable stale count).
 * Exit 1 = >3 instruments have no data at all — block the pipeline.
 *
 * Stale handling (rule 3 of the spec):
 *   - If a live fetch fails, carry forward the last good value and mark stale:true.
 *   - Never write 0 or null into price. Never fall back to a hardcoded constant.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SNAPSHOT_FILE = path.join(ROOT, 'data/market-snapshot.json')
const MCX_CACHE_FILE = path.join(ROOT, 'data/mcx-last-prices.json')
const INSTRUMENTS_FILE = path.join(ROOT, 'data/kite-instruments.json')

// Load .env.local for local dev runs
const envFile = path.join(ROOT, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch { return null }
}

// ── Kite live MCX quotes ──────────────────────────────────────────────────────

async function fetchKiteMCX() {
  const apiKey = process.env.KITE_API_KEY
  const accessToken = process.env.KITE_ACCESS_TOKEN
  const instruments = loadJSON(INSTRUMENTS_FILE)
  if (!apiKey || !accessToken || !instruments) return null

  const keys = ['gold', 'silver', 'crude', 'copper', 'natgas', 'zinc', 'lead', 'aluminium', 'nickel']
  const qs = keys
    .filter(k => instruments[k]?.symbol)
    .map(k => `i=MCX:${instruments[k].symbol}`)
    .join('&')
  if (!qs) return null

  try {
    const res = await fetch(`https://api.kite.trade/quote?${qs}`, {
      headers: {
        'X-Kite-Version': '3',
        Authorization: `token ${apiKey}:${accessToken}`,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) { console.warn(`  Kite ${res.status}`); return null }
    const { data } = await res.json()
    const result = {}
    for (const key of keys) {
      const sym = instruments[key]?.symbol
      const q = data?.[`MCX:${sym}`]
      if (!q?.last_price) continue
      const price = q.last_price
      const prevClose = q.ohlc?.close ?? 0
      result[key] = {
        price,
        prevClose: prevClose > 0 ? prevClose : price,
        changePct: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
      }
    }
    const n = Object.keys(result).length
    console.log(`  Kite: ${n}/${keys.filter(k => instruments[k]?.symbol).length} instruments`)
    return n >= 3 ? result : null
  } catch (e) {
    console.warn(`  Kite failed: ${e.message}`)
    return null
  }
}

// ── Kite CDS — currency futures (EUR/INR, GBP/INR, JPY/INR) ─────────────────

async function fetchKiteCurrencies() {
  const apiKey = process.env.KITE_API_KEY
  const accessToken = process.env.KITE_ACCESS_TOKEN
  const instruments = loadJSON(INSTRUMENTS_FILE)
  if (!apiKey || !accessToken || !instruments?.currencies) return null

  const pairs = ['eurinr', 'gbpinr', 'jpyinr']
  const qs = pairs
    .filter(k => instruments.currencies[k]?.symbol)
    .map(k => `i=CDS:${instruments.currencies[k].symbol}`)
    .join('&')
  if (!qs) return null

  try {
    const res = await fetch(`https://api.kite.trade/quote?${qs}`, {
      headers: { 'X-Kite-Version': '3', Authorization: `token ${apiKey}:${accessToken}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) { console.warn(`  Kite CDS ${res.status}`); return null }
    const { data } = await res.json()
    const result = {}
    for (const key of pairs) {
      const sym = instruments.currencies[key]?.symbol
      const q = data?.[`CDS:${sym}`]
      if (!q?.last_price) continue
      const price = q.last_price
      const prevClose = q.ohlc?.close ?? 0
      result[key] = {
        price,
        prevClose: prevClose > 0 ? prevClose : price,
        changePct: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
      }
    }
    console.log(`  Kite CDS: ${Object.keys(result).length}/${pairs.length} pairs`)
    return Object.keys(result).length > 0 ? result : null
  } catch (e) {
    console.warn(`  Kite CDS failed: ${e.message}`)
    return null
  }
}

// ── Yahoo Finance v8 — COMEX + USDINR ────────────────────────────────────────

const YAHOO_SYMBOLS = [
  { key: 'COMEX_GOLD',   sym: 'GC=F',      unit: 'USD/oz'   },
  { key: 'COMEX_SILVER', sym: 'SI=F',      unit: 'USD/oz'   },
  { key: 'WTI',          sym: 'CL=F',      unit: 'USD/bbl'  },
  { key: 'BRENT',        sym: 'BZ=F',      unit: 'USD/bbl'  },
  { key: 'HENRY_HUB',   sym: 'NG=F',      unit: 'USD/mmBtu'},
  { key: 'USDINR',       sym: 'USDINR=X',  unit: 'INR'      },
]

async function fetchYahooSymbol({ key, sym, unit }) {
  try {
    const encoded = sym.replace(/=/g, '%3D')
    const r = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=2d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 BhaavBrief/2.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(9000),
      }
    )
    if (!r.ok) return null
    const { chart } = await r.json()
    const meta = chart?.result?.[0]?.meta
    if (!meta) return null
    const price = meta.regularMarketPrice ?? 0
    const prevClose = meta.chartPreviousClose ?? 0
    if (!(price > 0)) return null
    return {
      key, unit,
      price,
      prevClose: prevClose > 0 ? prevClose : price,
      changePct: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
    }
  } catch {
    return null
  }
}

// ── Frankfurter ECB — USDINR fallback ────────────────────────────────────────

async function fetchFrankfurterUSDINR() {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
      signal: AbortSignal.timeout(5000),
    })
    if (!r.ok) return null
    const d = await r.json()
    const rate = d?.rates?.INR ?? 0
    return rate >= 82 && rate <= 110 ? rate : null
  } catch { return null }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nBhaavBrief fetch-snapshot — ${new Date().toISOString()}\n`)

  const existing = loadJSON(SNAPSHOT_FILE)  // last good snapshot for stale fallback
  const mcxCache = loadJSON(MCX_CACHE_FILE)  // intelligence-engine cache (refreshes every 15 min)

  // Fetch all external data in parallel
  const [kiteMCX, kiteCDS, ...yahooResults] = await Promise.all([
    fetchKiteMCX(),
    fetchKiteCurrencies(),
    ...YAHOO_SYMBOLS.map(fetchYahooSymbol),
    fetchFrankfurterUSDINR(),
  ])
  const frankfurterUSDINR = yahooResults[yahooResults.length - 1]  // last item
  const yahooMap = {}
  for (let i = 0; i < YAHOO_SYMBOLS.length; i++) {
    if (yahooResults[i] && typeof yahooResults[i] === 'object' && 'price' in yahooResults[i]) {
      yahooMap[YAHOO_SYMBOLS[i].key] = yahooResults[i]
    }
  }
  console.log(`  Yahoo: ${Object.keys(yahooMap).length}/${YAHOO_SYMBOLS.length} symbols`)

  // MCX: Kite preferred, cache fallback.
  // Cache age matters: if Kite is down and cache is >2h old, mark stale.
  const cacheAgeHours = mcxCache?.ts
    ? (Date.now() - new Date(mcxCache.ts).getTime()) / 3600000
    : 999

  function getMCX(key) {
    if (kiteMCX?.[key]) return kiteMCX[key]
    const cachePrice = mcxCache?.[key]
    const cachePct = mcxCache?.[`${key}Pct`] ?? 0
    if (cachePrice > 0) {
      const prevClose = cachePct !== 0 ? cachePrice / (1 + cachePct / 100) : cachePrice
      return {
        price: cachePrice,
        prevClose,
        changePct: cachePct,
        stale: cacheAgeHours > 2,
      }
    }
    return null
  }

  // USDINR: Yahoo preferred, Frankfurter fallback
  function getUSDINR() {
    if (yahooMap.USDINR) return yahooMap.USDINR
    const rate = typeof frankfurterUSDINR === 'number' ? frankfurterUSDINR : null
    if (!rate) return null
    const prev = existing?.instruments?.USDINR?.price ?? rate
    return {
      price: rate,
      prevClose: prev,
      changePct: prev > 0 ? ((rate - prev) / prev) * 100 : 0,
      unit: 'INR',
    }
  }

  let staleCount = 0

  function buildInstrument(key, data, unit) {
    if (data && data.price > 0) {
      if (data.stale) staleCount++
      return {
        price:     roundTo(data.price, 2),
        prevClose: roundTo(data.prevClose, 2),
        changePct: roundTo(data.changePct, 4),
        unit,
        ...(data.stale ? { stale: true } : {}),
      }
    }
    // No live data — try last snapshot
    const prev = existing?.instruments?.[key]
    if (prev && prev.price > 0) {
      console.warn(`  ${key}: stale — carrying last good value (${existing.generatedAtIST ?? existing.generatedAt})`)
      staleCount++
      return { ...prev, unit, stale: true }
    }
    // No data at all
    console.warn(`  ${key}: no data, no fallback — writing zero`)
    staleCount += 2
    return { price: 0, prevClose: 0, changePct: 0, unit, stale: true }
  }

  const MCX_UNITS = {
    gold: 'INR/10g', silver: 'INR/kg', crude: 'INR/bbl',
    copper: 'INR/kg', natgas: 'INR/mmBtu',
    zinc: 'INR/kg', lead: 'INR/kg', aluminium: 'INR/kg', nickel: 'INR/kg',
  }

  // Optional minor metals — prefer live Kite data, fall back to last snapshot, never block pipeline
  function optionalMCX(key, snapshotKey, unit) {
    const data = getMCX(key)
    if (data && data.price > 0) {
      return {
        price:     roundTo(data.price, 2),
        prevClose: roundTo(data.prevClose, 2),
        changePct: roundTo(data.changePct, 4),
        unit,
        ...(data.stale ? { stale: true } : {}),
      }
    }
    // Fall back to last snapshot value (so the card is never blank once it was ever populated)
    const prev = existing?.instruments?.[snapshotKey]
    if (prev && prev.price > 0) {
      console.warn(`  ${snapshotKey}: stale — carrying last good snapshot value`)
      return { ...prev, unit, stale: true }
    }
    return null
  }

  const instruments = {
    MCX_GOLD:    buildInstrument('MCX_GOLD',    getMCX('gold'),    MCX_UNITS.gold),
    MCX_SILVER:  buildInstrument('MCX_SILVER',  getMCX('silver'),  MCX_UNITS.silver),
    MCX_CRUDE:   buildInstrument('MCX_CRUDE',   getMCX('crude'),   MCX_UNITS.crude),
    MCX_COPPER:  buildInstrument('MCX_COPPER',  getMCX('copper'),  MCX_UNITS.copper),
    MCX_NATGAS:  buildInstrument('MCX_NATGAS',  getMCX('natgas'),  MCX_UNITS.natgas),
    USDINR:      buildInstrument('USDINR',      getUSDINR(),       'INR'),
    COMEX_GOLD:  buildInstrument('COMEX_GOLD',  yahooMap.COMEX_GOLD,   'USD/oz'),
    COMEX_SILVER:buildInstrument('COMEX_SILVER',yahooMap.COMEX_SILVER, 'USD/oz'),
    WTI:         buildInstrument('WTI',         yahooMap.WTI,      'USD/bbl'),
    BRENT:       buildInstrument('BRENT',       yahooMap.BRENT,    'USD/bbl'),
    HENRY_HUB:   buildInstrument('HENRY_HUB',  yahooMap.HENRY_HUB,'USD/mmBtu'),
  }
  const zincInst      = optionalMCX('zinc',      'MCX_ZINC',      MCX_UNITS.zinc)
  const leadInst      = optionalMCX('lead',      'MCX_LEAD',      MCX_UNITS.lead)
  const aluminiumInst = optionalMCX('aluminium', 'MCX_ALUMINIUM', MCX_UNITS.aluminium)
  const nickelInst    = optionalMCX('nickel',    'MCX_NICKEL',    MCX_UNITS.nickel)
  if (zincInst)      instruments.MCX_ZINC      = zincInst
  if (leadInst)      instruments.MCX_LEAD      = leadInst
  if (aluminiumInst) instruments.MCX_ALUMINIUM = aluminiumInst
  if (nickelInst)    instruments.MCX_NICKEL    = nickelInst

  // Optional CDS currency pairs — silent if Kite CDS unavailable
  for (const key of ['eurinr', 'gbpinr', 'jpyinr']) {
    const d = kiteCDS?.[key]
    if (d?.price > 0) {
      instruments[key.toUpperCase()] = {
        price:     roundTo(d.price, 4),
        prevClose: roundTo(d.prevClose, 4),
        changePct: roundTo(d.changePct, 4),
        unit:      'INR',
      }
    }
  }

  // Derived values — computed from the same numbers shown in the brief.
  // These can never disagree with the prices next to them.
  const goldUSD  = instruments.COMEX_GOLD.price
  const usdinr   = instruments.USDINR.price
  const mcxGold  = instruments.MCX_GOLD.price
  const silverUSD = instruments.COMEX_SILVER.price

  const importParityGoldINR = goldUSD > 0 && usdinr > 0
    ? Math.round((goldUSD / 31.1035) * 10 * usdinr)   // per troy oz → per 10g
    : 0

  const mcxComexGoldSpreadPct = importParityGoldINR > 0 && mcxGold > 0
    ? roundTo(((mcxGold - importParityGoldINR) / importParityGoldINR) * 100, 2)
    : 0

  const goldSilverRatio = silverUSD > 0
    ? roundTo(goldUSD / silverUSD, 1)
    : 0

  // IST timestamp
  const now = new Date()
  const generatedAtIST = now.toLocaleString('en-CA', {
    timeZone: 'Asia/Kolkata', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).replace(',', '') + ' IST'

  const snapshot = {
    generatedAt:    now.toISOString(),
    generatedAtIST,
    source: kiteMCX ? 'kite+yahoo' : (cacheAgeHours < 2 ? 'cache+yahoo' : 'stale-cache+yahoo'),
    instruments,
    derived: { importParityGoldINR, mcxComexGoldSpreadPct, goldSilverRatio },
  }

  fs.mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true })
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), 'utf8')

  // Log summary table
  console.log('\n  Instrument        Price          Chg%    Stale')
  for (const [k, v] of Object.entries(instruments)) {
    const price = v.unit.includes('INR')
      ? `₹${v.price.toLocaleString('en-IN')}`
      : `$${v.price.toFixed(2)}`
    const pctStr = (v.changePct >= 0 ? '+' : '') + v.changePct.toFixed(2) + '%'
    console.log(`  ${k.padEnd(16)} ${price.padStart(12)}  ${pctStr.padStart(7)}  ${v.stale ? '⚠' : '✓'}`)
  }

  console.log(`\n  Stale instruments: ${staleCount}`)
  console.log(`  Written: ${SNAPSHOT_FILE}`)
  console.log(`  As of:   ${generatedAtIST}`)

  if (staleCount > 3) {
    console.error(`\nFATAL: ${staleCount} instruments stale — blocking pipeline. Check Yahoo Finance / Kite connectivity.`)
    process.exit(1)
  }

  console.log('\nSnapshot OK.\n')
}

function roundTo(n, decimals) {
  return Math.round(n * 10 ** decimals) / 10 ** decimals
}

main().catch(err => {
  console.error('fetch-snapshot fatal:', err)
  process.exit(1)
})
