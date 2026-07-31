#!/usr/bin/env node
/**
 * scripts/generate-atm-iv-reel.mjs
 *
 * BhaavBrief — "ATM IV: the number that prices the move" Explainer Reel (1080×1920)
 * Series 2 of the options-education line (series 1: generate-ivix-reel.mjs).
 * Educational format: Hook → Mechanism → Live Snapshot (expected move + bars) → Why It Matters
 *
 * Pulls today's real ATM IV + futures price + expiry for all 5 MCX instruments from the
 * live production API at render time — the on-screen numbers, including the expected-move
 * calc, are never hardcoded/stale.
 *
 * Usage:
 *   node scripts/generate-atm-iv-reel.mjs
 *
 * Output: public/reels/atm-iv-explainer.mp4
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
const PURPLE = '#6941C6' // matches ATM IV's color on the bhaavbrief.in/options volatility tile
const BORDER = '#E0DFD5'
const DARK   = '#121209'

// ── Canvas constants ──────────────────────────────────────────────────────────
// DURATION and phase boundaries are placeholders — recomputed from the voiceover's
// actual rendered length once it comes back from ElevenLabs (same pattern as the
// iVIX reel), so the video is never shorter than the audio.
const W = 1080, H = 1920, FPS = 30
let DURATION = 28
let TOTAL_FRAMES = DURATION * FPS

let HOOK_END = Math.round(0.13  * DURATION * FPS)  // hook
let MECH_END = Math.round(0.47  * DURATION * FPS)  // + mechanism (3 steps)
let SNAP_END = Math.round(0.76  * DURATION * FPS)  // + live snapshot
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

const fmtINR = n => n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`

// ── Live data ─────────────────────────────────────────────────────────────────
// Real numbers, fetched from production at render time — never hardcoded. This
// mirrors generate-ivix-reel.mjs's fetchLiveIVIX, but reads ATM IV straight off
// the chain (average of the ATM strike's CE/PE implied vol) instead of the iVIX
// field, and additionally pulls futures price + expiry for Gold to compute a
// live "expected move" figure.
const SITE = 'https://bhaavbrief.in'
const INSTRUMENTS = [
  { key: 'GOLD',       label: 'Gold'      },
  { key: 'SILVER',     label: 'Silver'    },
  { key: 'CRUDEOIL',   label: 'Crude Oil' },
  { key: 'NATURALGAS', label: 'Nat Gas'   },
  { key: 'COPPER',     label: 'Copper'    },
]

function atmIVFromChain(chain) {
  const atmRows = (chain ?? []).filter(r => r.isATM)
  const ivs = atmRows.flatMap(r => [r.CE?.iv, r.PE?.iv]).filter(v => v != null && v > 0)
  if (!ivs.length) return null
  return parseFloat((ivs.reduce((s, v) => s + v, 0) / ivs.length).toFixed(2))
}

async function fetchLiveData() {
  const rows = []
  let expectedMove = null // computed from Gold — the flagship instrument, most-watched by MCX options traders

  for (const { key, label } of INSTRUMENTS) {
    try {
      const res = await fetch(`${SITE}/api/options?instrument=${key}`, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) continue
      const data = await res.json()
      const atmIV = atmIVFromChain(data.chain)
      if (atmIV == null) continue
      rows.push({ label, atmIV })

      if (key === 'GOLD' && data.futurePrice > 0 && data.expiry) {
        const dte = Math.max(1, Math.ceil((new Date(data.expiry).getTime() - Date.now()) / 86400000))
        // Expected Move ≈ Price × ATM IV × √(days to expiry ÷ 365) — the standard
        // options-desk approximation for the underlying's expected range by expiry.
        const move = data.futurePrice * (atmIV / 100) * Math.sqrt(dte / 365)
        expectedMove = {
          price: data.futurePrice,
          atmIV,
          dte,
          move: Math.round(move),
          movePct: parseFloat(((move / data.futurePrice) * 100).toFixed(1)),
        }
      }
    } catch { /* skip on failure — reel still works with fewer rows */ }
  }
  return { rows, expectedMove }
}

