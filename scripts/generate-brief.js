import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { isTradingHoliday, todayIST, getHolidayName } from './lib/holidays.js'
import { deriveCommodityLabelsFromTags } from './lib/commodity-tags.js'
import { resolveEdge, formatEdgeResultBlock, appendToLedger } from './lib/edgeLedger.mjs'
import { loadPromptTemplate, renderPromptTemplate } from './lib/promptTemplate.mjs'
import { appendGateLogEntry, hashPayload } from './lib/gateLog.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Part 8.2: bump this (and the prompts/brief_vN.md filename) on any material
// prompt change — logged per generation call in data/gate-log.jsonl (8.4)
// so any published brief can be traced to its exact prompt version.
const PROMPT_VERSION = 'brief_v4'
const envFile = path.join(__dirname, '../.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const client     = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const BRIEFS_DIR = path.join(process.cwd(), 'content/briefs')

// FIX-07 (D-07): the only historical/statistical claims the model may cite —
// see scripts/lib/buildClaimsLedger.mjs for how this is (re)generated, and
// data/claims.json for why it's currently limited to event-calendar impact
// stats (EIA storage, API inventories, etc.) and does NOT cover geopolitical
// reaction patterns like ceasefire timing or "self-limiting" price
// thresholds — there's no verified dataset behind those, and previous
// editions freely invented plausible-sounding numbers for exactly that kind
// of claim (e.g. "Brent falls 3-5% within 24h of a ceasefire" — no source,
// no sample, no N). validate-brief.mjs's G-07 check enforces this at the
// gate; this is the corresponding constraint on the generation side.
function loadClaimsLedger() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/claims.json'), 'utf8'))
    return raw.claims ?? []
  } catch {
    return []
  }
}

function detectNextEdition() {
  if (process.env.EDITION) return parseInt(process.env.EDITION, 10)
  try {
    const files = fs.readdirSync(BRIEFS_DIR)
      .filter(f => f.match(/^edition-\d+\.mdx$/))
      .sort()
    if (files.length === 0) return 1
    const last = files[files.length - 1].match(/edition-(\d+)\.mdx/)
    return last ? parseInt(last[1], 10) + 1 : 1
  } catch { return 1 }
}

const EDITION = detectNextEdition()

// ── Prices — derived from snapshot only ──────────────────────────────────────
// No live API fetch. fetch-snapshot.mjs runs before this script and writes
// data/market-snapshot.json. All price data flows from that file.

function snapshotToPrices(snapshot) {
  const i   = snapshot.instruments
  const fmt = (v, dec = 0) => (v > 0 ? v.toFixed(dec) : null)
  const pct = (v) => (v != null ? v.toFixed(2) : '0.00')
  // D-16: pre-compute every absolute change here in JS (deterministic,
  // always correct) so the model never has to subtract price - prevClose
  // itself in prose — that manual arithmetic is what tripped the publish
  // gate's SEMANTIC-BLOCK check repeatedly (edition #72 attempts, 2026-07-27).
  const chg = (inst, dec = 0) =>
    (inst?.price > 0 && inst?.prevClose > 0) ? (inst.price - inst.prevClose).toFixed(dec) : null

  return {
    usdinr:      fmt(i.USDINR?.price,      2),
    comexGold:   fmt(i.COMEX_GOLD?.price,  0),
    mcxGold:     fmt(i.MCX_GOLD?.price,    0),
    comexSilver: fmt(i.COMEX_SILVER?.price, 2),
    mcxSilver:   fmt(i.MCX_SILVER?.price,  0),
    wti:         fmt(i.WTI?.price,         2),
    brent:       fmt(i.BRENT?.price,       2),
    mcxCrude:    fmt(i.MCX_CRUDE?.price,   0),
    comexCopper: null,  // COMEX copper not in snapshot; MCX copper row still shown below
    mcxCopper:   fmt(i.MCX_COPPER?.price,  2),
    henryHub:    fmt(i.HENRY_HUB?.price,   2),
    mcxGas:      fmt(i.MCX_NATGAS?.price,  2),
    goldPct:     pct(i.MCX_GOLD?.changePct),
    silverPct:   pct(i.MCX_SILVER?.changePct),
    crudePct:    pct(i.MCX_CRUDE?.changePct),
    copperPct:   pct(i.MCX_COPPER?.changePct),
    gasPct:      pct(i.MCX_NATGAS?.changePct),
    mcxGoldChange:    chg(i.MCX_GOLD,    0),
    mcxSilverChange:  chg(i.MCX_SILVER,  0),
    mcxCrudeChange:   chg(i.MCX_CRUDE,   0),
    mcxCopperChange:  chg(i.MCX_COPPER,  2),
    mcxGasChange:     chg(i.MCX_NATGAS,  2),
    comexGoldChange:  chg(i.COMEX_GOLD,  1),
    comexSilverChange: chg(i.COMEX_SILVER, 2),
    wtiChange:        chg(i.WTI,   2),
    brentChange:      chg(i.BRENT, 2),
  }
}

// ── News ──────────────────────────────────────────────────────────────────────

