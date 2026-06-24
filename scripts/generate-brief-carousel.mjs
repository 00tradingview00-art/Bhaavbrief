/**
 * generate-brief-carousel.mjs
 *
 * Generates a 5-slide Instagram carousel for a daily brief, then posts it.
 * Slides are saved to public/instagram/carousel/ and pushed to GitHub so they
 * get a publicly accessible raw URL (no Vercel deploy wait needed).
 *
 * Usage: EDITION=51 ANTHROPIC_API_KEY=... node scripts/generate-brief-carousel.mjs
 *
 * Env (loaded from .env.local automatically):
 *   EDITION                — brief edition number
 *   ANTHROPIC_API_KEY      — for Haiku slide copy extraction
 *   INSTAGRAM_USER_ID      — Meta Graph API user ID
 *   INSTAGRAM_ACCESS_TOKEN — Meta Graph API token
 *   GITHUB_REPO            — e.g. "00tradingview00-art/Bhaavbrief" (default)
 *   GITHUB_BRANCH          — default "main"
 */

import Anthropic from '@anthropic-ai/sdk'
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import matter from 'gray-matter'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const envFile = join(__dirname, '../.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const EDITION    = parseInt(process.env.EDITION ?? '1')
const IG_USER    = process.env.INSTAGRAM_USER_ID
const IG_TOKEN   = process.env.INSTAGRAM_ACCESS_TOKEN
const GH_REPO    = process.env.GITHUB_REPO ?? '00tradingview00-art/Bhaavbrief'
const GH_BRANCH  = process.env.GITHUB_BRANCH ?? 'main'
const SLUG       = `edition-${String(EDITION).padStart(3, '0')}`
const OUT_DIR    = join(process.cwd(), 'public/instagram/carousel')
const BRIEFS_DIR = join(process.cwd(), 'content/briefs')

// Load bundled Inter fonts — Inter has full ₹ glyph (U+20B9) support.
const BUNDLED_FONTS = join(process.cwd(), 'public/fonts')
;[
  [join(BUNDLED_FONTS, 'Inter-Regular.ttf'), 'Inter'],
  [join(BUNDLED_FONTS, 'Inter-Bold.ttf'),    'Inter'],
].forEach(([p, fam]) => { if (existsSync(p)) try { GlobalFonts.registerFromPath(p, fam) } catch {} })

// ── Design tokens (same palette as generate-instagram-card.js) ──────────────
const CREAM  = '#FAFAF6'
const INK    = '#18180F'
const INK_2  = '#48483A'
const INK_4  = '#8A8A7A'
const GOLD   = '#C8720A'
const BORDER = '#E0DFD5'
const GREEN  = '#166534'
const RED    = '#991818'
const W = 1080, H = 1080, PAD = 72

function serif(size, weight = 'normal') { return `${weight} ${size}px Inter, Georgia, serif` }
function sans(size, weight = 'normal')  { return `${weight} ${size}px Inter, Arial, sans-serif` }
function mono(size)                     { return `${size}px Inter, "Courier New", monospace` }

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = word }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

// ── Shared slide chrome ──────────────────────────────────────────────────────
function drawChrome(ctx, { slideNum, totalSlides, dateStr, edition }) {
  // Background
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)

  // Gold left accent bar
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, 8, H)

  // Header
  ctx.fillStyle = GOLD
  ctx.font = sans(20, 'bold')
  ctx.letterSpacing = '4px'
  ctx.fillText('BHAAVBRIEF', PAD, 78)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = INK_4
  ctx.font = mono(18)
  ctx.textAlign = 'right'
  ctx.fillText(`Edition #${edition}  ·  ${dateStr}`, W - PAD, 78)
  ctx.textAlign = 'left'

  // Header divider
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 98); ctx.lineTo(W - PAD, 98); ctx.stroke()

  // Footer divider
  ctx.beginPath(); ctx.moveTo(PAD, H - 72); ctx.lineTo(W - PAD, H - 72); ctx.stroke()

  // Slide dots
  const dotTotal = totalSlides
  const dotR = 5, dotGap = 18
  const totalDotW = dotTotal * dotR * 2 + (dotTotal - 1) * (dotGap - dotR * 2)
  let dx = (W - totalDotW) / 2
  for (let i = 0; i < dotTotal; i++) {
    ctx.beginPath()
    ctx.arc(dx + dotR, H - 36, dotR, 0, Math.PI * 2)
    ctx.fillStyle = i === slideNum - 1 ? GOLD : BORDER
    ctx.fill()
    dx += dotGap
  }

  // bhaavbrief.in
  ctx.fillStyle = GOLD
  ctx.font = sans(18, 'bold')
  ctx.textAlign = 'right'
  ctx.fillText('bhaavbrief.in', W - PAD, H - 36)
  ctx.textAlign = 'left'
}

