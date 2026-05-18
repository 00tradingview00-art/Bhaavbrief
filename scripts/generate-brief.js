#!/usr/bin/env node
/**
 * BhaavBrief — Automated Brief Generator
 * Runs via GitHub Actions at 6:30 AM IST (1:00 AM UTC) daily
 * 1. Fetches commodity prices from Yahoo Finance (15-min delay, free)
 * 2. Fetches commodity news from Yahoo Finance RSS (free)
 * 3. Calls Claude API to generate the brief
 * 4. Saves as MDX file → GitHub Action creates PR for review
 */

const fs   = require('fs')
const path = require('path')

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const BRIEFS_DIR        = path.join(__dirname, '../content/briefs')

// ─── 1. Fetch Prices ─────────────────────────────────────────────────────────

async function fetchPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta) return null
    return {
      price:  meta.regularMarketPrice ?? 0,
      prev:   meta.previousClose      ?? meta.regularMarketPrice ?? 0,
      symbol,
    }
  } catch (e) {
    console.warn(`Price fetch failed for ${symbol}:`, e.message)
    return null
  }
}

async function getPrices() {
  const [crude, gold, silver, copper, natgas, fx] = await Promise.all([
    fetchPrice('CL=F'),
    fetchPrice('GC=F'),
    fetchPrice('SI=F'),
    fetchPrice('HG=F'),
    fetchPrice('NG=F'),
    fetchPrice('INR=X'),
  ])

  const inr = fx?.price ?? 83.5
  const pct = (d, p) => p ? `${d >= 0 ? '▲' : '▼'} ${Math.abs((d / p) * 100).toFixed(1)}%` : '—'
  const chg = (d) => `${d >= 0 ? '+' : ''}${Math.round(d)}`

  return {
    crude:  crude  ? { inr: Math.round(crude.price * inr),              chg: chg((crude.price - crude.prev) * inr),               pct: pct(crude.price - crude.prev, crude.prev) } : null,
    gold:   gold   ? { inr: Math.round((gold.price / 31.1035) * 10 * inr), chg: chg(((gold.price - gold.prev) / 31.1035) * 10 * inr), pct: pct(gold.price - gold.prev, gold.prev) }  : null,
    silver: silver ? { inr: Math.round((silver.price / 31.1035) * 1000 * inr), chg: chg(((silver.price - silver.prev) / 31.1035) * 1000 * inr), pct: pct(silver.price - silver.prev, silver.prev) } : null,
    copper: copper ? { inr: ((copper.price / 0.453592) * inr).toFixed(1),      chg: chg(((copper.price - copper.prev) / 0.453592) * inr),         pct: pct(copper.price - copper.prev, copper.prev) } : null,
    natgas: natgas ? { inr: Math.round(natgas.price * inr),             chg: chg((natgas.price - natgas.prev) * inr),              pct: pct(natgas.price - natgas.prev, natgas.prev) } : null,
    usdinr: fx     ? { rate: fx.price.toFixed(2) } : { rate: '83.50' },
  }
}

// ─── 2. Fetch News ────────────────────────────────────────────────────────────

async function fetchNews() {
  const feeds = [
    'https://feeds.finance.yahoo.com/rss/2.0/headline?s=CL=F&region=IN&lang=en-IN',
    'https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC=F&region=IN&lang=en-IN',
    'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5ENSEI&region=IN&lang=en-IN',
  ]

  const headlines = []
  for (const url of feeds) {
    try {
      const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      const text = await res.text()
      const items = [...text.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)]
        .slice(1, 4)
        .map(m => m[1].trim())
      headlines.push(...items)
    } catch (e) {
      console.warn('RSS fetch error:', e.message)
    }
  }

  return headlines.slice(0, 10)
}

// ─── 3. Get next edition number ───────────────────────────────────────────────