async function fetchNews() {
  const sources = [
    'https://economictimes.indiatimes.com/markets/commodities/rssfeeds/1368177.cms',
    'https://news.google.com/rss/search?q=MCX+gold+silver+crude+India+commodity&hl=en-IN&gl=IN&ceid=IN:en',
    'https://news.google.com/rss/search?q=OPEC+crude+oil+gold+Fed+rates+2026&hl=en&gl=US&ceid=US:en',
  ]
  const headlines = []
  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 BhaavBrief/1.0' },
        signal: AbortSignal.timeout(8000),
      })
      const text = await res.text()
      const m1 = [...text.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)].map(m => m[1].trim())
      const m2 = [...text.matchAll(/<title>(.+?)<\/title>/g)]
        .map(m => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim())
        .filter(t => t.length > 10 && t.length < 200)
        .slice(1, 6)
      headlines.push(...(m1.length ? m1.slice(0, 5) : m2))
      if (headlines.length >= 10) break
    } catch (e) {
      console.warn('RSS failed:', url, e.message)
    }
  }
  return [...new Set(headlines)].slice(0, 10)
}

// ── Previous briefs for narrative continuity ──────────────────────────────────

// How many consecutive recent editions led with the same commodity tag —
// used to nudge the model away from repeating a stale lead when a fresher
// story is available (see diversificationBlock in generate()).
function getLeadStreak(count = 5) {
  try {
    const files = fs.readdirSync(BRIEFS_DIR)
      .filter(f => f.match(/^edition-\d+\.mdx$/))
      .sort()
      .slice(-count)
      .reverse() // most recent first

    const leads = files.map(f => {
      const content = fs.readFileSync(path.join(BRIEFS_DIR, f), 'utf8')
      const tagsMatch = content.match(/^tags:\s*\[(.+?)\]/m)
      const firstTag  = tagsMatch?.[1]?.split(',')[0]?.trim().replace(/^"|"$/g, '')
      return firstTag ?? null
    })

    if (!leads[0]) return { streak: 0, lead: null }

    let streak = 0
    for (const tag of leads) {
      if (tag === leads[0]) streak++
      else break
    }
    return { streak, lead: leads[0] }
  } catch {
    return { streak: 0, lead: null }
  }
}

// ── Deterministic arc-trigger rule ────────────────────────────────────────────
// If the same commodity has been the PRIMARY (first) tag for 2+ consecutive
// editions and its combined day-over-day move over that streak exceeds
// RULE_MOVE_THRESHOLD_PCT, this qualifies as a developing story regardless of
// the LLM's subjective read — see detectAndUpdateArc().
const RULE_STREAK_THRESHOLD    = 2
const RULE_MOVE_THRESHOLD_PCT  = 5

const TAG_TO_PRICE_ROW_LABEL = {
  'MCX Gold':   'Gold',
  'MCX Silver': 'Silver',
  'MCX Crude':  'Crude',
  'MCX Copper': 'Copper',
  'MCX NatGas': 'Nat Gas',
}

// Reads the MCX price for `rowLabel` out of a brief's rendered Price Bridge
// table (built by buildPriceBridge() — always present whenever that
// commodity's price data exists, unlike the Key Number %-tail which is
// sometimes omitted). Row format: "| Crude | $72.35/bbl (WTI) | ₹95.08 | **₹6885/bbl** |"
function extractMcxPriceFromBrief(content, rowLabel) {
  const re = new RegExp(`\\|\\s*${rowLabel}\\s*\\|[^|]*\\|[^|]*\\|\\s*\\*\\*₹([\\d,.]+)`)
  const m = content.match(re)
  return m ? parseFloat(m[1].replace(/,/g, '')) : null
}

// Sum of |day-over-day % move| for `leadTag` across the last `streak` editions.
function getLeadCommodityMoveSum(leadTag, streak) {
  const rowLabel = TAG_TO_PRICE_ROW_LABEL[leadTag]
  if (!rowLabel || streak < 1) return 0
  try {
    const files = fs.readdirSync(BRIEFS_DIR)
      .filter(f => f.match(/^edition-\d+\.mdx$/))
      .sort()
      .slice(-(streak + 1)) // one extra file needed to compute `streak` deltas
    const prices = files
      .map(f => extractMcxPriceFromBrief(fs.readFileSync(path.join(BRIEFS_DIR, f), 'utf8'), rowLabel))
    let sum = 0
    for (let i = 1; i < prices.length; i++) {
      // Skip (don't bridge across) a day whose price couldn't be extracted —
      // comparing two non-adjacent days as if they were consecutive would
      // silently distort the combined-move sum.
      if (prices[i] === null || prices[i - 1] === null) continue
      sum += Math.abs((prices[i] - prices[i - 1]) / prices[i - 1] * 100)
    }
    return sum
  } catch {
    return 0
  }
}

// Evaluated after the new brief is saved (so getLeadStreak sees it). Returns
// null when the rule doesn't fire, otherwise the facts detectAndUpdateArc
// uses to build the arc record deterministically (no LLM involved).
function evaluateArcTriggerRule() {
  const { streak, lead } = getLeadStreak(RULE_STREAK_THRESHOLD + 3)
  if (!lead || streak < RULE_STREAK_THRESHOLD) return null
  const moveSum = getLeadCommodityMoveSum(lead, streak)
  if (moveSum < RULE_MOVE_THRESHOLD_PCT) return null
  return { lead, streak, moveSum }
}

