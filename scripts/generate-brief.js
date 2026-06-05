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

// ── Prices ────────────────────────────────────────────────────────────────────

async function fetchPrices() {
  try {
    const res = await fetch('https://www.bhaavbrief.in/api/prices', {
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const d = await res.json()
    if (!d || d.error) throw new Error(d?.error ?? 'empty response')

    const fmt = (n, dec = 0) => n > 0 ? n.toFixed(dec) : null
    const pct  = (n) => n != null ? n.toFixed(2) : '0.00'

    return {
      usdinr:      d.usdinr?.toFixed(2) ?? null,
      comexGold:   fmt(d.comexGold),
      mcxGold:     fmt(d.gold?.mcx),
      comexSilver: fmt(d.comexSilver, 2),
      mcxSilver:   fmt(d.silver?.mcx),
      wti:         fmt(d.wti, 2),
      brent:       fmt(d.brent, 2),
      mcxCrude:    fmt(d.crude?.mcx),
      comexCopper: fmt(d.comexCopper, 2),
      mcxCopper:   fmt(d.copper?.mcx, 2),
      henryHub:    fmt(d.henryHub, 2),
      mcxGas:      fmt(d.natgas?.mcx, 2),
      goldPct:     pct(d.goldComexPct),
      silverPct:   pct(d.silverComexPct),
      crudePct:    pct(d.crudePct),
      copperPct:   pct(d.copperComexPct),
      gasPct:      pct(d.gasPct),
    }
  } catch (e) {
    console.warn('Price fetch failed:', e.message)
    return null
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

// ── Generate ──────────────────────────────────────────────────────────────────

async function generate(prices, news, recentBriefs) {
  const today  = new Date()
  const dateStr = today.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const priceBlock = prices ? `
TODAY'S MCX PRICES (use these exact numbers):
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

  const prompt = `You are BhaavBrief's chief analyst writing Edition #${EDITION} for ${dateStr}.

BhaavBrief's edge is the NARRATIVE ENGINE — we don't just report prices, we track the dominant macro story shaping Indian commodity markets and show traders if it's gaining or losing power.

${priceBlock}

${newsBlock}

${historyBlock}

═══════════════════════════════════════════
NARRATIVE ENGINE — YOUR CORE JOB
═══════════════════════════════════════════

Step 1: Identify today's DOMINANT NARRATIVE. One crisp phrase:
Examples: "Middle East supply shock", "Dollar strength trade", "China demand recovery",
"Higher-for-longer rates", "Sticky inflation premium", "Risk-off safe-haven bid",
"OPEC discipline holding", "Global slowdown fears", "Peace deal unwind"

Step 2: Assess its TRAJECTORY vs yesterday:
- STRENGTHENING — narrative gaining market conviction
- WEAKENING — narrative losing grip, positioning unwinding
- REVERSING — narrative flipping, traders caught offside

Step 3: Show how this ONE narrative explains ALL commodity moves today.
Why is gold up/down? Why is crude diverging? Why is copper ignoring the rest?
Everything flows from the narrative — not commodity-by-commodity.

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
- Open with the narrative, not with prices. Prices prove the narrative.
- If the recent editions were about Iran/crude, this edition must either deepen that story or show it reversing — never repeat it flatly.
- Use ONLY the prices given above. Never invent levels.
- CRITICAL — TITLE PRICE RULE: If the title contains a price or level (e.g. "$90", "₹1,55,000"), that exact number MUST appear verbatim in the price data above. Never round up, never pick a dramatic threshold, never extrapolate. If WTI is $89.73, the title may say "toward $90" only if you write it as an approximation — never "$100" or any invented milestone.
- Sharp, specific, factual — no waffle, no filler, no hedging.
- 450-600 words total.
- Every sentence must earn its place. No filler, no "it's worth noting".
- End with "Edge of the Day:" — one specific data point or level to monitor.

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
STRUCTURE (follow exactly)
═══════════════════════════════════════════

## [NARRATIVE NAME] — [STRENGTHENING / WEAKENING / REVERSING]
[2-3 punchy sentences on what the narrative IS and why it's dominating today's market. Include one sentence on what's CHANGED vs yesterday.]

## The Market Is Saying
[4-6 sentences. Read ALL the commodity moves through the single narrative lens.
Gold is doing X because of the narrative. Crude is doing Y because of the narrative.
The divergence between A and B is telling you Z about narrative conviction.
Include specific price levels from the data above.]

## Historical Context
[How have MCX commodities behaved in past episodes of this same narrative — use "historically", "in past instances", "during similar periods". Never a directional call — only documented patterns with attribution.]

## What Kills It
[One specific trigger or data point that would reverse the narrative. What should traders have on their radar?]

## Who Is Affected
3 sentences — one each, specific and concrete:
- **Businesses:** name one sector and one concrete cost/revenue consequence (e.g. "Paint companies: raw material costs rise ₹X/kg as copper surges"). Never say "businesses face higher costs".
- **Investors:** name one MCX contract and the directional signal. Never say "investors should watch".
- **Consumers:** name one product and whether prices will rise or fall at the pump or shop. Never say "consumers may see higher prices".

**Edge of the Day:** [The single most important price level to monitor, or scheduled data release that will either confirm or negate this narrative. An observation — never a buy/sell call.]

═══════════════════════════════════════════
TAGS — pick the 1-3 most relevant (not always Gold):
MCX Gold | MCX Silver | MCX Crude | MCX Copper | MCX NatGas | Macro | Geopolitics | OPEC | RBI | Fed | USD/INR | Inflation
═══════════════════════════════════════════

Return ONLY valid MDX with frontmatter:

---
title: "[Sharp headline — lead with the narrative, not the commodity. Under 12 words. Any price level in the title must be a number that appears verbatim in the price data provided above — never invent or round to a dramatic threshold.]"
description: "[One crisp sentence under 25 words that captures the narrative shift.]"
date: "${today.toISOString()}"
edition: ${EDITION}
published: true
tags: ["tag1", "tag2"]
---

[Brief content]`

  const r = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2000,
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
      if (dateMatch && dateMatch[1] === today) {
        console.log(`Brief for ${today} already published (${files[files.length - 1]}) — skipping`)
        process.exit(0)
      }
    }
  } catch { /* BRIEFS_DIR may not exist yet on first run */ }

  const [prices, news] = await Promise.all([fetchPrices(), fetchNews()])
  console.log(`Prices: ${prices ? 'OK' : 'FAILED'}`)
  console.log(`News: ${news.length} headlines`)

  const recentBriefs = loadRecentBriefs(3)
  console.log(`Loaded ${recentBriefs ? '3' : '0'} recent briefs for context`)

  let mdx = await generate(prices, news, recentBriefs)
  if (!mdx) { console.error('No output from model'); process.exit(1) }

  mdx = mdx.trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```\s*$/, '').trim()

  if (!mdx.includes('---') || !mdx.includes('title:')) {
    console.error('Invalid MDX generated:\n', mdx.slice(0, 200))
    process.exit(1)
  }

  // Inject urlSlug derived from date + title for SEO-friendly URLs
  const titleMatch = mdx.match(/^title:\s*"([^"]+)"/m)
  const dateVal    = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10)
  if (titleMatch?.[1]) {
    const urlSlug = dateVal + '-' + titleMatch[1]
      .toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 55)
    mdx = mdx.replace(/^(---\n)/, `$1urlSlug: "${urlSlug}"\n`)
  }

  if (!fs.existsSync(BRIEFS_DIR)) fs.mkdirSync(BRIEFS_DIR, { recursive: true })
  const file = path.join(BRIEFS_DIR, `edition-${String(EDITION).padStart(3, '0')}.mdx`)
  if (fs.existsSync(file)) { console.warn('Already exists, skipping'); process.exit(0) }
  fs.writeFileSync(file, mdx.trim(), 'utf8')
  console.log(`Saved: ${file}`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
