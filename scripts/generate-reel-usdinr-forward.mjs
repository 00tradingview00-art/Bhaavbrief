#!/usr/bin/env node
/**
 * scripts/generate-reel-usdinr-forward.mjs
 *
 * ⚠️  ONE-OFF, NOT A TEMPLATE — every number and the date "24 Jun 2026" below
 * (spot 94.70, forward premium 3.12%→2.80%, ₹11,000/$1L savings, the RBI-governor
 * quote) is hardcoded to that specific morning's story, unlike the other reel
 * scripts in this repo, which fetch live data at render time. This already ran
 * and its output is committed (public/reels/usdinr-forward-reel.mp4, 2026-06-24).
 * Do not re-run this as-is for a new date — it will silently relabel stale
 * figures as "this morning." Either hardcode a new day's real numbers before
 * re-running, or wire it to a live spot/forward-premium source first.
 *
 * Generates a 14-second 1080×1920 MP4 reel:
 *   0–2s  : Hook (dark bg, text fade-in)
 *   2–12s : Split screen — spot flat vs forward premium dropping
 *   12–14s: Payoff ("Spot's boring. Forward curve is the news.")
 *
 * Usage:
 *   node scripts/generate-reel-usdinr-forward.mjs
 *
 * Output:
 *   public/reels/usdinr-forward-reel.mp4
 */

import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Register Inter Bold (the only custom font in this repo)
const fontPath = join(ROOT, 'public/fonts/Inter-Bold.ttf')
if (existsSync(fontPath)) GlobalFonts.registerFromPath(fontPath, 'Inter')

// ── Real chart image (optional — drop public/chart-usdinr-spot.png to enable) ─
const CHART_IMG_PATH = join(ROOT, 'public/chart-usdinr-spot.png')
let spotChartImg = null
if (existsSync(CHART_IMG_PATH)) {
  spotChartImg = await loadImage(readFileSync(CHART_IMG_PATH))
  console.log('  Using real TradingView chart for spot panel')
}

// ── Canvas / timing ───────────────────────────────────────────────────────────
const W = 1080, H = 1920
const FPS = 30
const TOTAL_FRAMES = 14 * FPS  // 420

const HOOK_END  = 2  * FPS   // 60
const SPLIT_END = 12 * FPS   // 360

// ── Design tokens ─────────────────────────────────────────────────────────────
const CREAM  = '#FAFAF6'
const INK    = '#18180F'
const INK_2  = '#48483A'
const INK_4  = '#8A8A7A'
const GOLD   = '#C8720A'
const RED    = '#991818'
const GREEN  = '#166534'
const BORDER = '#E0DFD5'

// ── Math helpers ──────────────────────────────────────────────────────────────
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const lerp    = (a, b, t)   => a + (b - a) * t
const easeOut = t => 1 - Math.pow(1 - t, 3)
const easeIO  = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2

// ── Rounded-rect path ─────────────────────────────────────────────────────────
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

// ── Shared header ─────────────────────────────────────────────────────────────
function drawHeader(ctx, dark = false) {
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 10)

  ctx.fillStyle = GOLD
  ctx.font = 'bold 30px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '6px'
  ctx.fillText('BHAAVBRIEF', W / 2, 100)
  ctx.letterSpacing = '0px'
}

// ── Phase 1: Hook ─────────────────────────────────────────────────────────────
function drawHook(ctx, t) {
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)
  drawHeader(ctx, true)

  // Tagline
  ctx.fillStyle = INK_4
  ctx.font = '28px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Indian Commodities Intelligence', W / 2, 148)

  // Divider
  ctx.strokeStyle = '#2A2A20'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(80, 168); ctx.lineTo(W - 80, 168); ctx.stroke()

  // Main hook text — fades in fast
  const a1 = clamp(t * 5, 0, 1)
  ctx.globalAlpha = a1

  // Big number — instant attention
  ctx.globalAlpha = a1
  ctx.fillStyle = GOLD
  ctx.font = 'bold 140px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('₹11,000', W / 2, 780)

  ctx.fillStyle = CREAM
  ctx.font = 'bold 52px "Inter", sans-serif'
  ctx.fillText('saved per $1 lakh', W / 2, 868)
  ctx.fillText('booked forward', W / 2, 930)

  ctx.fillStyle = INK_4
  ctx.font = '36px "Inter", sans-serif'
  ctx.fillText('this morning.', W / 2, 990)

  // Sub-hook — delayed reveal
  ctx.globalAlpha = clamp((t - 0.4) * 4, 0, 1)
  ctx.fillStyle = '#3A3A30'
  ctx.font = '34px "Inter", sans-serif'
  ctx.fillText('Most traders were watching', W / 2, 1110)
  ctx.fillText('the spot rate.', W / 2, 1154)

  ctx.globalAlpha = clamp((t - 0.55) * 5, 0, 1)
  ctx.fillStyle = GOLD
  ctx.font = 'bold 42px "Inter", sans-serif'
  ctx.fillText('Wrong number.', W / 2, 1240)

  ctx.globalAlpha = 1
}

