/**
 * BhaavBrief Intelligence Engine
 *
 * Runs every 15 min during MCX market hours via GitHub Actions.
 *
 * TRIGGER: Price move >1% in any commodity + supporting signal
 *   Supporting signals: new SEBI/MCX/RBI circular, EIA data, major macro event
 *   Override: Price move >2% publishes regardless of supporting signal
 *
 * FLOW:
 *   1. Load state (last prices, last circulars seen)
 *   2. Fetch current prices — Kite MCX (live) with Stooq COMEX fallback
 *   3. Build cross-asset market narrative (what's the dominant theme right now?)
 *   4. Detect moves vs last 15 min state
 *   5. Scrape govt agencies for new circulars
 *   6. Check EIA data (Wednesdays)
 *   7. Evaluate trigger conditions
 *   8. If triggered: Claude generates narrative-aware article → save MDX → update state
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { fetchKiteHistorical, computeTechnicalLevels, formatTechnicalBlock } from './lib/technicals.js'
import { isTradingHoliday, getHolidayName, todayIST } from './lib/holidays.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Paths ─────────────────────────────────────────────────────────────────────
const STATE_FILE   = path.join(ROOT, 'data/engine-state.json')
const ARTICLES_DIR = path.join(ROOT, 'content/articles')
const TITLE_FILE   = path.join(ROOT, 'data/last-article-title.txt')

// ── Constants ─────────────────────────────────────────────────────────────────
const MOVE_THRESHOLD        = 1.0   // % — triggers article with supporting signal
const MOVE_THRESHOLD_HARD   = 2.0   // % — triggers article regardless
const HAWK_SCAN_THRESHOLD   = 3.0   // % — triggers Hawk-Scan (highest urgency)
const MAX_ARTICLES_PER_DAY  = 8
const MIN_MINUTES_BETWEEN   = 30

// ── Kite MCX Enrichment (live prices, overrides Stooq-derived estimates) ──────
function loadInstruments() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/kite-instruments.json'), 'utf8'))
  } catch { return null }
}

async function fetchKiteMCX() {
  const KITE_API_KEY      = process.env.KITE_API_KEY
  const KITE_ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN
  const instruments = loadInstruments()
  if (!KITE_API_KEY || !KITE_ACCESS_TOKEN || !instruments) return null

  const keys = ['gold', 'silver', 'crude', 'copper', 'natgas']
  const qs   = keys.filter(k => instruments[k]?.symbol).map(k => `i=MCX:${instruments[k].symbol}`).join('&')
  if (!qs) return null

  try {
    const res = await fetch(`https://api.kite.trade/quote?${qs}`, {
      headers: { 'X-Kite-Version': '3', Authorization: `token ${KITE_API_KEY}:${KITE_ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) { console.warn(`  Kite quote ${res.status}`); return null }
    const { data } = await res.json()
    const out = {}
    for (const key of keys) {
      const sym = instruments[key]?.symbol
      const q   = data?.[`MCX:${sym}`]
      if (!sym || !q) continue
      const ltp       = q.last_price
      const prevClose = q.ohlc?.close ?? 0
      if (ltp != null) out[key] = ltp
      if (prevClose > 0 && ltp != null) out[`${key}Pct`] = ((ltp - prevClose) / prevClose) * 100
    }
    return Object.keys(out).length > 2 ? out : null
  } catch (e) { console.warn(`  Kite failed: ${e.message}`); return null }
}

// ── Cross-Asset Market Narrative Builder ──────────────────────────────────────
/**
 * Synthesises what's happening across the ENTIRE commodity complex into a
 * 1-2 sentence narrative. This is injected into the Claude prompt so every
 * generated article contextualises the trigger within the broader market story.
 */
function buildMarketNarrative(prices) {
  const g  = prices.goldPct   ?? 0
  const s  = prices.silverPct ?? 0
  const c  = prices.crudePct  ?? 0
  const cu = prices.copperPct ?? 0
  const ng = prices.gasPct    ?? 0
  const themes = []

  // Cross-asset pattern detection — order matters (most specific first)
  if (g > 0.5 && c < -0.5)
    themes.push(`Risk-off bid: gold +${g.toFixed(1)}% as crude falls ${c.toFixed(1)}% — safe-haven demand dominating, energy weakness reflecting demand concern`)
  if (g > 0.4 && s > 0.4 && cu > 0.4)
    themes.push(`Broad commodity rally: gold, silver and copper all advancing — dollar weakness or reflation trade driving the entire complex`)
  if (c > 1.0 && ng > 1.0)
    themes.push(`Energy complex surging: crude +${c.toFixed(1)}% and nat gas +${ng.toFixed(1)}% simultaneously — supply concern or geopolitical risk driving energy sector`)
  if (g < -0.5 && c < -0.5 && cu < -0.5)
    themes.push(`Broad commodity selloff: gold, crude and copper all falling — dollar strengthening or demand outlook deteriorating`)
  if (g > 0.4 && c > 0.4 && !themes.length)
    themes.push(`Inflationary pressure signal: gold +${g.toFixed(1)}% and crude +${c.toFixed(1)}% rising together — India import cost is rising, MCX contracts tracking COMEX higher`)
  if (cu > 0.8 && c > 0.3 && !themes.length)
    themes.push(`Risk-on/China demand signal: copper +${cu.toFixed(1)}% and crude +${c.toFixed(1)}% advancing — industrial activity read positive`)
  if (g > 0.5 && cu < -0.5 && !themes.length)
    themes.push(`Divergence: safe-haven gold rising +${g.toFixed(1)}% while industrial copper falls ${cu.toFixed(1)}% — risk-off tone with demand concern`)

  if (themes.length === 0) {
    const all = [
      { name: 'Gold', pct: g }, { name: 'Silver', pct: s }, { name: 'Crude', pct: c },
      { name: 'Copper', pct: cu }, { name: 'NatGas', pct: ng },
    ].filter(x => Math.abs(x.pct) > 0.25).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    if (all.length > 0)
      themes.push(`${all[0].name} is the session leader at ${all[0].pct >= 0 ? '+' : ''}${all[0].pct.toFixed(1)}% — other commodities subdued`)
    else
      themes.push('Subdued session — no dominant directional theme; commodity complex mixed with sub-0.3% moves across the board')
  }

  return themes.slice(0, 2).join('. ')
}

