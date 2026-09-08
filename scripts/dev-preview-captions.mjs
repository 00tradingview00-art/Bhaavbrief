#!/usr/bin/env node
/**
 * scripts/dev-preview-captions.mjs — fast, offline preview of the synced
 * caption overlay (scripts/lib/charts.mjs's drawCaptionOverlay) against a
 * hand-written fake ElevenLabs alignment, for iterating on chunk
 * size/position/legibility without paying for a real ElevenLabs call —
 * doubly useful right now since with-timestamps needs real API credits to
 * test end-to-end. Same rationale/pattern as scripts/dev-preview-chart.mjs
 * (does not import generate-brief-reel.mjs — that file has no execution
 * guard, importing it would trigger a full real reel generation).
 *
 * Usage:
 *   node scripts/dev-preview-captions.mjs            # over a light (drawBeat-style) background
 *   node scripts/dev-preview-captions.mjs dark        # over a dark (drawHook/CTA-style) background
 *
 * Writes .dev-caption-preview.png in the repo root (not committed — this is
 * a throwaway visual check, open it and look).
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drawCaptionOverlay } from './lib/charts.mjs'
import { charAlignmentToWords, chunkWords, activeChunkForTime } from './lib/reelCaptions.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

for (const [file, family] of [
  ['public/fonts/NotoSans-Bold.ttf', 'NotoSans'],
  ['public/fonts/NotoSans-Regular.ttf', 'NotoSans'],
  ['public/fonts/Inter-Variable.ttf', 'Inter'],
]) {
  const p = join(ROOT, file)
  if (existsSync(p)) GlobalFonts.registerFromPath(p, family)
}

// Hand-written fake alignment — roughly matches real ElevenLabs' cadence
// (~13-15 characters/second for natural English speech) closely enough for
// layout iteration; not meant to be pixel-accurate to a real API response.
function fakeAlignment(text, charsPerSecond = 14) {
  const characters = text.split('')
  const character_start_times_seconds = []
  const character_end_times_seconds = []
  let t = 0
  for (const ch of characters) {
    const dur = /\s/.test(ch) ? 0.05 : 1 / charsPerSecond
    character_start_times_seconds.push(t)
    t += dur
    character_end_times_seconds.push(t)
  }
  return { characters, character_start_times_seconds, character_end_times_seconds }
}

const W = 1080, H = 1920
const BOT_SAFE = H - 268
const PAD = 68

const mode = process.argv[2] ?? 'light'
const bg = mode === 'dark' ? '#0F0A1A' : '#FAFAF6'
const fgHint = mode === 'dark' ? '#FFFFFF' : '#18180F'

const sampleText = "Gold rose globally but your jewellery got cheaper instead"
const chunks = chunkWords(charAlignmentToWords(fakeAlignment(sampleText)), 3)
console.log(`${chunks.length} chunk(s):`, chunks.map((c) => `"${c.text}" [${c.start.toFixed(2)}-${c.end.toFixed(2)}s]`).join(', '))

// Render one frame per chunk, stacked into one tall preview image so every
// chunk's wrapping/sizing can be checked at a glance without scrubbing video.
const rowH = 500
const canvas = createCanvas(W, rowH * chunks.length)
const ctx = canvas.getContext('2d')

chunks.forEach((chunk, i) => {
  const rowY = i * rowH
  ctx.fillStyle = bg
  ctx.fillRect(0, rowY, W, rowH)
  ctx.fillStyle = fgHint
  ctx.font = '20px "NotoSans", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`chunk ${i + 1}/${chunks.length} — "${chunk.text}"`, 20, rowY + 30)

  // Same placement math as generate-brief-reel.mjs's renderFrame call site —
  // keep these two in sync by hand if that placement changes.
  drawCaptionOverlay(ctx, {
    x: PAD, y: rowY + rowH - 200, w: W - PAD * 2, chunk,
  })
})

const outPath = join(ROOT, '.dev-caption-preview.png')
writeFileSync(outPath, canvas.toBuffer('image/png'))
console.log(`Wrote ${outPath}`)
