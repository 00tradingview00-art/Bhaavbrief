#!/usr/bin/env node
/**
 * BhaavBrief — AI News Generator
 * Fetches commodity RSS as raw signals, generates original 80-100 word market
 * briefings via Claude, and writes to data/ai-news.json.
 * Runs every 15 minutes via GitHub Actions (appended to flash-brief.yml).
 *
 * Quality rules:
 *  - Only articles published < 6 hours ago
 *  - Max 1 brief per category per run (no 5x gold articles)
 *  - Cluster similar headlines, pick the top signal per cluster
 *  - Max 4 new items per run total
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const OUTPUT_FILE       = path.join(ROOT, 'data/ai-news.json')
const SEEN_FILE         = path.join(__dirname, 'seen-news.json')
const MAX_STORED        = 300
const MAX_PER_RUN       = 6      // one per major category (Metals, Energy, Policy, Macro, Agri, Geopolitics)
const FRESHNESS_HOURS   = 8      // skip articles older than 8h — commodity news stales fast

const FEEDS = [
  // ── Metals — specific price queries (NOT "MCX commodity" which returns MCX stock articles) ───
  { url: 'https://news.google.com/rss/search?q=gold+price+india+mcx+comex+today&hl=en-IN&gl=IN&ceid=IN:en',           source: 'Google News', category: 'Metals'      },
  { url: 'https://news.google.com/rss/search?q=silver+price+mcx+india+today&hl=en-IN&gl=IN&ceid=IN:en',               source: 'Google News', category: 'Metals'      },
  { url: 'https://news.google.com/rss/search?q=copper+nickel+aluminium+zinc+LME+metal+price&hl=en&gl=US&ceid=US:en',  source: 'Google News', category: 'Metals'      },
  { url: 'https://news.google.com/rss/search?q=China+commodity+demand+steel+copper+aluminium&hl=en&gl=US&ceid=US:en', source: 'Google News', category: 'Metals'      },

  // ── Energy ────────────────────────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=crude+oil+price+india+brent+wti+today&hl=en-IN&gl=IN&ceid=IN:en',      source: 'Google News', category: 'Energy'      },
  { url: 'https://news.google.com/rss/search?q=OPEC+crude+oil+supply+production+cut&hl=en&gl=US&ceid=US:en',           source: 'Google News', category: 'Energy'      },
  { url: 'https://news.google.com/rss/search?q=natural+gas+LNG+price+india+demand&hl=en-IN&gl=IN&ceid=IN:en',         source: 'Google News', category: 'Energy'      },

  // ── Agri ─────────────────────────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=india+agri+ncdex+monsoon+crop+wheat+soybean&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News', category: 'Agri'       },
  { url: 'https://news.google.com/rss/search?q=india+monsoon+forecast+kharif+rabi+agriculture&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News', category: 'Agri'   },

  // ── Policy ────────────────────────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=india+import+duty+customs+tariff+commodity&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News', category: 'Policy'     },
  { url: 'https://news.google.com/rss/search?q=RBI+repo+rate+monetary+policy+india&hl=en-IN&gl=IN&ceid=IN:en',        source: 'Google News', category: 'Policy'      },
  { url: 'https://news.google.com/rss/search?q=india+MSP+minimum+support+price+grain&hl=en-IN&gl=IN&ceid=IN:en',      source: 'Google News', category: 'Policy'      },
  { url: 'https://economictimes.indiatimes.com/news/economy/policy/rssfeeds/1052732854.cms',                           source: 'ET Policy',   category: 'Policy'      },

  // ── Macro ─────────────────────────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=india+cpi+wpi+inflation+gdp+pmi&hl=en-IN&gl=IN&ceid=IN:en',            source: 'Google News', category: 'Macro'       },
  { url: 'https://news.google.com/rss/search?q=rupee+dollar+usdinr+forex+india+rbi&hl=en-IN&gl=IN&ceid=IN:en',        source: 'Google News', category: 'Macro'       },
  { url: 'https://news.google.com/rss/search?q=Federal+Reserve+interest+rate+dollar+commodity&hl=en&gl=US&ceid=US:en', source: 'Google News', category: 'Macro'      },

  // ── Geopolitics ───────────────────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=iran+russia+ukraine+oil+sanctions+commodity&hl=en&gl=US&ceid=US:en',   source: 'Google News', category: 'Geopolitics' },
  { url: 'https://news.google.com/rss/search?q=red+sea+suez+shipping+commodity+supply+disruption&hl=en&gl=US&ceid=US:en', source: 'Google News', category: 'Geopolitics' },
  { url: 'https://news.google.com/rss/search?q=middle+east+israel+oil+commodity+supply&hl=en&gl=US&ceid=US:en',       source: 'Google News', category: 'Geopolitics' },

  // ── Indian financial press ─────────────────────────────────────────────────────
  { url: 'https://feeds.feedburner.com/ndtvprofit-latest',                                                             source: 'NDTV Profit', category: null          },
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',                                       source: 'ET Markets',  category: null          },
]

const KEYWORDS = [
  // Commodities
  'mcx', 'ncdex', 'comex', 'nymex', 'lme', 'cme',
  'gold', 'silver', 'crude', 'brent', 'copper', 'natural gas', 'aluminium',
  'zinc', 'lead', 'nickel', 'platinum', 'palladium',
  'soybean', 'castor', 'pepper', 'cardamom', 'wheat', 'cotton',
  // Market events
  'opec', 'eia inventory', 'supply disruption', 'refinery', 'inventory',
  'port strike', 'hormuz', 'suez', 'red sea', 'sanctions',
  'china demand', 'iran', 'russia', 'ukraine',
  // Government policy
  'import duty', 'export ban', 'export duty', 'customs tariff', 'excise duty',
  'sebi', 'fmc', 'rbi', 'finance ministry', 'mof', 'budget',
  'msp', 'minimum support price', 'procurement', 'buffer stock',
  'repo rate', 'monetary policy', 'policy rate',
  // Macro
  'inflation', 'cpi', 'wpi', 'gdp', 'pmi', 'iip', 'trade deficit',
  'current account', 'rupee', 'usdinr', 'forex', 'dollar',
  'federal reserve', 'fed rate', 'rate cut', 'rate hike',
  'monsoon', 'kharif', 'rabi',
]

const SEEN_TTL_DAYS = 7   // expire seen URLs after this many days

// ── Persistence ───────────────────────────────────────────────────────────────

function loadSeen() {
  try {
    const raw = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))
    // Support both legacy (array of strings) and new (array of {url, seenAt})
    if (!raw.length || typeof raw[0] === 'string') return raw   // legacy — no TTL yet
    const cutoff = Date.now() - SEEN_TTL_DAYS * 86400 * 1000
    return raw.filter(e => new Date(e.seenAt).getTime() > cutoff).map(e => e.url)
  } catch { return [] }
}

function saveSeen(urls) {
  // Store as objects with timestamp so we can expire them
  const now = new Date().toISOString()
  const entries = urls.slice(-3000).map(u => typeof u === 'string' ? { url: u, seenAt: now } : u)
  fs.writeFileSync(SEEN_FILE, JSON.stringify(entries, null, 2), 'utf8')
}

function loadExisting() {
  try { return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')) }
  catch { return [] }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function isImportant(text) {
  const t = text.toLowerCase()
  return KEYWORDS.some(k => t.includes(k))
}

/**
 * Returns true for articles about MCX Ltd shares/stock — NOT commodity prices.
 * These flood Google News when searching "MCX commodity" and pollute the feed.
 */
