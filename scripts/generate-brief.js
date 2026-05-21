import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const EDITION = parseInt(process.env.EDITION ?? '1', 10)
const BRIEFS_DIR = path.join(process.cwd(), 'content/briefs')

async function fetchPrices() {
  const tickers = ['GC=F','SI=F','CL=F','HG=F','NG=F','USDINR=X']
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(',')}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 BhaavBrief/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    const q = {}
    for (const r of (data?.quoteResponse?.result ?? [])) {
      q[r.symbol] = { price: r.regularMarketPrice, pct: r.regularMarketChangePercent }
    }
    const usdinr = q['USDINR=X']?.price ?? 96.0
    const gold = q['GC=F']?.price ?? 0
    const silver = q['SI=F']?.price ?? 0
    const wti = q['CL=F']?.price ?? 0
    const copper = q['HG=F']?.price ?? 0
    const gas = q['NG=F']?.price ?? 0
    return {
      usdinr: usdinr.toFixed(2),
      comexGold: gold.toFixed(0),
      mcxGold: gold > 0 ? ((gold/31.1035)*10*usdinr*1.15).toFixed(0) : null,
      comexSilver: silver.toFixed(2),
      mcxSilver: silver > 0 ? ((silver/31.1035)*1000*usdinr*1.10).toFixed(0) : null,
      wti: wti.toFixed(2),
      mcxCrude: wti > 0 ? (wti*usdinr*1.02).toFixed(0) : null,
      comexCopper: copper.toFixed(2),
      mcxCopper: copper > 0 ? (copper*2.20462*usdinr*1.05).toFixed(2) : null,
      henryHub: gas.toFixed(2),
      mcxGas: gas > 0 ? (gas*usdinr).toFixed(2) : null,
      goldPct: (q['GC=F']?.pct ?? 0).toFixed(2),
      silverPct: (q['SI=F']?.pct ?? 0).toFixed(2),
      crudePct: (q['CL=F']?.pct ?? 0).toFixed(2),
      copperPct: (q['HG=F']?.pct ?? 0).toFixed(2),
      gasPct: (q['NG=F']?.pct ?? 0).toFixed(2),
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
PRICES:
- USD/INR: ₹${prices.usdinr}
- COMEX Gold: $${prices.comexGold}/oz (${prices.goldPct}%) → MCX: ₹${prices.mcxGold ?? 'N/A'}/10g
- COMEX Silver: $${prices.comexSilver}/oz (${prices.silverPct}%) → MCX: ₹${prices.mcxSilver ?? 'N/A'}/kg
- WTI Crude: $${prices.wti}/bbl (${prices.crudePct}%) → MCX: ₹${prices.mcxCrude ?? 'N/A'}/bbl
- COMEX Copper: $${prices.comexCopper}/lb (${prices.copperPct}%) → MCX: ₹${prices.mcxCopper ?? 'N/A'}/kg
- Henry Hub Gas: $${prices.henryHub}/mmBtu (${prices.gasPct}%) → MCX: ₹${prices.mcxGas ?? 'N/A'}/mmBtu` : 'PRICES: Unavailable — analyse on recent trends.'
  const newsBlock = news.length > 0 ? `NEWS:\n${news.map((h,i)=>`${i+1}. ${h}`).join('\n')}` : 'NEWS: None fetched — focus on price action and macro.'

  const prompt = `You are BhaavBrief's lead analyst. Write Edition #${EDITION} for ${dateStr}.

${priceBlock}

${newsBlock}

RULES:
- Sharp, confident, specific. Every sentence adds value.
- Give exact MCX support/resistance levels to watch.
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
