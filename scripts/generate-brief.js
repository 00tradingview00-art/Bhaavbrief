#!/usr/bin/env node
/**
 * BhaavBrief — Automated Brief Generator v2
 * Runs via GitHub Actions at 6:30 AM IST (1:00 AM UTC) daily
 */

const fs   = require('fs')
const path = require('path')

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const BRIEFS_DIR        = path.join(__dirname, '../content/briefs')
const { fetchMCXPrices } = require('./fetch-prices')

// IST date — cron runs at 1AM UTC = 6:30AM IST, always use IST
function getISTDate() {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  const iso = ist.toISOString().split('T')[0]
  const display = ist.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  return { iso, display, slug: iso }
}

// Edition number — internal only, not shown to readers
function getEditionNumber() {
  if (!fs.existsSync(BRIEFS_DIR)) return 1
  return fs.readdirSync(BRIEFS_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md')).length + 1
}

// News from reliable sources — ET Markets, Google News, Reuters
async function fetchNews() {
  const feeds = [
    'https://economictimes.indiatimes.com/markets/commodities/rssfeeds/1808478787.cms',
    'https://news.google.com/rss/search?q=MCX+crude+gold+commodity+India&hl=en-IN&gl=IN&ceid=IN:en',
    'https://feeds.reuters.com/reuters/businessNews',
  ]

  const headlines = []
  for (const url of feeds) {
    try {
      const res  = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BhaavBrief/2.0)' },
      })
      const text = await res.text()
      const cdata  = [...text.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)].map(m => m[1].trim())
      const plain  = [...text.matchAll(/<title>(?!\s*<!\[)([^<]{15,})<\/title>/g)].map(m => m[1].trim())
      const items  = [...cdata, ...plain]
        .filter(h => h.length > 20 && !/rss|feed|subscribe/i.test(h))
        .slice(1, 5)
      headlines.push(...items)
      console.log(`  ${url.split('/')[2]}: ${items.length} headlines`)
    } catch(e) {
      console.warn(`  RSS failed: ${e.message}`)
    }
  }

  return [...new Set(headlines)].slice(0, 10)
}

// Curated Unsplash images per commodity theme
function getImage(tags) {
  const images = {
    energy: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80',
    metals: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1200&q=80',
    agri:   'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1200&q=80',
    macro:  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80',
  }
  return images[tags[0]] ?? images.macro
}