// ── Section label ────────────────────────────────────────────────────────────
function drawSectionLabel(ctx, label, y) {
  ctx.fillStyle = GOLD
  ctx.font = sans(16, 'bold')
  ctx.letterSpacing = '3px'
  ctx.fillText(label, PAD, y)
  ctx.letterSpacing = '0px'
}

// ── Slide 1: Cover ───────────────────────────────────────────────────────────
function drawSlide1(ctx, { title, desc, dateStr, edition, prices }) {
  drawChrome(ctx, { slideNum: 1, totalSlides: 5, dateStr, edition })

  // Title
  ctx.fillStyle = INK
  ctx.font = serif(52, 'bold')
  const titleLines = wrapText(ctx, title, W - PAD * 2)
  let y = 200
  for (const line of titleLines.slice(0, 4)) {
    ctx.fillText(line, PAD, y)
    y += 68
  }

  // Description
  y += 12
  ctx.fillStyle = INK_2
  ctx.font = sans(26)
  const descLines = wrapText(ctx, desc, W - PAD * 2)
  for (const line of descLines.slice(0, 3)) {
    ctx.fillText(line, PAD, y)
    y += 40
  }

  // Price strip
  const stripY = H - 200
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, stripY); ctx.lineTo(W - PAD, stripY); ctx.stroke()

  const cols = [
    { label: 'MCX GOLD',   ...prices.gold   },
    { label: 'MCX CRUDE',  ...prices.crude  },
    { label: 'MCX SILVER', ...prices.silver },
  ]
  const colW = (W - PAD * 2) / 3
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i]
    const x = PAD + i * colW
    ctx.fillStyle = INK_4
    ctx.font = sans(15, 'bold')
    ctx.letterSpacing = '2px'
    ctx.fillText(col.label, x, stripY + 38)
    ctx.letterSpacing = '0px'

    ctx.fillStyle = INK
    ctx.font = sans(32, 'bold')
    ctx.fillText(col.price != null ? `₹${col.price.toLocaleString('en-IN')}` : '—', x, stripY + 80)

    if (col.pct != null) {
      const n = parseFloat(col.pct)
      ctx.fillStyle = n >= 0 ? GREEN : RED
      ctx.font = sans(22)
      ctx.fillText(`${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(2)}%`, x, stripY + 112)
    }
  }
}

// ── Slide 2: Price Bridge ────────────────────────────────────────────────────
function drawSlide2(ctx, { dateStr, edition, rows }) {
  drawChrome(ctx, { slideNum: 2, totalSlides: 5, dateStr, edition })
  drawSectionLabel(ctx, 'PRICE BRIDGE', 142)

  // Divider under label
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 158); ctx.lineTo(W - PAD, 158); ctx.stroke()

  // Column headers
  const COL = { commodity: PAD, global: PAD + 280, usdinr: PAD + 540, mcx: PAD + 680 }
  ctx.fillStyle = INK_4
  ctx.font = sans(16, 'bold')
  ctx.letterSpacing = '2px'
  ctx.fillText('COMMODITY', COL.commodity, 198)
  ctx.fillText('GLOBAL', COL.global, 198)
  ctx.fillText('₹/$', COL.usdinr, 198)
  ctx.fillText('MCX', COL.mcx, 198)
  ctx.letterSpacing = '0px'

  ctx.strokeStyle = BORDER
  ctx.beginPath(); ctx.moveTo(PAD, 212); ctx.lineTo(W - PAD, 212); ctx.stroke()

  // Rows
  let rowY = 268
  for (const row of rows) {
    ctx.fillStyle = GOLD
    ctx.font = serif(22, 'bold')
    ctx.fillText(row.name, COL.commodity, rowY)

    ctx.fillStyle = INK_2
    ctx.font = sans(22)
    ctx.fillText(row.global, COL.global, rowY)
    ctx.fillText(row.usdinr, COL.usdinr, rowY)

    ctx.fillStyle = INK
    ctx.font = sans(22, 'bold')
    ctx.fillText(row.mcx, COL.mcx, rowY)

    // Day change
    const n = parseFloat(row.pct)
    ctx.fillStyle = n >= 0 ? GREEN : RED
    ctx.font = sans(18)
    ctx.textAlign = 'right'
    ctx.fillText(`${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(2)}%`, W - PAD, rowY)
    ctx.textAlign = 'left'

    // Row divider
    ctx.strokeStyle = BORDER
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(PAD, rowY + 18); ctx.lineTo(W - PAD, rowY + 18); ctx.stroke()

    rowY += 72
  }

  // GSR callout
  const gsrY = rowY + 20
  ctx.fillStyle = INK_4
  ctx.font = sans(20)
  ctx.fillText('Gold-Silver Ratio', PAD, gsrY)
  ctx.fillStyle = INK
  ctx.font = sans(20, 'bold')
  ctx.textAlign = 'right'
  ctx.fillText(rows.find(r => r.gsr) ? rows.find(r => r.gsr).gsr : '', W - PAD, gsrY)
  ctx.textAlign = 'left'
}

