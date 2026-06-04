#!/usr/bin/env node
/**
 * One-time backfill: fetch Pexels cover images for flash articles missing one.
 * Run locally: node scripts/backfill-cover-images.js
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPexelsQuery } from './lib/pexels.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')
const FLASH_DIR = path.join(ROOT, 'content/flash')

// Load .env.local
const envFile = path.join(ROOT, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const PEXELS_KEY = process.env.PEXELS_API_KEY
if (!PEXELS_KEY) {
  console.error('PEXELS_API_KEY not set — check .env.local')
  process.exit(1)
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchPexels(query) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&size=medium`,
    { headers: { Authorization: PEXELS_KEY }, signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) {
    console.warn(`  Pexels ${res.status} for "${query}"`)
    return null
  }
  const data = await res.json()
  const photo = data.photos?.[0]
  return photo?.src?.large2x ?? photo?.src?.large ?? null
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return null
  return { fm: match[1], body: match[2] }
}

function extractField(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm'))
  return m?.[1]?.trim() ?? null
}

async function main() {
  const files = fs.readdirSync(FLASH_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .sort()

  const toProcess = files.filter(f => {
    const raw = fs.readFileSync(path.join(FLASH_DIR, f), 'utf8')
    return !raw.includes('coverImage:')
  })

  console.log(`${toProcess.length} articles missing coverImage (${files.length - toProcess.length} already have one)`)
  if (toProcess.length === 0) { console.log('Nothing to do.'); return }

  let done = 0, failed = 0

  for (const file of toProcess) {
    const fpath = path.join(FLASH_DIR, file)
    const raw   = fs.readFileSync(fpath, 'utf8')
    const parts = parseFrontmatter(raw)
    if (!parts) { console.warn(`  Skipping (bad frontmatter): ${file}`); failed++; continue }

    const title    = extractField(parts.fm, 'title')
    const category = extractField(parts.fm, 'category') ?? 'macro'
    if (!title) { console.warn(`  Skipping (no title): ${file}`); failed++; continue }

    const query     = getPexelsQuery(title, category)
    const imageUrl  = await fetchPexels(query)

    if (!imageUrl) {
      console.log(`  ✗ ${file.slice(0, 60)} [no result for "${query}"]`)
      failed++
    } else {
      // Inject coverImage after the last frontmatter line before closing ---
      const updatedFm = parts.fm.trimEnd() + `\ncoverImage: "${imageUrl}"`
      fs.writeFileSync(fpath, `---\n${updatedFm}\n---\n${parts.body}`, 'utf8')
      console.log(`  ✓ ${file.slice(0, 60)}`)
      done++
    }

    // 400ms between calls — stays well under Pexels 200 req/hour free tier
    await sleep(400)
  }

  console.log(`\nDone — ${done} patched, ${failed} skipped`)
  console.log('Review changes with: git diff content/flash/')
  console.log('Commit with: git add content/flash/ && git commit -m "chore: backfill cover images"')
}

main().catch(e => { console.error(e); process.exit(1) })
