import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = join(__dirname, '../.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const EDITION   = parseInt(process.env.EDITION ?? '1')
const BRIEFS_DIR = join(process.cwd(), 'content/briefs')
const OUT_DIR    = join(process.cwd(), 'public/instagram')

// Load bundled Inter fonts — Inter has full ₹ glyph (U+20B9) support.
const BUNDLED_FONTS = join(process.cwd(), 'public/fonts')
;[
  [join(BUNDLED_FONTS, 'Inter-Regular.ttf'), 'Inter'],
  [join(BUNDLED_FONTS, 'Inter-Bold.ttf'),    'Inter'],
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

const W = 1080, H = 1080, PAD = 80

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur)
      cur = word
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function serif(size, weight = 'normal') {
  return `${weight} ${size}px Inter, Georgia, serif`
}
function sans(size, weight = 'normal') {
  return `${weight} ${size}px Inter, Arial, sans-serif`
}
function mono(size) {
  return `${size}px Inter, "Courier New", monospace`
}

async function fetchPrices() {
  try {
    const r = await fetch('https://www.bhaavbrief.in/api/prices', { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return null
    const d = await r.json()
    return {
      gold:   { price: d.gold?.mcx,   pct: d.goldComexPct },
      crude:  { price: d.crude?.mcx,  pct: d.crudePct },
      silver: { price: d.silver?.mcx, pct: d.silverComexPct },
    }
  } catch { return null }
}

async function main() {
  const slug    = `edition-${String(EDITION).padStart(3, '0')}`
  const mdxPath = join(BRIEFS_DIR, `${slug}.mdx`)
  if (!existsSync(mdxPath)) { console.error(`Brief not found: ${mdxPath}`); process.exit(1) }

  const { data }  = matter(readFileSync(mdxPath, 'utf8'))
  const title     = data.title       ?? 'BhaavBrief'
  const desc      = data.description ?? ''
  const edition   = data.edition     ?? EDITION
  const dateStr   = data.date
    ? new Date(data.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const prices = await fetchPrices()

  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  // ── Background ───────────────────────────────────────────────────────────────
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)

  // Gold left accent bar
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, 10, H)

  // ── Header ───────────────────────────────────────────────────────────────────
  ctx.fillStyle = GOLD
  ctx.font = sans(22, 'bold')
  ctx.letterSpacing = '4px'
  ctx.fillText('BHAAVBRIEF', PAD, 86)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = INK_4
  ctx.font = mono(20)
  ctx.textAlign = 'right'
  ctx.fillText(dateStr, W - PAD, 86)
  ctx.textAlign = 'left'

  // Header divider
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, 108)
  ctx.lineTo(W - PAD, 108)
  ctx.stroke()

  // ── Title ────────────────────────────────────────────────────────────────────
  ctx.fillStyle = INK
  ctx.font = serif(56, 'bold')
  const titleLines = wrapText(ctx, title, W - PAD * 2)
  let y = 210
  for (const line of titleLines.slice(0, 4)) {
    ctx.fillText(line, PAD, y)
    y += 72
  }

  // ── Description ──────────────────────────────────────────────────────────────
  y += 16
  ctx.fillStyle = INK_2
  ctx.font = sans(28)
  const descLines = wrapText(ctx, desc, W - PAD * 2)
  for (const line of descLines.slice(0, 3)) {
    ctx.fillText(line, PAD, y)
    y += 44
  }

  // ── Price strip ──────────────────────────────────────────────────────────────
  const priceTop = H - 270

  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, priceTop)
  ctx.lineTo(W - PAD, priceTop)
  ctx.stroke()

  if (prices) {
    const colW = (W - PAD * 2) / 3
    const cols = [
      { label: 'MCX GOLD',   d: prices.gold,   x: PAD },
      { label: 'MCX CRUDE',  d: prices.crude,  x: PAD + colW },
      { label: 'MCX SILVER', d: prices.silver, x: PAD + colW * 2 },
    ]

    for (const col of cols) {
      ctx.fillStyle = INK_4
      ctx.font = sans(17, 'bold')
      ctx.letterSpacing = '2px'
      ctx.fillText(col.label, col.x, priceTop + 46)
      ctx.letterSpacing = '0px'

      ctx.fillStyle = INK
      ctx.font = sans(38, 'bold')
      const p = col.d?.price
      ctx.fillText(p != null ? `₹${Math.round(p).toLocaleString('en-IN')}` : '—', col.x, priceTop + 96)

      const pct = col.d?.pct
      if (pct != null) {
        const n = parseFloat(pct)
        ctx.fillStyle = n >= 0 ? GREEN : RED
        ctx.font = sans(24)
        ctx.fillText(`${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(2)}%`, col.x, priceTop + 134)
      }
    }
  } else {
    ctx.fillStyle = INK_4
    ctx.font = sans(24)
    ctx.fillText('Prices unavailable', PAD, priceTop + 60)
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, H - 80)
  ctx.lineTo(W - PAD, H - 80)
  ctx.stroke()

  ctx.fillStyle = INK_4
  ctx.font = mono(20)
  ctx.fillText(`Edition #${edition}`, PAD, H - 40)

  ctx.fillStyle = GOLD
  ctx.font = sans(20, 'bold')
  ctx.textAlign = 'right'
  ctx.fillText('bhaavbrief.in', W - PAD, H - 40)
  ctx.textAlign = 'left'

  // ── Save ─────────────────────────────────────────────────────────────────────
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  const outPath = join(OUT_DIR, `${slug}.jpg`)
  writeFileSync(outPath, canvas.toBuffer('image/jpeg', { quality: 95 }))
  console.log(`Instagram card saved: ${outPath}`)
}

main().catch(e => { console.error('Card generation failed:', e); process.exit(1) })