// ── Slide 3: Macro Thread ────────────────────────────────────────────────────
function drawSlide3(ctx, { dateStr, edition, headline, bullets }) {
  drawChrome(ctx, { slideNum: 3, totalSlides: 5, dateStr, edition })
  drawSectionLabel(ctx, 'MACRO THREAD', 142)

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 158); ctx.lineTo(W - PAD, 158); ctx.stroke()

  // Headline
  ctx.fillStyle = INK
  ctx.font = serif(34, 'bold')
  const hLines = wrapText(ctx, headline, W - PAD * 2)
  let y = 222
  for (const l of hLines.slice(0, 3)) { ctx.fillText(l, PAD, y); y += 50 }

  y += 20
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(PAD + 60, y); ctx.stroke()
  ctx.lineWidth = 1
  y += 36

  // Bullets
  for (const bullet of bullets.slice(0, 4)) {
    // Dot
    ctx.fillStyle = GOLD
    ctx.beginPath(); ctx.arc(PAD + 8, y - 8, 5, 0, Math.PI * 2); ctx.fill()

    ctx.fillStyle = INK_2
    ctx.font = sans(24)
    const bLines = wrapText(ctx, bullet, W - PAD * 2 - 28)
    for (const bl of bLines.slice(0, 2)) {
      ctx.fillText(bl, PAD + 24, y)
      y += 36
    }
    y += 14
  }
}

// ── Slide 4: The Market Is Saying ───────────────────────────────────────────
function drawSlide4(ctx, { dateStr, edition, insight, stats }) {
  drawChrome(ctx, { slideNum: 4, totalSlides: 5, dateStr, edition })
  drawSectionLabel(ctx, 'THE MARKET IS SAYING', 142)

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 158); ctx.lineTo(W - PAD, 158); ctx.stroke()

  // Main insight (bold callout box)
  const boxY = 178
  ctx.fillStyle = '#F5F0E8'
  roundRect(ctx, PAD, boxY, W - PAD * 2, 0, 8)
  ctx.fillStyle = INK
  ctx.font = serif(30, 'bold')
  const iLines = wrapText(ctx, insight, W - PAD * 2 - 32)
  let y = boxY + 46
  for (const l of iLines.slice(0, 4)) { ctx.fillText(l, PAD + 16, y); y += 46 }
  const boxH = y - boxY + 20
  ctx.fillStyle = '#F5F0E8'
  roundRect(ctx, PAD, boxY, W - PAD * 2, boxH, 8)
  ctx.fill()
  // redraw text on top
  ctx.fillStyle = INK
  ctx.font = serif(30, 'bold')
  y = boxY + 46
  for (const l of iLines.slice(0, 4)) { ctx.fillText(l, PAD + 16, y); y += 46 }
  y += 36

  // Stat pills
  for (const stat of stats.slice(0, 4)) {
    const n = parseFloat(stat.pct)
    ctx.fillStyle = n >= 0 ? '#DCFCE7' : '#FEE2E2'
    ctx.strokeStyle = n >= 0 ? GREEN : RED
    ctx.lineWidth = 1
    roundRect(ctx, PAD, y - 26, W - PAD * 2, 42, 6)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = INK
    ctx.font = sans(22, 'bold')
    ctx.fillText(stat.label, PAD + 16, y)

    ctx.fillStyle = n >= 0 ? GREEN : RED
    ctx.font = sans(22, 'bold')
    ctx.textAlign = 'right'
    ctx.fillText(`${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(2)}%  ${stat.price}`, W - PAD - 12, y)
    ctx.textAlign = 'left'

    y += 56
  }
}