function isMCXStockArticle(text) {
  const t = text.toLowerCase()
  return /mcx\s+shares?|mcx\s+stock\b|mcx\s+q[1-4]\s+(result|profit|revenue|pat|fy)|multi.commodity exchange of india\s+(ltd|limited|share|stock|surge|soar|jump|plunge|fall|drop|crash|rally|gain|hit|ipo)|mcx\s+share\s+price|mcx\s+(hit|hits)\s+(all.time|52.week|record\s+high)|mcx\s+(split|bonus|dividend)|mcx\s+ipo/.test(t)
}

function detectCategory(text) {
  const t = text.toLowerCase()
  if (/iran|russia|ukraine|hormuz|suez|red sea|sanction|war\b|geopolit/.test(t))                                          return { category: 'Geopolitics', tagType: 'energy' }
  if (/import duty|export duty|export ban|customs tariff|excise|sebi|fmc|msp|minimum support|repo rate|monetary policy|budget|finance ministry|rbi policy|procurement/.test(t)) return { category: 'Policy', tagType: 'macro' }
  if (/crude|oil\b|opec|brent|refinery|fuel|natural.gas|lng|lpg/.test(t))                                                 return { category: 'Energy',      tagType: 'energy' }
  if (/gold|silver|copper|metal|bullion|comex|aluminium|zinc|nickel|platinum|palladium/.test(t))                           return { category: 'Metals',      tagType: 'metals' }
  if (/agri|wheat|soybean|cotton|pepper|cardamom|ncdex|monsoon|crop|castor|kharif|rabi/.test(t))                          return { category: 'Agri',        tagType: 'agri'   }
  return { category: 'Macro', tagType: 'macro' }
}

function stripSourceSuffix(title) {
  return title.replace(/\s+[-–—|]\s+[^-–—|]+$/, '').trim()
}

function getISTNow() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000)
}

function toId(title, ts) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/-+$/, '')
  const t    = ts.toISOString().slice(0, 16).replace(/[T:]/g, '-')
  return `${t}-${slug}`
}

/** Word-overlap similarity 0-1 between two title strings */
function similarity(a, b) {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3))
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3))
  if (!wordsA.size || !wordsB.size) return 0
  let shared = 0
  for (const w of wordsA) if (wordsB.has(w)) shared++
  return shared / Math.max(wordsA.size, wordsB.size)
}

