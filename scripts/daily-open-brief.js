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
const THESIS_FILE  = path.join(ROOT, 'data/thesis-tracker.json')

// ── Thesis helpers ────────────────────────────────────────────────────────────
function loadThesis() {
  try { return JSON.parse(fs.readFileSync(THESIS_FILE, 'utf8')) }
  catch { return { current: null, yesterday: null, history: [] } }
}

function saveThesis(data) {
  fs.writeFileSync(THESIS_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function yesterdayIST() {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Step A — resolve yesterday's thesis against cached MCX close
function resolveYesterdayThesis(thesisData) {
  const current = thesisData.current
  if (!current) return thesisData

  const yesterdayDate = yesterdayIST()
  if (current.date !== yesterdayDate) {
    // current is older than yesterday — just archive it without resolution
    const updated = { ...thesisData, current: null }
    if (!updated.history) updated.history = []
    return updated
  }

  // Load yesterday's MCX close from cache
  let actualClose = 0
  try {
    const cache = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mcx-last-prices.json'), 'utf8'))
    const key = current.commodity.toLowerCase().replace('mcx ', '')
    actualClose = cache[key] ?? 0
  } catch {}

  if (!actualClose) {
    console.log('  Thesis: no MCX close data for resolution — carrying forward')
    return thesisData
  }

  const target = current.targetLevel
  const dir    = current.direction
  let outcome  = 'WRONG'
  let outcomeNote = ''

  if (dir === 'bearish') {
    outcome = actualClose < target ? 'CORRECT' : 'WRONG'
    outcomeNote = outcome === 'CORRECT'
      ? `Closed ₹${actualClose.toLocaleString('en-IN')} — fell below ₹${target.toLocaleString('en-IN')}.`
      : `Closed ₹${actualClose.toLocaleString('en-IN')} — held above ₹${target.toLocaleString('en-IN')}.`
  } else {
    outcome = actualClose > target ? 'CORRECT' : 'WRONG'
    outcomeNote = outcome === 'CORRECT'
      ? `Closed ₹${actualClose.toLocaleString('en-IN')} — held above ₹${target.toLocaleString('en-IN')}.`
      : `Closed ₹${actualClose.toLocaleString('en-IN')} — fell below ₹${target.toLocaleString('en-IN')}.`
  }

  const resolved = { ...current, outcome, actualClose, outcomeNote }
  const updated  = {
    current:   null,
    yesterday: resolved,
    history:   [resolved, ...(thesisData.history ?? [])].slice(0, 30),
  }

  console.log(`  Thesis resolved: ${outcome} — "${current.thesis.slice(0, 60)}…"`)
  return updated
}

// Step B — extract today's thesis from generated brief body
async function extractThesis(briefBody, editionNumber) {
  const today = todayIST()
  const prompt = `You are reading a BhaavBrief market brief. Extract one testable daily thesis from the "What Kills It" and "Edge of the Day" / "TOMORROW:" sections.

Return ONLY valid JSON (no markdown, no code fences):
{
  "thesis": "One bold sentence — a directional claim resolvable by MCX close today",
  "commodity": "MCX Crude" or "MCX Gold" or "MCX Silver" or "MCX Copper" or "MCX NatGas",
  "direction": "bullish" or "bearish",
  "targetLevel": <number — the key ₹ level to watch>,
  "reasoning": "One sentence: why this level matters today"
}

Rules:
- thesis must name a specific ₹ level and direction (e.g. "Crude will not hold ₹9,000 by MCX close")
- targetLevel is the number the thesis lives or dies by
- SEBI: frame as market hypothesis, not a recommendation

BRIEF:
${briefBody.slice(0, 3000)}`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    if (!parsed.thesis || !parsed.commodity || !parsed.direction || !parsed.targetLevel) return null
    return { date: today, editionRef: editionNumber, ...parsed }
  } catch (e) {
    console.warn('  Thesis extraction failed:', e.message)
    return null
  }
}

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
async function generateOpenBrief({ comex, kitePrices, usdinr, technicalBlocks, narrative, snapshot }) {
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

  const snapshotBlock = snapshot
    ? `\nAUTHORITATIVE MARKET SNAPSHOT (JSON) — use ONLY these numbers, never recall prices from memory:\n${JSON.stringify(snapshot.instruments, null, 2)}\nDerived: ${JSON.stringify(snapshot.derived)}\nSnapshot as of: ${snapshot.generatedAtIST}\n`
    : ''

  const prompt = `You are BhaavBrief's senior market analyst. Write the MCX MARKET OPEN BRIEF for ${dateStr}.

SEBI COMPLIANCE: BhaavBrief is unregistered — educational content only. No buy/sell/accumulate/avoid/exit/enter calls directed at the reader. Use "historically" or "in past episodes" framing when referencing price behaviour. State data, never judge it.
${snapshotBlock}
DATA — use these EXACT numbers, do not round or invent:

OVERNIGHT COMEX/NYMEX:
${comexLines}

USD/INR: ₹${usdinr.toFixed(2)}

MCX OPEN (${timeStr} IST):
${mcxLines}
${techSection}

WRITE EXACTLY THESE 5 SECTIONS with these exact headings:

## [Dominant Theme Name] — [DIRECTION]
Name this section after the dominant overnight theme (e.g. "Crude Surge — METALS UNDER PRESSURE" or "Risk-Off — GOLD LEADS"). 3–4 sentences of flowing narrative prose.

HOOK SENTENCE MANDATORY — the FIRST sentence must create tension or stakes, NOT report a price. Choose one type:
  STAKES: "₹2,300 crore of HPCL's crude import bill got repriced overnight."
  DRAMA: "Oil crossed ₹9,000 at the open. The last time that happened, petrol prices followed within 10 days."
  PUZZLE: "Crude surged 4% and gold fell 2% on the same night — that divergence tells you something."
  CONTRARIAN: "The knee-jerk read is to buy gold. Here is what the overnight positioning data says about that instinct."
NEVER open with "[Commodity] [opened/traded/moved] at ₹X, [up/down] [Y]%." — that is a data report, not a hook.

After the hook: explain what happened overnight on COMEX/NYMEX, the single dominant story, and how it connects to MCX opening. Use exact prices. No bullet points.

## The Market Is Saying
Cover all 5 MCX commodities in flowing prose — not a table, not bullet points. For each: exact MCX open price, % change from previous close, key support and resistance from the OHLC data above. Weave them together as a connected narrative. End this section with how USD/INR at ₹${usdinr.toFixed(2)} is amplifying or dampening the COMEX move in rupee terms.

## Historical Context
Name 1–2 comparable past episodes (specific month/year) where a similar macro setup played out. Describe the CHARACTER and DIRECTION of the MCX price response — not a specific percentage unless you are certain of the exact figure from training data. If you do not have the exact percentage, write "prices moved sharply higher/lower" rather than inventing a number. Use "historically" framing. No predictions.

## What Kills It
One paragraph. What is the single specific event or data point that would immediately reverse today's dominant thesis? Be precise — name a level, a data release, a geopolitical event. Not vague. No hedging.

## Who Is Affected
Write four labelled subsections exactly as shown:

**BUSINESSES:**
Translate today's price move into ₹ crore impact on ONE named company. Formula: daily volume × price change = ₹ crore impact. Name IndiGo/BPCL/HPCL for crude, Titan/Kalyan for gold, Hindalco/Sterlite for copper. Example: "IndiGo's daily ATF procurement cost changes by an estimated ₹X crore at ₹9,022/bbl crude — sustained above this level through the next fortnightly revision, a ticket-price increase becomes probable." Never write "businesses face higher costs."

**INVESTORS:**
One specific MCX contract, its exact open price, and what the directional signal from today's open means for positioning. Reference a specific support or resistance level.

**CONSUMERS:**
One specific product (petrol, cooking gas, gold jewellery, etc.) and whether today's open is likely to translate into a price change at the retail/consumer level. Explain the transmission mechanism briefly.

**EDGE OF THE DAY:**
The single most precise monitoring point for today — a specific price level on a specific contract, or a specific data release time. One sentence.

**TOMORROW:**
One sentence. Name the next data release or market event within 24 hours, the time IST, and the two conditions and their consequences. This creates a reason to return tomorrow.
Example: "Tomorrow: EIA crude inventory at 8:00 PM IST — a draw above 3 million barrels confirms the supply-tight thesis and takes WTI toward $97; a surprise build above 2 million barrels unwinds the Iran premium."

WRITING RULES:
- Flowing prose throughout — no numbered lists, no bullet points, no tables
- No parenthetical definitions for standard terms
- No filler phrases: "it is worth noting", "market participants should be aware", "it is important to"
- Precise numbers always — never "approximately" when you have the exact figure
- Tone: Mint newspaper, not Bloomberg Terminal. Accessible but authoritative
- THE TWIST: In the Historical Context section, include one sentence naming the contrarian view — what the other side of this trade argues. Frame as historical observation. Example: "The contrary read, based on past OPEC spare-capacity episodes, is that sustained moves above $95 historically trigger member quota cheating within 6 weeks, capping the rally."
- If referencing a previous edition: [Edition 32](/briefs/edition-032)
- Total length: 420–520 words

SEO:
- Title: Write a headline, not a dateline. Lead with the dominant commodity move and the reason. Include % move if ≥1%. Under 70 chars. Examples of good format:
  - "MCX Crude Crashes 4% as OPEC Signals Supply Surge — Gold Holds"
  - "Why MCX Gold Is Rising Despite a Strong Dollar — Silver Diverges"
  - "MCX Crude and Silver Both Fall — But for Completely Different Reasons"
  Do NOT start with "MCX Open" or "MCX Close". Do NOT include the date in the title — it is already in the URL and frontmatter.
- Description: under 155 chars — include today's date and the 2 biggest moves with exact prices

RETURN ONLY valid MDX frontmatter + article body. No code fences. No markdown code blocks.

---
title: "[headline — lead with dominant move + reason, no date, no 'MCX Open']"
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

// ── Post-generation consistency check ────────────────────────────────────────
// Compares the generated text against the raw data to catch date/price contradictions.
// Non-fatal: logs warnings but never blocks the pipeline.
async function checkConsistency(mdx, { comex, kitePrices, usdinr }) {
  const body = mdx.replace(/^---[\s\S]*?---\n*/m, '').trim()

  const today = new Date(Date.now() + 5.5 * 3600000)
  const monthName = today.toLocaleString('en-US', { month: 'long' })
  const dataLines = [
    `Today: ${today.toISOString().slice(0, 10)} (${monthName} ${today.getUTCFullYear()})`,
    `USD/INR: ₹${usdinr.toFixed(2)}`,
  ]
  for (const [, c] of Object.entries(comex)) {
    const sign = c.pct >= 0 ? '+' : ''
    dataLines.push(`${c.label}: ${sign}${c.pct.toFixed(2)}% overnight${c.close ? `, close $${c.close}` : ''}`)
  }
  if (kitePrices) {
    for (const [key, p] of Object.entries(kitePrices)) {
      if (p?.ltp) dataLines.push(`MCX ${key}: ₹${p.ltp}`)
    }
  }

  const prompt = `You are a fact-checker for a financial newsletter. Compare the BRIEF TEXT against the RAW DATA (ground truth).

RAW DATA:
${dataLines.join('\n')}

BRIEF TEXT (first 2000 chars):
${body.slice(0, 2000)}

List only clear contradictions where the brief states something that conflicts with the raw data above — e.g. wrong direction, wrong month/year, wrong price magnitude. Do NOT flag historical claims or predictions.

Return ONLY a JSON array of short contradiction strings. If none, return [].`

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = resp.content[0]?.type === 'text' ? resp.content[0].text.trim() : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    const issues = match ? JSON.parse(match[0]) : []
    if (issues.length > 0) {
      console.warn('\n⚠️  CONSISTENCY WARNINGS (review before newsletter):')
      issues.forEach((issue, i) => console.warn(`  ${i + 1}. ${issue}`))
      console.warn('')
    } else {
      console.log('  Consistency check: clean')
    }
  } catch (e) {
    console.warn('  Consistency check skipped:', e.message)
  }
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
  return { slug: `edition-${editionStr}`, title, editionNumber: nextEdition }
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

  // Step A — resolve yesterday's thesis before anything else
  const thesisData = loadThesis()
  if (thesisData.current && thesisData.current.date !== today) {
    const resolved = resolveYesterdayThesis(thesisData)
    saveThesis(resolved)
    console.log('  Thesis tracker updated — yesterday resolved')
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

  const rawTechnicals = {}
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
        rawTechnicals[key] = { currentPrice, ...levels }
        return formatTechnicalBlock(MCX_LABELS[key], MCX_UNITS[key], currentPrice, levels)
      })
    )
    technicalBlocks.push(...histResults.filter(Boolean))
  }
  // Write OHLC-derived levels so validate-brief.mjs can accept them as legitimate numbers
  try {
    fs.writeFileSync(path.join(ROOT, 'data/brief-technicals.json'), JSON.stringify(rawTechnicals, null, 2))
  } catch (e) { console.warn('  Could not save brief-technicals.json:', e.message) }

  console.log(`  Technical blocks: ${technicalBlocks.length} commodities`)

  const narrative = buildOpeningNarrative(comex)
  console.log(`  Narrative: ${narrative}`)

  // Load snapshot if available — the single source of truth written by fetch-snapshot.mjs
  let snapshot = null
  try {
    const snapshotFile = path.join(ROOT, 'data/market-snapshot.json')
    if (fs.existsSync(snapshotFile)) {
      snapshot = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'))
      const ageMin = (Date.now() - new Date(snapshot.generatedAt).getTime()) / 60000
      console.log(`  Snapshot: loaded (${ageMin.toFixed(0)}m old, ${snapshot.source})`)
    }
  } catch (e) { console.warn('  Snapshot load failed:', e.message) }

  // Prefer snapshot USDINR (from Kite/authoritative source) over external API so the brief
  // generator and validator both use the same value — prevents Haiku flagging a 0.1% diff
  // between Frankfurter and Kite as an "internal contradiction" in the brief.
  const snapUsdinr = snapshot?.instruments?.USDINR?.price
  const effectiveUsdinr = (snapUsdinr > 80 && snapUsdinr < 100) ? snapUsdinr : usdinr
  if (effectiveUsdinr !== usdinr) console.log(`  USD/INR: overriding ₹${usdinr.toFixed(2)} → ₹${effectiveUsdinr.toFixed(2)} (snapshot)`)

  // Include effective USD/INR in comex sidecar so the validator accepts it in Layer 1
  try {
    const comexForValidator = {}
    for (const [key, c] of Object.entries(comex)) {
      if (c?.price > 0) comexForValidator[key] = { price: c.price, pct: c.pct, label: c.label, unit: c.unit }
    }
    comexForValidator.usdinr = { price: effectiveUsdinr, label: 'USD/INR', unit: 'INR' }
    fs.writeFileSync(path.join(ROOT, 'data/brief-comex.json'), JSON.stringify(comexForValidator, null, 2))
  } catch (e) { console.warn('  Could not update brief-comex.json:', e.message) }

  console.log('\nGenerating open brief via Claude Sonnet...')
  const mdx = await generateOpenBrief({ comex, kitePrices, usdinr: effectiveUsdinr, technicalBlocks, narrative, snapshot })

  if (!mdx || !mdx.includes('---') || !mdx.includes('title:')) {
    console.error('Invalid MDX generated — aborting')
    return
  }

  console.log('Running consistency check...')
  await checkConsistency(mdx, { comex, kitePrices, usdinr })

  const result = saveArticle(mdx)
  if (result) {
    state.lastBriefDate = today
    saveState(state)

    // Step B — extract today's thesis from the saved brief
    console.log('\nExtracting daily thesis...')
    const thesis = await extractThesis(mdx, result.editionNumber ?? 0)
    if (thesis) {
      const fresh = loadThesis()
      fresh.current = thesis
      saveThesis(fresh)
      console.log(`  Thesis set: ${thesis.direction} ${thesis.commodity} @ ₹${thesis.targetLevel.toLocaleString('en-IN')}`)
    } else {
      console.log('  Thesis: no extractable thesis today')
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\nDone in ${elapsed}s — "${result.title}"`)
    console.log(`BRIEF_FILE=content/briefs/${result.slug}.mdx`)

    // Refresh market snapshot immediately after brief — ensures live prices are
    // deployed alongside the brief rather than waiting for the next cron run
    console.log('\nRefreshing market snapshot...')
    try {
      const { execFileSync } = await import('child_process')
      execFileSync('node', ['scripts/fetch-snapshot.mjs'], {
        cwd: ROOT, stdio: 'inherit', timeout: 30_000,
      })
    } catch (e) {
      console.warn('  Snapshot refresh failed (non-fatal):', e.message)
    }
  }
}

main().catch(err => {
  console.error('Daily open brief failed:', err)
  process.exit(1)
})
