#!/usr/bin/env node
/**
 * BhaavBrief — NCDEX Agri Monitor
 * Runs every 15 min via flash-brief.yml
 * Detects agri commodity news (jeera, turmeric, chana, guar, mustard, soybean,
 * cotton, castor, coriander, spices, monsoon/MSP/export policy) and publishes
 * MCX/NCDEX commodity impact flash articles.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { fetchPexelsImage } from './lib/pexels.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.join(__dirname, '..')
const FLASH_DIR  = path.join(ROOT, 'content/flash')
const SEEN_FILE  = path.join(__dirname, 'seen-agri.json')
const SEEN_TTL   = 48 * 3600 * 1000  // 48h dedup

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
  { url: 'https://news.google.com/rss/search?q=jeera+cumin+price+export+India&hl=en&gl=IN&ceid=IN:en', source: 'Agri' },
  { url: 'https://news.google.com/rss/search?q=turmeric+haldi+price+India+mandi&hl=en&gl=IN&ceid=IN:en', source: 'Agri' },
  { url: 'https://news.google.com/rss/search?q=chana+gram+chickpea+price+India+NCDEX&hl=en&gl=IN&ceid=IN:en', source: 'Agri' },
  { url: 'https://news.google.com/rss/search?q=guar+seed+gum+price+India&hl=en&gl=IN&ceid=IN:en', source: 'Agri' },
  { url: 'https://news.google.com/rss/search?q=mustard+seed+sarson+price+India&hl=en&gl=IN&ceid=IN:en', source: 'Agri' },
  { url: 'https://news.google.com/rss/search?q=soybean+soya+oil+price+India+NCDEX&hl=en&gl=IN&ceid=IN:en', source: 'Agri' },
  { url: 'https://news.google.com/rss/search?q=cotton+kapas+price+India+MSP&hl=en&gl=IN&ceid=IN:en', source: 'Agri' },
  { url: 'https://news.google.com/rss/search?q=castor+seed+oil+price+India&hl=en&gl=IN&ceid=IN:en', source: 'Agri' },
  { url: 'https://news.google.com/rss/search?q=coriander+dhania+spice+price+India&hl=en&gl=IN&ceid=IN:en', source: 'Agri' },
  { url: 'https://news.google.com/rss/search?q=India+spices+export+cardamom+pepper+price&hl=en&gl=IN&ceid=IN:en', source: 'Agri' },
  { url: 'https://news.google.com/rss/search?q=India+monsoon+kharif+rabi+MSP+crop+production+FCI&hl=en&gl=IN&ceid=IN:en', source: 'Agri' },
]

// Specific crop names — primary signal
const CROP_SIGNALS = [
  'jeera', 'cumin', 'turmeric', 'haldi', 'chana', 'gram', 'chickpea',
  'guar', 'cluster bean', 'mustard', 'sarson', 'rapeseed', 'soybean',
  'soya', 'cotton', 'kapas', 'castor', 'coriander', 'dhania',
  'cardamom', 'pepper', 'spice',
]

// Generic agri market terms — secondary signal (must appear alongside a crop name or policy term)
const AGRI_MARKET_SIGNALS = [
  'msp', 'mandi', 'ncdex', 'export ban', 'import duty', 'kharif',
  'rabi', 'monsoon', 'crop production', 'fci', 'cacp', 'procurement',
  'buffer stock', 'agri market', 'commodity exchange', 'price support',
]

function cleanTitle(raw) {
  return raw.replace(/\s+-\s+[^-]{2,50}$/, '').trim()
}

function isAgriItem(title) {
  const t = title.toLowerCase()
  const hasCrop   = CROP_SIGNALS.some(s => t.includes(s))
  const hasMarket = AGRI_MARKET_SIGNALS.some(s => t.includes(s))
  // Must have at least a crop signal; market signal adds context but isn't mandatory
  return hasCrop || (hasMarket && (t.includes('agri') || t.includes('commodity') || t.includes('india')))
}

function mapToCommodities(title) {
  const t = title.toLowerCase()
  const contracts = []
  if (/jeera|cumin/.test(t))              contracts.push('Jeera NCDEX')
  if (/turmeric|haldi/.test(t))           contracts.push('Turmeric NCDEX')
  if (/chana|gram|chickpea/.test(t))      contracts.push('Chana NCDEX')
  if (/guar/.test(t))                     contracts.push('Guar Seed NCDEX')
  if (/mustard|sarson|rapeseed/.test(t))  contracts.push('Mustard Seed NCDEX')
  if (/soybean|soya/.test(t))             contracts.push('Soybean NCDEX', 'Soya Oil NCDEX')
  if (/cotton|kapas/.test(t))             contracts.push('Kapas MCX')
  if (/castor/.test(t))                   contracts.push('Castor Seed NCDEX')
  if (/coriander|dhania/.test(t))         contracts.push('Coriander NCDEX')
  if (/cardamom/.test(t))                 contracts.push('Cardamom MCX')
  if (/pepper/.test(t))                   contracts.push('Black Pepper MCX')
  if (/monsoon|kharif|rabi|msp|crop/.test(t)) {
    contracts.push('Chana NCDEX', 'Soybean NCDEX', 'Mustard Seed NCDEX')
  }
  return [...new Set(contracts)].join(', ') || 'Chana NCDEX, Soybean NCDEX'
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

      // Only items from the last 3 hours
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

async function generateBreakdown(item, contracts) {
  const prompt = `You are BhaavBrief's commodity market analyst for Indian agri markets.

NEWS: "${item.title}"
NCDEX/MCX CONTRACTS AFFECTED: ${contracts}

Write a flash article for Indian agri commodity traders. Use this exact format:

TITLE: [BhaavBrief-framed headline focused on NCDEX/MCX impact, under 70 chars, no source names]

**WHAT HAPPENED**
One sentence. State the specific fact — what changed, where, with what figure. Facts only from the news item.

**WHAT IT MEANS**
2-3 sentences. Name the mechanism AND the specific actors in the same breath. Examples: "Unjha mandi traders holding jeera inventory see spot prices reprice against the futures basis", "mustard oil refiners in Rajasthan sourcing from Alwar mandi face a higher procurement cost", "NCDEX chana April contract holders see open interest shift as dal mills adjust forward hedges". Explain mandi terms in context where needed (e.g., "Unjha — India's largest jeera spot market"). No generic phrases.

**WHO IS AFFECTED**
Name specific industries, businesses, and consumer groups — never abstractions. Examples: "jeera farmers in Rajkot and Unjha districts, exporters shipping to Middle East buyers, and spice traders at Jodhpur mandi" or "dal millers in Madhya Pradesh and Rajasthan, kirana stores buying chana in bulk, and households in north India where dal is a staple".

**BOTTOM LINE**
3 sentences structured as: (1) Businesses: one named sector/mandi and one concrete consequence. (2) Investors: one named NCDEX contract and the directional signal. (3) Consumers: one named food product and the price direction. BANNED phrases: "farmers may benefit", "traders should watch", "businesses face higher costs", "investors should be aware", "market participants need to monitor".

**WHAT TO WATCH**
1-2 sentences. The next specific catalyst — NCDEX spot price update, government procurement data, IMD monsoon forecast revision, or CACP recommendation — that will confirm or shift this move.

RULES:
- SEBI-compliant: educational only, no buy/sell advice
- FORMATTING: Use **bold** inline for key data — price levels, % moves, commodity/company names on first mention, critical thresholds. Bold specific numbers and names only, never full sentences.
- Never fabricate specific price targets
- Never include news outlet names anywhere
- Write for a NCDEX/ET Agri reader — someone who trades from a mandi town
- Total body length 220-270 words
- End with: Source: Agri Market Intelligence | bhaavbrief.in`

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
category: "agri"
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
    console.log('ANTHROPIC_API_KEY not set — skipping NCDEX agri monitor')
    return
  }

  if (!fs.existsSync(FLASH_DIR)) fs.mkdirSync(FLASH_DIR, { recursive: true })

  const seen    = loadSeen()
  const seenIds = new Set(seen.map(e => e.id))

  const feedResults = await Promise.all(FEEDS.map(fetchFeed))
  const allItems = feedResults.flat()

  const newEvents = []
  for (const item of allItems) {
    const id = item.title.slice(0, 80)
    if (seenIds.has(id)) continue
    if (!isAgriItem(item.title)) continue
    newEvents.push({ ...item, id })
    seenIds.add(id)
  }

  console.log(`NCDEX agri monitor: ${allItems.length} items fetched, ${newEvents.length} new events`)

  let published = 0
  for (const event of newEvents.slice(0, 1)) {  // max 1 per run
    const contracts = mapToCommodities(event.title)
    console.log(`  → ${event.title.slice(0, 80)} [${contracts}]`)
    try {
      const result = await generateBreakdown(event, contracts)
      if (!result) continue
      const { title: aiTitle, body } = result
      const coverImage = await fetchPexelsImage(aiTitle, 'agri')
      const fname = saveFlashArticle(event, aiTitle, body, coverImage)
      if (fname) {
        console.log(`    ✅ Published: ${fname}`)
        published++
      }
    } catch (e) {
      console.warn(`    ⚠️  Failed: ${e.message}`)
    }
  }

  const now = new Date().toISOString()
  const updatedSeen = [
    ...seen,
    ...newEvents.map(e => ({ id: e.id, seenAt: now })),
  ]
  saveSeen(updatedSeen)

  console.log(`NCDEX agri monitor done — ${published} articles published`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
