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
 *   - Saves to content/articles/ as MDX
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { fetchKiteHistorical, computeTechnicalLevels, formatTechnicalBlock } from './lib/technicals.js'
import { isTradingHoliday, getHolidayName } from './lib/holidays.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const client      = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const ARTICLES_DIR = path.join(ROOT, 'content/articles')
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

// ── Fetch COMEX overnight moves from Stooq ────────────────────────────────────
async function fetchComexOvernight() {
  const stooqMap = {
    gold:   { sym: 'gc.f',   label: 'COMEX Gold',   unit: '$/oz',    div: 1   },
    silver: { sym: 'si.f',   label: 'COMEX Silver',  unit: '$/oz',    div: 100 },
    crude:  { sym: 'cl.f',   label: 'WTI Crude',     unit: '$/bbl',   div: 1   },
    brent:  { sym: 'lcod.uk',label: 'Brent Crude',   unit: '$/bbl',   div: 1   },
    copper: { sym: 'hg.f',   label: 'COMEX Copper',  unit: '$/lb',    div: 100 },
    natgas: { sym: 'ng.f',   label: 'Henry Hub Gas', unit: '$/mmBtu', div: 1   },
  }

  const results = {}
  await Promise.all(Object.entries(stooqMap).map(async ([key, { sym, label, unit, div }]) => {
    try {
      const r = await fetch(`https://stooq.com/q/l/?s=${sym}&f=sd2t2ohlcv&h&e=csv`, {
        signal: AbortSignal.timeout(6000),
      })
      if (!r.ok) return
      const lines = (await r.text()).trim().split('\n')
      if (lines.length < 2) return
      const cols  = lines[1].split(',')
      const open  = parseFloat(cols[3]) / div
      const close = parseFloat(cols[6]) / div
      if (!isNaN(close) && close > 0) {
        results[key] = { label, unit, price: close, pct: open > 0 ? ((close - open) / open) * 100 : 0 }
      }
    } catch {}
  }))

  return results
}

// ── Fetch USD/INR ─────────────────────────────────────────────────────────────
async function fetchUSDINR() {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', { signal: AbortSignal.timeout(5000) })
    if (r.ok) return (await r.json()).rates?.INR ?? 85.0
  } catch {}
  return 85.0
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

  const prompt = `You are BhaavBrief's senior market analyst. Write the DAILY MCX MARKET OPEN BRIEF for ${dateStr}.

This is the most important article of the day — professional Indian MCX traders read this at 9 AM. It must be comprehensive, precise, and data-driven.

SEBI COMPLIANCE (BhaavBrief is unregistered — educational content only): No buy/sell/accumulate/avoid/exit/enter directed at reader. Technical levels are observations not triggers. No predictive price targets — use "historically" or "in past episodes" framing. State data, never judge it.

OVERNIGHT CROSS-ASSET NARRATIVE:
${narrative}

OVERNIGHT COMEX/NYMEX MOVES:
${comexLines}

USD/INR: ₹${usdinr.toFixed(2)}

MCX OPENING PRICES (at ${timeStr} IST):
${mcxLines}
${techSection}

WRITE A 300-380 WORD MARKET OPEN BRIEF covering ALL of the following:

1. OVERNIGHT SUMMARY (50-60 words): What happened on COMEX/NYMEX overnight? What is the dominant theme? Why?

2. MCX OPEN LEVELS (80-100 words): For each commodity — current MCX price, % change from yesterday's close, and the key level to hold vs break today. Use the EXACT technical levels from the OHLC data above. Name specific support and resistance prices.

3. CROSS-ASSET CONNECTIONS (60-70 words): What is USD/INR doing and how does it amplify or offset the COMEX move? Any cross-commodity correlation worth noting (gold-silver ratio, crude-natgas spread, etc.)?

4. IMPORT PARITY CHECK (40-50 words): For the commodity with the biggest overnight move — show the exact import parity math: COMEX price → USD/INR → customs duty estimate → MCX theoretical fair value vs actual open.

5. WATCH TODAY (40-50 words): Name 2-3 specific price levels across the complex that will determine direction. Name any scheduled data releases today (EIA Wednesday, Fed speakers, India inflation data, etc.) that traders should have on their radar.

LANGUAGE RULES — NON-NEGOTIABLE:
Write for a first-time investor or small trader, NOT a Bloomberg analyst. Assume zero finance background.
- Explain every term on first use: "WTI crude (the US oil benchmark)", "COMEX (the US commodity exchange)", "20-SMA (the average price over the last 20 days)"
- "risk-off" → "investors moving money to safer assets like gold"
- "safe-haven bid" → "investors buying gold for safety"
- "the market is pricing in" → replace with plain language describing what is actually happening
- "stagflation" → "rising prices combined with a slowing economy"
- Short sentences. One idea per sentence. Max 25 words per sentence.
- If you reference a previous edition (e.g. Edition 32), write it as a markdown link: [Edition 32](/briefs/edition-032)

CONTENT RULES: No opinions. No buy/sell/accumulate/avoid/exit calls. Only facts, levels, and mechanics. End with one line: "Key focus today: [the single most important data point or level for Indian MCX traders to monitor]"

SEO RULES:
- Title: specific, includes "MCX Open" + dominant overnight theme (under 65 chars)
- Description: under 155 chars, include today's date and 2-3 key moves

RETURN ONLY valid MDX frontmatter + article body:

---
title: "[SEO title — under 65 chars, include MCX Open and dominant theme]"
description: "[Under 155 chars — include date and key overnight moves]"
date: "${today.toISOString().split('T')[0]}"
time: "${timeStr}"
edition: "morning-brief"
commodity: "multi"
tags: ["MCX Open", "Daily Brief", "Gold", "Crude Oil", "Silver"]
slug: "[mcx-open-DDMMMYYYY-dominant-theme]"
---

[Article body — 300-380 words, all 5 sections, specific levels, no hedging]`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : null
}

