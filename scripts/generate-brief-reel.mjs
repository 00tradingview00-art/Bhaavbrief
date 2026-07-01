#!/usr/bin/env node
/**
 * scripts/generate-brief-reel.mjs
 *
 * BhaavBrief — 14-second 1080×1920 Reel generator.
 * Creator-first design: one idea per beat, bold typography, kinetic text.
 *
 * Usage:
 *   EDITION=50 node scripts/generate-brief-reel.mjs
 *   node scripts/generate-brief-reel.mjs   ← latest edition
 */

import Anthropic                              from '@anthropic-ai/sdk'
import { createCanvas, GlobalFonts }          from '@napi-rs/canvas'
import { readFileSync, writeFileSync,
         mkdirSync, existsSync, rmSync,
         readdirSync }                        from 'fs'
import { join, dirname }                      from 'path'
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

// ── Data ──────────────────────────────────────────────────────────────────────
function readBrief(edition) {
  const padded  = String(edition).padStart(3, '0')
  const mdxPath = join(ROOT, 'content/briefs', `edition-${padded}.mdx`)
  if (!existsSync(mdxPath)) throw new Error(`Brief not found: ${mdxPath}`)
  const { data, content } = matter(readFileSync(mdxPath, 'utf8'))
  return { data, content, padded }
}

function readSnapshot() {
  const p = join(ROOT, 'data/market-snapshot.json')
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null
}

// ── Copy extraction — creator voice ──────────────────────────────────────────
async function extractReelCopy(brief, snapshot) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prices = snapshot ? [
    `MCX Gold  ₹${Math.round(snapshot.instruments.MCX_GOLD?.price ?? 0).toLocaleString('en-IN')}  (${snapshot.instruments.MCX_GOLD?.changePct?.toFixed(2) ?? '?'}%)`,
    `MCX Crude ₹${Math.round(snapshot.instruments.MCX_CRUDE?.price ?? 0).toLocaleString('en-IN')}  (${snapshot.instruments.MCX_CRUDE?.changePct?.toFixed(2) ?? '?'}%)`,
    `MCX Silver ₹${Math.round(snapshot.instruments.MCX_SILVER?.price ?? 0).toLocaleString('en-IN')}  (${snapshot.instruments.MCX_SILVER?.changePct?.toFixed(2) ?? '?'}%)`,
    `USD/INR ₹${snapshot.instruments.USDINR?.price ?? '?'}`,
  ].join('\n') : ''

  const excerpt = brief.content
    .replace(/^---[\s\S]*?---/, '')
    .replace(/## Price Bridge[\s\S]*?##/, '##')
    .replace(/\*BhaavBrief is not.*$/s, '')
    .trim().slice(0, 900)

  const msg = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role:    'user',
      content: `You are the head of content for BhaavBrief — India's only daily MCX commodity intelligence brand. You have 6 years building finance reels that actual traders and importers watch every morning.

This is a 14-second Instagram Reel. The audience already knows what MCX is. They don't need education — they need the signal.

Brief: "${brief.data.title}"
Market data:
${prices}

Excerpt:
${excerpt}

Rules:
- NEVER start with a question ("did you know?", "what if?")
- NEVER use jargon that needs explaining
- EVERY sentence must earn its place — if it doesn't change what a trader does, cut it
- Numbers make it real. Use them.
- Tone: sharp, direct, like a trusted colleague tapping you on the shoulder

Return ONLY this JSON:
{
  "dominant_instrument": "MCX GOLD or MCX CRUDE or MCX SILVER or MCX COPPER or USD/INR",

  "stat_line": "The single most striking number from today — written as a visual headline. Max 6 words. Example: 'Gold sheds ₹2,194 in one session'",

  "beat1": "What happened. ONE sentence. Specific price or %. Under 20 words. No passive voice. Hit the number first.",
  "beat2": "The non-obvious structural context behind this move — what the number reveals about the market. ONE sentence. Under 20 words. No directional instruction.",
  "beat3": "The observable price level or data event the market is focused on, and what it represents. Under 18 words.",

  "payoff": "One sentence capturing the most unusual or non-obvious thing about today's data. Under 12 words. An observation — not a directional instruction.",

  "voiceover": "Write this as spoken word — not a script, not bullet points. 5 short sentences, each under 9 words. Natural pauses. Contractions only. Use 'just', 'already', 'quietly' for recency. The fourth sentence is the non-obvious truth. End with 'BhaavBrief.' — pause before it, said like a signature. Example: 'Silver just led gold by three percent. That hasn't happened in eight months. Solar demand is the part nobody's watching. At sixty-seven times gold, the ratio says industrial. BhaavBrief.'"
}`,
    }],
  })

  const raw = msg.content[0].text.trim()
  try { return JSON.parse(raw) }
  catch {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error(`Haiku JSON parse failed: ${raw.slice(0, 200)}`)
  }
}

