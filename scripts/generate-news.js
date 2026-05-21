#!/usr/bin/env node
/**
 * BhaavBrief — AI News Generator
 * Fetches commodity RSS as raw signals, generates original 80-100 word market
 * briefings via Claude, and writes to data/ai-news.json.
 * Runs every 15 minutes via GitHub Actions (appended to flash-brief.yml).
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const OUTPUT_FILE       = path.join(ROOT, 'data/ai-news.json')
const SEEN_FILE         = path.join(__dirname, 'seen-news.json')
const MAX_STORED        = 300   // rolling window
const MAX_PER_RUN       = 8

const FEEDS = [
  { url: 'https://news.google.com/rss/search?q=MCX+commodity+gold+silver+India&hl=en-IN&gl=IN&ceid=IN:en',    source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=OPEC+crude+oil+energy+price+barrels&hl=en&gl=US&ceid=US:en',  source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=RBI+rupee+forex+rate+inflation+India&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=India+commodity+agri+NCDEX+monsoon&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Iran+Russia+sanctions+oil+commodity&hl=en&gl=US&ceid=US:en',  source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Federal+Reserve+rate+dollar+gold&hl=en&gl=US&ceid=US:en',    source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=copper+metal+aluminium+LME+price&hl=en&gl=US&ceid=US:en',    source: 'Google News' },
  { url: 'https://feeds.feedburner.com/ndtvprofit-latest',                                                    source: 'NDTV Profit'  },
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',                              source: 'ET Markets'   },
]

const KEYWORDS = [
  'opec', 'rbi', 'sanctions', 'hormuz', 'suez', 'eia inventory', 'import duty',
  'monsoon', 'supply disruption', 'port strike', 'fed rate', 'crude', 'brent',
  'gold price', 'silver price', 'commodity', 'mcx', 'rupee', 'usdinr',
  'inflation', 'iran', 'russia', 'ukraine', 'china demand', 'federal reserve',
  'rate cut', 'rate hike', 'refinery', 'inventory', 'comex', 'ncdex', 'copper',
  'natural gas', 'aluminium', 'zinc', 'lead', 'nickel', 'castor', 'soybean',
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
  if (/iran|russia|ukraine|hormuz|suez|sanction|war\b|geopolit/.test(t))         return { category: 'Geopolitics', tagType: 'energy' }
  if (/crude|oil\b|opec|brent|refinery|fuel|natural.gas|lng|lpg/.test(t))        return { category: 'Energy',      tagType: 'energy' }
  if (/gold|silver|copper|metal|bullion|comex|aluminium|zinc|nickel/.test(t))     return { category: 'Metals',      tagType: 'metals' }
  if (/agri|wheat|soybean|cotton|pepper|cardamom|ncdex|monsoon|crop|castor/.test(t)) return { category: 'Agri',   tagType: 'agri'   }
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

// ── Live prices (Stooq + Frankfurter) ────────────────────────────────────────

async function fetchLivePrices() {
  const p = { usdInr: 85.0 }
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
      signal: AbortSignal.timeout(5000),
    })
    if (r.ok) p.usdInr = (await r.json()).rates?.INR ?? p.usdInr
  } catch {}

  const symbols = { gold: 'gc.f', silver: 'si.f', crude: 'cl.f', copper: 'hg.f' }
  await Promise.all(Object.entries(symbols).map(async ([name, sym]) => {
    try {
      const r = await fetch(
        `https://stooq.com/q/l/?s=${sym}&f=sd2t2ohlcv&h&e=csv`,
        { signal: AbortSignal.timeout(5000) }
      )
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

function priceContext(p) {
  const parts = [`USD/INR ₹${p.usdInr?.toFixed(2)}`]
  if (p.gold)   parts.push(`Gold $${p.gold.toFixed(0)}/oz (~₹${((p.gold / 31.1035) * 10 * p.usdInr * 1.15).toFixed(0)}/10g MCX)`)
  if (p.silver) parts.push(`Silver $${p.silver.toFixed(2)}/oz (~₹${((p.silver / 31.1035) * 1000 * p.usdInr * 1.10).toFixed(0)}/kg MCX)`)
  if (p.crude)  parts.push(`WTI $${p.crude.toFixed(2)}/bbl (~₹${(p.crude * p.usdInr * 1.02).toFixed(0)}/bbl MCX)`)
  if (p.copper) parts.push(`Copper $${p.copper.toFixed(4)}/lb`)
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
      if (!titleM || !linkM) continue
      items.push({
        title: stripSourceSuffix(titleM[1].trim()),
        url:   linkM[1].trim(),
        desc:  descM ? descM[1].replace(/<[^>]+>/g, '').trim().slice(0, 400) : '',
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
  const prompt = `You are BhaavBrief's commodity intelligence desk. Write an original 80-100 word market briefing for Indian commodity traders.

Live prices: ${ctx}

Instructions:
1. Write a HEADLINE: (10-14 words, specific, include a number or price level, no attribution)
2. Write a BODY: (80-100 words total)
   - First sentence: the key market fact with a specific number
   - Next 3-4 sentences: MCX market implications — which contract, direction, approximate INR price level from context above, why it matters for Indian traders (import cost, duty, spread)
   - Final sentence: what to watch next (data release, price level, event)
   - No opinions, no buy/sell calls, write as BhaavBrief Intelligence

Format your response as:
HEADLINE: <headline here>
BODY: <body here>

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
  const text     = (await res.json()).content?.[0]?.text?.trim() ?? ''
  const headlineM = text.match(/HEADLINE:\s*(.+?)(?:\n|$)/)
  const bodyM     = text.match(/BODY:\s*([\s\S]+)/)

  if (!headlineM || !bodyM) throw new Error('Unexpected Claude response format')

  return {
    title:   headlineM[1].trim(),
    summary: bodyM[1].trim(),
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  console.log('BhaavBrief News Generator — fetching prices...')
  const prices = await fetchLivePrices()
  console.log(`  ${priceContext(prices)}`)

  const seen = loadSeen()
  console.log(`Seen: ${seen.length} URLs`)

  const allItems = (await Promise.all(FEEDS.map(fetchFeed))).flat()
  console.log(`Total fetched: ${allItems.length}`)

  const candidates = allItems.filter(item =>
    isImportant(`${item.title} ${item.desc}`) && !seen.includes(item.url)
  )
  console.log(`New important signals: ${candidates.length}`)

  const existing = loadExisting()
  const newSeen  = [...seen]
  let processed  = 0

  for (const signal of candidates) {
    if (processed >= MAX_PER_RUN) break
    try {
      console.log(`  Generating: ${signal.title.slice(0, 65)}`)
      const { title, summary } = await generateNewsItem(signal, prices)
      const ist = getISTNow()
      const { category, tagType } = detectCategory(`${signal.title} ${signal.desc}`)

      existing.unshift({
        id:       toId(title, ist),
        title,
        summary,
        category,
        tagType,
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
