#!/usr/bin/env node
/**
 * scripts/generate-flash-reel.mjs
 *
 * BhaavBrief — Flash Article → 20-second 1080×1920 Reel.
 * "Breaking signal" format: hook → two analysis beats → watch level.
 *
 * Usage:
 *   node scripts/generate-flash-reel.mjs --slug mcx-crude-slides-1-59-on-demand-fears
 *   node scripts/generate-flash-reel.mjs --file content/flash/2026-06-30-22-23-...mdx
 *   node scripts/generate-flash-reel.mjs          ← latest flash article
 */

import Anthropic                              from '@anthropic-ai/sdk'
import { createCanvas, GlobalFonts }          from '@napi-rs/canvas'
import { readFileSync, writeFileSync,
         mkdirSync, existsSync, rmSync,
         readdirSync }                        from 'fs'
import { join, dirname, basename }            from 'path'
import { fileURLToPath }                      from 'url'
import { execFileSync }                       from 'child_process'
import matter                                 from 'gray-matter'

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

// ── Flash article loader ──────────────────────────────────────────────────────
function findFlashFile() {
  const args = process.argv.slice(2)
  const fileArg  = args.find((_, i) => args[i-1] === '--file')
  const slugArg  = args.find((_, i) => args[i-1] === '--slug')

  if (fileArg) return fileArg.startsWith('/') ? fileArg : join(ROOT, fileArg)
  if (slugArg) {
    const dir   = join(ROOT, 'content/flash')
    const match = readdirSync(dir).find(f => f.includes(slugArg))
    if (!match) throw new Error(`Flash article not found for slug: ${slugArg}`)
    return join(dir, match)
  }
  // Latest flash article
  const dir   = join(ROOT, 'content/flash')
  const files = readdirSync(dir).filter(f => f.endsWith('.mdx')).sort()
  if (!files.length) throw new Error('No flash articles found in content/flash/')
  return join(dir, files[files.length - 1])
}

function readFlash(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  const slug = basename(filePath, '.mdx')

  // Extract named sections from bold headers
  const section = (name) => {
    const re = new RegExp(`\\*\\*${name}\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*[A-Z ]+\\*\\*|---|$)`, 'i')
    return (content.match(re)?.[1] ?? '').replace(/\*\*/g, '').trim()
  }

  return {
    data,
    slug,
    title:      data.title ?? '',
    category:   data.category ?? 'energy',
    impact:     (content.match(/\*\*IMPACT:\*\*\s*(\w+)/i)?.[1] ?? 'neutral').toLowerCase(),
    whatHappened: section('WHAT HAPPENED'),
    whatItMeans:  section('WHAT IT MEANS'),
    whoAffected:  section('WHO IS AFFECTED'),
    bottomLine:   section('BOTTOM LINE'),
    whatToWatch:  section('WHAT TO WATCH'),
  }
}

function readSnapshot() {
  const p = join(ROOT, 'data/market-snapshot.json')
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null
}