// ── Market Session ─────────────────────────────────────────────────────────────
function getMarketSession() {
  const h = new Date(Date.now() + 5.5 * 3600 * 1000).getUTCHours()
  if (h >= 6  && h < 9)  return 'pre-market'
  if (h >= 9  && h < 15) return 'morning'
  if (h >= 15 && h < 23) return 'afternoon'
  return 'global'
}

const SESSION_FOCUS = {
  'pre-market':  'MCX opens within 3 hours. Frame article around overnight COMEX/LME moves and the likely MCX open price relative to yesterday\'s close.',
  'morning':     'MCX morning session is live. Focus on intraday price action, whether the morning trend is accelerating or stalling, and implications for open positions.',
  'afternoon':   'MCX evening session is active. Focus on current levels, what\'s driving them, and key price levels to watch into the 11:30 PM IST close.',
  'global':      'MCX is closed. Explain what the US/EU session move means for tomorrow\'s MCX open — quantify the expected gap.',
}

// ── 1. State Management ───────────────────────────────────────────────────────
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return {
      lastPrices: {},
      lastChecked: null,
      lastCirculars: { sebi: null, mcx: null, rbi: null, ppac: null },
      lastEia: { period: null, value: null },
      articlesToday: [],
      lastArticleAt: null,
    }
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

// ── 2. Price Fetching — Kite (live MCX) + Stooq COMEX + Frankfurter USD/INR ──
async function fetchPrices() {
  // USD/INR via Frankfurter (free, no key)
  let usdinr = 85.0
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
      signal: AbortSignal.timeout(6000),
    })
    if (r.ok) usdinr = (await r.json()).rates?.INR ?? usdinr
  } catch {}

  // COMEX / NYMEX futures via Stooq CSV — gives us COMEX reference prices + % change
  const stooqMap = {
    'GC=F': 'gc.f',   // COMEX Gold $/troy oz
    'SI=F': 'si.f',   // COMEX Silver $/troy oz
    'CL=F': 'cl.f',   // NYMEX WTI Crude $/bbl
    'HG=F': 'hg.f',   // COMEX Copper ¢/lb
    'NG=F': 'ng.f',   // Henry Hub Nat Gas $/mmBtu
    'BZ=F': 'lcod.uk', // Brent (ICE London)
  }

  const q = {}
  await Promise.all(
    Object.entries(stooqMap).map(async ([yfKey, stooqSym]) => {
      try {
        const r = await fetch(
          `https://stooq.com/q/l/?s=${stooqSym}&f=sd2t2ohlcv&h&e=csv`,
          { signal: AbortSignal.timeout(6000) }
        )
        if (!r.ok) return
        const lines = (await r.text()).trim().split('\n')
        if (lines.length < 2) return
        const cols  = lines[1].split(',')
        const close = parseFloat(cols[6])
        const open  = parseFloat(cols[3])
        if (!isNaN(close) && close > 0) {
          const div = (yfKey === 'SI=F' || yfKey === 'HG=F') ? 100 : 1
          q[yfKey] = {
            price: close / div,
            pct:   open > 0 ? ((close - open) / open) * 100 : 0,
            prev:  open / div,
          }
        }
      } catch {}
    })
  )

  if (Object.keys(q).length === 0) {
    console.error('Price fetch failed: no Stooq data returned')
    return null
  }

  const comexGold = q['GC=F']?.price ?? 0
  const comexSilv = q['SI=F']?.price ?? 0
  const wti       = q['CL=F']?.price ?? 0
  const brent     = q['BZ=F']?.price ?? wti
  const comexCu   = q['HG=F']?.price ?? 0
  const henryHub  = q['NG=F']?.price ?? 0

  // Build derived MCX prices from COMEX + USD/INR (with duty/premium estimates)
  const derived = {
    usdinr,
    comexGold, comexSilver: comexSilv, wti, brent, comexCopper: comexCu, henryHub,
    mcxGold:   comexGold > 0 ? (comexGold  / 31.1035) * 10   * usdinr * 1.15 : 0,
    mcxSilver: comexSilv > 0 ? (comexSilv  / 31.1035) * 1000 * usdinr * 1.10 : 0,
    mcxCrude:  wti       > 0 ? wti         * usdinr  * 1.02 : 0,
    mcxCopper: comexCu   > 0 ? comexCu     * 2.20462 * usdinr * 1.05 : 0,
    mcxNatGas: henryHub  > 0 ? henryHub    * usdinr : 0,
    goldPct:   q['GC=F']?.pct  ?? 0,
    silverPct: q['SI=F']?.pct  ?? 0,
    crudePct:  q['CL=F']?.pct  ?? 0,
    copperPct: q['HG=F']?.pct  ?? 0,
    gasPct:    q['NG=F']?.pct  ?? 0,
    usdPct:    0,
    priceSource: 'stooq-derived',
  }

  // Enrich with actual Kite MCX live prices when available
  // Kite gives us real MCX contract prices + accurate intraday % from prev close
  const kite = await fetchKiteMCX()
  if (kite) {
    console.log('  Kite MCX live prices enriching Stooq data')
    if (kite.gold   != null) { derived.mcxGold   = kite.gold;   if (kite.goldPct   != null) derived.goldPct   = kite.goldPct   }
    if (kite.silver != null) { derived.mcxSilver = kite.silver; if (kite.silverPct != null) derived.silverPct = kite.silverPct }
    if (kite.crude  != null) { derived.mcxCrude  = kite.crude;  if (kite.crudePct  != null) derived.crudePct  = kite.crudePct  }
    if (kite.copper != null) { derived.mcxCopper = kite.copper; if (kite.copperPct != null) derived.copperPct = kite.copperPct }
    if (kite.natgas != null) { derived.mcxNatGas = kite.natgas; if (kite.natgasPct != null) derived.gasPct    = kite.natgasPct }
    derived.priceSource = 'kite-live'
  }

  return derived
}

