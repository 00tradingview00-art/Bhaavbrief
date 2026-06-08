#!/usr/bin/env node
/**
 * BhaavBrief — Daily MCX Open Brief
 *
 * Runs at 9:00 AM IST Monday–Friday via GitHub Actions.
 * Publishes a comprehensive market-open intelligence article regardless of
 * price thresholds — every MCX session gets an opening read.
 *
 * WHAT IT COVERS:
 *   - Overnight COMEX/NYMEX moves (what happened while MCX was closed)
 *   - Expected MCX open prices vs yesterday's close
 *   - Technical levels for each commodity (real Kite OHLC data)
 *   - Cross-asset narrative: dominant theme for today's session
 *   - Key macro/event calendar for the day
 *   - Saves to content/briefs/edition-NNN.mdx
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { fetchKiteHistorical, computeTechnicalLevels, formatTechnicalBlock } from './lib/technicals.js'
import { isTradingHoliday, getHolidayName } from './lib/holidays.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

// Load .env.local so Kite token is available when run directly from the CLI
const envFile = path.join(ROOT, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const client      = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const BRIEFS_DIR   = path.join(ROOT, 'content/briefs')
const STATE_FILE   = path.join(ROOT, 'data/daily-brief-state.json')

// ── Load today's state (prevent double-publish) ───────────────────────────────
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }
  catch { return { lastBriefDate: null } }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// ── Load kite instruments ─────────────────────────────────────────────────────
function loadInstruments() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/kite-instruments.json'), 'utf8')) }
  catch { return null }
}

// ── Fetch Kite live MCX prices ────────────────────────────────────────────────
async function fetchKitePrices(instruments) {
  const KITE_API_KEY      = process.env.KITE_API_KEY
  const KITE_ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN
  if (!KITE_API_KEY || !KITE_ACCESS_TOKEN || !instruments) return null

  const keys = ['gold', 'silver', 'crude', 'copper', 'natgas']
  const qs   = keys.filter(k => instruments[k]?.symbol).map(k => `i=MCX:${instruments[k].symbol}`).join('&')
  if (!qs) return null

  try {
    const res = await fetch(`https://api.kite.trade/quote?${qs}`, {
      headers: { 'X-Kite-Version': '3', Authorization: `token ${KITE_API_KEY}:${KITE_ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) { console.warn(`  Kite quote ${res.status}`); return null }
    const { data } = await res.json()
    const out = { source: 'kite' }
    for (const key of keys) {
      const sym = instruments[key]?.symbol
      const q   = data?.[`MCX:${sym}`]
      if (!sym || !q) continue
      const ltp       = q.last_price
      const prevClose = q.ohlc?.close ?? 0
      const dayHigh   = q.ohlc?.high  ?? 0
      const dayLow    = q.ohlc?.low   ?? 0
      if (ltp != null) {
        out[key] = { ltp, prevClose, dayHigh, dayLow }
        if (prevClose > 0) out[key].pct = ((ltp - prevClose) / prevClose) * 100
      }
    }
    return out
  } catch (e) { console.warn(`  Kite failed: ${e.message}`); return null }
}

// ── Fetch COMEX overnight moves from Yahoo Finance ────────────────────────────
async function fetchComexOvernight() {
  const yahooMap = {
    gold:   { sym: 'GC%3DF', label: 'COMEX Gold',   unit: '$/oz'    },
    silver: { sym: 'SI%3DF', label: 'COMEX Silver',  unit: '$/oz'    },
    crude:  { sym: 'CL%3DF', label: 'WTI Crude',     unit: '$/bbl'   },
    copper: { sym: 'HG%3DF', label: 'COMEX Copper',  unit: '$/lb'    },
    natgas: { sym: 'NG%3DF', label: 'Henry Hub Gas', unit: '$/mmBtu' },
  }

  const results = {}
  await Promise.all(Object.entries(yahooMap).map(async ([key, { sym, label, unit }]) => {
    try {
      const r = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=2d`,
        { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
      )
      if (!r.ok) return
      const { chart } = await r.json()
      const meta = chart?.result?.[0]?.meta
      if (!meta) return
      const price = meta.regularMarketPrice
      const prev  = meta.chartPreviousClose
      if (price > 0 && prev > 0) {
        results[key] = { label, unit, price, pct: ((price - prev) / prev) * 100 }
      }
    } catch {}
  }))

  return results
}

// ── Fetch USD/INR ─────────────────────────────────────────────────────────────
async function fetchUSDINR() {
  const MIN = 82, MAX = 110
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', { signal: AbortSignal.timeout(5000) })
    if (r.ok) { const v = (await r.json()).rates?.INR ?? 0; if (v >= MIN && v <= MAX) return v }
  } catch {}
  try {
    const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(5000) })
    if (r.ok) { const v = (await r.json()).rates?.INR ?? 0; if (v >= MIN && v <= MAX) return v }
  } catch {}
  return null
}

// ── Build narrative ───────────────────────────────────────────────────────────
function buildOpeningNarrative(comex) {
  const g  = comex.gold?.pct   ?? 0
  const s  = comex.silver?.pct ?? 0
  const c  = comex.crude?.pct  ?? 0
  const cu = comex.copper?.pct ?? 0
  const ng = comex.natgas?.pct ?? 0
  const themes = []

  if (g > 0.5 && c < -0.5)  themes.push(`Risk-off overnight: gold gained +${g.toFixed(1)}% as crude fell ${Math.abs(c).toFixed(1)}% — safe-haven demand into Asian open`)
  if (g > 0.4 && s > 0.4 && cu > 0.4) themes.push(`Broad metals rally overnight: gold, silver, copper all advancing — dollar weakness or reflation bid`)
  if (c > 1.0 && ng > 1.0)  themes.push(`Energy complex surging: crude +${c.toFixed(1)}% and nat gas +${ng.toFixed(1)}% overnight — supply concern driving energy`)
  if (g < -0.5 && c < -0.5) themes.push(`Broad selloff overnight: gold ${g.toFixed(1)}% and crude ${c.toFixed(1)}% — dollar strength weighing on commodities`)
  if (g > 0.4 && c > 0.4 && !themes.length) themes.push(`Inflationary overnight tone: gold +${g.toFixed(1)}% and crude +${c.toFixed(1)}% — India import costs rising at MCX open`)
  if (cu > 0.8 && !themes.length)  themes.push(`China demand signal: copper +${cu.toFixed(1)}% overnight — risk-on tone into MCX open`)

  if (!themes.length) {
    const movers = [
      { name: 'Gold', pct: g }, { name: 'Silver', pct: s }, { name: 'Crude', pct: c },
      { name: 'Copper', pct: cu }, { name: 'NatGas', pct: ng },
    ].filter(x => Math.abs(x.pct) > 0.2).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    if (movers.length > 0) themes.push(`${movers[0].name} leads overnight at ${movers[0].pct >= 0 ? '+' : ''}${movers[0].pct.toFixed(1)}%`)
    else themes.push('Quiet overnight session — sub-0.2% moves across the commodity complex')
  }

  return themes.slice(0, 2).join('. ')
}

// ── Generate the open brief via Claude ───────────────────────────────────────
async function generateOpenBrief({ comex, kitePrices, usdinr, technicalBlocks, narrative }) {
  const today   = new Date()
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
  const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

  // Format COMEX overnight block
  const comexLines = Object.values(comex)
    .filter(c => c.price > 0)
    .map(c => `  ${c.label}: ${c.price.toFixed(c.unit.includes('oz') ? 2 : 2)} ${c.unit}  (${c.pct >= 0 ? '+' : ''}${c.pct.toFixed(2)}% overnight)`)
    .join('\n')

  // Format Kite MCX open prices
  const mcxLines = kitePrices
    ? ['gold', 'silver', 'crude', 'copper', 'natgas'].map(key => {
        const p = kitePrices[key]
        if (!p) return null
        const labels = { gold: 'MCX Gold', silver: 'MCX Silver', crude: 'MCX Crude', copper: 'MCX Copper', natgas: 'MCX NatGas' }
        const units  = { gold: '/10g',     silver: '/kg',        crude: '/bbl',      copper: '/kg',        natgas: '/mmBtu'   }
        const pctStr = p.pct != null ? `  ${p.pct >= 0 ? '+' : ''}${p.pct.toFixed(2)}% from prev close` : ''
        return `  ${labels[key]}: ₹${p.ltp}${units[key]}${pctStr}`
      }).filter(Boolean).join('\n')
    : '  (Kite prices not yet available at this time — MCX just opened)'

  const techSection = technicalBlocks.length > 0
    ? `\nTECHNICAL LEVELS (Kite MCX 20-day OHLC — use these EXACT numbers in your article):\n${technicalBlocks.join('\n\n')}`
    : ''

  const dateLabel = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })

  const prompt = `You are BhaavBrief's senior market analyst. Write the MCX MARKET OPEN BRIEF for ${dateStr}.

SEBI COMPLIANCE: BhaavBrief is unregistered — educational content only. No buy/sell/accumulate/avoid/exit/enter calls directed at the reader. Use "historically" or "in past episodes" framing when referencing price behaviour. State data, never judge it.

DATA — use these EXACT numbers, do not round or invent:

OVERNIGHT COMEX/NYMEX:
${comexLines}

USD/INR: ₹${usdinr.toFixed(2)}

MCX OPEN (${timeStr} IST):
${mcxLines}
${techSection}

WRITE EXACTLY THESE 5 SECTIONS with these exact headings:

## [Dominant Theme Name] — [DIRECTION]
Name this section after the dominant overnight theme (e.g. "Crude Surge — METALS UNDER PRESSURE" or "Risk-Off — GOLD LEADS"). 3–4 sentences of flowing narrative prose. What happened overnight on COMEX/NYMEX? What is the single dominant story? How does it connect to MCX opening? Use exact prices and percentages. No bullet points.

## The Market Is Saying
Cover all 5 MCX commodities in flowing prose — not a table, not bullet points. For each: exact MCX open price, % change from previous close, key support and resistance from the OHLC data above. Weave them together as a connected narrative. End this section with how USD/INR at ₹${usdinr.toFixed(2)} is amplifying or dampening the COMEX move in rupee terms.

## Historical Context
Name 1–2 comparable past episodes (specific month/year) where a similar COMEX setup played out. What happened to MCX prices in those episodes — specific % ranges. What does that history suggest about the range of outcomes today? Use "historically" framing. No predictions.

## What Kills It
One paragraph. What is the single specific event or data point that would immediately reverse today's dominant thesis? Be precise — name a level, a data release, a geopolitical event. Not vague. No hedging.

## Who Is Affected
Write four labelled subsections exactly as shown:

**BUSINESSES:**
One specific sector (name actual companies if relevant) and the concrete cost or revenue consequence of today's MCX open. Precise. No generic "businesses face higher costs."

**INVESTORS:**
One specific MCX contract, its exact open price, and what the directional signal from today's open means for positioning. Reference a specific support or resistance level.

**CONSUMERS:**
One specific product (petrol, cooking gas, gold jewellery, etc.) and whether today's open is likely to translate into a price change at the retail/consumer level. Explain the transmission mechanism briefly.

**EDGE OF THE DAY:**
The single most precise, actionable monitoring point for today — a specific price level on a specific contract, or a specific data release time. One sentence. This is what a trader should watch above everything else.

WRITING RULES:
- Flowing prose throughout — no numbered lists, no bullet points, no tables
- No parenthetical definitions for standard terms
- No filler phrases: "it is worth noting", "market participants should be aware", "it is important to"
- Precise numbers always — never "approximately" when you have the exact figure
- Tone: Mint newspaper, not Bloomberg Terminal. Accessible but authoritative
- If referencing a previous edition: [Edition 32](/briefs/edition-032)
- Total length: 420–520 words

SEO:
- Title: "MCX Open ${dateLabel}: [thematic headline]" — under 65 chars total
- Description: under 155 chars — include today's date and the 2 biggest moves with exact prices

RETURN ONLY valid MDX frontmatter + article body. No code fences. No markdown code blocks.

---
title: "MCX Open ${dateLabel}: [thematic headline under 65 chars total]"
description: "[under 155 chars — date + 2 biggest moves with exact prices]"
date: "${today.toISOString()}"
time: "${timeStr}"
edition: "morning-brief"
commodity: "multi"
tags: ["MCX Open", "Daily Brief", "Gold", "Crude Oil", "Silver"]
slug: "[mcx-open-DDMMMYYYY-theme]"
---`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : null
}

// ── Save brief to content/briefs/edition-NNN.mdx ─────────────────────────────
function saveArticle(mdx) {
  if (!fs.existsSync(BRIEFS_DIR)) fs.mkdirSync(BRIEFS_DIR, { recursive: true })

  const titleMatch = mdx.match(/^title:\s*"([^"]+)"/m)
  const descMatch  = mdx.match(/^description:\s*"([^"]+)"/m)
  const dateMatch  = mdx.match(/^date:\s*"([^"T]+)/m)
  const tagsMatch  = mdx.match(/^tags:\s*(\[.*?\])/m)

  // Find next edition number
  const existing = fs.readdirSync(BRIEFS_DIR)
    .filter(f => /^edition-\d+\.mdx$/.test(f))
    .map(f => parseInt(f.match(/\d+/)[0]))
    .sort((a, b) => a - b)
  const nextEdition = (existing[existing.length - 1] ?? 0) + 1
  const editionStr  = String(nextEdition).padStart(3, '0')
  const filename    = `edition-${editionStr}.mdx`
  const filepath    = path.join(BRIEFS_DIR, filename)

  if (fs.existsSync(filepath)) {
    console.warn('Brief already exists:', filepath)
    return null
  }

  // Strip code fences and rebuild frontmatter for the briefs schema
  const body = mdx
    .replace(/^```[a-z]*\n/m, '').replace(/\n```\s*$/m, '')
    .replace(/^---[\s\S]*?---\n*/m, '')
    .trim()

  const today    = dateMatch?.[1]?.trim().slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  const title    = titleMatch?.[1] ?? 'MCX Open Brief'
  const desc     = descMatch?.[1]  ?? ''
  const tags     = tagsMatch?.[1]  ?? '["MCX Open", "Daily Brief"]'

  const frontmatter = `---
title: "${title}"
date: "${today}"
edition: ${nextEdition}
description: "${desc}"
summary: "${desc}"
tags: ${tags}
commodities: ["MCX Gold", "MCX Silver", "MCX Crude", "MCX Copper", "MCX NatGas"]
published: true
---`

  fs.writeFileSync(filepath, `${frontmatter}\n\n${body}\n`, 'utf8')
  console.log(`Saved: content/briefs/${filename}`)
  return { slug: `edition-${editionStr}`, title }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now()
  console.log(`\nBhaavBrief Daily Open Brief — ${new Date().toISOString()}\n`)

  const today = todayIST()

  // Guard: only run between 8 AM and 2 PM IST (open brief window)
  const istHour = new Date(Date.now() + 5.5 * 3600 * 1000).getUTCHours()
  if (istHour < 8 || istHour >= 14) {
    console.log(`Outside open brief window (${istHour}:xx IST, expected 8–14) — skipping`)
    return
  }

  // Prevent double-publish: check state AND verify no brief already exists for today
  const state = loadState()
  const existingFile = fs.existsSync(BRIEFS_DIR)
    ? fs.readdirSync(BRIEFS_DIR).find(f => {
        if (!/^edition-\d+\.mdx$/.test(f)) return false
        try {
          const raw = fs.readFileSync(path.join(BRIEFS_DIR, f), 'utf8')
          return raw.includes(`date: "${today}"`)
        } catch { return false }
      })
    : null
  if (existingFile || state.lastBriefDate === today) {
    if (!existingFile && state.lastBriefDate === today) {
      console.log(`State says published but no file found — regenerating`)
    } else {
      console.log(`Open brief already published for ${today} — skipping`)
      return
    }
  }

  if (isTradingHoliday(today)) {
    const name = getHolidayName(today)
    console.log(`MCX holiday today (${today}${name ? ': ' + name : ''}) — skipping open brief`)
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const instruments = loadInstruments()
  const keys = ['gold', 'silver', 'crude', 'copper', 'natgas']
  const MCX_UNITS = { gold: '₹/10g', silver: '₹/kg', crude: '₹/bbl', copper: '₹/kg', natgas: '₹/mmBtu' }
  const MCX_LABELS = { gold: 'MCX Gold', silver: 'MCX Silver', crude: 'MCX Crude', copper: 'MCX Copper', natgas: 'MCX Nat Gas' }

  // Fetch all data in parallel
  console.log('Fetching data in parallel...')
  const [comex, kitePrices, usdinr] = await Promise.all([
    fetchComexOvernight(),
    instruments ? fetchKitePrices(instruments) : Promise.resolve(null),
    fetchUSDINR(),
  ])

  if (!usdinr) { console.error('USDINR fetch failed from both sources — aborting'); process.exit(1) }
  console.log(`  USD/INR: ₹${usdinr.toFixed(2)}`)
  console.log(`  COMEX: ${Object.values(comex).map(c => `${c.label.split(' ').pop()} ${c.pct >= 0 ? '+' : ''}${c.pct.toFixed(1)}%`).join(' | ')}`)
  console.log(`  Kite: ${kitePrices ? 'available' : 'unavailable'}`)

  // Fetch historical levels for all commodities in parallel
  console.log('Fetching Kite historical OHLC...')
  const technicalBlocks = []

  if (instruments) {
    const histResults = await Promise.all(
      keys.map(async key => {
        const token = instruments[key]?.token
        if (!token) return null
        const candles = await fetchKiteHistorical(token, 22)
        if (!candles) return null
        const mcxCache     = kitePrices ? null : (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mcx-last-prices.json'), 'utf8')) } catch { return null } })()
        const currentPrice = kitePrices?.[key]?.ltp ?? mcxCache?.[key] ?? 0
        const levels = computeTechnicalLevels(candles, currentPrice)
        if (!levels) return null
        return formatTechnicalBlock(MCX_LABELS[key], MCX_UNITS[key], currentPrice, levels)
      })
    )
    technicalBlocks.push(...histResults.filter(Boolean))
  }

  console.log(`  Technical blocks: ${technicalBlocks.length} commodities`)

  const narrative = buildOpeningNarrative(comex)
  console.log(`  Narrative: ${narrative}`)

  console.log('\nGenerating open brief via Claude Sonnet...')
  const mdx = await generateOpenBrief({ comex, kitePrices, usdinr, technicalBlocks, narrative })

  if (!mdx || !mdx.includes('---') || !mdx.includes('title:')) {
    console.error('Invalid MDX generated — aborting')
    return
  }

  const result = saveArticle(mdx)
  if (result) {
    state.lastBriefDate = today
    saveState(state)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\nDone in ${elapsed}s — "${result.title}"`)
    // Output filepath for workflow newsletter step
    console.log(`BRIEF_FILE=content/briefs/${result.slug}.mdx`)
  }
}

main().catch(err => {
  console.error('Daily open brief failed:', err)
  process.exit(1)
})
