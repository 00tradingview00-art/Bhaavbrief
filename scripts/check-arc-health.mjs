/**
 * Arc Health Check
 *
 * Runs every 15 min alongside the intelligence engine.
 * Closes arcs that are no longer supported by market data:
 *
 *   1. Price reversal — price has moved >8% past the keyLevel in the wrong
 *      direction (e.g. a "Surge" arc whose key level is now 10% overhead).
 *
 *   2. Narrative staleness — no new brief edition added in >5 days, meaning
 *      the daily writer stopped treating it as a live story.
 *
 * When an arc is closed, Claude Haiku writes a one-sentence outcome so the
 * arc page can show what happened rather than just "closed".
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const ARC_FILE      = path.join(ROOT, 'data/story-arcs.json')
const SNAPSHOT_FILE = path.join(ROOT, 'data/market-snapshot.json')
const BRIEFS_DIR    = path.join(ROOT, 'content/briefs')

// Thresholds
const PRICE_BREACH_PCT  = 8   // % beyond key level in wrong direction → close
const STALENESS_DAYS    = 5   // days without a new edition → close

// MCX commodity label → snapshot instrument key
const COMMODITY_TO_INSTRUMENT = {
  'MCX Crude':     'MCX_CRUDE',
  'MCX Gold':      'MCX_GOLD',
  'MCX Silver':    'MCX_SILVER',
  'MCX Copper':    'MCX_COPPER',
  'MCX NatGas':    'MCX_NATGAS',
  'MCX Nat Gas':   'MCX_NATGAS',
  'MCX Zinc':      'MCX_ZINC',
  'MCX Lead':      'MCX_LEAD',
  'MCX Aluminium': 'MCX_ALUMINIUM',
  'MCX Nickel':    'MCX_NICKEL',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseKeyLevel(str) {
  if (!str) return null
  const val = parseFloat(str.replace(/[₹$,\s]/g, ''))
  return isNaN(val) ? null : val
}

function arcDirection(arc) {
  const t = (arc.title || '').toLowerCase()
  if (/fall|drop|crash|collapse|plunge|decline|bear|sell.?off|rout/.test(t)) return 'bearish'
  if (/surge|rally|rise|bull|jump|climb|soar|spike|high/.test(t))           return 'bullish'
  return 'unknown'
}

function getLastEditionDate(arc) {
  if (!arc.editions?.length) return new Date(arc.startDate)
  const lastEditionNum = Math.max(...arc.editions)
  try {
    for (const file of fs.readdirSync(BRIEFS_DIR)) {
      const raw = fs.readFileSync(path.join(BRIEFS_DIR, file), 'utf8')
      const em  = raw.match(/^edition:\s*(\d+)/m)
      if (em && parseInt(em[1]) === lastEditionNum) {
        const dm = raw.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})/m)
        if (dm) return new Date(dm[1])
      }
    }
  } catch {}
  return new Date(arc.startDate)
}

async function generateOutcome(arc, closeReason, currentPrice, client) {
  if (!client) return closeReason
  try {
    const priceStr = currentPrice
      ? `₹${currentPrice.toLocaleString('en-IN')}`
      : 'unknown'
    const res = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content:
          `Write a single factual sentence (past tense) summarising the outcome of this market story arc:\n\n` +
          `Arc title: "${arc.title}"\n` +
          `Key level: ${arc.keyLevel}\n` +
          `Current price: ${priceStr}\n` +
          `Closure trigger: ${closeReason}\n` +
          `Arc summary: ${arc.summary}\n\n` +
          `One sentence only. Example: "The crude surge stalled as OPEC+ accelerated output unwinding, ` +
          `reversing MCX Crude from ₹9,000 to ₹7,615 over 14 sessions."\n` +
          `No markdown, no quotes around the sentence.`,
      }],
    })
    return res.content[0]?.text?.trim() || closeReason
  } catch {
    return closeReason
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let arcData, snapshot

  try { arcData  = JSON.parse(fs.readFileSync(ARC_FILE, 'utf8'))      } catch { return }
  try { snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8')) } catch { snapshot = null }

  const client  = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null

  const activeArcs = arcData.arcs.filter(a => a.status === 'active')
  const now        = new Date()
  const today      = now.toISOString().slice(0, 10)
  let   changed    = false

  for (const arc of activeArcs) {
    let closeReason  = null
    let currentPrice = null

    // ── 1. Price-aware close ──────────────────────────────────────────────────
    const keyVal        = parseKeyLevel(arc.keyLevel)
    const instrumentKey = COMMODITY_TO_INSTRUMENT[arc.primaryCommodity]

    if (keyVal && instrumentKey && snapshot?.instruments?.[instrumentKey]) {
      currentPrice = snapshot.instruments[instrumentKey].price
      const pctFromKey = ((currentPrice - keyVal) / keyVal) * 100
      const direction  = arcDirection(arc)

      if (direction === 'bullish' && pctFromKey < -PRICE_BREACH_PCT) {
        closeReason =
          `Key level ${arc.keyLevel} breached to the downside — price reversed to ` +
          `₹${currentPrice.toLocaleString('en-IN')} (${pctFromKey.toFixed(1)}% from key level)`
      }
      if (direction === 'bearish' && pctFromKey > PRICE_BREACH_PCT) {
        closeReason =
          `Key level ${arc.keyLevel} breached to the upside — price recovered to ` +
          `₹${currentPrice.toLocaleString('en-IN')} (+${pctFromKey.toFixed(1)}% from key level)`
      }
    }

    // ── 2. Staleness close ────────────────────────────────────────────────────
    if (!closeReason) {
      const lastDate   = getLastEditionDate(arc)
      const daysSince  = (now - lastDate) / 86_400_000
      if (daysSince > STALENESS_DAYS) {
        closeReason =
          `Arc went ${Math.floor(daysSince)} days without a new edition — narrative faded`
      }
    }

    if (closeReason) {
      console.log(`  Closing arc "${arc.title}"\n  Reason: ${closeReason}`)
      arc.status  = 'closed'
      arc.endDate = today
      arc.outcome = await generateOutcome(arc, closeReason, currentPrice, client)
      console.log(`  Outcome: ${arc.outcome}`)
      changed = true
    }
  }

  if (changed) {
    fs.writeFileSync(ARC_FILE, JSON.stringify(arcData, null, 2), 'utf8')
    console.log('Arc health: story-arcs.json updated')
  } else {
    console.log(`Arc health: ${activeArcs.length} active arc(s) — all healthy`)
  }
}

main().catch(err => { console.error('Arc health check failed:', err.message); process.exit(0) })
