#!/usr/bin/env node
/**
 * scripts/generate-learn-reel.mjs
 *
 * Daily "MCX 101" Instagram Reel — turns one /learn guide into a short
 * educational explainer video by driving scripts/generate-brief-reel.mjs's
 * existing news mode (TOPIC/CONTEXT env vars). Reuses that script's render,
 * voiceover, music, and ffmpeg pipeline unchanged — this file only picks a
 * topic, builds the prompt context, and reports the result.
 *
 * Usage:
 *   node scripts/generate-learn-reel.mjs
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { join, dirname }        from 'path'
import { fileURLToPath }        from 'url'
import { execFileSync }         from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')

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
const TOPICS_FILE  = join(ROOT, 'data/learn-topics.json')
const HISTORY_FILE = join(ROOT, 'data/learn-reel-history.json')

function readTopics() {
  const { topics } = JSON.parse(readFileSync(TOPICS_FILE, 'utf8'))
  return topics
}

function readHistory() {
  if (!existsSync(HISTORY_FILE)) return { lastSlug: null, log: [] }
  try { return JSON.parse(readFileSync(HISTORY_FILE, 'utf8')) }
  catch { return { lastSlug: null, log: [] } }
}

function writeHistory(state) {
  writeFileSync(HISTORY_FILE, JSON.stringify({
    _note: 'Rotation state for the daily /learn reel (scripts/generate-learn-reel.mjs). lastSlug plus the alphabetical key order of data/learn-topics.json fully determines the next pick — self-heals when topics are added or removed.',
    ...state,
  }, null, 2), 'utf8')
}

// ── Pick next topic — alphabetical round-robin, self-healing on add/remove ────
function pickNextSlug(topics, lastSlug) {
  const slugs = Object.keys(topics).sort()
  if (!slugs.length) throw new Error('data/learn-topics.json has no topics')
  const lastIdx = slugs.indexOf(lastSlug)
  return slugs[(lastIdx + 1) % slugs.length]
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  BhaavBrief — MCX 101 Learn Reel')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const topics  = readTopics()
const history = readHistory()
const slug    = pickNextSlug(topics, history.lastSlug)
const topic   = topics[slug]

console.log(`📚  Topic: ${slug}`)
console.log(`    "${topic.title}"`)

let context = `This is educational content for MCX retail traders — not a market move.\n`
context += `Facts (use ONLY these numbers, do not invent or add any figure not listed here):\n`
context += topic.facts.map(f => `- ${f}`).join('\n')
context += `\ncontent_type must be "explainer" unless a live price is explicitly given below.`
if (topic.livePriceInstrument) {
  context += `\nA live snapshot price for ${topic.livePriceInstrument} is available in market data above — you may reference it as a stat hook if relevant, but it is not required.`
}
context += `\nEnd with an invitation to read the full guide.`

const outputPathFile = join(ROOT, '.reel-output-path.txt')
if (existsSync(outputPathFile)) unlinkSync(outputPathFile)

console.log('\n🎬  Handing off to generate-brief-reel.mjs (news mode)...\n')
execFileSync('node', ['scripts/generate-brief-reel.mjs'], {
  cwd:   ROOT,
  env:   {
    ...process.env,
    TOPIC:       topic.title,
    CONTEXT:     context,
    FORCE_MOOD:  'CALM',
    LEARN_URL:   topic.url,
    REEL_SERIES: 'learn101',
  },
  stdio: 'inherit',
})

if (!existsSync(outputPathFile)) {
  throw new Error('generate-brief-reel.mjs did not report an output path (.reel-output-path.txt missing)')
}
const reelFile = readFileSync(outputPathFile, 'utf8').trim()
unlinkSync(outputPathFile)

writeHistory({
  lastSlug: slug,
  log: [
    { slug, date: new Date().toISOString().slice(0, 10), file: reelFile, generated_at: new Date().toISOString() },
    ...history.log,
  ].slice(0, 60),
})

if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `reel_file=${reelFile}\n`, { flag: 'a' })
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  ✅  ${reelFile}`)
console.log(`  📚  Next up: ${pickNextSlug(topics, slug)}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
