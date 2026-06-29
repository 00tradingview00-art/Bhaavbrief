// Generates 7 JPEG carousel slides for topic "what-moves-mcx"
// Output: public/instagram/carousel-what-moves-mcx-slide-N.jpg
// Usage: node scripts/generate-instagram-carousel-slides.js

import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = join(__dirname, '../.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const OUT_DIR = join(process.cwd(), 'public/instagram')
const FONTS   = join(process.cwd(), 'public/fonts')
;[
  [join(FONTS, 'Inter-Regular.ttf'), 'Inter'],
  [join(FONTS, 'Inter-Bold.ttf'),    'Inter'],
].forEach(([p, fam]) => { if (existsSync(p)) try { GlobalFonts.registerFromPath(p, fam) } catch {} })

// Design tokens
const CREAM  = '#FAFAF6'
const INK    = '#18180F'
const INK_2  = '#48483A'
const INK_4  = '#8A8A7A'
const GOLD   = '#C8720A'
const BORDER = '#E0DFD5'
const GREEN  = '#166534'
const RED    = '#991818'
const ACCENT = '#F0EDE6'

const W = 1080, H = 1080, PAD = 80

function bold(size)   { return `bold ${size}px Inter` }
function regular(size){ return `${size}px Inter` }

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

function drawHeader(ctx, right = '') {
  ctx.fillStyle = GOLD
  ctx.font = bold(20)
  ctx.letterSpacing = '4px'
  ctx.fillText('BHAAVBRIEF', PAD, 80)
  ctx.letterSpacing = '0px'
  if (right) {
    ctx.fillStyle = INK_4
    ctx.font = regular(17)
    ctx.textAlign = 'right'
    ctx.fillText(right, W - PAD, 80)
    ctx.textAlign = 'left'
  }
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 100); ctx.lineTo(W - PAD, 100); ctx.stroke()
}

function drawFooter(ctx, left, right) {
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, H - 70); ctx.lineTo(W - PAD, H - 70); ctx.stroke()
  ctx.fillStyle = INK_4
  ctx.font = regular(17)
  ctx.fillText(left, PAD, H - 38)
  ctx.fillStyle = GOLD
  ctx.font = bold(18)
  ctx.textAlign = 'right'
  ctx.fillText(right, W - PAD, H - 38)
  ctx.textAlign = 'left'
}

