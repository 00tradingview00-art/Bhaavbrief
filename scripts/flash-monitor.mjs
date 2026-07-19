/**
 * BhaavBrief Flash Monitor — Event-Driven Flash Engine (T1 + T2)
 *
 * Runs every 15 minutes via GitHub Actions during MCX market hours.
 * A flash fires ONLY when a quantified trigger breaches a threshold on the
 * live market-snapshot. No trigger → no post. Most runs exit 0 silently.
 *
 * Triggers implemented:
 *   T1 — intraday % move from last-published baseline ≥ per-instrument threshold
 *   T2 — price crosses a round-number level (spec-defined step sizes)
 *
 * Anti-noise:
 *   - 75-min cooldown per instrument after any flash
 *   - Ratchet: T1 re-fires only when move extends by another full threshold
 *     step from lastFlashPrice, not from prevClose again
 *   - Stale instruments (Kite API carry-forward) skip T1
 *   - Lockfile prevents two concurrent 15-min runs from both publishing
 */

import fs   from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { isTradingHoliday, todayIST } from './lib/holidays.js'
import { fetchPexelsImage }            from './lib/pexels.js'
import { appendGateLogEntry, hashPayload } from './lib/gateLog.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')

// Load .env.local for local dev runs (same pattern as generate-brief.js)
const envFile = path.join(ROOT, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const eq = line.indexOf('=')
    if (eq > 0 && !line.startsWith('#')) {
      const k = line.slice(0, eq).trim()
      const v = line.slice(eq + 1).trim()
      if (k && !process.env[k]) process.env[k] = v
    }
  }
}

// ── Paths ──────────────────────────────────────────────────────────────────────
const SNAPSHOT_FILE   = path.join(ROOT, 'data/market-snapshot.json')
const STATE_FILE      = path.join(ROOT, 'data/flash-state.json')
const LOCK_FILE       = path.join(ROOT, 'data/flash-state.lock')
const FLASH_DIR       = path.join(ROOT, 'content/flash')
const PROMPT_FILE     = path.join(ROOT, 'prompts/flash_monitor_v1.md')

// ── Per-instrument config (spec §1) ───────────────────────────────────────────
// T1 threshold = minimum % move from last-published baseline
export const THRESHOLDS = {
  MCX_GOLD:   1.0,
  MCX_SILVER: 2.0,
  MCX_CRUDE:  1.5,
  MCX_COPPER: 1.5,
  MCX_NATGAS: 2.5,
  USDINR:     0.30,
}

// T2 step = round-number granularity (spec §1, only for listed instruments)
export const ROUND_STEPS = {
  MCX_GOLD:   5000,
  MCX_SILVER: 10000,
  MCX_CRUDE:  500,
  USDINR:     0.50,
}

const INSTRUMENT_LABELS = {
  MCX_GOLD:   'MCX Gold',
  MCX_SILVER: 'MCX Silver',
  MCX_CRUDE:  'MCX Crude',
  MCX_COPPER: 'MCX Copper',
  MCX_NATGAS: 'MCX Natural Gas',
  USDINR:     'USD/INR',
}

const INSTRUMENT_CATEGORIES = {
  MCX_GOLD:   'metals',
  MCX_SILVER: 'metals',
  MCX_CRUDE:  'energy',
  MCX_COPPER: 'metals',
  MCX_NATGAS: 'energy',
  USDINR:     'forex',
}

const COOLDOWN_MS = 75 * 60 * 1000   // 75 minutes
const SNAPSHOT_MAX_AGE_MS = 20 * 60 * 1000  // 20 minutes
const LOCK_MAX_AGE_MS     =  5 * 60 * 1000  // 5 minutes
const CLAUDE_MODEL        = 'claude-haiku-4-5-20251001'

// Phrases that would breach SEBI compliance — never publish if present
const BANNED_PHRASES = [
  /\b(buy|sell|short|long|invest|recommend|advice|target price|stop.?loss|accumulate|exit)/i,
]

// ── Pure, exported functions (used by flash-monitor.test.mjs) ─────────────────

/**
 * Returns the round-number level that price belongs to (floor bucket × step).
 * e.g. nearestRoundLevel(150_200, 5000) → 150_000
 */
export function nearestRoundLevel(price, step) {
  return Math.floor(price / step) * step
}

/**
 * Detects if price and prevClose are in different round-step buckets.
 * Returns the crossed level if so, or null if no cross.
 * Largest of the two bucket values is the crossed level in both directions.
 */