/**
 * Cluster candidates by title similarity (threshold 0.35).
 * Returns one representative per cluster — the one with the longest desc
 * (more context = better Claude output).
 */
function clusterAndPick(candidates) {
  const clusters = []
  const assigned = new Set()

  for (let i = 0; i < candidates.length; i++) {
    if (assigned.has(i)) continue
    const cluster = [i]
    for (let j = i + 1; j < candidates.length; j++) {
      if (!assigned.has(j) && similarity(candidates[i].title, candidates[j].title) >= 0.35) {
        cluster.push(j)
        assigned.add(j)
      }
    }
    assigned.add(i)
    // Pick member with most descriptive text
    const best = cluster.reduce((a, b) =>
      (candidates[a].desc?.length ?? 0) >= (candidates[b].desc?.length ?? 0) ? a : b
    )
    clusters.push(candidates[best])
  }
  return clusters
}

// ── Live prices: Kite (actual MCX) → Stooq fallback ─────────────────────────

function loadInstruments() {
  try {
    const f = path.join(ROOT, 'data/kite-instruments.json')
    return JSON.parse(fs.readFileSync(f, 'utf8'))
  } catch { return null }
}

async function fetchKitePrices(instruments) {
  const KITE_API_KEY      = process.env.KITE_API_KEY
  const KITE_ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN
  if (!KITE_API_KEY || !KITE_ACCESS_TOKEN) {
    console.warn('  Kite: API key or token not set')
    return null
  }

  const keys = ['gold', 'silver', 'crude', 'copper', 'natgas']
  const qs   = keys
    .filter(k => instruments[k]?.token)
    .map(k => `i=MCX:${instruments[k].symbol}`)
    .join('&')

  try {
    // Use full /quote (not /ltp) to get OHLC + prev close for % change calculation
    const res = await fetch(`https://api.kite.trade/quote?${qs}`, {
      headers: {
        'X-Kite-Version': '3',
        Authorization: `token ${KITE_API_KEY}:${KITE_ACCESS_TOKEN}`,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.warn(`  Kite quote ${res.status}: ${(await res.text()).slice(0, 120)}`)
      return null
    }
    const { data } = await res.json()
    const p = { source: 'kite', movers: {} }
    for (const key of keys) {
      const sym  = instruments[key]?.symbol
      const q    = data[`MCX:${sym}`]
      if (!sym || !q) continue
      const ltp       = q.last_price
      const prevClose = q.ohlc?.close ?? 0
      if (ltp != null) p[key] = ltp
      // Compute intraday % change for mover scoring
      if (prevClose > 0 && ltp != null) {
        p.movers[key] = ((ltp - prevClose) / prevClose) * 100
      }
    }
    return p
  } catch (e) {
    console.warn(`  Kite fetch failed: ${e.message}`)
    return null
  }
}

async function fetchStooqFallback() {
  const p = { usdInr: 0, source: 'stooq', movers: {} }
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
      signal: AbortSignal.timeout(5000),
    })
    if (r.ok) p.usdInr = (await r.json()).rates?.INR ?? p.usdInr
  } catch {}

  const symbols = { gold: 'gc.f', silver: 'si.f', crude: 'cl.f', copper: 'hg.f', natgas: 'ng.f' }
  await Promise.all(Object.entries(symbols).map(async ([name, sym]) => {
    try {
      const r = await fetch(`https://stooq.com/q/l/?s=${sym}&f=sd2t2ohlcv&h&e=csv`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!r.ok) return
      const lines = (await r.text()).trim().split('\n')
      if (lines.length < 2) return
      let close = parseFloat(lines[1].split(',')[6])
      if ((name === 'silver' || name === 'copper') && close > 0) close /= 100
      if (!isNaN(close) && close > 0) p[name] = close
    } catch {}
  }))
  return p
}

async function fetchLivePrices() {
  const instruments = loadInstruments()
  if (instruments) {
    const kite = await fetchKitePrices(instruments)
    if (kite && (kite.gold != null || kite.silver != null || kite.crude != null)) {
      // Attach USD/INR from Frankfurter even when using Kite (Kite is INR already)
      try {
        const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', { signal: AbortSignal.timeout(5000) })
        if (r.ok) kite.usdInr = (await r.json()).rates?.INR ?? 0
      } catch { kite.usdInr = 0 }
      return kite
    }
  }
  console.log('  Kite unavailable — falling back to Stooq')
  return fetchStooqFallback()
}