// ── Dynamic music ─────────────────────────────────────────────────────────────
const MUSIC_BASE = 'https://archive.org/download/Incompetech/mp3-royaltyfree'
const TRACKS = {
  CALM:     { file: 'public/reels/music/calm.mp3',     url: null },
  FEAR:     { file: 'public/reels/music/fear.mp3',     url: `${MUSIC_BASE}/Apprehension.mp3` },
  DOWNBEAT: { file: 'public/reels/music/downbeat.mp3', url: `${MUSIC_BASE}/An%20Upsetting%20Theme.mp3` },
  UPBEAT:   { file: 'public/reels/music/upbeat.mp3',  url: `${MUSIC_BASE}/Back%20on%20Track.mp3` },
  VOLATILE: { file: 'public/reels/music/volatile.mp3', url: `${MUSIC_BASE}/Anxiety.mp3` },
}

function classifyMood(data, snapshot) {
  const tags     = data.tags ?? []
  const goldPct  = snapshot?.instruments?.MCX_GOLD?.changePct  ?? 0
  const crudePct = snapshot?.instruments?.MCX_CRUDE?.changePct ?? 0
  const isGeo    = tags.some(t => ['Geopolitics','War','OPEC','Fed','RBI','Macro'].includes(t))
  if (isGeo && goldPct > 1.5)           return 'FEAR'
  if (goldPct < -1 && crudePct < -0.8)  return 'DOWNBEAT'
  if (goldPct > 1 && crudePct > 0.5)    return 'UPBEAT'
  if (Math.abs(goldPct) > 1.2 || isGeo) return 'VOLATILE'
  return 'CALM'
}

async function ensureMusic(mood) {
  const { file, url } = TRACKS[mood]
  const abs = join(ROOT, file)
  if (existsSync(abs)) return abs
  if (mood === 'CALM') {
    const legacy = join(ROOT, 'public/reels/the-complex.mp3')
    if (existsSync(legacy)) { mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, readFileSync(legacy)); return abs }
  }
  if (!url) throw new Error(`Missing music: ${file}`)
  console.log(`  ⬇️  Downloading ${mood} track...`)
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, buf)
  console.log(`  ✅  ${mood} track (${(buf.length/1024).toFixed(0)} KB)`)
  return abs
}

// ── ElevenLabs voiceover ──────────────────────────────────────────────────────
async function generateVoiceover(script, outputPath) {
  const apiKey  = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB' // Adam

  if (!apiKey) { console.warn('  ⚠️  ELEVENLABS_API_KEY not set — skipping voiceover'); return null }

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

  if (!res.ok) {
    console.warn(`  ⚠️  ElevenLabs failed (${res.status}) — skipping voiceover`)
    return null
  }
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(outputPath, buf)
  console.log(`  ✅  Voiceover (${(buf.length/1024).toFixed(0)} KB)`)
  return outputPath
}

// ── Canvas constants ──────────────────────────────────────────────────────────
const W = 1080, H = 1920, FPS = 30, TOTAL_FRAMES = 22 * FPS

// Phase boundaries (in frames)
const HOOK_END    = Math.round(2.5 * FPS)   // 0–2.5s
const BEAT1_END   = Math.round(7.0 * FPS)   // 2.5–7s
const BEAT2_END   = Math.round(12.5 * FPS)  // 7–12.5s
const BEAT3_END   = Math.round(17.0 * FPS)  // 12.5–17s
const PAYOFF_END  = TOTAL_FRAMES             // 17–22s

// Palette
const CREAM  = '#FAFAF6'
const INK    = '#18180F'
const INK_2  = '#2C2C22'
const INK_4  = '#8A8A7A'
const INK_6  = '#BCBCAA'
const GOLD   = '#C8720A'
const RED    = '#C0392B'
const GREEN  = '#1A7A4A'
const BORDER = '#E0DFD5'

// Mood → accent colour
const MOOD_COLOR = { FEAR: '#7B1A1A', BEARISH: '#2C1F1F', BULLISH: '#1A2C1F', VOLATILE: '#1F1F2C', CALM: INK_2 }

