#!/usr/bin/env node
/**
 * BhaavBrief — Live Intelligence Flash Fetcher
 * Runs every 15 minutes via GitHub Actions
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const FLASH_DIR         = path.join(__dirname, '../content/flash')
const SEEN_FILE         = path.join(__dirname, 'seen-articles.json')

const FEEDS = [
  { url: 'https://news.google.com/rss/search?q=gold+silver+price+india+mcx+comex+today&hl=en-IN&gl=IN&ceid=IN:en',  source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=crude+oil+price+india+brent+wti+today&hl=en-IN&gl=IN&ceid=IN:en',    source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=copper+nickel+aluminium+LME+metal+price&hl=en&gl=US&ceid=US:en',     source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=OPEC+crude+oil+supply+production+cut&hl=en&gl=US&ceid=US:en',         source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=RBI+rupee+forex+India+rate&hl=en-IN&gl=IN&ceid=IN:en',               source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=india+agri+monsoon+ncdex+crop&hl=en-IN&gl=IN&ceid=IN:en',            source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=iran+russia+sanctions+oil+supply+commodity&hl=en&gl=US&ceid=US:en',  source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Federal+Reserve+rate+dollar+commodity&hl=en&gl=US&ceid=US:en',       source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=natural+gas+LNG+price+india+demand&hl=en-IN&gl=IN&ceid=IN:en',       source: 'Google News' },
  { url: 'https://feeds.feedburner.com/ndtvprofit-latest',                                                           source: 'NDTV Profit' },
]

const KEYWORDS = [
  'opec', 'rbi', 'sanctions', 'hormuz', 'suez', 'eia inventory', 'import duty',
  'monsoon forecast', 'supply disruption', 'port strike', 'fed rate', 'crude',
  'gold price', 'silver price', 'commodity', 'mcx', 'rupee', 'usdinr',
  'inflation', 'iran', 'russia', 'ukraine', 'china demand', 'brent', 'opec+',
  'federal reserve', 'rate cut', 'rate hike', 'refinery', 'inventory',
]

function loadSeen() {
  try { return JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')) }
  catch { return [] }
}

function saveSeen(urls) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify(urls.slice(-2000), null, 2), 'utf8')
}

function isImportant(text) {
  const lower = text.toLowerCase()
  return KEYWORDS.some(k => lower.includes(k))
}

function isMCXStockArticle(text) {
  const t = text.toLowerCase()
  return /mcx\s+shares?|mcx\s+stock\b|mcx\s+q[1-4]\s+(result|profit|revenue|pat)|multi.commodity exchange of india\s+(ltd|limited|share|stock|surge|soar|jump|plunge|fall|drop)|mcx\s+share\s+price|mcx\s+(hit|hits)\s+(all.time|52.week)|mcx\s+(split|bonus|dividend)/.test(t)
}

function detectCategory(text) {
  const t = text.toLowerCase()
  if (/crude|oil|opec|eia|brent|refinery|fuel|energy|natural.gas/.test(t)) return 'energy'
  if (/gold|silver|copper|metal|bullion|comex/.test(t))                      return 'metals'
  if (/rupee|forex|usd.?inr|rbi|currency|exchange.rate/.test(t))             return 'forex'
  return 'macro'
}

function toSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48)
    .replace(/-+$/, '')
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function stripSourceSuffix(title) {
  return decodeHtmlEntities(title.replace(/\s+[-–—|]\s+[^-–—|]+$/, '').trim())
}

function getISTNow() {
  const now = new Date()
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
}

// ── Live price fetch: Stooq (COMEX/NYMEX futures) + Frankfurter (USD/INR) ─────
async function fetchLivePrices() {
  const prices = { usdInr: 85.0 }

  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
      signal: AbortSignal.timeout(5000),
    })
    if (r.ok) prices.usdInr = (await r.json()).rates?.INR ?? prices.usdInr
  } catch {}

  // Stooq free CSV API — no key required
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
      // SI (silver) is ¢/troy oz; HG (copper) is ¢/lb on CME/Stooq — normalize to $/unit
      if ((name === 'silver' || name === 'copper') && close > 0) close /= 100
      if (!isNaN(close) && close > 0) prices[name] = close
    } catch {}
  }))

  return prices
}

function formatPriceContext(p) {
  const fx = p.usdInr?.toFixed(2) ?? 'N/A'
  const parts = [`USD/INR: ₹${fx}`]
  if (p.gold)   parts.push(`Gold (COMEX): $${p.gold.toFixed(0)}/oz  (~₹${((p.gold / 31.1035) * 10 * p.usdInr * 1.15).toFixed(0)}/10g MCX)`)
  if (p.silver) parts.push(`Silver (COMEX): $${p.silver.toFixed(2)}/oz  (~₹${((p.silver / 31.1035) * 1000 * p.usdInr * 1.10).toFixed(0)}/kg MCX)`)
  if (p.crude)  parts.push(`WTI Crude: $${p.crude.toFixed(2)}/bbl  (~₹${(p.crude * p.usdInr * 1.02).toFixed(0)}/bbl MCX)`)
  if (p.copper) parts.push(`Copper (COMEX): $${p.copper.toFixed(4)}/lb`)
  return parts.join('\n')
}

async function fetchFeed(feed) {
  try {
    const res  = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BhaavBrief/2.0)' },
      signal:  AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      console.warn(`  Feed HTTP ${res.status} (${new URL(feed.url).hostname})`)
      return []
    }
    const text  = await res.text()
    const items = []

    for (const m of text.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const block  = m[1]
      const titleM = block.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/) || block.match(/<title>([^<]{5,})<\/title>/)
      const linkM  = block.match(/<link>(https?:[^<]+)<\/link>/)           || block.match(/<guid[^>]*>(https?:[^<]+)<\/guid>/)
      const descM  = block.match(/<description><!\[CDATA\[([\s\S]+?)\]\]><\/description>/) || block.match(/<description>([^<]{10,})<\/description>/)

      if (!titleM || !linkM) continue
      items.push({
        title:       stripSourceSuffix(titleM[1].trim()),
        url:         linkM[1].trim(),
        description: descM ? descM[1].replace(/<[^>]+>/g, '').trim().slice(0, 400) : '',
        source:      feed.source,
      })
    }

    console.log(`  ${new URL(feed.url).hostname}: ${items.length} items`)
    return items
  } catch (e) {
    console.warn(`  Feed failed (${new URL(feed.url).hostname}): ${e.message}`)
    return []
  }
}

async function generateFlashContent(article, priceContext) {
  const prompt = `You write for BhaavBrief — India's MCX commodity intelligence service read by professional traders.

Live market context:
${priceContext}

Write a 200-250 word intelligence flash on the article below. Use this exact structure (include the bold headers):

**WHAT HAPPENED**
One sentence. State the specific fact with the key number or figure.

**MCX IMPACT**
3-4 sentences. Name the specific MCX contract(s) affected. State the likely direction and why. Reference a key price level from the live context above. Explain what it means for Indian traders specifically — customs duty, import cost, spread vs COMEX.

**WATCH**
1-2 sentences. Name the next data release, event, or price level that will either confirm or negate this move.

Rules: No opinions. No buy/sell calls. No "may", "could", "might". Only facts and market mechanics. No title. No byline. End with: Source: ${article.source}

Article: ${article.title}. ${article.description}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API ${res.status}: ${JSON.stringify(await res.json())}`)
  return (await res.json()).content?.[0]?.text?.trim() ?? ''
}

function saveFlash({ slug, title, date, source, category, content }) {
  if (!fs.existsSync(FLASH_DIR)) fs.mkdirSync(FLASH_DIR, { recursive: true })
  const safeTitle = title.replace(/"/g, "'").replace(/[\r\n]+/g, ' ').trim()
  const mdx = `---
title: "${safeTitle}"
date: "${date}"
source: "${source}"
category: "${category}"
published: true
---

${content}
`
  fs.writeFileSync(path.join(FLASH_DIR, `${slug}.mdx`), mdx, 'utf8')
  console.log(`  Saved: content/flash/${slug}.mdx`)
}

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  console.log('Fetching live prices...')
  const prices       = await fetchLivePrices()
  const priceContext = formatPriceContext(prices)
  console.log(`Prices: ${priceContext.split('\n').join(' | ')}`)

  const seen = loadSeen()
  console.log(`BhaavBrief Flash — seen: ${seen.length} URLs`)

  const allItems = (await Promise.all(FEEDS.map(fetchFeed))).flat()
  console.log(`Total fetched: ${allItems.length}`)

  const candidates = allItems.filter(item => {
    const text = `${item.title} ${item.description}`
    return !seen.includes(item.url) && isImportant(text) && !isMCXStockArticle(text)
  })
  console.log(`New important articles: ${candidates.length}`)

  const newSeen  = [...seen]
  let processed  = 0
  const titles   = []

  for (const article of candidates) {
    if (processed >= 6) break
    try {
      console.log(`Processing: ${article.title.slice(0, 70)}`)
      const content  = await generateFlashContent(article, priceContext)
      const ist      = getISTNow()
      const p        = n => String(n).padStart(2, '0')
      const slug     = `${ist.getFullYear()}-${p(ist.getMonth()+1)}-${p(ist.getDate())}-${p(ist.getHours())}-${p(ist.getMinutes())}-${toSlug(article.title)}`
      const category = detectCategory(`${article.title} ${article.description}`)

      saveFlash({
        slug,
        title:    article.title,
        date:     new Date().toISOString(),
        source:   article.source,
        category,
        content,
      })

      newSeen.push(article.url)
      titles.push(article.title)
      processed++
    } catch (e) {
      console.warn(`  Skipped: ${e.message}`)
      newSeen.push(article.url)
    }
  }

  saveSeen(newSeen)
  console.log(`Done — ${processed} new flash articles.`)

  if (process.env.GITHUB_OUTPUT && titles.length > 0) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `count=${processed}\ntitle=${titles[0].replace(/[\r\n]+/g, ' ').trim()}\n`
    )
  }
}

main().catch(err => {
  console.error('Flash failed:', err.message)
  process.exit(1)
})