function priceContext(p) {
  const parts = []
  if (p.source === 'kite') {
    // Kite prices are already in INR (MCX contracts)
    if (p.usdInr) parts.push(`USD/INR ₹${p.usdInr.toFixed(2)}`)
    if (p.gold)   parts.push(`MCX Gold ₹${p.gold.toFixed(0)}/10g`)
    if (p.silver) parts.push(`MCX Silver ₹${p.silver.toFixed(0)}/kg`)
    if (p.crude)  parts.push(`MCX Crude ₹${p.crude.toFixed(0)}/bbl`)
    if (p.copper) parts.push(`MCX Copper ₹${p.copper.toFixed(2)}/kg`)
    if (p.natgas) parts.push(`MCX NatGas ₹${p.natgas.toFixed(2)}/mmBtu`)
  } else {
    // Stooq prices are USD — convert to approximate MCX INR
    parts.push(`USD/INR ₹${p.usdInr?.toFixed(2)}`)
    if (p.gold)   parts.push(`COMEX Gold $${p.gold.toFixed(0)}/oz (~₹${((p.gold / 31.1035) * 10 * p.usdInr * 1.15).toFixed(0)}/10g MCX est.)`)
    if (p.silver) parts.push(`COMEX Silver $${p.silver.toFixed(2)}/oz (~₹${((p.silver / 31.1035) * 1000 * p.usdInr * 1.10).toFixed(0)}/kg MCX est.)`)
    if (p.crude)  parts.push(`WTI $${p.crude.toFixed(2)}/bbl (~₹${(p.crude * p.usdInr * 1.02).toFixed(0)}/bbl MCX est.)`)
    if (p.copper) parts.push(`COMEX Copper $${p.copper.toFixed(4)}/lb`)
    if (p.natgas) parts.push(`Henry Hub NatGas $${p.natgas.toFixed(3)}/mmBtu`)
  }
  return parts.join(' | ')
}

// ── RSS fetching ──────────────────────────────────────────────────────────────

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BhaavBrief/2.0)' },
      signal:  AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const text  = await res.text()
    const items = []

    for (const m of text.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const b      = m[1]
      const titleM = b.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/)  || b.match(/<title>([^<]{5,})<\/title>/)
      const linkM  = b.match(/<link>(https?:[^<]+)<\/link>/)            || b.match(/<guid[^>]*>(https?:[^<]+)<\/guid>/)
      const descM  = b.match(/<description><!\[CDATA\[([\s\S]+?)\]\]><\/description>/) || b.match(/<description>([^<]{10,})<\/description>/)
      const dateM  = b.match(/<pubDate>([^<]+)<\/pubDate>/)
      if (!titleM || !linkM) continue

      const pubDate = dateM ? new Date(dateM[1].trim()) : null
      items.push({
        title:   stripSourceSuffix(titleM[1].trim()),
        url:     linkM[1].trim(),
        desc:    descM ? descM[1].replace(/<[^>]+>/g, '').trim().slice(0, 400) : '',
        pubDate,
        feedCategory: feed.category,
      })
    }
    console.log(`  ${new URL(feed.url).hostname}: ${items.length} items`)
    return items
  } catch (e) {
    console.warn(`  Feed failed: ${e.message}`)
    return []
  }
}

// ── Adaptive intelligence ─────────────────────────────────────────────────────

/**
 * Score a signal by how well it matches today's moving commodities.
 * Signals about the biggest movers get scored higher.
 */
function scoreSignal(item, movers) {
  if (!movers || Object.keys(movers).length === 0) return 0
  const text = `${item.title} ${item.desc}`.toLowerCase()
  const MAP = [
    { keys: ['gold'],              re: /\bgold\b|comex\s+gold|bullion/ },
    { keys: ['silver'],            re: /\bsilver\b/ },
    { keys: ['crude'],             re: /crude|brent|wti|petroleum|opec/ },
    { keys: ['copper'],            re: /\bcopper\b|lme/ },
    { keys: ['natgas'],            re: /natural.gas|natgas|\blng\b/ },
  ]
  let score = 0
  for (const { keys, re } of MAP) {
    if (re.test(text)) {
      for (const k of keys) {
        const pct = Math.abs(movers[k] ?? 0)
        score += pct * 3   // bigger move = bigger boost
      }
    }
  }
  return score
}

/**
 * Returns categories that haven't appeared in the last N items of existing feed.
 * These are "gaps" — we should force at least one item to fill them.
 */
function getCategoryGaps(existing, windowSize = 18) {
  const ALL_CATS  = ['Metals', 'Energy', 'Policy', 'Macro', 'Agri', 'Geopolitics']
  const recentWindow = existing.slice(0, windowSize).map(i => i.category)
  const covered   = new Set(recentWindow)
  return ALL_CATS.filter(c => !covered.has(c))
}

/**
 * Returns current IST market session for context-aware prompting.
 */
function getMarketSession() {
  const istHour = new Date(Date.now() + 5.5 * 3600 * 1000).getUTCHours()
  if (istHour >= 6  && istHour < 9)  return 'pre-market'   // 6–9 AM: overnight moves
  if (istHour >= 9  && istHour < 15) return 'morning'      // 9 AM–3 PM: active session
  if (istHour >= 15 && istHour < 23) return 'afternoon'    // 3–11 PM: evening session
  return 'global'                                           // 11 PM–6 AM: US/EU session
}

