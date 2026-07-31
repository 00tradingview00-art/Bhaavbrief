#!/usr/bin/env node
/**
 * scripts/generate-dxy-reel.mjs
 *
 * BhaavBrief — DXY → MCX Explainer Reel (1080×1920, 25s)
 * Educational format: Hook → Mechanism → Rupee Offset → Watch Signals
 *
 * Usage:
 *   node scripts/generate-dxy-reel.mjs
 *
 * Output: public/reels/dxy-mcx-explainer.mp4
 */

import { createCanvas, GlobalFonts }     from '@napi-rs/canvas'
import { readFileSync, writeFileSync,
         mkdirSync, existsSync, rmSync } from 'fs'
import { join, dirname }                 from 'path'
import { fileURLToPath }                 from 'url'
import { execFileSync }                  from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')

// ── Env ───────────────────────────────────────────────────────────────────────
const envFile = join(ROOT, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

// ── Fonts ─────────────────────────────────────────────────────────────────────
const fontBold = join(ROOT, 'public/fonts/Inter-Bold.ttf')
if (existsSync(fontBold)) GlobalFonts.registerFromPath(fontBold, 'Inter')
const fontReg  = join(ROOT, 'public/fonts/Inter-Regular.ttf')
if (existsSync(fontReg))  GlobalFonts.registerFromPath(fontReg, 'Inter')

// ── Colors ────────────────────────────────────────────────────────────────────
const CREAM  = '#FAFAF6'
const INK    = '#18180F'
const INK_2  = '#2C2C22'
const INK_4  = '#8A8A7A'
const INK_6  = '#BCBCAA'
const GOLD   = '#C8720A'
const RED    = '#C0392B'
const GREEN  = '#1A7A4A'
const BORDER = '#E0DFD5'
const DARK   = '#121209'

// ── Canvas constants ──────────────────────────────────────────────────────────
const W = 1080, H = 1920, FPS = 30, DURATION = 25
const TOTAL_FRAMES = DURATION * FPS   // 750

// Phase boundaries (in frames)
const HOOK_END  = Math.round(3.5 * FPS)   //  0–3.5s  — hook
const MECH_END  = Math.round(11.5 * FPS)  //  3.5–11.5s — mechanism
const TWIST_END = Math.round(19.5 * FPS)  // 11.5–19.5s — rupee offset
// 19.5–25s — watch signals

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3)
const spring  = t => { const c = clamp(t, 0, 1); return 1 - (1-c)*(1-c)*(1-c) }

function wrapText(ctx, text, maxW) {
  const words = String(text ?? '').split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w }
    else cur = test
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

// Top brand bar shared across all phases
function drawBrandBar(ctx, dark = false) {
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 8)
  ctx.fillStyle = dark ? GOLD : GOLD
  ctx.font = 'bold 22px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '6px'
  ctx.fillText('BHAAVBRIEF', W/2, 58)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = dark ? '#FFFFFF1A' : BORDER
  ctx.strokeStyle = dark ? '#FFFFFF1A' : BORDER
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 76); ctx.lineTo(W-60, 76); ctx.stroke()
}

// ── Phase 1: HOOK ─────────────────────────────────────────────────────────────
function drawHook(ctx, t) {
  ctx.fillStyle = DARK
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, true)

  // "EXPLAINER" pill
  ctx.globalAlpha = clamp(t * 8, 0, 1)
  ctx.fillStyle   = GOLD + '22'
  roundRect(ctx, W/2 - 110, 110, 220, 40, 20)
  ctx.fill()
  ctx.fillStyle = GOLD
  ctx.font = 'bold 18px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '4px'
  ctx.fillText('EXPLAINER', W/2, 136)
  ctx.letterSpacing = '0px'

  // DXY arrow block
  const numA = easeOut(clamp(t * 4, 0, 1))
  ctx.globalAlpha = numA

  ctx.fillStyle = GOLD
  ctx.font = 'bold 160px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('DXY ↑', W/2, 680)

  ctx.fillStyle = RED
  ctx.font = 'bold 88px "Inter", sans-serif'
  ctx.fillText('MCX GOLD ↓', W/2, 800)

  // Rule
  ctx.globalAlpha = clamp((t - 0.3) * 5, 0, 1)
  ctx.strokeStyle = '#FFFFFF14'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(120, 860); ctx.lineTo(W-120, 860); ctx.stroke()

  // Subtitle
  ctx.globalAlpha = clamp((t - 0.4) * 6, 0, 1)
  ctx.fillStyle   = INK_6
  ctx.font        = '38px "Inter", sans-serif'
  ctx.fillText("Here's the exact chain.", W/2, 930)

  // Watermark
  ctx.globalAlpha = clamp((t - 0.5) * 5, 0, 1)
  ctx.fillStyle   = '#FFFFFF1A'
  ctx.font        = '22px "Inter", sans-serif'
  ctx.fillText('bhaavbrief.in', W/2, H - 60)

  ctx.globalAlpha = 1
}

