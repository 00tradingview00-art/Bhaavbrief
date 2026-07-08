#!/usr/bin/env node
/**
 * scripts/generate-ivix-reel.mjs
 *
 * BhaavBrief — "MCX iVIX: India VIX for commodities" Explainer Reel (1080×1920, 26s)
 * Educational format: Hook → Mechanism → Live Snapshot → Why It Matters
 *
 * Pulls today's real iVIX for all 5 MCX instruments from the live production API
 * at render time — the on-screen numbers are never hardcoded/stale.
 *
 * Usage:
 *   node scripts/generate-ivix-reel.mjs
 *
 * Output: public/reels/ivix-explainer.mp4
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
const PURPLE = '#6941C6' // matches the iVIX pill color on bhaavbrief.in/options
const RED    = '#C0392B'
const GREEN  = '#1A7A4A'
const BORDER = '#E0DFD5'
const DARK   = '#121209'

// ── Canvas constants ──────────────────────────────────────────────────────────
// DURATION and the phase boundaries below are placeholders — they get recomputed
// from the voiceover's *actual* rendered length once it comes back from ElevenLabs,
// so the video is never shorter than the audio (which was silently truncating the
// end of the script before). Same proportional split (13.5% / 46% / 75% / 100%).
const W = 1080, H = 1920, FPS = 30
let DURATION = 26
let TOTAL_FRAMES = DURATION * FPS

let HOOK_END = Math.round(0.1346 * DURATION * FPS)  // hook
let MECH_END = Math.round(0.4615 * DURATION * FPS)  // + mechanism (3 steps)
let SNAP_END = Math.round(0.75   * DURATION * FPS)  // + live snapshot
// remainder — why it matters / CTA

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

function drawBrandBar(ctx, dark = false) {
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 8)
  ctx.fillStyle = GOLD
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

function drawDots(ctx, active, total, dark = false) {
  const dotR = 5, gap = 18, dotY = H - 80
  const startX = W/2 - ((total - 1) * gap) / 2
  for (let i = 0; i < total; i++) {
    ctx.beginPath()
    ctx.arc(startX + i * gap, dotY, dotR, 0, Math.PI * 2)
    ctx.fillStyle = i < active ? PURPLE : (dark ? '#FFFFFF22' : BORDER)
    ctx.fill()
  }
}

// ── Live data ─────────────────────────────────────────────────────────────────
// Real numbers, fetched from production at render time — never hardcoded.
const SITE = 'https://bhaavbrief.in'
const INSTRUMENTS = [
  { key: 'GOLD',       label: 'Gold'      },
  { key: 'SILVER',     label: 'Silver'    },
  { key: 'CRUDEOIL',   label: 'Crude Oil' },
  { key: 'NATURALGAS', label: 'Nat Gas'   },
  { key: 'COPPER',     label: 'Copper'    },
]

async function fetchLiveIVIX() {
  const rows = []
  for (const { key, label } of INSTRUMENTS) {
    try {
      const res = await fetch(`${SITE}/api/options?instrument=${key}`, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) continue
      const data = await res.json()
      if (data.ivix != null) rows.push({ label, ivix: data.ivix })
    } catch { /* skip on failure — reel still works with fewer rows */ }
  }
  return rows
}

console.log('📡  Fetching live iVIX from bhaavbrief.in...')
const liveData = await fetchLiveIVIX()
if (liveData.length) {
  console.log('  ' + liveData.map(r => `${r.label} ${r.ivix}%`).join(' · '))
} else {
  console.warn('  ⚠️  Could not fetch live data — snapshot phase will show a fallback message')
}
const highest = liveData.length ? liveData.reduce((a, b) => (b.ivix > a.ivix ? b : a)) : null

// ── Phase 1: HOOK ─────────────────────────────────────────────────────────────
function drawHook(ctx, t) {
  ctx.fillStyle = DARK
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, true)

  ctx.globalAlpha = clamp(t * 8, 0, 1)
  ctx.fillStyle   = PURPLE + '22'
  roundRect(ctx, W/2 - 140, 110, 280, 40, 20)
  ctx.fill()
  ctx.fillStyle = PURPLE
  ctx.font = 'bold 18px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '4px'
  ctx.fillText('GAME CHANGER', W/2, 136)
  ctx.letterSpacing = '0px'

  const a1 = easeOut(clamp(t * 4, 0, 1))
  ctx.globalAlpha = a1
  ctx.fillStyle = INK_6
  ctx.font = '46px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('You know India VIX.', W/2, 620)

  const a2 = easeOut(clamp((t - 0.28) * 4, 0, 1))
  ctx.globalAlpha = a2
  ctx.fillStyle = PURPLE
  ctx.font = 'bold 148px "Inter", sans-serif'
  ctx.fillText('iVIX', W/2, 800)

  const a3 = easeOut(clamp((t - 0.5) * 5, 0, 1))
  ctx.globalAlpha = a3
  ctx.fillStyle = CREAM
  ctx.font = 'bold 44px "Inter", sans-serif'
  ctx.fillText('We built one for MCX commodities.', W/2, 880)

  ctx.globalAlpha = clamp((t - 0.6) * 5, 0, 1)
  ctx.strokeStyle = '#FFFFFF14'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(120, 930); ctx.lineTo(W-120, 930); ctx.stroke()

  ctx.globalAlpha = clamp((t - 0.65) * 5, 0, 1)
  ctx.fillStyle   = '#FFFFFF1A'
  ctx.font        = '22px "Inter", sans-serif'
  ctx.fillText('bhaavbrief.in', W/2, H - 60)

  ctx.globalAlpha = 1
}