// ── Copy extraction ───────────────────────────────────────────────────────────
async function extractReelCopy(flash) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const msg = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role:    'user',
      content: `You are the head of content for BhaavBrief — India's only daily MCX commodity intelligence brand. You have 6 years building finance reels that actual traders, importers and manufacturers watch.

This is a 20-second Instagram Flash Reel. The audience already knows what MCX is. They need the signal, not the background.

Flash article: "${flash.title}"
Category: ${flash.category} | Impact: ${flash.impact}

WHAT HAPPENED:
${flash.whatHappened}

WHAT IT MEANS:
${flash.whatItMeans}

BOTTOM LINE:
${flash.bottomLine}

WHAT TO WATCH:
${flash.whatToWatch}

Rules:
- NEVER start with a question
- Numbers are your anchor — every beat must contain one
- Tone: sharp colleague tap on the shoulder, not a news anchor
- No passive voice, no "it was noted that"

Return ONLY this JSON:
{
  "dominant_instrument": "The single MCX instrument this flash is about — full name e.g. 'MCX CRUDE' or 'MCX COPPER'",

  "hook_number": "The single most striking number — format exactly as it should appear visually. Example: '₹6,621' or '-1.59%' or '+1.16%'",
  "hook_label": "What that number is. Max 5 words. Example: 'MCX Crude today' or 'Silver move, session'",

  "beat1": "WHAT HAPPENED compressed to ONE punchy sentence. Lead with the number. Under 22 words. No passive voice.",
  "beat2": "The non-obvious structural context behind this move — what it reveals about the market. ONE sentence. Under 22 words. No directional instruction.",

  "watch_level": "The observable price level or data event the market is focused on and what it represents. Under 20 words. Must include a number.",

  "payoff": "One sentence capturing the most unusual or non-obvious thing about today's data. Under 12 words. An observation — not a directional instruction.",

  "voiceover": "Spoken word, not a script. 5 sentences, each under 9 words. Contractions only. First sentence = the number and what moved. Second = what caused it. Third = the non-obvious impact. Fourth = the specific watch level. Fifth = 'BhaavBrief.' — pause before it, said like a signature. No filler, no hedge words."
}`,
    }],
  })

  const raw = msg.content[0].text.trim()
  try { return JSON.parse(raw) }
  catch {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error(`JSON parse failed: ${raw.slice(0, 200)}`)
  }
}

// ── Music ─────────────────────────────────────────────────────────────────────
const MUSIC_BASE = 'https://archive.org/download/Incompetech/mp3-royaltyfree'
const TRACKS = {
  UPBEAT:   { file: 'public/reels/music/upbeat.mp3',  url: `${MUSIC_BASE}/Back%20on%20Track.mp3` },
  DOWNBEAT: { file: 'public/reels/music/downbeat.mp3', url: `${MUSIC_BASE}/An%20Upsetting%20Theme.mp3` },
  VOLATILE: { file: 'public/reels/music/volatile.mp3', url: `${MUSIC_BASE}/Anxiety.mp3` },
  CALM:     { file: 'public/reels/music/calm.mp3',     url: null },
}

function classifyMood(flash) {
  const impact = flash.impact
  if (impact === 'bullish')  return 'UPBEAT'
  if (impact === 'bearish')  return 'DOWNBEAT'
  if (impact === 'volatile') return 'VOLATILE'
  return 'CALM'
}

async function ensureMusic(mood) {
  const { file, url } = TRACKS[mood]
  const abs = join(ROOT, file)
  if (existsSync(abs)) return abs
  if (mood === 'CALM') {
    const legacy = join(ROOT, 'public/reels/the-complex.mp3')
    if (existsSync(legacy)) { mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, readFileSync(legacy)); return abs }
    // Fallback to volatile
    return ensureMusic('VOLATILE')
  }
  if (!url) throw new Error(`Missing music: ${file}`)
  console.log(`  ⬇️  Downloading ${mood} track...`)
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, buf)
  return abs
}

// ── ElevenLabs voiceover ──────────────────────────────────────────────────────
async function generateVoiceover(script, outputPath) {
  const apiKey  = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB'
  if (!apiKey) { console.warn('  ⚠️  ELEVENLABS_API_KEY not set'); return null }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method:  'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text:      script,
      model_id:  'eleven_multilingual_v2',
      voice_settings: { stability: 0.32, similarity_boost: 0.78, style: 0.60, use_speaker_boost: true },
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) { console.warn(`  ⚠️  ElevenLabs failed (${res.status})`); return null }
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(outputPath, buf)
  console.log(`  ✅  Voiceover (${(buf.length/1024).toFixed(0)} KB)`)
  return outputPath
}

// ── Canvas constants ──────────────────────────────────────────────────────────
const W = 1080, H = 1920, FPS = 30, TOTAL_FRAMES = 20 * FPS

const HOOK_END     = Math.round(2.5 * FPS)   // 0–2.5s
const BEAT1_END    = Math.round(8.5 * FPS)   // 2.5–8.5s
const BEAT2_END    = Math.round(14.5 * FPS)  // 8.5–14.5s
const SIGNAL_END   = TOTAL_FRAMES             // 14.5–20s