// ── Phase 2: MECHANISM ────────────────────────────────────────────────────────
// 3 steps build in over 8s
function drawMechanism(ctx, t) {
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, false)

  // Section label
  ctx.fillStyle = GOLD
  ctx.font = 'bold 20px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '5px'
  ctx.fillText('THE IMPORT CHAIN', W/2, 116)
  ctx.letterSpacing = '0px'

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 134); ctx.lineTo(W-60, 134); ctx.stroke()

  // Step definitions
  const steps = [
    {
      num: '01',
      title: 'DXY rises → COMEX gold falls',
      body: 'Gold priced globally in USD. A stronger dollar reduces non-US demand — COMEX spot price historically drops.',
      threshold: 0.0,
    },
    {
      num: '02',
      title: 'Import parity formula',
      body: 'MCX (₹/10g)  =  COMEX ÷ 31.1  ×  10  ×  USD/INR  ×  1.15',
      body2: 'The 1.15 factor covers 10% basic customs duty + 5% GST on landed cost.',
      threshold: 0.35,
    },
    {
      num: '03',
      title: 'Magnitude at ₹84 USD/INR',
      body: 'Every $10 COMEX drop ≈ ₹350–400 MCX drop (before the rupee offset).',
      threshold: 0.68,
    },
  ]

  let stepY = 200
  for (const step of steps) {
    const a = easeOut(clamp((t - step.threshold) / 0.25, 0, 1))
    const offsetY = 20 * (1 - spring(clamp((t - step.threshold) / 0.2, 0, 1)))
    ctx.globalAlpha = a

    // Step number chip
    ctx.fillStyle = GOLD
    ctx.font = 'bold 28px "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(step.num, 60, stepY + offsetY)

    // Divider line from number to title
    ctx.strokeStyle = GOLD + '44'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(100, stepY - 12 + offsetY); ctx.lineTo(100, stepY + 10 + offsetY); ctx.stroke()

    // Title
    ctx.fillStyle = INK
    ctx.font = 'bold 38px "Inter", sans-serif'
    const titleLines = wrapText(ctx, step.title, W - 160)
    let ty = stepY + offsetY
    for (const l of titleLines) { ctx.fillText(l, 118, ty); ty += 52 }

    // Body
    ctx.fillStyle = INK_4
    ctx.font = '29px "Inter", sans-serif'
    const bodyLines = wrapText(ctx, step.body, W - 140)
    for (const l of bodyLines) { ctx.fillText(l, 118, ty); ty += 42 }

    if (step.body2) {
      ctx.fillStyle = INK_4 + 'BB'
      ctx.font = '26px "Inter", sans-serif'
      const b2Lines = wrapText(ctx, step.body2, W - 140)
      ty += 4
      for (const l of b2Lines) { ctx.fillText(l, 118, ty); ty += 38 }
    }

    stepY = ty + 52
  }

  ctx.globalAlpha = 1
  // Progress dots
  drawDots(ctx, 1, 4)
}