const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const easeOut = t => 1 - Math.pow(1 - t, 3)
const easeIn  = t => t * t * t
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

// preferLabel: Haiku's dominant_instrument ("MCX GOLD" etc) takes priority over raw % change
function dominantMover(snapshot, preferLabel) {
  const cands = [
    { label: 'MCX GOLD',   key: 'MCX_GOLD',   fmtDelta: v => `₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}` },
    { label: 'MCX CRUDE',  key: 'MCX_CRUDE',  fmtDelta: v => `₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}` },
    { label: 'MCX SILVER', key: 'MCX_SILVER', fmtDelta: v => `₹${Math.abs(Math.round(v/1000))}K` },
    { label: 'USD/INR',    key: 'USDINR',     fmtDelta: v => `₹${Math.abs(v).toFixed(2)}` },
  ]
  // If Haiku named a specific instrument, use that — it chose it for editorial reasons
  if (preferLabel) {
    const preferred = cands.find(c => c.label === preferLabel)
    if (preferred) {
      const instr = snapshot?.instruments?.[preferred.key]
      if (instr) {
        const delta = (instr.price??0) - (instr.prevClose??instr.price??0)
        return { ...preferred, pct: Math.abs(instr.changePct??0), delta, changePct: instr.changePct??0 }
      }
    }
  }
  // Fallback: largest absolute % change
  let best = { pct: 0, label: 'MCX GOLD', delta: 0, changePct: 0, fmtDelta: v => String(v) }
  for (const c of cands) {
    const instr = snapshot?.instruments?.[c.key]
    if (!instr) continue
    const pct = Math.abs(instr.changePct ?? 0)
    if (pct > best.pct) best = { ...c, pct, delta: (instr.price??0)-(instr.prevClose??instr.price??0), changePct: instr.changePct??0 }
  }
  return best
}

// ── Phase 1: HOOK — the number IS the hook ───────────────────────────────────
// Dark bg, ONE massive stat, hook line below. Nothing else.
function drawHook(ctx, t, copy, data, snapshot, mood) {
  const bgColor = MOOD_COLOR[mood] ?? INK_2
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)

  // Gold edge bar at top
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 8)

  // BHAAVBRIEF wordmark — small, top-centre
  ctx.globalAlpha = clamp(t * 12, 0, 1)
  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 26px "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '7px'
  ctx.fillText('BHAAVBRIEF', W/2, 72)
  ctx.letterSpacing = '0px'

  const mover = dominantMover(snapshot, copy?.dominant_instrument)
  const isUp  = mover.changePct >= 0
  const moveColor = isUp ? GREEN : RED

  // Instrument label
  ctx.globalAlpha = clamp(t * 8, 0, 1)
  ctx.fillStyle   = INK_6
  ctx.font        = 'bold 30px "Inter", sans-serif'
  ctx.letterSpacing = '3px'
  ctx.fillText(mover.label, W/2, 520)
  ctx.letterSpacing = '0px'

  // THE BIG NUMBER — slams in
  const numA = easeOut(clamp(t * 4, 0, 1))
  const numScale = 1 + 0.06 * (1 - numA)           // slight scale-down on entry
  ctx.save()
  ctx.translate(W/2, 660)
  ctx.scale(numScale, numScale)
  ctx.globalAlpha = numA
  ctx.fillStyle   = moveColor
  ctx.font        = 'bold 110px "Inter", sans-serif'
  ctx.textAlign   = 'center'
  const arrow     = isUp ? '▲' : '▼'
  ctx.fillText(`${arrow} ${mover.fmtDelta(mover.delta)}`, 0, 0)
  ctx.restore()

  // % change — smaller, same colour, below
  ctx.globalAlpha = clamp((t - 0.12) * 7, 0, 1)
  ctx.fillStyle   = moveColor
  ctx.font        = '42px "Inter", sans-serif'
  ctx.fillText(`${isUp ? '+' : ''}${mover.changePct.toFixed(2)}%  today`, W/2, 752)

  // Thin divider
  ctx.globalAlpha = clamp((t - 0.2) * 6, 0, 1)
  ctx.strokeStyle = '#FFFFFF18'
  ctx.lineWidth   = 1
  ctx.beginPath(); ctx.moveTo(120, 800); ctx.lineTo(W-120, 800); ctx.stroke()

  // Hook / stat line — what it means in one punch
  ctx.globalAlpha = clamp((t - 0.28) * 5, 0, 1)
  ctx.fillStyle   = CREAM
  ctx.font        = 'bold 54px "Inter", sans-serif'
  const hookLines = wrapText(ctx, copy.stat_line ?? copy.hook, W - 160)
  let hy = 880
  for (const l of hookLines.slice(0, 2)) { ctx.fillText(l, W/2, hy); hy += 72 }

  // Edition chip — bottom, subtle
  ctx.globalAlpha = clamp((t - 0.5) * 5, 0, 1)
  ctx.fillStyle   = '#FFFFFF10'
  roundRect(ctx, W/2 - 78, H - 110, 156, 38, 19); ctx.fill()
  ctx.fillStyle   = INK_6
  ctx.font        = '20px "Inter", sans-serif'
  ctx.fillText(`Edition #${data.edition}`, W/2, H - 84)

  ctx.globalAlpha = 1
}

