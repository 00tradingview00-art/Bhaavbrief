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
const MAX_PER_RUN       = 5      // hard cap — one per major category
const FRESHNESS_HOURS   = 48     // skip articles with pubDate older than this

const FEEDS = [
  // ── Commodities ──────────────────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=MCX+commodity+gold+silver+crude+India&hl=en-IN&gl=IN&ceid=IN:en',     source: 'Google News', category: 'Metals'      },
  { url: 'https://news.google.com/rss/search?q=OPEC+crude+oil+energy+price+barrels+supply&hl=en&gl=US&ceid=US:en',  source: 'Google News', category: 'Energy'      },
  { url: 'https://news.google.com/rss/search?q=copper+nickel+aluminium+zinc+LME+metal+price&hl=en&gl=US&ceid=US:en', source: 'Google News', category: 'Metals'    },
  { url: 'https://news.google.com/rss/search?q=India+commodity+agri+NCDEX+monsoon+kharif+rabi&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News', category: 'Agri' },
  { url: 'https://news.google.com/rss/search?q=natural+gas+LNG+Europe+Asia+price+demand&hl=en&gl=US&ceid=US:en',    source: 'Google News', category: 'Energy'      },
  { url: 'https://news.google.com/rss/search?q=China+commodity+demand+steel+iron+ore+copper&hl=en&gl=US&ceid=US:en', source: 'Google News', category: 'Metals'     },

  // ── Government Policy ─────────────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=India+import+duty+customs+tariff+commodity+2025&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News', category: 'Policy' },
  { url: 'https://news.google.com/rss/search?q=SEBI+FMC+commodity+regulation+India&hl=en-IN&gl=IN&ceid=IN:en',       source: 'Google News', category: 'Policy'    },
  { url: 'https://news.google.com/rss/search?q=India+finance+ministry+budget+commodity+excise&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News', category: 'Policy' },
  { url: 'https://news.google.com/rss/search?q=India+MSP+procurement+food+grain+government&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News', category: 'Policy'   },
  { url: 'https://news.google.com/rss/search?q=RBI+monetary+policy+repo+rate+India+2025&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News', category: 'Policy'      },

  // ── Macro ─────────────────────────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=India+CPI+WPI+inflation+data+2025&hl=en-IN&gl=IN&ceid=IN:en',        source: 'Google News', category: 'Macro'       },
  { url: 'https://news.google.com/rss/search?q=India+GDP+PMI+IIP+trade+deficit+current+account&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News', category: 'Macro' },
  { url: 'https://news.google.com/rss/search?q=Federal+Reserve+rate+dollar+gold+inflation&hl=en&gl=US&ceid=US:en',  source: 'Google News', category: 'Macro'       },
  { url: 'https://news.google.com/rss/search?q=rupee+dollar+forex+usdinr+RBI+intervention&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News', category: 'Macro'     },

  // ── Geopolitics ───────────────────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=Iran+Russia+sanctions+oil+commodity+supply&hl=en&gl=US&ceid=US:en',  source: 'Google News', category: 'Geopolitics' },
  { url: 'https://news.google.com/rss/search?q=Middle+East+Red+Sea+Suez+shipping+commodity&hl=en&gl=US&ceid=US:en', source: 'Google News', category: 'Geopolitics' },

  // ── Indian financial press ─────────────────────────────────────────────────────
  { url: 'https://feeds.feedburner.com/ndtvprofit-latest',                                                           source: 'NDTV Profit', category: null          },
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',                                     source: 'ET Markets',  category: null          },
  { url: 'https://economictimes.indiatimes.com/news/economy/policy/rssfeeds/1052732854.cms',                         source: 'ET Policy',   category: 'Policy'      },
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

// ── Persistence ───────────────────────────────────────────────────────────────

function loadSeen() {
  try { return JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')) }
  catch { return [] }
}

function saveSeen(urls) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify(urls.slice(-3000), null, 2), 'utf8')
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
  const KITE_API_KEY    = process.env.KITE_API_KEY
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
    const res = await fetch(`https://api.kite.trade/quote/ltp?${qs}`, {
      headers: {
        'X-Kite-Version': '3',
        Authorization: `token ${KITE_API_KEY}:${KITE_ACCESS_TOKEN}`,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.warn(`  Kite LTP ${res.status}: ${(await res.text()).slice(0, 120)}`)
      return null
    }
    const { data } = await res.json()
    const p = { source: 'kite' }
    for (const key of keys) {
      const sym = instruments[key]?.symbol
      const ltp = data[`MCX:${sym}`]?.last_price
      if (sym && ltp != null) p[key] = ltp   // accept 0 (pre-open) — still valid last price
    }
    return p
  } catch (e) {
    console.warn(`  Kite fetch failed: ${e.message}`)
    return null
  }
}

async function fetchStooqFallback() {
  const p = { usdInr: 85.0, source: 'stooq' }
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
        if (r.ok) kite.usdInr = (await r.json()).rates?.INR ?? 85.0
      } catch { kite.usdInr = 85.0 }
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
    parts.push(`USD/INR ₹${p.usdInr?.toFixed(2) ?? '85.00'}`)
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

// ── Claude generation ─────────────────────────────────────────────────────────

async function generateNewsItem(signal, prices) {
  const ctx    = priceContext(prices)
  const prompt = `You are BhaavBrief Intelligence — India's AI commodity intelligence desk. Your job is to connect global market signals to their precise Indian market impact.

Live market prices: ${ctx}

Write an institutional-grade intelligence brief for Indian commodity traders, investors, and businesses. This is NOT a news summary — it is cross-asset analysis.

Rules:
- Treat this like a Bloomberg Intelligence note or a commodity desk research flash
- ALWAYS connect the event to: (a) the specific MCX contract + approximate INR level using live prices above, (b) the rupee-dollar import parity impact, (c) one cross-market linkage (e.g., crude → petrochemical costs, gold → rupee depreciation, copper → EV demand, Fed rate → DXY → MCX premiums)
- Be precise: name the exact contract, use numbers, show cause-and-effect chains
- No opinions, no buy/sell calls, no "investors should"
- Close with ONE specific price level or upcoming event/data release to watch

Format exactly as plain text (no markdown, no headers, no asterisks, no bullet points):
HEADLINE: [12-16 words — include a specific price or % and the primary market]
IMPACT: [bearish / bullish / neutral]
BODY: [95-120 words]

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
      max_tokens: 300,
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

  // Filter: not seen and keyword-relevant
  // pubDate freshness: skip only if pubDate is present AND clearly old (> 48h)
  // Many RSS feeds have missing/stale pubDates — don't discard those
  const candidates = allItems.filter(item => {
    if (seen.includes(item.url)) return false
    if (!isImportant(`${item.title} ${item.desc}`)) return false
    if (item.pubDate && !isNaN(item.pubDate.getTime()) && item.pubDate.getTime() < cutoffMs) return false
    return true
  })
  console.log(`Fresh, new, important signals: ${candidates.length}`)

  // Cluster similar stories, pick best representative per cluster
  const deduplicated = clusterAndPick(candidates)
  console.log(`After clustering: ${deduplicated.length} unique signals`)

  // Group by category, pick one signal per category (best = longest desc)
  const byCategory = new Map()
  for (const item of deduplicated) {
    const { category } = detectCategory(`${item.title} ${item.desc}`)
    if (!byCategory.has(category)) {
      byCategory.set(category, item)
    } else {
      const existing = byCategory.get(category)
      if ((item.desc?.length ?? 0) > (existing.desc?.length ?? 0)) {
        byCategory.set(category, item)
      }
    }
  }

  // Rank categories: prefer ones not covered in recent output
  const existing      = loadExisting()
  const recentCats    = new Set(existing.slice(0, 10).map(i => i.category))
  const rankedSignals = [...byCategory.entries()]
    .sort(([catA], [catB]) => {
      const aRecent = recentCats.has(catA) ? 1 : 0
      const bRecent = recentCats.has(catB) ? 1 : 0
      return aRecent - bRecent   // categories NOT recently covered go first
    })
    .slice(0, MAX_PER_RUN)
    .map(([, signal]) => signal)

  console.log(`Will generate ${rankedSignals.length} briefing(s): ${rankedSignals.map(s => s.title.slice(0, 50)).join(' | ')}`)

  const newSeen  = [...seen]
  let processed  = 0

  for (const signal of rankedSignals) {
    try {
      console.log(`  Generating: ${signal.title.slice(0, 65)}`)
      const { title, summary, impact } = await generateNewsItem(signal, prices)
      const ist = getISTNow()
      const { category, tagType } = detectCategory(`${signal.title} ${signal.desc}`)

      existing.unshift({
        id:       toId(title, ist),
        title,
        summary,
        category,
        tagType,
        impact,
        pubDate:  new Date().toISOString(),
      })

      newSeen.push(signal.url)
      processed++
    } catch (e) {
      console.warn(`  Skipped: ${e.message}`)
      newSeen.push(signal.url)
    }
  }

  // Keep rolling window
  const trimmed = existing.slice(0, MAX_STORED)

  if (!fs.existsSync(path.join(ROOT, 'data'))) fs.mkdirSync(path.join(ROOT, 'data'))
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(trimmed, null, 2), 'utf8')
  saveSeen(newSeen)

  console.log(`Done — ${processed} new items. Total stored: ${trimmed.length}`)
}

main().catch(err => {
  console.error('News generation failed:', err.message)
  process.exit(1)
})