// ── Phase 2: MECHANISM ────────────────────────────────────────────────────────
function drawMechanism(ctx, t) {
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, false)

  ctx.fillStyle = PURPLE
  ctx.font = 'bold 20px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '5px'
  ctx.fillText('SAME MATH, NEW MARKET', W/2, 116)
  ctx.letterSpacing = '0px'

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 134); ctx.lineTo(W-60, 134); ctx.stroke()

  const steps = [
    {
      num: '01',
      title: 'India VIX — the Nifty fear gauge',
      body: 'Derived from Nifty option prices using a CBOE-style variance-swap formula. Higher VIX = more fear, bigger expected moves.',
      threshold: 0.0,
    },
    {
      num: '02',
      title: 'MCX only publishes realized vol (AAV)',
      body: "No implied-volatility index for commodities exists — so BhaavBrief built one: iVIX, the same CBOE-style formula, computed live from Gold, Silver, Crude, Nat Gas and Copper options.",
      threshold: 0.34,
    },
    {
      num: '03',
      title: 'The problem — no trend, only today',
      body: 'Until now you could see one live number and nothing else. No sense of whether volatility was building or fading.',
      threshold: 0.66,
    },
  ]

  let stepY = 210
  for (const step of steps) {
    const a = easeOut(clamp((t - step.threshold) / 0.25, 0, 1))
    const offsetY = 20 * (1 - spring(clamp((t - step.threshold) / 0.2, 0, 1)))
    ctx.globalAlpha = a

    ctx.fillStyle = PURPLE
    ctx.font = 'bold 28px "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(step.num, 60, stepY + offsetY)

    ctx.strokeStyle = PURPLE + '44'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(100, stepY - 12 + offsetY); ctx.lineTo(100, stepY + 10 + offsetY); ctx.stroke()

    ctx.fillStyle = INK
    ctx.font = 'bold 36px "Inter", sans-serif'
    const titleLines = wrapText(ctx, step.title, W - 160)
    let ty = stepY + offsetY
    for (const l of titleLines) { ctx.fillText(l, 118, ty); ty += 48 }

    ctx.fillStyle = INK_4
    ctx.font = '29px "Inter", sans-serif'
    const bodyLines = wrapText(ctx, step.body, W - 140)
    for (const l of bodyLines) { ctx.fillText(l, 118, ty); ty += 42 }

    stepY = ty + 60
  }

  ctx.globalAlpha = 1
  drawDots(ctx, 1, 4, false)
}

