// Builds a "ground truth" block to inject into flash-article generation
// prompts, so the model narrates real figures instead of inventing plausible
// but wrong ones (repo rate, USD/INR, next MPC date, etc.) from its own
// training data. See postmortem: two Aug 2026 policy flash articles stated a
// fabricated 6.5% repo rate and an impossible "next review Feb 2025" — neither
// figure was ever passed into the prompt in the first place.
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { REPO_RATE_PCT, REPO_RATE_ASOF } from '../../lib/rbiRepoRate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '../..')

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null }
}

export function buildKnownFactsBlock({ includeRepoRate = false, includeSnapshot = false } = {}) {
  const lines = []

  if (includeRepoRate) {
    lines.push(`RBI repo rate: ${REPO_RATE_PCT}% (as of the ${REPO_RATE_ASOF} MPC decision)`)
    const eventMap = readJSON(path.join(ROOT, 'data/event-map.json'))
    const rbiMpc = eventMap?.events?.find(e => e.id === 'rbi_mpc')
    if (rbiMpc?.next_release_utc) {
      lines.push(`Next scheduled RBI MPC decision: ${rbiMpc.next_release_utc.slice(0, 10)}`)
    }
  }

  if (includeSnapshot) {
    const snap = readJSON(path.join(ROOT, 'data/market-snapshot.json'))
    const i = snap?.instruments
    if (i?.USDINR)     lines.push(`USD/INR spot: ₹${i.USDINR.price} (as of ${snap.generatedAtIST})`)
    if (i?.MCX_GOLD)   lines.push(`MCX Gold: ₹${i.MCX_GOLD.price}/10g`)
    if (i?.MCX_SILVER) lines.push(`MCX Silver: ₹${i.MCX_SILVER.price}/kg`)
    if (i?.MCX_CRUDE)  lines.push(`MCX Crude: ₹${i.MCX_CRUDE.price}/bbl`)
  }

  if (lines.length === 0) return ''

  return `

KNOWN CURRENT FACTS — treat these as ground truth; never state a different value for them:
${lines.map(l => `- ${l}`).join('\n')}
For any other number, date, or price level not listed here or in the headline, describe it qualitatively (direction/magnitude in general terms) — do not invent a specific figure or date.`
}