async function fetchPrices() {
  try {
    const r = await fetch('https://bhaavbrief.in/api/prices', { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return null
    const d = await r.json()
    return {
      gold:   { mcx: d.gold?.mcx,   pct: d.goldComexPct   },
      silver: { mcx: d.silver?.mcx, pct: d.silverComexPct },
      crude:  { mcx: d.crude?.mcx,  pct: d.crudePct       },
      copper: { mcx: d.copper?.mcx, pct: d.copperComexPct },
      natgas: { mcx: d.natgas?.mcx, pct: d.natgasPct      },
    }
  } catch { return null }
}

function fmtPrice(n) { return Math.round(n).toLocaleString('en-IN') }
function fmtPct(n)   { return `${n >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(n)).toFixed(2)}%` }
function pctColor(n) { return parseFloat(n) >= 0 ? GREEN : RED }

// ── Slide 1: Cover ────────────────────────────────────────────────────────────
function drawCover(ctx) {
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx)

  ctx.fillStyle = GOLD
  ctx.font = bold(20)
  ctx.letterSpacing = '4px'
  ctx.fillText('BHAAVBRIEF', PAD, 80)
  ctx.letterSpacing = '0px'

  // Label
  ctx.fillStyle = GOLD
  ctx.font = bold(14)
  ctx.letterSpacing = '3px'
  ctx.fillText('MCX INTELLIGENCE', PAD, 240)
  ctx.letterSpacing = '0px'

  // Title
  ctx.fillStyle = '#FFFFFF'
  ctx.font = bold(62)
  const lines = ['5 MCX', 'Commodities', '— What', 'Moves Each One']
  let y = 310
  for (const line of lines) { ctx.fillText(line, PAD, y); y += 80 }

  // Subtitle
  ctx.fillStyle = INK_4
  ctx.font = regular(24)
  ctx.fillText('Gold · Silver · Crude · Copper · NatGas', PAD, y + 30)

  // Footer hint
  ctx.fillStyle = INK_4
  ctx.font = regular(18)
  ctx.fillText('Swipe to read each one →', PAD, H - 50)
  ctx.fillStyle = GOLD
  ctx.font = bold(18)
  ctx.textAlign = 'right'
  ctx.fillText('bhaavbrief.in', W - PAD, H - 50)
  ctx.textAlign = 'left'
}

// ── Slides 2-6: Commodity slides ─────────────────────────────────────────────
const COMMODITIES = [
  {
    name: 'MCX GOLD', unit: '₹ / 10g', priceKey: 'gold',
    drivers: [
      'COMEX Gold — US session sets the overnight reference price',
      'USD/INR rate — rupee weakening lifts MCX even without COMEX moving',
      'Safe-haven demand — geopolitics, Fed rate expectations, central bank buying',
    ],
    insight: 'Every 1% rupee fall adds ~1% to MCX Gold independent of COMEX.',
  },
  {
    name: 'MCX SILVER', unit: '₹ / kg', priceKey: 'silver',
    drivers: [
      'COMEX Silver + gold-silver ratio (currently ~69x)',
      'Solar demand — each GW of panels consumes 90-120 tonnes of silver paste',
      'India jewellery + investment absorption (~20% of global supply)',
    ],
    insight: 'Silver has a monetary price AND an industrial floor from solar expansion.',
  },
  {
    name: 'MCX CRUDE', unit: '₹ / barrel', priceKey: 'crude',
    drivers: [
      'OPEC+ output decisions — production cuts or increases shift global balance',
      'US EIA Inventory Report — released Wednesdays 8:30 PM IST',
      'Brent crude spot (India imports Brent-linked crude, not WTI)',
    ],
    insight: 'India imports ~90% of its crude. A $5 Brent move = ₹8,000+ crore monthly cost shift.',
  },
  {
    name: 'MCX COPPER', unit: '₹ / kg', priceKey: 'copper',
    drivers: [
      'China trade data — 10th-13th monthly; China buys 55% of world copper',
      'LME Copper (London afternoon session sets the global price)',
      'India power grid + EV infrastructure capex',
    ],
    insight: "MCX Copper's beta to LME is ~0.75 — USD/INR absorbs or amplifies the difference.",
  },
  {
    name: 'MCX NATGAS', unit: '₹ / mmBtu', priceKey: 'natgas',
    drivers: [
      'US Henry Hub futures — the global benchmark for Indian contracts',
      'US LNG export volumes — higher exports tighten domestic US supply',
      'Monsoon season — depresses industrial demand Jun-Sep',
    ],
    insight: "NatGas is MCX's most volatile commodity — seasonal swings of 40-60% are normal.",
  },
]

function drawCommoditySlide(ctx, def, prices, slideNum, total) {
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx)

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  drawHeader(ctx, today)

  let y = 134

  // Commodity name
  ctx.fillStyle = GOLD
  ctx.font = bold(14)
  ctx.letterSpacing = '4px'
  ctx.fillText(def.name, PAD, y)
  ctx.letterSpacing = '0px'
  y += 30

  // Price
  const entry = prices?.[def.priceKey]
  const mcx   = entry?.mcx
  const pct   = entry?.pct

  if (mcx != null) {
    ctx.fillStyle = INK
    ctx.font = bold(52)
    ctx.fillText(`₹${fmtPrice(mcx)}`, PAD, y + 46)
    if (pct != null) {
      ctx.fillStyle = pctColor(pct)
      ctx.font = bold(24)
      ctx.fillText(fmtPct(pct), PAD, y + 82)
    }
    ctx.fillStyle = INK_4
    ctx.font = regular(16)
    ctx.fillText(def.unit + ' · MCX', PAD, y + 108)
    y += 126
  } else {
    y += 20
  }

  // Divider
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 22

  // Drivers label
  ctx.fillStyle = INK_4
  ctx.font = bold(13)
  ctx.letterSpacing = '3px'
  ctx.fillText('WHAT MOVES IT', PAD, y)
  ctx.letterSpacing = '0px'
  y += 22

  // Drivers
  for (const d of def.drivers) {
    ctx.fillStyle = GOLD
    ctx.font = bold(18)
    ctx.fillText('→', PAD, y + 4)

    ctx.fillStyle = INK_2
    ctx.font = regular(19)
    const lines = wrapText(ctx, d, W - PAD * 2 - 26)
    for (const line of lines) { ctx.fillText(line, PAD + 26, y); y += 28 }
    y += 8
  }

  y += 8

  // Insight box
  ctx.fillStyle = ACCENT
  const boxH = 64
  ctx.fillRect(PAD, y, W - PAD * 2, boxH)
  ctx.fillStyle = GOLD
  ctx.fillRect(PAD, y, 4, boxH)
  ctx.fillStyle = INK
  ctx.font = bold(17)
  const insightLines = wrapText(ctx, def.insight, W - PAD * 2 - 28)
  let iy = y + 22
  for (const line of insightLines.slice(0, 2)) { ctx.fillText(line, PAD + 18, iy); iy += 24 }

  drawFooter(ctx, `${slideNum} / ${total}`, 'bhaavbrief.in')
}