// ── Phase 3: LIVE SNAPSHOT ─────────────────────────────────────────────────────
function drawSnapshot(ctx, t) {
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, false)

  ctx.fillStyle = PURPLE
  ctx.font = 'bold 20px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '5px'
  ctx.fillText("TODAY'S iVIX — LIVE", W/2, 116)
  ctx.letterSpacing = '0px'

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 134); ctx.lineTo(W-60, 134); ctx.stroke()

  if (!liveData.length) {
    ctx.globalAlpha = easeOut(clamp(t * 4, 0, 1))
    ctx.fillStyle = INK_4
    ctx.font = '32px "Inter", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('See live iVIX for all 5 instruments', W/2, 500)
    ctx.fillText('at bhaavbrief.in/options', W/2, 550)
    ctx.globalAlpha = 1
    drawDots(ctx, 2, 4, false)
    return
  }

  const maxIV = Math.max(...liveData.map(r => r.ivix), 1)
  let rowY = 220
  const rowH = 150

  liveData.forEach((row, i) => {
    const a = easeOut(clamp((t - i * 0.12) / 0.25, 0, 1))
    const offsetX = 30 * (1 - spring(clamp((t - i * 0.12) / 0.2, 0, 1)))
    ctx.globalAlpha = a

    const isHigh = highest && row.label === highest.label
    const barMaxW = W - 400
    const barW = (row.ivix / maxIV) * barMaxW

    ctx.fillStyle = isHigh ? PURPLE : INK
    ctx.font = 'bold 34px "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(row.label, 60 + offsetX, rowY + 40)

    ctx.fillStyle = (isHigh ? PURPLE : GOLD) + '20'
    roundRect(ctx, 60 + offsetX, rowY + 56, barMaxW + 200, 46, 8)
    ctx.fill()
    ctx.fillStyle = isHigh ? PURPLE : GOLD
    roundRect(ctx, 60 + offsetX, rowY + 56, Math.max(barW, 10), 46, 8)
    ctx.fill()

    ctx.fillStyle = isHigh ? '#FFFFFF' : INK
    ctx.font = 'bold 30px "Inter", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${row.ivix}%`, 60 + offsetX + barMaxW + 180, rowY + 88)

    if (isHigh) {
      ctx.fillStyle = PURPLE
      ctx.font = 'bold 20px "Inter", sans-serif'
      ctx.textAlign = 'left'
      ctx.letterSpacing = '2px'
      ctx.fillText('HIGHEST TODAY', 60 + offsetX, rowY + 128)
      ctx.letterSpacing = '0px'
    }

    rowY += rowH
  })

  const capA = easeOut(clamp((t - 0.8) * 5, 0, 1))
  ctx.globalAlpha = capA
  ctx.fillStyle = INK_4
  ctx.font = '26px "Inter", sans-serif'
  ctx.textAlign = 'center'
  const capLines = wrapText(ctx, 'Higher iVIX = options pricing a bigger move — often before the price itself moves.', W - 140)
  let cy = rowY + 30
  for (const l of capLines) { ctx.fillText(l, W/2, cy); cy += 36 }

  ctx.globalAlpha = 1
  drawDots(ctx, 2, 4, false)
}

// ── Phase 4: WHY IT MATTERS / CTA ──────────────────────────────────────────────
function drawWatch(ctx, t) {
  ctx.fillStyle = DARK
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, true)

  ctx.globalAlpha = clamp(t * 8, 0, 1)
  ctx.fillStyle   = PURPLE
  ctx.font = 'bold 22px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '8px'
  ctx.fillText('WHY IT MATTERS', W/2, 130)
  ctx.letterSpacing = '0px'

  const points = [
    { label: 'IV EXPANSION LEADS PRICE',  detail: 'Volatility often builds in options before it shows up on the chart' },
    { label: 'FALLING iVIX = COMPLACENCY', detail: 'A calm iVIX can mean the market is under-pricing the next move' },
    { label: 'NOW WITH TREND',            detail: '5D / 10D / 30D / 60D history — a BhaavBrief first for MCX, updated daily at close' },
  ]

  let sy = 250
  points.forEach((p, i) => {
    const a = easeOut(clamp((t - i * 0.18) / 0.25, 0, 1))
    const yOff = 18 * (1 - spring(clamp((t - i * 0.18) / 0.2, 0, 1)))
    ctx.globalAlpha = a

    ctx.strokeStyle = '#FFFFFF0D'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(60, sy - 14 + yOff); ctx.lineTo(W-60, sy - 14 + yOff); ctx.stroke()

    ctx.beginPath()
    ctx.arc(72, sy + 8 + yOff, 6, 0, Math.PI * 2)
    ctx.fillStyle = PURPLE
    ctx.fill()

    ctx.fillStyle = CREAM
    ctx.font = 'bold 30px "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(p.label, 96, sy + 14 + yOff)

    ctx.fillStyle = INK_6
    ctx.font = '26px "Inter", sans-serif'
    const detailLines = wrapText(ctx, p.detail, W - 160)
    let dy = sy + 50 + yOff
    for (const l of detailLines) { ctx.fillText(l, 96, dy); dy += 36 }
    sy = dy + 40
  })

  const payA = easeOut(clamp((t - 0.68) * 5, 0, 1))
  ctx.globalAlpha = payA
  ctx.strokeStyle = '#FFFFFF14'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, sy + 20); ctx.lineTo(W-60, sy + 20); ctx.stroke()

  ctx.fillStyle = CREAM
  ctx.font = 'bold 50px "Inter", sans-serif'
  ctx.textAlign = 'center'
  const payLines = wrapText(ctx, "The vol index MCX doesn't publish. We do.", W - 120)
  let py = sy + 100
  for (const l of payLines) { ctx.fillText(l, W/2, py); py += 68 }

  const ctaA = easeOut(clamp((t - 0.85) * 6, 0, 1))
  ctx.globalAlpha = ctaA
  ctx.fillStyle = INK_6
  ctx.font = '28px "Inter", sans-serif'
  ctx.fillText('Options → ATM IV tab', W/2, py + 60)
  ctx.fillStyle = PURPLE
  ctx.font = 'bold 32px "Inter", sans-serif'
  ctx.fillText('@bhaavbrief  ·  bhaavbrief.in/options', W/2, py + 104)

  ctx.globalAlpha = 1
  drawDots(ctx, 4, 4, true)
}

