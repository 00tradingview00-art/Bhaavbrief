#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { validateReelV3 } from './lib/reelV3Compliance.mjs'

const queue = JSON.parse(readFileSync(new URL('../data/reel-v3-editorial-slate.json', import.meta.url), 'utf8')).reels
const ids = new Set()
const failures = []
for (const reel of queue) {
  const issues = validateReelV3(reel)
  if (ids.has(reel.id)) issues.push('Duplicate Reel ID')
  ids.add(reel.id)
  if (issues.length) failures.push({ id: reel.id, issues })
}
if (failures.length) {
  for (const failure of failures) console.error(`${failure.id}:\n${failure.issues.map(issue => `  - ${issue}`).join('\n')}`)
  process.exit(1)
}
console.log(`Reel V3 release contract: ${queue.length} queue entries pass.`)
