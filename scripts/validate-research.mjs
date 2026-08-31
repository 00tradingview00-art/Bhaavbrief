#!/usr/bin/env node
/**
 * validate-research.mjs — publish gate for Pro Research articles.
 *
 * Research is auto-published with zero human review (a deliberate choice —
 * see the automation plan), unlike the daily brief's Telegram-tap G-12 gate.
 * This gate is the ONLY safety net for that, so it errs toward blocking on
 * anything it can't be confident about rather than letting it through.
 *
 * Usage:
 *   node scripts/validate-research.mjs content/research/<slug>.mdx
 *
 * Exit code contract — mirrors validate-brief.mjs's, same reason: the
 * calling workflow must be able to tell "the gate worked and correctly
 * rejected this" apart from "the gate itself broke," since only the latter
 * should ever alert a human (this is a zero-human-review pipeline; a
 * rejection is routine and expected, not an incident).
 *   0 = pass — publish
 *   1 = blocked by a legitimate content rejection — stay quiet, this is the
 *       gate working as intended
 *   2 = blocked (at least partly) because the gate itself couldn't run a
 *       check — must alert a human, validation was skipped, not failed
 *
 * Env: ANTHROPIC_API_KEY
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { checkClaims } from './lib/claimsCheck.mjs'
import { appendGateLogEntry } from './lib/gateLog.mjs'

const gateStartedAt = Date.now()
const [, , researchPath] = process.argv
if (!researchPath) {
  console.error('usage: node validate-research.mjs <research.mdx>')
  process.exit(2) // can't even start — never a content rejection
}
if (!fs.existsSync(researchPath)) {
  console.error(`Research article not found: ${researchPath}`)
  process.exit(2)
}

const issues = []
function pushInternalError(msg) {
  issues.push(`GATE_INTERNAL_ERROR: ${msg}`)
}

const fullFile = fs.readFileSync(researchPath, 'utf8')
const fmEnd = fullFile.indexOf('---', 4)
const body = fmEnd > 3 ? fullFile.slice(fmEnd + 3).trim() : fullFile

// ---------------------------------------------------------------------------
// LAYER 1 — deterministic
// ---------------------------------------------------------------------------

// 1. Compliance lint — reuse the existing SEBI banned-phrase gate as-is
// (already the "canonical superset" per its own header comment) rather than
// duplicating its 100+ lines of regex here. It never actually reads its
// first (snapshotPath) argument's content, only briefPath — pass this file's
// own path as a harmless placeholder.
try {
  execFileSync('node', ['scripts/compliance-lint.mjs', researchPath, researchPath], { stdio: 'pipe' })
} catch (e) {
  const out = (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '')
  for (const line of out.split('\n')) {
    if (line.trim().startsWith('- COMPLIANCE-')) issues.push(line.trim().slice(2))
  }
  if (!issues.some(i => i.startsWith('COMPLIANCE-'))) {
    pushInternalError(`compliance-lint.mjs failed to run: ${e.message}`)
  }
}

// 2. Claims-ledger conformance — a research article may only cite a
// historical "X% historically" statistic if it's backed by a real,
// sample_size-verified entry in data/claims.json. This is expected to
// reject ANY such statistic for FOMC/Jackson Hole/RBI-MPC-class events —
// those are deliberately left with zero verified claims (see
// buildClaimsLedger.mjs's header) rather than guessed. The prompt in
// generate-research.mjs is told not to state one for these events; this is
// the enforcement if it does anyway.
let claims = []
try {
  claims = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/claims.json'), 'utf8')).claims ?? []
} catch (e) {
  pushInternalError(`could not load data/claims.json: ${e.message}`)
}
issues.push(...checkClaims(body, claims))

// 3. Loose price sanity — catches a gross hallucination (wrong order of
// magnitude, wrong commodity's price) without trying to exactly match every
// number the way validate-brief.mjs does. Research prices come from a live
// options-chain fetch at generation time, not the persisted snapshot file,
// so the two won't line up to the rupee even when both are correct — a
// generous 25% band is deliberate, this is a coarse sanity check, not a
// precision one.
const PRICE_TOLERANCE = 0.25
try {
  const snapshot = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/market-snapshot.json'), 'utf8'))
  const COMMODITY_PRICE = {
    gold:   snapshot?.prices?.gold?.mcx,
    silver: snapshot?.prices?.silver?.mcx,
    crude:  snapshot?.prices?.crudeoil?.mcx ?? snapshot?.prices?.crude?.mcx,
    copper: snapshot?.prices?.copper?.mcx,
    natgas: snapshot?.prices?.natgas?.mcx,
  }
  const COMMODITY_RE = {
    gold: /\bgold\b/i, silver: /\bsilver\b/i, crude: /\bcrude\b|\boil\b/i,
    copper: /\bcopper\b/i, natgas: /\bnat(?:ural)?\s*gas\b/i,
  }
  const PRICE_NEAR_COMMODITY = /₹\s?([\d,]+(?:\.\d+)?)/g
  for (const [commodity, refPrice] of Object.entries(COMMODITY_PRICE)) {
    if (!refPrice) continue
    const re = COMMODITY_RE[commodity]
    for (const m of body.matchAll(PRICE_NEAR_COMMODITY)) {
      const context = body.slice(Math.max(0, m.index - 60), m.index + m[0].length + 10)
      if (!re.test(context)) continue
      const stated = parseFloat(m[1].replace(/,/g, ''))
      if (!Number.isFinite(stated) || stated <= 0) continue
      const deviation = Math.abs(stated - refPrice) / refPrice
      if (deviation > PRICE_TOLERANCE) {
        issues.push(`PRICE-SANITY: "₹${m[1]}" near "${commodity}" is ${(deviation * 100).toFixed(0)}% off the snapshot MCX price (₹${refPrice}) — possible wrong commodity or hallucinated figure`)
      }
    }
  }
} catch (e) {
  // Non-fatal by design — a missing/unreadable snapshot shouldn't block
  // research from publishing on its own; the claims + semantic checks still run.
  console.error('PRICE-SANITY check skipped:', e.message)
}

// ---------------------------------------------------------------------------
// LAYER 2 — semantic pass (one Claude Haiku call)
// ---------------------------------------------------------------------------
// Scoped down from validate-brief.mjs's version (no MCX/COMEX/import-parity
// domain rules needed here — research doesn't do that cross-market
// arithmetic) but keeps the same "reason before severity" prompt structure
// and retry/internal-error-routing shape, since those are what actually
// fixed real failure modes there, not brief-specific logic.
async function attemptSemanticCheck() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { ok: false, retryable: false, reason: 'ANTHROPIC_API_KEY not set' }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        'You are a pre-publication checker for a paid MCX commodity options research article. ' +
        'You are NOT an editor of style or tone. You only flag real problems in these three categories:\n' +
        '1. UNCONDITIONAL PREDICTION — a definitive claim about future price direction stated as fact ' +
        '("gold will hit ₹90,000", "crude will fall next week") rather than conditional/statistical framing ' +
        '("if X, then Y is favoured", "historically Y has followed X"). Options strategy suggestions ' +
        '("sell the 87500 CE") are NOT predictions — they are descriptive of a structure, not a directional promise.\n' +
        '2. INTERNAL CONTRADICTION — the same instrument or level cited at two genuinely different values ' +
        'within the article with no explanation (e.g. "current price ₹87,200" earlier, "current price ₹86,000" later).\n' +
        '3. UNVERIFIED HISTORICAL STATISTIC — a specific historical percentage or frequency claim ' +
        '("this has moved gold by 2% on average") not present in the VERIFIED CLAIMS list provided below.\n\n' +
        'The "issues" array is a list of PROBLEMS ONLY — omit anything that passes, do not report PASS results. ' +
        'An empty issues array is the expected, common result. ' +
        'Respond ONLY with JSON: {"issues": [{"detail": string, "category": "PREDICTION"|"CONTRADICTION"|"UNVERIFIED_STAT", "severity": "block"|"warn"}]}. ' +
        'Write detail BEFORE severity in every object — decide severity only after you have finished reasoning in detail; ' +
        'it must be the conclusion that follows from what you just wrote, never a label you commit to first. ' +
        'No markdown fences, no preamble.',
      messages: [{
        role: 'user',
        content:
          `VERIFIED CLAIMS (the only historical statistics this article may cite):\n${JSON.stringify(claims.map(c => c.statement_template), null, 2)}\n\n` +
          `RESEARCH ARTICLE:\n${body.slice(0, 12000)}`,
      }],
    }),
  })

  if (!res.ok) {
    return { ok: false, retryable: res.status >= 500, reason: `API error ${res.status}` }
  }
  const data = await res.json()
  const text = (data.content ?? [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .replace(/```json|```/g, '')
    .trim()
  try {
    return { ok: true, verdict: JSON.parse(text) }
  } catch {
    console.error('DEBUG raw checker response:\n' + text)
    return { ok: false, retryable: true, reason: 'unparseable checker response' }
  }
}

async function semanticCheck() {
  const MAX_ATTEMPTS = Number(process.env.SEMANTIC_CHECK_MAX_ATTEMPTS ?? 2)
  const RETRY_DELAY_MS = Number(process.env.SEMANTIC_CHECK_RETRY_DELAY_MS ?? 3000)
  let result
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    result = await attemptSemanticCheck()
    if (result.ok || !result.retryable) break
    if (attempt < MAX_ATTEMPTS) {
      console.error(`SEMANTIC: attempt ${attempt} failed (${result.reason}) — retrying...`)
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
    }
  }

  if (!result.ok) {
    pushInternalError(`semantic check failed: ${result.reason}`)
    return
  }

  for (const it of result.verdict.issues ?? []) {
    const prefix = it.severity === 'block' ? 'SEMANTIC' : 'SEMANTIC-WARN'
    issues.push(`${prefix}-${it.category ?? 'UNKNOWN'}: ${it.detail}`)
  }
}

await semanticCheck()

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

const NON_BLOCKING_PREFIXES = ['SEMANTIC-WARN']
const blockers = issues.filter(i => !NON_BLOCKING_PREFIXES.some(p => i.startsWith(p)))
const hasInternalError = issues.some(i => i.startsWith('GATE_INTERNAL_ERROR:'))

try {
  appendGateLogEntry({
    type: 'research_gate_run',
    researchPath,
    clean: issues.length === 0,
    issueCount: issues.length,
    blockerCount: blockers.length,
    warningCount: issues.length - blockers.length,
    hasInternalError,
    durationMs: Date.now() - gateStartedAt,
    checkedAt: new Date().toISOString(),
  })
} catch { /* non-fatal — telemetry logging must never block publication */ }

console.log('\n=== BhaavBrief Pro Research publish gate ===')
if (issues.length === 0) {
  console.log('PASS — no issues found.')
} else {
  for (const i of issues) console.log(` - ${i}`)
}

if (blockers.length > 0) {
  console.error(`\nBLOCKED: ${blockers.length} blocking issue(s). Research NOT published.`)
  process.exit(hasInternalError ? 2 : 1)
}
console.log('\nPASS' + (issues.length ? ` (with ${issues.length} warning(s) logged above)` : '') + '\n')
process.exit(0)