function loadRecentBriefs(count = 3) {
  try {
    const files = fs.readdirSync(BRIEFS_DIR)
      .filter(f => f.match(/^edition-\d+\.mdx$/))
      .sort()
      .slice(-(count))
    return files.map(f => {
      const content = fs.readFileSync(path.join(BRIEFS_DIR, f), 'utf8')
      // Extract title and first 400 chars of body for context
      const titleMatch = content.match(/title:\s*"(.+?)"/)
      const body = content.replace(/---[\s\S]+?---/, '').trim().slice(0, 500)
      return `[${f.replace('.mdx', '')}] ${titleMatch?.[1] ?? 'Unknown'}\n${body}`
    }).join('\n\n---\n\n')
  } catch {
    return ''
  }
}

// FIX-10 (D-14): resolve the most recently published edition's structured
// Edge of the Day against today's fresh snapshot, before generating today's
// brief. Returns null if there's no prior edition, or the prior edition
// predates this feature (no edgeMetric frontmatter) — in either case there's
// nothing to report and today's brief simply has no "Yesterday's Edge —
// Result" block, rather than a fabricated one.
function resolveYesterdaysEdge(snapshot) {
  try {
    const files = fs.readdirSync(BRIEFS_DIR).filter(f => /^edition-\d+\.mdx$/.test(f)).sort()
    if (files.length === 0) return null
    const priorFile = files[files.length - 1]
    const priorContent = fs.readFileSync(path.join(BRIEFS_DIR, priorFile), 'utf8')
    const priorEditionMatch = priorContent.match(/^edition:\s*(\d+)/m)
    if (!priorEditionMatch) return null
    const priorEdition = parseInt(priorEditionMatch[1], 10)

    const metricMatch    = priorContent.match(/^edgeMetric:\s*"?([A-Z_]+)"?/m)
    const levelMatch      = priorContent.match(/^edgeLevel:\s*([\d.]+)/m)
    const conditionMatch = priorContent.match(/^edgeCondition:\s*"?(above|below)"?/m)
    if (!metricMatch || !levelMatch || !conditionMatch) return null // pre-FIX-10 edition, nothing to resolve

    const edge = {
      edgeMetric:    metricMatch[1],
      edgeLevel:     parseFloat(levelMatch[1]),
      edgeCondition: conditionMatch[1],
    }
    const resolution = resolveEdge(edge, snapshot)
    appendToLedger({
      forEdition: priorEdition,
      resolvedByEdition: EDITION,
      edgeMetric: edge.edgeMetric,
      edgeLevel: edge.edgeLevel,
      edgeCondition: edge.edgeCondition,
      verdict: resolution.verdict,
      resolvedValue: resolution.resolvedValue,
      resolvedAt: new Date().toISOString(),
    })
    const block = formatEdgeResultBlock(priorEdition, edge, resolution)
    console.log(`Yesterday's Edge (edition #${priorEdition}): ${resolution.verdict}`)
    return block
  } catch (e) {
    console.warn('Edge resolution failed (non-fatal):', e.message)
    return null
  }
}

// ── Format helpers ────────────────────────────────────────────────────────────

function buildKeyNumber(prices) {
  if (!prices) return null
  const parts = []
  if (prices.mcxGold)   parts.push(`MCX Gold ₹${prices.mcxGold}`)
  if (prices.mcxCrude)  parts.push(`Crude ₹${prices.mcxCrude}`)
  if (prices.usdinr)    parts.push(`USDINR ₹${prices.usdinr}`)
  if (!parts.length) return null

  const changes = []
  const sign = n => parseFloat(n) > 0 ? '+' : ''
  if (prices.mcxGold   && prices.goldPct   !== '0.00') changes.push(`Gold ${sign(prices.goldPct)}${prices.goldPct}%`)
  if (prices.mcxCrude  && prices.crudePct  !== '0.00') changes.push(`Crude ${sign(prices.crudePct)}${prices.crudePct}%`)
  if (prices.mcxSilver && prices.silverPct !== '0.00') changes.push(`Silver ${sign(prices.silverPct)}${prices.silverPct}%`)

  const tail = changes.length ? ` — ${changes.join(' | ')}` : ''
  return `**${parts.join(' | ')}**${tail}`
}

function buildPriceBridge(prices) {
  if (!prices) return null
  const rows = []
  if (prices.comexGold   && prices.mcxGold)
    rows.push(`| Gold    | $${prices.comexGold}/oz (COMEX)    | ₹${prices.usdinr} | **₹${prices.mcxGold}/10g** |`)
  if (prices.wti         && prices.mcxCrude)
    rows.push(`| Crude   | $${prices.wti}/bbl (WTI)          | ₹${prices.usdinr} | **₹${prices.mcxCrude}/bbl** |`)
  if (prices.comexSilver && prices.mcxSilver)
    rows.push(`| Silver  | $${prices.comexSilver}/oz (COMEX)  | ₹${prices.usdinr} | **₹${prices.mcxSilver}/kg** |`)
  if (prices.mcxCopper)
    rows.push(`| Copper  | ${prices.comexCopper ? `$${prices.comexCopper}/lb (COMEX)` : '—'}  | ₹${prices.usdinr} | **₹${prices.mcxCopper}/kg** |`)
  if (prices.mcxGas)
    rows.push(`| Nat Gas | ${prices.henryHub ? `$${prices.henryHub}/mmBtu (Henry Hub)` : '—'} | ₹${prices.usdinr} | **₹${prices.mcxGas}/mmBtu** |`)
  if (!rows.length) return null
  return `| Commodity | Global Price | USD/INR | MCX Price |
|-----------|--------------|---------|-----------|
${rows.join('\n')}`
}

