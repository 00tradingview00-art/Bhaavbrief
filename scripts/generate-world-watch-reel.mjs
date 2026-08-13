#!/usr/bin/env node
/**
 * scripts/generate-world-watch-reel.mjs
 *
 * BhaavBrief — "Iran → Crude → Gold" World Watch Reel (1080×1920)
 * A real 3-week timeline pulled straight from content/flash/*.mdx, showing how
 * one geopolitical thread (Iran / Strait of Hormuz) has moved MCX Crude and Gold
 * differently at each turn — then the live current reaction, fetched at render
 * time so the numbers are never stale.
 *
 * Educational format: Hook → Timeline → Live Snapshot → Why It Matters
 *
 * Usage:
 *   node scripts/generate-world-watch-reel.mjs
 *
 * Output: public/reels/iran-crude-gold-explainer.mp4
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
const PURPLE = '#6941C6' // reserved for the ATM IV/vol callback — same hue as Series 1 & 2
const RED    = '#B33A2E' // geopolitical/risk thread — distinct from the vol-education purple
const GREEN  = '#1A7A4A'
const BORDER = '#E0DFD5'
const DARK   = '#121209'

// ── Canvas constants ──────────────────────────────────────────────────────────
const W = 1080, H = 1920, FPS = 30
let DURATION = 30
let TOTAL_FRAMES = DURATION * FPS

let HOOK_END = Math.round(0.13 * DURATION * FPS)
let TIME_END = Math.round(0.47 * DURATION * FPS)
let SNAP_END = Math.round(0.76 * DURATION * FPS)

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
    ctx.fillStyle = i < active ? RED : (dark ? '#FFFFFF22' : BORDER)
    ctx.fill()
  }
}

const fmtINR = n => n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`
const fmtPct = n => n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

// ── Timeline — loaded from data/world-watch-events.json so it can be updated
// without editing this script. Keep 3 events that tell a connected story.
function loadTimeline() {
  const p = join(ROOT, 'data/world-watch-events.json')
  try {
    const data = JSON.parse(readFileSync(p, 'utf8'))
    if (Array.isArray(data.events) && data.events.length > 0) {
      console.log(`  📅  Timeline loaded (updated_at: ${data.updated_at ?? 'unknown'})`)
      return data.events
    }
  } catch (e) { console.warn(`  ⚠️  Could not load world-watch-events.json: ${e.message}`) }
  // Hard fallback so the script still runs if the file is missing
  return [
    { date: 'JUL 08', headline: 'Iran Strikes Trigger Crude, Gold Rally', takeaway: 'Crude and Gold rally together on Hormuz threat.' },
    { date: 'JUL 13', headline: 'Crude rallies; Gold retreats as risk premium priced in', takeaway: 'Same headline, opposite moves.' },
    { date: 'JUL 15', headline: 'Fresh US strikes on Iran; Hormuz threat peaks', takeaway: 'Crude and Gold spike together again.' },
  ]
}
const TIMELINE = loadTimeline()

// ── Live data ─────────────────────────────────────────────────────────────────
// Real numbers, fetched from production at render time — never hardcoded. Same
// pattern as generate-atm-iv-reel.mjs's atmIVFromChain.
const SITE = 'https://bhaavbrief.in'

function atmIVFromChain(chain) {
  const atmRows = (chain ?? []).filter(r => r.isATM)
  const ivs = atmRows.flatMap(r => [r.CE?.iv, r.PE?.iv]).filter(v => v != null && v > 0)
  if (!ivs.length) return null
  return parseFloat((ivs.reduce((s, v) => s + v, 0) / ivs.length).toFixed(2))
}

async function fetchLiveSnapshot() {
  const out = { crude: null, gold: null }
  try {
    const res = await fetch(`${SITE}/api/prices`, { signal: AbortSignal.timeout(10000) })
    if (res.ok) {
      const d = await res.json()
      if (d.crude?.mcx) out.crude = { price: d.crude.mcx, changePct: d.crude.mcxChangePct ?? null }
      if (d.gold?.mcx)  out.gold  = { price: d.gold.mcx,  changePct: d.gold.mcxChangePct  ?? null }
    }
  } catch { /* snapshot phase falls back to a static line if this fails */ }

  for (const [key, slot] of [['CRUDEOIL', 'crude'], ['GOLD', 'gold']]) {
    try {
      const res = await fetch(`${SITE}/api/options?instrument=${key}`, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) continue
      const d = await res.json()
      const atmIV = atmIVFromChain(d.chain)
      if (out[slot]) out[slot].atmIV = atmIV
      else if (atmIV != null) out[slot] = { price: d.futurePrice, changePct: null, atmIV }
    } catch { /* skip */ }
  }
  return out
}

