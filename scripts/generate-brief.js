import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { isTradingHoliday, todayIST, getHolidayName } from './lib/holidays.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
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
  if (prices.comexCopper && prices.mcxCopper)
    rows.push(`| Copper  | $${prices.comexCopper}/lb (COMEX)  | ₹${prices.usdinr} | **₹${prices.mcxCopper}/kg** |`)
  if (!rows.length) return null
  return `| Commodity | Global Price | USD/INR | MCX Price |
|-----------|--------------|---------|-----------|
${rows.join('\n')}`
}

const DISCLAIMER = `---

*BhaavBrief is not a SEBI-registered investment advisor. Content is for educational and informational purposes only. Nothing here is a buy, sell, or hold recommendation. Commodity markets carry significant risk — consult a registered advisor before acting on any information.*`

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

  const keyNumber   = buildKeyNumber(prices)
  const priceBridge = buildPriceBridge(prices)

  // Snapshot block — raw JSON so the validator can cross-check every number.
  const snapshotBlock = snapshot ? `
AUTHORITATIVE MARKET SNAPSHOT (JSON) — use ONLY these numbers, never recall prices from memory:
${JSON.stringify(snapshot.instruments, null, 2)}

Derived: ${JSON.stringify(snapshot.derived)}
Snapshot as of: ${snapshot.generatedAtIST}
` : ''

  const priceBlock = prices ? `
TODAY'S MCX PRICES (formatted from the snapshot above — same numbers, human-readable):
- MCX Gold:   ₹${prices.mcxGold ?? 'N/A'}/10g   | COMEX $${prices.comexGold}/oz | ${prices.goldPct}% today
- MCX Silver: ₹${prices.mcxSilver ?? 'N/A'}/kg  | COMEX $${prices.comexSilver}/oz | ${prices.silverPct}% today
- MCX Crude:  ₹${prices.mcxCrude ?? 'N/A'}/bbl  | WTI $${prices.wti} | Brent $${prices.brent ?? 'N/A'} | ${prices.crudePct}% today
- MCX Copper: ₹${prices.mcxCopper ?? 'N/A'}/kg  | COMEX $${prices.comexCopper}/lb | ${prices.copperPct}% today
- MCX NatGas: ₹${prices.mcxGas ?? 'N/A'}/mmBtu  | Henry Hub $${prices.henryHub} | ${prices.gasPct}% today
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

  const prompt = `You are BhaavBrief's chief analyst writing Edition #${EDITION} for ${dateStr}.

BhaavBrief's edge is the NARRATIVE ENGINE — we don't just report prices, we track the dominant macro story shaping Indian commodity markets and show traders if it's gaining or losing power.

${snapshotBlock}
${priceBlock}

${newsBlock}

${historyBlock}
${diversificationBlock}
═══════════════════════════════════════════
NARRATIVE ENGINE — YOUR CORE JOB
═══════════════════════════════════════════

Step 1: Identify today's DOMINANT NARRATIVE. One crisp phrase:
Examples: "Middle East supply shock", "Dollar strength trade", "China demand recovery",
"Higher-for-longer rates", "Sticky inflation premium", "Risk-off safe-haven bid",
"OPEC discipline holding", "Global slowdown fears", "Peace deal unwind"

Step 2: Assess its TRAJECTORY vs yesterday:
- BUILDING — narrative gaining market participation
- FADING — narrative losing grip, positioning unwinding
- SHIFTING — narrative flipping, prior positioning challenged

Step 3: Read each commodity through its FIXED interpretive lens — not the day's dominant narrative.
Each commodity has one lens that never changes regardless of direction:

COPPER   → industrial-demand lens only. Up = strengthening manufacturing/construction expectations. Down = softening. NEVER relabel a copper move as a "growth positive" or "warning flag" to match the day's geopolitical or macro narrative.
GOLD     → safe-haven + real-yield lens. Moves explained by risk appetite and rate expectations — not by the narrative of the day.
SILVER   → dual lens, stated every time: safe-haven component + industrial (solar/semiconductor) component. When silver and gold diverge, attribute the gap to the industrial half specifically — not "sentiment."
CRUDE    → supply/demand + geopolitical premium. Always separate "how much of this move is geopolitical premium" from "how much is fundamental demand" — these are two different signals.
NAT GAS  → standalone. Explicitly note it does NOT carry Middle East geopolitical premium. Do not force it into the day's main narrative.

