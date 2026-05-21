import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const EDITION = parseInt(process.env.EDITION ?? '1', 10)
const BRIEFS_DIR = path.join(process.cwd(), 'content/briefs')

async function fetchPrices() {
  try {
    const res = await fetch('https://www.bhaavbrief.in/api/prices', {
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const d = await res.json()
    if (!d || d.error) throw new Error(d?.error ?? 'empty response')

    const fmt = (n, dec=0) => n > 0 ? n.toFixed(dec) : null
    const pct  = (n) => n != null ? n.toFixed(2) : '0.00'

    return {
      usdinr:      d.usdinr?.toFixed(2) ?? '96.00',
      comexGold:   fmt(d.comexGold),
      mcxGold:     fmt(d.gold?.mcx),
      comexSilver: fmt(d.comexSilver, 2),
      mcxSilver:   fmt(d.silver?.mcx),
      wti:         fmt(d.wti, 2),
      brent:       fmt(d.brent, 2),
      mcxCrude:    fmt(d.crude?.mcx),
      comexCopper: fmt(d.comexCopper, 2),
      mcxCopper:   fmt(d.copper?.mcx, 2),
      henryHub:    fmt(d.henryHub, 2),
      mcxGas:      fmt(d.natgas?.mcx, 2),
      goldPct:     pct(d.goldComexPct),
      silverPct:   pct(d.silverComexPct),
      crudePct:    pct(d.crudePct),
      copperPct:   pct(d.copperComexPct),
      gasPct:      pct(d.gasPct),
    }
  } catch(e) {
    console.warn('Price fetch failed:', e.message)
    return null
  }
}

async function fetchNews() {
  const sources = [
    'https://economictimes.indiatimes.com/markets/commodities/rssfeeds/1368177.cms',
    'https://www.business-standard.com/rss/markets/commodities-3.rss',
    'https://news.google.com/rss/search?q=MCX+gold+silver+crude+India&hl=en-IN&gl=IN&ceid=IN:en',
  ]
  const headlines = []
  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 BhaavBrief/1.0' },
        signal: AbortSignal.timeout(8000),
      })
      const text = await res.text()
      const m1 = [...text.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)].map(m=>m[1].trim())
      const m2 = [...text.matchAll(/<title>(.+?)<\/title>/g)].map(m=>m[1].replace(/<!\[CDATA\[|\]\]>/g,'').trim()).filter(t=>t.length>10&&t.length<200).slice(1,6)
      headlines.push(...(m1.length ? m1.slice(0,5) : m2))
      if (headlines.length >= 8) break
    } catch(e) {
      console.warn('RSS failed:', url, e.message)
    }
  }
  return [...new Set(headlines)].slice(0, 8)
}

async function generate(prices, news) {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const priceBlock = prices ? `
LIVE MCX PRICES (use these exact numbers — do not substitute your own):
- MCX Gold:   ₹${prices.mcxGold ?? 'N/A'}/10g   (COMEX $${prices.comexGold}/oz, ${prices.goldPct}% today)
- MCX Silver: ₹${prices.mcxSilver ?? 'N/A'}/kg  (COMEX $${prices.comexSilver}/oz, ${prices.silverPct}% today)
- MCX Crude:  ₹${prices.mcxCrude ?? 'N/A'}/bbl  (WTI $${prices.wti}, Brent $${prices.brent ?? 'N/A'}, ${prices.crudePct}% today)
- MCX Copper: ₹${prices.mcxCopper ?? 'N/A'}/kg  (COMEX $${prices.comexCopper}/lb, ${prices.copperPct}% today)
- MCX NatGas: ₹${prices.mcxGas ?? 'N/A'}/mmBtu  (Henry Hub $${prices.henryHub}, ${prices.gasPct}% today)
- USD/INR: ₹${prices.usdinr}` : 'PRICES: Unavailable — use your most recent knowledge but clearly state prices are estimates.'
  const newsBlock = news.length > 0 ? `NEWS:\n${news.map((h,i)=>`${i+1}. ${h}`).join('\n')}` : 'NEWS: None fetched — focus on price action and macro.'

  const prompt = `You are BhaavBrief's lead analyst. Write Edition #${EDITION} for ${dateStr}.

${priceBlock}

${newsBlock}

RULES:
- Use ONLY the MCX prices provided above. Never substitute or invent price levels.
- Support/resistance levels must be derived from the actual prices given (e.g. if MCX Gold is ₹1,59,000, supports are near that, not ₹92,000).
- Sharp, confident, specific. Every sentence adds value.
- Explain the WHY behind each move.
- 400-600 words. No fluff.
- End with "Edge of the Day:" — one line, the single most important thing.

Return ONLY valid MDX with frontmatter, nothing else:

---
title: "[Sharp headline under 12 words]"
description: "[One sentence summary under 25 words]"
date: "${today.toISOString().split('T')[0]}"
edition: ${EDITION}
tags: ["MCX Gold", "MCX Silver", "MCX Crude"]
---

[Brief content here]`

  const r = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })
  return r.content[0].type === 'text' ? r.content[0].text : null
}

async function main() {
  console.log(`\nBhaavBrief generator — Edition #${EDITION}\n`)
  const [prices, news] = await Promise.all([fetchPrices(), fetchNews()])
  console.log(`Prices: ${prices ? 'OK' : 'FAILED'}`)
  console.log(`News: ${news.length} headlines`)
  let mdx = await generate(prices, news)
  if (!mdx) { console.error('No output from model'); process.exit(1) }
  // Strip markdown code fence wrapper the model sometimes adds
  mdx = mdx.trim().replace(/^```(?:mdx)?\n?/, '').replace(/\n?```\s*$/, '').trim()
  if (!mdx.includes('---') || !mdx.includes('title:')) {
    console.error('Invalid MDX generated:\n', mdx.slice(0, 200))
    process.exit(1)
  }
  if (!fs.existsSync(BRIEFS_DIR)) fs.mkdirSync(BRIEFS_DIR, { recursive: true })
  const file = path.join(BRIEFS_DIR, `edition-${String(EDITION).padStart(3,'0')}.mdx`)
  if (fs.existsSync(file)) { console.warn('Already exists, skipping'); process.exit(0) }
  fs.writeFileSync(file, mdx.trim(), 'utf8')
  console.log(`Saved: ${file}`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