console.log('📡  Fetching live ATM IV from bhaavbrief.in...')
const { rows: liveData, expectedMove } = await fetchLiveData()
if (liveData.length) {
  console.log('  ' + liveData.map(r => `${r.label} ${r.atmIV}%`).join(' · '))
} else {
  console.warn('  ⚠️  Could not fetch live data — snapshot phase will show a fallback message')
}
if (expectedMove) {
  console.log(`  Gold expected move: ${fmtINR(expectedMove.price)} ± ${fmtINR(expectedMove.move)} (${expectedMove.movePct}%) over ${expectedMove.dte}d`)
}
const highest = liveData.length ? liveData.reduce((a, b) => (b.atmIV > a.atmIV ? b : a)) : null

// ── Phase 1: HOOK ─────────────────────────────────────────────────────────────
function drawHook(ctx, t) {
  ctx.fillStyle = DARK
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, true)

  ctx.globalAlpha = clamp(t * 8, 0, 1)
  ctx.fillStyle   = PURPLE + '22'
  roundRect(ctx, W/2 - 160, 110, 320, 40, 20)
  ctx.fill()
  ctx.fillStyle = PURPLE
  ctx.font = 'bold 18px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '4px'
  ctx.fillText('OPTIONS 101', W/2, 136)
  ctx.letterSpacing = '0px'

  const a1 = easeOut(clamp(t * 4, 0, 1))
  ctx.globalAlpha = a1
  ctx.fillStyle = INK_6
  ctx.font = '42px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('The chain shows 20 IV% numbers.', W/2, 600)

  const a2 = easeOut(clamp((t - 0.28) * 4, 0, 1))
  ctx.globalAlpha = a2
  ctx.fillStyle = PURPLE
  ctx.font = 'bold 132px "Inter", sans-serif'
  ctx.fillText('ATM IV', W/2, 770)

  const a3 = easeOut(clamp((t - 0.5) * 5, 0, 1))
  ctx.globalAlpha = a3
  ctx.fillStyle = CREAM
  ctx.font = 'bold 44px "Inter", sans-serif'
  ctx.fillText('is the only one that prices the move.', W/2, 850)

  ctx.globalAlpha = clamp((t - 0.6) * 5, 0, 1)
  ctx.strokeStyle = '#FFFFFF14'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(120, 900); ctx.lineTo(W-120, 900); ctx.stroke()

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
  ctx.fillText('WHY TRADERS WATCH IT FIRST', W/2, 116)
  ctx.letterSpacing = '0px'

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 134); ctx.lineTo(W-60, 134); ctx.stroke()

  const steps = [
    {
      num: '01',
      title: 'The strike nearest the futures price',
      body: 'ATM IV = the average implied vol of the call and put at the strike closest to the current futures price — the market’s single cleanest volatility read.',
      threshold: 0.0,
    },
    {
      num: '02',
      title: 'It carries the most vega in the chain',
      body: 'Vega peaks exactly at-the-money — a 1-point move in ATM IV swings that option’s premium more than the same move at any OTM or ITM strike.',
      threshold: 0.34,
    },
    {
      num: '03',
      title: 'Multiply it out — you get the expected move',
      body: 'Expected Move ≈ Price × ATM IV × √(days to expiry ÷ 365). It’s how desks size the range before a number ever prints.',
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
    ctx.font = 'bold 34px "Inter", sans-serif'
    const titleLines = wrapText(ctx, step.title, W - 160)
    let ty = stepY + offsetY
    for (const l of titleLines) { ctx.fillText(l, 118, ty); ty += 46 }

    ctx.fillStyle = INK_4
    ctx.font = '28px "Inter", sans-serif'
    const bodyLines = wrapText(ctx, step.body, W - 140)
    for (const l of bodyLines) { ctx.fillText(l, 118, ty); ty += 40 }

    stepY = ty + 58
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
  ctx.fillText("TODAY'S ATM IV — LIVE", W/2, 116)
  ctx.letterSpacing = '0px'

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 134); ctx.lineTo(W-60, 134); ctx.stroke()

  if (!liveData.length) {
    ctx.globalAlpha = easeOut(clamp(t * 4, 0, 1))
    ctx.fillStyle = INK_4
    ctx.font = '32px "Inter", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('See live ATM IV for all 5 instruments', W/2, 500)
    ctx.fillText('at bhaavbrief.in/options', W/2, 550)
    ctx.globalAlpha = 1
    drawDots(ctx, 2, 4, false)
    return
  }

  // Expected-move card up top (Gold) — the concrete "so what" figure, computed live.
  let cardBottom = 180
  if (expectedMove) {
    const a = easeOut(clamp(t * 5, 0, 1))
    const yOff = 16 * (1 - spring(clamp(t * 4, 0, 1)))
    ctx.globalAlpha = a

    const cardY = 170 + yOff
    ctx.fillStyle = PURPLE + '14'
    roundRect(ctx, 60, cardY, W - 120, 210, 14)
    ctx.fill()
    ctx.strokeStyle = PURPLE + '33'; ctx.lineWidth = 1.5
    roundRect(ctx, 60, cardY, W - 120, 210, 14)
    ctx.stroke()

    ctx.fillStyle = INK_4
    ctx.font = 'bold 18px "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.letterSpacing = '3px'
    ctx.fillText('GOLD · EXPECTED MOVE', 88, cardY + 40)
    ctx.letterSpacing = '0px'

    ctx.fillStyle = INK
    ctx.font = 'bold 46px "Inter", sans-serif'
    ctx.fillText(`${fmtINR(expectedMove.price)}  ±${fmtINR(expectedMove.move)}`, 88, cardY + 96)

    ctx.fillStyle = PURPLE
    ctx.font = 'bold 30px "Inter", sans-serif'
    ctx.fillText(`≈ ±${expectedMove.movePct}% by expiry`, 88, cardY + 138)

    ctx.fillStyle = INK_4
    ctx.font = '22px "Inter", sans-serif'
    ctx.fillText(`ATM IV ${expectedMove.atmIV}%  ·  ${expectedMove.dte} days to expiry`, 88, cardY + 176)

    ctx.globalAlpha = 1
    cardBottom = cardY + 210 + 40
  }

  const maxIV = Math.max(...liveData.map(r => r.atmIV), 1)
  let rowY = cardBottom + 40
  const rowH = 128
  const snapStart = expectedMove ? 0.3 : 0

  liveData.forEach((row, i) => {
    const a = easeOut(clamp((t - snapStart - i * 0.1) / 0.25, 0, 1))
    const offsetX = 30 * (1 - spring(clamp((t - snapStart - i * 0.1) / 0.2, 0, 1)))
    ctx.globalAlpha = a

    const isHigh = highest && row.label === highest.label
    const barMaxW = W - 400
    const barW = (row.atmIV / maxIV) * barMaxW

    ctx.fillStyle = isHigh ? PURPLE : INK
    ctx.font = 'bold 30px "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(row.label, 60 + offsetX, rowY + 34)

    ctx.fillStyle = (isHigh ? PURPLE : GOLD) + '20'
    roundRect(ctx, 60 + offsetX, rowY + 48, barMaxW + 200, 40, 8)
    ctx.fill()
    ctx.fillStyle = isHigh ? PURPLE : GOLD
    roundRect(ctx, 60 + offsetX, rowY + 48, Math.max(barW, 10), 40, 8)
    ctx.fill()

    ctx.fillStyle = isHigh ? '#FFFFFF' : INK
    ctx.font = 'bold 26px "Inter", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${row.atmIV}%`, 60 + offsetX + barMaxW + 180, rowY + 75)

    rowY += rowH
  })

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
    { label: 'VEGA IS CONCENTRATED HERE',   detail: 'A 1-point move in ATM IV swings the ATM straddle’s premium more than any other strike in the chain' },
    { label: 'IT SPIKES BEFORE EVENTS',     detail: 'Fed decisions, OPEC+ meetings, RBI policy, EIA inventory — ATM IV usually runs up into the date, then crushes right after' },
    { label: 'COMPARE IT TO REALIZED VOL',  detail: 'ATM IV minus AAV 20d is BhaavBrief’s Vol Premium — positive means options are pricing more move than has actually happened' },
  ]

  let sy = 250
  points.forEach((p, i) => {
    const a = easeOut(clamp((t - i * 0.16) / 0.25, 0, 1))
    const yOff = 18 * (1 - spring(clamp((t - i * 0.16) / 0.2, 0, 1)))
    ctx.globalAlpha = a

    ctx.strokeStyle = '#FFFFFF0D'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(60, sy - 14 + yOff); ctx.lineTo(W-60, sy - 14 + yOff); ctx.stroke()

    ctx.beginPath()
    ctx.arc(72, sy + 8 + yOff, 6, 0, Math.PI * 2)
    ctx.fillStyle = PURPLE
    ctx.fill()

    ctx.fillStyle = CREAM
    ctx.font = 'bold 28px "Inter", sans-serif'
    ctx.textAlign = 'left'
    const labelLines = wrapText(ctx, p.label, W - 160)
    let ly = sy + 14 + yOff
    for (const l of labelLines) { ctx.fillText(l, 96, ly); ly += 36 }

    ctx.fillStyle = INK_6
    ctx.font = '25px "Inter", sans-serif'
    const detailLines = wrapText(ctx, p.detail, W - 160)
    let dy = ly + 8
    for (const l of detailLines) { ctx.fillText(l, 96, dy); dy += 34 }
    sy = dy + 36
  })

  const payA = easeOut(clamp((t - 0.68) * 5, 0, 1))
  ctx.globalAlpha = payA
  ctx.strokeStyle = '#FFFFFF14'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, sy + 20); ctx.lineTo(W-60, sy + 20); ctx.stroke()

  ctx.fillStyle = CREAM
  ctx.font = 'bold 48px "Inter", sans-serif'
  ctx.textAlign = 'center'
  const payLines = wrapText(ctx, 'One number. The whole chain’s temperature.', W - 120)
  let py = sy + 100
  for (const l of payLines) { ctx.fillText(l, W/2, py); py += 66 }

  const ctaA = easeOut(clamp((t - 0.85) * 6, 0, 1))
  ctx.globalAlpha = ctaA
  ctx.fillStyle = INK_6
  ctx.font = '28px "Inter", sans-serif'
  ctx.fillText('Options → Volatility tab', W/2, py + 60)
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
// The live per-instrument numbers and the expected-move figure are already carried
// by the on-screen snapshot phase — the voiceover doesn't repeat exact values, so
// it isn't tied to a number that could read awkwardly once spoken aloud.
const VOICEOVER_SCRIPT = `Every option chain throws twenty eye-vee numbers at you. Only one actually matters first: ATM eye-vee — the implied vol at the strike closest to the futures price. It carries the most vega in the entire chain, so it moves premiums more than any other strike.

Multiply it by price and the square root of time to expiry, and you get the expected move — how far the market thinks price can travel before that date.

Watch it climb into Fed meetings, OPEC decisions, RBI policy — and crush right after. That's the tell.

Track today's ATM eye-vee, live, at BhaavBrief dot in slash options.`

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
  // "volatile" track fits an explainer about implied volatility — same choice as the iVIX reel
  const volatileFile = join(ROOT, 'public/reels/music/volatile.mp3')
  if (existsSync(volatileFile)) return volatileFile
  const calmFile = join(ROOT, 'public/reels/music/calm.mp3')
  if (existsSync(calmFile)) return calmFile
  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────