// ── Save article ──────────────────────────────────────────────────────────────
function saveArticle(mdx) {
  if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true })

  const slugMatch  = mdx.match(/^slug:\s*"?([^"\n]+)"?/m)
  const titleMatch = mdx.match(/^title:\s*"([^"]+)"/m)

  const today   = new Date().toISOString().split('T')[0]
  const rawSlug = slugMatch?.[1]?.trim() ?? `mcx-open-${today}`
  const slug    = `${today}-${rawSlug}`.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80)
  const filepath = path.join(ARTICLES_DIR, `${slug}.mdx`)

  if (fs.existsSync(filepath)) {
    console.warn('Open brief already exists:', filepath)
    return null
  }

  const cleanMdx = mdx
    .replace(/^```(?:mdx)?\n/m, '').replace(/\n```\s*$/m, '')  // strip code fences Claude sometimes adds
    .replace(/^slug:.*$/m, '').trim()
  fs.writeFileSync(filepath, cleanMdx, 'utf8')
  console.log(`Saved: content/articles/${slug}.mdx`)
  return { slug, title: titleMatch?.[1] ?? 'MCX Open Brief' }
}

// ── Save to content/briefs/ with auto-incremented edition number ──────────────
function nextEditionNumber() {
  if (!fs.existsSync(BRIEFS_DIR)) return 1
  const nums = fs.readdirSync(BRIEFS_DIR)
    .map(f => f.match(/^edition-(\d+)\.mdx$/)?.[1])
    .filter(Boolean)
    .map(Number)
  return nums.length ? Math.max(...nums) + 1 : 1
}

function saveBrief(cleanMdx, editionNum) {
  if (!fs.existsSync(BRIEFS_DIR)) fs.mkdirSync(BRIEFS_DIR, { recursive: true })

  const titleMatch = cleanMdx.match(/^title:\s*"([^"]+)"/m)
  const descMatch  = cleanMdx.match(/^description:\s*"([^"]+)"/m)
  const tagsMatch  = cleanMdx.match(/^tags:\s*(\[.*?\])/m)
  const dateMatch  = cleanMdx.match(/^date:\s*"([^"]+)"/m)

  // Build brief frontmatter with numeric edition
  const briefFrontmatter = [
    '---',
    `title: ${titleMatch?.[0].slice(6) ?? '"MCX Open Brief"'}`,
    `description: ${descMatch?.[0].slice(12) ?? '""'}`,
    `date: "${dateMatch?.[1] ?? new Date().toISOString().split('T')[0]}"`,
    `edition: ${editionNum}`,
    'published: true',
    `tags: ${tagsMatch?.[1] ?? '[]'}`,
    '---',
  ].join('\n')

  // Extract body (everything after the closing ---)
  const bodyStart = cleanMdx.indexOf('\n---\n', cleanMdx.indexOf('---') + 3)
  const body = bodyStart !== -1 ? cleanMdx.slice(bodyStart + 5).trim() : cleanMdx

  const padded   = String(editionNum).padStart(3, '0')
  const filename = `edition-${padded}.mdx`
  const filepath = path.join(BRIEFS_DIR, filename)

  if (fs.existsSync(filepath)) {
    console.warn(`Brief already exists: content/briefs/${filename}`)
    return
  }

  fs.writeFileSync(filepath, `${briefFrontmatter}\n\n${body}\n`, 'utf8')
  console.log(`Saved: content/briefs/${filename} (Edition #${editionNum})`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now()
  console.log(`\nBhaavBrief Daily Open Brief — ${new Date().toISOString()}\n`)

  // Prevent double-publish
  const state = loadState()
  const today = todayIST()
  if (state.lastBriefDate === today) {
    console.log(`Open brief already published for ${today} — skipping`)
    return
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
        // Use Kite live price if available, else derive from COMEX
        const currentPrice = kitePrices?.[key]?.ltp
          ?? (key === 'gold'   && comex.gold   ? (comex.gold.price  / 31.1035) * 10   * usdinr * 1.15 : 0)
          ?? (key === 'silver' && comex.silver  ? (comex.silver.price / 31.1035) * 1000 * usdinr * 1.10 : 0)
          ?? (key === 'crude'  && comex.crude   ? comex.crude.price * usdinr * 1.02 : 0)
          ?? (key === 'copper' && comex.copper  ? comex.copper.price * 2.20462 * usdinr * 1.05 : 0)
          ?? 0
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
    const cleanMdx = mdx
      .replace(/^```(?:mdx)?\n/m, '').replace(/\n```\s*$/m, '')
      .replace(/^slug:.*$/m, '').trim()
    const editionNum = nextEditionNumber()
    saveBrief(cleanMdx, editionNum)
    state.lastBriefDate = today
    saveState(state)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\nDone in ${elapsed}s — "${result.title}"`)
  }
}

main().catch(err => {
  console.error('Daily open brief failed:', err)
  process.exit(1)
})