// ── 3. Detect Price Moves vs Last State ───────────────────────────────────────
function detectMoves(current, lastPrices) {
  const moves = []

  const pairs = [
    { key: 'gold',   curr: current.mcxGold,   label: 'MCX Gold',    pct: current.goldPct,   unit: '₹', per: '/10g'   },
    { key: 'silver', curr: current.mcxSilver,  label: 'MCX Silver',  pct: current.silverPct, unit: '₹', per: '/kg'    },
    { key: 'crude',  curr: current.mcxCrude,   label: 'MCX Crude',   pct: current.crudePct,  unit: '₹', per: '/bbl'   },
    { key: 'copper', curr: current.mcxCopper,  label: 'MCX Copper',  pct: current.copperPct, unit: '₹', per: '/kg'    },
    { key: 'natgas', curr: current.mcxNatGas,  label: 'MCX Nat Gas', pct: current.gasPct,    unit: '₹', per: '/mmBtu' },
    { key: 'usdinr', curr: current.usdinr,     label: 'USD/INR',     pct: current.usdPct,    unit: '₹', per: ''       },
  ]

  for (const { key, curr, label, pct, unit, per } of pairs) {
    if (!curr || curr === 0) continue

    // Use 15-min delta vs last state when available; fall back to session %
    const stateKey  = key === 'natgas' ? 'natgas' : key
    const lastPrice = lastPrices?.[stateKey]
    const deltaPct  = (lastPrice && lastPrice > 0)
      ? ((curr - lastPrice) / lastPrice) * 100
      : pct

    const absPct = Math.abs(deltaPct)
    if (absPct >= MOVE_THRESHOLD) {
      moves.push({
        key, label, price: curr, pct: deltaPct, absPct, unit, per,
        isHard: absPct >= MOVE_THRESHOLD_HARD,
        direction: deltaPct > 0 ? 'surged' : 'fell',
        directionShort: deltaPct > 0 ? '▲' : '▼',
      })
    }
  }

  return moves.sort((a, b) => b.absPct - a.absPct)
}

// ── 4. Govt Circular Monitor ──────────────────────────────────────────────────
/**
 * Checks for new regulatory signals from SEBI, MCX, RBI, and PPAC.
 *
 * MCX's own website is blocked by Akamai CDN on server-side requests.
 * We use Google News RSS as a reliable alternative — it surfaces MCX circulars
 * and SEBI/RBI notices within minutes of publication.
 *
 * SEBI and RBI direct HTML scraping is kept as-is since those sites are accessible.
 * PPAC direct scraping is also kept since it returns structured HTML.
 */
