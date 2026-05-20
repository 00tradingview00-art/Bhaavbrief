/**
 * BhaavBrief Intelligence Engine
 * 
 * Runs every 15 min during MCX market hours via GitHub Actions.
 * 
 * TRIGGER: Price move >1% in any commodity + supporting signal
 *   Supporting signals: new SEBI/MCX/RBI circular, EIA data, major macro event
 *   Override: Price move >2% publishes regardless of supporting signal
 * 
 * FLOW:
 *   1. Load state (last prices, last circulars seen)
 *   2. Fetch current prices (Yahoo Finance → MCX derived)
 *   3. Detect moves vs last 15 min state
 *   4. Scrape govt agencies for new circulars
 *   5. Check EIA data (Wednesdays)
 *   6. Evaluate trigger conditions
 *   7. If triggered: Claude generates SEO article → save MDX → update state
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Paths ────────────────────────────────────────────────────────────────────
const STATE_FILE    = path.join(ROOT, 'data/engine-state.json')
const ARTICLES_DIR  = path.join(ROOT, 'content/articles')
const TITLE_FILE    = path.join(ROOT, 'data/last-article-title.txt')

// ── Constants ─────────────────────────────────────────────────────────────────
const MOVE_THRESHOLD      = 1.0   // % — triggers article with supporting signal
const MOVE_THRESHOLD_HARD = 2.0   // % — triggers article regardless
const MAX_ARTICLES_PER_DAY = 8    // cap to avoid spam
const MIN_MINUTES_BETWEEN  = 30   // don't publish two articles within 30 min

// ── 1. State Management ───────────────────────────────────────────────────────
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return {
      lastPrices: {},
      lastChecked: null,
      lastCirculars: { sebi: null, mcx: null, rbi: null, ppac: null },
      lastEia: { period: null, value: null },
      articlesToday: [],
      lastArticleAt: null,
    }
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

// ── 2. Price Fetching (Yahoo Finance → MCX derived) ───────────────────────────
async function fetchPrices() {
  const tickers = ['GC=F', 'SI=F', 'CL=F', 'HG=F', 'NG=F', 'USDINR=X', 'BZ=F']
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(',')}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 BhaavBrief/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    const q = {}
    for (const r of (data?.quoteResponse?.result ?? [])) {
      q[r.symbol] = {
        price: r.regularMarketPrice,
        pct:   r.regularMarketChangePercent,
        prev:  r.regularMarketPreviousClose,
      }
    }

    const usdinr    = q['USDINR=X']?.price ?? 96.0
    const comexGold = q['GC=F']?.price ?? 0
    const comexSilv = q['SI=F']?.price ?? 0
    const wti       = q['CL=F']?.price ?? 0
    const brent     = q['BZ=F']?.price ?? 0
    const comexCu   = q['HG=F']?.price ?? 0
    const henryHub  = q['NG=F']?.price ?? 0

    return {
      usdinr,
      comexGold, comexSilver: comexSilv, wti, brent, comexCopper: comexCu, henryHub,
      // MCX derived prices
      mcxGold:   comexGold  > 0 ? (comexGold  / 31.1035) * 10   * usdinr * 1.15 : 0,
      mcxSilver: comexSilv  > 0 ? (comexSilv  / 31.1035) * 1000 * usdinr * 1.10 : 0,
      mcxCrude:  wti        > 0 ? wti         * usdinr  * 1.02 : 0,
      mcxCopper: comexCu    > 0 ? comexCu     * 2.20462 * usdinr * 1.05 : 0,
      mcxNatGas: henryHub   > 0 ? henryHub    * usdinr : 0,
      // Change %
      goldPct:   q['GC=F']?.pct  ?? 0,
      silverPct: q['SI=F']?.pct  ?? 0,
      crudePct:  q['CL=F']?.pct  ?? 0,
      copperPct: q['HG=F']?.pct  ?? 0,
      gasPct:    q['NG=F']?.pct  ?? 0,
      usdPct:    q['USDINR=X']?.pct ?? 0,
    }
  } catch (err) {
    console.error('❌ Price fetch failed:', err.message)
    return null
  }
}

// ── 3. Detect Price Moves vs Last State ───────────────────────────────────────
function detectMoves(current, lastPrices) {
  const moves = []

  const pairs = [
    { key: 'gold',   curr: current.mcxGold,   label: 'MCX Gold',    pct: current.goldPct,   unit: '₹', per: '/10g' },
    { key: 'silver', curr: current.mcxSilver,  label: 'MCX Silver',  pct: current.silverPct, unit: '₹', per: '/kg'  },
    { key: 'crude',  curr: current.mcxCrude,   label: 'MCX Crude',   pct: current.crudePct,  unit: '₹', per: '/bbl' },
    { key: 'copper', curr: current.mcxCopper,  label: 'MCX Copper',  pct: current.copperPct, unit: '₹', per: '/kg'  },
    { key: 'natgas', curr: current.mcxNatGas,  label: 'MCX Nat Gas', pct: current.gasPct,    unit: '₹', per: '/mmBtu'},
    { key: 'usdinr', curr: current.usdinr,     label: 'USD/INR',     pct: current.usdPct,    unit: '₹', per: ''     },
  ]

  for (const { key, curr, label, pct, unit, per } of pairs) {
    if (!curr || curr === 0) continue
    const absPct = Math.abs(pct)
    if (absPct >= MOVE_THRESHOLD) {
      moves.push({
        key,
        label,
        price: curr,
        pct,
        absPct,
        unit,
        per,
        isHard: absPct >= MOVE_THRESHOLD_HARD,
        direction: pct > 0 ? 'surged' : 'fell',
        directionShort: pct > 0 ? '▲' : '▼',
      })
    }
  }

  // Sort by magnitude — biggest move first
  return moves.sort((a, b) => b.absPct - a.absPct)
}

// ── 4. Govt Circular Monitor ──────────────────────────────────────────────────
async function checkCirculars(lastCirculars) {
  const newCirculars = []

  // SEBI Circulars
  try {
    const res = await fetch(
      'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=2&ssid=3&smid=0',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
    )
    const html = await res.text()
    // Extract first circular title and date
    const match = html.match(/class="homeText"[^>]*>\s*<a[^>]*>([^<]+)<\/a>.*?(\d{2}[-\/]\d{2}[-\/]\d{4})/s)
    if (match) {
      const title = match[1].trim()
      const id = title.slice(0, 80)
      if (id !== lastCirculars.sebi) {
        newCirculars.push({ source: 'SEBI', title, url: 'https://sebi.gov.in' })
        lastCirculars.sebi = id
      }
    }
  } catch (err) {
    console.warn('SEBI scrape failed:', err.message)
  }

  // MCX Circulars
  try {
    const res = await fetch(
      'https://www.mcxindia.com/market-data/notices',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
    )
    const html = await res.text()
    const match = html.match(/<td[^>]*>([^<]{20,150})<\/td>\s*<td[^>]*>(\d{2}[-\/]\d{2}[-\/]\d{4})/s)
    if (match) {
      const title = match[1].trim()
      const id = title.slice(0, 80)
      if (id !== lastCirculars.mcx) {
        newCirculars.push({ source: 'MCX', title, url: 'https://mcxindia.com' })
        lastCirculars.mcx = id
      }
    }
  } catch (err) {
    console.warn('MCX scrape failed:', err.message)
  }

  // RBI Press Releases
  try {
    const res = await fetch(
      'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
    )
    const html = await res.text()
    const match = html.match(/class="TableText"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/s)
    if (match) {
      const title = match[1].trim()
      const id = title.slice(0, 80)
      if (id !== lastCirculars.rbi) {
        newCirculars.push({ source: 'RBI', title, url: 'https://rbi.org.in' })
        lastCirculars.rbi = id
      }
    }
  } catch (err) {
    console.warn('RBI scrape failed:', err.message)
  }

  // PPAC Petroleum Prices
  try {
    const res = await fetch(
      'https://ppac.gov.in/content/212_1_ImportExport.aspx',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
    )
    const html = await res.text()
    const match = html.match(/International Crude Price[^<]*<[^>]+>([^<]+)/i)
    if (match) {
      const title = match[1].trim()
      const id = title.slice(0, 80)
      if (id !== lastCirculars.ppac) {
        newCirculars.push({ source: 'PPAC', title: `Petroleum import data updated: ${title}`, url: 'https://ppac.gov.in' })
        lastCirculars.ppac = id
      }
    }
  } catch (err) {
    console.warn('PPAC scrape failed:', err.message)
  }

  return { newCirculars, updatedLastCirculars: lastCirculars }
}

// ── 5. EIA Crude Inventory Monitor ───────────────────────────────────────────
async function checkEIA(lastEia) {
  if (!process.env.EIA_API_KEY) return null

  try {
    const url = `https://api.eia.gov/v2/petroleum/sum/sndw/data/?api_key=${process.env.EIA_API_KEY}&frequency=weekly&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=2`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const data = await res.json()
    const latest = data?.response?.data?.[0]

    if (!latest) return null

    const { period, value } = latest
    if (period === lastEia.period) return null // Already seen this week's data

    const changeBarrels = value - (lastEia.value ?? 0)
    const isSignificant = Math.abs(changeBarrels) > 1_000_000 // >1M barrel change is significant

    return {
      period,
      value,
      changeBarrels,
      isSignificant,
      direction: changeBarrels < 0 ? 'draw' : 'build',
      summary: `EIA weekly crude inventory: ${changeBarrels < 0 ? 'draw' : 'build'} of ${Math.abs(changeBarrels / 1_000_000).toFixed(1)}M barrels for week of ${period}`,
    }
  } catch (err) {
    console.warn('EIA fetch failed:', err.message)
    return null
  }
}

// ── 6. Article Generator ──────────────────────────────────────────────────────
async function generateArticle({ moves, circulars, eia, prices }) {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

  const primaryMove = moves[0]

  // Build context block
  const priceBlock = `
CURRENT MCX PRICES (${timeStr} IST):
- MCX Gold:   ₹${prices.mcxGold?.toFixed(0) ?? 'N/A'}/10g    (COMEX: $${prices.comexGold?.toFixed(0)}/oz, ${primaryMove?.key === 'gold' ? primaryMove.pct.toFixed(2) : prices.goldPct?.toFixed(2)}%)
- MCX Silver: ₹${prices.mcxSilver?.toFixed(0) ?? 'N/A'}/kg   (COMEX: $${prices.comexSilver?.toFixed(2)}/oz, ${primaryMove?.key === 'silver' ? primaryMove.pct.toFixed(2) : prices.silverPct?.toFixed(2)}%)
- MCX Crude:  ₹${prices.mcxCrude?.toFixed(0) ?? 'N/A'}/bbl   (WTI: $${prices.wti?.toFixed(2)}, Brent: $${prices.brent?.toFixed(2)}, ${primaryMove?.key === 'crude' ? primaryMove.pct.toFixed(2) : prices.crudePct?.toFixed(2)}%)
- MCX Copper: ₹${prices.mcxCopper?.toFixed(2) ?? 'N/A'}/kg   (COMEX: $${prices.comexCopper?.toFixed(2)}/lb, ${primaryMove?.key === 'copper' ? primaryMove.pct.toFixed(2) : prices.copperPct?.toFixed(2)}%)
- MCX NatGas: ₹${prices.mcxNatGas?.toFixed(2) ?? 'N/A'}/mmBtu (Henry Hub: $${prices.henryHub?.toFixed(2)}, ${primaryMove?.key === 'natgas' ? primaryMove.pct.toFixed(2) : prices.gasPct?.toFixed(2)}%)
- USD/INR:    ₹${prices.usdinr?.toFixed(2)}`.trim()

  const moveBlock = moves.map(m =>
    `${m.label}: ${m.directionShort} ${m.absPct.toFixed(2)}% → ₹${m.price.toFixed(m.key === 'copper' ? 2 : 0)}${m.per}`
  ).join('\n')

  const circularBlock = circulars.length > 0
    ? `NEW GOVT/REGULATORY SIGNALS:\n${circulars.map(c => `- [${c.source}] ${c.title}`).join('\n')}`
    : ''

  const eiaBlock = eia
    ? `EIA CRUDE DATA: ${eia.summary}`
    : ''

  const commodity = primaryMove?.label ?? 'commodities'
  const tags = [...new Set(moves.map(m => m.label))].slice(0, 4).join('", "')

  const prompt = `You are BhaavBrief's senior market analyst — India's most trusted real-time commodity intelligence platform.

Write a flash intelligence article triggered at ${timeStr} IST on ${dateStr}.

TRIGGER:
${moveBlock}

${priceBlock}

${circularBlock}

${eiaBlock}

WRITING STANDARDS — NON-NEGOTIABLE:
1. This is ORIGINAL analysis, not news sourcing. BhaavBrief's own voice.
2. Give the SPECIFIC reason for the price move — macro, geopolitical, technical, regulatory.
3. Give EXACT MCX price levels: current price, support, resistance, key level to watch.
4. Tell Indian traders exactly what to do with this information.
5. 150–250 words. Sharp. No filler. No hedging. No "experts say".
6. You ARE the expert. Write with conviction.
7. End with one line: "Watch: [specific price level or event to monitor]"

SEO RULES:
- Title must include: commodity name + specific action + key reason (under 65 chars)
- Include "MCX" in title
- Meta description: under 155 chars, include current price
- Slug: lowercase, hyphens, include commodity and key trigger word

RETURN ONLY valid MDX frontmatter + article body, nothing else:

---
title: "[SEO title — specific, under 65 chars, includes MCX + commodity + trigger]"
description: "[Under 155 chars — include current ₹ price and key reason]"
date: "${today.toISOString().split('T')[0]}"
time: "${timeStr}"
edition: "flash"
commodity: "${primaryMove?.key ?? 'macro'}"
tags: ["${tags}"]
priceAtPublish: ${Math.round(primaryMove?.price ?? 0)}
slug: "[url-slug-max-8-words-hyphens-only]"
---

[Article body — 150–250 words, original analysis, specific levels, actionable]`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : null
}

// ── 7. Save Article as MDX ────────────────────────────────────────────────────
function saveArticle(mdx) {
  if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true })

  // Extract slug from frontmatter
  const slugMatch = mdx.match(/^slug:\s*"?([^"\n]+)"?/m)
  const titleMatch = mdx.match(/^title:\s*"([^"]+)"/m)

  const today = new Date().toISOString().split('T')[0]
  const rawSlug = slugMatch?.[1]?.trim() ?? `market-update-${Date.now()}`
  const slug = `${today}-${rawSlug}`.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80)

  const filepath = path.join(ARTICLES_DIR, `${slug}.mdx`)

  // Never overwrite
  if (fs.existsSync(filepath)) {
    console.warn('Article already exists:', filepath)
    return null
  }

  // Strip slug from frontmatter (it's now in the filename)
  const cleanMdx = mdx.replace(/^slug:.*$/m, '').trim()
  fs.writeFileSync(filepath, cleanMdx, 'utf8')

  // Save title for git commit message
  const title = titleMatch?.[1] ?? 'Market Update'
  fs.writeFileSync(TITLE_FILE, title, 'utf8')

  console.log(`✅ Article saved: ${filepath}`)
  return { filepath, slug, title }
}

// ── 8. Throttle Check ─────────────────────────────────────────────────────────
function canPublish(state) {
  const today = new Date().toISOString().split('T')[0]

  // Reset daily count
  if (!state.articlesToday || !state.articlesToday[0]?.startsWith(today)) {
    state.articlesToday = []
  }

  if (state.articlesToday.length >= MAX_ARTICLES_PER_DAY) {
    console.log(`⏭  Daily cap reached (${MAX_ARTICLES_PER_DAY} articles)`)
    return false
  }

  if (state.lastArticleAt) {
    const minsSinceLastArticle = (Date.now() - new Date(state.lastArticleAt).getTime()) / 60000
    if (minsSinceLastArticle < MIN_MINUTES_BETWEEN) {
      console.log(`⏭  Too soon since last article (${minsSinceLastArticle.toFixed(1)} min ago, min: ${MIN_MINUTES_BETWEEN})`)
      return false
    }
  }

  return true
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now()
  console.log(`\n🧠 BhaavBrief Intelligence Engine — ${new Date().toISOString()}\n`)

  // Load state
  const state = loadState()

  // Check daily cap first
  if (!canPublish(state)) {
    saveState(state)
    return
  }

  // Fetch prices + circulars + EIA in parallel
  const [prices, circularResult, eiaData] = await Promise.all([
    fetchPrices(),
    checkCirculars(state.lastCirculars),
    checkEIA(state.lastEia),
  ])

  // Update circular state
  state.lastCirculars = circularResult.updatedLastCirculars
  const newCirculars = circularResult.newCirculars

  // Update EIA state
  if (eiaData) state.lastEia = { period: eiaData.period, value: eiaData.value }

  if (!prices) {
    console.warn('⚠️  No price data — skipping this run')
    saveState(state)
    return
  }

  // Detect price moves
  const moves = detectMoves(prices, state.lastPrices)

  // Update last prices
  state.lastPrices = {
    gold: prices.mcxGold,
    silver: prices.mcxSilver,
    crude: prices.mcxCrude,
    copper: prices.mcxCopper,
    natgas: prices.mcxNatGas,
    usdinr: prices.usdinr,
  }
  state.lastChecked = new Date().toISOString()

  // Log what we found
  console.log(`📈 Price moves detected: ${moves.length}`)
  moves.forEach(m => console.log(`   ${m.label}: ${m.pct.toFixed(2)}% → ₹${m.price.toFixed(0)}`))
  console.log(`📋 New circulars: ${newCirculars.length}`)
  newCirculars.forEach(c => console.log(`   [${c.source}] ${c.title.slice(0, 60)}`))
  console.log(`🛢  EIA data: ${eiaData ? eiaData.summary : 'none'}`)

  // ── Trigger Logic ──────────────────────────────────────────────────────────
  const hardMove   = moves.some(m => m.isHard)           // >2% — always publish
  const softMove   = moves.some(m => !m.isHard)          // >1% — needs signal
  const hasSignal  = newCirculars.length > 0 || (eiaData?.isSignificant)

  const shouldPublish = hardMove || (softMove && hasSignal)

  if (!shouldPublish) {
    if (moves.length === 0) console.log('⏭  No significant price moves')
    else console.log('⏭  Moves detected but no supporting signal — holding')
    saveState(state)
    return
  }

  console.log('\n🔥 TRIGGER FIRED — generating article...')
  if (hardMove)         console.log('   Reason: Hard move >2%')
  if (softMove && hasSignal) console.log('   Reason: Soft move + circular/EIA signal')

  // Generate article
  const mdx = await generateArticle({
    moves,
    circulars: newCirculars,
    eia: eiaData,
    prices,
  })

  if (!mdx || !mdx.includes('---') || !mdx.includes('title:')) {
    console.error('❌ Invalid MDX generated — aborting')
    saveState(state)
    return
  }

  // Save article
  const result = saveArticle(mdx)
  if (!result) {
    saveState(state)
    return
  }

  // Update state
  const today = new Date().toISOString().split('T')[0]
  state.articlesToday = state.articlesToday ?? []
  state.articlesToday.push(`${today}/${result.slug}`)
  state.lastArticleAt = new Date().toISOString()

  saveState(state)

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n✅ Done in ${elapsed}s — "${result.title}"`)
  console.log(`   File: content/articles/${result.slug}.mdx\n`)
}

main().catch(err => {
  console.error('❌ Engine fatal error:', err)
  process.exit(1)
})