const CREAM  = '#FAFAF6'
const INK    = '#18180F'
const INK_2  = '#2C2C22'
const INK_4  = '#8A8A7A'
const INK_6  = '#BCBCAA'
const GOLD   = '#C8720A'
const RED    = '#C0392B'
const GREEN  = '#1A7A4A'
const BORDER = '#E0DFD5'

const MOOD_BG = { BULLISH: '#0F1F14', BEARISH: '#1F0F0F', VOLATILE: '#0F0F1F', CALM: '#1A1A14' }

const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const easeOut = t => 1 - Math.pow(1 - t, 3)
const spring  = t => { const c = clamp(t, 0, 1); return 1 - (1 - c) * (1 - c) * (1 - c) }

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r)
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h)
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r)
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y)
  ctx.closePath()
}

function wrapText(ctx, text, maxW) {
  const words = text.split(' '), lines = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

// ── Phase 1: HOOK — dark, big number, signal label ───────────────────────────
function drawHook(ctx, t, copy, flash, mood) {
  const bg = MOOD_BG[mood] ?? '#1A1A14'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 8)

  // "SIGNAL" label — small gold mono
  ctx.globalAlpha = clamp(t * 10, 0, 1)
  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 22px "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '8px'
  ctx.fillText('MCX UPDATE', W/2, 72)
  ctx.letterSpacing = '0px'

  // Instrument label
  ctx.globalAlpha = clamp(t * 7, 0, 1)
  ctx.fillStyle   = INK_6
  ctx.font        = 'bold 28px "Inter", sans-serif'
  ctx.letterSpacing = '3px'
  ctx.fillText(copy.dominant_instrument ?? flash.category.toUpperCase(), W/2, 520)
  ctx.letterSpacing = '0px'

  // THE BIG NUMBER — slams in
  const numA = easeOut(clamp(t * 4, 0, 1))
  const numScale = 1 + 0.06 * (1 - numA)
  ctx.save()
  ctx.translate(W/2, 680)
  ctx.scale(numScale, numScale)
  ctx.globalAlpha = numA
  const isUp = !String(copy.hook_number ?? '').startsWith('-')
  ctx.fillStyle = isUp ? GREEN : RED
  ctx.font      = 'bold 120px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(copy.hook_number ?? '', 0, 0)
  ctx.restore()

  // Hook label
  ctx.globalAlpha = clamp((t - 0.2) * 6, 0, 1)
  ctx.fillStyle   = CREAM
  ctx.font        = '40px "Inter", sans-serif'
  ctx.fillText(copy.hook_label ?? '', W/2, 790)

  // Thin rule
  ctx.globalAlpha = clamp((t - 0.3) * 5, 0, 1)
  ctx.strokeStyle = '#FFFFFF14'
  ctx.lineWidth   = 1
  ctx.beginPath(); ctx.moveTo(120, 840); ctx.lineTo(W-120, 840); ctx.stroke()

  // Flash title — smaller, below rule
  ctx.globalAlpha = clamp((t - 0.4) * 5, 0, 1)
  ctx.fillStyle   = INK_6
  ctx.font        = '30px "Inter", sans-serif'
  const titleLines = wrapText(ctx, flash.title, W - 200)
  let ty = 890
  for (const l of titleLines.slice(0, 2)) { ctx.fillText(l, W/2, ty); ty += 46 }

  // BhaavBrief watermark bottom
  ctx.globalAlpha = clamp((t - 0.5) * 4, 0, 1)
  ctx.fillStyle   = '#FFFFFF22'
  ctx.font        = '24px "Inter", sans-serif'
  ctx.fillText('bhaavbrief.in', W/2, H - 60)

  ctx.globalAlpha = 1
}