// Generate brief via Claude
async function generateBrief(prices, news, date) {
  const priceCtx = `
MCX Crude Oil : ₹${prices.crude?.inr  ?? '—'}/bbl  | WTI COMEX: $${prices.crude?.comex  ?? '—'} | ${prices.crude?.pct  ?? '—'} (${prices.crude?.chg  ?? '—'})
MCX Gold      : ₹${prices.gold?.inr   ?? '—'}/10g  | COMEX:     $${prices.gold?.comex   ?? '—'}/oz | ${prices.gold?.pct   ?? '—'} (${prices.gold?.chg   ?? '—'})
MCX Silver    : ₹${prices.silver?.inr ?? '—'}/kg   | COMEX:     $${prices.silver?.comex ?? '—'}/oz | ${prices.silver?.pct ?? '—'} (${prices.silver?.chg ?? '—'})
MCX Copper    : ₹${prices.copper?.inr ?? '—'}/kg   | COMEX:     $${prices.copper?.comex ?? '—'}/lb | ${prices.copper?.pct ?? '—'} (${prices.copper?.chg ?? '—'})
MCX Nat Gas   : ₹${prices.natgas?.inr ?? '—'}/mmBtu | Henry Hub: $${prices.natgas?.comex ?? '—'} | ${prices.natgas?.pct ?? '—'} (${prices.natgas?.chg ?? '—'})
Brent Crude   : $${prices.brent?.usd  ?? '—'}/bbl
USD/INR       : ₹${prices.usdinr?.rate ?? '96.38'}
`.trim()

  const newsCtx = news.length > 0
    ? news.map((h, i) => `${i + 1}. ${h}`).join('\n')
    : 'No live headlines — analyse from price action and global macro context.'

  const prompt = `You are the editor of BhaavBrief, India's sharpest daily commodity intelligence brief. Your readers are MCX traders, institutional analysts, and commodity desk professionals. They trade real money based on what you write. They have zero tolerance for vague analysis.

TODAY: ${date.display}

PREVIOUS SESSION CLOSE — MCX PRICES:
${priceCtx}

MARKET HEADLINES:
${newsCtx}

Write today's BhaavBrief morning edition.

USE EXACTLY THESE ## HEADERS IN ORDER:
## The Big Picture
## Crude Oil
## Gold & Silver
## Base Metals & Energy
## What to Watch This Week

RULES — NON NEGOTIABLE:
- "The Big Picture": One sharp paragraph. The single macro theme connecting all commodities today — currency move, geopolitical event, demand/supply structural shift. Make a clear call on market direction.
- Each commodity section: Lead with [BULLISH] / [BEARISH] / [NEUTRAL] / [WATCH] in brackets. State the MCX price. Give specific support and resistance levels. Give a directional call with the reason. Example: "**₹9,800** is the floor. A close below brings **₹9,620** into play rapidly."
- "What to Watch": Exactly 3 bullet points. Forward-looking only. Specific events, data releases, or price triggers for the next 3-5 days.
- Tone: Bloomberg Terminal meets Dalal Street. Confident. Sharp. Opinionated. Write like you have skin in the game.
- Length: 500-650 words. Every sentence earns its place.
- Bold ALL price levels and key numbers: **₹9,940**, **$4,556**, **96.38**
- Reference both MCX and COMEX prices where relevant — your readers track both
- No hedging language: no "may", "might", "could possibly", "it remains to be seen"
- No disclaimers in the body
- No title or frontmatter — added separately
- End with exactly this line on its own: *Prices reflect previous MCX session close. COMEX prices for reference.*

Write the brief now:`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API: ${JSON.stringify(await res.json())}`)
  return (await res.json()).content?.[0]?.text ?? ''
}

// SEO title
async function generateTitle(content, date) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `Write an SEO headline for this commodity market brief.
Requirements:
- Max 60 characters
- Must include a specific price move, % change, or macro event from the brief
- Must include "MCX" and at least one commodity name
- Factual, specific — like a Financial Times headline
- No questions, no colons, no clickbait
- Return ONLY the headline, nothing else

Brief: ${content.slice(0, 600)}`,
      }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '') ?? `MCX Commodity Morning Brief — ${date.display}`
}

// SEO meta description
async function generateMeta(content) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `Write a Google meta description for this commodity trading brief.
- 150-160 characters exactly
- Include specific price levels or % moves from the brief
- Written for MCX traders — make them want to click
- No clickbait, factual and specific
- Return ONLY the description, nothing else

Brief: ${content.slice(0, 700)}`,
      }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '') ?? ''
}

// Save MDX with full SEO frontmatter
function saveBrief({ slug, title, metaDesc, date, edition, image, tags, commodities, content }) {
  if (!fs.existsSync(BRIEFS_DIR)) fs.mkdirSync(BRIEFS_DIR, { recursive: true })

  const keywords = [
    'MCX commodity prices today', 'MCX gold price', 'MCX crude oil', 'MCX silver price',
    'commodity trading India', 'MCX morning brief', ...commodities,
  ].join(', ')

  const safeTitle = title.replace(/"/g, "'").replace(/[\r\n]+/g, ' ').trim()
  const safeMeta  = metaDesc.replace(/"/g, "'").replace(/[\r\n]+/g, ' ').trim().slice(0, 160)

  const frontmatter = `---
title: "${safeTitle}"
date: "${date.iso}"
edition: ${edition}
metaDescription: "${safeMeta}"
keywords: "${keywords}"
image: "${image}"
tags: [${tags.map(t => `"${t}"`).join(', ')}]
commodities: [${commodities.map(c => `"${c}"`).join(', ')}]
published: true
---

`
  const priceBar = `**MCX Prices** — Gold ₹${prices.gold?.inr?.toLocaleString('en-IN') ?? '—'} ($${prices.gold?.comex ?? '—'}/oz) · Silver ₹${prices.silver?.inr?.toLocaleString('en-IN') ?? '—'} ($${prices.silver?.comex ?? '—'}/oz) · Crude ₹${prices.crude?.inr?.toLocaleString('en-IN') ?? '—'} ($${prices.crude?.comex ?? '—'}) · Nat Gas ₹${prices.natgas?.inr?.toLocaleString('en-IN') ?? '—'} ($${prices.natgas?.comex ?? '—'}) · USD/INR ₹${prices.usdinr?.rate ?? '—'}

`
fs.writeFileSync(path.join(BRIEFS_DIR, `${slug}.mdx`), frontmatter + priceBar + content, 'utf8')
  console.log(`Saved: content/briefs/${slug}.mdx`)
}

// Main
async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const date    = getISTDate()
  const edition = getEditionNumber()
  const slug    = date.iso // e.g. 2026-05-19 — SEO-friendly, date-based URL

  console.log(`BhaavBrief for ${date.display} (Edition ${edition})`)

  console.log('Fetching prices...')
  const prices = await fetchMCXPrices()
  console.log('Prices:', JSON.stringify(prices))

  console.log('Fetching news...')
  const news = await fetchNews()
  console.log(`Headlines (${news.length}):`, news)

  console.log('Generating brief...')
  const content = await generateBrief(prices, news, date)

  console.log('Generating SEO title and meta...')
  const [title, metaDesc] = await Promise.all([
    generateTitle(content, date),
    generateMeta(content),
  ])

  // Detect tags and commodities
  const tags = []
  if (/crude|oil|energy|opec/i.test(content.slice(0, 400)))        tags.push('energy')
  else if (/gold|silver|metals/i.test(content.slice(0, 400)))       tags.push('metals')
  else if (/agri|soya|monsoon|kharif/i.test(content.slice(0, 400))) tags.push('agri')
  else                                                                tags.push('macro')

  const commodities = []
  if (/crude|oil/i.test(content))         commodities.push('MCX Crude')
  if (/gold/i.test(content))              commodities.push('MCX Gold')
  if (/silver/i.test(content))            commodities.push('MCX Silver')
  if (/copper/i.test(content))            commodities.push('MCX Copper')
  if (/natural.gas|natgas/i.test(content)) commodities.push('MCX Natural Gas')
  if (/agri|soya|chana/i.test(content))   commodities.push('NCDEX Agri')

  const image = getImage(tags)

  saveBrief({ slug, title, metaDesc, date, edition, image, tags, commodities, content })

  console.log(`Title: ${title}`)
  console.log(`Meta: ${metaDesc}`)

  if (process.env.GITHUB_OUTPUT) {
    const safe = title.replace(/[\r\n]+/g, ' ').trim()
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\ntitle=${safe}\nedition=${edition}\n`)
  }
}

main().catch(err => {
  console.error('Failed:', err.message)
  process.exit(1)
})