async function checkCirculars(lastCirculars) {
  const newCirculars = []

  // MCX + SEBI circulars via Google News RSS (MCX blocks direct scraping)
  try {
    const queries = [
      'MCX+India+circular+notice+commodity',
      'SEBI+commodity+derivatives+circular',
    ]
    for (const q of queries) {
      const res = await fetch(
        `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 BhaavBrief/1.0' },
          signal: AbortSignal.timeout(8000),
        }
      )
      const xml = await res.text()
      // Extract first item title + pubDate from RSS
      const titleM = xml.match(/<item[^>]*>[\s\S]*?<title><!\[CDATA\[(.+?)\]\]><\/title>|<item[^>]*>[\s\S]*?<title>([^<]{10,200})<\/title>/)
      const dateM  = xml.match(/<pubDate>([^<]+)<\/pubDate>/)
      if (titleM) {
        const title = (titleM[1] ?? titleM[2] ?? '').trim()
        const id    = title.slice(0, 80)
        const source = q.includes('SEBI') ? 'SEBI' : 'MCX'
        const stateKey = source.toLowerCase()
        // Only surface if published within last 2 hours to avoid stale signals
        if (dateM) {
          const age = Date.now() - new Date(dateM[1]).getTime()
          if (age > 2 * 3600 * 1000) continue
        }
        if (id !== lastCirculars[stateKey]) {
          newCirculars.push({ source, title, url: source === 'MCX' ? 'https://mcxindia.com' : 'https://sebi.gov.in' })
          lastCirculars[stateKey] = id
        }
      }
    }
  } catch (err) {
    console.warn('Circular RSS failed:', err.message)
  }

  // RBI Press Releases (direct HTML — site is accessible)
  try {
    const res = await fetch(
      'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
    )
    const html = await res.text()
    const match = html.match(/class="TableText"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/s)
    if (match) {
      const title = match[1].trim()
      const id = title.slice(0, 80)
      if (id !== lastCirculars.rbi) {
        newCirculars.push({ source: 'RBI', title, url: 'https://rbi.org.in' })
        lastCirculars.rbi = id
      }
    }
  } catch (err) {
    console.warn('RBI scrape failed:', err.message)
  }

  // PPAC Petroleum Prices (direct HTML — site is accessible)
  try {
    const res = await fetch(
      'https://ppac.gov.in/content/212_1_ImportExport.aspx',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
    )
    const html = await res.text()
    const match = html.match(/International Crude Price[^<]*<[^>]+>([^<]+)/i)
    if (match) {
      const title = match[1].trim()
      const id = title.slice(0, 80)
      if (id !== lastCirculars.ppac) {
        newCirculars.push({ source: 'PPAC', title: `Petroleum import data updated: ${title}`, url: 'https://ppac.gov.in' })
        lastCirculars.ppac = id
      }
    }
  } catch (err) {
    console.warn('PPAC scrape failed:', err.message)
  }

  return { newCirculars, updatedLastCirculars: lastCirculars }
}

// ── 5. EIA Crude Inventory Monitor ───────────────────────────────────────────
async function checkEIA(lastEia) {
  if (!process.env.EIA_API_KEY) return null

  try {
    const url = `https://api.eia.gov/v2/petroleum/sum/sndw/data/?api_key=${process.env.EIA_API_KEY}&frequency=weekly&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=2`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const data = await res.json()
    const latest = data?.response?.data?.[0]

    if (!latest) return null

    const { period, value } = latest
    if (period === lastEia.period) return null

    const changeBarrels = value - (lastEia.value ?? 0)
    const isSignificant = Math.abs(changeBarrels) > 1_000_000

    return {
      period, value, changeBarrels, isSignificant,
      direction: changeBarrels < 0 ? 'draw' : 'build',
      summary: `EIA weekly crude inventory: ${changeBarrels < 0 ? 'draw' : 'build'} of ${Math.abs(changeBarrels / 1_000_000).toFixed(1)}M barrels for week of ${period}`,
    }
  } catch (err) {
    console.warn('EIA fetch failed:', err.message)
    return null
  }
}

// ── 6a. Hawk-Scan Generator ───────────────────────────────────────────────────
// Sacred format: structured flash intelligence for extreme market events.
// Fires on: price move >3%, EIA significant draw/build, or multi-hotspot geo escalation.
// Output is deliberately terse — a trader with 10 seconds can act on it.
async function generateHawkScan({ moves, eia, prices, technicalLevels }) {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

  const primaryMove = moves[0]
  const dataLabel = prices.priceSource === 'kite-live' ? 'LIVE MCX' : 'COMEX-DERIVED'

  // Build a compact price snapshot (only what the primary move touches)
  const priceLines = []
  if (primaryMove?.key === 'crude' || primaryMove?.key === 'natgas') {
    priceLines.push(`MCX Crude:  ₹${prices.mcxCrude?.toFixed(0)}/bbl  (WTI $${prices.wti?.toFixed(2)}, Brent $${prices.brent?.toFixed(2)}, session ${prices.crudePct?.toFixed(2)}%)`)
    priceLines.push(`MCX NatGas: ₹${prices.mcxNatGas?.toFixed(2)}/mmBtu (HH $${prices.henryHub?.toFixed(2)}, session ${prices.gasPct?.toFixed(2)}%)`)
  }
  if (primaryMove?.key === 'gold' || primaryMove?.key === 'silver') {
    priceLines.push(`MCX Gold:   ₹${prices.mcxGold?.toFixed(0)}/10g  (COMEX $${prices.comexGold?.toFixed(0)}/oz, session ${prices.goldPct?.toFixed(2)}%)`)
    priceLines.push(`MCX Silver: ₹${prices.mcxSilver?.toFixed(0)}/kg  (COMEX $${prices.comexSilver?.toFixed(2)}/oz, session ${prices.silverPct?.toFixed(2)}%)`)
  }
  if (primaryMove?.key === 'copper') {
    priceLines.push(`MCX Copper: ₹${prices.mcxCopper?.toFixed(2)}/kg  (COMEX $${prices.comexCopper?.toFixed(2)}/lb, session ${prices.copperPct?.toFixed(2)}%)`)
  }
  priceLines.push(`USD/INR: ₹${prices.usdinr?.toFixed(2)}`)

  const eiaBlock = eia ? `\nEIA DATA: ${eia.summary}\nSIGNIFICANT: ${eia.isSignificant ? 'YES (>1M bbls)' : 'no'} | Direction: ${eia.direction.toUpperCase()}` : ''
  const techBlock = technicalLevels ? `\n${technicalLevels}` : ''
  const moveBlock = moves.slice(0, 3).map(m => `${m.label}: ${m.directionShort}${m.absPct.toFixed(2)}% → ₹${m.price.toFixed(m.key === 'copper' ? 2 : 0)}${m.per}`).join('\n')

  // Determine hawk trigger type for context
  const hawkTrigger = moves[0]?.absPct >= HAWK_SCAN_THRESHOLD
    ? `PRICE MOVE: ${moves[0].label} has moved ${moves[0].absPct.toFixed(2)}% — above the 3% Hawk-Scan threshold`
    : eia?.isSignificant
    ? `EIA SIGNIFICANT: US crude ${eia.direction} of ${Math.abs(eia.changeBarrels / 1_000_000).toFixed(1)}M barrels — market-moving inventory data`
    : `EXTREME EVENT — multiple signals converging`

  const commodity = primaryMove?.label ?? 'commodities'
  const tags = [...new Set(moves.map(m => m.label))].slice(0, 4).join('", "')

  const prompt = `You are BhaavBrief's Hawk-Scan system — India's highest-urgency commodity intelligence format, read by professional MCX traders who need to act in seconds.

A HAWK-SCAN fires only on extreme market events. This is one of those moments.

TIME: ${timeStr} IST, ${dateStr}
HAWK TRIGGER: ${hawkTrigger}

PRICE MOVES:
${moveBlock}

CURRENT PRICES [${dataLabel}, USD/INR ₹${prices.usdinr?.toFixed(2)}]:
${priceLines.join('\n')}
${eiaBlock}${techBlock}

OUTPUT FORMAT — SACRED. DO NOT DEVIATE. Return exactly this structure, no extra prose:

---
title: "[HAWK-SCAN] [Commodity]: [Specific action + key level] — under 70 chars"
description: "Under 155 chars. Include current ₹ price and the extreme trigger. For traders."
date: "${today.toISOString().split('T')[0]}"
time: "${timeStr}"
edition: "hawk-scan"
commodity: "${primaryMove?.label ?? 'macro'}"
tags: ["${tags}"]
priceAtPublish: ${Math.round(primaryMove?.price ?? 0)}
slug: "hawk-scan-[commodity-keyword]-[date-YYYYMMDD]"
hawkTrigger: "${moves[0]?.absPct >= HAWK_SCAN_THRESHOLD ? 'price' : eia?.isSignificant ? 'eia' : 'extreme'}"
---

TRIGGER — [One sentence. What exactly fired this scan. No softening.]

PRICE — ₹[exact level] · [exact %] · [direction in one word: SURGING/PLUNGING/SPIKING]

SIGNAL — [One sentence. The SPECIFIC MECHANISM behind this move — geopolitical, macro catalyst, technical break, supply shock. Name the cause explicitly.]

CROSS-ASSET — [One sentence. What is the REST of the complex doing right now. Show the chain.]

IMPORT COST — [Compute: COMEX $X × ₹[usdinr rate] × [duty multiplier for this commodity] = ₹[MCX parity]. Show the arithmetic, one line.]

TECHNICAL — [Key support above/below current price. Use exact numbers from OHLC data above. If no OHLC available, use round numbers — label them as such.]

WATCH — [One specific price level OR one scheduled data release that will either confirm or invalidate this move.]

RULES:
- Each section header is exactly as shown above (TRIGGER, PRICE, SIGNAL, etc.)
- Each section is ONE sentence or one line of arithmetic — no more
- No "experts say". Facts, data, mechanics only.
- SEBI COMPLIANCE: No buy/sell/accumulate/avoid/exit/enter directed at reader. Technical levels are observations not triggers. No predictive price targets — use "historically" framing for patterns.
- If this is an EIA significant event, IMPORT COST must show the WTI→MCX crude parity math.
- Total body: 80–130 words. Lean is the mandate.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : null
}

// ── 6b. Article Generator ─────────────────────────────────────────────────────
async function generateArticle({ moves, circulars, eia, prices, technicalLevels }) {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

  const narrative  = buildMarketNarrative(prices)
  const session    = getMarketSession()
  const primaryMove = moves[0]

  // Build cross-asset price block — label whether prices are live or derived
  const dataLabel = prices.priceSource === 'kite-live' ? 'LIVE MCX DATA' : 'COMEX-DERIVED ESTIMATES'
  const priceBlock = `
CURRENT MCX PRICES [${dataLabel}, ${timeStr} IST, USD/INR ₹${prices.usdinr?.toFixed(2)}]:
- MCX Gold:   ₹${prices.mcxGold?.toFixed(0) ?? 'N/A'}/10g    (COMEX: $${prices.comexGold?.toFixed(0)}/oz, session: ${prices.goldPct?.toFixed(2) ?? '0.00'}%)
- MCX Silver: ₹${prices.mcxSilver?.toFixed(0) ?? 'N/A'}/kg   (COMEX: $${prices.comexSilver?.toFixed(2)}/oz, session: ${prices.silverPct?.toFixed(2) ?? '0.00'}%)
- MCX Crude:  ₹${prices.mcxCrude?.toFixed(0) ?? 'N/A'}/bbl   (WTI: $${prices.wti?.toFixed(2)}, Brent: $${prices.brent?.toFixed(2)}, session: ${prices.crudePct?.toFixed(2) ?? '0.00'}%)
- MCX Copper: ₹${prices.mcxCopper?.toFixed(2) ?? 'N/A'}/kg   (COMEX: $${prices.comexCopper?.toFixed(2)}/lb, session: ${prices.copperPct?.toFixed(2) ?? '0.00'}%)
- MCX NatGas: ₹${prices.mcxNatGas?.toFixed(2) ?? 'N/A'}/mmBtu (Henry Hub: $${prices.henryHub?.toFixed(2)}, session: ${prices.gasPct?.toFixed(2) ?? '0.00'}%)`.trim()

  const moveBlock = moves.map(m =>
    `${m.label}: ${m.directionShort} ${m.absPct.toFixed(2)}% → ₹${m.price.toFixed(m.key === 'copper' ? 2 : 0)}${m.per}`
  ).join('\n')

  const circularBlock = circulars.length > 0
    ? `NEW REGULATORY/GOVT SIGNALS:\n${circulars.map(c => `- [${c.source}] ${c.title}`).join('\n')}`
    : ''

  const eiaBlock = eia ? `EIA CRUDE DATA: ${eia.summary}` : ''

  // Technical levels for the primary triggered commodity
  const techBlock = technicalLevels
    ? `\n${technicalLevels}\n`
    : ''

  const commodity = primaryMove?.label ?? 'commodities'
  const tags = [...new Set(moves.map(m => m.label))].slice(0, 4).join('", "')

  const prompt = `You are BhaavBrief's senior market analyst — India's premier real-time commodity intelligence platform, read by traders, investors, merchants and businesses.

Write a flash intelligence article triggered at ${timeStr} IST on ${dateStr}.

SESSION: ${session.toUpperCase()} — ${SESSION_FOCUS[session]}

CROSS-ASSET MARKET NARRATIVE (the dominant theme driving the ENTIRE commodity complex right now):
${narrative}

TRIGGER (what specifically fired this article):
${moveBlock}

${priceBlock}

${circularBlock ? circularBlock + '\n' : ''}${eiaBlock ? eiaBlock + '\n' : ''}${techBlock}SEBI COMPLIANCE — NON-NEGOTIABLE (BhaavBrief is unregistered, educational content only):
- State data, never judge it: "Crude at $87.40, up 2.3%" ✅ | "Crude closed strong" ❌
- No action verbs directed at reader. BANNED: buy, sell, accumulate, avoid, exit, enter, hold, switch, book profits
- No predictive framing: "Goldman Sachs projects crude at $95" ✅ | "Crude headed to $95" ❌
- Historical context over prediction: "In past dollar-strength episodes, MCX gold fell 2-4%" ✅ | "MCX gold will fall" ❌
- Macro linkage: "Historically, rising crude compresses OMC margins by 3-5%" ✅ | "Rising crude is bad for OMCs, avoid" ❌
- Technical levels are observations, not triggers: "Price has rejected at ₹74,000 three times" ✅ | "Strong resistance, sell here" ❌

WRITING STANDARDS — NON-NEGOTIABLE:
1. OPEN by connecting the trigger to the MARKET NARRATIVE above. This move never happens in isolation.
2. Give the SPECIFIC mechanism: macro driver, geopolitical factor, technical level broken, or regulatory event.
3. Cite ACTUAL TECHNICAL LEVELS from the OHLC data above — name exact support/resistance numbers, reference 20-SMA and round numbers. Do not invent levels.
4. Explain the CROSS-ASSET CHAIN: what is the rest of the complex doing? Show cause-and-effect across assets.
5. Quantify the INDIAN IMPORT PARITY: COMEX price + USD/INR rate + customs duty → exact MCX ₹ parity. Show the arithmetic.
6. 150–250 words. Sharp. No filler. No "experts say". Facts, levels, mechanics only.
7. End with exactly one line: "Watch: [specific price level or upcoming data release to monitor]"

LANGUAGE — NON-NEGOTIABLE:
Write for an educated Indian reader (Mint/ET level), NOT a Bloomberg terminal analyst. Avoid finance-desk shorthand.
- "risk-off" → "fear-driven selling" or "investors pulling back from risky assets"
- "risk-on" → "markets regaining confidence"
- "commodity complex" → "commodities"
- "safe-haven bid" → "demand for gold as a safe harbour"
- "the market is pricing in" → say what's actually happening
- FOMC, OPEC, EIA are acceptable (widely known) but explain once if central to the article
- Never stack two jargon terms in one sentence

SEO RULES:
- Title: commodity name + specific action + key reason (under 65 chars, include "MCX")
- Meta description: under 155 chars, include current ₹ price and key reason
- Slug: lowercase, hyphens, include commodity and key trigger word

RETURN ONLY valid MDX frontmatter + article body, nothing else:

---
title: "[SEO title — under 65 chars, includes MCX + commodity + trigger]"
description: "[Under 155 chars — include current ₹ price and key reason]"
date: "${today.toISOString().split('T')[0]}"
time: "${timeStr}"
edition: "flash"
commodity: "${primaryMove?.label ?? 'macro'}"
tags: ["${tags}"]
priceAtPublish: ${Math.round(primaryMove?.price ?? 0)}
slug: "[url-slug-max-8-words-hyphens-only]"
---

[Article body — 150–250 words, cross-asset narrative, specific levels, Indian trader impact]`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : null
}

// ── 7. Save Article as MDX ────────────────────────────────────────────────────
function saveArticle(mdx) {
  if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true })

  const slugMatch  = mdx.match(/^slug:\s*"?([^"\n]+)"?/m)
  const titleMatch = mdx.match(/^title:\s*"([^"]+)"/m)

  const today   = new Date().toISOString().split('T')[0]
  const rawSlug = slugMatch?.[1]?.trim() ?? `market-update-${Date.now()}`
  const slug    = `${today}-${rawSlug}`.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80)

  const filepath = path.join(ARTICLES_DIR, `${slug}.mdx`)
  if (fs.existsSync(filepath)) {
    console.warn('Article already exists:', filepath)
    return null
  }

  const cleanMdx = mdx
    .replace(/^```(?:mdx|md)?\n/, '')   // strip any leading code fence Claude adds
    .replace(/\n```\s*$/, '')           // strip trailing code fence
    .replace(/^slug:.*$/m, '')
    .trim()
  fs.writeFileSync(filepath, cleanMdx, 'utf8')

  const title = titleMatch?.[1] ?? 'Market Update'
  fs.writeFileSync(TITLE_FILE, title, 'utf8')

  console.log(`Article saved: ${filepath}`)
  return { filepath, slug, title }
}

// ── 8. Throttle Check ─────────────────────────────────────────────────────────
function canPublish(state) {
  const today = new Date().toISOString().split('T')[0]

  if (!state.articlesToday || !state.articlesToday[0]?.startsWith(today)) {
    state.articlesToday = []
  }

  if (state.articlesToday.length >= MAX_ARTICLES_PER_DAY) {
    console.log(`Daily cap reached (${MAX_ARTICLES_PER_DAY} articles)`)
    return false
  }

  if (state.lastArticleAt) {
    const minsSince = (Date.now() - new Date(state.lastArticleAt).getTime()) / 60000
    if (minsSince < MIN_MINUTES_BETWEEN) {
      console.log(`Too soon since last article (${minsSince.toFixed(1)} min ago, min: ${MIN_MINUTES_BETWEEN})`)
      return false
    }
  }

  return true
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now()
  console.log(`\nBhaavBrief Intelligence Engine — ${new Date().toISOString()}\n`)

  const today = todayIST()
  if (isTradingHoliday(today)) {
    const name = getHolidayName(today)
    console.log(`MCX holiday (${today}${name ? ': ' + name : ''}) — engine sleeping`)
    return
  }

  const state = loadState()

  if (!state.lastChecked) {
    console.log('First run — seeding prices, no articles triggered')
    const prices = await fetchPrices()
    if (prices) {
      state.lastPrices = {
        gold: prices.mcxGold, silver: prices.mcxSilver, crude: prices.mcxCrude,
        copper: prices.mcxCopper, natgas: prices.mcxNatGas, usdinr: prices.usdinr,
      }
      state.lastChecked = new Date().toISOString()
      saveState(state)
      console.log('Prices seeded. Engine will trigger articles on next run.')
    }
    return
  }

  if (!canPublish(state)) {
    // Still fetch + track prices during throttle so 15-min deltas stay accurate
    const throttledPrices = await fetchPrices()
    if (throttledPrices) {
      state.lastPrices = {
        gold: throttledPrices.mcxGold, silver: throttledPrices.mcxSilver,
        crude: throttledPrices.mcxCrude, copper: throttledPrices.mcxCopper,
        natgas: throttledPrices.mcxNatGas, usdinr: throttledPrices.usdinr,
      }
      state.lastChecked = new Date().toISOString()
    }
    saveState(state)
    return
  }

  // Fetch prices + circulars + EIA in parallel
  const [prices, circularResult, eiaData] = await Promise.all([
    fetchPrices(),
    checkCirculars(state.lastCirculars),
    checkEIA(state.lastEia),
  ])

  state.lastCirculars = circularResult.updatedLastCirculars
  const newCirculars  = circularResult.newCirculars

  if (eiaData) state.lastEia = { period: eiaData.period, value: eiaData.value }

  if (!prices) {
    console.warn('No price data — skipping this run')
    saveState(state)
    return
  }

  // Detect moves and build market narrative
  const moves     = detectMoves(prices, state.lastPrices)
  const narrative = buildMarketNarrative(prices)
  const session   = getMarketSession()

  // Update last prices
  state.lastPrices = {
    gold: prices.mcxGold, silver: prices.mcxSilver, crude: prices.mcxCrude,
    copper: prices.mcxCopper, natgas: prices.mcxNatGas, usdinr: prices.usdinr,
  }
  state.lastChecked = new Date().toISOString()

  console.log(`Price source: ${prices.priceSource} | Session: ${session}`)
  console.log(`Market narrative: ${narrative}`)
  console.log(`Price moves: ${moves.length}`)
  moves.forEach(m => console.log(`  ${m.label}: ${m.pct.toFixed(2)}% → ₹${m.price.toFixed(0)}`))
  console.log(`New circulars: ${newCirculars.length}`)
  newCirculars.forEach(c => console.log(`  [${c.source}] ${c.title.slice(0, 60)}`))
  console.log(`EIA data: ${eiaData ? eiaData.summary : 'none'}`)

  // ── Trigger Logic ──────────────────────────────────────────────────────────
  const hawkMove  = moves.some(m => m.absPct >= HAWK_SCAN_THRESHOLD)
  const hardMove  = moves.some(m => m.isHard)
  const softMove  = moves.some(m => !m.isHard)
  const hasSignal = newCirculars.length > 0 || eiaData?.isSignificant

  // Hawk-Scan: price >3% OR significant EIA event
  const isHawkEvent = hawkMove || eiaData?.isSignificant

  const shouldPublish = isHawkEvent || hardMove || (softMove && hasSignal)

  if (!shouldPublish) {
    if (moves.length === 0) console.log('No significant price moves')
    else console.log('Moves detected but no supporting signal — holding')
    saveState(state)
    return
  }

  if (isHawkEvent)           console.log('\nHAWK-SCAN TRIGGERED')
  else                       console.log('\nTRIGGER FIRED — generating article...')
  if (hawkMove)              console.log('  Reason: Extreme price move >3%')
  if (eiaData?.isSignificant) console.log('  Reason: Significant EIA inventory event')
  if (hardMove && !isHawkEvent) console.log('  Reason: Hard move >2%')
  if (softMove && hasSignal && !isHawkEvent) console.log('  Reason: Soft move + circular/EIA signal')

  // Fetch Kite historical OHLC for the top 2 triggered commodities to get real technical levels
  const instruments = loadInstruments()
  const KEY_MAP = { gold: 'gold', silver: 'silver', crude: 'crude', copper: 'copper', natgas: 'natgas' }
  const MCX_UNITS = { gold: '₹/10g', silver: '₹/kg', crude: '₹/bbl', copper: '₹/kg', natgas: '₹/mmBtu' }

  let technicalLevels = null
  if (instruments) {
    const techBlocks = await Promise.all(
      moves.slice(0, 2).map(async move => {
        const iKey  = KEY_MAP[move.key]
        const token = instruments[iKey]?.token
        if (!token) return null
        const candles = await fetchKiteHistorical(token, 22)
        const levels  = computeTechnicalLevels(candles, move.price)
        if (!levels) return null
        return formatTechnicalBlock(move.label, MCX_UNITS[move.key] ?? '', move.price, levels)
      })
    )
    const validBlocks = techBlocks.filter(Boolean)
    if (validBlocks.length > 0) {
      technicalLevels = `TECHNICAL LEVELS (Kite MCX 20-day OHLC — use these exact numbers, do not invent levels):\n${validBlocks.join('\n')}`
      console.log(`  Technical levels fetched for: ${moves.slice(0, 2).map(m => m.label).join(', ')}`)
    }
  }

  const mdx = isHawkEvent
    ? await generateHawkScan({ moves, eia: eiaData, prices, technicalLevels })
    : await generateArticle({ moves, circulars: newCirculars, eia: eiaData, prices, technicalLevels })

  if (!mdx || !mdx.includes('---') || !mdx.includes('title:')) {
    console.error('Invalid MDX generated — aborting')
    saveState(state)
    return
  }

  const result = saveArticle(mdx)
  if (!result) {
    saveState(state)
    return
  }

  state.articlesToday = state.articlesToday ?? []
  state.articlesToday.push(`${today}/${result.slug}`)
  state.lastArticleAt = new Date().toISOString()

  saveState(state)

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\nDone in ${elapsed}s — "${result.title}"`)
  console.log(`  File: content/articles/${result.slug}.mdx\n`)
}

main().catch(err => {
  console.error('Engine fatal error:', err)
  process.exit(1)
})