function getNextEdition() {
  if (!fs.existsSync(BRIEFS_DIR)) return 1
  const files = fs.readdirSync(BRIEFS_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
  return files.length + 1
}

// ─── 4. Generate brief via Claude ────────────────────────────────────────────

async function generateBrief(prices, news, edition, dateStr) {
  const priceContext = `
MCX Crude: ₹${prices.crude?.inr ?? '—'} (${prices.crude?.pct ?? '—'}, ${prices.crude?.chg ?? '—'})
MCX Gold: ₹${prices.gold?.inr ?? '—'} (${prices.gold?.pct ?? '—'}, ${prices.gold?.chg ?? '—'})
MCX Silver: ₹${prices.silver?.inr ?? '—'} (${prices.silver?.pct ?? '—'}, ${prices.silver?.chg ?? '—'})
MCX Copper: ₹${prices.copper?.inr ?? '—'} (${prices.copper?.pct ?? '—'}, ${prices.copper?.chg ?? '—'})
MCX Nat Gas: ₹${prices.natgas?.inr ?? '—'} (${prices.natgas?.pct ?? '—'})
USDINR: ₹${prices.usdinr?.rate ?? '83.50'}
  `.trim()

  const newsContext = news.length
    ? news.map((h, i) => `${i + 1}. ${h}`).join('\n')
    : 'No major commodity headlines today.'

  const prompt = `You are the editor of BhaavBrief, India's premier daily commodity intelligence publication for MCX traders and merchants. Write Edition ${edition} of the morning brief for ${dateStr}.

LIVE PRICES (15-min delay, Yahoo Finance converted to approximate MCX INR):
${priceContext}

LATEST HEADLINES:
${newsContext}

Write a sharp, institutional-quality commodity brief in MDX format. Structure:

1. Open with the most important macro signal today (geopolitical, weather, demand shift)
2. Cover crude oil with a clear directional bias and key levels
3. Cover gold/metals briefly
4. Cover agri/mandi if relevant news exists
5. Close with "What to watch" — 3 bullet points for the week ahead

RULES:
- Write in English. Confident, direct, no hedging language.
- Give actual levels and ranges, not vague statements.
- 400-600 words total. Tight and punchy.
- Use ## for section headers (Crude, Metals, Agri, What to Watch)
- Use **bold** for prices and key levels
- Begin each section with a one-word signal in brackets: [WATCH], [BULLISH], [BEARISH], [NEUTRAL]
- Do NOT add a title or frontmatter — that is added separately
- Do NOT add disclaimers in the body — those are in the footer
- End with a data row: "**Data:** MCX Crude ₹X · MCX Gold ₹X · USDINR ₹X"`

Write the brief now:`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Claude API error: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ─── 5. Generate title ────────────────────────────────────────────────────────

async function generateTitle(briefContent, dateStr) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 60,
      messages: [{
        role: 'user',
        content: `Write a sharp, specific newspaper-style headline for this commodity brief. Max 10 words. No quotes. Just the headline.\n\n${briefContent.slice(0, 400)}`,
      }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text?.trim() ?? `BhaavBrief Morning Edition — ${dateStr}`
}

// ─── 6. Save MDX file ─────────────────────────────────────────────────────────

function saveBrief({ slug, title, date, edition, summary, tags, commodities, content }) {
  if (!fs.existsSync(BRIEFS_DIR)) fs.mkdirSync(BRIEFS_DIR, { recursive: true })

  const frontmatter = `---
title: "${title.replace(/"/g, "'")}"
date: "${date}"
edition: ${edition}
summary: "${summary.replace(/"/g, "'")}"
tags: [${tags.map(t => `"${t}"`).join(', ')}]
commodities: [${commodities.map(c => `"${c}"`).join(', ')}]
published: true
---

`
  fs.writeFileSync(path.join(BRIEFS_DIR, `${slug}.mdx`), frontmatter + content, 'utf8')
  console.log(`✅ Saved: ${slug}.mdx`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const now     = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const edition = getNextEdition()
  const slug    = `edition-${String(edition).padStart(3, '0')}`

  console.log(`🚀 Generating BhaavBrief Edition ${edition} for ${dateStr}...`)

  console.log('📊 Fetching prices...')
  const prices = await getPrices()
  console.log('Prices:', JSON.stringify(prices, null, 2))

  console.log('📰 Fetching news...')
  const news = await fetchNews()
  console.log(`Got ${news.length} headlines`)

  console.log('🤖 Generating brief with Claude...')
  const content = await generateBrief(prices, news, edition, dateStr)

  console.log('📝 Generating title...')
  const title   = await generateTitle(content, dateStr)
  const summary = content.split('\n').find(l => l.trim() && !l.startsWith('#'))?.slice(0, 160) ?? ''

  // Detect which commodities are covered
  const commodities = []
  if (/crude|oil|energy/i.test(content)) commodities.push('MCX Crude')
  if (/gold/i.test(content))             commodities.push('MCX Gold')
  if (/silver/i.test(content))           commodities.push('MCX Silver')
  if (/agri|soya|chana|monsoon/i.test(content)) commodities.push('NCDEX Agri')

  // Detect primary tag
  const tags = []
  if (/crude|oil|energy|hormuz|opec/i.test(content.slice(0, 400)))  tags.push('energy')
  else if (/gold|silver|metals/i.test(content.slice(0, 400)))       tags.push('metals')
  else if (/agri|soya|monsoon|kharif/i.test(content.slice(0, 400))) tags.push('agri')
  else                                                                tags.push('macro')

  saveBrief({ slug, title, date: dateStr, edition, summary, tags, commodities, content })

  // Output for GitHub Actions
  console.log(`\n📋 Summary:`)
  console.log(`  Title:   ${title}`)
  console.log(`  Slug:    ${slug}`)
  console.log(`  Edition: ${edition}`)
  console.log(`  File:    content/briefs/${slug}.mdx`)

  // Set GitHub Actions output
  if (process.env.GITHUB_OUTPUT) {
    const output = `slug=${slug}\ntitle=${title}\nedition=${edition}\n`
    fs.appendFileSync(process.env.GITHUB_OUTPUT, output)
  }
}

main().catch(err => {
  console.error('❌ Generation failed:', err.message)
  process.exit(1)
})
