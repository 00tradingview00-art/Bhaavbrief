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

      // Only items published in the last 3 hours
      if (Date.now() - pubDate.getTime() > 6 * 3600 * 1000) continue

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
2-3 sentences. Name the mechanism AND the specific actors in the same breath. Examples: "west-coast refiners HPCL/BPCL face higher crude import costs", "jewellers and bullion dealers holding dollar-denominated gold see rupee inventory values rise", "copper wire manufacturers sourcing from LME-linked contracts face spot premium expansion". No generic phrases.

**WHO IS AFFECTED**
Name specific industries, businesses, and consumer groups — never abstractions. Examples: "MCX crude traders, airline fuel desks at IndiGo and Air India, and petrol pump operators on the western coast" or "jewellers in Zaveri Bazaar and institutional gold ETF desks at HDFC AMC and SBI Mutual Fund".

**BOTTOM LINE**
3 sentences structured as: (1) Businesses: one named sector and one concrete cost/revenue consequence. (2) Investors: one named MCX contract and the directional signal. (3) Consumers: one named product and the price direction. BANNED phrases: "businesses face higher costs", "investors should watch", "consumers may see higher prices", "market participants should be aware".

**WHAT TO WATCH**
1-2 sentences. Name the next specific catalyst — a data release, OPEC statement, price level breach, or scheduled event — that will confirm or negate this move.

RULES:
- SEBI-compliant: educational only, no buy/sell advice
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

function saveFlashArticle(item, aiTitle, body, coverImage) {
  const now        = new Date()
  const datePrefix = now.toISOString().slice(0, 10)
  const timePrefix = now.toISOString().slice(11, 16).replace(':', '-')
  const slug       = slugify(aiTitle)
  const fname      = `${datePrefix}-${timePrefix}-${slug}.mdx`
  const fpath      = path.join(FLASH_DIR, fname)

  if (fs.existsSync(fpath)) return null

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