const FRAMES_DIR  = join(ROOT, '.atm-iv-reel-frames-tmp')
const OUTPUT_DIR  = join(ROOT, 'public/reels')
const OUTPUT_FILE = join(OUTPUT_DIR, 'atm-iv-explainer.mp4')
const VOICE_FILE  = join(OUTPUT_DIR, 'atm-iv-explainer-voice.mp3')

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
    HOOK_END     = Math.round(0.13 * TOTAL_FRAMES)
    MECH_END     = Math.round(0.47 * TOTAL_FRAMES)
    SNAP_END     = Math.round(0.76 * TOTAL_FRAMES)
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
console.log(`   The option chain shows 20 IV% numbers. Only one prices the move: ATM IV. 📈`)
console.log(`   `)
console.log(`   It's the implied vol at the strike closest to the futures price — and it carries`)
console.log(`   the most vega in the whole chain, so it swings premiums more than any other strike.`)
console.log(`   `)
console.log(`   Multiply Price × ATM IV × √(days to expiry ÷ 365) and you get the Expected Move —`)
console.log(`   the range the market is pricing before that date.`)
console.log(`   `)
console.log(`   It runs up into Fed / OPEC+ / RBI dates and crushes right after. Compare it to`)
console.log(`   realized vol (AAV) and you know if options are cheap or expensive — that's BhaavBrief's`)
console.log(`   Vol Premium metric.`)
console.log(`   `)
console.log(`   Series 2 of our options-education line. Series 1 was iVIX — this is what feeds it.`)
console.log(`   `)
console.log(`   #MCX #OptionsTrading #ImpliedVolatility #ATMIV #ExpectedMove #IndianCommodities #BhaavBrief`)
