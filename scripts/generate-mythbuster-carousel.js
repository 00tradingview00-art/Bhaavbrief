// Generates 5 JPEG carousel slides for the weekly MCX Myth Buster series.
// Output: public/instagram/carousel-mythbuster-slide-N.jpg
// Usage: TOPIC=gold-price-set-in-india node scripts/generate-mythbuster-carousel.js
//        (omit TOPIC to advance to next in rotation automatically)

import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const envFile = join(ROOT, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const OUT_DIR = join(ROOT, 'public/instagram')
const FONTS   = join(ROOT, 'public/fonts')
;[
  [join(FONTS, 'Inter-Regular.ttf'), 'Inter'],
  [join(FONTS, 'Inter-Bold.ttf'),    'Inter'],
].forEach(([p, fam]) => { if (existsSync(p)) try { GlobalFonts.registerFromPath(p, fam) } catch {} })

// Design tokens — mirrors generate-instagram-carousel-slides.js
const CREAM  = '#FAFAF6'
const INK    = '#18180F'
const INK_2  = '#48483A'
const INK_4  = '#8A8A7A'
const GOLD   = '#C8720A'
const BORDER = '#E0DFD5'
const ACCENT = '#F0EDE6'
const MYTH_RED = '#991818'

const W = 1080, H = 1080, PAD = 80

function bold(size)    { return `bold ${size}px Inter` }
function regular(size) { return `${size}px Inter` }

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

function drawBrandBar(ctx) {
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, 10, H)
}

function drawFooter(ctx, left) {
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, H - 70); ctx.lineTo(W - PAD, H - 70); ctx.stroke()
  ctx.fillStyle = INK_4
  ctx.font = regular(17)
  ctx.fillText(left, PAD, H - 38)
  ctx.fillStyle = GOLD
  ctx.font = bold(18)
  ctx.textAlign = 'right'
  ctx.fillText('bhaavbrief.in', W - PAD, H - 38)
  ctx.textAlign = 'left'
}

// Slide 1: Cover — the myth, presented to be debunked
function drawCover(ctx, myth) {
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx)

  ctx.fillStyle = GOLD
  ctx.font = bold(20)
  ctx.letterSpacing = '4px'
  ctx.fillText('BHAAVBRIEF', PAD, 80)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = MYTH_RED
  ctx.font = bold(13)
  ctx.letterSpacing = '3px'
  ctx.fillText('MCX MYTH BUSTER', PAD, 230)
  ctx.letterSpacing = '0px'

  // First lines in white (the myth setup), last line in red ("They're wrong.")
  const coverLines  = myth.cover_lines ?? [myth.myth, "They're wrong."]
  const setupLines  = coverLines.slice(0, -1)
  const wrongLine   = coverLines[coverLines.length - 1]

  ctx.font = bold(58)
  let y = 298
  ctx.fillStyle = '#FFFFFF'
  for (const line of setupLines) {
    ctx.fillText(line, PAD, y)
    y += 76
  }
  ctx.fillStyle = MYTH_RED
  ctx.fillText(wrongLine, PAD, y)

  ctx.fillStyle = INK_4
  ctx.font = regular(20)
  ctx.fillText('Swipe to see the real mechanism →', PAD, H - 52)
  ctx.fillStyle = GOLD
  ctx.font = bold(18)
  ctx.textAlign = 'right'
  ctx.fillText('bhaavbrief.in', W - PAD, H - 52)
  ctx.textAlign = 'left'
}

// Slides 2-4: Mechanism — one explanatory point per slide
function drawMechSlide(ctx, slide, slideNum, total) {
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx)

  // Header
  ctx.fillStyle = GOLD
  ctx.font = bold(20)
  ctx.letterSpacing = '4px'
  ctx.fillText('BHAAVBRIEF', PAD, 80)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = INK_4
  ctx.font = regular(17)
  ctx.textAlign = 'right'
  ctx.fillText(`${slideNum} / ${total}`, W - PAD, 80)
  ctx.textAlign = 'left'
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 100); ctx.lineTo(W - PAD, 100); ctx.stroke()

  let y = 140

  // Series label
  ctx.fillStyle = MYTH_RED
  ctx.font = bold(12)
  ctx.letterSpacing = '3px'
  ctx.fillText('MCX MYTH BUSTER', PAD, y)
  ctx.letterSpacing = '0px'
  y += 36

  // Slide title
  ctx.fillStyle = INK
  ctx.font = bold(40)
  const titleLines = wrapText(ctx, slide.title, W - PAD * 2)
  for (const line of titleLines.slice(0, 2)) { ctx.fillText(line, PAD, y); y += 54 }
  y += 16

  // Body text
  ctx.fillStyle = INK_2
  ctx.font = regular(22)
  const bodyLines = wrapText(ctx, slide.body, W - PAD * 2)
  for (const line of bodyLines.slice(0, 6)) { ctx.fillText(line, PAD, y); y += 34 }
  y += 28

  // Callout box — key stat or formula traders will remember
  const boxPad  = 22
  const calloutLines = wrapText(ctx, slide.callout, W - PAD * 2 - boxPad * 2 - 8)
  const boxH    = Math.max(calloutLines.length * 32 + boxPad * 2, 72)

  ctx.fillStyle = ACCENT
  ctx.fillRect(PAD, y, W - PAD * 2, boxH)
  ctx.fillStyle = GOLD
  ctx.fillRect(PAD, y, 4, boxH)

  ctx.fillStyle = INK
  ctx.font = bold(19)
  let by = y + boxPad + 4
  for (const line of calloutLines) { ctx.fillText(line, PAD + boxPad + 4, by); by += 32 }

  drawFooter(ctx, `${slideNum} / ${total}`)
}