export function detectT2Cross(price, prevClose, step) {
  const bucketNow  = Math.floor(price    / step)
  const bucketPrev = Math.floor(prevClose / step)
  if (bucketNow === bucketPrev) return null
  return Math.max(bucketNow, bucketPrev) * step
}

/**
 * Returns true if |price − baseline| / baseline * 100 >= threshold.
 */
export function computeT1(price, baseline, threshold) {
  if (!baseline || baseline === 0) return false
  return Math.abs((price - baseline) / baseline * 100) >= threshold
}

/**
 * Returns true if lastFlashAt is within cooldownMs of now.
 * i.e., the instrument is still in its cooldown window.
 */
export function isCooledDown(lastFlashAt, cooldownMs, now = Date.now()) {
  if (!lastFlashAt) return false
  return (now - new Date(lastFlashAt).getTime()) < cooldownMs
}

/**
 * Generates a slug from a title and an IST-offset Date.
 * Format: YYYY-MM-DD-HH-MM-<kebab-title-max-55-chars>
 */
export function buildSlug(title, now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600000)
  const date = ist.toISOString().slice(0, 10)         // YYYY-MM-DD
  const time = ist.toISOString().slice(11, 16).replace(':', '-') // HH-MM
  const kebab = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 55)
    .replace(/-+$/, '')
  return `${date}-${time}-${kebab}`
}

/**
 * Extracts the TITLE: line and body from model output.
 * Returns { title, body } or throws if TITLE: line is missing.
 */
export function parseFlashOutput(raw) {
  const cleaned = raw
    .replace(/^```[a-z]*\n?/im, '')
    .replace(/\n?```\s*$/m, '')
    .trim()

  const match = cleaned.match(/^TITLE:\s*(.+)$/m)
  if (!match) throw new Error('Model output missing TITLE: line')
  const title = match[1].trim()
  const body  = cleaned
    .replace(/^TITLE:\s*.+\n?/m, '')
    .trim()
  return { title, body }
}

/**
 * Scans body for ₹ figures and checks each is within tolerancePct of
 * the instrument's current price. Returns an array of failed values.
 * Only checks figures ≥ ₹500 (avoids flagging lot sizes, percentages etc.)
 */
export function validateBodyNumbers(body, instrumentPrice, tolerancePct = 15) {
  const failures = []
  const re = /₹([\d,]+)/g
  let m
  while ((m = re.exec(body)) !== null) {
    const val = parseInt(m[1].replace(/,/g, ''), 10)
    if (val < 500) continue   // ignore small numbers (e.g. ₹50 margin)
    const diff = Math.abs(val - instrumentPrice) / instrumentPrice * 100
    if (diff > tolerancePct) failures.push(val)
  }
  return failures
}

/**
 * Returns true if body contains any compliance-banned phrases.
 */
export function containsBannedPhrases(body) {
  return BANNED_PHRASES.some(re => re.test(body))
}

// ── State helpers ──────────────────────────────────────────────────────────────

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return Object.fromEntries(
      Object.keys(THRESHOLDS).map(k => [k, {
        lastFlashAt:    null,
        lastFlashPrice: null,
        lastRoundLevel: null,
        recentFlashIds: [],
      }])
    )
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

// ── Recent flash context ───────────────────────────────────────────────────────

function loadRecentFlashBodies(slugs) {
  const bodies = []
  for (const slug of slugs.slice(0, 3)) {
    const p = path.join(FLASH_DIR, `${slug}.mdx`)
    if (!fs.existsSync(p)) continue
    const content = fs.readFileSync(p, 'utf8')
    // Strip frontmatter (between --- ... ---)
    const stripped = content.replace(/^---[\s\S]*?---\n?/, '').trim()
    bodies.push(stripped.slice(0, 300))   // first 300 chars for context
  }
  return bodies
}

// ── Prompt builder ─────────────────────────────────────────────────────────────

function buildPrompt(vars) {
  let template = fs.readFileSync(PROMPT_FILE, 'utf8')
  for (const [key, value] of Object.entries(vars)) {
    template = template.replaceAll(`{{${key}}}`, String(value ?? ''))
  }
  return template
}