// ── Phase 2: Split screen ─────────────────────────────────────────────────────

function drawFlatChart(ctx, x, y, w, h) {
  const mid = y + h * 0.52

  // Grid lines
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  for (let i = 0; i <= 3; i++) {
    const gy = y + (h / 3) * i
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke()
  }
  ctx.setLineDash([])

  // Flat line with micro-noise (alive but boring)
  ctx.strokeStyle = INK_2
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const steps = 60
  for (let i = 0; i <= steps; i++) {
    const px = x + (w / steps) * i
    const noise = Math.sin(i * 2.1) * 3.5 + Math.cos(i * 3.7) * 2
    const py = mid + noise
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.stroke()

  // Price labels
  ctx.fillStyle = INK_4
  ctx.font = '22px "Inter", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('94.72', x - 4, y + 8)
  ctx.fillText('94.70', x - 4, mid + 6)
  ctx.fillText('94.68', x - 4, y + h - 6)
}

function drawDroppingChart(ctx, x, y, w, h, t) {
  // Line draws itself left-to-right as t increases
  const drawProg = clamp(t / 0.75, 0, 1)
  const STEPS = 80
  const visible = Math.floor(STEPS * drawProg)
  if (visible < 2) return

  const FLAT_FRAC = 0.38  // 38% of the chart is flat at the top

  // Grid
  ctx.strokeStyle = '#FFD0D0'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  for (let i = 0; i <= 3; i++) {
    const gy = y + (h / 3) * i
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke()
  }
  ctx.setLineDash([])

  // Drop line
  ctx.strokeStyle = RED
  ctx.lineWidth = 5
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (let i = 0; i < visible; i++) {
    const frac = i / STEPS
    const px = x + w * frac
    let py
    if (frac <= FLAT_FRAC) {
      py = y + h * 0.12
    } else {
      const df = (frac - FLAT_FRAC) / (1 - FLAT_FRAC)
      py = y + lerp(h * 0.12, h * 0.80, easeIO(df))
    }
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.stroke()

  // Start label always visible
  ctx.fillStyle = INK_4
  ctx.font = 'bold 22px "Inter", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('3.12%', x + 4, y + h * 0.12 - 10)

  // End label appears when line reaches the end
  if (drawProg > 0.85) {
    const endAlpha = clamp((drawProg - 0.85) / 0.15, 0, 1)
    ctx.globalAlpha = endAlpha

    ctx.fillStyle = RED
    ctx.font = 'bold 22px "Inter", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('2.80%', x + w - 4, y + h * 0.80 + 26)

    // Down arrow mid-chart
    ctx.fillStyle = RED
    ctx.font = '20px "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('▼ −12 bps', x + w * 0.5, y + h * 0.46)

    ctx.globalAlpha = 1
  }
}

function drawSplitScreen(ctx, t) {
  // Background
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)
  drawHeader(ctx)

  // Date
  ctx.fillStyle = INK_4
  ctx.font = '26px "Inter", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('24 Jun 2026', W - 80, 100)

  // Divider under header
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(80, 120); ctx.lineTo(W - 80, 120); ctx.stroke()

  // Context lines — appear with stagger
  const a0 = clamp(t * 6, 0, 1)
  ctx.globalAlpha = a0
  ctx.textAlign = 'center'
  ctx.fillStyle = INK
  ctx.font = 'bold 40px "Inter", sans-serif'
  ctx.fillText('RBI held spot at 94.70 all morning.', W / 2, 192)
  ctx.fillText('Then the governor spoke —', W / 2, 244)
  ctx.globalAlpha = clamp((t - 0.06) * 8, 0, 1)
  ctx.fillStyle = GOLD
  ctx.font = 'bold 36px "Inter", sans-serif'
  ctx.fillText('"no rate hike coming."', W / 2, 304)
  ctx.globalAlpha = clamp((t - 0.12) * 8, 0, 1)
  ctx.fillStyle = INK_4
  ctx.font = '30px "Inter", sans-serif'
  ctx.fillText('Forward premiums crashed. Importers won.', W / 2, 348)
  ctx.globalAlpha = 1

  // ── Panel geometry ──
  const PAD = 60
  const GAP = 30
  const PW  = (W - PAD * 2 - GAP) / 2   // ~465px each
  const PH  = 660
  const PY  = 370

  const LX = PAD           // left panel x
  const RX = PAD + PW + GAP // right panel x

  // ── LEFT PANEL: Spot ──────────────────────────────────────────────────────
  ctx.fillStyle = '#F0F0E8'
  roundRect(ctx, LX, PY, PW, PH, 20)
  ctx.fill()

  // Header strip
  ctx.fillStyle = '#E4E4D8'
  roundRect(ctx, LX, PY, PW, 72, 20)
  ctx.fill()
  ctx.fillRect(LX, PY + 52, PW, 20)  // square off bottom corners of strip

  ctx.fillStyle = INK_4
  ctx.font = 'bold 22px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '3px'
  ctx.fillText('SPOT USD/INR', LX + PW / 2, PY + 46)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = INK
  ctx.font = 'bold 72px "Inter", sans-serif'
  ctx.fillText('94.70', LX + PW / 2, PY + 136)

  // Change pill
  ctx.fillStyle = '#E8F5E9'
  roundRect(ctx, LX + PW/2 - 90, PY + 148, 180, 40, 20)
  ctx.fill()
  ctx.fillStyle = GREEN
  ctx.font = 'bold 24px "Inter", sans-serif'
  ctx.fillText('▲ 0.02%', LX + PW / 2, PY + 176)

  // Chart — real image or synthetic fallback
  const chartX = LX + 12, chartY = PY + 206, chartW = PW - 24, chartH = 280

  if (spotChartImg) {
    // Clip to rounded rect, then draw the TradingView screenshot
    ctx.save()
    roundRect(ctx, chartX, chartY, chartW, chartH, 10)
    ctx.clip()

    // Scale image to fill the chart area (crop from right — the empty future portion)
    // TradingView chart is landscape; we want the left ~60% where candles are
    const srcW = spotChartImg.width * 0.62
    const srcH = spotChartImg.height
    const srcX = 0
    const srcY = 0
    ctx.drawImage(spotChartImg, srcX, srcY, srcW, srcH, chartX, chartY, chartW, chartH)

    // Subtle cream overlay so text remains readable
    ctx.fillStyle = 'rgba(250,250,246,0.18)'
    ctx.fillRect(chartX, chartY, chartW, chartH)
    ctx.restore()
  } else {
    drawFlatChart(ctx, chartX + 20, chartY + 20, chartW - 40, chartH - 40)
  }

  // Label
  ctx.fillStyle = INK_4
  ctx.font = '22px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('RBI defending floor', LX + PW / 2, PY + 508)

  // Yawn label
  ctx.fillStyle = INK_2
  ctx.font = 'bold 52px "Inter", sans-serif'
  ctx.fillText('( yawn )', LX + PW / 2, PY + 578)

  // ── RIGHT PANEL: Forward premium ──────────────────────────────────────────
  ctx.fillStyle = '#FFF5F5'
  roundRect(ctx, RX, PY, PW, PH, 20)
  ctx.fill()

  // Red left border accent
  ctx.fillStyle = RED
  ctx.fillRect(RX, PY + 20, 5, PH - 40)

  ctx.fillStyle = RED
  ctx.font = 'bold 22px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '2px'
  ctx.fillText('1Y FWD PREMIUM', RX + PW / 2, PY + 50)
  ctx.letterSpacing = '0px'

  // Animated price counter
  const priceT  = clamp((t - 0.05) / 0.7, 0, 1)
  const fwdVal  = lerp(3.12, 2.80, easeOut(priceT))
  ctx.fillStyle = RED
  ctx.font = 'bold 82px "Inter", sans-serif'
  ctx.fillText(`${fwdVal.toFixed(2)}%`, RX + PW / 2, PY + 156)

  // Badge — appears at t=0.55
  const badgeA = clamp((t - 0.55) / 0.15, 0, 1)
  ctx.globalAlpha = badgeA
  ctx.fillStyle = RED
  roundRect(ctx, RX + PW/2 - 115, PY + 170, 230, 48, 24)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 26px "Inter", sans-serif'
  ctx.fillText('−12 bps today', RX + PW / 2, PY + 203)
  ctx.globalAlpha = 1

  // Dropping chart
  drawDroppingChart(ctx, RX + 50, PY + 264, PW - 60, 196, t)

  ctx.fillStyle = INK_4
  ctx.font = '22px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('1-year forward booking', RX + PW / 2, PY + 488)

  ctx.fillStyle = RED
  ctx.font = 'bold 36px "Inter", sans-serif'
  ctx.fillText('₹11K cheaper per $1L', RX + PW / 2, PY + 534)

  // savings callout — appears late
  const savingsA = clamp((t - 0.7) / 0.15, 0, 1)
  ctx.globalAlpha = savingsA
  ctx.fillStyle = '#FFF0F0'
  roundRect(ctx, RX + 20, PY + 556, PW - 40, 76, 10)
  ctx.fill()
  ctx.strokeStyle = RED
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = RED
  ctx.font = 'bold 22px "Inter", sans-serif'
  ctx.fillText('$1L booked → ₹11,000 saved', RX + PW / 2, PY + 592)
  ctx.fillStyle = INK_4
  ctx.font = '18px "Inter", sans-serif'
  ctx.fillText('$3L booked → ₹33,000 saved', RX + PW / 2, PY + 620)
  ctx.globalAlpha = 1

  // ── Translation block ─────────────────────────────────────────────────────
  const txA = clamp((t - 0.35) / 0.25, 0, 1)
  ctx.globalAlpha = txA

  ctx.fillStyle = BORDER
  roundRect(ctx, PAD, PY + PH + 36, W - PAD * 2, 310, 16)
  ctx.fill()
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = GOLD
  ctx.font = 'bold 26px "Inter", sans-serif'
  ctx.textAlign = 'left'
  ctx.letterSpacing = '2px'
  ctx.fillText('IF YOU BUY IN DOLLARS', PAD + 32, PY + PH + 84)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = INK
  ctx.font = '32px "Inter", sans-serif'
  const tx = [
    'Booking a forward contract today',
    'costs less than it did yesterday —',
  ]
  let ty = PY + PH + 134
  for (const line of tx) {
    ctx.fillText(line, PAD + 32, ty)
    ty += 48
  }
  ctx.fillStyle = GREEN
  ctx.font = 'bold 38px "Inter", sans-serif'
  ctx.fillText('not because the rupee moved,', PAD + 32, ty + 4)
  ctx.fillText('because rate expectations did.', PAD + 32, ty + 50)

  ctx.globalAlpha = 1

  // ── Footer ────────────────────────────────────────────────────────────────
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(80, H - 80); ctx.lineTo(W - 80, H - 80); ctx.stroke()

  ctx.fillStyle = INK_4
  ctx.font = '22px "Inter", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('bhaavbrief.in', 80, H - 42)

  ctx.fillStyle = GOLD
  ctx.font = 'bold 22px "Inter", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('MCX Intelligence', W - 80, H - 42)
}

// ── Phase 3: Payoff ───────────────────────────────────────────────────────────
function drawPayoff(ctx, t) {
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 10)

  ctx.globalAlpha = clamp(t * 6, 0, 1)

  ctx.fillStyle = GOLD
  ctx.font = 'bold 30px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '6px'
  ctx.fillText('BHAAVBRIEF', W / 2, 110)
  ctx.letterSpacing = '0px'

  // Two-column contrast
  ctx.fillStyle = '#2A2A20'
  ctx.font = 'bold 36px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('SPOT RATE', W / 2 - 230, 730)
  ctx.fillText('FORWARD RATE', W / 2 + 220, 730)

  // Divider
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(W/2, 700); ctx.lineTo(W/2, 1080); ctx.stroke()

  ctx.fillStyle = INK_4
  ctx.font = '30px "Inter", sans-serif'
  ctx.fillText('Where the', W / 2 - 230, 798)
  ctx.fillText('rupee IS', W / 2 - 230, 838)
  ctx.fillText('today.', W / 2 - 230, 878)

  ctx.fillStyle = CREAM
  ctx.font = '30px "Inter", sans-serif'
  ctx.fillText('What it will', W / 2 + 220, 798)
  ctx.fillText('COST you', W / 2 + 220, 838)
  ctx.fillText('to lock in.', W / 2 + 220, 878)

  ctx.fillStyle = INK_4
  ctx.font = 'bold 28px "Inter", sans-serif'
  ctx.fillText('Everyone', W / 2 - 230, 950)
  ctx.fillText('watches this.', W / 2 - 230, 990)

  ctx.fillStyle = GOLD
  ctx.font = 'bold 28px "Inter", sans-serif'
  ctx.fillText('Smart importers', W / 2 + 220, 950)
  ctx.fillText('watch THIS.', W / 2 + 220, 990)

  // Divider above CTA
  ctx.strokeStyle = '#2A2A20'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(120, 1070); ctx.lineTo(W - 120, 1070); ctx.stroke()

  ctx.globalAlpha = clamp((t - 0.3) / 0.4, 0, 1)
  ctx.fillStyle = CREAM
  ctx.font = 'bold 64px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Save this for your', W / 2, 1180)
  ctx.fillText('next forward booking.', W / 2, 1256)

  ctx.fillStyle = GOLD
  ctx.font = 'bold 52px "Inter", sans-serif'
  ctx.fillText('Follow for daily', W / 2, 1360)
  ctx.fillText('currency intelligence.', W / 2, 1420)

  ctx.globalAlpha = 1
}

