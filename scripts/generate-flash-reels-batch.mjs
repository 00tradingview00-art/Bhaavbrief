#!/usr/bin/env node
/**
 * scripts/generate-flash-reels-batch.mjs
 *
 * Reads today's flash articles, finds those flagged reelWorthy: true,
 * skips any that already have a rendered .mp4, and generates reels
 * for the rest by calling generate-flash-reel.mjs in sequence.
 *
 * Usage:
 *   node scripts/generate-flash-reels-batch.mjs           ← today only
 *   node scripts/generate-flash-reels-batch.mjs --all     ← all reel-worthy ever
 *   node scripts/generate-flash-reels-batch.mjs --dry-run ← list without rendering
 */

import { readdirSync, existsSync, readFileSync } from 'fs'
import { join, dirname, basename }               from 'path'
import { fileURLToPath }                         from 'url'
import { execFileSync }                          from 'child_process'
import matter                                    from 'gray-matter'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')
const FLASH_DIR = join(ROOT, 'content/flash')
const REELS_DIR = join(ROOT, 'public/reels')

const DRY_RUN = process.argv.includes('--dry-run')
const ALL     = process.argv.includes('--all')

// Today in IST (YYYY-MM-DD)
function todayIST() {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)
}

// Find all reel-worthy flash articles (today or all-time)
function findReelWorthy() {
  const today = todayIST()
  return readdirSync(FLASH_DIR)
    .filter(f => f.endsWith('.mdx'))
    .filter(f => ALL || f.startsWith(today))
    .map(f => {
      const full = join(FLASH_DIR, f)
      const { data } = matter(readFileSync(full, 'utf8'))
      return { file: full, slug: basename(f, '.mdx'), reelWorthy: data.reelWorthy === true }
    })
    .filter(x => x.reelWorthy)
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

// Check if reel already exists for this slug
function reelExists(slug) {
  return existsSync(join(REELS_DIR, `flash-${slug}.mp4`))
}

const candidates = findReelWorthy()

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  BhaavBrief — Flash Reel Batch`)
console.log(`  ${ALL ? 'All-time' : todayIST()} · ${candidates.length} reel-worthy article${candidates.length !== 1 ? 's' : ''}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

if (!candidates.length) {
  console.log('No reel-worthy flash articles found.')
  console.log('Articles are flagged when: price move ≥ 1.5%, or Geopolitics/Policy with non-neutral impact.\n')
  process.exit(0)
}

let rendered = 0, skipped = 0

for (const { file, slug } of candidates) {
  if (reelExists(slug)) {
    console.log(`⏭️   Already rendered: ${slug}`)
    skipped++
    continue
  }

  console.log(`🎬  ${slug}`)

  if (DRY_RUN) {
    console.log(`    (dry-run — skipping render)\n`)
    continue
  }

  try {
    execFileSync('node', ['scripts/generate-flash-reel.mjs', '--file', file], {
      cwd:   ROOT,
      stdio: 'inherit',
    })
    rendered++
  } catch (e) {
    console.error(`  ❌  Failed: ${e.message}`)
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  ✅  Rendered: ${rendered}  |  ⏭️   Skipped: ${skipped}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
