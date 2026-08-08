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
 *   2. Fetch current prices — Kite MCX (live) with Yahoo Finance COMEX reference
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

// Load .env.local for local runs
const envFile = path.join(ROOT, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const eq = line.indexOf('=')
    if (eq > 0 && !line.startsWith('#')) {
      const k = line.slice(0, eq).trim()
      const v = line.slice(eq + 1).trim()
      if (k && !process.env[k]) process.env[k] = v
    }
  }
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Paths ─────────────────────────────────────────────────────────────────────
const STATE_FILE      = path.join(ROOT, 'data/engine-state.json')
const MCX_CACHE_FILE  = path.join(ROOT, 'data/mcx-last-prices.json')
const ARTICLES_DIR    = path.join(ROOT, 'content/articles')
const EVENTS_DIR       = path.join(ROOT, 'content/events')
const EVENT_MAP_FILE   = path.join(ROOT, 'data/event-map.json')
const TITLE_FILE      = path.join(ROOT, 'data/last-article-title.txt')
const IMPACT_MAP_FILE = path.join(ROOT, 'data/impact-map.json')

// ── Impact Map — persistent knowledge base ───────────────────────────────────
let _impactMap = null
function loadImpactMap() {
  if (_impactMap) return _impactMap
  try { _impactMap = JSON.parse(fs.readFileSync(IMPACT_MAP_FILE, 'utf8')) }
  catch { _impactMap = { events: {}, commodities: {} } }
  return _impactMap
}

// ── Analyst KB — structural knowledge base ────────────────────────────────────
const ANALYST_KB_FILE = path.join(ROOT, 'data/analyst-kb.json')
let _analystKb = null
function loadAnalystKb() {
  if (_analystKb) return _analystKb
  try { _analystKb = JSON.parse(fs.readFileSync(ANALYST_KB_FILE, 'utf8')) }
  catch { _analystKb = {} }
  return _analystKb
}

function getAnalystContext(commodityKey, geoTopics = []) {
  const kb = loadAnalystKb()
  if (!kb || Object.keys(kb).length === 0) return ''

  const sections = []

  // Map engine commodity keys to KB keys
  const commodityMap = { crude: 'crude', gold: 'gold', silver: 'silver', copper: 'copper', natgas: 'natgas' }
  const kbKey = commodityMap[commodityKey]

  if (kbKey && kb[kbKey]) {
    const c = kb[kbKey]
    const lines = []
    // Flatten all nested string values from the commodity section
    for (const [section, content] of Object.entries(c)) {
      if (typeof content === 'object') {
        for (const [, val] of Object.entries(content)) {
          if (typeof val === 'string') lines.push(val)
        }
      } else if (typeof content === 'string') {
        lines.push(content)
      }
    }
    if (lines.length > 0) sections.push(`${kbKey.toUpperCase()} STRUCTURAL KNOWLEDGE:\n${lines.join('\n')}`)
  }

  // Geopolitical playbook — matched to detected geo topics
  const geoPlaybooks = kb.geopolitical_playbooks ?? {}
  const topicMap = { iran: 'iran_hormuz', opec: 'opec_discipline', russia: 'russia_ukraine', mideast: 'iran_hormuz', red_sea: 'red_sea_suez' }
  const injectedPlaybooks = new Set()
  for (const topic of geoTopics) {
    const playbookKey = topicMap[topic]
    if (playbookKey && geoPlaybooks[playbookKey] && !injectedPlaybooks.has(playbookKey)) {
      const pb = geoPlaybooks[playbookKey]
      const lines = Object.values(pb).filter(v => typeof v === 'string')
      if (lines.length > 0) sections.push(`GEOPOLITICAL PLAYBOOK — ${playbookKey.replace(/_/g, ' ').toUpperCase()}:\n${lines.join('\n')}`)
      injectedPlaybooks.add(playbookKey)
    }
  }

  // Always inject macro regime context
  const macro = kb.macro_regimes
  if (macro) {
    const macroLines = [
      macro.current_regime,
      macro.regime_signal_checklist,
      macro.india_overlay,
    ].filter(Boolean)
    if (macroLines.length > 0) sections.push(`MACRO REGIME CONTEXT:\n${macroLines.join('\n')}`)
  }

  // Correlation regime for the commodity
  const corrMap = { gold: 'gold_dollar', silver: 'gold_silver', copper: 'copper_china', crude: 'crude_real_rates', natgas: 'crude_real_rates' }
  const corrKey = corrMap[commodityKey]
  const corrRegimes = kb.correlation_regimes ?? {}
  if (corrKey && corrRegimes[corrKey]) {
    const cr = corrRegimes[corrKey]
    const lines = Object.values(cr).filter(v => typeof v === 'string')
    if (lines.length > 0) sections.push(`CORRELATION REGIME — ${corrKey.replace(/_/g, '-').toUpperCase()}:\n${lines.join('\n')}`)
  }

  if (sections.length === 0) return ''
  return `\nANALYST STRUCTURAL KNOWLEDGE (connect dots — use specific facts, not generic language):\n${sections.join('\n\n')}\n`
}

function getEventContext(headlines, commodityKey) {
  const map = loadImpactMap()
  const text = (Array.isArray(headlines) ? headlines.join(' ') : headlines).toLowerCase()

  // Match event type by keywords
  const matchedEvents = Object.entries(map.events ?? {})
    .filter(([, ev]) => (ev.keywords ?? []).some(kw => text.includes(kw)))
    .slice(0, 2)

  // Always include the primary commodity context
  const commodityCtx = map.commodities?.[commodityKey]

  const sections = []

  for (const [eventKey, ev] of matchedEvents) {
    const mechanismText = Object.entries(ev.mechanism ?? {})
      .map(([k, v]) => `  ${k.toUpperCase()}: ${v}`)
      .join('\n')

    const affectedText = Object.entries(ev.india_affected ?? {})
      .map(([sector, detail]) => `  ${sector}: ${detail}`)
      .join('\n')

    sections.push(`EVENT TYPE: ${eventKey.replace(/_/g, ' ').toUpperCase()}
TRANSMISSION MECHANISM:
${mechanismText}
INDIA AFFECTED (name these specifically, don't generalise):
${affectedText}
HISTORICAL PRECEDENTS: ${ev.historical_moves ?? 'none on record'}
REVERSAL TRIGGER: ${ev.reversal_trigger ?? 'unknown'}`)
  }

  if (commodityCtx) {
    sections.push(`COMMODITY KNOWLEDGE — ${commodityKey.toUpperCase()}:
Contract: ${commodityCtx.mcx_contract ?? ''}
Transmission: ${commodityCtx.transmission ?? ''}
India context: ${commodityCtx.india_context ?? commodityCtx.india_demand ?? ''}
Price mechanism: ${commodityCtx.india_price_mechanism ?? ''}`)
  }

  return sections.length > 0
    ? `\nENGINE KNOWLEDGE BASE (use these specific facts — do not invent different ones):\n${sections.join('\n\n')}\n`
    : ''
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MOVE_THRESHOLD        = 1.0   // % — detection threshold (not trigger)
const MOVE_THRESHOLD_HARD   = 2.0   // % — triggers article (live Kite only)
const HAWK_SCAN_THRESHOLD   = 3.0   // % — triggers Hawk-Scan (highest urgency)
const MAX_ARTICLES_PER_DAY  = 4     // hard daily cap — quality over quantity
const MIN_MINUTES_BETWEEN   = 90    // minimum gap between any two articles

// ── News Source Whitelist ─────────────────────────────────────────────────────
// Only these publishers can trigger regulatory or geo articles.
// Google News RSS items carry <source url="..."> with the original publisher domain.
const CREDIBLE_DOMAINS = [
  'reuters.com', 'apnews.com', 'bloomberg.com', 'afp.com',
  'economictimes.indiatimes.com', 'livemint.com', 'business-standard.com',
  'thehindubusinessline.com', 'moneycontrol.com', 'financialexpress.com',
  'ndtv.com', 'cnbctv18.com', 'zeebiz.com',
  'sebi.gov.in', 'mcxindia.com', 'rbi.org.in', 'ppac.gov.in',
  'ft.com', 'wsj.com', 'oilprice.com',
]
function isCredibleSource(itemXml) {
  const m = itemXml.match(/<source[^>]+url="([^"]+)"/)
  return m ? CREDIBLE_DOMAINS.some(d => m[1].includes(d)) : false
}