// ── Frame renderer ────────────────────────────────────────────────────────────
function renderFrame(frame) {
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  if (frame < HOOK_END) {
    drawHook(ctx, frame / HOOK_END)
  } else if (frame < MECH_END) {
    drawMechanism(ctx, (frame - HOOK_END) / (MECH_END - HOOK_END))
  } else if (frame < SNAP_END) {
    drawSnapshot(ctx, (frame - MECH_END) / (SNAP_END - MECH_END))
  } else {
    drawWatch(ctx, (frame - SNAP_END) / (TOTAL_FRAMES - SNAP_END))
  }

  return canvas.toBuffer('image/png')
}

// ── ElevenLabs voiceover ──────────────────────────────────────────────────────
// The live per-instrument numbers (incl. today's highest) are already carried by
// the on-screen snapshot phase — the voiceover doesn't repeat them, so it isn't
// tied to a value that could read awkwardly once spoken aloud.
const VOICEOVER_SCRIPT = `You know India VIX — it prices fear into the Nifty. MCX only publishes realized volatility, so we built the implied side ourselves. It's called iVIX — same formula, live for Gold, Silver, Crude, Nat Gas, and Copper.

Here's the game changer: until today you could only see one number, with no sense of direction. Now you can see the trend — 5, 10, 30, 60 days back — so you catch volatility building before the price moves.

Track it daily on the options page at BhaavBrief dot in.`

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

function getAudioDuration(path) {
  try {
    const out = execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', path,
    ], { encoding: 'utf8' })
    const seconds = parseFloat(out.trim())
    return isNaN(seconds) ? null : seconds
  } catch { return null }
}

// ── Music ─────────────────────────────────────────────────────────────────────
async function ensureMusic() {
  // "volatile" track fits an explainer about a volatility index
  const volatileFile = join(ROOT, 'public/reels/music/volatile.mp3')
  if (existsSync(volatileFile)) return volatileFile
  const calmFile = join(ROOT, 'public/reels/music/calm.mp3')
  if (existsSync(calmFile)) return calmFile
  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────
const FRAMES_DIR  = join(ROOT, '.ivix-reel-frames-tmp')
const OUTPUT_DIR  = join(ROOT, 'public/reels')
const OUTPUT_FILE = join(OUTPUT_DIR, 'ivix-explainer.mp4')
const VOICE_FILE  = join(OUTPUT_DIR, 'ivix-explainer-voice.mp3')

mkdirSync(FRAMES_DIR,  { recursive: true })
mkdirSync(OUTPUT_DIR,  { recursive: true })

// Voiceover goes first — its real length drives the video length, so the
// visuals never run out before the audio finishes (or vice versa).
console.log('🎙️   Generating voiceover...')
const voicePath = await generateVoiceover(VOICE_FILE)

if (voicePath) {
  const voiceDuration = getAudioDuration(voicePath)
  if (voiceDuration) {
    DURATION     = Math.ceil(voiceDuration + 1.5) // small tail so the CTA lingers after the voice ends
    TOTAL_FRAMES = DURATION * FPS
    HOOK_END     = Math.round(0.1346 * TOTAL_FRAMES)
    MECH_END     = Math.round(0.4615 * TOTAL_FRAMES)
    SNAP_END     = Math.round(0.75   * TOTAL_FRAMES)
    console.log(`  ⏱️   Voiceover is ${voiceDuration.toFixed(1)}s — video set to ${DURATION}s to match`)
  }
}

console.log(`🎬  Rendering ${TOTAL_FRAMES} frames (${DURATION}s @ ${FPS}fps)...`)
for (let i = 0; i < TOTAL_FRAMES; i++) {
  if (i % 75 === 0) process.stdout.write(`  frame ${i}/${TOTAL_FRAMES}\r`)
  const buf = renderFrame(i)
  const pad = String(i).padStart(4, '0')
  writeFileSync(join(FRAMES_DIR, `f${pad}.png`), buf)
}
console.log(`  ✅  ${TOTAL_FRAMES} frames rendered`)

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
console.log(`   You know India VIX. Now meet iVIX — the volatility index MCX doesn't publish, we do. 📈`)
console.log(`   `)
console.log(`   Same CBOE-style formula as India VIX, computed live for Gold, Silver, Crude, Nat Gas & Copper options.`)
console.log(`   `)
console.log(`   And now — for the first time — you can see the trend, not just today's number.`)
console.log(`   5D / 10D / 30D / 60D ATM IV history, updated daily. This is how you catch`)
console.log(`   volatility building before the price moves.`)
console.log(`   `)
console.log(`   #MCX #iVIX #IndiaVIX #ImpliedVolatility #Options #IndianCommodities #BhaavBrief`)
