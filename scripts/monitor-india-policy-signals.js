#!/usr/bin/env node
/**
 * BhaavBrief — India Policy Signal Monitor
 * Runs every 15 min via flash-brief.yml
 * Detects Indian government/regulatory policy changes (import duties, export bans,
 * MSP revisions, RBI decisions, GST changes) and publishes MCX commodity impact
 * flash articles — catches domestic policy moves missed by geopolitical monitor.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { fetchPexelsImage } from './lib/pexels.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.join(__dirname, '..')
const FLASH_DIR  = path.join(ROOT, 'content/flash')
const SEEN_FILE  = path.join(__dirname, 'seen-india-policy.json')
const SEEN_TTL   = 72 * 3600 * 1000  // 72h

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
  {
    url:    'https://news.google.com/rss/search?q=india+import+duty+gold+silver+commodity+hike+cut&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'India Policy',
  },
  {
    url:    'https://news.google.com/rss/search?q=india+export+ban+restriction+wheat+rice+sugar+onion+commodity&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'India Policy',
  },
  {
    url:    'https://news.google.com/rss/search?q=RBI+rate+decision+repo+rate+monetary+policy+commodity+gold+rupee&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'India Policy',
  },
  {
    url:    'https://news.google.com/rss/search?q=india+MSP+minimum+support+price+crop+commodity+government&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'India Policy',
  },
  {
    url:    'https://news.google.com/rss/search?q=india+petroleum+LPG+fuel+price+revision+government&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'India Policy',
  },
  {
    url:    'https://news.google.com/rss/search?q=GST+council+commodity+tax+rate+change+india&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'India Policy',
  },
  {
    url:    'https://news.google.com/rss/search?q=CBIC+customs+duty+notification+commodity+india&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'India Policy',
  },
]

const POLICY_SIGNALS = [
  'import duty', 'export ban', 'export restriction', 'customs duty',
  'minimum support price', 'msp', 'repo rate', 'monetary policy',
  'rbi policy', 'rbi decision', 'rate hike', 'rate cut', 'lgp price',
  'fuel price', 'petroleum price', 'gst', 'tax rate', 'excise duty',
  'budget', 'finance ministry', 'cbic', 'notification', 'hike', 'revision',
  'subsidy', 'levy', 'cess', 'tariff', 'quota', 'stockpile', 'buffer stock',
]

// Google News appends " - Source Name" to every headline — strip it
function cleanTitle(raw) {
  return raw.replace(/\s+-\s+[^-]{2,50}$/, '').trim()
}

function isPolicyItem(title) {
  const t = title.toLowerCase()
  return POLICY_SIGNALS.some(s => t.includes(s))
}

function mapToCommodities(title) {
  const t = title.toLowerCase()
  const commodities = []
  if (/gold|silver|bullion|precious metal/.test(t))              commodities.push('Gold', 'Silver')
  if (/crude|petroleum|oil|fuel|petrol|diesel|lpg/.test(t))      commodities.push('Crude Oil', 'Natural Gas')
  if (/copper|zinc|alumin|lead|nickel|base metal/.test(t))       commodities.push('Copper', 'Zinc', 'Aluminium')
  if (/wheat|rice|sugar|onion|pulse|agri|crop|msp/.test(t))      commodities.push('Agri Commodities')
  if (/natural gas|lng/.test(t))                                  commodities.push('Natural Gas')
  if (/rbi|repo|rupee|interest rate|monetary/.test(t))           commodities.push('Gold', 'Silver', 'Crude Oil')
  if (/gst|import duty|customs|tariff/.test(t) && commodities.length === 0) commodities.push('Gold', 'Silver')
  return [...new Set(commodities)].join(', ') || 'Gold, Crude Oil'
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
  const prompt = `You are BhaavBrief's policy analyst. A new Indian government or regulatory policy change has been detected that affects commodity markets.

POLICY EVENT: "${item.title}"
MCX COMMODITIES AFFECTED: ${commodities}

Write a flash article for Indian MCX commodity traders. Use this exact format:

TITLE: [BhaavBrief-framed headline focused on MCX impact, under 70 chars, no source names]

**WHAT HAPPENED**
One sentence. State the specific policy action — what the government/RBI/regulator did, with the exact instrument (e.g. "DGFT circular", "RBI repo rate change", "import duty notification"). Facts only.

**WHAT IT MEANS**
2-3 sentences. Name the mechanism AND the specific actors: e.g. "edible oil refiners importing crude soybean oil face higher landed costs", "kirana wholesalers and dal millers buying chana on forward contracts see their hedge costs shift", "MCX gold futures traders holding overnight positions face a new import cost floor". No generic phrases.

**WHO IS AFFECTED**
Name specific industries, businesses, and consumer groups — never abstractions. Examples: "edible oil refiners in Gujarat and Maharashtra, dal mills in Madhya Pradesh, and households buying mustard oil in north India" or "jewellery exporters in Surat and Mumbai, and retail gold buyers ahead of Akshaya Tritiya".

**BOTTOM LINE**
3 sentences structured as: (1) Businesses: one named sector and one concrete cost/revenue consequence. (2) Investors: one named MCX contract and the directional signal. (3) Consumers: one named product and the price direction. BANNED phrases: "businesses face higher costs", "investors should watch", "consumers may see higher prices", "market participants should be aware", "industry stakeholders".

**WHAT TO WATCH**
1-2 sentences. The next specific trigger — gazette notification date, parliamentary session, scheduled RBI review, or price level — that will extend or reverse this impact.

RULES:
- SEBI-compliant: educational only, no buy/sell advice
- Never fabricate specific price targets or percentages not in the headline
- Never include news outlet names (ET, Mint, Reuters, etc.) anywhere
- Write for an ET Markets/Mint reader, not a policy wonk
- Total body length 220-270 words
- End with: Source: India Policy | bhaavbrief.in`

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
category: "policy"
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
    console.log('ANTHROPIC_API_KEY not set — skipping India policy monitor')
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
    if (!isPolicyItem(item.title)) continue
    newEvents.push({ ...item, id })
    seenIds.add(id)
  }

  console.log(`India policy monitor: ${allItems.length} items fetched, ${newEvents.length} new policy events`)

  let published = 0
  for (const event of newEvents) {
    const commodities = mapToCommodities(event.title)
    console.log(`  → ${event.title.slice(0, 80)} [${commodities}]`)
    try {
      const result = await generateBreakdown(event, commodities)
      if (!result) continue
      const { title: aiTitle, body } = result
      const coverImage = await fetchPexelsImage(aiTitle, 'policy')
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

  console.log(`India policy monitor done — ${published} articles published`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
