#!/usr/bin/env node
/**
 * BhaavBrief — MCX/SEBI Circular Monitor
 * Runs every 15 min via flash-brief.yml
 * Detects new regulatory announcements and publishes a plain-English breakdown
 * as a flash article immediately — independent of price moves.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.join(__dirname, '..')
const FLASH_DIR  = path.join(ROOT, 'content/flash')
const SEEN_FILE  = path.join(__dirname, 'seen-circulars.json')
const SEEN_TTL   = 72 * 3600 * 1000  // 72h — circulars don't recur daily

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
    url:    'https://news.google.com/rss/search?q=MCX+India+circular+margin+position+limit+commodity&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'MCX',
  },
  {
    url:    'https://news.google.com/rss/search?q=MCX+India+circular+notice+trading+hours+contract&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'MCX',
  },
  {
    url:    'https://news.google.com/rss/search?q=SEBI+commodity+derivatives+circular+MCX+India&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'SEBI',
  },
  {
    url:    'https://news.google.com/rss/search?q=MCX+India+contract+specification+expiry+settlement&hl=en-IN&gl=IN&ceid=IN:en',
    source: 'MCX',
  },
]

// Phrases that mean it's a real regulatory announcement, not a news article about prices
const REGULATORY_SIGNALS = [
  'circular', 'notice', 'margin', 'position limit', 'contract specification',
  'trading hours', 'settlement', 'expiry', 'due date', 'notification',
  'directive', 'regulation', 'compliance', 'amendment', 'revision',
  'sebi circular', 'mcx circular', 'exchange notice',
]

function isRegulatoryItem(title) {
  const t = title.toLowerCase()
  return REGULATORY_SIGNALS.some(s => t.includes(s))
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

async function generateBreakdown(circular) {
  const prompt = `You are BhaavBrief's regulatory analyst. A new MCX/SEBI announcement has been detected.

ANNOUNCEMENT: "${circular.title}"
SOURCE: ${circular.source}
DETECTED AT: ${circular.pubDate.toISOString()}

Write a concise flash article explaining this announcement in plain English for Indian commodity traders. Structure:

**WHAT IT SAYS**
[1-2 sentences explaining what the circular/notice does in simple terms. No jargon.]

**WHICH COMMODITIES ARE AFFECTED**
[List affected MCX commodities (Gold, Silver, Crude, Copper, NatGas, or all). If unknown from title, say "Likely affects [inferred commodity] — full circular pending confirmation."]

**WHAT CHANGES FOR TRADERS**
[2-3 sentences on the practical impact: Does margin requirement change? Does contract expiry shift? Are position limits revised? Is there a new compliance deadline?]

**EFFECTIVE DATE**
[If determinable from the title, state it. Otherwise: "Effective date not yet confirmed — check mcxindia.com for full circular."]

RULES:
- Never fabricate specific numbers (margin %, exact dates) if not in the title — use "per the circular" instead
- Write for an Mint/ET reader, not a compliance officer
- SEBI compliance: educational only, no trading advice
- Keep total length under 200 words
- End with: Source: ${circular.source} | bhaavbrief.in

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

function saveFlashArticle(circular, body) {
  const now    = new Date()
  const datePrefix = now.toISOString().slice(0, 10)
  const timePrefix = now.toISOString().slice(11, 16).replace(':', '-')
  const slug   = slugify(circular.title)
  const fname  = `${datePrefix}-${timePrefix}-${slug}.mdx`
  const fpath  = path.join(FLASH_DIR, fname)

  if (fs.existsSync(fpath)) return null

  const mdx = `---
title: "${circular.title.replace(/"/g, '\\"')}"
date: "${now.toISOString()}"
source: "${circular.source}"
category: "regulatory"
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
    console.log('ANTHROPIC_API_KEY not set — skipping circular monitor')
    return
  }

  if (!fs.existsSync(FLASH_DIR)) fs.mkdirSync(FLASH_DIR, { recursive: true })

  const seen     = loadSeen()
  const seenIds  = new Set(seen.map(e => e.id))

  // Fetch all feeds in parallel
  const feedResults = await Promise.all(FEEDS.map(fetchFeed))
  const allItems = feedResults.flat()

  const newCirculars = []
  for (const item of allItems) {
    const id = item.title.slice(0, 100)
    if (seenIds.has(id)) continue
    if (!isRegulatoryItem(item.title)) continue
    newCirculars.push({ ...item, id })
    seenIds.add(id)
  }

  console.log(`Circular monitor: ${allItems.length} items fetched, ${newCirculars.length} new regulatory items`)

  let published = 0
  for (const circular of newCirculars) {
    console.log(`  → ${circular.source}: ${circular.title.slice(0, 80)}`)
    try {
      const body  = await generateBreakdown(circular)
      if (!body) continue
      const fname = saveFlashArticle(circular, body)
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
    ...newCirculars.map(c => ({ id: c.id, seenAt: now })),
  ]
  saveSeen(updatedSeen)

  console.log(`Circular monitor done — ${published} articles published`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