If a commodity's lens CONTRADICTS the dominant narrative, report the divergence explicitly — "Copper fell while the peace narrative would predict a rally — this is the signal worth watching" — rather than reinterpreting the commodity to agree with the narrative. A divergence is a finding, not a problem.

Step 4: What would KILL this narrative? (the trigger traders must watch)

Step 5: What is the 2-3 day outlook if the narrative holds vs breaks?

═══════════════════════════════════════════
SEBI COMPLIANCE — NON-NEGOTIABLE
BhaavBrief is unregistered. Every sentence must pass the educational test.
- State data, never judge it: "Crude at $87.40, up 2.3%" ✅ | "Crude closed strong" ❌
- No action verbs directed at reader. BANNED: buy, sell, accumulate, avoid, exit, enter, hold, switch, book profits
- No predictive framing: "Goldman Sachs projects crude at $95" ✅ | "Crude headed to $95" ❌
- Historical context over prediction: "In past dollar-strength episodes, MCX gold fell 2-4%" ✅ | "MCX gold will fall" ❌
- Macro linkage must be educational not prescriptive: use "has historically" / "in past instances" framing
- "Edge of the Day" must be an observation or a data point to watch — never a trading call
═══════════════════════════════════════════

═══════════════════════════════════════════
WRITING RULES
═══════════════════════════════════════════
- HOOK SENTENCE MANDATORY: The FIRST sentence of every section (Macro Thread, Narrative, The Market Is Saying) must create tension, stakes, or curiosity BEFORE any analysis. Choose one type:
  STAKES: "₹2,300 crore of HPCL's crude import bill just got repriced in the last 48 hours."
  DRAMA: "Oil crossed ₹9,000 this morning. The last time that happened, petrol prices followed within 10 days."
  PUZZLE: "Crude is up 4% and gold is down 2% on the same day — that doesn't happen without a reason."
  CONTRARIAN: "Everyone is buying gold right now. Here is why that instinct may be the wrong one."
  NEVER open any section with a price followed by a percentage change. Open with what it MEANS.

- THE TWIST: Inside the Historical Context section, include exactly one sentence that names the contrarian view — what smart money or analysts on the OTHER side of this trade argue. Frame as historical observation per SEBI rules.
  Example: "The contrary read, based on past OPEC spare-capacity episodes, is that any move above $95 historically becomes self-defeating as cheating by smaller members accelerates."
  Example: "The twist worth watching: gold is falling INTO a war, which historically lasts no more than 48 hours before safe-haven demand reasserts — a sustained selloff here would be the anomaly."

- Open with the narrative, not with prices. Prices prove the narrative.
- If the recent editions were about Iran/crude, this edition must either deepen that story or show it reversing — never repeat it flatly.
- Use ONLY the prices given above. Never invent levels.
- CONTRACTS: MCX uses rolling near-month contracts. NEVER mention specific calendar months for MCX contracts (e.g., "June contract", "Feb-Mar expiry"). The price in the snapshot IS the active front-month price. Expired contract months from memory are wrong.
- CRITICAL — TITLE PRICE RULE: If the title contains a price or level (e.g. "$90", "₹1,55,000"), that exact number MUST appear verbatim in the price data above. Never round up, never pick a dramatic threshold, never extrapolate. If WTI is $89.73, the title may say "toward $90" only if you write it as an approximation — never "$100" or any invented milestone.
- Sharp, specific, factual — no waffle, no filler, no hedging.
- FORMATTING: Use **bold** for specific price figures (₹ and $ amounts) and precise percentage changes (those with decimal places, e.g. **-3.71%**, **8.6%**) in body paragraphs. Do NOT bold round numbers used in historical ranges (e.g. "6-10%" or "3-5%"), general terms, or every sentence. Sparse bold = high signal. Headers, tables, and the disclaimer are exempt.
- 450-600 words total.
- Every sentence must earn its place. No filler, no "it's worth noting".

