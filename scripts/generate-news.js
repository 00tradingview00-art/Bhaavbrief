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

// ── Claude generation ─────────────────────────────────────────────────────────

async function generateNewsItem(signal, prices) {
  const ctx     = priceContext(prices)
  const movers  = prices.movers ?? {}
  const session = getMarketSession()
  const istDate = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    .toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Build mover context: show top 3 biggest % moves today
  const moverLines = Object.entries(movers)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([k, pct]) => `MCX ${k.charAt(0).toUpperCase() + k.slice(1)}: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% today`)
    .join(', ')

  const prompt = `You are BhaavBrief Intelligence — India's AI commodity intelligence desk. Your job is to connect global market signals to their precise Indian market impact.

Today: ${istDate} (IST) | Session: ${session.toUpperCase()}
${SESSION_FOCUS[session]}

Live MCX prices: ${ctx}
${moverLines ? `Today's movers: ${moverLines}` : ''}

Write an institutional-grade intelligence brief for Indian commodity traders. This is NOT a news summary — it is cross-asset analysis that connects the signal to what's happening in the market RIGHT NOW.

Rules:
- If the signal relates to a commodity that is already moving today (shown in "Today's movers"), explicitly reference that price move and explain the connection
- ALWAYS connect to: (a) specific MCX contract + INR price level from live data above, (b) rupee-dollar import parity impact, (c) one cross-market linkage
- Be precise: name exact contracts, use specific numbers, show cause-and-effect chains
- No opinions, no buy/sell calls, no "investors should"
- Reference only upcoming events, not past ones
- Close with ONE specific price level or upcoming data release to watch

Format as plain text only (no markdown, no headers, no asterisks, no bullets):
HEADLINE: [12-16 words — include a specific price or % and the primary market]
IMPACT: [bearish / bullish / neutral]
BODY: [100-120 words]

Market signal: ${signal.title}. ${signal.desc}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 350,
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  console.log('BhaavBrief News Generator — fetching prices...')
  const prices = await fetchLivePrices()
  console.log(`  ${priceContext(prices)}`)

  const seen      = loadSeen()
  const cutoffMs  = Date.now() - FRESHNESS_HOURS * 60 * 60 * 1000
  console.log(`Seen: ${seen.length} URLs | Freshness cutoff: ${FRESHNESS_HOURS}h`)

  const allItems = (await Promise.all(FEEDS.map(fetchFeed))).flat()
  console.log(`Total fetched: ${allItems.length}`)

  const existing = loadExisting()

  // Cross-run dedup: titles of last 40 stored items — reject signals too similar to recent output
  const recentTitles = existing.slice(0, 40).map(i => i.title)

  // Filter: not seen, not MCX-stock, keyword-relevant, fresh, not a duplicate of recent output
  const candidates = allItems.filter(item => {
    if (seen.includes(item.url)) return false
    const text = `${item.title} ${item.desc}`
    if (isMCXStockArticle(text)) return false
    if (!isImportant(text)) return false
    // pubDate freshness: skip if pubDate is present AND clearly stale (> FRESHNESS_HOURS)
    if (item.pubDate && !isNaN(item.pubDate.getTime()) && item.pubDate.getTime() < cutoffMs) return false
    // Cross-run semantic dedup: skip if too similar to recently generated items
    if (recentTitles.some(rt => similarity(item.title, rt) > 0.38)) return false
    return true
  })
  console.log(`Fresh, new, important, non-duplicate signals: ${candidates.length}`)

  // Cluster similar stories within this batch, pick best per cluster
  const deduplicated = clusterAndPick(candidates)
  console.log(`After clustering: ${deduplicated.length} unique signals`)

  const movers = prices.movers ?? {}
  const session = getMarketSession()
  const gaps    = getCategoryGaps(existing)
  console.log(`Session: ${session} | Movers: ${JSON.stringify(movers)} | Category gaps: ${gaps.join(', ') || 'none'}`)

  // Score each signal: mover boost + desc length bonus
  const scored = deduplicated.map(item => ({
    ...item,
    _score: scoreSignal(item, movers) + (item.desc?.length ?? 0) / 200,
  }))

  // Group by category, keeping best-scored candidate per bucket
  const byCategory = new Map()
  for (const item of scored) {
    const { category } = detectCategory(`${item.title} ${item.desc}`)
    const bucket = byCategory.get(category) ?? []
    bucket.push(item)
    byCategory.set(category, bucket)
  }

  // Rank categories:
  //  1. Categories with active movers go first (their content is most timely)
  //  2. Gap categories (not seen in last 18 items) go next
  //  3. Others sorted by recency — not-recently-covered first
  const recentCats = new Set(existing.slice(0, 12).map(i => i.category))

  function categoryPriority(cat) {
    // Check if any mover is related to this category
    const moverCat = { Metals: ['gold','silver','copper'], Energy: ['crude','natgas'] }
    const relatedMovers = moverCat[cat] ?? []
    const hasBigMover = relatedMovers.some(k => Math.abs(movers[k] ?? 0) > 0.3)
    if (hasBigMover)         return 0   // highest: category is actively moving today
    if (gaps.includes(cat))  return 1   // second: gap category not seen recently
    if (!recentCats.has(cat)) return 2  // third: not in last 12 items
    return 3                            // lowest: recently covered
  }

  const rankedSignals = [...byCategory.entries()]
    .sort(([catA], [catB]) => categoryPriority(catA) - categoryPriority(catB))
    .slice(0, MAX_PER_RUN)
    .map(([, bucket]) => bucket.sort((a, b) => b._score - a._score)[0])

  console.log(`Will generate ${rankedSignals.length} briefing(s): ${rankedSignals.map(s => s.title.slice(0, 50)).join(' | ')}`)

  const newSeen  = [...seen]
  let processed  = 0

  for (const signal of rankedSignals) {
    try {
      console.log(`  Generating: ${signal.title.slice(0, 65)}`)
      const { title, summary, impact } = await generateNewsItem(signal, prices)
      const ist = getISTNow()
      const { category, tagType } = detectCategory(`${signal.title} ${signal.desc}`)

      const now = new Date()
      const istStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false })

      existing.unshift({
        id:         toId(title, ist),
        title,
        summary,
        category,
        tagType,
        impact,
        pubDate:    now.toISOString(),        // UTC ISO — used for relative time
        pubDateIST: istStr,                   // e.g. "22 May 2026, 09:15" — for display
      })

      newSeen.push(signal.url)
      processed++
    } catch (e) {
      console.warn(`  Skipped: ${e.message}`)
      newSeen.push(signal.url)
    }
  }

  // Keep rolling window — drop items older than 7 days
  const expiryCutoff = Date.now() - 7 * 86400 * 1000
  const trimmed = existing
    .filter(item => new Date(item.pubDate).getTime() > expiryCutoff)
    .slice(0, MAX_STORED)

  if (!fs.existsSync(path.join(ROOT, 'data'))) fs.mkdirSync(path.join(ROOT, 'data'))
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(trimmed, null, 2), 'utf8')
  saveSeen(newSeen)

  console.log(`Done — ${processed} new items. Total stored: ${trimmed.length}`)
}

main().catch(err => {
  console.error('News generation failed:', err.message)
  process.exit(1)
})
