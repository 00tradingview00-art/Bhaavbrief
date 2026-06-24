#!/usr/bin/env node
/**
 * BhaavBrief — Evening MCX Close Brief
 *
 * Runs at 11:00 PM IST Monday–Friday (5:30 PM UTC) — 30 min before MCX close.
 * Publishes a day-end intelligence article: what moved, what drove it, what to
 * watch overnight in COMEX/NYMEX.
 *
 * Distinct from the morning brief:
 *   Morning = "here's what happened overnight, here are today's MCX open levels"
 *   Evening = "here's what today's session did, here's the overnight watch list"
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { fetchKiteHistorical, computeTechnicalLevels } from './lib/technicals.js'
import { isTradingHoliday, getHolidayName } from './lib/holidays.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const client       = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const ARTICLES_DIR = path.join(ROOT, 'content/articles')
const STATE_FILE   = path.join(ROOT, 'data/evening-brief-state.json')

function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }
  catch { return { lastEveningDate: null } }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

function loadInstruments() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/kite-instruments.json'), 'utf8')) }
  catch { return null }
}

function loadSnapshot() {
  try {
    const file = path.join(ROOT, 'data/market-snapshot.json')
    if (!fs.existsSync(file)) return null
    const snap = JSON.parse(fs.readFileSync(file, 'utf8'))
    const ageMin = (Date.now() - new Date(snap.generatedAt).getTime()) / 60000
    if (ageMin > 90) return null // stale — fall through to live fetches
    return snap
  } catch { return null }
}

// ── Load today's published articles (to understand the day's narrative) ────────
function loadTodayArticles() {
  const today = todayIST()
  try {
    if (!fs.existsSync(ARTICLES_DIR)) return []
    return fs.readdirSync(ARTICLES_DIR)
      .filter(f => f.startsWith(today) && (f.endsWith('.mdx') || f.endsWith('.md')))
      .map(f => {
        const raw   = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf8')
        const title = raw.match(/^title:\s*"([^"]+)"/m)?.[1] ?? f
        const desc  = raw.match(/^description:\s*"([^"]+)"/m)?.[1] ?? ''
        return `  - ${title}${desc ? ': ' + desc : ''}`
      })
  } catch { return [] }
}

// ── Fetch Kite live MCX prices at session-end ─────────────────────────────────
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
    const out = {}
    for (const key of keys) {
      const sym = instruments[key]?.symbol
      const q   = data?.[`MCX:${sym}`]
      if (!sym || !q) continue
      const ltp       = q.last_price
      const prevClose = q.ohlc?.close ?? 0
      const dayHigh   = q.ohlc?.high  ?? 0
      const dayLow    = q.ohlc?.low   ?? 0
      const dayOpen   = q.ohlc?.open  ?? 0
      if (ltp != null) {
        out[key] = { ltp, prevClose, dayHigh, dayLow, dayOpen }
        if (prevClose > 0) out[key].pct = ((ltp - prevClose) / prevClose) * 100
        if (dayOpen   > 0) out[key].intraRange = Math.abs(dayHigh - dayLow)
      }
    }
    return out
  } catch (e) { console.warn(`  Kite failed: ${e.message}`); return null }
}

// ── Fetch current COMEX prices — snapshot first, stooq fallback ──────────────
async function fetchComexCurrentSession(snapshot) {
  // Primary: read from fresh snapshot (single source of truth)
  if (snapshot) {
    const i = snapshot.instruments
    const results = {}
    if (i.COMEX_GOLD?.price   > 0) results.gold   = { label: 'COMEX Gold',    unit: '$/oz',    price: i.COMEX_GOLD.price,   pct: i.COMEX_GOLD.changePct   ?? 0 }
    if (i.COMEX_SILVER?.price > 0) results.silver  = { label: 'COMEX Silver',  unit: '$/oz',    price: i.COMEX_SILVER.price, pct: i.COMEX_SILVER.changePct ?? 0 }
    if (i.WTI?.price          > 0) results.crude   = { label: 'WTI Crude',     unit: '$/bbl',   price: i.WTI.price,           pct: i.WTI.changePct           ?? 0 }
    if (i.HENRY_HUB?.price    > 0) results.natgas  = { label: 'Henry Hub Gas', unit: '$/mmBtu', price: i.HENRY_HUB.price,    pct: i.HENRY_HUB.changePct    ?? 0 }
    if (Object.keys(results).length >= 2) {
      console.log('  COMEX: from snapshot')
      return results
    }
  }

  // Fallback: stooq CSV (no API key, but not the canonical source)
  console.log('  COMEX: stooq fallback (snapshot unavailable or stale)')
  const stooqMap = {
    gold:   { sym: 'gc.f',    label: 'COMEX Gold',   unit: '$/oz',    div: 1   },
    silver: { sym: 'si.f',    label: 'COMEX Silver',  unit: '$/oz',    div: 100 },
    crude:  { sym: 'cl.f',    label: 'WTI Crude',     unit: '$/bbl',   div: 1   },
    natgas: { sym: 'ng.f',    label: 'Henry Hub Gas', unit: '$/mmBtu', div: 1   },
  }
  const results = {}
  await Promise.all(Object.entries(stooqMap).map(async ([key, { sym, label, unit, div }]) => {
    try {
      const r = await fetch(`https://stooq.com/q/l/?s=${sym}&f=sd2t2ohlcv&h&e=csv`, { signal: AbortSignal.timeout(6000) })
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

async function fetchUSDINR(snapshot) {
  const MIN = 82, MAX = 110
  // Primary: snapshot (single source of truth)
  const snapVal = snapshot?.instruments?.USDINR?.price
  if (snapVal >= MIN && snapVal <= MAX) return snapVal
  // Fallback: external APIs
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

// ── Identify the day's top movers ─────────────────────────────────────────────
function buildDayMoverSummary(kitePrices) {
  if (!kitePrices) return 'Kite prices unavailable — MCX session data not accessible.'
  const labels = { gold: 'MCX Gold', silver: 'MCX Silver', crude: 'MCX Crude', copper: 'MCX Copper', natgas: 'MCX NatGas' }
  const units  = { gold: '/10g',     silver: '/kg',        crude: '/bbl',      copper: '/kg',        natgas: '/mmBtu'   }

  const movers = Object.entries(kitePrices)
    .filter(([, p]) => p.pct != null)
    .sort((a, b) => Math.abs(b[1].pct) - Math.abs(a[1].pct))

  return movers.map(([key, p]) => {
    const pctStr = `${p.pct >= 0 ? '+' : ''}${p.pct.toFixed(2)}%`
    const rangeStr = p.intraRange > 0 ? `, range ₹${Math.round(p.intraRange)}` : ''
    return `  ${labels[key]}: ₹${p.ltp}${units[key]}  ${pctStr}  (H: ₹${p.dayHigh} / L: ₹${p.dayLow}${rangeStr})`
  }).join('\n')
}

function buildDayNarrative(kitePrices, comex) {
  if (!kitePrices) return ''
  const g  = kitePrices.gold?.pct   ?? 0
  const s  = kitePrices.silver?.pct ?? 0
  const c  = kitePrices.crude?.pct  ?? 0
  const cu = kitePrices.copper?.pct ?? 0
  const ng = kitePrices.natgas?.pct ?? 0
  const themes = []

  if (g > 0.5 && c < -0.3)  themes.push(`Risk-off session: gold gained while crude fell — defensive positioning dominated`)
  if (g > 0.4 && s > 0.4 && cu > 0.4) themes.push(`Broad metals advance today: gold, silver, copper all up — dollar weakness or reflation bid`)
  if (c > 1.0 && ng > 0.5)  themes.push(`Energy outperformed today: crude and nat gas both gained — supply or weather driving energy`)
  if (g < -0.4 && c < -0.4) themes.push(`Broad pressure across metals and energy today — dollar strength or demand concerns`)
  if (cu > 0.8 && !themes.length) themes.push(`Copper led the complex today — China demand optimism or supply disruption signal`)
  if (ng > 2.0 && !themes.length)  themes.push(`NatGas dominated today — weather forecast or storage data moved the market sharply`)

  if (!themes.length) {
    const best  = Object.entries(kitePrices).filter(([, p]) => p.pct != null).sort((a, b) => Math.abs(b[1].pct) - Math.abs(a[1].pct))[0]
    const names = { gold: 'Gold', silver: 'Silver', crude: 'Crude', copper: 'Copper', natgas: 'NatGas' }
    if (best) themes.push(`${names[best[0]] ?? best[0]} led today's session at ${best[1].pct >= 0 ? '+' : ''}${best[1].pct.toFixed(1)}%`)
    else themes.push('Mixed session today with no clear directional theme across the complex')
  }

  // Add COMEX context — US session is live when MCX closes
  if (comex.gold?.pct != null) {
    const usDir = comex.gold.pct >= 0 ? 'extending gains' : 'fading'
    themes.push(`COMEX currently ${usDir} at ${comex.gold.pct >= 0 ? '+' : ''}${comex.gold.pct.toFixed(1)}% — US session will set the overnight tone`)
  }

  return themes.slice(0, 2).join('. ')
}

// ── Generate close brief via Claude ───────────────────────────────────────────
async function generateCloseBrief({ kitePrices, comex, usdinr, narrative, todayArticles, technicalSummary }) {
  const now     = new Date()
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  // Anchor to midnight IST on the session date (= 18:30 UTC previous UTC day).
  // This groups the article under the correct IST date AND sorts it below all
  // intraday flash articles (midnight < 9 AM in descending time sort).
  const sessionDate = new Date(todayIST() + 'T00:00:00+05:30').toISOString()

  const mcxBlock   = buildDayMoverSummary(kitePrices)
  const comexBlock = Object.values(comex).filter(c => c.price > 0)
    .map(c => `  ${c.label}: ${c.price.toFixed(2)} ${c.unit}  (${c.pct >= 0 ? '+' : ''}${c.pct.toFixed(2)}% today)`)
    .join('\n')

  const todayNarrative = todayArticles.length > 0
    ? `TODAY'S INTELLIGENCE ARTICLES (context on what drove the session):\n${todayArticles.join('\n')}`
    : ''

  const prompt = `You are BhaavBrief's senior market analyst. Write the EVENING MCX CLOSE BRIEF for ${dateStr} at ${timeStr} IST.

MCX closes at 11:30 PM IST. This brief publishes 30 minutes before close — an educational summary of the day's session data for Indian commodity traders.

SEBI COMPLIANCE (BhaavBrief is unregistered — educational content only): No buy/sell/accumulate/avoid/exit/hold/square-off directed at reader. Technical levels are observations not triggers. No predictive price targets — use "historically" or "in past episodes" framing. State data, never judge it.

DAY'S NARRATIVE:
${narrative}

MCX SESSION PERFORMANCE (today's OHLC + % change):
${mcxBlock}

CURRENT COMEX PRICES (US session live while MCX closes):
${comexBlock}

USD/INR: ₹${usdinr.toFixed(2)}

${todayNarrative}

${technicalSummary ? `KEY LEVELS (for overnight reference):\n${technicalSummary}` : ''}

WRITE A 250-320 WORD EVENING CLOSE BRIEF with these 4 sections:

1. TODAY'S SESSION RECAP (60-70 words): What happened on MCX today? Which commodity led? What drove the move — US data, OPEC news, China PMI, currency, technical breakout? Be specific about the price and % move for the top 2 movers.

2. HOW MCX CLOSED VS THE DAY'S RANGE (60-70 words): For the top 2 movers — where did they close relative to today's high/low? Did they close at the top of range (bullish structure) or retrace from highs (fading into close)? Name the specific close price, high, and low.

3. WHAT COMEX IS DOING NOW (50-60 words): US markets are mid-session as MCX closes. What are COMEX gold, crude, and copper doing right now? Is the US session confirming MCX direction or diverging? This is the overnight signal — be direct about whether it's bullish or bearish for tomorrow's MCX open.

4. OVERNIGHT WATCH LIST (50-60 words): Name 2-3 specific price levels across the complex that will matter at tomorrow's MCX open. Name any overnight data releases (US crude inventory, Fed speakers, overnight weather forecasts for NatGas) that traders should monitor.

Rules: No opinions. No buy/sell/hold calls. Specific prices and data only. End with: "Overnight watch: [the single most important data point or level to monitor before tomorrow's MCX open]"

SEO RULES:
- Title: "MCX Close [date]: [dominant theme]" — under 65 chars
- Description: under 155 chars, include today's top mover and % move

RETURN ONLY valid MDX frontmatter + article body. No code fences. No markdown code blocks. Do not wrap output in \`\`\`mdx or \`\`\`.

---
title: "[under 65 chars — MCX Close + dominant theme]"
description: "[under 155 chars — date + top mover + what happened]"
date: "${sessionDate}"
time: "${timeStr}"
edition: "evening-brief"
commodity: "multi"
tags: ["MCX Close", "Evening Brief", "Day Recap", "Overnight Watch"]
slug: "[mcx-close-DDMMMYYYY-theme]"
---

[Article body — 250-320 words, 4 sections, specific prices, no hedging]`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1800,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : null
}

function saveArticle(mdx) {
  if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true })

  const slugMatch  = mdx.match(/^slug:\s*"?([^"\n]+)"?/m)
  const titleMatch = mdx.match(/^title:\s*"([^"]+)"/m)

  const today   = new Date().toISOString().split('T')[0]
  const rawSlug = slugMatch?.[1]?.trim() ?? `mcx-close-${today}`
  const slug    = `${today}-${rawSlug}`.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80)
  const filepath = path.join(ARTICLES_DIR, `${slug}.mdx`)

  if (fs.existsSync(filepath)) {
    console.warn('Evening brief already exists:', filepath)
    return null
  }

  const cleanMdx = mdx
    .replace(/^```(?:mdx|markdown)?\s*\n?/m, '')
    .replace(/\n?```\s*$/m, '')
    .replace(/^slug:.*$/m, '')
    .trim()
  fs.writeFileSync(filepath, cleanMdx, 'utf8')
  console.log(`Saved: content/articles/${slug}.mdx`)
  console.log(`BRIEF_FILE=content/articles/${slug}.mdx`)
  return { slug, title: titleMatch?.[1] ?? 'MCX Evening Brief' }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nBhaavBrief Evening Close Brief — ${new Date().toISOString()}\n`)

  const today = todayIST()

  // Guard: only run between 9 PM and 2 AM IST (evening/close window)
  const istHour = new Date(Date.now() + 5.5 * 3600 * 1000).getUTCHours()
  if (istHour < 21 && istHour >= 2) {
    console.log(`Outside evening brief window (${istHour}:xx IST, expected 21–02) — skipping`)
    return
  }

  // Prevent double-publish: check state AND file existence
  const state = loadState()
  const existingFile = fs.existsSync(ARTICLES_DIR)
    ? fs.readdirSync(ARTICLES_DIR).find(f => f.startsWith(today) && f.includes('close'))
    : null
  if (existingFile || state.lastEveningDate === today) {
    if (!existingFile && state.lastEveningDate === today) {
      console.log(`State says published but no file found — regenerating`)
    } else {
      console.log(`Evening brief already published for ${today} — skipping`)
      return
    }
  }

  if (isTradingHoliday(today)) {
    const name = getHolidayName(today)
    console.log(`MCX holiday today (${today}${name ? ': ' + name : ''}) — skipping evening brief`)
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const instruments = loadInstruments()
  const snapshot    = loadSnapshot()
  if (snapshot) console.log(`  Snapshot: ${snapshot.generatedAtIST} (${Math.round((Date.now() - new Date(snapshot.generatedAt).getTime()) / 60000)}min old)`)
  else          console.log('  Snapshot: unavailable — using live fetches')

  console.log('Fetching MCX close prices and COMEX current session...')
  const [kitePrices, comex, usdinr] = await Promise.all([
    fetchKitePrices(instruments),
    fetchComexCurrentSession(snapshot),
    fetchUSDINR(snapshot),
  ])

  if (!usdinr) { console.error('USDINR fetch failed from both sources — aborting'); process.exit(1) }
  console.log(`  MCX data: ${kitePrices ? Object.keys(kitePrices).join(', ') : 'unavailable'}`)
  console.log(`  COMEX: ${Object.keys(comex).join(', ')}`)
  console.log(`  USD/INR: ${usdinr.toFixed(2)}`)

  // Load today's published articles for narrative context
  const todayArticles = loadTodayArticles()
  console.log(`  Today's articles: ${todayArticles.length}`)

  // Build narrative + optional technical summary for top mover
  const narrative = buildDayNarrative(kitePrices, comex)
  console.log(`  Day narrative: ${narrative}`)

  // Fetch technicals for top 2 movers to give Claude real levels
  let technicalSummary = ''
  if (instruments && kitePrices) {
    const KEY_MAP = { gold: 'gold', silver: 'silver', crude: 'crude', copper: 'copper', natgas: 'natgas' }
    const sorted  = Object.entries(kitePrices)
      .filter(([, p]) => p.pct != null)
      .sort((a, b) => Math.abs(b[1].pct) - Math.abs(a[1].pct))
      .slice(0, 2)

    const blocks = await Promise.all(sorted.map(async ([key, p]) => {
      const token = instruments[KEY_MAP[key]]?.token
      if (!token) return null
      try {
        const candles = await fetchKiteHistorical(token, 22)
        const levels  = computeTechnicalLevels(candles, p.ltp)
        if (!levels) return null
        const names = { gold: 'Gold', silver: 'Silver', crude: 'Crude', copper: 'Copper', natgas: 'NatGas' }
        return `${names[key]}: prev close ₹${levels.prevClose}, 5d range ₹${levels.weekLow}–₹${levels.weekHigh}, 20d SMA ₹${Math.round(levels.sma20 ?? 0)}, S1 ₹${levels.support1}, R1 ₹${levels.resistance1}`
      } catch { return null }
    }))
    technicalSummary = blocks.filter(Boolean).join('\n')
  }

  console.log('\nGenerating evening close brief...')
  const mdx = await generateCloseBrief({ kitePrices, comex, usdinr, narrative, todayArticles, technicalSummary })

  if (!mdx) throw new Error('Claude returned empty response')

  const result = saveArticle(mdx)
  if (!result) {
    console.log('Evening brief already saved — nothing to do')
    return
  }

  // Mark as published
  saveState({ lastEveningDate: today })
  console.log(`\nEvening brief published: "${result.title}"`)
  console.log(`Total time: ${((Date.now() - Date.now()) / 1000).toFixed(1)}s`)
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