// ── Phase 2 & 3: BEAT — cream bg, cumulative text ────────────────────────────
function drawBeat(ctx, beatIndex, beatT, copy, snapshot) {
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 8)

  // Wordmark
  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 22px "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '6px'
  ctx.fillText('BHAAVBRIEF', W/2, 68)
  ctx.letterSpacing = '0px'

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 88); ctx.lineTo(W-60, 88); ctx.stroke()

  // Price strip
  const instruments = [
    { label: 'GOLD',   key: 'MCX_GOLD',   fmt: v => `₹${Math.round(v).toLocaleString('en-IN')}` },
    { label: 'CRUDE',  key: 'MCX_CRUDE',  fmt: v => `₹${Math.round(v)}` },
    { label: 'SILVER', key: 'MCX_SILVER', fmt: v => `₹${Math.round(v/1000)}K` },
    { label: '$/₹',    key: 'USDINR',     fmt: v => `${v.toFixed(2)}` },
  ]
  const stripW = (W - 120) / 4
  instruments.forEach((inst, i) => {
    const instr = snapshot?.instruments?.[inst.key]
    const px    = 60 + i * stripW
    const pct   = instr?.changePct ?? 0
    const isUp  = pct >= 0
    ctx.fillStyle = INK_4
    ctx.font = 'bold 15px "Inter", sans-serif'
    ctx.textAlign = 'left'; ctx.letterSpacing = '1px'
    ctx.fillText(inst.label, px + 4, 114); ctx.letterSpacing = '0px'
    ctx.fillStyle = INK; ctx.font = 'bold 21px "Inter", sans-serif'
    ctx.fillText(instr ? inst.fmt(instr.price) : '—', px + 4, 138)
    ctx.fillStyle = isUp ? GREEN : RED; ctx.font = '17px "Inter", sans-serif'
    ctx.fillText(`${isUp ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`, px + 4, 160)
  })
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 180); ctx.lineTo(W-60, 180); ctx.stroke()

  // Beats — cumulative build, two beats total
  const beats = [copy.beat1, copy.beat2]
  const yPos  = [440, 960]

  for (let b = 0; b < beatIndex; b++) {
    const isCurrent = (b === beatIndex - 1)
    const entryT    = isCurrent ? clamp(beatT * 4, 0, 1) : 1
    const yOffset   = isCurrent ? 20 * (1 - spring(clamp(beatT * 3, 0, 1))) : 0

    ctx.globalAlpha = easeOut(entryT)

    if (b === 0) {
      // Beat 1: large body — what happened
      ctx.fillStyle = INK
      ctx.font      = 'bold 48px "Inter", sans-serif'
      ctx.textAlign = 'left'
      const lines = wrapText(ctx, beats[b], W - 120)
      let ty = yPos[b] + yOffset
      for (const l of lines.slice(0, 3)) { ctx.fillText(l, 60, ty); ty += 68 }
    } else {
      // Beat 2: accent card — what it means
      const cardY = yPos[1] + yOffset
      roundRect(ctx, 60, cardY, W-120, 260, 14)
      ctx.fillStyle = '#F0EDDF'; ctx.fill()
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke()

      ctx.fillStyle = GOLD
      ctx.font = 'bold 19px "Inter", sans-serif'
      ctx.textAlign = 'left'; ctx.letterSpacing = '3px'
      ctx.fillText('WHY IT MATTERS', 88, cardY + 44); ctx.letterSpacing = '0px'

      ctx.fillStyle = INK
      ctx.font = 'bold 34px "Inter", sans-serif'
      const mLines = wrapText(ctx, beats[1], W - 176)
      let my = cardY + 98
      for (const l of mLines.slice(0, 4)) { ctx.fillText(l, 88, my); my += 50 }
    }
  }
  ctx.globalAlpha = 1

  // Progress dots
  const dotR = 6, dotGap = 22, dotY = H - 100
  const dotsX = W/2 - dotGap/2
  for (let d = 0; d < 2; d++) {
    ctx.beginPath()
    ctx.arc(dotsX + d * dotGap, dotY, dotR, 0, Math.PI * 2)
    ctx.fillStyle = d < beatIndex ? GOLD : BORDER
    ctx.fill()
  }

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, H-64); ctx.lineTo(W-60, H-64); ctx.stroke()
  ctx.fillStyle = INK_4; ctx.font = '19px "Inter", sans-serif'; ctx.textAlign = 'left'
  ctx.fillText('bhaavbrief.in', 60, H-34)
  ctx.fillStyle = GOLD; ctx.font = 'bold 19px "Inter", sans-serif'; ctx.textAlign = 'right'
  ctx.fillText('MCX Flash Signal', W-60, H-34)
}