// ── Slide 7: CTA ──────────────────────────────────────────────────────────────
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
  ctx.font = bold(14)
  ctx.letterSpacing = '3px'
  ctx.fillText('EVERY WEEKDAY', PAD, 240)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = '#FFFFFF'
  ctx.font = bold(50)
  const lines = wrapText(ctx, 'We track all 5 at 9:30 AM, every morning — before MCX opens.', W - PAD * 2)
  let y = 310
  for (const line of lines.slice(0, 4)) { ctx.fillText(line, PAD, y); y += 66 }

  ctx.fillStyle = INK_4
  ctx.font = regular(22)
  ctx.fillText('Gold · Silver · Crude · Copper · NatGas', PAD, y + 24)
  ctx.fillText('Live prices · Global context · What it means', PAD, y + 54)

  // CTA button
  const btnY = y + 100
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.roundRect(PAD, btnY, 420, 56, 6)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = bold(20)
  ctx.fillText('bhaavbrief.in — Free daily brief', PAD + 20, btnY + 36)

  ctx.fillStyle = INK_4
  ctx.font = regular(16)
  ctx.fillText('Follow @bhaavbrief for daily MCX intelligence', PAD, H - 44)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  console.log('Fetching live prices...')
  const prices = await fetchPrices()
  if (!prices) console.warn('Could not fetch prices — slides will show placeholder')

  const TOTAL = 7

  // Slide 1 — Cover
  {
    const canvas = createCanvas(W, H)
    drawCover(canvas.getContext('2d'))
    const out = join(OUT_DIR, 'carousel-what-moves-mcx-slide-1.jpg')
    writeFileSync(out, canvas.toBuffer('image/jpeg', { quality: 95 }))
    console.log(`Saved slide 1/7: ${out}`)
  }

  // Slides 2-6 — Commodities
  for (let i = 0; i < COMMODITIES.length; i++) {
    const canvas = createCanvas(W, H)
    drawCommoditySlide(canvas.getContext('2d'), COMMODITIES[i], prices, i + 2, TOTAL)
    const out = join(OUT_DIR, `carousel-what-moves-mcx-slide-${i + 2}.jpg`)
    writeFileSync(out, canvas.toBuffer('image/jpeg', { quality: 95 }))
    console.log(`Saved slide ${i + 2}/7: ${out}`)
  }

  // Slide 7 — CTA
  {
    const canvas = createCanvas(W, H)
    drawCTA(canvas.getContext('2d'))
    const out = join(OUT_DIR, 'carousel-what-moves-mcx-slide-7.jpg')
    writeFileSync(out, canvas.toBuffer('image/jpeg', { quality: 95 }))
    console.log(`Saved slide 7/7: ${out}`)
  }

  console.log('\nAll 7 slides generated. Run: git add public/instagram/carousel-* && git push')
  console.log('Then: TOPIC=what-moves-mcx node scripts/post-instagram-carousel.js')
}

main().catch(e => { console.error(e); process.exit(1) })