// ── Bold post-processor ───────────────────────────────────────────────────────
// Ensures all price figures (₹/$ with numbers) and percentages are bolded in
// body paragraphs. Skips: frontmatter, ## headers, table rows, disclaimer line,
// and text already inside **...**.
function applyBodyBold(mdx) {
  // Split at the second --- to separate frontmatter from body
  const fmEnd = mdx.indexOf('\n---\n', mdx.indexOf('---') + 3)
  if (fmEnd === -1) return mdx
  const frontmatter = mdx.slice(0, fmEnd + 5)   // up to and including closing ---\n
  const body        = mdx.slice(fmEnd + 5)

  const boldedBody = body.split('\n').map(line => {
    // Skip headers, table rows, blank lines, disclaimer, code fences
    if (
      line.startsWith('#') ||
      line.startsWith('|') ||
      line.startsWith('*BhaavBrief') ||
      line.startsWith('```') ||
      line.trim() === '' ||
      line.startsWith('---')
    ) return line

    // Split into alternating [non-bold, bold, non-bold, bold, ...] segments
    // so we never double-bold text already inside **...**
    const result = []
    const boldRe  = /\*\*[^*]+\*\*/g
    let last = 0
    let m
    while ((m = boldRe.exec(line)) !== null) {
      if (m.index > last) result.push({ raw: line.slice(last, m.index), process: true })
      result.push({ raw: m[0], process: false })
      last = m.index + m[0].length
    }
    if (last < line.length) result.push({ raw: line.slice(last), process: true })

    return result.map(seg => {
      if (!seg.process) return seg.raw
      return seg.raw
        // INR prices: ₹1,23,456 or ₹94.66 or ₹141100/10g
        .replace(/₹[\d,]+(?:\.\d+)?(?:\/(?:10g|kg|bbl|mmBtu|oz|lb))?/g, '**$&**')
        // USD prices: $4,000 or $56.69 or $3.25/mmBtu
        .replace(/\$[\d,]+(?:\.\d+)?(?:\/(?:oz|bbl|lb|mmBtu|barrel))?/g, '**$&**')
        // Percentages: only those with decimal places (-3.71%, 8.6%, 1.5%)
        // Deliberately excludes round numbers (10%, 5%, 16%) used in historical ranges
        .replace(/[+-]?\d+\.\d+%/g, '**$&**')
    }).join('')
  }).join('\n')

  return frontmatter + boldedBody
}

// ── Generate ──────────────────────────────────────────────────────────────────