// ── Slide 5: Edge of the Day ─────────────────────────────────────────────────
function drawSlide5(ctx, { dateStr, edition, edge, tomorrow, killIt }) {
  drawChrome(ctx, { slideNum: 5, totalSlides: 5, dateStr, edition })
  drawSectionLabel(ctx, 'WATCH TODAY', 142)

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 158); ctx.lineTo(W - PAD, 158); ctx.stroke()

  let y = 214

  // Edge callout
  ctx.fillStyle = GOLD
  ctx.font = sans(16, 'bold')
  ctx.letterSpacing = '2px'
  ctx.fillText('EDGE OF THE DAY', PAD, y)
  ctx.letterSpacing = '0px'
  y += 28
  ctx.fillStyle = INK
  ctx.font = serif(26, 'bold')
  const eLines = wrapText(ctx, edge, W - PAD * 2)
  for (const l of eLines.slice(0, 3)) { ctx.fillText(l, PAD, y); y += 40 }

  y += 24
  ctx.strokeStyle = BORDER; ctx.lineWidth = 0.5
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 32

  // What kills it
  ctx.fillStyle = RED
  ctx.font = sans(16, 'bold')
  ctx.letterSpacing = '2px'
  ctx.fillText('WHAT KILLS IT', PAD, y)
  ctx.letterSpacing = '0px'
  y += 28
  ctx.fillStyle = INK_2
  ctx.font = sans(24)
  const kLines = wrapText(ctx, killIt, W - PAD * 2)
  for (const l of kLines.slice(0, 3)) { ctx.fillText(l, PAD, y); y += 36 }

  y += 24
  ctx.strokeStyle = BORDER; ctx.lineWidth = 0.5
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 32

  // Tomorrow watch
  ctx.fillStyle = GOLD
  ctx.font = sans(16, 'bold')
  ctx.letterSpacing = '2px'
  ctx.fillText('TOMORROW', PAD, y)
  ctx.letterSpacing = '0px'
  y += 28
  ctx.fillStyle = INK_2
  ctx.font = sans(24)
  const tLines = wrapText(ctx, tomorrow, W - PAD * 2)
  for (const l of tLines.slice(0, 3)) { ctx.fillText(l, PAD, y); y += 36 }
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

// ── Haiku: extract slide copy ────────────────────────────────────────────────
async function extractSlideCopy(briefContent, snapshot) {
  const client = new Anthropic()
  const prices = snapshot.instruments

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Extract slide copy from this MCX commodity brief for Instagram carousel slides.
Return ONLY valid JSON, no markdown, no commentary.

Brief:
${briefContent}

Return this exact JSON shape:
{
  "slide3_headline": "One punchy sentence (max 12 words) summarising the dominant narrative",
  "slide3_bullets": ["bullet 1 (max 12 words)", "bullet 2", "bullet 3", "bullet 4"],
  "slide4_insight": "The single sharpest market insight (2 sentences max, 30 words total)",
  "slide5_edge": "The one price level or event to watch today (1-2 sentences, 25 words max)",
  "slide5_killit": "What reverses the narrative (1 sentence, 20 words max)",
  "slide5_tomorrow": "Key data / event due tomorrow (1 sentence, 20 words max)",
  "caption": "Instagram caption: hook line, 3 key data points, 3-4 hashtags, link placeholder [URL]"
}`
    }],
  })

  const raw = resp.content[0].text.replace(/^```(?:json)?\s*/m, '').replace(/\n?```\s*$/m, '').trim()
  return JSON.parse(raw)
}

// ── Instagram carousel posting ───────────────────────────────────────────────
async function checkStatus(containerId, retries = 10) {
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const r = await fetch(
      `https://graph.facebook.com/v22.0/${containerId}?fields=status_code&access_token=${IG_TOKEN}`
    )
    const d = await r.json()
    if (d.status_code === 'FINISHED') return true
    if (d.status_code === 'ERROR') throw new Error(`Container error: ${JSON.stringify(d)}`)
    console.log(`  Container ${containerId}: ${d.status_code ?? 'PENDING'} (${i + 1}/${retries})`)
  }
  return true
}

