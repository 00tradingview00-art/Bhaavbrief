#!/usr/bin/env node
/**
 * scripts/generate-campaign-reel.mjs
 *
 * Dispatches the 30-day reel campaign (data/reel-campaign-queue.json,
 * originally the "Reels Master Reference" doc's Section G) — one entry per
 * run, advancing data/reel-campaign-state.json's nextDay pointer. Fetches
 * whatever live metric that day's plan calls for (PCR, IV Rank, Max Pain, OI,
 * basis, a calendar event) and hands off to generate-brief-reel.mjs's
 * existing news mode (TOPIC/CONTEXT/LEARN_URL env vars) — same handoff
 * pattern scripts/generate-learn-reel.mjs already uses, reusing its render/
 * voiceover/music/ffmpeg pipeline unchanged.
 *
 * Runs ADDITIONALLY to the existing daily brief-reel and learn-reel — not a
 * replacement. This account already posts multiple reel types per day
 * (brief, flash, learn); this is one more, on its own schedule.
 *
 * Usage:
 *   node scripts/generate-campaign-reel.mjs
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'
import {
  fetchOptionsSnapshot, fetchIvPercentile, fetchNextEvent, getBasisSnapshot, topOiStrikes,
} from './lib/reelCampaignData.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')
const SITE      = process.env.CAMPAIGN_SITE_URL ?? 'https://bhaavbrief.in'
const ALL_INSTRUMENTS = ['GOLD', 'SILVER', 'CRUDEOIL', 'COPPER', 'NATURALGAS']
const INSTRUMENT_LABEL = {
  GOLD: 'MCX Gold', SILVER: 'MCX Silver', CRUDEOIL: 'MCX Crude',
  COPPER: 'MCX Copper', NATURALGAS: 'MCX NatGas',
}

// ── Load .env.local ───────────────────────────────────────────────────────────
const envFile = join(ROOT, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

// ── Data ──────────────────────────────────────────────────────────────────────
const QUEUE_FILE = join(ROOT, 'data/reel-campaign-queue.json')
const STATE_FILE = join(ROOT, 'data/reel-campaign-state.json')

function readQueue() {
  return JSON.parse(readFileSync(QUEUE_FILE, 'utf8')).days
}

function readState() {
  if (!existsSync(STATE_FILE)) return { nextDay: 1, log: [] }
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')) }
  catch { return { nextDay: 1, log: [] } }
}

function writeState(state) {
  writeFileSync(STATE_FILE, JSON.stringify({
    _note: 'Rotation state for the 30-day reel campaign — see data/reel-campaign-queue.json for the plan. nextDay advances by 1 after each successful generation.',
    ...state,
  }, null, 2), 'utf8')
}

// ── Live-data → CONTEXT facts, per dataNeed ────────────────────────────────────
// Each returns { facts: string[], tags: string[] } | null. null means "no live
// data available" — the dispatcher then tells Haiku explicitly not to invent
// a number, per the campaign doc's own fallback rule, rather than silently
// generating a generic-looking reel that quietly drops the day's premise.
async function resolveLiveContext(entry) {
  const instrument = entry.instrument
  const tags = instrument ? [INSTRUMENT_LABEL[instrument]] : []

  switch (entry.dataNeed) {
    case 'pcr': {
      const snap = await fetchOptionsSnapshot(SITE, instrument)
      if (!snap) return null
      return {
        tags,
        facts: [
          `${INSTRUMENT_LABEL[instrument]} put-call ratio (PCR) is currently ${snap.pcr} (as of ${new Date().toISOString()}).`,
          `Market convention: a PCR above 1.2 is read as a contrarian bullish signal in options positioning; below 0.7 is read as contrarian bearish. This is a positioning statistic, not a standalone trade signal.`,
        ],
      }
    }
    case 'maxpain': {
      const snap = await fetchOptionsSnapshot(SITE, instrument)
      if (!snap || snap.maxPain == null) return null
      return {
        tags,
        facts: [
          `${INSTRUMENT_LABEL[instrument]}'s Max Pain strike (the price at which option sellers as a group lose the least) is currently ₹${snap.maxPain}.`,
          snap.futurePrice ? `Current futures price is ₹${snap.futurePrice}.` : null,
        ].filter(Boolean),
      }
    }
    case 'oi': {
      const snap = await fetchOptionsSnapshot(SITE, instrument)
      if (!snap || !snap.chain.length) return null
      const top = topOiStrikes(snap.chain, 5)
      return {
        tags,
        facts: [
          `${INSTRUMENT_LABEL[instrument]}'s top-5 open-interest strikes right now: ${top.map(s => `₹${s.strike} (OI ${s.oi})`).join(', ')}.`,
          `Heavy OI concentration at a strike is read as a support/resistance zone for options positioning — not a guaranteed price level.`,
        ],
      }
    }
    case 'iv-rank': {
      const iv = await fetchIvPercentile(SITE, instrument)
      if (!iv) return null
      return {
        tags,
        facts: [
          `${INSTRUMENT_LABEL[instrument]}'s current implied volatility index (IVIX) ranks at the ${iv.rank}th percentile of its own history (${iv.historyPoints} sessions of data) — ${iv.rank >= 50 ? 'options are relatively expensive' : 'options are relatively cheap'} right now by this measure.`,
        ],
      }
    }
    case 'calendar': {
      const event = await fetchNextEvent(SITE, ALL_INSTRUMENTS)
      if (!event) return null
      const when = new Date(event.next_release_utc)
      return {
        tags: [],
        facts: [
          `Next high-impact calendar event: "${event.name}", scheduled ${when.toISOString().slice(0, 10)}, impact tier: ${event.impact_tier}.`,
          event.description_educational ? event.description_educational : null,
        ].filter(Boolean),
      }
    }
    case 'basis': {
      const basis = getBasisSnapshot(ROOT)
      if (!basis) return null
      const parts = []
      if (basis.goldSpreadPct != null)   parts.push(`Gold: ${basis.goldSpreadPct}%`)
      if (basis.silverSpreadPct != null) parts.push(`Silver: ${basis.silverSpreadPct}%`)
      if (basis.crudeSpreadPct != null)  parts.push(`Crude: ${basis.crudeSpreadPct}%`)
      if (!parts.length) return null
      return {
        tags: [],
        facts: [
          `MCX-vs-import-parity basis, as of ${basis.asOf}: ${parts.join(', ')} (% premium of MCX price over the COMEX/WTI-converted import-parity price).`,
        ],
      }
    }
    case 'none':
    default:
      return { tags, facts: [] }
  }
}

function buildContext(entry, liveContext) {
  let context = `Content pillar: ${entry.pillar}. Feature this reel showcases: ${entry.feature}.\n`
  context += `Hook direction to build from: ${entry.hookDirection}\n`

  if (liveContext && liveContext.facts.length) {
    context += `\nFacts (use ONLY these numbers, do not invent or add any figure not listed here):\n`
    context += liveContext.facts.map(f => `- ${f}`).join('\n')
  } else if (entry.dataNeed !== 'none') {
    context += `\nNo live data is available for this feature right now — do NOT invent, estimate, or guess a number. Write this reel as a feature explainer (what the tool shows and why it matters) with no specific live reading.`
  }
  context += `\nEnd with an invitation matching this CTA: "${entry.ctaText}".`
  return context
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  BhaavBrief — 30-Day Campaign Reel')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const queue = readQueue()
const state = readState()

if (state.nextDay > queue.length) {
  console.log(`  🏁  Campaign complete (${queue.length}/${queue.length} days generated). Nothing to do.`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  process.exit(0)
}

const entry = queue.find(d => d.day === state.nextDay)
if (!entry) throw new Error(`No queue entry for day ${state.nextDay} — data/reel-campaign-queue.json may be malformed`)

console.log(`📅  Day ${entry.day}/${queue.length} — ${entry.pillar}`)
console.log(`    Feature: ${entry.feature}`)
console.log(`    Hook: ${entry.hookDirection}`)

console.log('\n📡  Resolving live data...')
let liveContext = null
try {
  liveContext = await resolveLiveContext(entry)
} catch (e) {
  console.warn(`  ⚠️  Live data fetch failed (${e.message}) — falling back to no-live-number framing`)
}
if (entry.dataNeed !== 'none') {
  console.log(liveContext?.facts.length ? `  ✅  ${liveContext.facts.length} fact(s) resolved` : '  ⚠️  No live data available — writing without a live number')
}

const context = buildContext(entry, liveContext)
const tags = liveContext?.tags?.length ? liveContext.tags.join(',') : ''

const outputPathFile = join(ROOT, '.reel-output-path.txt')
if (existsSync(outputPathFile)) unlinkSync(outputPathFile)

console.log('\n🎬  Handing off to generate-brief-reel.mjs (news mode)...\n')
execFileSync('node', ['scripts/generate-brief-reel.mjs'], {
  cwd: ROOT,
  env: {
    ...process.env,
    TOPIC:     entry.feature,
    CONTEXT:   context,
    LEARN_URL: entry.ctaTarget,
    ...(tags ? { TAGS: tags } : {}),
  },
  stdio: 'inherit',
})

if (!existsSync(outputPathFile)) {
  throw new Error('generate-brief-reel.mjs did not report an output path (.reel-output-path.txt missing)')
}
const reelFile = readFileSync(outputPathFile, 'utf8').trim()
unlinkSync(outputPathFile)

writeState({
  nextDay: state.nextDay + 1,
  log: [
    { day: entry.day, pillar: entry.pillar, feature: entry.feature, file: reelFile, generated_at: new Date().toISOString() },
    ...state.log,
  ].slice(0, 60),
})

if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `reel_file=${reelFile}\n`, { flag: 'a' })
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  ✅  ${reelFile}`)
console.log(`  📅  Next up: Day ${state.nextDay + 1 > queue.length ? '— campaign complete' : state.nextDay + 1}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
