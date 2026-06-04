#!/usr/bin/env node
/**
 * BhaavBrief — Live Intelligence Flash Fetcher
 * Runs every 15 minutes via GitHub Actions
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { isTradingHoliday, getHolidayName, todayIST } from './lib/holidays.js'
import { fetchPexelsImage } from './lib/pexels.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const FLASH_DIR         = path.join(__dirname, '../content/flash')
const SEEN_FILE         = path.join(__dirname, 'seen-articles.json')

const FEEDS = [
  // Precious metals
  { url: 'https://news.google.com/rss/search?q=gold+silver+price+india+mcx+comex+today&hl=en-IN&gl=IN&ceid=IN:en',       source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=gold+import+duty+india+bullion+mcx&hl=en-IN&gl=IN&ceid=IN:en',             source: 'Google News' },
  // Energy
  { url: 'https://news.google.com/rss/search?q=crude+oil+price+india+brent+wti+today&hl=en-IN&gl=IN&ceid=IN:en',          source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=OPEC+crude+oil+supply+production+cut&hl=en&gl=US&ceid=US:en',               source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=EIA+crude+oil+natural+gas+inventory+weekly&hl=en&gl=US&ceid=US:en',         source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=natural+gas+LNG+henry+hub+price+india&hl=en-IN&gl=IN&ceid=IN:en',           source: 'Google News' },
  // Base metals — LME + India
  { url: 'https://news.google.com/rss/search?q=copper+LME+price+china+comex+today&hl=en&gl=US&ceid=US:en',                 source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=zinc+aluminium+lead+nickel+LME+metal+price&hl=en&gl=US&ceid=US:en',         source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=zinc+aluminium+nickel+price+india+MCX&hl=en-IN&gl=IN&ceid=IN:en',           source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Hindustan+Zinc+aluminium+nickel+india+production&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News' },
  // Macro / forex
  { url: 'https://news.google.com/rss/search?q=Federal+Reserve+FOMC+rate+dollar+commodity&hl=en&gl=US&ceid=US:en',         source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=RBI+rupee+forex+india+rate+commodity&hl=en-IN&gl=IN&ceid=IN:en',            source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=US+CPI+inflation+dollar+index+commodity&hl=en&gl=US&ceid=US:en',            source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=china+economy+pmi+stimulus+commodity+demand&hl=en&gl=US&ceid=US:en',        source: 'Google News' },
  // Geopolitical supply risk
  { url: 'https://news.google.com/rss/search?q=iran+russia+sanctions+oil+supply+commodity&hl=en&gl=US&ceid=US:en',         source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=indonesia+nickel+export+ban+mining+commodity&hl=en&gl=US&ceid=US:en',       source: 'Google News' },
  // India policy
  { url: 'https://news.google.com/rss/search?q=india+import+export+duty+commodity+dgft+customs&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=india+agri+monsoon+ncdex+msp+crop&hl=en-IN&gl=IN&ceid=IN:en',               source: 'Google News' },
  // EV / energy transition
  { url: 'https://news.google.com/rss/search?q=EV+battery+lithium+nickel+copper+commodity+demand&hl=en&gl=US&ceid=US:en',  source: 'Google News' },
  // India financial press
  { url: 'https://feeds.feedburner.com/ndtvprofit-latest',                                                                  source: 'NDTV Profit' },
  { url: 'https://economictimes.indiatimes.com/markets/commodities/rssfeeds/1808152059.cms',                                source: 'ET Markets' },
  { url: 'https://www.business-standard.com/rss/markets-106.rss',                                                          source: 'Business Standard' },
]

const KEYWORDS = [
  // Exchange + regulatory
  'opec', 'opec+', 'rbi', 'sebi', 'mcx', 'ncdex', 'eia inventory',
  // Trade / policy
  'sanctions', 'import duty', 'export ban', 'dgft', 'customs duty', 'tariff',
  // Supply routes
  'hormuz', 'suez', 'red sea', 'port strike', 'supply disruption', 'refinery',
  // Macro
  'federal reserve', 'fomc', 'fed rate', 'rate cut', 'rate hike', 'cpi', 'inflation',
  'rupee', 'usdinr', 'dollar index', 'treasury yield', 'china pmi', 'china demand',
  // Commodities
  'crude', 'brent', 'wti', 'natural gas', 'lng', 'henry hub',
  'gold price', 'silver price', 'copper', 'zinc', 'aluminium', 'nickel', 'lead',
  'commodity',
  // Geopolitical
  'iran', 'russia', 'ukraine', 'monsoon forecast', 'monsoon',
  // Demand drivers
  'inventory', 'ev battery', 'lithium', 'indonesia nickel',
]

const SEEN_TTL_HOURS = 36  // expire seen URLs after 36h so stale list never locks out new content

function loadSeen() {
  try {
    const raw = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))
    if (!raw.length) return []
    // Legacy format (plain strings) — treat as permanent but still honour the list
    if (typeof raw[0] === 'string') return raw
    // New format with TTL
    const cutoff = Date.now() - SEEN_TTL_HOURS * 3600 * 1000
    return raw.filter(e => new Date(e.seenAt).getTime() > cutoff).map(e => e.url)
  } catch { return [] }
}

function saveSeen(urls) {
  const now = new Date().toISOString()
  const entries = urls.slice(-2000).map(u => ({ url: u, seenAt: now }))
  fs.writeFileSync(SEEN_FILE, JSON.stringify(entries, null, 2), 'utf8')
}

function isImportant(text) {
  const lower = text.toLowerCase()
  return KEYWORDS.some(k => lower.includes(k))
}

function isMCXStockArticle(text) {
  const t = text.toLowerCase()
  return (
    // MCX the company's stock
    /mcx\s+shares?|mcx\s+stock\b|mcx\s+q[1-4]\s+(result|profit|revenue|pat)|mcx\s+share\s+price|mcx\s+(hit|hits)\s+(all.time|52.week)|mcx\s+(split|bonus|dividend)|multi.commodity exchange of india\s+(ltd|limited|share|stock|surge|soar|jump|plunge|fall|drop)|block\s+trade.*nse|nse.*block\s+trade/.test(t) ||
    // Evergreen clickbait that gets recycled with old dates
    /price.prediction.today|will\s+(gold|silver|crude).*(rise|fall|rally|crash).*(today|tomorrow)/.test(t) ||
    // Old-date rate roundups (e.g. "rates today august 21", "rates today october 13")
    /rates?\s+today\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/.test(t) ||
    // Holiday / trading hours articles
    /(market|exchange|mcx|nse|bse).*(closed|holiday|shut|off).*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|holi|diwali|navami|republic|independence|christmas|gandhi)/.test(t) ||
    /trading\s+hours?.*(revision|update|change)|revision.*(trading\s+hours?|market\s+hours?)/.test(t) ||
    // Broker promotions
    /(groww|zerodha|angel|upstox|5paisa).*(launch|offer|now\s+trade|commodity\s+trading)/.test(t) ||
    // Best-of / top-N listicles
    /best\s+trading\s+apps?|top\s+\d+\s+(stocks?|commodity)|multibaggers?|\d+\s+smallcap/.test(t)
  )
}

function detectCategory(text) {
  const t = text.toLowerCase()
  if (/crude|oil|opec|eia|brent|refinery|fuel|energy|natural.gas/.test(t)) return 'energy'
  if (/gold|silver|copper|metal|bullion|comex/.test(t))                      return 'metals'
  if (/rupee|forex|usd.?inr|rbi|currency|exchange.rate/.test(t))             return 'forex'
  return 'macro'
}

function toSlug(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  if (slug.length <= 60) return slug
  // Cut at word boundary — never mid-word
  const cut = slug.slice(0, 60)
  const lastDash = cut.lastIndexOf('-')
  return lastDash > 25 ? cut.slice(0, lastDash) : cut
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

// ── Freshness gate ────────────────────────────────────────────────────────────
function isFresh(pubDate, maxMinutes = 300) {
  if (!pubDate) return false
  return (Date.now() - new Date(pubDate).getTime()) <= maxMinutes * 60 * 1000
}

// ── Google Trends India — what is India searching right now ───────────────────
async function fetchTrendingTopics() {
  const FINANCE_TERMS = [
    'gold', 'silver', 'oil', 'crude', 'petrol', 'rupee', 'dollar',
    'rbi', 'inflation', 'commodity', 'mcx', 'copper', 'gas', 'market',
    'sensex', 'nifty', 'sebi', 'fed', 'opec', 'brent', 'comex',
    'interest rate', 'forex', 'wheat', 'sugar', 'cotton',
  ]
  try {
    const res = await fetch(
      'https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const xml    = await res.text()
    const topics = []
    for (const m of xml.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g)) {
      const t = m[1].trim().toLowerCase()
      if (FINANCE_TERMS.some(f => t.includes(f))) topics.push(t)
    }
    return topics.slice(0, 10)
  } catch {
    return []
  }
}

// ── Relevance score for candidate ranking ─────────────────────────────────────
function scoreArticle(article, trendingTopics) {
  const text   = `${article.title} ${article.description}`.toLowerCase()
  let score    = 0

  // Recency: max 60 pts for brand-new, decays to 0 at 90 min
  if (article.pubDate) {
    const ageMin = (Date.now() - new Date(article.pubDate).getTime()) / 60000
    score += Math.max(0, 60 - ageMin * (60 / 90))
  }

  // Trending match: 25 pts each
  trendingTopics.forEach(t => { if (text.includes(t)) score += 25 })

  // Keyword density: 5 pts each
  KEYWORDS.forEach(k => { if (text.includes(k)) score += 5 })

  return score
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
      const pubDateM = block.match(/<pubDate>([^<]+)<\/pubDate>/)
      const pubDate  = pubDateM ? new Date(pubDateM[1].trim()) : null
      items.push({
        title:       stripSourceSuffix(titleM[1].trim()),
        url:         linkM[1].trim(),
        description: descM ? descM[1].replace(/<[^>]+>/g, '').trim().slice(0, 400) : '',
        source:      feed.source,
        pubDate:     pubDate && !isNaN(pubDate) ? pubDate.toISOString() : null,
      })
    }

    console.log(`  ${new URL(feed.url).hostname}: ${items.length} items`)
    return items
  } catch (e) {
    console.warn(`  Feed failed (${new URL(feed.url).hostname}): ${e.message}`)
    return []
  }
}

async function generateFlashContent(article, priceContext, trendingTopics) {
  const trendingLine = trendingTopics.length > 0
    ? `Trending searches in India right now: ${trendingTopics.slice(0, 5).join(', ')}. Where natural and accurate, use language that matches these terms — this helps readers find this article.`
    : ''

  const prompt = `You write for BhaavBrief — India's MCX commodity intelligence service read by professional traders.

Live market context:
${priceContext}
${trendingLine ? '\n' + trendingLine : ''}

Write a 200-240 word intelligence flash on the article below. Use this exact structure (include the bold headers):

**WHAT HAPPENED**
One sentence. State the specific fact with the key number or figure. Facts only, no interpretation.

**WHAT IT MEANS**
2-3 sentences. Name the mechanism AND the specific actors in the same breath. Examples: "west-coast refiners HPCL/BPCL face a higher crude import cost at current WTI levels", "jewellers and bullion dealers holding gold inventory see rupee-denominated valuations rise", "MCX copper futures traders see basis vs COMEX tighten as import parity reprices". Reference a price level from the live context above. No "may", "could", "might" — only facts and market mechanics.

**WHO IS AFFECTED**
Name specific industries, businesses, and consumer groups — never abstractions. Examples: "MCX crude traders, airline fuel desks at IndiGo and SpiceJet, and petrol pump operators" or "jewellers in Zaveri Bazaar, gold ETF desks at HDFC AMC and SBI MF, and retail buyers ahead of Akshaya Tritiya".

**BOTTOM LINE**
3 sentences structured as: (1) Businesses: one named sector and one concrete cost/revenue consequence. (2) Investors: one named MCX contract and the directional signal. (3) Consumers: one named product and the price direction. BANNED phrases: "businesses face higher costs", "investors should watch", "consumers may see higher prices", "market participants should be aware", "industry stakeholders".

**WHAT TO WATCH**
1-2 sentences. Name the next specific data release, event, or price level that will confirm or negate this move.

Rules: No opinions. No action verbs directed at the reader. No title. No byline. End with: Source: ${article.source}

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
      max_tokens: 550,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API ${res.status}: ${JSON.stringify(await res.json())}`)
  return (await res.json()).content?.[0]?.text?.trim() ?? ''
}

function saveFlash({ slug, title, date, source, category, content, coverImage }) {
  if (!fs.existsSync(FLASH_DIR)) fs.mkdirSync(FLASH_DIR, { recursive: true })
  const safeTitle = title.replace(/"/g, "'").replace(/[\r\n]+/g, ' ').trim()
  const coverLine = coverImage ? `\ncoverImage: "${coverImage}"` : ''
  const mdx = `---
title: "${safeTitle}"
date: "${date}"
source: "${source}"
category: "${category}"
published: true${coverLine}
---

${content}
`
  fs.writeFileSync(path.join(FLASH_DIR, `${slug}.mdx`), mdx, 'utf8')
  console.log(`  Saved: content/flash/${slug}.mdx`)
}

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const today = todayIST()
  if (isTradingHoliday(today)) {
    const name = getHolidayName(today)
    console.log(`MCX holiday (${today}${name ? ': ' + name : ''}) — flash engine sleeping`)
    return
  }

  // Fetch prices + trending topics in parallel
  console.log('Fetching prices and trending topics...')
  const [prices, trendingTopics] = await Promise.all([
    fetchLivePrices(),
    fetchTrendingTopics(),
  ])
  const priceContext = formatPriceContext(prices)
  console.log(`Prices: ${priceContext.split('\n').join(' | ')}`)
  console.log(`Trending finance topics: ${trendingTopics.length > 0 ? trendingTopics.slice(0, 5).join(', ') : 'none'}`)

  const seen = loadSeen()
  console.log(`BhaavBrief Flash — seen: ${seen.length} URLs`)

  // Mark all URLs seen regardless — so stale articles never get retried
  const allItems = (await Promise.all(FEEDS.map(fetchFeed))).flat()
  console.log(`Total fetched: ${allItems.length}`)

  // Filter: unseen + important + not MCX stock + FRESH (< 360 min / 6h old)
  // Google News RSS — especially Indian outlets — can return articles 2-6h old.
  // 90-min window was killing most legitimate stories.
  const candidates = allItems.filter(item => {
    const text = `${item.title} ${item.description}`
    if (seen.includes(item.url))       return false
    if (!isImportant(text))            return false
    if (isMCXStockArticle(text))       return false
    if (!isFresh(item.pubDate, 360))   return false  // skip anything older than 6h
    return true
  })

  // Only mark URLs seen when actually published — never pre-mark stale items
  // (pre-marking caused 761 URLs to be bulk-poisoned in a single run)
  const newSeen = [...seen]

  // Sort by relevance: recency + trending match + keyword density
  candidates.sort((a, b) => scoreArticle(b, trendingTopics) - scoreArticle(a, trendingTopics))

  console.log(`Fresh important articles: ${candidates.length}`)
  if (candidates.length === 0) {
    saveSeen(newSeen)
    console.log('Nothing fresh to publish — exiting cleanly')
    return
  }

  let processed = 0
  const titles  = []

  for (const article of candidates) {
    if (processed >= 1) break  // max 1 per run — prevents burst after seen-list reset
    try {
      const ageMin = article.pubDate
        ? ((Date.now() - new Date(article.pubDate).getTime()) / 60000).toFixed(0)
        : '?'
      console.log(`Processing (${ageMin}min old): ${article.title.slice(0, 70)}`)

      const content  = await generateFlashContent(article, priceContext, trendingTopics)
      const ist      = getISTNow()
      const p        = n => String(n).padStart(2, '0')
      const slug     = `${ist.getFullYear()}-${p(ist.getMonth()+1)}-${p(ist.getDate())}-${toSlug(article.title)}`
      const category = detectCategory(`${article.title} ${article.description}`)
      const coverImage = await fetchPexelsImage(article.title, category)

      saveFlash({
        slug,
        title:    article.title,
        date:     article.pubDate ?? new Date().toISOString(),
        source:   'BhaavBrief',
        category,
        content,
        coverImage,
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
