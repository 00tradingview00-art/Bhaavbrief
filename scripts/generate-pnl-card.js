/**
 * scripts/generate-pnl-card.js
 *
 * Generates a 1080×1080 JPEG showing today's MCX Mini lot P&L impact.
 * "Today's move, in your pocket." — bridges market data to wallet reality.
 *
 * Posted as a second daily Instagram image after the edition card.
 * Usage: node scripts/generate-pnl-card.js [EDITION]
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'

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

function detectLatestEdition() {
  try {
    const files = readdirSync(join(ROOT, 'content/briefs'))
    const nums = files.map(f => f.match(/^edition-(\d+)\.mdx$/)?.[1]).filter(Boolean).map(Number)
    if (nums.length) return Math.max(...nums)
  } catch {}
  return 1
}
const EDITION   = parseInt(process.env.EDITION ?? '') || detectLatestEdition()
const BRIEFS_DIR = join(ROOT, 'content/briefs')
const OUT_DIR    = join(ROOT, 'public/instagram')

const BUNDLED_FONTS = join(ROOT, 'public/fonts')
;[
  [join(BUNDLED_FONTS, 'Inter-Regular.ttf'), 'Inter'],
  [join(BUNDLED_FONTS, 'Inter-Bold.ttf'),    'Inter'],
].forEach(([p, fam]) => { if (existsSync(p)) try { GlobalFonts.registerFromPath(p, fam) } catch {} })

// Design tokens — mirrors generate-instagram-card.js
const CREAM  = '#FAFAF6'
const INK    = '#18180F'
const INK_2  = '#48483A'
const INK_4  = '#8A8A7A'
const GOLD   = '#C8720A'
const BORDER = '#E0DFD5'
const GREEN  = '#166534'
const RED    = '#991818'
const GREEN_BG = '#F0FDF4'
const RED_BG   = '#FEF2F2'

const W = 1080, H = 1080, PAD = 72

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur); cur = word
    } else { cur = test }
  }
  if (cur) lines.push(cur)
  return lines
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

async function fetchPrices() {
  try {
    const r = await fetch('https://www.bhaavbrief.in/api/prices', { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

// MCX Mini lot specifications — fixed contract specs, not live data
const MINI_LOTS = [
  {
    name:     'MCX GOLD MINI',
    label:    'Gold Mini',
    sublabel: '100g lot',
    key:      'gold',
    pctKey:   'goldPct',
    unit:     '₹/10g',
    lotMult:  10,         // 100g = 10 × 10g
    margin:   '~₹60,000',
  },
  {
    name:     'MCX SILVER MINI',
    label:    'Silver Mini',
    sublabel: '5 kg lot',
    key:      'silver',
    pctKey:   'silverPct',
    unit:     '₹/kg',
    lotMult:  5,          // 5kg standard Silver mini
    margin:   '~₹8,000',
  },
  {
    name:     'MCX CRUDE MINI',
    label:    'Crude Mini',
    sublabel: '10 bbl lot',
    key:      'crude',
    pctKey:   'crudePct',
    unit:     '₹/bbl',
    lotMult:  10,         // 10 barrel mini lot
    margin:   '~₹5,500',
  },
]

function calcPnl(price, pct, lotMult) {
  if (price == null || pct == null) return null
  const changePerUnit = (price * Math.abs(pct)) / 100
  return Math.round(changePerUnit * lotMult)
}

function drawLotCard(ctx, lot, price, pct, x, y, w, h) {
  const pnl       = calcPnl(price, pct, lot.lotMult)
  const isUp      = (pct ?? 0) >= 0
  const cardBg    = isUp ? GREEN_BG : RED_BG
  const accent    = isUp ? GREEN : RED
  const arrow     = isUp ? '▲' : '▼'
  const sign      = isUp ? '+' : '−'

  // Card background
  ctx.fillStyle = cardBg
  roundRect(ctx, x, y, w, h, 16)
  ctx.fill()

  // Accent left bar
  ctx.fillStyle = accent
  ctx.fillRect(x, y, 6, h)
  roundRect(ctx, x, y, 6, h, 3)  // slight round on corners only
  ctx.fillRect(x, y, 6, h)

  // Instrument name
  ctx.fillStyle = INK_4
  ctx.font = `bold 17px Inter, sans-serif`
  ctx.letterSpacing = '2px'
  ctx.textAlign = 'left'
  ctx.fillText(lot.name, x + 24, y + 38)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = INK_4
  ctx.font = `15px Inter, sans-serif`
  ctx.fillText(lot.sublabel, x + 24, y + 60)

  // Price
  if (price != null) {
    ctx.fillStyle = INK
    ctx.font = `bold 28px Inter, sans-serif`
    ctx.fillText(`₹${Math.round(price).toLocaleString('en-IN')}`, x + 24, y + 96)
    ctx.fillStyle = INK_4
    ctx.font = `15px Inter, sans-serif`
    ctx.fillText(lot.unit, x + 24, y + 116)
  }

  // % change
  if (pct != null) {
    const pctStr = `${arrow} ${Math.abs(pct).toFixed(2)}%`
    ctx.fillStyle = accent
    ctx.font = `bold 22px Inter, sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText(pctStr, x + w - 20, y + 60)
    ctx.textAlign = 'left'
  }

  // P&L callout — the hero number
  if (pnl != null) {
    const pnlStr = `${sign}₹${pnl.toLocaleString('en-IN')}`
    ctx.fillStyle = accent
    ctx.font = `bold 44px Inter, sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText(pnlStr, x + w - 20, y + 110)
    ctx.textAlign = 'left'

    ctx.fillStyle = INK_4
    ctx.font = `14px Inter, sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText('on 1 mini lot', x + w - 20, y + 130)
    ctx.textAlign = 'left'
  }

  // Margin label
  ctx.fillStyle = INK_4
  ctx.font = `13px Inter, sans-serif`
  ctx.fillText(`Margin: ${lot.margin}`, x + 24, y + h - 18)
}

async function main() {
  const slug    = `edition-${String(EDITION).padStart(3, '0')}`
  const mdxPath = join(BRIEFS_DIR, `${slug}.mdx`)
  const dateStr = existsSync(mdxPath)
    ? new Date(matter(readFileSync(mdxPath, 'utf8')).data.date ?? Date.now())
        .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const prices = await fetchPrices()

  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  // Background
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)

  // Gold left accent bar
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, 10, H)

  // Header
  ctx.fillStyle = GOLD
  ctx.font = `bold 22px Inter, sans-serif`
  ctx.letterSpacing = '4px'
  ctx.fillText('BHAAVBRIEF', PAD, 86)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = INK_4
  ctx.font = `20px Inter, monospace`
  ctx.textAlign = 'right'
  ctx.fillText(dateStr, W - PAD, 86)
  ctx.textAlign = 'left'

  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 108); ctx.lineTo(W - PAD, 108); ctx.stroke()

  // Headline
  ctx.fillStyle = INK
  ctx.font = `bold 52px Inter, sans-serif`
  ctx.fillText("Today's move,", PAD, 192)
  ctx.fillStyle = GOLD
  ctx.fillText("in your pocket.", PAD, 254)

  ctx.fillStyle = INK_2
  ctx.font = `24px Inter, sans-serif`
  const subLines = wrapText(ctx, 'What 1 MCX Mini lot would have made or lost today', W - PAD * 2)
  let subY = 296
  for (const l of subLines.slice(0, 2)) { ctx.fillText(l, PAD, subY); subY += 36 }

  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, subY + 20); ctx.lineTo(W - PAD, subY + 20); ctx.stroke()

  // Three lot cards stacked vertically
  const cardX  = PAD
  const cardW  = W - PAD * 2
  const cardH  = 148
  const cardGap = 18
  let cardY = subY + 42

  for (const lot of MINI_LOTS) {
    const price = prices?.[lot.key] ?? null
    const pct   = prices?.[lot.pctKey] ?? null
    drawLotCard(ctx, lot, price, pct, cardX, cardY, cardW, cardH)
    cardY += cardH + cardGap
  }

  // Footer
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, H - 80); ctx.lineTo(W - PAD, H - 80); ctx.stroke()

  ctx.fillStyle = INK_4
  ctx.font = `18px Inter, monospace`
  ctx.fillText(`Edition #${EDITION}`, PAD, H - 40)

  ctx.fillStyle = GOLD
  ctx.font = `bold 18px Inter, sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText('bhaavbrief.in', W - PAD, H - 40)
  ctx.textAlign = 'left'

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  const outPath = join(OUT_DIR, `${slug}-pnl.jpg`)
  writeFileSync(outPath, canvas.toBuffer('image/jpeg', { quality: 92 }))
  console.log(`P&L card saved: ${outPath}`)
}

main().catch(e => { console.error('P&L card generation failed:', e); process.exit(1) })