const SESSION_FOCUS = {
  'pre-market':  'MCX opens in under 3 hours. Focus on overnight COMEX/LME moves and their implication for today\'s MCX open prices.',
  'morning':     'MCX morning session is live. Focus on intraday price action and immediate implications for open positions.',
  'afternoon':   'MCX evening session is active. Focus on current price levels, what\'s driving them, and watch levels into close.',
  'global':      'MCX is closed. Focus on US/EU session moves and what they signal for tomorrow\'s MCX open.',
}

/**
 * Synthesise the dominant cross-asset market narrative from live mover data.
 * This is injected into the Claude prompt so every news brief explicitly
 * connects the signal to what's actually happening in the broader market.
 */
function buildMarketNarrative(movers) {
  const g  = movers.gold   ?? 0
  const s  = movers.silver ?? 0
  const c  = movers.crude  ?? 0
  const cu = movers.copper ?? 0
  const ng = movers.natgas ?? 0
  const themes = []

  if (g > 0.5 && c < -0.5)
    themes.push(`Risk-off bid: gold +${g.toFixed(1)}% as crude falls ${c.toFixed(1)}% — safe-haven demand dominating this session`)
  if (g > 0.4 && s > 0.4 && cu > 0.4)
    themes.push(`Broad commodity rally: gold, silver and copper all advancing — dollar weakness or reflation trade`)
  if (c > 1.0 && ng > 1.0)
    themes.push(`Energy complex surging: crude +${c.toFixed(1)}% and nat gas +${ng.toFixed(1)}% together — supply concern driving energy sector`)
  if (g < -0.5 && c < -0.5 && cu < -0.5)
    themes.push(`Broad selloff: gold, crude and copper all falling — dollar strength or demand outlook deteriorating`)
  if (g > 0.4 && c > 0.4 && !themes.length)
    themes.push(`Inflationary signal: gold +${g.toFixed(1)}% and crude +${c.toFixed(1)}% rising together — India import cost rising across energy and metals`)
  if (cu > 0.8 && c > 0.3 && !themes.length)
    themes.push(`Risk-on/China demand signal: copper +${cu.toFixed(1)}% and crude +${c.toFixed(1)}% advancing — industrial activity indicator positive`)
  if (g > 0.5 && cu < -0.5 && !themes.length)
    themes.push(`Divergence: safe-haven gold +${g.toFixed(1)}% while industrial copper falls ${cu.toFixed(1)}% — risk-off tone with demand concern`)

  if (themes.length === 0) {
    const all = [
      { name: 'Gold', pct: g }, { name: 'Silver', pct: s }, { name: 'Crude', pct: c },
      { name: 'Copper', pct: cu }, { name: 'NatGas', pct: ng },
    ].filter(x => Math.abs(x.pct) > 0.2).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    if (all.length > 0)
      themes.push(`${all[0].name} leading this session at ${all[0].pct >= 0 ? '+' : ''}${all[0].pct.toFixed(1)}% — other commodities subdued`)
    else
      themes.push('Mixed session — no dominant cross-asset theme; sub-0.2% moves across the commodity complex')
  }

  return themes.slice(0, 2).join('. ')
}

// ── Claude generation ─────────────────────────────────────────────────────────

async function generateNewsItem(signal, prices) {
  const ctx       = priceContext(prices)
  const movers    = prices.movers ?? {}
  const session   = getMarketSession()
  const narrative = buildMarketNarrative(movers)
  const istDate   = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    .toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Top movers with direction labels
  const moverLines = Object.entries(movers)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 4)
    .map(([k, pct]) => `MCX ${k.charAt(0).toUpperCase() + k.slice(1)}: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`)
    .join(' | ')

  const prompt = `You are BhaavBrief Intelligence — India's real-time commodity intelligence desk for professional MCX traders.

Today: ${istDate} (IST) | Session: ${session.toUpperCase()}
${SESSION_FOCUS[session]}

CROSS-ASSET MARKET NARRATIVE (the dominant theme driving the commodity complex right now):
${narrative}

Live prices: ${ctx}
${moverLines ? `Session movers: ${moverLines}` : 'No significant moves this session'}

Write an institutional-grade intelligence brief. This is NOT a news summary — it is cross-asset analysis that connects the incoming signal to what is ACTUALLY HAPPENING in the market right now.

MANDATORY STRUCTURE:
1. OPEN by explicitly linking this signal to the MARKET NARRATIVE above. Show the connection — why does this signal matter given the current cross-asset picture?
2. Name the SPECIFIC MCX contract(s) affected and cite the EXACT current price from live data above.
3. Show the IMPORT PARITY CHAIN: global price → USD/INR rate → customs/premium → MCX impact in ₹.
4. Name ONE cross-market correlation: what else is moving alongside this, and why does it matter for Indian traders?
5. Close with ONE specific price level or data release that will confirm or negate this move.

Rules: No opinions. No buy/sell calls. No "could", "may", "might". Only facts, mechanics, and levels.

Format as plain text only (no markdown, no headers, no asterisks, no bullets):
HEADLINE: [12-16 words — include a specific price or % and the primary market]
IMPACT: [bearish / bullish / neutral]
BODY: [110-130 words]

Market signal: ${signal.title}. ${signal.desc}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 450,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude ${res.status}: ${JSON.stringify(await res.json())}`)
  // Strip markdown headers and leading asterisks Claude sometimes adds
  const raw  = (await res.json()).content?.[0]?.text?.trim() ?? ''
  const text = raw
    .replace(/^#+\s+[^\n]*\n+/gm, '')   // remove # Heading lines
    .replace(/^\*{1,2}(HEADLINE|IMPACT|BODY):\*{0,2}/gim, '$1:')  // **HEADLINE:** → HEADLINE:
    .trim()

  const headlineM = text.match(/HEADLINE:\s*(.+?)(?:\n|$)/i)
  const impactM   = text.match(/IMPACT:\s*(bearish|bullish|neutral)(?:\n|$)/i)
  const bodyM     = text.match(/BODY:\s*([\s\S]+)/i)

  if (!headlineM || !bodyM) throw new Error(`Unexpected format: ${raw.slice(0, 120)}`)

  const title   = headlineM[1].replace(/^\*+|\*+$/g, '').trim()
  const summary = bodyM[1].replace(/^\*+\s*/, '').replace(/\n\n[\s\S]*/,'').trim()
  const impact  = (impactM?.[1] ?? 'neutral').toLowerCase()

  if (title.length < 10 || title === '**' || summary.length < 40)
    throw new Error(`Malformed response — title: "${title.slice(0, 40)}"`)

  return { title, summary, impact }
}