// ── Phase 2–4: BEATS — kinetic text, one idea at a time ──────────────────────
// Cream bg. Each beat fades in and stays. Price strip at top for context.
function drawBeat(ctx, beatIndex, beatT, copy, data, snapshot) {
  // beatIndex: 1, 2, or 3
  // beatT: 0→1 progress through that beat

  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)

  // Top bar
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 8)

  // Wordmark
  ctx.fillStyle = GOLD
  ctx.font = 'bold 24px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '6px'
  ctx.fillText('BHAAVBRIEF', W/2, 70)
  ctx.letterSpacing = '0px'

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 90); ctx.lineTo(W-60, 90); ctx.stroke()

  // Compact price strip — 4 instruments in a row
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
    ctx.font = 'bold 16px "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.letterSpacing = '1px'
    ctx.fillText(inst.label, px + 4, 118)
    ctx.letterSpacing = '0px'

    ctx.fillStyle = INK
    ctx.font = 'bold 22px "Inter", sans-serif'
    ctx.fillText(instr ? inst.fmt(instr.price) : '—', px + 4, 144)

    ctx.fillStyle = isUp ? GREEN : RED
    ctx.font = '18px "Inter", sans-serif'
    ctx.fillText(`${isUp ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`, px + 4, 166)
  })

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 186); ctx.lineTo(W-60, 186); ctx.stroke()

  // ── Beat content ──────────────────────────────────────────────────────────
  // Beats build cumulatively. Positions spread across the 200→1820 content area.
  // Beat 1 = upper third, Beat 2 = middle, Beat 3 card anchored near bottom.
  const beats = [copy.beat1, copy.beat2, copy.beat3]
  const yPositions = [440, 900, 1340]               // vertically distributed across 1920

  for (let b = 0; b < beatIndex; b++) {
    const isCurrentBeat = (b === beatIndex - 1)
    const entryT        = isCurrentBeat ? clamp(beatT * 4, 0, 1) : 1
    const yOffset       = isCurrentBeat ? 22 * (1 - spring(clamp(beatT * 3, 0, 1))) : 0

    ctx.globalAlpha = easeOut(entryT)

    if (b < 2) {
      // Beats 1 & 2: large body text
      ctx.fillStyle = (b === 0) ? INK : INK_2
      ctx.font = `${b === 0 ? 'bold ' : ''}${46 - b * 4}px "Inter", sans-serif`
      ctx.textAlign = 'left'
      const lines = wrapText(ctx, beats[b], W - 120)
      let ty = yPositions[b] + yOffset
      for (const l of lines.slice(0, 3)) { ctx.fillText(l, 60, ty); ty += 62 - b * 4 }
    } else {
      // Beat 3: WHAT TO WATCH — accent card, slides up
      const cardY = yPositions[2] + yOffset
      roundRect(ctx, 60, cardY, W-120, 230, 16)
      ctx.fillStyle = '#F0EDDF'; ctx.fill()
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke()

      ctx.fillStyle = GOLD
      ctx.font = 'bold 20px "Inter", sans-serif'
      ctx.textAlign = 'left'
      ctx.letterSpacing = '3px'
      ctx.fillText('WATCH', 88, cardY + 46)
      ctx.letterSpacing = '0px'

      ctx.fillStyle = INK
      ctx.font = 'bold 32px "Inter", sans-serif'
      const edgeLines = wrapText(ctx, beats[2], W - 176)
      let ey = cardY + 96
      for (const l of edgeLines.slice(0, 3)) { ctx.fillText(l, 88, ey); ey += 46 }
    }
  }

  ctx.globalAlpha = 1

  // Beat progress dots — 3 dots above footer, filled = seen
  const dotR = 7, dotGap = 26, dotY = H - 108
  const dotsX = W/2 - (3 * dotGap) / 2 + dotR
  for (let d = 0; d < 3; d++) {
    ctx.beginPath()
    ctx.arc(dotsX + d * dotGap, dotY, dotR, 0, Math.PI * 2)
    ctx.fillStyle = d < beatIndex ? GOLD : BORDER
    ctx.fill()
  }

  // Footer
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, H-70); ctx.lineTo(W-60, H-70); ctx.stroke()
  ctx.fillStyle = INK_4; ctx.font = '20px "Inter", sans-serif'; ctx.textAlign = 'left'
  ctx.fillText('bhaavbrief.in', 60, H-38)
  ctx.fillStyle = GOLD; ctx.font = 'bold 20px "Inter", sans-serif'; ctx.textAlign = 'right'
  ctx.fillText('MCX Intelligence · Daily', W-60, H-38)
}

