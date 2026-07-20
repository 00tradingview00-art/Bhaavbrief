#!/usr/bin/env node
/**
 * BhaavBrief — Geopolitical Signal Monitor
 * Runs every 15 min via flash-brief.yml
 * Detects breaking geopolitical events and publishes MCX commodity impact
 * flash articles — independent of commodity-filtered queries in fetch-flash.js.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { fetchPexelsImage } from './lib/pexels.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.join(__dirname, '..')
const FLASH_DIR  = path.join(ROOT, 'content/flash')
const SEEN_FILE  = path.join(__dirname, 'seen-geopolitical.json')
const SEEN_TTL   = 72 * 3600 * 1000  // 72h — geopolitical events don't recur daily

const envFile = path.join(ROOT, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Sources ───────────────────────────────────────────────────────────────────

const FEEDS = [
  { url: 'https://news.google.com/rss/search?q=iran+israel+military+attack+strike&hl=en&gl=US&ceid=US:en', source: 'Geopolitical' },
  { url: 'https://news.google.com/rss/search?q=russia+ukraine+war+energy+pipeline+sanctions&hl=en&gl=US&ceid=US:en', source: 'Geopolitical' },
  { url: 'https://news.google.com/rss/search?q=OPEC+production+cut+oil+supply+meeting&hl=en&gl=US&ceid=US:en', source: 'Geopolitical' },
  { url: 'https://news.google.com/rss/search?q=china+india+trade+tariff+commodity+demand&hl=en&gl=US&ceid=US:en', source: 'Geopolitical' },
  { url: 'https://news.google.com/rss/search?q=middle+east+conflict+strait+hormuz+red+sea+shipping&hl=en&gl=US&ceid=US:en', source: 'Geopolitical' },
]

const GEOPOLITICAL_SIGNALS = [
  'strike', 'attack', 'war', 'sanctions', 'opec', 'hormuz',
  'red sea', 'pipeline', 'invasion', 'blockade', 'embargo',
  'escalat', 'tariff', 'trade war', 'production cut',
]

// Must ALSO mention commodities/prices directly — prevents pure political news
const COMMODITY_SIGNALS = [
  'oil', 'crude', 'gas', 'gold', 'silver', 'copper', 'metal',
  'supply', 'price', 'brent', 'wti', 'opec', 'barrel', 'energy',
  'commodity', 'fuel', 'petrole', 'refiner',
]

// Google News appends " - Source Name" to every headline — strip it
function cleanTitle(raw) {
  return raw.replace(/\s+-\s+[^-]{2,50}$/, '').trim()
}

function isGeopoliticalItem(title) {
  const t = title.toLowerCase()
  const hasGeo = GEOPOLITICAL_SIGNALS.some(s => t.includes(s))
  const hasCommodity = COMMODITY_SIGNALS.some(s => t.includes(s))
  // Both must be present — no pure political news without commodity angle
  return hasGeo && hasCommodity
}

function mapToCommodities(title) {
  const t = title.toLowerCase()
  const commodities = []
  if (/iran|hormuz|middle east|israel|kuwait|gulf/.test(t))  commodities.push('Crude Oil', 'Natural Gas', 'Gold')
  if (/russia|ukraine|pipeline/.test(t))                      commodities.push('Natural Gas', 'Crude Oil', 'Gold')
  if (/opec|saudi|production cut/.test(t))                    commodities.push('Crude Oil')
  if (/china|tariff|trade war/.test(t))                       commodities.push('Copper', 'Gold', 'Crude Oil')
  if (/red sea|suez|shipping/.test(t))                        commodities.push('Crude Oil', 'Silver', 'Copper')
  return [...new Set(commodities)].join(', ') || 'Crude Oil, Gold'
}

// ── Seen state ────────────────────────────────────────────────────────────────

function loadSeen() {
  try {
    const raw = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))
    const cutoff = Date.now() - SEEN_TTL
    return raw.filter(e => new Date(e.seenAt).getTime() > cutoff)
  } catch { return [] }
}

function saveSeen(entries) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify(entries.slice(-500), null, 2), 'utf8')
}

// ── RSS fetch ─────────────────────────────────────────────────────────────────

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 BhaavBrief/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    const xml = await res.text()

    const items = []
    const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/g) ?? []
    for (const block of itemBlocks.slice(0, 8)) {
      const titleM = block.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/) ??
                     block.match(/<title>([^<]{10,200})<\/title>/)
      const dateM  = block.match(/<pubDate>([^<]+)<\/pubDate>/)
      const linkM  = block.match(/<link>([^<]+)<\/link>/) ??
                     block.match(/<link[^>]*href="([^"]+)"/)

      if (!titleM) continue
      const title   = cleanTitle((titleM[1] ?? '').trim())
      const pubDate = dateM ? new Date(dateM[1]) : new Date()
      const url     = linkM ? linkM[1].trim() : feed.url

      // Only items published in the last 10 hours (covers the overnight gap between the
      // 11:52 PM IST run and the 9:07 AM IST run — flash-brief doesn't run 12 AM-8 AM IST)
      if (Date.now() - pubDate.getTime() > 10 * 3600 * 1000) continue

      items.push({ title, url, source: feed.source, pubDate })
    }
    return items
  } catch (e) {
    console.warn(`Feed failed (${feed.source}):`, e.message)
    return []
  }
}

// ── AI breakdown ──────────────────────────────────────────────────────────────

async function generateBreakdown(item, commodities) {
  const prompt = `You are BhaavBrief's market analyst. A breaking geopolitical event has been detected.

EVENT: "${item.title}"
MCX COMMODITIES AFFECTED: ${commodities}

Write a flash article for Indian MCX commodity traders. Use this exact format:

TITLE: [BhaavBrief-framed headline focused on MCX impact, under 70 chars, no source names]

**WHAT HAPPENED**
One sentence. State the specific fact — what occurred, where, who acted. Facts only, no interpretation.

**WHAT IT MEANS**
2-3 sentences. Name the mechanism AND the specific actors in the same breath. Examples: "crude importers and refinery procurement desks face higher rupee-denominated costs on every barrel cleared at elevated WTI levels", "jewellers and bullion dealers holding dollar-denominated gold see rupee inventory values rise", "copper wire manufacturers sourcing from LME-linked contracts face spot premium expansion". No generic phrases.

**WHO IS AFFECTED**
2–3 flowing prose sentences tracing the causal ripple from this specific event through the supply chain. Think in layers: (1) direct commercial users of this commodity — importers, refiners, processors — and what specific cost line or margin changes for them today; (2) mid-chain businesses that use this commodity as an input — manufacturers, D2C brands, logistics operators, packagers — and how their day-to-day procurement or pricing decision shifts; (3) end consumers — households, retail buyers — and what they pay more or less for.
Do NOT name a specific company unless it is named in the event headline.
Do NOT repeat mechanisms or actors already named in WHAT IT MEANS — add new layers of the chain.
Derive the affected chain from the actual commodity in this event, not from a template.
Example (silver rising on safe-haven demand): "Silver fabricators and industrial electroplating units sourcing monthly on spot contracts see their input cost reprice immediately, while D2C jewellery brands carrying finished-goods inventory face a margin squeeze on catalogue prices set before this move. Retail buyers purchasing silverware ahead of festivals and households using solar water heaters — which use silver-based thermal coatings — absorb the cost at the point of purchase."

**BOTTOM LINE**
3 complete prose sentences — no category labels, no colons prefixing sentences. First sentence: name one specific business sector and one concrete cost or revenue consequence. Second sentence: name one specific MCX contract and its directional signal with a price level or threshold. Third sentence: name one specific consumer product or end-user group and the price direction. BANNED phrases: "businesses face higher costs", "investors should watch", "consumers may see higher prices", "market participants should be aware".

**WHAT TO WATCH**
1-2 sentences. Name the next specific catalyst — a data release, OPEC statement, price level breach, or scheduled event — that will confirm or negate this move.

RULES:
- SEBI-compliant: educational only, no buy/sell advice
- FORMATTING: Use **bold** inline for key data — price levels, % moves, commodity/company names on first mention, critical thresholds. Bold specific numbers and names only, never full sentences.
- Never fabricate specific price targets
- Never include news outlet names (Reuters, BBC, etc.) anywhere
- Write for an ET Markets reader, not a geopolitics expert
- Total body length 220-270 words
- End with: Source: International News | bhaavbrief.in`

  const r = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 750,
    messages:   [{ role: 'user', content: prompt }],
  })
  if (r.content[0].type !== 'text') return null

  const raw = r.content[0].text.trim()
  const titleMatch = raw.match(/^TITLE:\s*(.+)/m)
  const title = titleMatch ? titleMatch[1].trim() : item.title
  const body  = raw.replace(/^TITLE:.*\n?/m, '').trim()

  return { title, body }
}

// ── Save flash article ────────────────────────────────────────────────────────

function slugify(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '')
}

function getPublishedTitles() {
  if (!fs.existsSync(FLASH_DIR)) return new Set()
  return new Set(
    fs.readdirSync(FLASH_DIR)
      .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
      .map(f => { try { const m = fs.readFileSync(path.join(FLASH_DIR, f), 'utf8').match(/^title:\s*"(.+)"/m); return m ? m[1].toLowerCase().replace(/[^a-z0-9]/g, '') : '' } catch { return '' } })
      .filter(Boolean)
  )
}

function saveFlashArticle(item, aiTitle, body, coverImage) {
  const now        = new Date()
  const datePrefix = now.toISOString().slice(0, 10)
  const timePrefix = now.toISOString().slice(11, 16).replace(':', '-')
  const slug       = slugify(aiTitle)
  const fname      = `${datePrefix}-${timePrefix}-${slug}.mdx`
  const fpath      = path.join(FLASH_DIR, fname)

  if (fs.existsSync(fpath)) return null
  if (getPublishedTitles().has(aiTitle.toLowerCase().replace(/[^a-z0-9]/g, ''))) return null

  const coverLine = coverImage ? `\ncoverImage: "${coverImage}"` : ''
  const mdx = `---
title: "${aiTitle.replace(/"/g, '\\"')}"
date: "${now.toISOString()}"
source: "BhaavBrief"
category: "geopolitical"
published: true${coverLine}
---

${body}
`.trim()

  fs.writeFileSync(fpath, mdx, 'utf8')
  return fname
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY not set — skipping geopolitical monitor')
    return
  }

  if (!fs.existsSync(FLASH_DIR)) fs.mkdirSync(FLASH_DIR, { recursive: true })

  const seen    = loadSeen()
  const seenIds = new Set(seen.map(e => e.id))

  // Fetch all feeds in parallel
  const feedResults = await Promise.all(FEEDS.map(fetchFeed))
  const allItems = feedResults.flat()

  const newEvents = []
  for (const item of allItems) {
    const id = item.title.slice(0, 80)
    if (seenIds.has(id)) continue
    if (!isGeopoliticalItem(item.title)) continue
    newEvents.push({ ...item, id })
    seenIds.add(id)
  }

  console.log(`Geopolitical monitor: ${allItems.length} items fetched, ${newEvents.length} new events`)

  let published = 0
  for (const event of newEvents.slice(0, 1)) {  // max 1 per run
    const commodities = mapToCommodities(event.title)
    console.log(`  → ${event.title.slice(0, 80)} [${commodities}]`)
    try {
      const result = await generateBreakdown(event, commodities)
      if (!result) continue
      const { title: aiTitle, body } = result
      const coverImage = await fetchPexelsImage(aiTitle, 'geopolitical')
      const fname = saveFlashArticle(event, aiTitle, body, coverImage)
      if (fname) {
        console.log(`    ✅ Published: ${fname}`)
        published++
      }
    } catch (e) {
      console.warn(`    ⚠️  Failed: ${e.message}`)
    }
  }

  // Persist seen list with new entries
  const now = new Date().toISOString()
  const updatedSeen = [
    ...seen,
    ...newEvents.map(e => ({ id: e.id, seenAt: now })),
  ]
  saveSeen(updatedSeen)

  console.log(`Geopolitical monitor done — ${published} articles published`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