async function generate(prices, news, recentBriefs, snapshot) {
  const today  = new Date()
  const dateStr = today.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Next trading day (IST) — walks forward past weekends/holidays so the
  // "Tomorrow:" line never names today's own day (the D-08 class of bug:
  // a Friday brief saying "scheduled across Friday's global session").
  let nextTradingDateStr = todayIST()
  do {
    nextTradingDateStr = new Date(
      new Date(nextTradingDateStr + 'T00:00:00Z').getTime() + 86400000
    ).toISOString().slice(0, 10)
  } while (isTradingHoliday(nextTradingDateStr))
  const nextTradingDayName = new Date(nextTradingDateStr + 'T00:00:00Z')
    .toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' })
  const nextTradingDateFull = new Date(nextTradingDateStr + 'T00:00:00Z')
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' })

  const keyNumber   = buildKeyNumber(prices)
  const priceBridge = buildPriceBridge(prices)

  // Snapshot block — raw JSON so the validator can cross-check every number.
  const snapshotBlock = snapshot ? `
AUTHORITATIVE MARKET SNAPSHOT (JSON) — use ONLY these numbers, never recall prices from memory:
${JSON.stringify(snapshot.instruments, null, 2)}

Derived: ${JSON.stringify(snapshot.derived)}
Snapshot as of: ${snapshot.generatedAtIST}
` : ''

  const claimsLedger = loadClaimsLedger()
  const claimsBlock = `
<claims_allowed>
${claimsLedger.length > 0 ? JSON.stringify(claimsLedger.map(c => ({
    claim_id: c.claim_id,
    statement: c.statement_template.replace(/\{(\w+)\}/g, (_, k) => c.values?.[k] ?? `{${k}}`),
  })), null, 2) : '[] — the ledger is currently empty or unavailable'}
</claims_allowed>`

  const sign = (v) => (v == null ? null : `${parseFloat(v) >= 0 ? '+' : ''}${v}`)
  const priceBlock = prices ? `
TODAY'S MCX PRICES (formatted from the snapshot above — same numbers, human-readable):
PRE-CALCULATED CHANGE FROM LAST CLOSE (₹/$, already computed — use these exact figures verbatim, never subtract prices yourself):
- MCX Gold:   ₹${prices.mcxGold ?? 'N/A'}/10g   | COMEX $${prices.comexGold}/oz | ${prices.goldPct}% today | change ₹${sign(prices.mcxGoldChange) ?? 'N/A'} | COMEX change $${sign(prices.comexGoldChange) ?? 'N/A'}
- MCX Silver: ₹${prices.mcxSilver ?? 'N/A'}/kg  | COMEX $${prices.comexSilver}/oz | ${prices.silverPct}% today | change ₹${sign(prices.mcxSilverChange) ?? 'N/A'} | COMEX change $${sign(prices.comexSilverChange) ?? 'N/A'}
- MCX Crude:  ₹${prices.mcxCrude ?? 'N/A'}/bbl  | WTI $${prices.wti} | Brent $${prices.brent ?? 'N/A'} | ${prices.crudePct}% today | change ₹${sign(prices.mcxCrudeChange) ?? 'N/A'} | WTI change $${sign(prices.wtiChange) ?? 'N/A'} | Brent change $${sign(prices.brentChange) ?? 'N/A'}
- MCX Copper: ₹${prices.mcxCopper ?? 'N/A'}/kg  | COMEX $${prices.comexCopper}/lb | ${prices.copperPct}% today | change ₹${sign(prices.mcxCopperChange) ?? 'N/A'}
- MCX NatGas: ₹${prices.mcxGas ?? 'N/A'}/mmBtu  | Henry Hub $${prices.henryHub} | ${prices.gasPct}% today | change ₹${sign(prices.mcxGasChange) ?? 'N/A'}
- USD/INR: ₹${prices.usdinr ?? 'N/A'}` : 'PRICES: Unavailable — state estimates are estimates.'

  const newsBlock = news.length > 0
    ? `TODAY'S NEWS:\n${news.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
    : 'NEWS: None fetched — use price action and macro context.'

  const historyBlock = recentBriefs
    ? `RECENT EDITIONS (for narrative continuity — evolve, don't repeat):\n${recentBriefs}`
    : ''

  const { streak: leadStreak, lead: leadTag } = getLeadStreak(5)
  const movers = [
    ['MCX Gold',   prices?.goldPct],
    ['MCX Silver', prices?.silverPct],
    ['MCX Crude',  prices?.crudePct],
    ['MCX Copper', prices?.copperPct],
    ['MCX NatGas', prices?.gasPct],
  ]
    .filter(([, pct]) => pct != null)
    .sort((a, b) => Math.abs(parseFloat(b[1])) - Math.abs(parseFloat(a[1])))

  const diversificationBlock = (leadStreak >= 3 && leadTag)
    ? `
STREAK ALERT: The last ${leadStreak} editions in a row have led with ${leadTag}. Today's movers ranked by size of move: ${movers.map(([label, pct]) => `${label} ${parseFloat(pct) >= 0 ? '+' : ''}${pct}%`).join(', ')}.
Unless ${leadTag} has a genuinely NEW catalyst today (not merely a continuation of the same story), lead this edition with a different commodity — most likely ${movers.find(([label]) => label !== leadTag)?.[0] ?? 'the next-largest mover'} — and give ${leadTag} a supporting mention instead of the headline. Repetition fatigue is a real cost; only keep the same lead if the story has materially changed.
`
    : ''

  const promptTemplate = loadPromptTemplate(path.join(__dirname, '..', 'prompts'), PROMPT_VERSION)
  const prompt = renderPromptTemplate(promptTemplate, {
    EDITION: EDITION,
    DATE_STR: dateStr,
    NEXT_TRADING_DAY_NAME: nextTradingDayName,
    NEXT_TRADING_DATE_FULL: nextTradingDateFull,
    CLAIMS_BLOCK: claimsBlock,
    SNAPSHOT_BLOCK: snapshotBlock,
    PRICE_BLOCK: priceBlock,
    NEWS_BLOCK: newsBlock,
    HISTORY_BLOCK: historyBlock,
    DIVERSIFICATION_BLOCK: diversificationBlock,
    TODAY_ISO: today.toISOString(),
  })

  const callStartedAt = Date.now()
  const model = 'claude-sonnet-4-6'
  const MAX_OUTPUT_TOKENS = 4096
  const r = await client.messages.create({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages:   [{ role: 'user', content: prompt }],
  })

  // 8.4: "Log every call: prompt version, model, tokens, latency, payload
  // hash → gate-log. Reproducibility: any published brief can be traced to
  // exact prompt+payload." Never let logging failure block generation.
  try {
    appendGateLogEntry({
      type: 'generation_call',
      call: 'brief',
      promptVersion: PROMPT_VERSION,
      model,
      inputTokens: r.usage?.input_tokens ?? null,
      outputTokens: r.usage?.output_tokens ?? null,
      stopReason: r.stop_reason ?? null,
      latencyMs: Date.now() - callStartedAt,
      payloadHash: hashPayload(prompt),
      calledAt: new Date(callStartedAt).toISOString(),
    })
  } catch (e) {
    console.warn('gate-log write failed (non-fatal):', e.message)
  }

  // A max_tokens cutoff means the brief was cut off mid-sentence — that must
  // fail loudly here, not get smuggled through as valid content for the
  // publish gate to catch (or miss) by accident. See 2026-07-20: edition #67
  // was silently truncated ("...and its softness is a domestic s") and only
  // caught because the gate's semantic checker happened to notice.
  if (r.stop_reason === 'max_tokens') {
    console.error(`Model hit the ${MAX_OUTPUT_TOKENS}-token output cap mid-brief (stop_reason=max_tokens) — refusing to publish a truncated brief`)
    return null
  }

  return r.content[0].type === 'text' ? r.content[0].text : null
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nBhaavBrief generator — Edition #${EDITION}\n`)

  const today = todayIST()
  if (isTradingHoliday(today)) {
    const name = getHolidayName(today)
    console.log(`MCX holiday today (${today}${name ? ': ' + name : ''}) — skipping brief generation`)
    return
  }

  // Date dedup: check most recent brief's frontmatter date to prevent double-publishing on the same day
  try {
    const files = fs.readdirSync(BRIEFS_DIR).filter(f => /^edition-\d+\.mdx$/.test(f)).sort()
    if (files.length > 0) {
      const lastContent = fs.readFileSync(path.join(BRIEFS_DIR, files[files.length - 1]), 'utf8')
      const dateMatch   = lastContent.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})/m)
      if (dateMatch && dateMatch[1] === today && !process.env.FORCE) {
        console.log(`Brief for ${today} already published (${files[files.length - 1]}) — skipping`)
        process.exit(0)
      }
    }
  } catch { /* BRIEFS_DIR may not exist yet on first run */ }

  // Load snapshot — the ground truth written by fetch-snapshot.mjs before this script runs
  let snapshot = null
  try {
    const snapshotFile = path.join(process.cwd(), 'data/market-snapshot.json')
    if (fs.existsSync(snapshotFile)) {
      snapshot = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'))
      const ageMin = (Date.now() - new Date(snapshot.generatedAt).getTime()) / 60000
      console.log(`Snapshot: loaded (${ageMin.toFixed(0)}m old, ${snapshot.source})`)
    } else {
      console.log('Snapshot: not found — brief will have no price data')
    }
  } catch (e) { console.warn('Snapshot load failed:', e.message) }

  if (!snapshot) {
    console.error('Cannot generate brief without a snapshot — run fetch-snapshot.mjs first')
    process.exit(1)
  }

  // FIX-10 (D-14): resolve yesterday's Edge of the Day before writing today's.
  const edgeResultBlock = resolveYesterdaysEdge(snapshot)

  const prices = snapshotToPrices(snapshot)
  const news   = await fetchNews()
  console.log(`Prices: OK (from snapshot, ${snapshot.generatedAtIST})`)
  console.log(`News: ${news.length} headlines`)

  const recentBriefs = loadRecentBriefs(3)
  console.log(`Loaded ${recentBriefs ? '3' : '0'} recent briefs for context`)

  let mdx = await generate(prices, news, recentBriefs, snapshot)
  if (!mdx) { console.error('No output from model'); process.exit(1) }

  mdx = mdx.trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```\s*$/, '').trim()

  if (!mdx.includes('---') || !mdx.includes('title:')) {
    console.error('Invalid MDX generated:\n', mdx.slice(0, 200))
    process.exit(1)
  }

  console.log('Running consistency check...')
  await checkConsistency(mdx, prices)

  // Inject Key Number + Price Bridge after closing frontmatter delimiter
  const keyNumber   = buildKeyNumber(prices)
  const priceBridge = buildPriceBridge(prices)
  // Match opening --- to closing --- (must be on its own line), non-greedy
  const fmMatch = mdx.match(/^(---\n[\s\S]*?\n---)\n([\s\S]*)$/)
  if (fmMatch) {
    const header = fmMatch[1]
    const body   = fmMatch[2].trimStart()
    const inject = [
      keyNumber      ? keyNumber      : null,
      edgeResultBlock ? edgeResultBlock : null,
      priceBridge    ? `## Price Bridge\n\n${priceBridge}` : null,
    ].filter(Boolean).join('\n\n')
    mdx = inject ? `${header}\n\n${inject}\n\n${body}` : `${header}\n\n${body}`
  }

  mdx = mdx.trimEnd()

  // Bold prices and percentages in body text (safety net — Claude may miss some)
  mdx = applyBodyBold(mdx)

  // Inject urlSlug derived from date + title for SEO-friendly URLs
  const titleMatch = mdx.match(/^title:\s*"([^"]+)"/m)
  const dateVal    = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10)
  if (titleMatch?.[1]) {
    const raw = titleMatch[1]
      .toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    const titlePart = raw.length > 75 ? raw.slice(0, 76).replace(/-[^-]*$/, '') : raw
    const urlSlug = dateVal + '-' + titlePart
    mdx = mdx.replace(/^(---\n)/, `$1urlSlug: "${urlSlug}"\n`)
  }

  // Write `commodities:` at generation time — this is the actual source of
  // the field readers (lib/briefs.ts etc.) were falling back to deriving
  // from `tags` at read time. Deriving here too, from the same tags this
  // brief was just written with, so new briefs carry the field directly.
  const tagsMatchForCommodities = mdx.match(/^tags:\s*\[(.+?)\]/m)
  if (tagsMatchForCommodities) {
    const tagList = tagsMatchForCommodities[1]
      .split(',')
      .map(t => t.trim().replace(/^"|"$/g, ''))
    const commodities = deriveCommodityLabelsFromTags(tagList)
    if (commodities.length > 0) {
      const commoditiesYaml = commodities.map(c => `"${c}"`).join(', ')
      mdx = mdx.replace(/^(---\n)/, `$1commodities: [${commoditiesYaml}]\n`)
    }
  }

  if (!fs.existsSync(BRIEFS_DIR)) fs.mkdirSync(BRIEFS_DIR, { recursive: true })
  const file = path.join(BRIEFS_DIR, `edition-${String(EDITION).padStart(3, '0')}.mdx`)
  if (fs.existsSync(file)) { console.warn('Already exists, skipping'); process.exit(0) }
  fs.writeFileSync(file, mdx.trim(), 'utf8')
  console.log(`Saved: ${file}`)

  // Arc detection — runs after brief is saved (getLeadStreak/rule need the file on disk)
  try {
    const ruleTrigger = evaluateArcTriggerRule()
    if (ruleTrigger) {
      console.log(`  Arc rule triggered: ${ruleTrigger.lead} led ${ruleTrigger.streak} consecutive editions, combined move ${ruleTrigger.moveSum.toFixed(1)}%`)
    }
    await detectAndUpdateArc(mdx, EDITION, ruleTrigger)
  } catch (e) {
    console.warn('Arc detection failed (non-fatal):', e.message)
  }
}