console.log('📡  Fetching live Crude/Gold snapshot from bhaavbrief.in...')
const live = await fetchLiveSnapshot()
if (live.crude) console.log(`  Crude: ${fmtINR(live.crude.price)} (${fmtPct(live.crude.changePct)}) · ATM IV ${live.crude.atmIV ?? '—'}%`)
if (live.gold)  console.log(`  Gold:  ${fmtINR(live.gold.price)} (${fmtPct(live.gold.changePct)}) · ATM IV ${live.gold.atmIV ?? '—'}%`)
if (!live.crude && !live.gold) console.warn('  ⚠️  Could not fetch live snapshot — Phase 3 will show sourced levels only')

// ── Phase 1: HOOK ─────────────────────────────────────────────────────────────
function drawHook(ctx, t) {
  ctx.fillStyle = DARK
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, true)

  ctx.globalAlpha = clamp(t * 8, 0, 1)
  ctx.fillStyle   = RED + '22'
  roundRect(ctx, W/2 - 150, 110, 300, 40, 20)
  ctx.fill()
  ctx.fillStyle = RED
  ctx.font = 'bold 18px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '4px'
  ctx.fillText('WORLD WATCH', W/2, 136)
  ctx.letterSpacing = '0px'

  const a1 = easeOut(clamp(t * 4, 0, 1))
  ctx.globalAlpha = a1
  ctx.fillStyle = INK_6
  ctx.font = '42px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Three headlines. Three weeks.', W/2, 610)

  const a2 = easeOut(clamp((t - 0.28) * 4, 0, 1))
  ctx.globalAlpha = a2
  ctx.fillStyle = RED
  ctx.font = 'bold 76px "Inter", sans-serif'
  ctx.fillText('IRAN → CRUDE → GOLD', W/2, 700)

  const a3 = easeOut(clamp((t - 0.5) * 5, 0, 1))
  ctx.globalAlpha = a3
  ctx.fillStyle = CREAM
  ctx.font = 'bold 40px "Inter", sans-serif'
  const l3 = wrapText(ctx, 'How a Middle East conflict is showing up in your option chain.', W - 160)
  let ly = 800
  for (const l of l3) { ctx.fillText(l, W/2, ly); ly += 52 }

  ctx.globalAlpha = clamp((t - 0.6) * 5, 0, 1)
  ctx.strokeStyle = '#FFFFFF14'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(120, ly + 20); ctx.lineTo(W-120, ly + 20); ctx.stroke()

  ctx.globalAlpha = clamp((t - 0.65) * 5, 0, 1)
  ctx.fillStyle   = '#FFFFFF1A'
  ctx.font        = '22px "Inter", sans-serif'
  ctx.fillText('bhaavbrief.in', W/2, H - 60)

  ctx.globalAlpha = 1
}

// ── Phase 2: TIMELINE ──────────────────────────────────────────────────────────
function drawTimeline(ctx, t) {
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, false)

  ctx.fillStyle = RED
  ctx.font = 'bold 20px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '5px'
  ctx.fillText('THE TIMELINE', W/2, 116)
  ctx.letterSpacing = '0px'

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 134); ctx.lineTo(W-60, 134); ctx.stroke()

  let stepY = 210
  TIMELINE.forEach((item, i) => {
    const threshold = i * 0.32
    const a = easeOut(clamp((t - threshold) / 0.25, 0, 1))
    const offsetY = 20 * (1 - spring(clamp((t - threshold) / 0.2, 0, 1)))
    ctx.globalAlpha = a

    ctx.fillStyle = RED
    ctx.font = 'bold 24px "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(item.date, 60, stepY + offsetY)

    ctx.strokeStyle = RED + '44'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(158, stepY - 12 + offsetY); ctx.lineTo(158, stepY + 10 + offsetY); ctx.stroke()

    ctx.fillStyle = INK
    ctx.font = 'bold 30px "Inter", sans-serif'
    const titleLines = wrapText(ctx, item.headline, W - 220)
    let ty = stepY + offsetY
    for (const l of titleLines) { ctx.fillText(l, 176, ty); ty += 40 }

    ctx.fillStyle = INK_4
    ctx.font = '25px "Inter", sans-serif'
    const bodyLines = wrapText(ctx, item.takeaway, W - 236)
    for (const l of bodyLines) { ctx.fillText(l, 176, ty + 4); ty += 34 }

    stepY = ty + 54
  })

  ctx.globalAlpha = 1
  drawDots(ctx, 1, 4, false)
}