// ── Phase 5: PAYOFF — dark, punchy close ─────────────────────────────────────
function drawPayoff(ctx, t, copy, mood) {
  const bgColor = MOOD_COLOR[mood] ?? INK_2
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 8)

  // Wordmark
  ctx.globalAlpha = clamp(t * 8, 0, 1)
  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 26px "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '7px'
  ctx.fillText('BHAAVBRIEF', W/2, 100)
  ctx.letterSpacing = '0px'

  // The payoff line — the one they screenshot
  const payA = easeOut(clamp(t * 5, 0, 1))
  ctx.globalAlpha = payA
  ctx.fillStyle   = CREAM
  ctx.font        = 'bold 68px "Inter", sans-serif'
  const payLines  = wrapText(ctx, copy.payoff, W - 140)
  let py = 800
  for (const l of payLines.slice(0, 3)) { ctx.fillText(l, W/2, py); py += 88 }

  // Separator
  ctx.globalAlpha = clamp((t - 0.2) / 0.3, 0, 1)
  ctx.strokeStyle = '#FFFFFF18'
  ctx.lineWidth   = 1
  ctx.beginPath(); ctx.moveTo(140, py + 28); ctx.lineTo(W-140, py + 28); ctx.stroke()

  // CTA
  ctx.globalAlpha = clamp((t - 0.35) / 0.4, 0, 1)
  ctx.fillStyle   = INK_6
  ctx.font        = '32px "Inter", sans-serif'
  ctx.fillText('Follow for daily MCX intelligence', W/2, py + 82)

  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 36px "Inter", sans-serif'
  ctx.fillText('@bhaavbrief  ·  bhaavbrief.in', W/2, py + 136)

  ctx.globalAlpha = 1
}

// ── Frame dispatcher ──────────────────────────────────────────────────────────
function renderFrame(frame, copy, data, snapshot, mood) {
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  if (frame < HOOK_END) {
    drawHook(ctx, frame / HOOK_END, copy, data, snapshot, mood)
  } else if (frame < BEAT1_END) {
    drawBeat(ctx, 1, (frame - HOOK_END) / (BEAT1_END - HOOK_END), copy, data, snapshot)
  } else if (frame < BEAT2_END) {
    drawBeat(ctx, 2, (frame - BEAT1_END) / (BEAT2_END - BEAT1_END), copy, data, snapshot)
  } else if (frame < BEAT3_END) {
    drawBeat(ctx, 3, (frame - BEAT2_END) / (BEAT3_END - BEAT2_END), copy, data, snapshot)
  } else {
    drawPayoff(ctx, (frame - BEAT3_END) / (PAYOFF_END - BEAT3_END), copy, mood)
  }

  return canvas.toBuffer('image/png')
}

// ── Main ──────────────────────────────────────────────────────────────────────
const fontPath = join(ROOT, 'public/fonts/Inter-Bold.ttf')
if (existsSync(fontPath)) GlobalFonts.registerFromPath(fontPath, 'Inter')