// ── Price-action first: signals driven by what IS moving, not what RSS published ──

/**
 * For commodities moving > threshold, create a brief signal regardless of whether
 * there's a matching RSS article. RSS is optional supporting context, not the trigger.
 */
function buildPriceActionSignals(prices, allItems, recentTitles) {
  const movers = prices.movers ?? {}
  const THRESHOLD = 0.2  // % — minimum move to warrant a price-action brief

  const COMMODITY_MAP = [
    { key: 'gold',   label: 'MCX Gold',    category: 'Metals', tagType: 'metals', unit: '₹/10g',   kws: ['gold', 'comex gold', 'bullion', 'xau']         },
    { key: 'silver', label: 'MCX Silver',  category: 'Metals', tagType: 'metals', unit: '₹/kg',    kws: ['silver', 'comex silver', 'xag']                 },
    { key: 'crude',  label: 'MCX Crude',   category: 'Energy', tagType: 'energy', unit: '₹/bbl',   kws: ['crude', 'brent', 'wti', 'oil price', 'opec']    },
    { key: 'copper', label: 'MCX Copper',  category: 'Metals', tagType: 'metals', unit: '₹/kg',    kws: ['copper', 'lme copper', 'base metal']            },
    { key: 'natgas', label: 'MCX Nat Gas', category: 'Energy', tagType: 'energy', unit: '₹/mmBtu', kws: ['natural gas', 'natgas', 'lng', 'henry hub']     },
  ]

  const signals = []

  for (const { key, label, category, tagType, unit, kws } of COMMODITY_MAP) {
    const pct = movers[key] ?? 0
    if (Math.abs(pct) < THRESHOLD) continue

    const price = prices[key]  // Kite live price (INR) or Stooq COMEX price

    // Find the most informative RSS context article (longest description = most context for Claude)
    const context = allItems
      .filter(item => {
        const text = `${item.title} ${item.desc}`.toLowerCase()
        return kws.some(kw => text.includes(kw)) && !isMCXStockArticle(text)
      })
      .sort((a, b) => (b.desc?.length ?? 0) - (a.desc?.length ?? 0))[0]

    // Skip if we recently generated a brief that's too similar to the context headline
    const contextTitle = context?.title ?? ''
    if (contextTitle && recentTitles.some(rt => similarity(contextTitle, rt) > 0.45)) continue

    signals.push({
      type: 'price-action',
      key, label, category, tagType, unit, pct, price,
      contextTitle,
      contextDesc:  context?.desc ?? '',
      url:          context?.url  ?? `pa:${key}:${Date.now()}`,
    })
  }

  // Sort: biggest absolute move first
  return signals.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
}

/**
 * Generate a brief that STARTS with the price move, not a news article.
 * RSS context is optional supporting evidence; price action is the anchor.
 */
