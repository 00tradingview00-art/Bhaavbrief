#!/usr/bin/env node
/**
 * scripts/generate-brief-reel.mjs
 *
 * BhaavBrief — 35-second 1080×1920 Reel generator.
 * Broader framing, genuine motion, one idea per screen.
 *
 * Usage:
 *   EDITION=58 node scripts/generate-brief-reel.mjs
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

// ── Copy extraction — broader voice ──────────────────────────────────────────
async function extractReelCopy(brief, snapshot) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prices = snapshot ? [
    `MCX Gold  ₹${Math.round(snapshot.instruments.MCX_GOLD?.price ?? 0).toLocaleString('en-IN')}  (${snapshot.instruments.MCX_GOLD?.changePct?.toFixed(2) ?? '?'}%)`,
    `MCX Crude ₹${Math.round(snapshot.instruments.MCX_CRUDE?.price ?? 0).toLocaleString('en-IN')}  (${snapshot.instruments.MCX_CRUDE?.changePct?.toFixed(2) ?? '?'}%)`,
    `MCX Silver ₹${Math.round(snapshot.instruments.MCX_SILVER?.price ?? 0).toLocaleString('en-IN')}  (${snapshot.instruments.MCX_SILVER?.changePct?.toFixed(2) ?? '?'}%)`,
    `USD/INR ₹${snapshot.instruments.USDINR?.price ?? '?'}  (${snapshot.instruments.USDINR?.changePct?.toFixed(2) ?? '?'}%)`,
  ].join('\n') : ''

  const excerpt = brief.content
    .replace(/^---[\s\S]*?---/, '')
    .replace(/## Price Bridge[\s\S]*?##/, '##')
    .replace(/\*BhaavBrief is not.*$/s, '')
    .trim().slice(0, 1000)

  const msg = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 700,
    messages: [{
      role:    'user',
      content: `You are the head of content for BhaavBrief — India's daily MCX commodity intelligence brand. You write Instagram Reels that retail investors, importers, business owners, and curious Indians share — not just professional traders.

This is a 35-second Instagram Reel. Frame every insight in terms everyday people can feel — jewellery buyers, importers, business owners, anyone watching their rupee. Lead with the human impact, then explain the structural reason.

Brief: "${brief.data.title}"
Market data:
${prices}

Excerpt:
${excerpt}

Rules:
- NEVER start with a question
- Frame the move in rupees people feel: "Your gold costs ₹2,200 more per 10g today" beats "Gold up 1.5%"
- Numbers make it real — use them
- Tone: sharp, direct, like a smart friend who tracks markets for a living
- Each beat is ONE complete thought — no "and also"

Return ONLY this JSON:
{
  "dominant_instrument": "MCX GOLD or MCX CRUDE or MCX SILVER or MCX COPPER or USD/INR",

  "hook_caption": "First line of Instagram caption. Relatable to anyone, not just traders. Under 12 words. Frame in rupee impact or everyday terms. No jargon. This is what makes someone stop scrolling.",

  "stat_line": "The single most striking number from today — written as a visual headline. Max 6 words. Example: 'Gold costs ₹2,194 more today'",

  "beat1": "What happened in everyday terms. ONE sentence. Specific rupee amount or %. Under 18 words. Hit the human impact first, then the % move.",
  "beat2": "The structural reason behind this move — what force caused it. ONE sentence. Under 18 words. Name the force (Fed, dollar, OPEC, monsoon, etc.) and what it did.",
  "beat3": "The price level or event traders are watching, and what it would mean if hit. Under 16 words. Specific number.",

  "payoff": "The most surprising or counter-intuitive fact from today's data. Under 12 words. An observation that makes people think — not a directional call.",

  "voiceover": "Spoken word for 35 seconds. 7 short sentences, each under 10 words. Natural rhythm, like you're talking to a smart friend. Contractions only. Use 'just', 'already', 'quietly' for recency. Sentences 1-2 frame the everyday impact. Sentences 3-4 explain the structural cause. Sentence 5 is the non-obvious truth. Sentence 6 is what to watch. End with 'BhaavBrief.' — pause before it, said like a signature. Example: 'Gold just added two thousand rupees in one session. That's more than most people earn in a day. The US jobs number came in weak. Weak jobs means rate cuts stay on the table. Central banks bought more gold last month than any time in five years. Watch ninety-five on dollar-rupee — that's the hinge. BhaavBrief.'"
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
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB'

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
const W = 1080, H = 1920, FPS = 30

// Timing in seconds
const HOOK_DUR   = 3.0
const BEAT1_DUR  = 8.0
const BEAT2_DUR  = 8.0
const BEAT3_DUR  = 7.0
const PAYOFF_DUR = 5.0
const CTA_DUR    = 4.0
const TOTAL_DUR  = HOOK_DUR + BEAT1_DUR + BEAT2_DUR + BEAT3_DUR + PAYOFF_DUR + CTA_DUR

// Frame boundaries
const HOOK_END   = Math.round(HOOK_DUR   * FPS)
const BEAT1_END  = HOOK_END   + Math.round(BEAT1_DUR  * FPS)
const BEAT2_END  = BEAT1_END  + Math.round(BEAT2_DUR  * FPS)
const BEAT3_END  = BEAT2_END  + Math.round(BEAT3_DUR  * FPS)
const PAYOFF_END = BEAT3_END  + Math.round(PAYOFF_DUR * FPS)
const CTA_END    = PAYOFF_END + Math.round(CTA_DUR    * FPS)
const TOTAL_FRAMES = CTA_END

// Palette
const CREAM  = '#FAFAF6'
const CREAM2 = '#F2F2EC'
const INK    = '#18180F'
const INK_2  = '#2C2C22'
const INK_3  = '#4A4A3A'
const INK_4  = '#8A8A7A'
const INK_6  = '#BCBCAA'
const GOLD   = '#C8720A'
const RED    = '#C0392B'
const GREEN  = '#1A7A4A'
const BORDER = '#E0DFD5'

const MOOD_BG = { FEAR: '#1A0A0A', DOWNBEAT: '#0F0F18', UPBEAT: '#0A1A10', VOLATILE: '#0F0A1A', CALM: '#18180F' }

const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3)
const spring  = t => { const c = clamp(t, 0, 1); return 1 - (1-c)*(1-c)*(1-c) }

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

function dominantMover(snapshot, preferLabel) {
  const cands = [
    { label: 'MCX GOLD',   key: 'MCX_GOLD',   fmtDelta: v => `₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}` },
    { label: 'MCX CRUDE',  key: 'MCX_CRUDE',  fmtDelta: v => `₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}` },
    { label: 'MCX SILVER', key: 'MCX_SILVER', fmtDelta: v => `₹${(Math.abs(v/1000)).toFixed(1)}K` },
    { label: 'USD/INR',    key: 'USDINR',     fmtDelta: v => `₹${Math.abs(v).toFixed(2)}` },
  ]
  if (preferLabel) {
    const preferred = cands.find(c => c.label === preferLabel)
    if (preferred) {
      const instr = snapshot?.instruments?.[preferred.key]
      if (instr) {
        const delta = (instr.price??0) - (instr.prevClose??instr.price??0)
        return { ...preferred, pct: Math.abs(instr.changePct??0), delta, changePct: instr.changePct??0, price: instr.price??0 }
      }
    }
  }
  let best = { pct: 0, label: 'MCX GOLD', delta: 0, changePct: 0, price: 0, fmtDelta: v => String(v) }
  for (const c of cands) {
    const instr = snapshot?.instruments?.[c.key]
    if (!instr) continue
    const pct = Math.abs(instr.changePct ?? 0)
    if (pct > best.pct) best = { ...c, pct, delta: (instr.price??0)-(instr.prevClose??instr.price??0), changePct: instr.changePct??0, price: instr.price??0 }
  }
  return best
}

// ── Shared header (wordmark + price strip) ────────────────────────────────────
function drawHeader(ctx, snapshot, mood) {
  const PAD = 60
  // Gold top bar
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 6)

  // Wordmark
  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 22px "NotoSans", "Inter", sans-serif'
  ctx.textAlign   = 'left'
  ctx.letterSpacing = '5px'
  ctx.fillText('BHAAVBRIEF', PAD, 56)
  ctx.letterSpacing = '0px'

  // Thin separator
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 72); ctx.lineTo(W-PAD, 72); ctx.stroke()

  // Price strip — 4 instruments in one row
  const instruments = [
    { label: 'GOLD',   key: 'MCX_GOLD',   fmt: v => `₹${Math.round(v).toLocaleString('en-IN')}` },
    { label: 'CRUDE',  key: 'MCX_CRUDE',  fmt: v => `₹${Math.round(v)}` },
    { label: 'SILVER', key: 'MCX_SILVER', fmt: v => `₹${Math.round(v/1000)}K` },
    { label: '$/₹',    key: 'USDINR',     fmt: v => `${v.toFixed(2)}` },
  ]
  const stripW = (W - PAD*2) / 4
  instruments.forEach((inst, i) => {
    const instr = snapshot?.instruments?.[inst.key]
    const pct   = instr?.changePct ?? 0
    const isUp  = pct >= 0
    const px    = PAD + i * stripW

    ctx.fillStyle   = INK_4
    ctx.font        = 'bold 14px "NotoSans", "Inter", sans-serif'
    ctx.textAlign   = 'left'
    ctx.letterSpacing = '1px'
    ctx.fillText(inst.label, px, 100)
    ctx.letterSpacing = '0px'

    ctx.fillStyle = INK
    ctx.font      = 'bold 20px "NotoSans", "Inter", sans-serif'
    ctx.fillText(instr ? inst.fmt(instr.price) : '—', px, 126)

    ctx.fillStyle = isUp ? GREEN : RED
    ctx.font      = '16px "NotoSans", "Inter", sans-serif'
    ctx.fillText(`${isUp ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`, px, 148)
  })

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 164); ctx.lineTo(W-PAD, 164); ctx.stroke()
}

// ── Phase 1: HOOK ─────────────────────────────────────────────────────────────
function drawHook(ctx, t, copy, snapshot, mood, edition) {
  const bg = MOOD_BG[mood] ?? '#18180F'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Gold top bar
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 6)

  // Wordmark — fades in
  ctx.globalAlpha = easeOut(t * 10)
  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 24px "NotoSans", "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '7px'
  ctx.fillText('BHAAVBRIEF', W/2, 68)
  ctx.letterSpacing = '0px'

  const mover  = dominantMover(snapshot, copy?.dominant_instrument)
  const isUp   = mover.changePct >= 0
  const moveColor = isUp ? '#2ECC71' : '#E74C3C'

  // Instrument label
  ctx.globalAlpha = easeOut(t * 7)
  ctx.fillStyle   = INK_6
  ctx.font        = 'bold 28px "NotoSans", "Inter", sans-serif'
  ctx.letterSpacing = '3px'
  ctx.fillText(mover.label, W/2, 500)
  ctx.letterSpacing = '0px'

  // THE BIG NUMBER — counts up from 0 to full delta
  const countT    = easeOut(Math.min(1, t * 2.5))
  const animDelta  = mover.delta * countT
  const animPct    = mover.changePct * countT
  const numScale   = 1 + 0.08 * (1 - easeOut(Math.min(1, t * 4)))

  ctx.save()
  ctx.translate(W/2, 660)
  ctx.scale(numScale, numScale)
  ctx.globalAlpha = easeOut(Math.min(1, t * 5))
  ctx.fillStyle   = moveColor
  ctx.font        = 'bold 108px "NotoSans", "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.fillText(`${isUp ? '▲' : '▼'} ${mover.fmtDelta(animDelta)}`, 0, 0)
  ctx.restore()

  // % change
  ctx.globalAlpha = easeOut(Math.max(0, t * 6 - 0.5))
  ctx.fillStyle   = moveColor
  ctx.font        = '40px "NotoSans", "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.fillText(`${isUp ? '+' : ''}${animPct.toFixed(2)}% today`, W/2, 752)

  // Divider
  ctx.globalAlpha = easeOut(Math.max(0, t * 5 - 0.8))
  ctx.strokeStyle = '#FFFFFF18'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(120, 810); ctx.lineTo(W-120, 810); ctx.stroke()

  // Stat line — the punchline
  ctx.globalAlpha = easeOut(Math.max(0, t * 4 - 1.0))
  ctx.fillStyle   = CREAM
  ctx.font        = 'bold 52px "NotoSans", "Inter", sans-serif'
  const hookLines = wrapText(ctx, copy?.stat_line ?? '', W - 160)
  let hy = 890
  for (const l of hookLines.slice(0, 2)) { ctx.fillText(l, W/2, hy); hy += 70 }

  // Edition chip
  ctx.globalAlpha = easeOut(Math.max(0, t * 3 - 1.5))
  ctx.fillStyle   = '#FFFFFF0C'
  roundRect(ctx, W/2 - 80, H - 120, 160, 42, 21); ctx.fill()
  ctx.fillStyle   = INK_6
  ctx.font        = '18px "NotoSans", "Inter", sans-serif'
  ctx.fillText(`Edition #${edition}`, W/2, H - 90)

  ctx.globalAlpha = 1
}

// ── Phase 2-4: BEAT screens — one idea per screen, lines animate in ───────────
function drawBeat(ctx, t, text, beatIndex, snapshot, mood) {
  const PAD = 68

  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)

  // Shared header
  drawHeader(ctx, snapshot, mood)

  // Beat index label — e.g. "01 / 03"
  ctx.fillStyle   = INK_4
  ctx.font        = 'bold 16px "NotoSans", "Inter", sans-serif'
  ctx.textAlign   = 'right'
  ctx.letterSpacing = '1px'
  ctx.fillText(`0${beatIndex} / 03`, W - PAD, 56)
  ctx.letterSpacing = '0px'

  // Progress bar at bottom
  const barY = H - 48, barH = 4, barX = PAD, barW = W - PAD * 2
  ctx.fillStyle = BORDER
  roundRect(ctx, barX, barY, barW, barH, 2); ctx.fill()
  const fill = ((beatIndex - 1) / 3 + t / 3) * barW
  ctx.fillStyle = GOLD
  roundRect(ctx, barX, barY, Math.max(0, fill), barH, 2); ctx.fill()

  // Footer
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, H - 70); ctx.lineTo(W - PAD, H - 70); ctx.stroke()
  ctx.fillStyle = INK_4; ctx.font = '18px "NotoSans", "Inter", sans-serif'; ctx.textAlign = 'left'
  ctx.fillText('bhaavbrief.in', PAD, H - 40)
  ctx.fillStyle = GOLD; ctx.font = 'bold 18px "NotoSans", "Inter", sans-serif'; ctx.textAlign = 'right'
  ctx.fillText('Daily MCX Intelligence', W - PAD, H - 40)

  // Main text — large, vertically centered, lines animate in sequentially
  ctx.font = 'bold 56px "NotoSans", "Inter", sans-serif'
  ctx.textAlign = 'left'
  const lines = wrapText(ctx, text, W - PAD * 2)
  const lineHeight = 76
  const totalTextH = lines.length * lineHeight
  const contentTop = 164  // below header
  const contentBot = H - 90 // above footer
  const startY = contentTop + (contentBot - contentTop - totalTextH) / 2 + lineHeight

  lines.forEach((line, i) => {
    // Each line appears at t = i/lines.length * 0.55, fully visible by t=0.7
    const lineStartT = (i / Math.max(lines.length, 1)) * 0.55
    const lineT      = Math.max(0, (t - lineStartT) / 0.18)
    const alpha      = easeOut(Math.min(1, lineT))
    const yShift     = (1 - spring(Math.min(1, lineT))) * 28

    ctx.globalAlpha = alpha
    ctx.fillStyle   = i === 0 ? INK : INK_2
    ctx.fillText(line, PAD, startY + i * lineHeight - yShift)
  })

  ctx.globalAlpha = 1
}

// ── Phase 5: PAYOFF ───────────────────────────────────────────────────────────
function drawPayoff(ctx, t, copy, mood) {
  const bg = MOOD_BG[mood] ?? '#18180F'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 6)

  // Wordmark
  ctx.globalAlpha = easeOut(t * 8)
  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 24px "NotoSans", "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '7px'
  ctx.fillText('BHAAVBRIEF', W/2, 90)
  ctx.letterSpacing = '0px'

  // Thin rule
  ctx.globalAlpha = easeOut(Math.max(0, t * 6 - 0.3))
  ctx.strokeStyle = '#FFFFFF15'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(140, 120); ctx.lineTo(W-140, 120); ctx.stroke()

  // Payoff text — the line people screenshot
  const payLines = wrapText(ctx, copy.payoff ?? '', W - 140)
  const lineH    = 90
  const startY   = H / 2 - (payLines.length * lineH) / 2

  payLines.forEach((line, i) => {
    const lineT  = Math.max(0, (t - i * 0.12) * 6)
    const alpha  = easeOut(Math.min(1, lineT))
    const yShift = (1 - spring(Math.min(1, lineT))) * 32
    ctx.globalAlpha = alpha
    ctx.fillStyle   = CREAM
    ctx.font        = `${i === 0 ? 'bold ' : ''}68px "NotoSans", "Inter", sans-serif`
    ctx.textAlign   = 'center'
    ctx.fillText(line, W/2, startY + i * lineH - yShift)
  })

  ctx.globalAlpha = 1
}

// ── Phase 6: CTA ──────────────────────────────────────────────────────────────
function drawCTA(ctx, t, mood, edition) {
  const bg = MOOD_BG[mood] ?? '#18180F'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 6)

  const PAD = 80

  // Large BHAAVBRIEF wordmark — the brand moment
  ctx.globalAlpha = easeOut(t * 6)
  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 52px "NotoSans", "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '10px'
  ctx.fillText('BHAAVBRIEF', W/2, H/2 - 120)
  ctx.letterSpacing = '0px'

  // Tagline
  ctx.globalAlpha = easeOut(Math.max(0, t * 5 - 0.4))
  ctx.fillStyle   = INK_6
  ctx.font        = '32px "NotoSans", "Inter", sans-serif'
  ctx.fillText('Daily MCX Intelligence', W/2, H/2 - 56)

  // Rule
  ctx.globalAlpha = easeOut(Math.max(0, t * 5 - 0.6))
  ctx.strokeStyle = '#FFFFFF12'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, H/2 - 16); ctx.lineTo(W - PAD, H/2 - 16); ctx.stroke()

  // Follow CTA
  ctx.globalAlpha = easeOut(Math.max(0, t * 5 - 0.8))
  ctx.fillStyle   = CREAM
  ctx.font        = 'bold 34px "NotoSans", "Inter", sans-serif'
  ctx.fillText('Follow for your daily edge', W/2, H/2 + 40)

  ctx.globalAlpha = easeOut(Math.max(0, t * 5 - 1.0))
  ctx.fillStyle   = GOLD
  ctx.font        = '28px "NotoSans", "Inter", sans-serif'
  ctx.fillText('@bhaavbrief  ·  bhaavbrief.in', W/2, H/2 + 90)

  // Edition
  ctx.globalAlpha = easeOut(Math.max(0, t * 4 - 1.2))
  ctx.fillStyle   = INK_4
  ctx.font        = '20px "NotoSans", "Inter", sans-serif'
  ctx.fillText(`Edition #${edition}`, W/2, H/2 + 150)

  ctx.globalAlpha = 1
}

// ── Frame dispatcher ──────────────────────────────────────────────────────────
function renderFrame(frame, copy, data, snapshot, mood) {
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')
  const edition = data.edition ?? '?'

  if (frame < HOOK_END) {
    drawHook(ctx, frame / HOOK_END, copy, snapshot, mood, edition)
  } else if (frame < BEAT1_END) {
    drawBeat(ctx, (frame - HOOK_END) / (BEAT1_END - HOOK_END), copy.beat1, 1, snapshot, mood)
  } else if (frame < BEAT2_END) {
    drawBeat(ctx, (frame - BEAT1_END) / (BEAT2_END - BEAT1_END), copy.beat2, 2, snapshot, mood)
  } else if (frame < BEAT3_END) {
    drawBeat(ctx, (frame - BEAT2_END) / (BEAT3_END - BEAT2_END), copy.beat3, 3, snapshot, mood)
  } else if (frame < PAYOFF_END) {
    drawPayoff(ctx, (frame - BEAT3_END) / (PAYOFF_END - BEAT3_END), copy, mood)
  } else {
    drawCTA(ctx, (frame - PAYOFF_END) / (CTA_END - PAYOFF_END), mood, edition)
  }

  return canvas.toBuffer('image/png')
}

// ── Main ──────────────────────────────────────────────────────────────────────
// Register fonts — prefer NotoSans (better canvas rendering), fall back to Inter
const notoB = join(ROOT, 'public/fonts/NotoSans-Bold.ttf')
const notoR = join(ROOT, 'public/fonts/NotoSans-Regular.ttf')
const interV = join(ROOT, 'public/fonts/Inter-Variable.ttf')
const interB = join(ROOT, 'public/fonts/Inter-Bold.ttf')
if (existsSync(notoB)) GlobalFonts.registerFromPath(notoB, 'NotoSans')
if (existsSync(notoR)) GlobalFonts.registerFromPath(notoR, 'NotoSans')
if (existsSync(interV)) GlobalFonts.registerFromPath(interV, 'Inter')
if (existsSync(interB)) GlobalFonts.registerFromPath(interB, 'Inter')

let edition = process.env.EDITION ? parseInt(process.env.EDITION) : null
if (!edition) {
  const nums = readdirSync(join(ROOT, 'content/briefs'))
    .map(f => f.match(/edition-(\d+)\.mdx/)?.[1]).filter(Boolean).map(Number)
  edition = Math.max(...nums)
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  BhaavBrief — Reel Generator`)
console.log(`  Edition #${edition}  (${TOTAL_DUR}s / ${TOTAL_FRAMES} frames)`)
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
console.log(`  hook_caption: "${copy.hook_caption}"`)
console.log(`  stat:         "${copy.stat_line}"`)
console.log(`  beat1:        "${copy.beat1}"`)
console.log(`  beat2:        "${copy.beat2}"`)
console.log(`  beat3:        "${copy.beat3}"`)
console.log(`  payoff:       "${copy.payoff}"`)
console.log(`  voice:        "${copy.voiceover}"\n`)

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
  if (f % 100 === 0) process.stdout.write(`  ${f}/${TOTAL_FRAMES}\n`)
}
console.log(`  ${TOTAL_FRAMES}/${TOTAL_FRAMES} — ${((Date.now()-t0)/1000).toFixed(1)}s\n`)

console.log(`⚙️   Encoding (${mood}${voiceoverPath ? ' + voice' : ''})...`)
const DUR  = TOTAL_FRAMES / FPS
const args = ['-y', '-framerate', String(FPS), '-i', join(FRAMES_DIR, 'f%04d.png')]

if (voiceoverPath) {
  args.push('-i', musicPath, '-i', voiceoverPath,
    '-filter_complex',
    `[1:a]atrim=0:${DUR},afade=t=out:st=${DUR-2.5}:d=2.5,asetpts=PTS-STARTPTS,volume=0.16[music];` +
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

// Caption — hook_caption as first line (the scroll-stopper)
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
  copy.hook_caption ?? copy.stat_line ?? data.title,
  '',
  copy.beat1,
  copy.beat2,
  '',
  `Watch: ${copy.beat3}`,
  '',
  `Full brief → bhaavbrief.in/briefs/${slug} 👇`,
  '',
  hashtags,
].join('\n')

writeFileSync(CAP_FILE, caption, 'utf8')

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  ✅  ${OUT_FILE}`)
console.log(`  ✅  ${CAP_FILE}`)
console.log(`  🎵  ${mood} → ${musicPath.split('/').slice(-2).join('/')}`)
console.log(`  🎙️   Voice: ${voiceoverPath ? 'ElevenLabs' : 'none'}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