- BANNED CONSTRUCTIONS — check every sentence before finalizing:
  "that is not X, it is Y" (e.g. "that is not a correction, it is repositioning") → banned unless the specific number that earns the claim appears in the same sentence.
  Verb-escalation metaphors used as a substitute for data: "is not drifting, it is sprinting" → banned.
  "is actually a warning flag" / "is actually a [label]" → banned unless the specific threshold crossed is named in the same sentence.
  Rule: every interpretive claim must have the number that earns it in the same sentence or the one immediately after. If you cannot point to that number, cut the claim.

- ONE IDEA PER SENTENCE, MAX ONE SUBORDINATE CLAUSE. Self-test before finalizing: remove every em-dash and colon — is each result still one grammatically complete sentence carrying one claim? If not, split it.

- MAX TWO HARD NUMBERS PER SENTENCE (price figures, precise percentages, ratios). Three or more precise figures back to back reads as a spreadsheet. State a number, say what it means, then introduce the next one. The Price Bridge table is exempt.

- End with "Edge of the Day:" — one specific data point or level to monitor, followed on a new line by "Tomorrow:" — one sentence naming the next data release or event that will confirm or kill this narrative, with the two conditions and their consequences.
  Example: "Tomorrow: US CPI at 6:00 PM IST — above 3.5% makes the Iran crude premium look cheap and upgrades the bullish thesis; below 3.0% and the entire energy rally looks borrowed."

LANGUAGE — NON-NEGOTIABLE:
Write for an educated Indian reader — someone who follows Mint or Economic Times, not a Bloomberg terminal analyst. Explain finance terms in plain language.
- FOMC → "US Federal Reserve's rate committee (FOMC)" on first mention
- "risk-off" → "fear-driven selling" or "investors pulling back from risky assets"
- "risk-on" → "markets gaining confidence, investors moving into commodities"
- "commodity complex" → just "commodities"
- "safe-haven bid" → "demand for gold as a safe harbour"
- "supply shock" → "sudden supply disruption" or explain the mechanism
- "the market is pricing in" → say what's actually happening instead
- "overhang" → explain the context plainly
- When any global term (WTI, FOMC, OPEC, EIA) appears, assume the reader knows it OR briefly parenthesize on first use
- Never stack two pieces of jargon in one sentence

═══════════════════════════════════════════
STRUCTURE (follow exactly — every section required)
═══════════════════════════════════════════

## Macro Thread
Exactly 3 sentences — no more, no less:
Sentence 1: The single overnight global event that matters most (name it specifically — a data release, a geopolitical move, a central bank action).
Sentence 2: The direct MCX implication — which commodity, in which direction, and the mechanism.
Sentence 3: The one thing to watch today that will confirm or kill that implication.