// ── Frame dispatcher ──────────────────────────────────────────────────────────
function renderFrame(frame) {
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  if (frame < HOOK_END) {
    drawHook(ctx, frame / HOOK_END)
  } else if (frame < SPLIT_END) {
    drawSplitScreen(ctx, (frame - HOOK_END) / (SPLIT_END - HOOK_END))
  } else {
    drawPayoff(ctx, (frame - SPLIT_END) / (TOTAL_FRAMES - SPLIT_END))
  }

  return canvas.toBuffer('image/png')
}

// ── Main ──────────────────────────────────────────────────────────────────────
const FRAMES_DIR = join(ROOT, '.reel-frames-tmp')
const OUT_DIR    = join(ROOT, 'public/reels')
const OUT_FILE   = join(OUT_DIR, 'usdinr-forward-reel.mp4')

if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true })
mkdirSync(FRAMES_DIR, { recursive: true })
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  BhaavBrief — USD/INR Forward Reel`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
console.log(`Rendering ${TOTAL_FRAMES} frames (${FPS}fps × 14s)...`)

const t0 = Date.now()
for (let f = 0; f < TOTAL_FRAMES; f++) {
  writeFileSync(join(FRAMES_DIR, `f${String(f).padStart(4, '0')}.png`), renderFrame(f))
  if (f % 60 === 0) process.stdout.write(`  ${f}/${TOTAL_FRAMES} frames\n`)
}
console.log(`  ${TOTAL_FRAMES}/${TOTAL_FRAMES} frames — ${((Date.now() - t0) / 1000).toFixed(1)}s\n`)

console.log('Encoding MP4 with ffmpeg...')

// Music: "The Complex" by Kevin MacLeod (CC-BY 4.0) — incompetech.com
const MUSIC_FILE = join(ROOT, 'public/reels/the-complex.mp3')
const hasMusic   = existsSync(MUSIC_FILE)

const ffArgs = [
  '-y',
  '-framerate', String(FPS),
  '-i', join(FRAMES_DIR, 'f%04d.png'),
  ...(hasMusic ? ['-i', MUSIC_FILE] : []),
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  // Trim audio to exact video length, fade out last 1.5s
  ...(hasMusic ? [
    '-c:a', 'aac',
    '-b:a', '192k',
    '-af', `atrim=0:${TOTAL_FRAMES / FPS},afade=t=out:st=${TOTAL_FRAMES / FPS - 1.5}:d=1.5,asetpts=PTS-STARTPTS`,
    '-shortest',
  ] : []),
  '-movflags', '+faststart',
  OUT_FILE,
]

execFileSync('ffmpeg', ffArgs, { stdio: 'inherit' })
if (hasMusic) console.log('  Music: "The Complex" — Kevin MacLeod (CC-BY 4.0 | incompetech.com)')

rmSync(FRAMES_DIR, { recursive: true })

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  ✅  ${OUT_FILE}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