// Slide 5: Punchline + CTA
function drawCTA(ctx, myth) {
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx)

  ctx.fillStyle = GOLD
  ctx.font = bold(20)
  ctx.letterSpacing = '4px'
  ctx.fillText('BHAAVBRIEF', PAD, 80)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = GOLD
  ctx.font = bold(13)
  ctx.letterSpacing = '3px'
  ctx.fillText('THE PUNCHLINE', PAD, 232)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = '#FFFFFF'
  ctx.font = bold(48)
  const punchLines = wrapText(ctx, myth.punchline, W - PAD * 2)
  let y = 300
  for (const line of punchLines.slice(0, 4)) { ctx.fillText(line, PAD, y); y += 64 }

  ctx.fillStyle = INK_4
  ctx.font = regular(22)
  ctx.fillText('Every Wednesday — one MCX myth, busted.', PAD, y + 34)

  // CTA button
  const btnY = y + 96
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.roundRect(PAD, btnY, 500, 58, 6)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = bold(20)
  ctx.fillText('bhaavbrief.in — Free daily MCX brief', PAD + 22, btnY + 38)

  ctx.fillStyle = INK_4
  ctx.font = regular(17)
  ctx.fillText('Follow @bhaavbrief for daily MCX intelligence', PAD, H - 48)
}

function loadTopics() {
  const p = join(ROOT, 'data/mythbuster-topics.json')
  if (!existsSync(p)) throw new Error(`Missing data/mythbuster-topics.json`)
  return JSON.parse(readFileSync(p, 'utf8'))
}

function pickSlug(data) {
  if (process.env.TOPIC && data.myths[process.env.TOPIC]) return process.env.TOPIC
  if (process.env.TOPIC) {
    console.warn(`TOPIC="${process.env.TOPIC}" not found — using rotation`)
  }

  const histPath = join(ROOT, 'data/mythbuster-history.json')
  let nextIdx = 0
  if (existsSync(histPath)) {
    try {
      const h = JSON.parse(readFileSync(histPath, 'utf8'))
      const lastIdx = typeof h.rotationIndex === 'number' ? h.rotationIndex : -1
      nextIdx = (lastIdx + 1) % data.rotation.length
    } catch {}
  }
  return data.rotation[nextIdx]
}

function saveHistory(slug, data) {
  const histPath = join(ROOT, 'data/mythbuster-history.json')
  const idx = data.rotation.indexOf(slug)
  writeFileSync(histPath, JSON.stringify(
    { lastSlug: slug, lastDate: new Date().toISOString().slice(0, 10), rotationIndex: idx },
    null, 2,
  ))
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  const data = loadTopics()
  const slug = pickSlug(data)
  const myth = data.myths[slug]
  if (!myth) {
    console.error(`Topic not found: ${slug}. Available: ${Object.keys(data.myths).join(', ')}`)
    process.exit(1)
  }

  console.log(`Generating Myth Buster carousel: ${slug}`)

  const TOTAL = 5

  // Slide 1 — Cover
  {
    const canvas = createCanvas(W, H)
    drawCover(canvas.getContext('2d'), myth)
    const out = join(OUT_DIR, 'carousel-mythbuster-slide-1.jpg')
    writeFileSync(out, canvas.toBuffer('image/jpeg', { quality: 95 }))
    console.log(`Saved 1/${TOTAL}: ${out}`)
  }

  // Slides 2-4 — Mechanism (3 slides)
  for (let i = 0; i < myth.slides.length && i < 3; i++) {
    const canvas = createCanvas(W, H)
    drawMechSlide(canvas.getContext('2d'), myth.slides[i], i + 2, TOTAL)
    const out = join(OUT_DIR, `carousel-mythbuster-slide-${i + 2}.jpg`)
    writeFileSync(out, canvas.toBuffer('image/jpeg', { quality: 95 }))
    console.log(`Saved ${i + 2}/${TOTAL}: ${out}`)
  }

  // Slide 5 — CTA / punchline
  {
    const canvas = createCanvas(W, H)
    drawCTA(canvas.getContext('2d'), myth)
    const out = join(OUT_DIR, 'carousel-mythbuster-slide-5.jpg')
    writeFileSync(out, canvas.toBuffer('image/jpeg', { quality: 95 }))
    console.log(`Saved ${TOTAL}/${TOTAL}: ${out}`)
  }

  saveHistory(slug, data)
  console.log(`\nDone. History updated → data/mythbuster-history.json (slug: ${slug})`)
}

main().catch(e => { console.error(e); process.exit(1) })