function buildSnapshotBlock(instruments) {
  const keys = ['MCX_GOLD', 'MCX_SILVER', 'MCX_CRUDE', 'MCX_COPPER', 'MCX_NATGAS', 'USDINR']
  return keys
    .map(k => {
      const i = instruments[k]
      if (!i) return null
      const sign = i.changePct >= 0 ? '+' : ''
      return `${k}: ${i.price} ${i.unit}  (${sign}${i.changePct.toFixed(2)}% vs prev close)`
    })
    .filter(Boolean)
    .join('\n')
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  // Check trading calendar
  const today = todayIST()
  if (isTradingHoliday(today)) {
    console.log(`[flash-monitor] ${today} is a trading holiday — exiting`)
    process.exit(0)
  }

  // Lockfile guard: prevents duplicate flashes from concurrent 15-min runs
  if (fs.existsSync(LOCK_FILE)) {
    const lockAge = Date.now() - fs.statSync(LOCK_FILE).mtimeMs
    if (lockAge < LOCK_MAX_AGE_MS) {
      console.log(`[flash-monitor] Lock file is ${Math.round(lockAge / 1000)}s old — concurrent run in progress, exiting`)
      process.exit(0)
    }
    console.log('[flash-monitor] Stale lock file found — removing and continuing')
  }
  fs.writeFileSync(LOCK_FILE, new Date().toISOString(), 'utf8')

  try {
    await run()
  } finally {
    try { fs.unlinkSync(LOCK_FILE) } catch { /* ignore */ }
  }
}