// ── Phase 4: SIGNAL — dark, watch level + payoff ─────────────────────────────
function drawSignal(ctx, t, copy, mood) {
  const bg = MOOD_BG[mood] ?? '#1A1A14'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 8)

  ctx.globalAlpha = clamp(t * 8, 0, 1)
  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 22px "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '8px'
  ctx.fillText('WATCH', W/2, 72); ctx.letterSpacing = '0px'

  // Watch level — big
  const watchA = easeOut(clamp(t * 5, 0, 1))
  ctx.globalAlpha = watchA
  ctx.fillStyle   = CREAM
  ctx.font        = 'bold 44px "Inter", sans-serif'
  const watchLines = wrapText(ctx, copy.watch_level ?? '', W - 140)
  let wy = 560
  for (const l of watchLines.slice(0, 3)) { ctx.fillText(l, W/2, wy); wy += 64 }

  // Rule
  ctx.globalAlpha = clamp((t - 0.2) / 0.3, 0, 1)
  ctx.strokeStyle = '#FFFFFF18'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(140, wy + 24); ctx.lineTo(W-140, wy + 24); ctx.stroke()

  // Payoff — the line they screenshot
  const payA = easeOut(clamp((t - 0.25) * 4, 0, 1))
  ctx.globalAlpha = payA
  ctx.fillStyle   = CREAM
  ctx.font        = 'bold 64px "Inter", sans-serif'
  const payLines = wrapText(ctx, copy.payoff ?? '', W - 140)
  let py = wy + 100
  for (const l of payLines.slice(0, 3)) { ctx.fillText(l, W/2, py); py += 84 }

  // CTA
  ctx.globalAlpha = clamp((t - 0.4) / 0.4, 0, 1)
  ctx.fillStyle   = INK_6; ctx.font = '30px "Inter", sans-serif'
  ctx.fillText('Follow for daily MCX intelligence', W/2, py + 60)
  ctx.fillStyle   = GOLD; ctx.font = 'bold 34px "Inter", sans-serif'
  ctx.fillText('@bhaavbrief  ·  bhaavbrief.in', W/2, py + 108)

  ctx.globalAlpha = 1
}

// ── Frame dispatcher ──────────────────────────────────────────────────────────
function renderFrame(frame, copy, flash, snapshot, mood) {
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  if (frame < HOOK_END) {
    drawHook(ctx, frame / HOOK_END, copy, flash, mood)
  } else if (frame < BEAT1_END) {
    drawBeat(ctx, 1, (frame - HOOK_END) / (BEAT1_END - HOOK_END), copy, snapshot)
  } else if (frame < BEAT2_END) {
    drawBeat(ctx, 2, (frame - BEAT1_END) / (BEAT2_END - BEAT1_END), copy, snapshot)
  } else {
    drawSignal(ctx, (frame - BEAT2_END) / (SIGNAL_END - BEAT2_END), copy, mood)
  }

  return canvas.toBuffer('image/png')
}

// ── Main ──────────────────────────────────────────────────────────────────────
const fontBold = join(ROOT, 'public/fonts/Inter-Bold.ttf')
if (existsSync(fontBold)) GlobalFonts.registerFromPath(fontBold, 'Inter')
const fontReg = join(ROOT, 'public/fonts/Inter-Regular.ttf')
if (existsSync(fontReg)) GlobalFonts.registerFromPath(fontReg, 'Inter')

