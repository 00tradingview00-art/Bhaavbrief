// Generates 7 JPEG carousel slides for the weekly "Proof, Not Predictions" series —
// a dense, numbered list of real event-reaction stats pulled from data/claims.json.
// Output: public/instagram/carousel-proof-slide-N.jpg
// Usage: node scripts/generate-proof-carousel.js

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

// Design tokens — mirrors generate-mythbuster-carousel.js / generate-instagram-carousel-slides.js
const CREAM  = '#FAFAF6'
const INK    = '#18180F'
const INK_2  = '#48483A'
const INK_4  = '#8A8A7A'
const GOLD   = '#C8720A'
const BORDER = '#E0DFD5'
const ACCENT = '#F0EDE6'

const W = 1080, H = 1080, PAD = 80
const CLAIMS_PER_POST = 5

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

// Slide 1: Cover — the hook
function drawCover(ctx) {
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
  ctx.fillText('PROOF, NOT PREDICTIONS', PAD, 230)
  ctx.letterSpacing = '0px'

  ctx.font = bold(54)
  let y = 296
  ctx.fillStyle = '#FFFFFF'
  for (const line of ['We don’t guess what', 'moves MCX.', 'We measured it.']) {
    ctx.fillText(line, PAD, y)
    y += 68
  }

  ctx.fillStyle = GOLD
  ctx.font = bold(24)
  ctx.fillText(`${CLAIMS_PER_POST} numbers. 24 real sessions each.`, PAD, y + 40)

  ctx.fillStyle = INK_4
  ctx.font = regular(20)
  ctx.fillText('Swipe to check the math →', PAD, H - 52)
  ctx.fillStyle = GOLD
  ctx.font = bold(18)
  ctx.textAlign = 'right'
  ctx.fillText('bhaavbrief.in', W - PAD, H - 52)
  ctx.textAlign = 'left'
}

// Slides 2-6: one measured claim per slide
function drawClaimSlide(ctx, claim, slideNum, total) {
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx)

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

  ctx.fillStyle = GOLD
  ctx.font = bold(12)
  ctx.letterSpacing = '3px'
  ctx.fillText('PROOF, NOT PREDICTIONS', PAD, y)
  ctx.letterSpacing = '0px'
  y += 40

  // Event title
  ctx.fillStyle = INK
  ctx.font = bold(36)
  const titleLines = wrapText(ctx, claim.eventName, W - PAD * 2)
  for (const line of titleLines.slice(0, 2)) { ctx.fillText(line, PAD, y); y += 48 }
  y += 20

  // Big stat
  ctx.fillStyle = GOLD
  ctx.font = bold(72)
  ctx.fillText(`${claim.values.avgAbsMovePct}%`, PAD, y + 60)
  ctx.fillStyle = INK_4
  ctx.font = regular(20)
  ctx.fillText(`average move on MCX ${claim.commodityLabel}`, PAD, y + 92)
  y += 128

  // Divider
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 30

  // Callout — the full statement, plus sample size
  const boxPad = 22
  const calloutLines = wrapText(ctx, claim.statement, W - PAD * 2 - boxPad * 2 - 8)
  const boxH = Math.max(calloutLines.length * 30 + boxPad * 2, 72)

  ctx.fillStyle = ACCENT
  ctx.fillRect(PAD, y, W - PAD * 2, boxH)
  ctx.fillStyle = GOLD
  ctx.fillRect(PAD, y, 4, boxH)

  ctx.fillStyle = INK
  ctx.font = regular(18)
  let by = y + boxPad + 2
  for (const line of calloutLines) { ctx.fillText(line, PAD + boxPad + 4, by); by += 30 }
  y += boxH + 20

  ctx.fillStyle = INK_4
  ctx.font = regular(16)
  ctx.fillText(`Sample: ${claim.sample_period}`, PAD, y)

  drawFooter(ctx, `${slideNum} / ${total}`)
}