async function run() {
  // Load and validate snapshot
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    console.warn('[flash-monitor] Snapshot file missing — exiting')
    process.exit(0)
  }
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'))
  const snapshotAge = Date.now() - new Date(snapshot.generatedAt).getTime()
  if (snapshotAge > SNAPSHOT_MAX_AGE_MS) {
    console.warn(`[flash-monitor] Snapshot is ${Math.round(snapshotAge / 60000)} min old — too stale, exiting`)
    process.exit(0)
  }

  const instruments = snapshot.instruments ?? {}
  const state       = loadState()
  const now         = new Date()
  const client      = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let flashesPublished = 0

  for (const key of Object.keys(THRESHOLDS)) {
    const inst = instruments[key]
    if (!inst || !inst.price || !inst.prevClose) {
      console.log(`[flash-monitor] ${key}: no data in snapshot — skipping`)
      continue
    }

    const instrState = state[key] ?? {
      lastFlashAt: null, lastFlashPrice: null, lastRoundLevel: null, recentFlashIds: [],
    }

    // ── T1 check ──────────────────────────────────────────────────────────────
    let t1Fires = false
    if (inst.stale) {
      console.log(`[flash-monitor] ${key}: stale carry-forward price — skipping T1`)
    } else if (isCooledDown(instrState.lastFlashAt, COOLDOWN_MS, now.getTime())) {
      const remaining = Math.round((COOLDOWN_MS - (now.getTime() - new Date(instrState.lastFlashAt).getTime())) / 60000)
      console.log(`[flash-monitor] ${key}: in cooldown (${remaining} min remaining) — skipping T1`)
    } else {
      const baseline = instrState.lastFlashPrice ?? inst.prevClose
      t1Fires = computeT1(inst.price, baseline, THRESHOLDS[key])
      if (t1Fires) {
        const movePct = Math.abs((inst.price - baseline) / baseline * 100).toFixed(2)
        console.log(`[flash-monitor] ${key}: T1 TRIGGER — ${movePct}% from baseline ${baseline} (threshold ${THRESHOLDS[key]}%)`)
      }
    }

    // ── T2 check ──────────────────────────────────────────────────────────────
    let t2Fires   = false
    let t2Level   = null
    const step = ROUND_STEPS[key]
    if (step) {
      const crossedLevel = detectT2Cross(inst.price, inst.prevClose, step)
      if (crossedLevel !== null && crossedLevel !== instrState.lastRoundLevel) {
        t2Fires = true
        t2Level = crossedLevel
        console.log(`[flash-monitor] ${key}: T2 TRIGGER — crossed round level ${crossedLevel}`)
      }
    }

    if (!t1Fires && !t2Fires) continue

    // ── Generate flash ────────────────────────────────────────────────────────
    const label    = INSTRUMENT_LABELS[key]
    const category = INSTRUMENT_CATEGORIES[key]
    const sign     = inst.changePct >= 0 ? '+' : ''
    const triggerType   = t1Fires ? 'T1 (% move)' : 'T2 (round-number cross)'
    const triggerDetail = t1Fires
      ? `${label} moved ${sign}${inst.changePct.toFixed(2)}% to ${inst.price} ${inst.unit}`
      : `${label} crossed round level ${t2Level} ${inst.unit} (from ${inst.prevClose} to ${inst.price})`

    const recentBodies  = loadRecentFlashBodies(instrState.recentFlashIds ?? [])
    const recentSection = recentBodies.length > 0
      ? recentBodies.map((b, i) => `--- Recent flash ${i + 1} ---\n${b}`).join('\n\n')
      : 'None published yet for this instrument today.'

    const istTime = new Date(now.getTime() + 5.5 * 3600000)
      .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })
      + ' IST'

    const prompt = buildPrompt({
      INSTRUMENT_LABEL: label,
      PRICE:            inst.price,
      UNIT:             inst.unit,
      CHANGE_PCT:       `${sign}${inst.changePct.toFixed(2)}%`,
      TRIGGER_TYPE:     triggerType,
      TRIGGER_DETAIL:   triggerDetail,
      SNAPSHOT_BLOCK:   buildSnapshotBlock(instruments),
      RECENT_FLASHES:   recentSection,
      IST_TIMESTAMP:    istTime,
    })

    console.log(`[flash-monitor] ${key}: calling Claude (${CLAUDE_MODEL})`)
    const t0 = Date.now()
    let response
    try {
      response = await client.messages.create({
        model:     CLAUDE_MODEL,
        max_tokens: 500,
        messages:  [{ role: 'user', content: prompt }],
      })
    } catch (e) {
      console.error(`[flash-monitor] ${key}: Claude API error — ${e.message}`)
      continue
    }
    const latencyMs = Date.now() - t0
    const raw = response.content[0]?.type === 'text' ? response.content[0].text : null
    if (!raw) {
      console.error(`[flash-monitor] ${key}: empty response from Claude`)
      continue
    }

    // ── Parse output ──────────────────────────────────────────────────────────
    let title, body
    try {
      ;({ title, body } = parseFlashOutput(raw))
    } catch (e) {
      console.error(`[flash-monitor] ${key}: failed to parse model output — ${e.message}`)
      console.error('Raw output:', raw.slice(0, 200))
      continue
    }

    // ── Inline validation ─────────────────────────────────────────────────────
    const badNumbers = validateBodyNumbers(body, inst.price)
    if (badNumbers.length > 0) {
      console.warn(`[flash-monitor] ${key}: validation FAIL — hallucinated prices: ${badNumbers.join(', ')} (instrument price: ${inst.price}) — skipping`)
      continue
    }
    if (containsBannedPhrases(body)) {
      console.warn(`[flash-monitor] ${key}: compliance FAIL — banned phrase in body — skipping`)
      continue
    }

    // ── Fetch cover image ─────────────────────────────────────────────────────
    const coverImage = await fetchPexelsImage(title, category)

    // ── Build and write MDX ───────────────────────────────────────────────────
    const slug = buildSlug(title, now)
    const fm = [
      '---',
      `title: ${JSON.stringify(title)}`,
      `date: ${JSON.stringify(now.toISOString())}`,
      `source: "BhaavBrief Intelligence"`,
      `category: ${JSON.stringify(category)}`,
      `published: true`,
      ...(coverImage ? [`coverImage: ${JSON.stringify(coverImage)}`] : []),
      '---',
    ].join('\n')
    const mdxContent = `${fm}\n\n${body}\n`

    const outPath = path.join(FLASH_DIR, `${slug}.mdx`)
    fs.writeFileSync(outPath, mdxContent, 'utf8')
    console.log(`[flash-monitor] ${key}: wrote ${slug}.mdx`)

    // ── Update state ──────────────────────────────────────────────────────────
    instrState.lastFlashAt    = now.toISOString()
    instrState.lastFlashPrice = inst.price
    if (t2Fires && t2Level !== null) instrState.lastRoundLevel = t2Level
    instrState.recentFlashIds = [slug, ...(instrState.recentFlashIds ?? [])].slice(0, 3)
    state[key] = instrState
    saveState(state)

    // ── Log ───────────────────────────────────────────────────────────────────
    try {
      appendGateLogEntry({
        type:          'generation_call',
        promptVersion: 'flash_monitor_v1',
        model:         CLAUDE_MODEL,
        inputTokens:   response.usage?.input_tokens,
        outputTokens:  response.usage?.output_tokens,
        latencyMs,
        payloadHash:   hashPayload(prompt),
        ts:            now.toISOString(),
        instrument:    key,
        trigger:       t1Fires ? 'T1' : 'T2',
        slug,
      })
    } catch (e) {
      console.warn('[flash-monitor] gate-log write failed:', e.message)
    }

    flashesPublished++
  }

  if (flashesPublished === 0) {
    console.log('[flash-monitor] No triggers fired — quiet run')
  } else {
    console.log(`[flash-monitor] Done — ${flashesPublished} flash(es) published`)
  }
}

// ── Entry point ────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  main().catch(e => {
    console.error('[flash-monitor] Fatal:', e.message)
    process.exit(1)
  })
}