async function postCarousel(imageUrls, caption) {
  console.log('\nPosting carousel to Instagram...')

  // Step 1 — Create child containers
  const childIds = []
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i]
    console.log(`  Creating child ${i + 1}/${imageUrls.length}: ${url}`)
    const r = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: IG_TOKEN }),
    })
    const d = await r.json()
    if (d.error) throw new Error(`Child container failed: ${d.error.message}`)
    childIds.push(d.id)
    console.log(`  Child container created: ${d.id}`)
  }

  // Wait for all child containers to finish processing
  console.log('  Waiting for child containers to process...')
  for (const id of childIds) await checkStatus(id)

  // Step 2 — Create carousel container
  console.log('  Creating carousel container...')
  const carouselR = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption,
      access_token: IG_TOKEN,
    }),
  })
  const carouselD = await carouselR.json()
  if (carouselD.error) throw new Error(`Carousel container failed: ${carouselD.error.message}`)
  const carouselId = carouselD.id
  console.log(`  Carousel container: ${carouselId}`)

  // Step 3 — Publish
  console.log('  Publishing...')
  const publishR = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: carouselId, access_token: IG_TOKEN }),
  })
  const publishD = await publishR.json()
  if (publishD.error) throw new Error(`Publish failed: ${publishD.error.message}`)

  return publishD.id
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nBhaavBrief carousel — Edition #${EDITION}\n`)

  const mdxPath = join(BRIEFS_DIR, `${SLUG}.mdx`)
  if (!existsSync(mdxPath)) { console.error(`Brief not found: ${mdxPath}`); process.exit(1) }

  const { data, content } = matter(readFileSync(mdxPath, 'utf8'))
  const snapshotPath = join(process.cwd(), 'data/market-snapshot.json')
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'))
  const p = snapshot.instruments

  const dateStr = data.date
    ? new Date(data.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const edition = data.edition ?? EDITION

  // Extract slide copy via Haiku
  console.log('Extracting slide copy via Haiku...')
  const copy = await extractSlideCopy(content, snapshot)
  console.log('Slide copy ready.')

  // Price data
  const prices = {
    gold:   { price: p.MCX_GOLD?.price,   pct: p.MCX_GOLD?.changePct },
    crude:  { price: p.MCX_CRUDE?.price,  pct: p.MCX_CRUDE?.changePct },
    silver: { price: p.MCX_SILVER?.price, pct: p.MCX_SILVER?.changePct },
  }
  const priceRows = [
    { name: 'Gold',   global: `$${p.COMEX_GOLD?.price}/oz`, usdinr: `₹${p.USDINR?.price}`, mcx: `₹${(p.MCX_GOLD?.price ?? 0).toLocaleString('en-IN')}/10g`, pct: p.MCX_GOLD?.changePct ?? 0 },
    { name: 'Silver', global: `$${p.COMEX_SILVER?.price}/oz`, usdinr: `₹${p.USDINR?.price}`, mcx: `₹${(p.MCX_SILVER?.price ?? 0).toLocaleString('en-IN')}/kg`, pct: p.MCX_SILVER?.changePct ?? 0, gsr: `GSR ${snapshot.derived?.goldSilverRatio?.toFixed(1)}x` },
    { name: 'Crude',  global: `$${p.WTI?.price}/bbl`, usdinr: `₹${p.USDINR?.price}`, mcx: `₹${(p.MCX_CRUDE?.price ?? 0).toLocaleString('en-IN')}/bbl`, pct: p.MCX_CRUDE?.changePct ?? 0 },
    { name: 'Copper', global: `—`, usdinr: `₹${p.USDINR?.price}`, mcx: `₹${(p.MCX_COPPER?.price ?? 0).toLocaleString('en-IN')}/kg`, pct: p.MCX_COPPER?.changePct ?? 0 },
  ]
  const marketStats = [
    { label: 'MCX Gold',   pct: p.MCX_GOLD?.changePct ?? 0,   price: `₹${(p.MCX_GOLD?.price ?? 0).toLocaleString('en-IN')}` },
    { label: 'MCX Silver', pct: p.MCX_SILVER?.changePct ?? 0, price: `₹${(p.MCX_SILVER?.price ?? 0).toLocaleString('en-IN')}` },
    { label: 'MCX Crude',  pct: p.MCX_CRUDE?.changePct ?? 0,  price: `₹${(p.MCX_CRUDE?.price ?? 0).toLocaleString('en-IN')}` },
    { label: 'MCX Copper', pct: p.MCX_COPPER?.changePct ?? 0, price: `₹${(p.MCX_COPPER?.price ?? 0).toLocaleString('en-IN')}` },
  ]

  // Generate slides
  mkdirSync(OUT_DIR, { recursive: true })
  const slidePaths = []

  const slideConfigs = [
    {
      draw: (ctx) => drawSlide1(ctx, { title: data.title, desc: data.description, dateStr, edition, prices }),
      file: `${SLUG}-slide-1.png`
    },
    {
      draw: (ctx) => drawSlide2(ctx, { dateStr, edition, rows: priceRows }),
      file: `${SLUG}-slide-2.png`
    },
    {
      draw: (ctx) => drawSlide3(ctx, { dateStr, edition, headline: copy.slide3_headline, bullets: copy.slide3_bullets }),
      file: `${SLUG}-slide-3.png`
    },
    {
      draw: (ctx) => drawSlide4(ctx, { dateStr, edition, insight: copy.slide4_insight, stats: marketStats }),
      file: `${SLUG}-slide-4.png`
    },
    {
      draw: (ctx) => drawSlide5(ctx, { dateStr, edition, edge: copy.slide5_edge, killIt: copy.slide5_killit, tomorrow: copy.slide5_tomorrow }),
      file: `${SLUG}-slide-5.png`
    },
  ]

  console.log('Generating slides...')
  for (const { draw, file } of slideConfigs) {
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')
    draw(ctx)
    const outPath = join(OUT_DIR, file)
    writeFileSync(outPath, canvas.toBuffer('image/png'))
    slidePaths.push(outPath)
    console.log(`  Saved: ${outPath}`)
  }

  // Push slides to GitHub so they get raw.githubusercontent.com URLs
  console.log('\nPushing slides to GitHub...')
  try {
    execSync(`git add ${slidePaths.map(p => `"${p}"`).join(' ')}`, { stdio: 'pipe' })
    execSync(`git commit -m "chore: carousel slides for Edition #${EDITION}"`, { stdio: 'pipe' })
    execSync('git push origin main', { stdio: 'pipe' })
    console.log('  Pushed.')
  } catch (e) {
    console.warn('  Git push warning (may already be committed):', e.message.slice(0, 80))
  }

  // Wait a few seconds for GitHub CDN to propagate
  console.log('  Waiting 8s for GitHub CDN...')
  await new Promise(r => setTimeout(r, 8000))

  // Build public Vercel URLs (public/ directory is served at root)
  const imageUrls = slidePaths.map(p => {
    const rel = p.replace(join(process.cwd(), 'public') + '/', '')
    return `https://bhaavbrief.in/${rel}?v=${Date.now()}`
  })

  // Build caption
  const briefUrl = `https://bhaavbrief.in/briefs/${SLUG}`
  const tags = (data.tags ?? []).map(t => ({
    'MCX Gold': '#MCXGold', 'MCX Silver': '#MCXSilver', 'MCX Crude': '#MCXCrude',
    'MCX Copper': '#MCXCopper', 'Geopolitics': '#Geopolitics', 'Macro': '#MacroEconomics'
  }[t])).filter(Boolean).join(' ')
  const caption = (copy.caption ?? `${data.title}\n\n${data.description}`)
    .replace('[URL]', briefUrl)
    + `\n\n${tags} #BhaavBrief #MCX #CommodityMarkets #IndianMarkets\n\nFull brief → ${briefUrl}`

  // Post carousel
  if (!IG_USER || !IG_TOKEN) {
    console.log('\nInstagram credentials not configured. Slides saved locally.')
    console.log('Image URLs (after push):', imageUrls)
    return
  }

  const postId = await postCarousel(imageUrls, caption)
  console.log(`\n✓ Carousel posted to Instagram: ${postId}`)
  console.log(`  Edition #${EDITION} — ${data.title}`)
}

main().catch(e => { console.error('Carousel failed:', e.message); process.exit(1) })
