#!/usr/bin/env node
/**
 * BhaavBrief — Macro Economy Monitor
 * Runs every 15 min via flash-brief.yml
 * Detects Fed/FOMC decisions, US CPI/PPI, China PMI, India GDP/IIP, dollar index
 * moves, and Treasury yield shifts that directly reprice MCX commodities.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { fetchPexelsImage } from './lib/pexels.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.join(__dirname, '..')
const FLASH_DIR  = path.join(ROOT, 'content/flash')
const SEEN_FILE  = path.join(__dirname, 'seen-macro.json')
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
  // Fed / US macro
  { url: 'https://news.google.com/rss/search?q=Federal+Reserve+FOMC+rate+decision+dot+plot&hl=en&gl=US&ceid=US:en',       source: 'Macro' },
  { url: 'https://news.google.com/rss/search?q=US+CPI+inflation+data+Fed+commodity+impact&hl=en&gl=US&ceid=US:en',         source: 'Macro' },
  { url: 'https://news.google.com/rss/search?q=US+PPI+producer+price+index+commodity&hl=en&gl=US&ceid=US:en',              source: 'Macro' },
  { url: 'https://news.google.com/rss/search?q=US+treasury+yield+dollar+index+DXY+commodity&hl=en&gl=US&ceid=US:en',       source: 'Macro' },
  { url: 'https://news.google.com/rss/search?q=US+jobs+nonfarm+payroll+unemployment+dollar&hl=en&gl=US&ceid=US:en',        source: 'Macro' },
  // China macro
  { url: 'https://news.google.com/rss/search?q=China+PMI+manufacturing+economy+commodity+demand&hl=en&gl=US&ceid=US:en',   source: 'Macro' },
  { url: 'https://news.google.com/rss/search?q=China+stimulus+rate+cut+economy+copper+gold&hl=en&gl=US&ceid=US:en',        source: 'Macro' },
  { url: 'https://news.google.com/rss/search?q=China+property+sector+steel+copper+aluminium&hl=en&gl=US&ceid=US:en',       source: 'Macro' },
  // India macro
  { url: 'https://news.google.com/rss/search?q=India+GDP+IIP+inflation+commodity+mcx&hl=en-IN&gl=IN&ceid=IN:en',           source: 'Macro' },
  { url: 'https://news.google.com/rss/search?q=RBI+monetary+policy+repo+rate+rupee+commodity&hl=en-IN&gl=IN&ceid=IN:en',   source: 'Macro' },
  // Global macro
  { url: 'https://news.google.com/rss/search?q=IMF+World+Bank+global+growth+commodity+outlook&hl=en&gl=US&ceid=US:en',     source: 'Macro' },
]

// Primary: macro event keywords
const MACRO_SIGNALS = [
  'fomc', 'federal reserve', 'rate decision', 'rate cut', 'rate hike', 'dot plot',
  'cpi', 'ppi', 'inflation data', 'nonfarm payroll', 'jobs report', 'unemployment',
  'treasury yield', 'dollar index', 'dxy', '10-year yield', 'bond yield',
  'china pmi', 'caixin pmi', 'nbs pmi', 'china gdp', 'china stimulus',
  'pboc rate', 'china property', 'evergrande', 'repo rate', 'india gdp',
  'india iip', 'india cpi', 'india wpi', 'imf forecast', 'world bank',
]

// Must also have commodity linkage — prevents pure financial/equity news
const COMMODITY_LINK = [
  'gold', 'silver', 'crude', 'copper', 'commodity', 'mcx', 'metal',
  'oil', 'gas', 'rupee', 'dollar', 'energy', 'base metal', 'zinc',
  'aluminium', 'nickel', 'inflation', 'import', 'demand',
]

function cleanTitle(raw) {
  return raw.replace(/\s+-\s+[^-]{2,50}$/, '').trim()
}

function isMacroItem(title) {
  const t = title.toLowerCase()
  const hasMacro     = MACRO_SIGNALS.some(s => t.includes(s))
  const hasCommodity = COMMODITY_LINK.some(s => t.includes(s))
  return hasMacro && hasCommodity
}

function mapToCommodities(title) {
  const t = title.toLowerCase()
  const contracts = []
  // Fed / dollar / yields → all dollar-priced commodities
  if (/fed|fomc|rate.cut|rate.hike|treasury|dollar|dxy|nonfarm|cpi|ppi/.test(t)) {
    contracts.push('MCX Gold', 'MCX Silver', 'MCX Crude', 'MCX Copper')
  }
  // China PMI / stimulus → industrial metals + crude
  if (/china.pmi|caixin|nbs.pmi|china.stimulus|china.gdp|pboc/.test(t)) {
    contracts.push('MCX Copper', 'MCX Crude', 'MCX Aluminium', 'MCX Zinc')
  }
  // China property → copper, zinc, aluminium
  if (/china.property|evergrande|real.estate/.test(t)) {
    contracts.push('MCX Copper', 'MCX Zinc', 'MCX Aluminium')
  }
  // India macro → all MCX contracts
  if (/rbi|repo.rate|india.gdp|india.iip|india.cpi/.test(t)) {
    contracts.push('MCX Gold', 'MCX Silver', 'MCX Crude')
  }
  // Rupee specifically
  if (/rupee|usdinr|inr/.test(t)) {
    contracts.push('MCX Gold', 'MCX Crude', 'MCX Copper')
  }
  return [...new Set(contracts)].join(', ') || 'MCX Gold, MCX Crude, MCX Copper'
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

      // Only items from the last 10 hours (covers the overnight gap between the
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

async function generateBreakdown(item, contracts) {
  const prompt = `You are BhaavBrief's macro analyst. A major macro economic event has been detected that will reprice MCX commodities.

EVENT: "${item.title}"
MCX CONTRACTS AFFECTED: ${contracts}

Write a flash article for Indian MCX commodity traders. Use this exact format:

TITLE: [BhaavBrief-framed headline showing the MCX impact, under 70 chars, no source names]

**WHAT HAPPENED**
One sentence. State the specific macro data point or decision — the number, the direction, vs expectations. Facts only.

**WHAT IT MEANS**
2-3 sentences. Name the transmission mechanism AND the specific actors: e.g. "a stronger dollar raises rupee-denominated import costs for jewellers and bullion dealers at Zaveri Bazaar", "falling US real yields reduce the opportunity cost of holding gold for ETF funds and central banks including RBI", "China PMI above 50 signals higher copper demand from Chinese fabricators and construction firms". Name the exact MCX contracts affected and why.

**WHO IS AFFECTED**
Write 2 flowing prose sentences — not a list. First sentence: name the commercial and industrial actors with their specific exposure. Second sentence: name the end consumers and their direct impact. Example: "Jewellery exporters in Surat and corporate treasury desks hedging USD payables see their rupee cost of dollar-priced raw materials shift immediately as the dollar index reprices, while copper cable manufacturers in Pune see COMEX-linked procurement costs move in lockstep. Retail gold buyers timing purchases ahead of festival season and petrol pump operators passing through crude import costs to pump prices absorb the consumer-end impact."

**BOTTOM LINE**
3 complete prose sentences — no category labels, no colons prefixing sentences. First sentence: name one specific business sector and one concrete cost or revenue consequence. Second sentence: name one specific MCX contract and its directional signal with a price level or threshold. Third sentence: name one specific consumer product or end-user group and the price direction. BANNED phrases: "businesses face higher costs", "investors should watch", "market participants should be aware", "traders should be cautious".

**WHAT TO WATCH**
1-2 sentences. The next specific macro data release, Fed speech, or China data point that will extend or reverse this commodity impact.

CRITICAL GATE — check this FIRST:
If the article is primarily about equity markets (Sensex, Nifty, stock prices, share price moves, equity sector performance) with no direct repricing mechanism for MCX commodities (gold, silver, crude, copper, natural gas, zinc, aluminium) — respond with exactly: SKIP
Do not write the article. Do not explain. Just: SKIP

RULES:
- SEBI-compliant: educational only, no buy/sell advice
- FORMATTING: Use **bold** inline for key data — price levels, % moves, commodity/company names on first mention, critical thresholds. Bold specific numbers and names only, never full sentences.
- Never fabricate specific price targets
- Never include news outlet names anywhere
- Write for an ET Markets reader who trades MCX
- Total body length 220-270 words
- End with: Source: Macro Intelligence | bhaavbrief.in`

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
category: "macro"
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
    console.log('ANTHROPIC_API_KEY not set — skipping macro economy monitor')
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
    if (!isMacroItem(item.title)) continue
    newEvents.push({ ...item, id })
    seenIds.add(id)
  }

  console.log(`Macro monitor: ${allItems.length} items fetched, ${newEvents.length} new events`)

  let published = 0
  for (const event of newEvents.slice(0, 1)) {  // max 1 per run
    const contracts = mapToCommodities(event.title)
    console.log(`  → ${event.title.slice(0, 80)} [${contracts}]`)
    try {
      const result = await generateBreakdown(event, contracts)
      if (!result) continue
      const { title: aiTitle, body } = result
      if (/^SKIP\s*$/i.test(body.trim())) {
        console.log(`    Skipped (no direct MCX commodity angle): ${event.title.slice(0, 60)}`)
        continue
      }
      const coverImage = await fetchPexelsImage(aiTitle, 'macro')
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

  console.log(`Macro monitor done — ${published} articles published`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