async function generatePriceActionBrief(signal, prices) {
  const ctx       = priceContext(prices)
  const movers    = prices.movers ?? {}
  const session   = getMarketSession()
  const narrative = buildMarketNarrative(movers)
  const istDate   = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    .toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const direction = signal.pct > 0 ? 'up' : 'down'
  const absPct    = Math.abs(signal.pct).toFixed(2)
  const priceStr  = signal.price != null ? `₹${Math.round(signal.price)}${signal.unit.replace('₹', '')}` : 'price N/A'

  const moverContext = Object.entries(movers)
    .filter(([, p]) => Math.abs(p) > 0.15)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 4)
    .map(([k, p]) => `MCX ${k.charAt(0).toUpperCase() + k.slice(1)}: ${p >= 0 ? '+' : ''}${p.toFixed(2)}%`)
    .join(' | ')

  const prompt = `You are BhaavBrief Intelligence — India's real-time MCX commodity intelligence desk for professional traders.

Today: ${istDate} (IST) | Session: ${session.toUpperCase()}
${SESSION_FOCUS[session]}

CROSS-ASSET NARRATIVE (what's driving the ENTIRE commodity complex this session):
${narrative}

PRICE ACTION (the anchor of this brief):
${signal.label} is ${direction} ${absPct}% at ${priceStr} this session.
${signal.contextTitle ? `\nSupporting context from market: ${signal.contextTitle}. ${signal.contextDesc}` : '\n(No specific news catalyst identified — this is a pure price move. Explain based on the cross-asset context above.)'}

All live prices: ${ctx}
Session movers: ${moverContext || 'no significant moves'}

Write a 115-130 word intelligence brief. Price action is the anchor — you are explaining WHY the market is moving and what it means for MCX traders. NOT summarising news.

MANDATORY:
1. Lead with the CAUSE: given the cross-asset narrative, what mechanism is driving this move?
2. Name the EXACT MCX price (from the price data above) and two key levels: one support, one resistance.
3. Show the IMPORT PARITY ARITHMETIC: for metals/energy — global price × USD/INR × duty factor = MCX theoretical parity. Identify whether MCX is at premium or discount to parity.
4. Name ONE cross-commodity correlation: what else is moving in the same direction, and why does that confirm or challenge this move?
5. End with one specific price level or scheduled data release to watch.

No opinions. No buy/sell calls. No "could", "may", "might". Facts and mechanics only.

Format (plain text, no markdown):
HEADLINE: [12-16 words — include exact % move and MCX price level]
IMPACT: [bearish / bullish / neutral]
BODY: [115-130 words]`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 450, messages: [{ role: 'user', content: prompt }] }),
  })

  if (!res.ok) throw new Error(`Claude ${res.status}: ${JSON.stringify(await res.json())}`)
  const raw  = (await res.json()).content?.[0]?.text?.trim() ?? ''
  const text = raw.replace(/^#+\s+[^\n]*\n+/gm, '').replace(/^\*{1,2}(HEADLINE|IMPACT|BODY):\*{0,2}/gim, '$1:').trim()

  const headlineM = text.match(/HEADLINE:\s*(.+?)(?:\n|$)/i)
  const impactM   = text.match(/IMPACT:\s*(bearish|bullish|neutral)(?:\n|$)/i)
  const bodyM     = text.match(/BODY:\s*([\s\S]+)/i)

  if (!headlineM || !bodyM) throw new Error(`Unexpected format: ${raw.slice(0, 120)}`)

  const title   = headlineM[1].replace(/^\*+|\*+$/g, '').trim()
  const summary = bodyM[1].replace(/^\*+\s*/, '').replace(/\n\n[\s\S]*/, '').trim()
  const impact  = (impactM?.[1] ?? 'neutral').toLowerCase()

  if (title.length < 10 || summary.length < 40)
    throw new Error(`Malformed response — title: "${title.slice(0, 40)}"`)

  return { title, summary, impact }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  console.log('BhaavBrief News Generator — fetching prices...')
  const prices = await fetchLivePrices()
  console.log(`  ${priceContext(prices)}`)

  const movers   = prices.movers ?? {}
  const session  = getMarketSession()
  const narrative = buildMarketNarrative(movers)
  console.log(`  Session: ${session} | Narrative: ${narrative}`)

  const seen     = loadSeen()
  const cutoffMs = Date.now() - FRESHNESS_HOURS * 60 * 60 * 1000
  const existing = loadExisting()
  const recentTitles = existing.slice(0, 40).map(i => i.title)

  // Fetch RSS feeds (still needed as context even for price-action briefs)
  console.log(`Fetching ${FEEDS.length} RSS feeds...`)
  const allItems = (await Promise.all(FEEDS.map(fetchFeed))).flat()
  console.log(`Total RSS items: ${allItems.length}`)

  // ── PART 1: Price-action signals ─────────────────────────────────────────────
  // These are always generated when commodities are moving — no RSS article required.
  // Metals & Energy: price-action first.
  const priceSignals = buildPriceActionSignals(prices, allItems, recentTitles)
  console.log(`Price-action signals: ${priceSignals.length} (${priceSignals.map(s => `${s.label} ${s.pct >= 0 ? '+' : ''}${s.pct.toFixed(1)}%`).join(', ') || 'none moving'})`)

  // ── PART 2: RSS signals for non-price categories ─────────────────────────────
  // Policy / Geopolitics / Agri / Macro — RSS still drives these (no live price for these).
  const RSS_ONLY_CATS = new Set(['Policy', 'Geopolitics', 'Agri', 'Macro'])
  const gaps = getCategoryGaps(existing)
  const recentCats = new Set(existing.slice(0, 12).map(i => i.category))

  const rssItems = allItems.filter(item => {
    if (seen.includes(item.url)) return false
    const text = `${item.title} ${item.desc}`
    if (isMCXStockArticle(text)) return false
    if (!isImportant(text)) return false
    if (item.pubDate && !isNaN(item.pubDate.getTime()) && item.pubDate.getTime() < cutoffMs) return false
    if (recentTitles.some(rt => similarity(item.title, rt) > 0.38)) return false
    const { category } = detectCategory(text)
    return RSS_ONLY_CATS.has(category)  // only non-price categories for RSS path
  })

  const rssDeduped = clusterAndPick(rssItems)
  const rssScored  = rssDeduped.map(item => ({
    ...item,
    _score: scoreSignal(item, movers) + (item.desc?.length ?? 0) / 200,
  }))

  const rssByCategory = new Map()
  for (const item of rssScored) {
    const { category } = detectCategory(`${item.title} ${item.desc}`)
    if (!RSS_ONLY_CATS.has(category)) continue
    const bucket = rssByCategory.get(category) ?? []
    bucket.push(item)
    rssByCategory.set(category, bucket)
  }

  const rssSlots = Math.max(0, MAX_PER_RUN - Math.min(priceSignals.length, 2))
  const rssSignals = [...rssByCategory.entries()]
    .sort(([a], [b]) => {
      const pa = gaps.includes(a) ? 0 : !recentCats.has(a) ? 1 : 2
      const pb = gaps.includes(b) ? 0 : !recentCats.has(b) ? 1 : 2
      return pa - pb
    })
    .slice(0, rssSlots)
    .map(([, bucket]) => bucket.sort((a, b) => b._score - a._score)[0])

  console.log(`RSS signals: ${rssSignals.length} (${rssSignals.map(s => s.title.slice(0, 40)).join(' | ')})`)

  // ── PART 3: Generate all items ───────────────────────────────────────────────
  const newSeen = [...seen]
  let processed = 0

  function makeEntry(title, summary, category, tagType, impact) {
    const ist    = getISTNow()
    const now    = new Date()
    const istStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    return { id: toId(title, ist), title, summary, category, tagType, impact, pubDate: now.toISOString(), pubDateIST: istStr }
  }

  // Price-action items first (up to 2, max 1 per commodity)
  const currentRunTitles = []
  for (const signal of priceSignals.slice(0, 2)) {
    if (processed >= MAX_PER_RUN) break
    try {
      console.log(`  [price-action] ${signal.label} ${signal.pct >= 0 ? '+' : ''}${signal.pct.toFixed(2)}%`)
      const { title, summary, impact } = await generatePriceActionBrief(signal, prices)
      if (currentRunTitles.some(rt => similarity(title, rt) > 0.45)) {
        console.log(`  Skipped (duplicate theme in this run): ${title.slice(0, 60)}`)
        continue
      }
      existing.unshift(makeEntry(title, summary, signal.category, signal.tagType, impact))
      currentRunTitles.push(title)
      if (signal.url && !signal.url.startsWith('pa:')) newSeen.push(signal.url)
      processed++
    } catch (e) {
      console.warn(`  Skipped price-action [${signal.key}]: ${e.message}`)
    }
  }

  // RSS-triggered items for policy/geo/agri/macro
  for (const signal of rssSignals) {
    if (processed >= MAX_PER_RUN) break
    try {
      console.log(`  [rss] ${signal.title.slice(0, 65)}`)
      const { title, summary, impact } = await generateNewsItem(signal, prices)
      if (currentRunTitles.some(rt => similarity(title, rt) > 0.45)) {
        console.log(`  Skipped (duplicate theme in this run): ${title.slice(0, 60)}`)
        newSeen.push(signal.url)
        continue
      }
      const { category, tagType } = detectCategory(`${signal.title} ${signal.desc}`)
      existing.unshift(makeEntry(title, summary, category, tagType, impact))
      currentRunTitles.push(title)
      newSeen.push(signal.url)
      processed++
    } catch (e) {
      console.warn(`  Skipped RSS: ${e.message}`)
      newSeen.push(signal.url)
    }
  }

  // Trim rolling window to 7 days
  const expiryCutoff = Date.now() - 7 * 86400 * 1000
  const trimmed = existing
    .filter(item => new Date(item.pubDate).getTime() > expiryCutoff)
    .slice(0, MAX_STORED)

  if (!fs.existsSync(path.join(ROOT, 'data'))) fs.mkdirSync(path.join(ROOT, 'data'))
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(trimmed, null, 2), 'utf8')
  saveSeen(newSeen)

  console.log(`Done — ${processed} new items (${Math.min(priceSignals.length, 2)} price-action + ${rssSignals.length} RSS). Stored: ${trimmed.length}`)
}

main().catch(err => {
  console.error('News generation failed:', err.message)
  process.exit(1)
})