// ── Phase 3: LIVE SNAPSHOT ─────────────────────────────────────────────────────
function drawSnapshot(ctx, t) {
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, false)

  ctx.fillStyle = RED
  ctx.font = 'bold 20px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '5px'
  ctx.fillText('LIVE ON MCX RIGHT NOW', W/2, 116)
  ctx.letterSpacing = '0px'

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 134); ctx.lineTo(W-60, 134); ctx.stroke()

  const cards = [
    { label: 'MCX Crude Oil', data: live.crude },
    { label: 'MCX Gold',      data: live.gold  },
  ]

  let cardY = 170
  cards.forEach((card, i) => {
    const a = easeOut(clamp((t - i * 0.16) / 0.25, 0, 1))
    const yOff = 16 * (1 - spring(clamp((t - i * 0.16) / 0.2, 0, 1)))
    ctx.globalAlpha = a
    const cy = cardY + yOff

    ctx.fillStyle = RED + '10'
    roundRect(ctx, 60, cy, W - 120, 160, 14)
    ctx.fill()
    ctx.strokeStyle = RED + '33'; ctx.lineWidth = 1.5
    roundRect(ctx, 60, cy, W - 120, 160, 14)
    ctx.stroke()

    ctx.fillStyle = INK_4
    ctx.font = 'bold 16px "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.letterSpacing = '2px'
    ctx.fillText(card.label.toUpperCase(), 86, cy + 34)
    ctx.letterSpacing = '0px'

    if (card.data) {
      ctx.fillStyle = INK
      ctx.font = 'bold 42px "Inter", sans-serif'
      ctx.fillText(fmtINR(card.data.price), 86, cy + 84)

      if (card.data.changePct != null) {
        ctx.fillStyle = card.data.changePct >= 0 ? GREEN : RED
        ctx.font = 'bold 24px "Inter", sans-serif'
        ctx.fillText(fmtPct(card.data.changePct), 86, cy + 118)
      }

      if (card.data.atmIV != null) {
        ctx.fillStyle = PURPLE
        ctx.font = 'bold 22px "Inter", sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(`ATM IV ${card.data.atmIV}%`, W - 86, cy + 100)
      }
    } else {
      ctx.fillStyle = INK_4
      ctx.font = '24px "Inter", sans-serif'
      ctx.fillText('See live price at bhaavbrief.in', 86, cy + 84)
    }

    cardY = cy + 160 + 26
  })

  const noteA = easeOut(clamp((t - 0.5) * 4, 0, 1))
  ctx.globalAlpha = noteA
  ctx.fillStyle = INK_2
  ctx.font = 'bold 18px "Inter", sans-serif'
  ctx.textAlign = 'left'
  ctx.letterSpacing = '1.5px'
  ctx.fillText('FROM THE JUL 15 FLASH', 60, cardY + 16)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = INK_4
  ctx.font = '24px "Inter", sans-serif'
  let ny = cardY + 56
  const note1 = wrapText(ctx, '$75–76/barrel support · sustained breach above $80 = supply-fear premium', W - 120)
  for (const l of note1) { ctx.fillText(l, 60, ny); ny += 34 }
  ny += 10
  const note2 = wrapText(ctx, 'Watch: Brent–WTI spread widening beyond $3/barrel', W - 120)
  for (const l of note2) { ctx.fillText(l, 60, ny); ny += 34 }

  ctx.globalAlpha = 1
  drawDots(ctx, 2, 4, false)
}