const flashFile = findFlashFile()
const flash     = readFlash(flashFile)
const snapshot  = readSnapshot()

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  BhaavBrief — Flash Reel`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
console.log(`📰  "${flash.title}"`)
console.log(`🏷️   ${flash.category} | impact: ${flash.impact}`)

const mood = classifyMood(flash)
console.log(`🎵  Mood: ${mood}`)
const musicPath = await ensureMusic(mood)
console.log(`  → ${musicPath.split('/').slice(-2).join('/')}\n`)

console.log('🤖  Extracting copy via Haiku...')
const copy = await extractReelCopy(flash)
console.log(`  hook:    "${copy.hook_number}  ${copy.hook_label}"`)
console.log(`  beat1:   "${copy.beat1}"`)
console.log(`  beat2:   "${copy.beat2}"`)
console.log(`  watch:   "${copy.watch_level}"`)
console.log(`  payoff:  "${copy.payoff}"`)
console.log(`  voice:   "${copy.voiceover}"\n`)

const VO_FILE = join(ROOT, `.flash-vo-${flash.slug}.mp3`)
console.log('🎙️   Generating voiceover...')
const voiceoverPath = copy.voiceover ? await generateVoiceover(copy.voiceover, VO_FILE) : null
console.log()

const FRAMES_DIR = join(ROOT, '.flash-frames-tmp')
const OUT_DIR    = join(ROOT, 'public/reels')
const OUT_FILE   = join(OUT_DIR, `flash-${flash.slug}.mp4`)
const CAP_FILE   = join(OUT_DIR, `flash-${flash.slug}.txt`)

if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true })
mkdirSync(FRAMES_DIR, { recursive: true })
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

console.log(`🎬  Rendering ${TOTAL_FRAMES} frames (20s)...`)
const t0 = Date.now()
for (let f = 0; f < TOTAL_FRAMES; f++) {
  writeFileSync(
    join(FRAMES_DIR, `f${String(f).padStart(4,'0')}.png`),
    renderFrame(f, copy, flash, snapshot, mood)
  )
  if (f % 60 === 0) process.stdout.write(`  ${f}/${TOTAL_FRAMES}\n`)
}
console.log(`  ${TOTAL_FRAMES}/${TOTAL_FRAMES} — ${((Date.now()-t0)/1000).toFixed(1)}s\n`)

const DUR = TOTAL_FRAMES / FPS
console.log(`⚙️   Encoding...`)
const args = ['-y', '-framerate', String(FPS), '-i', join(FRAMES_DIR, 'f%04d.png')]

if (voiceoverPath) {
  args.push('-i', musicPath, '-i', voiceoverPath,
    '-filter_complex',
    `[1:a]atrim=0:${DUR},afade=t=out:st=${DUR-2.0}:d=2.0,asetpts=PTS-STARTPTS,volume=0.18[music];` +
    `[2:a]atrim=0:${DUR-1.5},asetpts=PTS-STARTPTS,volume=1.0[voice];` +
    `[music][voice]amix=inputs=2:duration=first:normalize=0[aout]`,
    '-map', '0:v', '-map', '[aout]'
  )
} else {
  args.push('-i', musicPath,
    '-af', `atrim=0:${DUR},afade=t=out:st=${DUR-2.0}:d=2.0,asetpts=PTS-STARTPTS`
  )
}

args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT_FILE)

execFileSync('ffmpeg', args, { stdio: 'pipe' })
rmSync(FRAMES_DIR, { recursive: true })
if (voiceoverPath && existsSync(voiceoverPath)) rmSync(voiceoverPath)

// Caption sidecar
const caption = [
  copy.payoff ?? flash.title, '',
  copy.beat1, '',
  copy.beat2, '',
  `Watch: ${copy.watch_level}`, '',
  `Full analysis → bhaavbrief.in/news 👇`, '',
  '#BhaavBrief #MCX #CommodityMarkets #IndianMarkets #MCXTrading #MCXIntelligence',
].join('\n')

writeFileSync(CAP_FILE, caption, 'utf8')

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  ✅  ${OUT_FILE}`)
console.log(`  ✅  ${CAP_FILE}`)
console.log(`  🎵  ${mood} → ${musicPath.split('/').slice(-2).join('/')}`)
console.log(`  🎙️   Voice: ${voiceoverPath ? 'ElevenLabs multilingual_v2' : 'none'}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