## [NARRATIVE NAME] — [BUILDING / FADING / SHIFTING]
[2-3 punchy sentences on what the narrative IS and why it's dominating today's market. Include one sentence on what's CHANGED vs yesterday.]

## The Market Is Saying
[4-6 sentences. Read ALL the commodity moves through the single narrative lens.
Gold is doing X because of the narrative. Crude is doing Y because of the narrative.
The divergence between A and B is telling you Z about narrative conviction.
Include specific price levels from the data above.]

## Historical Context
[How have MCX commodities behaved in past episodes of this same narrative — use "historically", "in past instances", "during similar periods". Describe the CHARACTER and DIRECTION of the price response. Only cite a specific percentage if you are certain of the exact figure. If uncertain, write "prices moved sharply higher/lower" — do not invent statistics. Never a directional call — only documented patterns.]

## What Kills It
[One specific trigger or data point that would reverse the narrative. What should traders have on their radar?]

## Who Is Affected
3 sentences — one each, specific and concrete:
- **Businesses:** Describe the ₹ impact using a labeled industry estimate. Use a category ("an oil marketing company", "a jewellery manufacturer", "a cable producer") rather than naming a specific company — UNLESS the figure is derivable from that company's publicly disclosed volumes. Never invent a crore calculation for a named company. Example: "An oil marketing company importing at typical daily volumes faces a crude bill roughly ₹X crore higher at this price level — sustained through the fortnightly revision window, retail fuel prices follow." If you name a company (e.g., HPCL, Titan), state only the qualitative impact or use a range drawn from publicly reported data — never a single invented figure. Never say "businesses face higher costs" — always state the type of business and the direction of impact in concrete terms.
- **Investors:** identify which MCX market participants are most exposed to this move, the specific contract, and at what observable price level the market is focused. Do not characterise direction — state the level and what it represents.
- **Consumers:** name one product and whether prices will rise or fall at the pump or shop. Never say "consumers may see higher prices".

**Edge of the Day:** [The single most important price level to monitor today, or the scheduled data release that will confirm or negate this narrative. An observation — never a buy/sell call.]

**Tomorrow:** [One sentence. Name the next data release or market event in the next 24 hours, the exact time IST, and the two observable outcomes: "if X, the thesis holds; if Z, it is challenged." Never name a specific future price level as an outcome. Example: "Tomorrow: EIA crude inventory data at 8:00 PM IST — a draw above 3 million barrels keeps the supply-tight thesis intact; a surprise build above 2 million barrels challenges it."]

═══════════════════════════════════════════
TAGS — pick the 1-3 most relevant (not always Gold):
MCX Gold | MCX Silver | MCX Crude | MCX Copper | MCX NatGas | Macro | Geopolitics | OPEC | RBI | Fed | USD/INR | Inflation
═══════════════════════════════════════════

Return ONLY valid MDX with frontmatter. Do NOT include a Key Number line or Price Bridge table — those are injected separately. Do NOT add a disclaimer — that is appended separately.

---
title: "[Sharp headline — lead with the narrative, not the commodity. Under 12 words. Any price level in the title must be a number that appears verbatim in the price data provided above — never invent or round to a dramatic threshold.]"
description: "[One crisp sentence under 25 words that captures the narrative shift.]"
date: "${today.toISOString()}"
edition: ${EDITION}
published: true
tags: ["tag1", "tag2"]
---

[Brief content starting with ## Macro Thread]`

  const r = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2800,
    messages:   [{ role: 'user', content: prompt }],
  })
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
      keyNumber   ? keyNumber   : null,
      priceBridge ? `## Price Bridge\n\n${priceBridge}` : null,
    ].filter(Boolean).join('\n\n')
    mdx = inject ? `${header}\n\n${inject}\n\n${body}` : `${header}\n\n${body}`
  }

  // Append disclaimer footer
  mdx = mdx.trimEnd() + '\n\n' + DISCLAIMER

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

  if (!fs.existsSync(BRIEFS_DIR)) fs.mkdirSync(BRIEFS_DIR, { recursive: true })
  const file = path.join(BRIEFS_DIR, `edition-${String(EDITION).padStart(3, '0')}.mdx`)
  if (fs.existsSync(file)) { console.warn('Already exists, skipping'); process.exit(0) }
  fs.writeFileSync(file, mdx.trim(), 'utf8')
  console.log(`Saved: ${file}`)

  // Arc detection — runs after brief is saved
  try {
    await detectAndUpdateArc(mdx, EDITION)
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

async function detectAndUpdateArc(mdx, edition) {
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

  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages:   [{ role: 'user', content: prompt }],
  })

  const text  = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return

  const result = JSON.parse(match[0])
  if (!result.action || result.action === 'none') return

  if (result.action === 'start' && result.arcId) {
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

  if (result.action === 'continue' && result.arcId) {
    const arc = arcData.arcs.find(a => a.id === result.arcId)
    if (arc && !arc.editions.includes(edition)) {
      arc.editions.push(edition)
      arc.latestDay = result.dayNumber ?? arc.latestDay + 1
      if (result.summary) arc.summary = result.summary
      console.log(`  Arc continued: "${arc.title}" Day ${arc.latestDay}`)
    }
  }

  if (result.action === 'end' && result.arcId) {
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

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