// ── Phase 3: RUPEE OFFSET ─────────────────────────────────────────────────────
function drawTwist(ctx, t) {
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, false)

  ctx.fillStyle = GOLD
  ctx.font = 'bold 20px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '5px'
  ctx.fillText('THE RUPEE OFFSET', W/2, 116)
  ctx.letterSpacing = '0px'

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 134); ctx.lineTo(W-60, 134); ctx.stroke()

  // Main explanation
  const mainA = easeOut(clamp(t * 4, 0, 1))
  ctx.globalAlpha = mainA
  ctx.fillStyle = INK
  ctx.font = 'bold 46px "Inter", sans-serif'
  ctx.textAlign = 'left'
  const main1 = 'A rising DXY also weakens the Indian Rupee.'
  const m1Lines = wrapText(ctx, main1, W - 120)
  let my = 260
  for (const l of m1Lines) { ctx.fillText(l, 60, my); my += 64 }

  ctx.fillStyle = INK_2
  ctx.font = '34px "Inter", sans-serif'
  const main2 = 'Higher USD/INR means each COMEX dollar is worth more rupees — partially offsetting the COMEX fall on the MCX price.'
  const m2Lines = wrapText(ctx, main2, W - 120)
  my += 20
  for (const l of m2Lines) { ctx.fillText(l, 60, my); my += 48 }

  // Visual offset diagram
  const diagA = easeOut(clamp((t - 0.35) * 4, 0, 1))
  ctx.globalAlpha = diagA

  const diagY = my + 60
  const boxH  = 90
  const labelW = 180
  const arrowW = W - 120 - labelW - 30

  // COMEX fall → red bar
  ctx.fillStyle = RED + '22'
  roundRect(ctx, 60, diagY, W - 120, boxH, 10)
  ctx.fill()
  ctx.fillStyle = RED
  ctx.font = 'bold 28px "Inter", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('COMEX fall', 80, diagY + 34)
  ctx.font = '24px "Inter", sans-serif'
  ctx.fillText('pushes MCX ↓', 80, diagY + 62)
  ctx.fillStyle = RED
  ctx.font = 'bold 44px "Inter", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('−₹800', W - 80, diagY + 54)

  // INR cushion → green bar
  const cushY = diagY + boxH + 20
  ctx.fillStyle = GREEN + '22'
  roundRect(ctx, 60, cushY, W - 120, boxH, 10)
  ctx.fill()
  ctx.fillStyle = GREEN
  ctx.font = 'bold 28px "Inter", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('INR cushion', 80, cushY + 34)
  ctx.font = '24px "Inter", sans-serif'
  ctx.fillText('offsets via USD/INR ↑', 80, cushY + 62)
  ctx.fillStyle = GREEN
  ctx.font = 'bold 44px "Inter", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('+₹400', W - 80, cushY + 54)

  // Net
  const netY = cushY + boxH + 20
  ctx.fillStyle = INK
  ctx.font = 'bold 38px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Net MCX impact ≈ −₹400/10g', W/2, netY + 44)

  // Proof card
  const cardA = easeOut(clamp((t - 0.65) * 4, 0, 1))
  ctx.globalAlpha = cardA
  const cardY = netY + 100
  roundRect(ctx, 60, cardY, W - 120, 200, 14)
  ctx.fillStyle = '#F0EDDF'; ctx.fill()
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke()
  ctx.fillStyle = GOLD
  ctx.font = 'bold 18px "Inter", sans-serif'
  ctx.textAlign = 'left'
  ctx.letterSpacing = '3px'
  ctx.fillText('HISTORICAL PROOF', 88, cardY + 44)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = INK
  ctx.font = 'bold 38px "Inter", sans-serif'
  ctx.fillText('2022: DXY 96 → 114', 88, cardY + 96)
  ctx.font = '30px "Inter", sans-serif'
  ctx.fillStyle = INK_2
  ctx.fillText('COMEX Gold:  −20%', 88, cardY + 138)
  ctx.fillStyle = GREEN
  ctx.fillText('MCX Gold:    only ≈−16%', 88, cardY + 172)

  ctx.globalAlpha = 1
  drawDots(ctx, 2, 4)
}