// ── MCX price cache ───────────────────────────────────────────────────────────
// Written after every successful Kite fetch; read as prev-close fallback when Kite is down.
function loadMCXCache() {
  try { return JSON.parse(fs.readFileSync(MCX_CACHE_FILE, 'utf8')) }
  catch { return null }
}

function saveMCXCache(prices) {
  const cache = {
    ts:        new Date().toISOString(),
    gold:      prices.mcxGold   || null,
    goldPct:   prices.goldPct   ?? 0,
    silver:    prices.mcxSilver || null,
    silverPct: prices.silverPct ?? 0,
    crude:     prices.mcxCrude  || null,
    crudePct:  prices.crudePct  ?? 0,
    copper:    prices.mcxCopper || null,
    copperPct: prices.copperPct ?? 0,
    natgas:    prices.mcxNatGas || null,
    natgasPct: prices.gasPct    ?? 0,
  }
  // Only save if at least one price is non-zero (real Kite data)
  if (!Object.values(cache).some(v => typeof v === 'number' && v > 0)) return
  fs.writeFileSync(MCX_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8')
}

// ── Kite MCX Enrichment (live prices — primary MCX source) ──────────────────
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
      lastGeoNews: {},
      articlesToday: [],
      lastArticleAt: null,
    }
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

// ── 2. Price Fetching — Kite (live MCX) + Yahoo Finance COMEX + Frankfurter USD/INR ──
async function fetchPrices() {
  // USD/INR: Frankfurter primary, exchangerate-api fallback
  // Valid range ₹82–₹110; outside that treat as a fetch error
  let usdinr = 0
  const USDINR_MIN = 82, USDINR_MAX = 110
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
      signal: AbortSignal.timeout(6000),
    })
    if (r.ok) {
      const v = (await r.json()).rates?.INR ?? 0
      if (v >= USDINR_MIN && v <= USDINR_MAX) usdinr = v
    }
  } catch {}
  if (!usdinr) {
    try {
      const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        signal: AbortSignal.timeout(6000),
      })
      if (r.ok) {
        const v = (await r.json()).rates?.INR ?? 0
        if (v >= USDINR_MIN && v <= USDINR_MAX) usdinr = v
      }
    } catch {}
  }
  if (!usdinr) {
    console.error('USDINR fetch failed from both sources — aborting price derivation')
    return null
  }

  // COMEX / NYMEX futures via Yahoo Finance — gives us COMEX reference prices + % change
  const yahooSyms = {
    'GC=F': 'GC%3DF',   // COMEX Gold $/troy oz
    'SI=F': 'SI%3DF',   // COMEX Silver $/troy oz
    'CL=F': 'CL%3DF',   // NYMEX WTI Crude $/bbl
    'HG=F': 'HG%3DF',   // COMEX Copper $/lb
    'NG=F': 'NG%3DF',   // Henry Hub Nat Gas $/mmBtu
    'BZ=F': 'BZ%3DF',   // Brent (ICE)
  }

  const q = {}
  await Promise.all(
    Object.entries(yahooSyms).map(async ([key, sym]) => {
      try {
        const r = await fetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=2d`,
          { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
        )
        if (!r.ok) return
        const meta = (await r.json())?.chart?.result?.[0]?.meta
        if (!meta) return
        const price = meta.regularMarketPrice
        const prev  = meta.chartPreviousClose
        if (price > 0 && prev > 0) {
          const rawPct = ((price - prev) / prev) * 100
          // Moves >12% are almost certainly bad data — zero them out
          q[key] = { price, pct: Math.abs(rawPct) > 12 ? 0 : rawPct, prev }
        }
      } catch {}
    })
  )

  if (Object.keys(q).length === 0) {
    console.error('Price fetch failed: no Yahoo Finance data returned')
    return null
  }

  const comexGold = q['GC=F']?.price ?? 0
  const comexSilv = q['SI=F']?.price ?? 0
  const wti       = q['CL=F']?.price ?? 0
  const brent     = q['BZ=F']?.price ?? wti
  const comexCu   = q['HG=F']?.price ?? 0
  const henryHub  = q['NG=F']?.price ?? 0

  // MCX prices: Kite live only — no formula derivation. Zeros mean unavailable.
  const derived = {
    usdinr,
    comexGold, comexSilver: comexSilv, wti, brent, comexCopper: comexCu, henryHub,
    mcxGold:   0,
    mcxSilver: 0,
    mcxCrude:  0,
    mcxCopper: 0,
    mcxNatGas: 0,
    goldPct:   q['GC=F']?.pct  ?? 0,
    silverPct: q['SI=F']?.pct  ?? 0,
    crudePct:  q['CL=F']?.pct  ?? 0,
    copperPct: q['HG=F']?.pct  ?? 0,
    gasPct:    q['NG=F']?.pct  ?? 0,
    usdPct:    0,
    priceSource: 'comex-only',
  }

  // Enrich with actual Kite MCX live prices when available
  // Kite gives us real MCX contract prices + accurate intraday % from prev close
  const kite = await fetchKiteMCX()
  if (kite) {
    console.log('  Kite MCX live prices loaded')
    if (kite.gold   != null) { derived.mcxGold   = kite.gold;   if (kite.goldPct   != null) derived.goldPct   = kite.goldPct   }
    if (kite.silver != null) { derived.mcxSilver = kite.silver; if (kite.silverPct != null) derived.silverPct = kite.silverPct }
    if (kite.crude  != null) { derived.mcxCrude  = kite.crude;  if (kite.crudePct  != null) derived.crudePct  = kite.crudePct  }
    if (kite.copper != null) { derived.mcxCopper = kite.copper; if (kite.copperPct != null) derived.copperPct = kite.copperPct }
    if (kite.natgas != null) { derived.mcxNatGas = kite.natgas; if (kite.natgasPct != null) derived.gasPct    = kite.natgasPct }
    derived.priceSource = 'kite-live'
    saveMCXCache(derived)
  } else {
    // Kite unavailable — load prev-close cache so articles reference real prices
    const cache = loadMCXCache()
    if (cache) {
      derived.mcxGold   = cache.gold   ?? 0
      derived.mcxSilver = cache.silver ?? 0
      derived.mcxCrude  = cache.crude  ?? 0
      derived.mcxCopper = cache.copper ?? 0
      derived.mcxNatGas = cache.natgas ?? 0
      derived.priceSource = 'kite-cache'
    }
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
      const source = q.includes('SEBI') ? 'SEBI' : 'MCX'
      const stateKey = source.toLowerCase()
      // Parse first 3 items, only accept credible publishers
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 3)
      for (const [, itemXml] of items) {
        if (!isCredibleSource(itemXml)) continue
        const titleM = itemXml.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>|<title>([^<]{10,200})<\/title>/)
        const dateM  = itemXml.match(/<pubDate>([^<]+)<\/pubDate>/)
        if (!titleM) continue
        const title = (titleM[1] ?? titleM[2] ?? '').trim()
        if (!title) continue
        if (dateM) {
          const age = Date.now() - new Date(dateM[1]).getTime()
          if (age > 2 * 3600 * 1000) continue
        }
        const id = title.slice(0, 80)
        if (id !== lastCirculars[stateKey]) {
          newCirculars.push({ source, title, url: source === 'MCX' ? 'https://mcxindia.com' : 'https://sebi.gov.in' })
          lastCirculars[stateKey] = id
        }
        break
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
    const RBI_KEYWORDS = ['rupee', 'exchange rate', 'repo rate', 'monetary', 'inflation', 'forex', 'foreign exchange', 'liquidity', 'mpc']
    const rbiMatches = [...html.matchAll(/class="TableText"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/gs)].slice(0, 3)
    for (const m of rbiMatches) {
      const title = m[1].trim()
      const lc = title.toLowerCase()
      if (!RBI_KEYWORDS.some(kw => lc.includes(kw))) continue
      const id = title.slice(0, 80)
      if (id !== lastCirculars.rbi) {
        newCirculars.push({ source: 'RBI', title, url: 'https://rbi.org.in' })
        lastCirculars.rbi = id
        break
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

// ── 5. Geopolitical News Monitor ─────────────────────────────────────────────
const GEO_QUERIES = {
  iran:    'Iran+Israel+war+oil+crude+escalation',
  opec:    'OPEC+production+cut+crude+oil+supply',
  russia:  'Russia+Ukraine+energy+oil+sanctions',
  mideast: 'Middle+East+conflict+oil+tanker+Hormuz',
  gold:    'gold+war+safe+haven+geopolitical+central+bank',
  macro:   'Fed+inflation+dollar+commodity+rate',
}

const COMMODITY_KEYWORDS = [
  'oil', 'crude', 'gold', 'silver', 'copper', 'natural gas', 'lng',
  'opec', 'iran', 'russia', 'ukraine', 'sanctions', 'supply', 'refinery',
  'hormuz', 'pipeline', 'tanker', 'commodity', 'inflation', 'fed', 'dollar',
  'ceasefire', 'strike', 'attack', 'escalation', 'war',
]

async function checkGeoNews(lastGeoNews) {
  const newEvents = []
  const updatedLastGeoNews = { ...lastGeoNews }

  try {
    await Promise.all(
      Object.entries(GEO_QUERIES).map(async ([key, q]) => {
        try {
          const res = await fetch(
            `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`,
            { headers: { 'User-Agent': 'Mozilla/5.0 BhaavBrief/1.0' }, signal: AbortSignal.timeout(8000) }
          )
          const xml = await res.text()
          const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 5)

          for (const [, itemXml] of items) {
            if (!isCredibleSource(itemXml)) continue
            const titleM = itemXml.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>|<title>([^<]{10,200})<\/title>/)
            const dateM  = itemXml.match(/<pubDate>([^<]+)<\/pubDate>/)
            if (!titleM) continue

            const title = (titleM[1] ?? titleM[2] ?? '').trim()
            if (!title) continue

            // Only articles published within last 2 hours
            if (dateM) {
              const age = Date.now() - new Date(dateM[1]).getTime()
              if (age > 2 * 3600 * 1000) continue
            }

            // Must contain at least one commodity-relevant keyword
            const lc = title.toLowerCase()
            if (!COMMODITY_KEYWORDS.some(kw => lc.includes(kw))) continue

            const id = title.slice(0, 80)
            if (id === lastGeoNews[key]) continue

            newEvents.push({ id, title, topic: key })
            updatedLastGeoNews[key] = id
            break // one new event per topic per run
          }
        } catch {}
      })
    )
  } catch (err) {
    console.warn('Geo news RSS failed:', err.message)
  }

  // Deduplicate by id across topics
  const seen = new Set()
  const deduped = newEvents.filter(e => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  return { newGeoEvents: deduped, updatedLastGeoNews }
}

// ── 6. EIA Crude Inventory Monitor ───────────────────────────────────────────
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
    const isSignificant = Math.abs(changeBarrels) > 2_000_000

    let natGas = null
    try {
      const ngUrl = `https://api.eia.gov/v2/natural-gas/stor/wkly/data/?api_key=${process.env.EIA_API_KEY}&frequency=weekly&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=2`
      const ngRes = await fetch(ngUrl, { signal: AbortSignal.timeout(10000) })
      const ngData = await ngRes.json()
      const ngLatest = ngData?.response?.data?.[0]
      const ngPrev   = ngData?.response?.data?.[1]
      if (ngLatest && ngPrev) {
        const changeBcf = ngLatest.value - ngPrev.value
        natGas = {
          period: ngLatest.period,
          changeBcf,
          isSignificant: Math.abs(changeBcf) > 80,
          direction: changeBcf < 0 ? 'draw' : 'build',
          summary: `EIA nat gas storage: ${changeBcf < 0 ? 'draw' : 'build'} of ${Math.abs(changeBcf).toFixed(0)} Bcf for week of ${ngLatest.period}`,
        }
      }
    } catch (err) {
      console.warn('EIA nat gas fetch failed:', err.message)
    }

    return {
      period, value, changeBarrels, isSignificant,
      direction: changeBarrels < 0 ? 'draw' : 'build',
      summary: `EIA weekly crude inventory: ${changeBarrels < 0 ? 'draw' : 'build'} of ${Math.abs(changeBarrels / 1_000_000).toFixed(1)}M barrels for week of ${period}`,
      natGas,
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
async function generateHawkScan({ moves, eia, prices, technicalLevels, geoEvents = [] }) {
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

  const eiaBlock = eia ? `\nEIA DATA: ${eia.summary}\nSIGNIFICANT: ${eia.isSignificant ? 'YES (>1M bbls)' : 'no'} | Direction: ${eia.direction.toUpperCase()}${eia.natGas ? `\nNAT GAS STORAGE: ${eia.natGas.summary} | Significant: ${eia.natGas.isSignificant ? 'YES (>80 Bcf)' : 'no'}` : ''}` : ''
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

  const impactContext = getEventContext(
    [hawkTrigger, eia?.summary ?? ''].join(' '),
    primaryMove?.key ?? 'crude'
  )
  const analystContext = getAnalystContext(primaryMove?.key ?? 'crude', geoEvents.map(e => e.topic))

  const prompt = `You are BhaavBrief's Hawk-Scan system — India's highest-urgency commodity intelligence format for MCX traders.

A HAWK-SCAN fires only on extreme market events (>3% move or major EIA data). This is one.

TIME: ${timeStr} IST, ${dateStr}
HAWK TRIGGER: ${hawkTrigger}

PRICE MOVES:
${moveBlock}

CURRENT PRICES [${dataLabel}, USD/INR ₹${prices.usdinr?.toFixed(2)}]:
${priceLines.join('\n')}
${eiaBlock}${techBlock}${impactContext}${analystContext}
SEBI COMPLIANCE — NON-NEGOTIABLE:
- BANNED words directed at reader: buy, sell, accumulate, avoid, exit, enter, hold, act
- No price targets. Historical patterns only: "In past supply shocks, crude rose 8–12%" ✓
- Technical levels are observations: "Price broke ₹74,000 for the first time in 6 weeks" ✓ | "Strong support, accumulate" ✗

RETURN EXACTLY THIS STRUCTURE — no extra prose, no section reordering:

---
title: "[HAWK-SCAN] [Commodity]: [What happened + key level] — under 70 chars. BANNED: act, buy, sell, enter, exit, trade, now, urgent, alert"
description: "Under 155 chars. Include ₹ price and the specific trigger."
date: "${today.toISOString()}"
time: "${timeStr}"
edition: "hawk-scan"
commodity: "${primaryMove?.label ?? 'macro'}"
tags: ["${tags}"]
priceAtPublish: ${Math.round(primaryMove?.price ?? 0)}
slug: "hawk-scan-[commodity-keyword]-[date-YYYYMMDD]"
hawkTrigger: "${moves[0]?.absPct >= HAWK_SCAN_THRESHOLD ? 'price' : eia?.isSignificant ? 'eia' : 'extreme'}"
---

TRIGGER — One sentence. The exact event that fired this scan — the number, the commodity, the direction.
BAD: "Significant selling pressure has emerged across the commodity complex amid global risk-off sentiment."
GOOD: "MCX Crude has fallen **3.4%** to **₹8,430/bbl** as OPEC+ announced a surprise production increase of 400,000 bpd."

PRICE — ₹[exact level] · [exact % change] · [one word: SURGING / PLUNGING / SPIKING]

SIGNAL — One sentence. Name the specific real-world cause — the policy decision, the data print, the supply event, the geopolitical trigger. Not "dollar strength" alone — say what drove the dollar. Not "risk-off" — say what the risk actually is.
BAD: "The move is driven by global macro headwinds and risk-off positioning."
GOOD: "The US Federal Reserve signalled rates will stay high for longer after CPI came in at **3.4%** vs **3.1%** expected, cutting rate-cut bets from 2 to 1 for 2025."

TWIST — One sentence contrarian signal. Historical framing only (SEBI). Do NOT start with "The twist:" — the section label already says TWIST; starting the sentence with it doubles the label.
BAD: "The twist: gold is falling into an escalation — historically..."
GOOD: "Gold is falling INTO a live escalation — historically, the metal holds or rises in the first 48 hours of geopolitical shock; a breakdown here signals institutional rebalancing, not receding fear."
BAD: "The twist: OPEC spare capacity at 3.2mb/d historically caps rallies."
GOOD: "OPEC spare capacity at **3.2mb/d** has historically triggered member quota cheating within 6–8 weeks whenever crude has sustained above **$95** — every prior spike above this level since 2022 reversed within two months."

CROSS-ASSET — One sentence. Name at least two other assets and their exact moves right now. Show the direction and magnitude.
BAD: "Other commodities are also under pressure amid broad risk-off sentiment."
GOOD: "MCX Gold is down **1.2% to ₹1,51,200/10g** while the dollar index rose **0.6%** to 104.8 — metals and energy moving together."

IMPORT COST — One line of real arithmetic: [COMEX/benchmark price] × [USD/INR rate] × [duty factor if applicable] = ₹[MCX parity]. For crude: WTI $X × ₹${prices.usdinr?.toFixed(2)} ÷ 159 litres × 1.025 (customs) = ₹Y/litre or ₹Z/bbl.

TECHNICAL — One sentence. Use exact numbers from the OHLC data above. Name the level and how many times price has tested it.
If no OHLC available, say "No intraday OHLC data — nearest round-number [support/resistance] at ₹X."

WATCH — One specific price level OR one data release in the next 48 hours that confirms or negates this move.

Total body: 80–130 words across all sections. Each section: one sentence or one line only.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : null
}

// ── 6b. Article Generator ─────────────────────────────────────────────────────
async function generateArticle({ moves, circulars, eia, prices, technicalLevels, geoEvents = [] }) {
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

  const geoBlock = geoEvents.length > 0
    ? `MACRO/GEOPOLITICAL CONTEXT (background only — do NOT write a geo article, write about the price move):\n${geoEvents.slice(0, 2).map(e => `- ${e.title}`).join('\n')}`
    : ''

  const eiaBlock = eia ? `EIA CRUDE DATA: ${eia.summary}${eia.natGas ? ` | NAT GAS: ${eia.natGas.summary}` : ''}` : ''

  // Technical levels for the primary triggered commodity
  const techBlock = technicalLevels
    ? `\n${technicalLevels}\n`
    : ''

  const commodity = primaryMove?.label ?? 'commodities'
  const tags = [...new Set(moves.map(m => m.label))].slice(0, 4).join('", "')

  const impactContext = getEventContext(
    [narrative, circularBlock, eiaBlock].filter(Boolean).join(' '),
    primaryMove?.key ?? 'crude'
  )
  const analystContext = getAnalystContext(primaryMove?.key ?? 'crude', geoEvents.map(e => e.topic))

  const prompt = `You are BhaavBrief's market reporter. Write a flash intelligence article for Indian commodity traders and merchants.

TRIGGERED AT: ${timeStr} IST, ${dateStr}
SESSION: ${session.toUpperCase()} — ${SESSION_FOCUS[session]}

WHAT FIRED THIS ARTICLE:
${moveBlock}

MCX PRICES [${prices.priceSource === 'kite-live' ? 'LIVE MCX' : 'ESTIMATED'}, USD/INR ₹${prices.usdinr?.toFixed(2)}]:
${priceBlock}

CONTEXT: ${narrative}
${circularBlock ? '\nNEW REGULATORY SIGNAL:\n' + circularBlock : ''}${eiaBlock ? '\n' + eiaBlock : ''}${geoBlock ? '\n' + geoBlock : ''}${techBlock}${impactContext}${analystContext}
SEBI COMPLIANCE — NON-NEGOTIABLE (educational content only, not investment advice):
- BANNED words directed at reader: buy, sell, accumulate, avoid, exit, enter, hold, switch, book profits
- No price targets: "In past dollar-strength episodes, MCX gold fell 2–4%" ✓ | "MCX gold will fall to ₹X" ✗
- Technical levels are observations: "Gold has held ₹74,000 four times" ✓ | "Strong support, consider buying" ✗

WRITE IN THIS EXACT STRUCTURE with 5 bold-header sections. Each section must have substance — 2–3 sentences minimum per section:

**WHAT HAPPENED**
2–3 sentences. Open with the insight this move reveals — the price and % are evidence, not the lead. Name the specific real-world catalyst (named event, data print, policy decision). Never "macro headwinds" or "risk-off" without naming the exact cause.
BAD: "MCX Silver is down 2.84% to ₹228,230/kg following global macro weakness."
GOOD: "Silver is selling off twice as hard as gold — **MCX Silver down 2.84% to ₹228,230/kg** while gold lost half that — which means the market is liquidating silver-specific industrial positions, not fleeing commodities broadly. The trigger was Friday's US PCE print at **2.8%** vs **2.6%** expected, resetting Fed rate-cut timelines from September to December."

**WHAT IT MEANS**
2–3 sentences. Explain the transmission mechanism from the global trigger to MCX prices. Include import parity arithmetic where relevant (COMEX price × USD/INR × duty factor = MCX parity). What does the rest of the commodity complex confirm or contradict about this move?

**WHO IS AFFECTED**
2–3 sentences. Name at least one specific Indian company, sector, or market participant and the concrete operational consequence — what decision does this force, delay, or change for them? Not a cost calculation in crores — a business or procurement decision.
BAD: "Waaree Energies faces higher input costs of approximately ₹X crore."
GOOD: "Waaree Energies, which locks in silver-paste procurement quarterly, faces a decision: at ₹228,230/kg, fresh forward contracts this week mean betting the selloff continues, while waiting risks locking in at higher levels if silver recovers."

**BOTTOM LINE**
1–2 sentences. The single most important structural takeaway — what changed that wasn't true yesterday? Not what moved, but what the move tells us about the market regime or an underlying trend.

**WHAT TO WATCH**
1–2 sentences. One specific price level OR one upcoming data release (name the exact event, exact timing in IST) — and precisely why it confirms or negates this particular move.
BAD: "Watch ₹74,000 support on MCX Gold."
GOOD: "Watch COMEX silver **$62/oz** — the last time it closed below this level in Jan 2026, MCX silver followed with a 5-session, 8% decline; a close above tonight keeps this as a one-day event."

TOTAL: 270–380 words across all sections. Use **bold** only for key numbers (₹ prices, percentages, company names, named thresholds). Never bold whole sentences or the section headers themselves (they already render bold from the **).

SEO:
- Title: commodity + specific action + key reason (under 65 chars, include "MCX")
- Description: under 155 chars, ₹ price + key reason
- Slug: lowercase hyphens, max 8 words

RETURN ONLY valid MDX frontmatter + article body with the 5 sections:

---
title: "[under 65 chars]"
description: "[under 155 chars]"
date: "${today.toISOString()}"
time: "${timeStr}"
edition: "flash"
commodity: "${primaryMove?.label ?? 'macro'}"
tags: ["${tags}"]
priceAtPublish: ${Math.round(primaryMove?.price ?? 0)}
slug: "[url-slug-max-8-words]"
source: "BhaavBrief Intelligence"
---

**WHAT HAPPENED**
[content]

**WHAT IT MEANS**
[content]

**WHO IS AFFECTED**
[content]

**BOTTOM LINE**
[content]

**WHAT TO WATCH**
[content]

Source: BhaavBrief Intelligence | bhaavbrief.in`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1100,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : null
}

// ── 6c. Geo Article Generator ─────────────────────────────────────────────────
async function generateGeoArticle({ geoEvents, prices }) {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

  const dataLabel = prices.priceSource === 'kite-live' ? 'LIVE MCX DATA' : 'COMEX-DERIVED ESTIMATES'
  const priceBlock = [
    `CURRENT MCX PRICES [${dataLabel}, ${timeStr} IST, USD/INR ₹${prices.usdinr?.toFixed(2)}]:`,
    `- MCX Gold:   ₹${prices.mcxGold?.toFixed(0) ?? 'N/A'}/10g    (COMEX: $${prices.comexGold?.toFixed(0)}/oz, session: ${prices.goldPct?.toFixed(2) ?? '0.00'}%)`,
    `- MCX Silver: ₹${prices.mcxSilver?.toFixed(0) ?? 'N/A'}/kg   (COMEX: $${prices.comexSilver?.toFixed(2)}/oz, session: ${prices.silverPct?.toFixed(2) ?? '0.00'}%)`,
    `- MCX Crude:  ₹${prices.mcxCrude?.toFixed(0) ?? 'N/A'}/bbl   (WTI: $${prices.wti?.toFixed(2)}, Brent: $${prices.brent?.toFixed(2)}, session: ${prices.crudePct?.toFixed(2) ?? '0.00'}%)`,
    `- MCX Copper: ₹${prices.mcxCopper?.toFixed(2) ?? 'N/A'}/kg   (COMEX: $${prices.comexCopper?.toFixed(2)}/lb, session: ${prices.copperPct?.toFixed(2) ?? '0.00'}%)`,
    `- MCX NatGas: ₹${prices.mcxNatGas?.toFixed(2) ?? 'N/A'}/mmBtu (Henry Hub: $${prices.henryHub?.toFixed(2)}, session: ${prices.gasPct?.toFixed(2) ?? '0.00'}%)`,
  ].join('\n')

  const headlines = geoEvents.slice(0, 3).map(e => `- ${e.title}`).join('\n')

  // Determine primary commodity from headline content
  const allText = geoEvents.map(e => e.title.toLowerCase()).join(' ')
  const primaryKey  = allText.includes('gold') ? 'gold'
    : allText.includes('copper') ? 'copper'
    : 'crude'
  const primaryLabel = { gold: 'MCX Gold', silver: 'MCX Silver', crude: 'MCX Crude', copper: 'MCX Copper', natgas: 'MCX NatGas' }[primaryKey]
  const primaryPrice = { gold: prices.mcxGold, crude: prices.mcxCrude, copper: prices.mcxCopper }[primaryKey] ?? 0

  const impactContext = getEventContext(geoEvents.map(e => e.title), primaryKey)
  const analystContext = getAnalystContext(primaryKey, geoEvents.map(e => e.topic))

  const prompt = `You are BhaavBrief's market reporter. Write a macro-context intelligence article for Indian commodity traders.

A geopolitical or macro event is breaking that directly affects MCX prices.

TIME: ${timeStr} IST, ${dateStr}

BREAKING NEWS HEADLINES:
${headlines}
${impactContext}${analystContext}

${priceBlock}

SEBI COMPLIANCE — NON-NEGOTIABLE:
- BANNED words directed at reader: buy, sell, accumulate, avoid, exit, enter, hold, switch, book profits
- No price targets. Historical precedents only: "In past Iran escalations, crude rose 4–8% over 3 sessions" ✓
- Technical levels are observations only: "Crude is testing ₹9,000 resistance" ✓ | "Strong support, accumulate" ✗

WRITE IN THIS EXACT STRUCTURE with 5 bold-header sections. Each section must have substance — 2–3 sentences minimum per section:

**WHAT HAPPENED**
2–3 sentences. State the geopolitical/macro event precisely — what, where, when. This must be a hook with stakes or consequences, not a price recap.
GOOD: "Iran launched drone strikes on Iraqi Kurdish oil fields late Tuesday, raising the first credible supply disruption threat in the Basra corridor since 2022."
BAD: "MCX Crude opened at ₹9,022, up 4.74%, following geopolitical developments in the Middle East."

**WHAT IT MEANS**
2–3 sentences. Explain the specific transmission mechanism — how this event moves through to MCX prices (Hormuz risk → crude premium; safe-haven bid → gold; demand outlook → copper). Include what the rest of the commodity complex confirms or contradicts. State the historical precedent range: "In past Hormuz threats, crude has risen 4–8% over 3 sessions before fading."

**WHO IS AFFECTED**
2–3 sentences. Name specific Indian companies, refiners, airlines, jewellers, or merchants and the concrete consequence — what operational decision does this force or delay? Not a cost calculation in crores — a procurement, hedging, or pricing decision.
GOOD: "HPCL's refining margin desk faces a choice between locking in forward crude purchases at current elevated prices or waiting on the assumption that geopolitical premium fades — at ₹9,000+/bbl, every week of delay risks a fortnightly fuel price revision."

**BOTTOM LINE**
1–2 sentences. The single most important structural takeaway — what the event reveals about the supply/demand balance or policy environment that wasn't visible yesterday.

**WHAT TO WATCH**
1–2 sentences. One specific trigger — a ceasefire signal, a price level breach, or a named scheduled data release — that would reverse or confirm this move. Include exact timing where possible.

TOTAL: 270–380 words. Use **bold** only for key numbers (₹ prices, percentages, company names, named thresholds). Never bold whole sentences or the section headers.

SEO:
- Title: event + commodity + MCX implication (under 65 chars, include "MCX")
- Description: under 155 chars, include the event name and price impact
- Slug: lowercase hyphens, max 8 words, include the event keyword (e.g. iran-strike, opec-cut)

RETURN ONLY valid MDX frontmatter + article body with the 5 sections:

---
title: "[under 65 chars]"
description: "[under 155 chars]"
date: "${today.toISOString()}"
time: "${timeStr}"
edition: "flash"
commodity: "${primaryLabel}"
tags: ["Geopolitical", "${primaryLabel}", "MCX"]
priceAtPublish: ${Math.round(primaryPrice)}
slug: "[url-slug-max-8-words]"
source: "BhaavBrief Intelligence"
---

**WHAT HAPPENED**
[content]

**WHAT IT MEANS**
[content]

**WHO IS AFFECTED**
[content]

**BOTTOM LINE**
[content]

**WHAT TO WATCH**
[content]

Source: BhaavBrief Intelligence | bhaavbrief.in`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1100,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : null
}

// ── 8. Compliance Scan ────────────────────────────────────────────────────────
const COMPLIANCE_BANNED = [
  'buy', 'sell', 'accumulate', 'avoid', 'exit', 'enter position',
  'book profits', 'stop loss', 'target price', 'price target',
]
function complianceScan(mdx) {
  const body = mdx.split('---').slice(2).join('---').toLowerCase()
  return COMPLIANCE_BANNED.filter(w => new RegExp(`\\b${w.replace(/ /g, '\\s+')}\\b`).test(body))
}

// ── 8b. Ratio Sanity Check ────────────────────────────────────────────────────
// Catches AI hallucinated ratio values (e.g. stating GSR=84x when COMEX data gives 65x).
// Non-blocking — logs warnings but does not suppress the article.
function ratioSanityCheck(mdx, prices) {
  const warnings = []
  const body = mdx.split('---').slice(2).join('---')

  if (prices.comexGold > 0 && prices.comexSilver > 0) {
    const actualGSR = prices.comexGold / prices.comexSilver

    // Match "84x", "~84x", "84:1", "ratio sits near 84", "GSR at 84"
    const gsrRe = /(?:gold[- ](?:to[- ])?silver\s+ratio|GSR|ratio)[^.]{0,40}?[\s~≈(](\d{2,3}(?:\.\d+)?)\s*[x:×]/gi
    let m
    while ((m = gsrRe.exec(body)) !== null) {
      const stated = parseFloat(m[1])
      if (Math.abs(stated - actualGSR) > 5) {
        warnings.push(
          `GSR stated as ~${stated.toFixed(0)}x but COMEX data gives ${actualGSR.toFixed(1)}x` +
          ` ($${prices.comexGold?.toFixed(0) ?? '?'}/$${prices.comexSilver?.toFixed(2) ?? '?'})`
        )
      }
    }
  }

  return warnings
}

// ── Bold post-processor (mirrors generate-brief.js) ──────────────────────────
function applyBodyBold(mdx) {
  const fmEnd = mdx.indexOf('\n---\n', mdx.indexOf('---') + 3)
  if (fmEnd === -1) return mdx
  const frontmatter = mdx.slice(0, fmEnd + 5)
  const body        = mdx.slice(fmEnd + 5)

  const boldedBody = body.split('\n').map(line => {
    if (
      line.startsWith('#') || line.startsWith('|') ||
      line.startsWith('*BhaavBrief') || line.startsWith('```') ||
      line.trim() === '' || line.startsWith('---')
    ) return line

    const result = []
    const boldRe = /\*\*[^*]+\*\*/g
    let last = 0, m
    while ((m = boldRe.exec(line)) !== null) {
      if (m.index > last) result.push({ raw: line.slice(last, m.index), process: true })
      result.push({ raw: m[0], process: false })
      last = m.index + m[0].length
    }
    if (last < line.length) result.push({ raw: line.slice(last), process: true })

    return result.map(seg => {
      if (!seg.process) return seg.raw
      return seg.raw
        .replace(/₹[\d,]+(?:\.\d+)?(?:\/(?:10g|kg|bbl|mmBtu|oz|lb))?/g, '**$&**')
        .replace(/\$[\d,]+(?:\.\d+)?(?:\/(?:oz|bbl|lb|mmBtu|barrel))?/g, '**$&**')
        .replace(/[+-]?\d+\.\d+%/g, '**$&**')
    }).join('')
  }).join('\n')

  return frontmatter + boldedBody
}

// ── 8. Save Article as MDX ────────────────────────────────────────────────────
function saveArticle(mdx) {
  if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true })

  const slugMatch  = mdx.match(/^slug:\s*"?([^"\n]+)"?/m)
  const titleMatch = mdx.match(/^title:\s*"([^"]+)"/m)

  const today = new Date().toISOString().split('T')[0]
  // Build slug deterministically from date + title — never from Claude's slug field.
  // Claude writes month names with capital letters (22May2026) which the lowercase
  // regex then strips to "22-ay2026". Generating from title avoids this entirely.
  const titleForSlug = (titleMatch?.[1] ?? 'market-update')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const slugRaw = `${today}-${titleForSlug}`
  const slug    = slugRaw.length <= 75 ? slugRaw : (() => { const c = slugRaw.slice(0, 75); const d = c.lastIndexOf('-'); return d > 30 ? c.slice(0, d) : c })()

  const filepath = path.join(ARTICLES_DIR, `${slug}.mdx`)
  if (fs.existsSync(filepath)) {
    console.warn('Article already exists:', filepath)
    return null
  }

  const cleanMdx = applyBodyBold(
    mdx
      .replace(/^```[a-z]*\n/m, '')       // strip any leading code fence (```yaml, ```mdx, etc.)
      .replace(/\n```\s*$/, '')           // strip trailing code fence
      .replace(/^```\s*$/gm, '')          // strip bare ``` lines anywhere in body
      .replace(/^slug:.*$/m, '')
      .replace(/^(title:\s*["']?)\[HAWK-SCAN\]\s*/m, '$1')  // [HAWK-SCAN] prefix is internal; edition:hawk-scan marks it
      .trim()
  )
  fs.writeFileSync(filepath, cleanMdx, 'utf8')

  const title = titleMatch?.[1] ?? 'Market Update'
  fs.writeFileSync(TITLE_FILE, title, 'utf8')

  console.log(`Article saved: ${filepath}`)
  return { filepath, slug, title }
}

// ── 7a. Event Result Pages ─────────────────────────────────────────────────────
// When a scheduled event we track in event-map.json fires (currently: EIA
// crude/nat-gas storage — the only cadence_type:'rule_based' events with an
// automatic, verifiable firing signal), publish a permanent /events/[slug]
// page capturing the result + MCX price at print + the mechanism, pulled
// straight from event-map.json's description_educational field. This runs
// alongside (not instead of) the regular article/hawk-scan.
let _eventMap = null
function loadEventMap() {
  if (_eventMap) return _eventMap
  try { _eventMap = JSON.parse(fs.readFileSync(EVENT_MAP_FILE, 'utf8')).events ?? [] }
  catch { _eventMap = [] }
  return _eventMap
}

function publishEventResultPage({ eventId, date, result, commodity, mcxPrice, mcxChangePct, relatedArticleSlug }) {
  const eventDef = loadEventMap().find(e => e.id === eventId)
  if (!eventDef) { console.warn(`  Event page skipped — no event-map entry for "${eventId}"`); return }

  const dateStr = date.slice(0, 10)
  const slug    = `${eventId.replace(/_/g, '-')}-${dateStr}`
  const filepath = path.join(EVENTS_DIR, `${slug}.mdx`)
  if (fs.existsSync(filepath)) return // already published for this event+date

  const title       = `${eventDef.name} — ${new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  const direction    = mcxChangePct >= 0 ? 'up' : 'down'
  const description = `${result} MCX ${commodity === 'natgas' ? 'Natural Gas' : commodity[0].toUpperCase() + commodity.slice(1)} moved ${direction} ${Math.abs(mcxChangePct).toFixed(2)}% to ₹${mcxPrice} at time of print.`.slice(0, 300)

  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"
eventId: "${eventId}"
eventName: "${eventDef.name.replace(/"/g, '\\"')}"
commodity: "${commodity}"
date: "${date}"
result: "${result.replace(/"/g, '\\"')}"
mcxPrice: ${mcxPrice}
mcxChangePct: ${mcxChangePct}
mechanism: "${eventDef.description_educational.replace(/"/g, '\\"')}"
${relatedArticleSlug ? `relatedArticleSlug: "${relatedArticleSlug}"` : ''}
published: true
---
`

  if (!fs.existsSync(EVENTS_DIR)) fs.mkdirSync(EVENTS_DIR, { recursive: true })
  fs.writeFileSync(filepath, frontmatter, 'utf8')
  console.log(`  Event result page published: content/events/${slug}.mdx`)
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

  // No articles midnight–9 AM IST. Let markets open first.
  const istHour = new Date(Date.now() + 5.5 * 3600 * 1000).getUTCHours()
  if (istHour >= 0 && istHour < 9) {
    console.log(`Pre-market blackout (${istHour}:xx IST) — engine sleeping until 9 AM`)
    return
  }

  const state = loadState()

  if (!state.lastChecked) {
    console.log('First run — seeding prices, no articles triggered')
    const prices = await fetchPrices()
    if (prices && prices.priceSource === 'kite-live') {
      state.lastPrices = {
        gold: prices.mcxGold, silver: prices.mcxSilver, crude: prices.mcxCrude,
        copper: prices.mcxCopper, natgas: prices.mcxNatGas, usdinr: prices.usdinr,
      }
    }
    state.lastChecked = new Date().toISOString()
    saveState(state)
    console.log('Prices seeded. Engine will trigger articles on next run.')
    return
  }

  if (!canPublish(state)) {
    // Still fetch + track prices during throttle so 15-min deltas stay accurate
    const throttledPrices = await fetchPrices()
    if (throttledPrices && throttledPrices.priceSource === 'kite-live') {
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

  // Fetch prices + circulars + EIA + geo news in parallel
  // Each source is isolated — one failing never crashes the engine
  const [prices, circularResult, eiaData, geoResult] = await Promise.all([
    fetchPrices().catch(err => { console.warn('fetchPrices error:', err.message); return null }),
    checkCirculars(state.lastCirculars).catch(err => { console.warn('checkCirculars error:', err.message); return { newCirculars: [], updatedLastCirculars: state.lastCirculars } }),
    checkEIA(state.lastEia).catch(err => { console.warn('checkEIA error:', err.message); return null }),
    checkGeoNews(state.lastGeoNews ?? {}).catch(err => { console.warn('checkGeoNews error:', err.message); return { newGeoEvents: [], updatedLastGeoNews: state.lastGeoNews ?? {} } }),
  ])

  state.lastCirculars = circularResult.updatedLastCirculars
  const newCirculars  = circularResult.newCirculars
  state.lastGeoNews   = geoResult.updatedLastGeoNews
  const newGeoEvents  = geoResult.newGeoEvents

  if (eiaData) state.lastEia = { period: eiaData.period, value: eiaData.value }

  if (!prices) {
    console.warn('No price data — skipping this run')
    saveState(state)
    return
  }

  // Detect moves and build market narrative
  const allMoves   = detectMoves(prices, state.lastPrices)
  const narrative  = buildMarketNarrative(prices)
  const session    = getMarketSession()

  // Per-commodity cooldown: suppress a move if we already wrote about it within 6h
  // (hawk-scan level moves always override the cooldown)
  const COMMODITY_COOLDOWN_HOURS = 6
  const nowMs = Date.now()
  const moves = allMoves.filter(m => {
    if (m.absPct >= HAWK_SCAN_THRESHOLD) return true
    const lastAt = state.lastCoveredAt?.[m.key]
    if (!lastAt) return true
    return (nowMs - new Date(lastAt).getTime()) / 3_600_000 >= COMMODITY_COOLDOWN_HOURS
  })

  // Only update lastPrices from live Kite data — prevents clobbering with zeros
  if (prices.priceSource === 'kite-live') {
    state.lastPrices = {
      gold: prices.mcxGold, silver: prices.mcxSilver, crude: prices.mcxCrude,
      copper: prices.mcxCopper, natgas: prices.mcxNatGas, usdinr: prices.usdinr,
    }
  }
  state.lastChecked = new Date().toISOString()

  console.log(`Price source: ${prices.priceSource} | Session: ${session}`)
  console.log(`Market narrative: ${narrative}`)
  console.log(`Price moves (after cooldown): ${moves.length} / ${allMoves.length} total`)
  moves.forEach(m => console.log(`  ${m.label}: ${m.pct.toFixed(2)}% → ₹${m.price.toFixed(0)}`))
  console.log(`New circulars: ${newCirculars.length}`)
  newCirculars.forEach(c => console.log(`  [${c.source}] ${c.title.slice(0, 60)}`))
  console.log(`EIA data: ${eiaData ? eiaData.summary : 'none'}`)
  console.log(`Geo events: ${newGeoEvents.length}`)
  newGeoEvents.forEach(e => console.log(`  [${e.topic}] ${e.title.slice(0, 70)}`))

  // ── Trigger Logic ──────────────────────────────────────────────────────────
  // Rule 1 — HAWK-SCAN: ≥3% move (live Kite only) or major EIA draw/build (>2M bbl)
  // Rule 2 — FLASH: ≥2% move (live Kite only) — price speaks for itself, no signal needed
  // Rule 3 — REGULATORY: new MCX/SEBI/RBI circular + ≥1.5% move (live Kite only)
  //
  // Geo events are CONTEXT only — they are injected into article prompts but NEVER
  // trigger articles on their own. This eliminates "Rupee extends from 12 Jun"-style
  // low-quality geo-only posts that fire whenever there's any macro headline.
  const hawkMove    = moves.some(m => m.absPct >= HAWK_SCAN_THRESHOLD)
  const hardMove    = moves.some(m => m.isHard)
  const liveData    = prices.priceSource === 'kite-live'

  const isHawkEvent        = (hawkMove && liveData) || eiaData?.isSignificant
  const isPriceFlash       = hardMove && liveData
  const isRegulatorySignal = newCirculars.length > 0 && moves.some(m => m.absPct >= 1.5) && liveData
  const shouldPublish      = isHawkEvent || isPriceFlash || isRegulatorySignal

  if (!shouldPublish) {
    if (!liveData)           console.log('No live Kite data — holding')
    else if (!hardMove)      console.log('No qualifying price move (need ≥2%) — holding')
    else                     console.log('No trigger condition met — holding')
    saveState(state)
    return
  }

  if (isHawkEvent)      console.log('\nHAWK-SCAN TRIGGERED')
  else                  console.log('\nTRIGGER FIRED — generating article...')
  if (hawkMove)         console.log('  Reason: Extreme price move >3%')
  if (eiaData?.isSignificant) console.log('  Reason: Significant EIA inventory event (>2M bbl)')
  if (isPriceFlash && !isHawkEvent) console.log('  Reason: Hard move >2%')
  if (isRegulatorySignal)   console.log(`  Reason: Regulatory signal + price move — ${newCirculars[0]?.title?.slice(0, 60)}`)
  if (newGeoEvents.length > 0) console.log(`  Context: ${newGeoEvents[0]?.title?.slice(0, 70)} (geo context injected)`)

  // Fetch Kite historical OHLC for the top 2 triggered commodities to get real technical levels
  const instruments = loadInstruments()
  const KEY_MAP = { gold: 'gold', silver: 'silver', crude: 'crude', copper: 'copper', natgas: 'natgas' }
  const MCX_UNITS = { gold: '₹/10g', silver: '₹/kg', crude: '₹/bbl', copper: '₹/kg', natgas: '₹/mmBtu' }

  let technicalLevels = null
  if (instruments) {
    try {
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
        technicalLevels = `TECHNICAL LEVELS (MCX 20-day OHLC — use these exact numbers, do not invent levels):\n${validBlocks.join('\n')}`
        console.log(`  Technical levels fetched for: ${moves.slice(0, 2).map(m => m.label).join(', ')}`)
      }
    } catch (err) {
      console.warn('Technical levels fetch failed — article will proceed without them:', err.message)
    }
  }

  // Geo events are context only — passed into every article for narrative richness,
  // but never used as a standalone article trigger
  const mdx = isHawkEvent
    ? await generateHawkScan({ moves, eia: eiaData, prices, technicalLevels, geoEvents: newGeoEvents })
    : await generateArticle({ moves, circulars: newCirculars, eia: eiaData, prices, technicalLevels, geoEvents: newGeoEvents })

  if (!mdx || !mdx.includes('---') || !mdx.includes('title:')) {
    console.error('Invalid MDX generated — aborting')
    saveState(state)
    return
  }

  const bannedHits = complianceScan(mdx)
  if (bannedHits.length > 0) {
    console.error(`Compliance scan failed — article suppressed. Found: [${bannedHits.join(', ')}]`)
    saveState(state)
    return
  }

  const ratioWarnings = ratioSanityCheck(mdx, prices)
  if (ratioWarnings.length > 0) {
    console.warn('Ratio sanity warnings (article published — review manually):')
    ratioWarnings.forEach(w => console.warn(`  ⚠ ${w}`))
  }

  const result = saveArticle(mdx)
  if (!result) {
    saveState(state)
    return
  }

  // Publish permanent event-result pages for any significant EIA release this run
  if (eiaData) {
    const nowIso = new Date().toISOString()
    try {
      if (eiaData.isSignificant) {
        const crudeMove = moves.find(m => m.key === 'crude')
        publishEventResultPage({
          eventId:            'eia_petroleum_status_report',
          date:               nowIso,
          result:             eiaData.summary,
          commodity:          'crude',
          mcxPrice:           crudeMove?.price ?? prices.mcxCrude,
          mcxChangePct:       crudeMove?.pct ?? parseFloat(prices.crudePct ?? '0'),
          relatedArticleSlug: result.slug,
        })
      }
      if (eiaData.natGas?.isSignificant) {
        const gasMove = moves.find(m => m.key === 'natgas')
        publishEventResultPage({
          eventId:            'eia_natural_gas_storage',
          date:               nowIso,
          result:             eiaData.natGas.summary,
          commodity:          'natgas',
          mcxPrice:           gasMove?.price ?? prices.mcxNatGas,
          mcxChangePct:       gasMove?.pct ?? parseFloat(prices.gasPct ?? '0'),
          relatedArticleSlug: result.slug,
        })
      }
    } catch (e) {
      console.warn('Event result page publish failed (non-fatal):', e.message)
    }
  }

  state.articlesToday = state.articlesToday ?? []
  state.articlesToday.push(`${today}/${result.slug}`)
  state.lastArticleAt = new Date().toISOString()

  // Record cooldown only for the commodity that actually triggered this article
  state.lastCoveredAt = state.lastCoveredAt ?? {}
  const triggeringKey = moves.find(m => m.absPct >= HAWK_SCAN_THRESHOLD)?.key
                     ?? moves.find(m => m.absPct >= MOVE_THRESHOLD_HARD)?.key
                     ?? moves[0]?.key
  if (triggeringKey) state.lastCoveredAt[triggeringKey] = state.lastArticleAt

  saveState(state)

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\nDone in ${elapsed}s — "${result.title}"`)
  console.log(`  File: content/articles/${result.slug}.mdx\n`)
}

main().catch(err => {
  console.error('Engine fatal error:', err)
  process.exit(1)
})