// Slide 7: CTA
function drawCTA(ctx) {
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
  ctx.fillText('EVERY FRIDAY', PAD, 232)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = '#FFFFFF'
  ctx.font = bold(46)
  const lines = wrapText(ctx, 'The numbers behind MCX, checked against real data.', W - PAD * 2)
  let y = 300
  for (const line of lines.slice(0, 4)) { ctx.fillText(line, PAD, y); y += 60 }

  ctx.fillStyle = INK_4
  ctx.font = regular(20)
  ctx.fillText('No opinions. No calls. Just what actually happened.', PAD, y + 30)

  const btnY = y + 92
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

// ── Claim selection + rotation ──────────────────────────────────────────────
const HISTORY_PATH = join(ROOT, 'data/proof-carousel-history.json')

function loadClaims() {
  const p = join(ROOT, 'data/claims.json')
  if (!existsSync(p)) throw new Error('Missing data/claims.json')
  const claims = JSON.parse(readFileSync(p, 'utf8')).claims ?? []
  if (claims.length === 0) throw new Error('data/claims.json has no claims')
  return claims
}

const EVENT_LABELS = {
  eia_natural_gas_storage:      'EIA Natural Gas Storage Report',
  eia_petroleum_status_report:  'EIA Petroleum Status Report',
  api_crude_inventories:        'API Crude Inventories',
  baker_hughes_rig_count:       'Baker Hughes US Rig Count',
  cftc_cot_report:              'CFTC Commitment of Traders Report',
}

const COMMODITY_LABELS = {
  natgas: 'Natural Gas', crude: 'Crude', gold: 'Gold', silver: 'Silver',
  copper: 'Copper', zinc: 'Zinc', aluminium: 'Aluminium', lead: 'Lead', nickel: 'Nickel',
}

function describeClaimId(claimId) {
  const [eventKey, commodityKey] = claimId.split('__')
  return {
    eventName: EVENT_LABELS[eventKey] ?? eventKey,
    commodityLabel: COMMODITY_LABELS[commodityKey] ?? commodityKey,
  }
}

function substituteTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? `{${k}}`)
}

function loadHistory() {
  if (!existsSync(HISTORY_PATH)) return { rotationIndex: -1 }
  try { return JSON.parse(readFileSync(HISTORY_PATH, 'utf8')) } catch { return { rotationIndex: -1 } }
}

function pickClaims(claims) {
  const history = loadHistory()
  const lastIndex = typeof history.rotationIndex === 'number' ? history.rotationIndex : -1
  const startIndex = (lastIndex + 1) % claims.length

  const picked = []
  for (let i = 0; i < Math.min(CLAIMS_PER_POST, claims.length); i++) {
    picked.push(claims[(startIndex + i) % claims.length])
  }

  const nextIndex = (startIndex + picked.length - 1) % claims.length
  return { picked, nextIndex }
}

function saveHistory(nextIndex, picked) {
  writeFileSync(HISTORY_PATH, JSON.stringify({
    rotationIndex: nextIndex,
    lastClaimIds: picked.map(c => c.claim_id),
    lastDate: new Date().toISOString().slice(0, 10),
  }, null, 2))
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  const claims = loadClaims()
  const { picked, nextIndex } = pickClaims(claims)

  const enriched = picked.map(c => ({
    claim_id: c.claim_id,
    ...describeClaimId(c.claim_id),
    values: c.values,
    statement: substituteTemplate(c.statement_template, c.values),
    sample_period: c.sample_period,
  }))

  console.log(`Generating Proof carousel with claims: ${enriched.map(c => c.claim_id).join(', ')}`)

  const TOTAL = 7

  // Slide 1 — Cover
  {
    const canvas = createCanvas(W, H)
    drawCover(canvas.getContext('2d'))
    const out = join(OUT_DIR, 'carousel-proof-slide-1.jpg')
    writeFileSync(out, canvas.toBuffer('image/jpeg', { quality: 95 }))
    console.log(`Saved 1/${TOTAL}: ${out}`)
  }

  // Slides 2-6 — Claims
  for (let i = 0; i < enriched.length; i++) {
    const canvas = createCanvas(W, H)
    drawClaimSlide(canvas.getContext('2d'), enriched[i], i + 2, TOTAL)
    const out = join(OUT_DIR, `carousel-proof-slide-${i + 2}.jpg`)
    writeFileSync(out, canvas.toBuffer('image/jpeg', { quality: 95 }))
    console.log(`Saved ${i + 2}/${TOTAL}: ${out}`)
  }

  // Slide 7 — CTA
  {
    const canvas = createCanvas(W, H)
    drawCTA(canvas.getContext('2d'))
    const out = join(OUT_DIR, 'carousel-proof-slide-7.jpg')
    writeFileSync(out, canvas.toBuffer('image/jpeg', { quality: 95 }))
    console.log(`Saved ${TOTAL}/${TOTAL}: ${out}`)
  }

  saveHistory(nextIndex, picked)
  console.log(`\nDone. History updated → data/proof-carousel-history.json (rotationIndex: ${nextIndex})`)
}

main().catch(e => { console.error(e); process.exit(1) })
