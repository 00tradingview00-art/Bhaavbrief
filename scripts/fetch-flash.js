#!/usr/bin/env node
/**
 * BhaavBrief — Live Intelligence Flash Fetcher
 * Runs every 15 minutes via GitHub Actions
 */

const fs   = require('fs')
const path = require('path')

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const FLASH_DIR         = path.join(__dirname, '../content/flash')
const SEEN_FILE         = path.join(__dirname, 'seen-articles.json')

const FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/businessNews',                                                   source: 'Reuters' },
  { url: 'https://economictimes.indiatimes.com/markets/commodities/rssfeeds/1808478787.cms',                source: 'Economic Times' },
  { url: 'https://news.google.com/rss/search?q=MCX+commodity+India&hl=en-IN&gl=IN&ceid=IN:en',              source: 'Google News' },
  { url: 'https://www.iea.org/rss/news.xml',                                                                 source: 'IEA' },
  { url: 'https://www.eia.gov/rss/news_international.xml',                                                   source: 'EIA' },
  { url: 'https://feeds.feedburner.com/ndtvprofit-latest',                                                   source: 'NDTV Profit' },
  { url: 'https://news.google.com/rss/search?q=OPEC+crude+oil&hl=en&gl=US&ceid=US:en',                     source: 'Reuters' },
  { url: 'https://news.google.com/rss/search?q=RBI+rupee+forex+India&hl=en-IN&gl=IN&ceid=IN:en',           source: 'Reuters' },
]

const KEYWORDS = [
  'opec', 'rbi', 'sanctions', 'hormuz', 'suez', 'eia inventory', 'import duty',
  'monsoon forecast', 'supply disruption', 'port strike', 'fed rate', 'crude',
  'gold price', 'silver price', 'commodity', 'mcx', 'rupee', 'usdinr',
  'inflation', 'iran', 'russia', 'ukraine', 'china demand',
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

function stripSourceSuffix(title) {
  // Remove trailing " - Source Name" or " | Source Name" added by Google News aggregation
  return title.replace(/\s+[-–—|]\s+[^-–—|]+$/, '').trim()
}

function getISTNow() {
  const now = new Date()
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
}

async function fetchFeed(feed) {
  try {
    const res  = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BhaavBrief/2.0)' },
      signal:  AbortSignal.timeout(8000),
    })
    const text = await res.text()
    const items = []

    for (const m of text.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const block = m[1]
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

async function generateFlashContent(article) {
  const prompt = `You write for BhaavBrief, India's commodity intelligence service. Write an 80-120 word flash intelligence note about this news. Format: first sentence states the fact clearly with numbers. Second paragraph explains the MCX market impact — which commodity, which direction, why. No opinions, no calls, no hedging. Just clean facts and market context. No title. End with: Source: ${article.source}

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
      max_tokens: 220,
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

  const seen = loadSeen()
  console.log(`BhaavBrief Flash — seen: ${seen.length} URLs`)

  const allItems = (await Promise.all(FEEDS.map(fetchFeed))).flat()
  console.log(`Total fetched: ${allItems.length}`)

  const candidates = allItems.filter(item =>
    isImportant(`${item.title} ${item.description}`) && !seen.includes(item.url)
  )
  console.log(`New important articles: ${candidates.length}`)

  const newSeen  = [...seen]
  let processed  = 0
  const titles   = []

  for (const article of candidates) {
    if (processed >= 3) break
    try {
      console.log(`Processing: ${article.title.slice(0, 70)}`)
      const content  = await generateFlashContent(article)
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