// ── Phase 4: WHY IT MATTERS / CTA ──────────────────────────────────────────────
function drawWatch(ctx, t) {
  ctx.fillStyle = DARK
  ctx.fillRect(0, 0, W, H)
  drawBrandBar(ctx, true)

  ctx.globalAlpha = clamp(t * 8, 0, 1)
  ctx.fillStyle   = RED
  ctx.font = 'bold 22px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '8px'
  ctx.fillText('WHY IT MATTERS', W/2, 130)
  ctx.letterSpacing = '0px'

  const points = [
    { label: 'CRUDE AND GOLD DON’T ALWAYS AGREE', detail: 'Same headline, different reaction each time — watch both, not just one', accent: RED },
    { label: 'THIS IS WHY ATM IV IS ELEVATED',    detail: 'A live conflict thread keeps repricing the expected move — the exact mechanism from our ATM IV explainer', accent: PURPLE },
    { label: 'BHAAVBRIEF FLAGS IT AS IT BREAKS',  detail: 'Every one of these three headlines was a live Flash post, tagged to the instrument, the moment it happened', accent: RED },
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
    ctx.fillStyle = p.accent
    ctx.fill()

    ctx.fillStyle = CREAM
    ctx.font = 'bold 27px "Inter", sans-serif'
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
  ctx.font = 'bold 46px "Inter", sans-serif'
  ctx.textAlign = 'center'
  const payLines = wrapText(ctx, 'The world moves first. Your option chain moves second.', W - 120)
  let py = sy + 100
  for (const l of payLines) { ctx.fillText(l, W/2, py); py += 60 }

  const ctaA = easeOut(clamp((t - 0.85) * 6, 0, 1))
  ctx.globalAlpha = ctaA
  ctx.fillStyle = INK_6
  ctx.font = '28px "Inter", sans-serif'
  ctx.fillText('Follow the Feed', W/2, py + 60)
  ctx.fillStyle = RED
  ctx.font = 'bold 32px "Inter", sans-serif'
  ctx.fillText('@bhaavbrief  ·  bhaavbrief.in/feed', W/2, py + 104)

  ctx.globalAlpha = 1
  drawDots(ctx, 4, 4, true)
}

// ── Frame renderer ────────────────────────────────────────────────────────────
function renderFrame(frame) {
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  if (frame < HOOK_END) {
    drawHook(ctx, frame / HOOK_END)
  } else if (frame < TIME_END) {
    drawTimeline(ctx, (frame - HOOK_END) / (TIME_END - HOOK_END))
  } else if (frame < SNAP_END) {
    drawSnapshot(ctx, (frame - TIME_END) / (SNAP_END - TIME_END))
  } else {
    drawWatch(ctx, (frame - SNAP_END) / (TOTAL_FRAMES - SNAP_END))
  }

  return canvas.toBuffer('image/png')
}

// ── ElevenLabs voiceover ──────────────────────────────────────────────────────
const VOICEOVER_SCRIPT = `Three weeks. Three headlines. One story moving MCX. July 8th: Iran strikes trigger a crude and gold rally. July 13th: crude keeps rallying, but gold pulls back — the market had already priced the risk into gold. July 15th: fresh US strikes on Iran, and this time crude and gold spike together as the threat to Hormuz peaks.

Same conflict, different reaction each time — that's exactly why ATM eye-vee is elevated right now.

BhaavBrief flags these the moment they break. Follow the feed at BhaavBrief dot in.`

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
  // "downbeat" fits a tenser geopolitical/risk story better than the calmer tracks
  const downbeatFile = join(ROOT, 'public/reels/music/downbeat.mp3')
  if (existsSync(downbeatFile)) return downbeatFile
  const volatileFile = join(ROOT, 'public/reels/music/volatile.mp3')
  if (existsSync(volatileFile)) return volatileFile
  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────
const FRAMES_DIR  = join(ROOT, '.world-watch-reel-frames-tmp')
const OUTPUT_DIR  = join(ROOT, 'public/reels')
const OUTPUT_FILE = join(OUTPUT_DIR, 'iran-crude-gold-explainer.mp4')
const VOICE_FILE  = join(OUTPUT_DIR, 'iran-crude-gold-explainer-voice.mp3')

mkdirSync(FRAMES_DIR,  { recursive: true })
mkdirSync(OUTPUT_DIR,  { recursive: true })

console.log('🎙️   Generating voiceover...')
const voicePath = await generateVoiceover(VOICE_FILE)

if (voicePath) {
  const voiceDuration = getAudioDuration(voicePath)
  if (voiceDuration) {
    DURATION     = Math.ceil(voiceDuration + 1.5)
    TOTAL_FRAMES = DURATION * FPS
    HOOK_END     = Math.round(0.13 * TOTAL_FRAMES)
    TIME_END     = Math.round(0.47 * TOTAL_FRAMES)
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

rmSync(FRAMES_DIR, { recursive: true, force: true })
if (voicePath) rmSync(VOICE_FILE, { force: true })

console.log('\n📱  Ready to post:')
console.log(`   ${OUTPUT_FILE}`)
console.log('\n📝  Suggested caption:')
console.log(`   Three weeks. Three headlines. One story moving MCX. 🌍`)
console.log(`   `)
console.log(`   Jul 8 — Iran strikes trigger a Crude + Gold rally.`)
console.log(`   Jul 13 — Crude keeps rallying. Gold retreats — the risk was already priced in.`)
console.log(`   Jul 15 — Fresh US strikes on Iran. Crude and Gold spike together again as the`)
console.log(`   threat to the Strait of Hormuz peaks.`)
console.log(`   `)
console.log(`   Same conflict, different reaction each time. That's exactly why ATM IV is`)
console.log(`   elevated right now — a live geopolitical thread keeps repricing the expected move.`)
console.log(`   `)
console.log(`   We flag these the moment they break. Follow the Feed → link in bio.`)
console.log(`   `)
console.log(`   #MCX #Iran #CrudeOil #Gold #Geopolitics #IndianCommodities #OptionsTrading #BhaavBrief`)