// ── Story Arc Detection ───────────────────────────────────────────────────────
const ARC_FILE = path.join(process.cwd(), 'data/story-arcs.json')

function loadArcs() {
  try { return JSON.parse(fs.readFileSync(ARC_FILE, 'utf8')) }
  catch { return { arcs: [] } }
}

function saveArcs(data) {
  fs.writeFileSync(ARC_FILE, JSON.stringify(data, null, 2), 'utf8')
}

// Fully deterministic arc create/continue — used whenever evaluateArcTriggerRule()
// has already decided the outcome. No LLM call is involved: this both avoids
// wasting an API call on a decision already made, and removes the two failure
// modes a "prompt the LLM, backstop on non-compliance" design had — a
// transient API failure (429/timeout) and a valid-but-unrelated LLM action
// could otherwise leave the rule-mandated arc write silently skipped.
function applyDeterministicArc(arcData, activeArcs, ruleTrigger, { edition, date, title, tags, mdx }) {
  const existingArc = activeArcs.find(a => a.primaryCommodity === ruleTrigger.lead)
  const rowLabel     = TAG_TO_PRICE_ROW_LABEL[ruleTrigger.lead]
  const keyLevel     = rowLabel ? extractMcxPriceFromBrief(mdx, rowLabel) : null
  const keyLevelStr  = keyLevel ? `₹${keyLevel}` : ''
  let parsedTags = []
  try { parsedTags = JSON.parse(tags.replace(/'/g, '"')) } catch { parsedTags = [ruleTrigger.lead] }

  if (existingArc) {
    if (!existingArc.editions.includes(edition)) {
      existingArc.editions.push(edition)
      existingArc.latestDay += 1
      existingArc.summary = `${ruleTrigger.lead} remains the primary daily narrative — day ${existingArc.latestDay}, combined move ${ruleTrigger.moveSum.toFixed(1)}% over the last ${ruleTrigger.streak} editions. Latest: ${title}.`
      if (keyLevelStr) existingArc.keyLevel = keyLevelStr
      console.log(`  Arc rule — continued: "${existingArc.title}" Day ${existingArc.latestDay}`)
    }
    return
  }

  const slug = `${ruleTrigger.lead.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-developing-story-${date}`
  arcData.arcs.push({
    id:               slug,
    title,
    startDate:        date,
    status:           'active',
    editions:         [edition],
    latestDay:        ruleTrigger.streak,
    summary:          `${ruleTrigger.lead} has led the primary daily narrative for ${ruleTrigger.streak} consecutive editions with a combined move of ${ruleTrigger.moveSum.toFixed(1)}%. Latest: ${title}.`,
    primaryCommodity: ruleTrigger.lead,
    keyLevel:         keyLevelStr,
    tags:             parsedTags,
  })
  console.log(`  Arc rule — started: "${title}" (${slug})`)
}

async function detectAndUpdateArc(mdx, edition, ruleTrigger = null) {
  const titleMatch = mdx.match(/^title:\s*"([^"]+)"/m)
  const tagsMatch  = mdx.match(/^tags:\s*(\[.*?\])/m)
  const dateMatch  = mdx.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})/m)
  if (!titleMatch) return

  const title   = titleMatch[1]
  const tags    = tagsMatch ? tagsMatch[1] : '[]'
  const date    = dateMatch ? dateMatch[1] : new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10)
  const excerpt = mdx.replace(/^---[\s\S]*?---\n*/m, '').slice(0, 800)

  const arcData    = loadArcs()
  const activeArcs = arcData.arcs.filter(a => a.status === 'active')

  if (ruleTrigger) {
    applyDeterministicArc(arcData, activeArcs, ruleTrigger, { edition, date, title, tags, mdx })
    saveArcs(arcData)
    return
  }

  const prompt = `You are reading a new BhaavBrief market brief. Determine if it starts, continues, or ends a story arc.

ACTIVE ARCS (may be empty):
${JSON.stringify(activeArcs, null, 2)}

NEW BRIEF:
Title: ${title}
Edition: ${edition}
Date: ${date}
Tags: ${tags}
Content excerpt:
${excerpt}

Return ONLY valid JSON (no markdown, no code fences):
{
  "action": "none" | "start" | "continue" | "end",
  "arcId": "kebab-case-id-matching-existing-or-new" | null,
  "title": "Short arc title (e.g. Iran-Israel Escalation: Crude Surge)" | null,
  "dayNumber": 1,
  "summary": "One sentence describing the arc story so far" | null,
  "primaryCommodity": "MCX Crude" | "MCX Gold" | "MCX Silver" | "MCX Copper" | "MCX NatGas" | null,
  "keyLevel": "₹9,000" | null,
  "tags": ["Iran", "MCX Crude", "Geopolitics"] | null
}

Rules:
- "start": This brief opens a NEW multi-day story not covered by existing arcs (war escalation, Fed pivot, supply shock, sanctions, major data surprise). The story must be able to run for 3+ days.
- "continue": This brief is day 2+ of an EXISTING active arc. Use the exact arcId from ACTIVE ARCS.
- "end": An existing active arc has clearly resolved (ceasefire announced, meeting concluded, supply restored). Use the existing arcId.
- "none": Standalone brief with no multi-day arc — routine market open, minor moves.
- Only create arcs for significant macro/geopolitical events, NOT routine daily briefs.
- dayNumber: 1 for new arc, existing latestDay+1 for continue.`

  let result = null
  try {
    const callStartedAt = Date.now()
    const model = 'claude-haiku-4-5-20251001'
    const response = await client.messages.create({
      model,
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    })
    try {
      appendGateLogEntry({
        type: 'generation_call', call: 'arc_detection', promptVersion: null, model,
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        latencyMs: Date.now() - callStartedAt,
        payloadHash: hashPayload(prompt),
        calledAt: new Date(callStartedAt).toISOString(),
      })
    } catch { /* non-fatal */ }
    const text  = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (match) result = JSON.parse(match[0])
  } catch (e) {
    console.warn('  Arc LLM call failed (non-fatal):', e.message)
  }

  if (result?.action === 'start' && result.arcId) {
    arcData.arcs.push({
      id:               result.arcId,
      title:            result.title ?? title,
      startDate:        date,
      status:           'active',
      editions:         [edition],
      latestDay:        1,
      summary:          result.summary ?? '',
      primaryCommodity: result.primaryCommodity ?? 'MCX Crude',
      keyLevel:         result.keyLevel ?? '',
      tags:             result.tags ?? [],
    })
    console.log(`  Arc started: "${result.title}" (${result.arcId})`)
  }

  if (result?.action === 'continue' && result.arcId) {
    const arc = arcData.arcs.find(a => a.id === result.arcId)
    if (arc && !arc.editions.includes(edition)) {
      arc.editions.push(edition)
      arc.latestDay = result.dayNumber ?? arc.latestDay + 1
      if (result.summary) arc.summary = result.summary
      console.log(`  Arc continued: "${arc.title}" Day ${arc.latestDay}`)
    }
  }

  if (result?.action === 'end' && result.arcId) {
    const arc = arcData.arcs.find(a => a.id === result.arcId)
    if (arc) {
      arc.status  = 'closed'
      arc.endDate = date
      if (!arc.editions.includes(edition)) arc.editions.push(edition)
      console.log(`  Arc closed: "${arc.title}"`)
    }
  }

  saveArcs(arcData)
}

