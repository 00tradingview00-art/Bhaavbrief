#!/usr/bin/env node
/**
 * scripts/check-reel-v2-consistency.mjs — CI check that every reels/v2/*.json
 * manifest marked review_status: "approved" actually passes its own current
 * gate (validateReelV2).
 *
 * Without this, the gate and the content can silently drift apart: a manifest
 * approved under yesterday's gate stays marked approved even after the gate
 * is tightened today, until someone happens to re-run validate-reel-v2.mjs or
 * produce-reel-v2.mjs by hand and notices. That drift already happened once
 * in this repo (an approved reel missing 4 newly-required editorial_brief
 * fields, caught only by manual review, not by CI) — this check makes the
 * same drift a build failure instead.
 *
 * Usage: node scripts/check-reel-v2-consistency.mjs
 * Exit:  0 = every approved manifest passes, 1 = drift found, 2 = couldn't run
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { validateReelV2 } from './lib/reelV2Compliance.mjs'

const ROOT = process.cwd()
const REELS_DIR = join(ROOT, 'reels/v2')

function main() {
  let claims = []
  try {
    claims = JSON.parse(readFileSync(join(ROOT, 'data/claims.json'), 'utf8')).claims ?? []
  } catch {
    // No ledger file yet — every historical-% claim below correctly fails
    // closed (nothing to match against), which is the safe default.
  }

  let manifestFiles
  try {
    manifestFiles = readdirSync(REELS_DIR).filter((f) => f.endsWith('.json'))
  } catch (error) {
    console.error(`Cannot read ${REELS_DIR}: ${error.message}`)
    process.exit(2)
  }

  const failures = []
  for (const file of manifestFiles) {
    const path = join(REELS_DIR, file)
    let reel
    try {
      reel = JSON.parse(readFileSync(path, 'utf8'))
    } catch (error) {
      failures.push({ file, issues: [`Invalid JSON: ${error.message}`] })
      continue
    }
    if (reel?.review_status !== 'approved') continue // drafts/concepts are expected to fail the gate
    const issues = validateReelV2(reel, claims).filter((issue) => issue !== 'Reel is not human-approved')
    if (issues.length) failures.push({ file, issues })
  }

  if (failures.length === 0) {
    console.log(`Reel V2 consistency: ${manifestFiles.length} manifest(s) checked, all approved reels pass their own gate.`)
    process.exit(0)
  }

  console.error(`Reel V2 consistency: ${failures.length} approved manifest(s) fail the current gate:\n`)
  for (const { file, issues } of failures) {
    console.error(`${file}:`)
    for (const issue of issues) console.error(`  - ${issue}`)
  }
  process.exit(1)
}

main()
