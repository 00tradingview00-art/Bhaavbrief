#!/usr/bin/env node
/**
 * BhaavBrief — Daily Keyword Gap Article Generator
 *
 * Each weekday, picks the top uncovered high-demand keyword from
 * data/keyword-universe.json, generates a 550-700 word evergreen
 * analytical article via Claude Sonnet, and saves it to content/articles/.
 *
 * Runs daily at 6:30 AM IST via GitHub Actions (keyword-article.yml),
 * before the 9 AM brief.
 *
 * Env vars:
 *   ANTHROPIC_API_KEY  — required
 *   VERCEL_DEPLOY_HOOK — optional; triggers Vercel deploy after commit
 */

import fs   from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')

// Load .env.local
const envFile = path.join(ROOT, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const VERCEL_DEPLOY_HOOK = process.env.VERCEL_DEPLOY_HOOK

const KEYWORD_UNIVERSE  = path.join(ROOT, 'data/keyword-universe.json')
const KEYWORD_COVERAGE  = path.join(ROOT, 'data/keyword-coverage.json')
const ARTICLES_DIR      = path.join(ROOT, 'content/articles')
const FLASH_DIR         = path.join(ROOT, 'content/flash')
const MARKET_STRUCTURE  = path.join(ROOT, 'data/market-structure.json')
const MARKET_SNAPSHOT   = path.join(ROOT, 'data/market-snapshot.json')

const COOLDOWN_DAYS = 90  // don't re-cover a keyword for 90 days

// All /learn page slugs — treated as already-covered content
const LEARN_SLUGS = [
  'mcx-lot-sizes', 'mcx-margin-calculation', 'mcx-gold-contracts',
  'mcx-commodity-tax-india', 'mcx-rollover', 'gold-etf-vs-mcx-gold',
  'mcx-margin-calculator', 'best-time-to-trade-mcx', 'why-usdinr-affects-mcx-gold',
  'what-is-comex', 'mcx-contract-expiry', 'comex-vs-mcx-gold',
  'mcx-circuit-limits', 'how-much-money-to-start-mcx-trading', 'mcx-gold-vs-physical-gold',
  'which-mcx-commodity-to-trade', 'mcx-trading-hours', 'mcx-order-types',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadJson(filePath, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function slugsFromDir(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(f => f.replace(/\.(mdx|md)$/, '').toLowerCase())
}

function isCoveredBySlug(entrySlug, entryKeyword, articleSlugs, flashSlugs) {
  // Direct slug match
  if (articleSlugs.some(s => s.includes(entrySlug))) return true
  if (flashSlugs.some(s => s.includes(entrySlug))) return true

  // Learn page match
  if (LEARN_SLUGS.some(ls => ls === entrySlug || entrySlug.includes(ls))) return true

  // Keyword word-overlap match (≥3 significant words in same filename)
  const words = entryKeyword.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .filter(w => w.length > 4 && !['india', 'price', 'mcx', 'what', 'does', 'affect', 'how'].includes(w))

  const matchesSlug = slugs => slugs.some(s => words.filter(w => s.includes(w)).length >= 2)
  return matchesSlug(articleSlugs) || matchesSlug(flashSlugs)
}

function getTopMovers() {
  try {
    const snap = loadJson(MARKET_SNAPSHOT, {})
    const movers = snap.movers ?? {}
    return Object.entries(movers)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 3)
      .map(([k]) => k.toLowerCase())  // e.g. ['silver', 'crude', 'gold']
  } catch {
    return []
  }
}

function getCommodityContext(commodity) {
  try {
    const ms = loadJson(MARKET_STRUCTURE, {})
    const entry = ms[commodity] ?? ms[Object.keys(ms).find(k => k.includes(commodity))]
    if (!entry) return ''
    const parts = []
    if (entry.importParity)   parts.push(`Import parity: ${entry.importParity}`)
    if (entry.priceDrivers)   parts.push(`Price drivers: ${Array.isArray(entry.priceDrivers) ? entry.priceDrivers.join(', ') : entry.priceDrivers}`)
    if (entry.keyRisk)        parts.push(`Key risk: ${entry.keyRisk}`)
    if (entry.macroLinks)     parts.push(`Macro links: ${Array.isArray(entry.macroLinks) ? entry.macroLinks.join(', ') : entry.macroLinks}`)
    if (entry.lotSize)        parts.push(`Lot size: ${entry.lotSize}`)
    if (entry.unit)           parts.push(`Unit: ${entry.unit}`)
    return parts.join('\n')
  } catch {
    return ''
  }
}

function toSlug(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function toDate(d = new Date()) {
  return d.toISOString().split('T')[0]
}

// ── Claude call ───────────────────────────────────────────────────────────────

async function generateArticle(entry, commodityContext) {
  const prompt = `You are writing an evergreen educational article for BhaavBrief, India's MCX commodity intelligence platform. Readers are Indian commodity traders, jewellers, importers, and merchants — not novices, but they want the mechanism explained clearly.

TARGET KEYWORD: "${entry.keyword}"
Use this keyword naturally in the first sentence and 2-3 more times in the body.

TARGET TITLE: "${entry.targetTitle}"

COMMODITY CONTEXT (use where relevant):
${commodityContext || 'No additional context.'}

Write a 550-700 word article with this exact structure:

## Introduction
Two sentences. Directly answer the keyword question. Use the keyword in the first sentence.

## The Mechanism
150-200 words. Explain the exact transmission pathway — how the event flows step-by-step to MCX prices. Include the formula or calculation where it exists (e.g. import parity formula). Be specific.

## India-Specific Context
100-150 words. What makes Indian prices behave differently from global benchmarks — import duty, GST, rupee conversion, MCX contract structure, SEBI rules, RBI policy. Be specific to India.

## Historical Episodes
100-150 words. Give 2-3 real, named examples with approximate percentage moves and approximate year (e.g. "In 2022, when..."). Give the reader a concrete sense of magnitude.

## What to Watch
80-100 words. Name specific observable data points — EIA release day, OPEC meeting schedule, IMD monsoon forecast, China PMI date, RBI MPC dates, MCX circuit limit — that signal when this mechanism is about to fire.

RULES:
- Never say "buy", "sell", "invest", "bullish", "bearish", "accumulate", "exit" — BhaavBrief is not SEBI-registered
- Use "historically" or "in past episodes" for directional framing
- All prices in INR for MCX, reference COMEX/LME/NYMEX as global benchmarks
- No filler phrases ("it is worth noting", "in conclusion", "needless to say")
- Write in present tense for mechanisms, past tense for historical episodes
- Headings use ## format exactly as shown above

OUTPUT FORMAT (strict):
DESCRIPTION: [one sentence, exactly 130-155 characters, suitable for HTML meta description, includes the target keyword]
---
[full article body in markdown, starting with ## Introduction — no title, no frontmatter]`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1600,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''

  // Parse DESCRIPTION and body
  const descMatch = text.match(/^DESCRIPTION:\s*(.+?)(?:\n|$)/i)
  const bodyMatch  = text.match(/---\n([\s\S]+)$/)

  const description = descMatch ? descMatch[1].trim() : entry.targetTitle
  const body        = bodyMatch ? bodyMatch[1].trim() : text.replace(/^DESCRIPTION:.*\n?---?\n?/i, '').trim()

  return { description, body }
}

// ── Save MDX ──────────────────────────────────────────────────────────────────

function saveArticle(entry, description, body) {
  const today    = toDate()
  const filename = `${today}-${entry.slug}.mdx`
  const filePath = path.join(ARTICLES_DIR, filename)

  const tags = [entry.commodity, 'mcx', 'india', entry.category.toLowerCase()]
    .filter((v, i, a) => a.indexOf(v) === i)

  const frontmatter = `---
title: "${entry.targetTitle.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"
date: "${today}"
commodity: ${entry.commodity}
tags: [${tags.map(t => `"${t}"`).join(', ')}]
edition: keyword-brief
articleType: keyword-brief
keywords: ["${entry.keyword}"]
---

`

  if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true })
  fs.writeFileSync(filePath, frontmatter + body, 'utf8')
  console.log(`  Saved: content/articles/${filename}`)
  return filename
}

// ── Update coverage ───────────────────────────────────────────────────────────

function updateCoverage(entry) {
  const coverage = loadJson(KEYWORD_COVERAGE, [])
  coverage.push({ slug: entry.slug, keyword: entry.keyword, coveredAt: new Date().toISOString() })
  // Keep last 500 entries
  fs.writeFileSync(KEYWORD_COVERAGE, JSON.stringify(coverage.slice(-500), null, 2), 'utf8')
}

// ── Vercel deploy ─────────────────────────────────────────────────────────────

async function triggerDeploy() {
  if (!VERCEL_DEPLOY_HOOK) return
  try {
    const r = await fetch(VERCEL_DEPLOY_HOOK, { method: 'POST', signal: AbortSignal.timeout(10000) })
    console.log(`  Vercel deploy triggered: ${r.status}`)
  } catch (e) {
    console.warn(`  Vercel deploy hook failed: ${e.message}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  console.log('BhaavBrief — Keyword Gap Article Generator')

  const universe  = loadJson(KEYWORD_UNIVERSE, [])
  const coverage  = loadJson(KEYWORD_COVERAGE, [])
  const cutoff    = Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  const covered90 = new Set(coverage.filter(c => new Date(c.coveredAt).getTime() > cutoff).map(c => c.slug))

  const articleSlugs = slugsFromDir(ARTICLES_DIR)
  const flashSlugs   = slugsFromDir(FLASH_DIR)
  const topMovers    = getTopMovers()
  console.log(`  Top movers today: ${topMovers.join(', ') || 'unknown'}`)

  // Filter to uncovered entries
  const candidates = universe.filter(entry => {
    if (covered90.has(entry.slug)) return false
    return !isCoveredBySlug(entry.slug, entry.keyword, articleSlugs, flashSlugs)
  })

  console.log(`  Universe: ${universe.length} | Uncovered: ${candidates.length}`)

  if (candidates.length === 0) {
    console.log('  All keywords covered within cooldown window — nothing to generate today.')
    return
  }

  // Score candidates
  const scored = candidates.map(entry => {
    let score = entry.tier === 'high' ? 2 : 1
    // Boost if commodity matches today's top movers
    if (topMovers.some(m => entry.commodity === m || entry.keyword.includes(m))) score += 1
    return { ...entry, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const chosen = scored[0]
  console.log(`  Chosen: "${chosen.keyword}" (tier=${chosen.tier}, score=${chosen.score})`)

  // Generate
  const commodityContext = getCommodityContext(chosen.commodity)
  console.log(`  Calling Claude Sonnet for "${chosen.targetTitle}"...`)
  const { description, body } = await generateArticle(chosen, commodityContext)

  // Save
  saveArticle(chosen, description, body)
  updateCoverage(chosen)

  // Rebuild content index
  try {
    const indexScript = path.join(__dirname, 'build-content-index.js')
    if (fs.existsSync(indexScript)) {
      execFileSync('node', [indexScript], { cwd: ROOT, stdio: 'inherit' })
      console.log('  Content index rebuilt.')
    }
  } catch (e) {
    console.warn(`  Content index rebuild failed: ${e.message}`)
  }

  // Trigger deploy
  await triggerDeploy()

  console.log(`\nDone — "${chosen.targetTitle}"`)
}

main().catch(err => {
  console.error('Keyword article generation failed:', err.message)
  process.exit(1)
})