// ── Phase 4: WATCH SIGNALS ────────────────────────────────────────────────────
function drawWatch(ctx, t) {
  ctx.fillStyle = DARK
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, true)

  ctx.globalAlpha = clamp(t * 8, 0, 1)
  ctx.fillStyle   = GOLD
  ctx.font = 'bold 22px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '8px'
  ctx.fillText('WATCH THESE', W/2, 116)
  ctx.letterSpacing = '0px'

  const signals = [
    { label: 'DXY LEVEL',             detail: 'Key zone: 104 — above = pressure on COMEX' },
    { label: 'US 10Y TIPS YIELD',      detail: 'Rising real yields = headwind for gold globally' },
    { label: 'USD/INR DAILY RATE',     detail: 'RBI reference published 1:30 PM IST — the rupee leg' },
    { label: 'IMPORT DUTY CHANGES',    detail: 'Each 1% duty change shifts MCX by ~₹1,000/10g' },
  ]

  let sy = 220
  signals.forEach((sig, i) => {
    const a = easeOut(clamp((t - i * 0.18) / 0.25, 0, 1))
    const yOff = 18 * (1 - spring(clamp((t - i * 0.18) / 0.2, 0, 1)))
    ctx.globalAlpha = a

    // Row rule
    ctx.strokeStyle = '#FFFFFF0D'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(60, sy - 14 + yOff); ctx.lineTo(W-60, sy - 14 + yOff); ctx.stroke()

    // Dot
    ctx.beginPath()
    ctx.arc(72, sy + 8 + yOff, 6, 0, Math.PI * 2)
    ctx.fillStyle = GOLD
    ctx.fill()

    ctx.fillStyle = CREAM
    ctx.font = 'bold 32px "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(sig.label, 96, sy + 14 + yOff)

    ctx.fillStyle = INK_6
    ctx.font = '26px "Inter", sans-serif'
    const detailLines = wrapText(ctx, sig.detail, W - 160)
    let dy = sy + 50 + yOff
    for (const l of detailLines) { ctx.fillText(l, 96, dy); dy += 36 }
    sy = dy + 36
  })

  // Payoff line — the screenshot-able line
  const payA = easeOut(clamp((t - 0.72) * 5, 0, 1))
  ctx.globalAlpha = payA

  ctx.strokeStyle = '#FFFFFF14'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, sy + 20); ctx.lineTo(W-60, sy + 20); ctx.stroke()

  ctx.fillStyle = CREAM
  ctx.font = 'bold 52px "Inter", sans-serif'
  ctx.textAlign = 'center'
  const payLines = wrapText(ctx, 'MCX move = COMEX shift minus rupee offset', W - 120)
  let py = sy + 100
  for (const l of payLines) { ctx.fillText(l, W/2, py); py += 72 }

  // CTA
  const ctaA = easeOut(clamp((t - 0.85) * 6, 0, 1))
  ctx.globalAlpha = ctaA
  ctx.fillStyle = INK_6
  ctx.font = '28px "Inter", sans-serif'
  ctx.fillText('Daily MCX intelligence', W/2, py + 60)
  ctx.fillStyle = GOLD
  ctx.font = 'bold 32px "Inter", sans-serif'
  ctx.fillText('@bhaavbrief  ·  bhaavbrief.in', W/2, py + 104)

  ctx.globalAlpha = 1
  drawDots(ctx, 4, 4)
}

// Progress dots (bottom)
function drawDots(ctx, active, total) {
  const dotR = 5, gap = 18, dotY = H - 80
  const startX = W/2 - ((total - 1) * gap) / 2
  for (let i = 0; i < total; i++) {
    ctx.beginPath()
    ctx.arc(startX + i * gap, dotY, dotR, 0, Math.PI * 2)
    ctx.fillStyle = i < active ? GOLD : '#FFFFFF22'
    ctx.fill()
  }
}

// ── Frame renderer ────────────────────────────────────────────────────────────
function renderFrame(frame) {
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  if (frame < HOOK_END) {
    drawHook(ctx, frame / HOOK_END)
  } else if (frame < MECH_END) {
    drawMechanism(ctx, (frame - HOOK_END) / (MECH_END - HOOK_END))
  } else if (frame < TWIST_END) {
    drawTwist(ctx, (frame - MECH_END) / (TWIST_END - MECH_END))
  } else {
    drawWatch(ctx, (frame - TWIST_END) / (TOTAL_FRAMES - TWIST_END))
  }

  return canvas.toBuffer('image/png')
}

// ── ElevenLabs voiceover ──────────────────────────────────────────────────────
const VOICEOVER_SCRIPT = `When the Dollar Index rises, COMEX gold typically falls. That drop flows to MCX through India's import parity formula — COMEX price, times ten, divided by 31.1, times the rupee rate, times 1.15 for duty and GST.

Here's the India twist: a rising DXY also weakens the rupee. So the MCX fall is smaller than the COMEX fall. In 2022, COMEX gold fell 20 percent — MCX gold fell about 16. The rupee offset cushioned part of the drop.

Watch the DXY level, US 10-year real yields, and the RBI rupee reference rate at 1:30 PM daily — those three signals tell you whether the next DXY move will hit MCX hard or be cushioned.`

async function generateVoiceover(outputPath) {
  const apiKey  = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL' // Sarah
  if (!apiKey) { console.warn('  ⚠️  ELEVENLABS_API_KEY not set — skipping voiceover'); return null }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method:  'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text:      VOICEOVER_SCRIPT,
      model_id:  'eleven_multilingual_v2',
      voice_settings: { stability: 0.32, similarity_boost: 0.78, style: 0.55, use_speaker_boost: true },
    }),
    signal: AbortSignal.timeout(40000),
  })

  if (!res.ok) { console.warn(`  ⚠️  ElevenLabs failed (${res.status})`); return null }
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(outputPath, buf)
  console.log(`  ✅  Voiceover (${(buf.length/1024).toFixed(0)} KB)`)
  return outputPath
}

