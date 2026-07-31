#!/usr/bin/env node
/**
 * scripts/dev-preview-chart.mjs — fast, offline preview of a single
 * drawBeat-style chart, for iterating on scripts/lib/charts.mjs without
 * paying for a real Haiku + ElevenLabs + ffmpeg round-trip (~45s render
 * loop + real API cost) on every change.
 *
 * Deliberately does NOT import scripts/generate-brief-reel.mjs — that file
 * has no guard around its top-level execution (mode detection, the Haiku
 * call, the full render loop all run unconditionally as soon as the module
 * loads), so importing it for its drawBeat function would also trigger a
 * full real reel generation as a side effect. Instead this replicates just
 * the layout constants drawBeat uses (PAD/TOP_SAFE/BOT_SAFE/HEADER_BOTTOM,
 * the content-region split math) and calls the real, exported chart
 * primitives from scripts/lib/charts.mjs directly — those are the actual
 * functions under test. If drawBeat's layout constants change, update the
 * copies below to match (kept short and commented for exactly this reason).
 *
 * Usage:
 *   node scripts/dev-preview-chart.mjs                  # default icon_array example
 *   node scripts/dev-preview-chart.mjs two_bar           # two_bar example
 *   node scripts/dev-preview-chart.mjs sparkline         # sparkline example
 *
 * Writes .dev-chart-preview.png in the repo root (gitignored-by-convention;
 * not committed — this is a throwaway visual check, open it and look).
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drawIconArray, drawComparisonBars, drawSparkline } from './lib/charts.mjs'
import { getCloses } from './lib/historyReader.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Fonts — same registration as generate-brief-reel.mjs / generate-instagram-card.js.
// Missing either NotoSans or Inter silently degrades to tofu glyphs for ₹ —
// this bit the author once during this feature's own development.
for (const [file, family] of [
  ['public/fonts/NotoSans-Bold.ttf', 'NotoSans'],
  ['public/fonts/NotoSans-Regular.ttf', 'NotoSans'],
  ['public/fonts/Inter-Variable.ttf', 'Inter'],
]) {
  const p = join(ROOT, file)
  if (existsSync(p)) GlobalFonts.registerFromPath(p, family)
}

// Layout constants — copied from scripts/generate-brief-reel.mjs (drawBeat's
// content-region split). Keep these two files' numbers in sync by hand.
const W = 1080, H = 1920, PAD = 68
const TOP_SAFE = 168
const BOT_SAFE = H - 268
const HEADER_BOTTOM = TOP_SAFE + 148
const CREAM = '#FAFAF6', INK = '#18180F', INK_2 = '#2C2C22', INK_4 = '#8A8A7A'
const GOLD = '#C8720A', BORDER = '#E0DFD5', GREEN = '#1A7A4A', RED = '#C0392B'

const contentTop = HEADER_BOTTOM + 20
const contentBot = BOT_SAFE - 80
const fullH = contentBot - contentTop
const textBot = contentTop + fullH * 0.45
const chartTop = textBot + 60
const chartX = PAD, chartW = W - PAD * 2, chartH = contentBot - chartTop

const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')
ctx.fillStyle = CREAM
ctx.fillRect(0, 0, W, H)

// Minimal chrome for spatial context (not a full drawHeader/drawBeat replica —
// just enough to sanity-check the chart doesn't collide with where those
// would sit; run a real KEEP_FRAMES=1 generation for full-fidelity checks).
ctx.strokeStyle = BORDER; ctx.lineWidth = 1
ctx.beginPath(); ctx.moveTo(PAD, HEADER_BOTTOM); ctx.lineTo(W - PAD, HEADER_BOTTOM); ctx.stroke()
ctx.beginPath(); ctx.moveTo(PAD, BOT_SAFE - 58); ctx.lineTo(W - PAD, BOT_SAFE - 58); ctx.stroke()
ctx.fillStyle = INK_4
ctx.font = '18px "NotoSans", "Inter", sans-serif'
ctx.textAlign = 'left'
ctx.fillText('bhaavbrief.in', PAD, BOT_SAFE - 38)

// Sample beat text, same font/wrap treatment as drawBeat's main text block.
ctx.fillStyle = INK
ctx.font = 'bold 56px "NotoSans", "Inter", sans-serif'
ctx.fillText('Sample beat text goes', PAD, contentTop + 70)
ctx.fillText('here — check it clears', PAD, contentTop + 146)
ctx.fillStyle = INK_2
ctx.fillText('the chart below it.', PAD, contentTop + 222)

const mode = process.argv[2] ?? 'icon_array'

if (mode === 'icon_array') {
  const drew = drawIconArray(ctx, {
    x: chartX, y: chartTop, w: chartW,
    filled: 17, total: 20, unitLabel: 'x leverage',
    filledColor: GOLD, emptyColor: BORDER, textColor: INK,
  })
  console.log('drawIconArray returned:', drew)
} else if (mode === 'two_bar') {
  const drew = drawComparisonBars(ctx, {
    x: chartX, y: chartTop, w: chartW, h: chartH,
    bars: [
      { label: 'MCX Gold Mini margin', value: 65000, fmt: v => `₹${Math.round(v).toLocaleString('en-IN')}`, color: GOLD, emphasis: true },
      { label: 'Recommended capital', value: 112500, fmt: v => `₹${Math.round(v).toLocaleString('en-IN')}`, color: INK_4 },
    ],
    mutedColor: INK_4, textColor: INK,
  })
  console.log('drawComparisonBars returned:', drew)
} else if (mode === 'sparkline') {
  const closes = getCloses('MCX_GOLD', 7)
  const drew = drawSparkline(ctx, {
    x: chartX, y: chartTop, w: chartW, h: 160,
    closes: closes.length >= 2 ? closes : [141200, 141600, 141400, 141900, 142300, 142100, 142600],
    upColor: GREEN, downColor: RED,
  })
  console.log('drawSparkline returned:', drew, '(closes:', closes.length, 'real days found)')
} else {
  console.error(`Unknown mode "${mode}" — expected icon_array | two_bar | sparkline`)
  process.exit(1)
}

const outPath = join(ROOT, '.dev-chart-preview.png')
writeFileSync(outPath, canvas.toBuffer('image/png'))
console.log(`Wrote ${outPath}`)