let edition = process.env.EDITION ? parseInt(process.env.EDITION) : null
if (!edition) {
  const nums = readdirSync(join(ROOT, 'content/briefs'))
    .map(f => f.match(/edition-(\d+)\.mdx/)?.[1]).filter(Boolean).map(Number)
  edition = Math.max(...nums)
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  BhaavBrief — Reel Generator`)
console.log(`  Edition #${edition}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

const { data, content, padded } = readBrief(edition)
const snapshot = readSnapshot()

console.log(`📖  "${data.title}"`)
console.log(`🏷️   ${(data.tags ?? []).join(', ')}`)

const mood = classifyMood(data, snapshot)
console.log(`🎵  Mood: ${mood}`)
const musicPath = await ensureMusic(mood)
console.log(`  → ${musicPath.split('/').slice(-2).join('/')}\n`)

console.log('🤖  Extracting copy via Haiku...')
const copy = await extractReelCopy({ data, content }, snapshot)
console.log(`  stat:    "${copy.stat_line}"`)
console.log(`  beat1:   "${copy.beat1}"`)
console.log(`  beat2:   "${copy.beat2}"`)
console.log(`  beat3:   "${copy.beat3}"`)
console.log(`  payoff:  "${copy.payoff}"`)
console.log(`  voice:   "${copy.voiceover}"\n`)

const VO_FILE = join(ROOT, `.reel-vo-${padded}.mp3`)
console.log('🎙️   Generating voiceover...')
const voiceoverPath = copy.voiceover ? await generateVoiceover(copy.voiceover, VO_FILE) : null
console.log()

const FRAMES_DIR = join(ROOT, '.reel-frames-tmp')
const OUT_DIR    = join(ROOT, 'public/reels')
const OUT_FILE   = join(OUT_DIR, `brief-edition-${padded}.mp4`)
const CAP_FILE   = join(OUT_DIR, `brief-edition-${padded}.txt`)

if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true })
mkdirSync(FRAMES_DIR, { recursive: true })
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

console.log(`🎬  Rendering ${TOTAL_FRAMES} frames...`)
const t0 = Date.now()
for (let f = 0; f < TOTAL_FRAMES; f++) {
  writeFileSync(
    join(FRAMES_DIR, `f${String(f).padStart(4,'0')}.png`),
    renderFrame(f, copy, data, snapshot, mood)
  )
  if (f % 60 === 0) process.stdout.write(`  ${f}/${TOTAL_FRAMES}\n`)
}
console.log(`  ${TOTAL_FRAMES}/${TOTAL_FRAMES} — ${((Date.now()-t0)/1000).toFixed(1)}s\n`)

console.log(`⚙️   Encoding (${mood}${voiceoverPath ? ' + voice' : ''})...`)
const DUR = TOTAL_FRAMES / FPS
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
    '-af', `atrim=0:${DUR},afade=t=out:st=${DUR-1.5}:d=1.5,asetpts=PTS-STARTPTS`
  )
}

args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT_FILE)

execFileSync('ffmpeg', args, { stdio: 'pipe' })
rmSync(FRAMES_DIR, { recursive: true })
if (voiceoverPath && existsSync(voiceoverPath)) rmSync(voiceoverPath)

// Caption sidecar
const TAG_MAP = {
  'MCX Gold':'#MCXGold','MCX Silver':'#MCXSilver','MCX Crude':'#MCXCrude',
  'MCX Copper':'#MCXCopper','MCX NatGas':'#MCXNatGas','Macro':'#MacroEconomics',
  'Geopolitics':'#Geopolitics','OPEC':'#OPEC','RBI':'#RBI',
  'Fed':'#FederalReserve','USD/INR':'#USDINR','Inflation':'#Inflation',
}
const hashtags = [
  ...(data.tags??[]).map(t => TAG_MAP[t]).filter(Boolean),
  '#BhaavBrief','#MCX','#CommodityMarkets','#IndianMarkets','#MCXTrading',
].join(' ')

const slug    = data.urlSlug ?? `edition-${padded}`
const caption = [
  copy.stat_line ?? data.title, '',
  copy.beat1,
  copy.beat2, '',
  `Watch: ${copy.beat3}`, '',
  `Full brief → bhaavbrief.in/briefs/${slug} 👇`, '',
  'Music: Kevin MacLeod (incompetech.com) CC-BY 4.0', '',
  hashtags,
].join('\n')

writeFileSync(CAP_FILE, caption, 'utf8')

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  ✅  ${OUT_FILE}`)
console.log(`  ✅  ${CAP_FILE}`)
console.log(`  🎵  ${mood} → ${musicPath.split('/').slice(-2).join('/')}`)
console.log(`  🎙️   Voice: ${voiceoverPath ? 'ElevenLabs' : 'none'}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