// ── Music ─────────────────────────────────────────────────────────────────────
const MUSIC_BASE = 'https://raw.githubusercontent.com/00tradingview00-art/Bhaavbrief/main/public/reels/music'

async function ensureMusic() {
  // Use calm/neutral track for an explainer
  const calmFile = join(ROOT, 'public/reels/music/calm.mp3')
  if (existsSync(calmFile)) return calmFile
  // Fallback to the-complex.mp3 if available
  const legacy = join(ROOT, 'public/reels/the-complex.mp3')
  if (existsSync(legacy)) return legacy
  // Fallback to upbeat
  const upbeat = join(ROOT, 'public/reels/music/upbeat.mp3')
  if (existsSync(upbeat)) return upbeat
  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────
const FRAMES_DIR  = join(ROOT, '.dxy-reel-frames-tmp')
const OUTPUT_DIR  = join(ROOT, 'public/reels')
const OUTPUT_FILE = join(OUTPUT_DIR, 'dxy-mcx-explainer.mp4')
const VOICE_FILE  = join(OUTPUT_DIR, 'dxy-mcx-explainer-voice.mp3')

mkdirSync(FRAMES_DIR,  { recursive: true })
mkdirSync(OUTPUT_DIR,  { recursive: true })

console.log(`🎬  Rendering ${TOTAL_FRAMES} frames (${DURATION}s @ ${FPS}fps)...`)
for (let i = 0; i < TOTAL_FRAMES; i++) {
  if (i % 75 === 0) process.stdout.write(`  frame ${i}/${TOTAL_FRAMES}\r`)
  const buf = renderFrame(i)
  const pad = String(i).padStart(4, '0')
  writeFileSync(join(FRAMES_DIR, `f${pad}.png`), buf)
}
console.log(`  ✅  ${TOTAL_FRAMES} frames rendered`)

console.log('🎙️   Generating voiceover...')
const voicePath = await generateVoiceover(VOICE_FILE)

console.log('🎵  Finding music track...')
const musicPath = await ensureMusic()
if (musicPath) console.log(`  ✅  Music: ${musicPath}`)
else           console.warn('  ⚠️  No music file found — video will have no background music')

// ffmpeg assembly
console.log('🎞️   Assembling MP4 with ffmpeg...')

const ffArgs = [
  '-y',
  '-framerate', String(FPS),
  '-i', join(FRAMES_DIR, 'f%04d.png'),
]

if (musicPath) ffArgs.push('-stream_loop', '-1', '-i', musicPath)
if (voicePath) ffArgs.push('-i', voicePath)

const hasBg    = !!musicPath
const hasVoice = !!voicePath

if (hasBg && hasVoice) {
  // Mix bg music (quieter) + voiceover
  ffArgs.push(
    '-filter_complex', '[1:a]volume=0.12[bg];[2:a]volume=1.0[vo];[bg][vo]amix=inputs=2:duration=first[a]',
    '-map', '0:v', '-map', '[a]',
  )
} else if (hasBg) {
  ffArgs.push('-map', '0:v', '-map', '1:a')
  ffArgs.push('-filter:a', 'volume=0.25')
} else if (hasVoice) {
  ffArgs.push('-map', '0:v', '-map', '1:a')
}

ffArgs.push(
  '-t', String(DURATION),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart',
  OUTPUT_FILE,
)

execFileSync('ffmpeg', ffArgs, { stdio: 'pipe' })
console.log(`\n✅  Reel saved: ${OUTPUT_FILE.replace(ROOT + '/', '')}`)

// Clean up frames
rmSync(FRAMES_DIR, { recursive: true, force: true })
if (voicePath) rmSync(VOICE_FILE, { force: true })

console.log('\n📱  Ready to post:')
console.log(`   ${OUTPUT_FILE}`)
console.log('\n📝  Suggested caption:')
console.log(`   DXY rises → MCX Gold falls. But not as much as you'd think. Here's why. 🧵`)
console.log(`   `)
console.log(`   The rupee offset is India's hidden buffer — and most traders don't account for it.`)
console.log(`   `)
console.log(`   Save this for the next time the dollar spikes.`)
console.log(`   `)
console.log(`   #MCX #Gold #DXY #DollarIndex #IndianCommodities #BhaavBrief`)
