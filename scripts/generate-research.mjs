#!/usr/bin/env node
/**
 * scripts/generate-research.mjs — Pro Research article draft generator
 *
 * Invoked programmatically by scripts/intelligence-engine.js's
 * processResearchQueue() after a queued macro event (FOMC, Jackson Hole,
 * OPEC+, RBI MPC, EIA weekly), or manually for testing. Produces an MDX
 * draft in content/research/ with published: false; the caller runs it
 * through scripts/validate-research.mjs and flips published: true on a
 * clean pass — zero human review, unlike the daily brief's Telegram-tap
 * G-12 gate (deliberate choice, see the automation plan).
 *
 * Usage:
 *   node scripts/generate-research.mjs --event fomc_rate_decision \
 *     --context "Fed held rates at 5.25-5.50%. Dot plot shows 1 cut in 2026."
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY  — for Claude API calls
 *   NEXT_PUBLIC_BASE_URL (or default https://bhaavbrief.in) — for options API
 *
 * Dry run (skip file write):
 *   node scripts/generate-research.mjs --event jackson_hole --context "..." --dry-run
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const getArg = (flag) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : null
}
const hasFlag = (flag) => args.includes(flag)

const eventId  = getArg('--event')
const context  = getArg('--context')
const dryRun   = hasFlag('--dry-run')

if (!eventId || !context) {
  console.error('Usage: node scripts/generate-research.mjs --event <event_id> --context "<what happened>" [--dry-run]')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Load event-map
// ---------------------------------------------------------------------------
const eventMapRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/event-map.json'), 'utf8'))
const event = eventMapRaw.events.find(e => e.id === eventId)
if (!event) {
  console.error(`Event "${eventId}" not found in data/event-map.json`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Load market snapshot for prices
// ---------------------------------------------------------------------------
let snapshot = {}
try {
  snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/market-snapshot.json'), 'utf8'))
} catch {
  console.warn('Warning: could not load data/market-snapshot.json — prices will be omitted from prompt')
}

// ---------------------------------------------------------------------------
// Load claims ledger (D-07 discipline, same as the daily brief) — the model
// may only cite a historical "X% historically" statistic if it's backed by
// one of these. For FOMC/Jackson Hole/RBI-MPC-class events this list will
// come back empty (buildClaimsLedger.mjs deliberately never computes those —
// see its header comment) — that's correct, not a bug, and the prompt below
// tells the model explicitly not to invent one when the list is empty.
// scripts/validate-research.mjs enforces this after generation either way.
let claims = []
try {
  const allClaims = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/claims.json'), 'utf8')).claims ?? []
  claims = allClaims.filter(c => event.affected_contracts.some(commodity => c.claim_id.endsWith(`__${commodity}`)))
} catch {
  console.warn('Warning: could not load data/claims.json — no verified claims will be available')
}

// ---------------------------------------------------------------------------
// Fetch options chain data for affected commodities
// ---------------------------------------------------------------------------
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://bhaavbrief.in'

async function fetchChainSummary(commodity) {
  const instrumentMap = { gold: 'GOLD', silver: 'SILVER', crude: 'CRUDEOIL', copper: 'COPPER', natgas: 'NATURALGAS' }
  const instrument = instrumentMap[commodity]
  if (!instrument) return null
  try {
    const resp = await fetch(`${BASE_URL}/api/options?instrument=${instrument}`)
    if (!resp.ok) return null
    const data = await resp.json()
    return {
      instrument,
      futurePrice: data.futurePrice,
      pcr:         data.pcr,
      ivix:        data.ivix,
      maxPain:     data.maxPain,
    }
  } catch {
    return null
  }
}

const chainSummaries = {}
for (const commodity of event.affected_contracts) {
  const s = await fetchChainSummary(commodity)
  if (s) chainSummaries[commodity] = s
}

// ---------------------------------------------------------------------------
// Build prompt
// ---------------------------------------------------------------------------
const priceLines = event.affected_contracts
  .map(c => {
    const priceKey = c === 'crude' ? 'crudeoil' : c
    const price = snapshot?.prices?.[priceKey]?.mcx ?? snapshot?.prices?.[c]?.mcx ?? null
    const chain = chainSummaries[c]
    const parts = []
    if (price) parts.push(`MCX price ₹${price}`)
    if (chain) {
      if (chain.pcr)  parts.push(`PCR ${chain.pcr.toFixed(2)}`)
      if (chain.ivix) parts.push(`IVIX ${chain.ivix.toFixed(1)}`)
      if (chain.maxPain) parts.push(`Max Pain ₹${chain.maxPain.toLocaleString()}`)
    }
    return `${c.charAt(0).toUpperCase() + c.slice(1)}: ${parts.join(', ') || '(no live data)'}`
  })
  .join('\n')

const todayIST = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
const isoDate  = new Date().toISOString().slice(0, 10)

const prompt = `You are Prabal, a veteran MCX commodity trader writing institutional-quality research for BhaavBrief Pro subscribers — Indian MCX traders who care about specific price levels, options chain signals, and actionable implications, not generic macro commentary.

## Event
Name: ${event.name}
What happened: ${context}
Educational context: ${event.description_educational}

## Live MCX Data (as of ${todayIST} IST)
${priceLines}

## Verified historical statistics
${claims.length > 0
  ? claims.map(c => `- ${c.statement_template.replace(/\{(\w+)\}/g, (_, k) => c.values?.[k] ?? '?')}`).join('\n')
  : '(none available for this event — do NOT state any specific historical average-move percentage or frequency claim for it; describe the event and its live implications without inventing a "historically moves X%" statistic)'}
You may only cite a historical percentage-move or frequency statistic if it appears above, worded consistently with it. Never invent one.

## Your task
Write a Pro Research article in MDX format with the following structure. Be specific — name actual price levels, strikes, IV readings. Avoid vague statements like "gold may move higher". Indian readers want: "MCX Gold front-month at ₹87,200 — max pain at ₹86,000, PCR 1.14 suggests put writers are absorbing downside."

### Required sections:

1. **What happened** (2-3 sentences, factual summary — no opinion)
2. **MCX-specific implications** (1 paragraph per affected commodity — current price, IV rank context, key technical/options level)
3. **Options positioning suggestion** (one specific strategy per relevant commodity — e.g. "Sell MCX Gold ₹87,500 CE (current IV: X%) if PCR stays above 1.0 into next week's expiry")
4. **Key risks to the thesis** (3 bullet points — what would invalidate the view)
5. **Watch levels** (price levels that would trigger a reassessment — e.g. "Gold above ₹88,500 forces a rethink on rate-cut narrative")

### Tone
- Professional, direct, no filler words
- No disclaimers or "this is not financial advice" language — that's in the site footer
- Assume the reader knows what MCX is, what PCR means, what a covered call is
- Length: 600-900 words in the body sections

### Output format
Return ONLY the MDX body (no frontmatter — that will be added by this script). Start directly with the first section heading.
`

// ---------------------------------------------------------------------------
// Call Claude API
// ---------------------------------------------------------------------------
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY env var is required')
  process.exit(1)
}

console.log(`Generating research article for event: ${eventId}…`)

const apiResp = await fetch('https://api.anthropic.com/v1/messages', {
  method:  'POST',
  headers: {
    'Content-Type':      'application/json',
    'x-api-key':         ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model:      'claude-opus-5',
    max_tokens: 4096,
    messages:   [{ role: 'user', content: prompt }],
  }),
})

if (!apiResp.ok) {
  const err = await apiResp.text()
  console.error('Claude API error:', err)
  process.exit(1)
}

const apiData = await apiResp.json()
// claude-opus-5 reasons by default and can return a leading "thinking" block
// before its "text" block — content[0] is not reliably the text, so find the
// first block that actually is one. Assuming content[0].text (the prior
// behavior) silently read undefined on any response that included thinking,
// making this script exit 1 with "Empty response" on real runs — the actual
// reason the auto-publish pipeline has never produced output in production.
const textBlock = apiData.content?.find(b => b.type === 'text')
const bodyMdx   = textBlock?.text ?? ''

if (apiData.stop_reason === 'max_tokens') {
  console.warn('Warning: Claude response was truncated at max_tokens — article may be incomplete.')
}

if (process.env.DEBUG_RESEARCH) console.error('DEBUG apiData:', JSON.stringify(apiData, null, 2))

if (!bodyMdx.trim()) {
  console.error('Empty response from Claude API')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Build frontmatter + MDX file
// ---------------------------------------------------------------------------
const slugDate  = isoDate
const eventSlug = eventId.replace(/_/g, '-')
const slug      = `${slugDate}-${eventSlug}`
const filename  = `${slug}.mdx`
const outDir    = path.join(ROOT, 'content/research')
const outPath   = path.join(outDir, filename)

const commoditiesYaml = JSON.stringify(event.affected_contracts)
const tagsYaml = JSON.stringify([eventId.replace(/_/g, '-'), ...event.affected_contracts, 'macro-event'])

const titleLine  = `${event.name} — MCX Commodity Implications`
const descLine   = `MCX-specific analysis of the ${event.name}: implications for ${event.affected_contracts.join(', ')} with live options chain data and actionable strategy notes.`

const frontmatter = `---
title: "${titleLine}"
description: "${descLine}"
date: "${isoDate}"
event_id: "${eventId}"
commodity: "${event.affected_contracts[0] ?? 'macro'}"
commodities: ${commoditiesYaml}
premium: true
published: false
edition: "macro-research"
tags: ${tagsYaml}
---

`

const fullMdx = frontmatter + bodyMdx.trim() + '\n'

if (dryRun) {
  console.log('\n--- DRY RUN: would write to', outPath, '---\n')
  console.log(fullMdx.slice(0, 800), '\n…')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Write file
// ---------------------------------------------------------------------------
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

if (fs.existsSync(outPath)) {
  console.error(`File already exists: ${outPath} — delete it first or use --dry-run to preview`)
  process.exit(1)
}

fs.writeFileSync(outPath, fullMdx, 'utf8')
console.log(`\nDraft written: ${outPath}`)
console.log(`\nNext steps:`)
console.log(`  1. Review and edit: ${outPath}`)
console.log(`  2. Set published: true in the frontmatter when ready`)
console.log(`  3. git add content/research/${filename} && git commit -m "feat(research): ${titleLine}"`)