// ── Post-generation consistency check ────────────────────────────────────────
async function checkConsistency(mdx, prices) {
  if (!prices) return
  const body = mdx.replace(/^---[\s\S]*?---\n*/m, '').trim()

  const today = new Date(Date.now() + 5.5 * 3600000)
  const monthName = today.toLocaleString('en-US', { month: 'long' })
  const sign = n => parseFloat(n) >= 0 ? '+' : ''
  const dataLines = [
    `Today: ${today.toISOString().slice(0, 10)} (${monthName} ${today.getUTCFullYear()})`,
    `USD/INR: ₹${prices.usdinr}`,
    prices.mcxGold    ? `MCX Gold: ₹${prices.mcxGold}/10g, ${sign(prices.goldPct)}${prices.goldPct}%` : null,
    prices.mcxSilver  ? `MCX Silver: ₹${prices.mcxSilver}/kg, ${sign(prices.silverPct)}${prices.silverPct}%` : null,
    prices.mcxCrude   ? `MCX Crude: ₹${prices.mcxCrude}/bbl, ${sign(prices.crudePct)}${prices.crudePct}%` : null,
    prices.mcxCopper  ? `MCX Copper: ₹${prices.mcxCopper}/kg, ${sign(prices.copperPct)}${prices.copperPct}%` : null,
    prices.comexGold  ? `COMEX Gold: $${prices.comexGold}/oz` : null,
    prices.wti        ? `WTI Crude: $${prices.wti}/bbl` : null,
  ].filter(Boolean)

  const prompt = `You are a fact-checker for a financial newsletter. Compare the BRIEF TEXT against the RAW DATA (ground truth).

RAW DATA:
${dataLines.join('\n')}

BRIEF TEXT (first 2000 chars):
${body.slice(0, 2000)}

List only clear contradictions where the brief states something that conflicts with the raw data — wrong direction, wrong month/year, wrong price magnitude. Do NOT flag historical claims or predictions.

Return ONLY a JSON array of short contradiction strings. If none, return [].`

  try {
    const callStartedAt = Date.now()
    const model = 'claude-haiku-4-5-20251001'
    const resp = await client.messages.create({
      model,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })
    try {
      appendGateLogEntry({
        type: 'generation_call', call: 'consistency_check', promptVersion: null, model,
        inputTokens: resp.usage?.input_tokens ?? null,
        outputTokens: resp.usage?.output_tokens ?? null,
        latencyMs: Date.now() - callStartedAt,
        payloadHash: hashPayload(prompt),
        calledAt: new Date(callStartedAt).toISOString(),
      })
    } catch { /* non-fatal */ }
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

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
