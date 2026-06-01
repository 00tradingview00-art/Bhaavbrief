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
  'strike', 'attack', 'war', 'conflict', 'sanctions', 'opec', 'hormuz',
  'red sea', 'pipeline', 'military', 'invasion', 'blockade', 'embargo',
  'ceasefire', 'escalat', 'tariff', 'trade war', 'production cut',
]

function isGeopoliticalItem(title) {
  const t = title.toLowerCase()
  return GEOPOLITICAL_SIGNALS.some(s => t.includes(s))
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
      const title = (titleM[1] ?? '').trim()
      const pubDate = dateM ? new Date(dateM[1]) : new Date()
      const url   = linkM ? linkM[1].trim() : feed.url

      // Only items published in the last 3 hours
      if (Date.now() - pubDate.getTime() > 3 * 3600 * 1000) continue

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

Write a 150-200 word flash article for Indian MCX commodity traders:

**WHAT HAPPENED**
[1-2 sentences: the event in plain English, no jargon]

**MCX IMPACT**
[Why these specific commodities move — supply route, safe-haven demand, production disruption, etc.]

**WHAT TO WATCH**
[2-3 sentences: price levels, confirmation signals, or follow-on events traders should track]

RULES:
- SEBI-compliant: educational only, no buy/sell advice
- Never fabricate specific price targets
- Write for an ET Markets reader, not a geopolitics expert
- End with: Source: International News | bhaavbrief.in

Return only the article body (no frontmatter).`

  const r = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages:   [{ role: 'user', content: prompt }],
  })
  return r.content[0].type === 'text' ? r.content[0].text.trim() : null
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

function saveFlashArticle(item, body) {
  const now        = new Date()
  const datePrefix = now.toISOString().slice(0, 10)
  const timePrefix = now.toISOString().slice(11, 16).replace(':', '-')
  const slug       = slugify(item.title)
  const fname      = `${datePrefix}-${timePrefix}-${slug}.mdx`
  const fpath      = path.join(FLASH_DIR, fname)

  if (fs.existsSync(fpath)) return null

  const mdx = `---
title: "${item.title.replace(/"/g, '\\"')}"
date: "${now.toISOString()}"
source: "${item.source}"
category: "geopolitical"
published: true
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
    const id = item.title.slice(0, 100)
    if (seenIds.has(id)) continue
    if (!isGeopoliticalItem(item.title)) continue
    newEvents.push({ ...item, id })
    seenIds.add(id)
  }

  console.log(`Geopolitical monitor: ${allItems.length} items fetched, ${newEvents.length} new events`)

  let published = 0
  for (const event of newEvents) {
    const commodities = mapToCommodities(event.title)
    console.log(`  → ${event.title.slice(0, 80)} [${commodities}]`)
    try {
      const body  = await generateBreakdown(event, commodities)
      if (!body) continue
      const fname = saveFlashArticle(event, body)
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
