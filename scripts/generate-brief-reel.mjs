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
import { join, dirname, relative }            from 'path'
import { fileURLToPath }                      from 'url'
import { execFileSync }                       from 'child_process'
import matter                                 from 'gray-matter'
import { drawSparkline, drawIconArray, drawComparisonBars } from './lib/charts.mjs'
import { getCloses }                          from './lib/historyReader.mjs'
import { validateChart }                      from './lib/chartValidation.mjs'
import { loadPromptTemplate, renderPromptTemplate } from './lib/promptTemplate.mjs'
import { buildHashtags }                      from './lib/reelHashtags.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')
const PROMPT_VERSION = 'reel_v1'

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

// ── Reel history ──────────────────────────────────────────────────────────────
const HISTORY_FILE = join(ROOT, 'data/reel-history.json')

function readHistory() {
  if (!existsSync(HISTORY_FILE)) return []
  try { return JSON.parse(readFileSync(HISTORY_FILE, 'utf8')) } catch { return [] }
}

function appendHistory(entry) {
  const history = readHistory()
  history.unshift(entry)
  if (history.length > 300) history.splice(300)
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8')
}

function historyContext(history) {
  if (!history.length) return ''
  return `\nPast reels — avoid repeating these hooks, angles, or payoffs:\n${
    history.slice(0, 8).map((r, i) =>
      `${i+1}. [${r.content_type ?? 'unknown'}] Hook: "${r.hook_caption}" | Payoff: "${r.payoff}"`
    ).join('\n')
  }\n`
}

// ── Shared price formatting (was duplicated identically in both copy-extraction
// modes below) ──────────────────────────────────────────────────────────────
function formatPricesBlock(snapshot) {
  if (!snapshot) return ''
  return [
    `MCX Gold  ₹${Math.round(snapshot.instruments.MCX_GOLD?.price ?? 0).toLocaleString('en-IN')}  (${snapshot.instruments.MCX_GOLD?.changePct?.toFixed(2) ?? '?'}%)`,
    `MCX Crude ₹${Math.round(snapshot.instruments.MCX_CRUDE?.price ?? 0).toLocaleString('en-IN')}  (${snapshot.instruments.MCX_CRUDE?.changePct?.toFixed(2) ?? '?'}%)`,
    `MCX Silver ₹${Math.round(snapshot.instruments.MCX_SILVER?.price ?? 0).toLocaleString('en-IN')}  (${snapshot.instruments.MCX_SILVER?.changePct?.toFixed(2) ?? '?'}%)`,
    `USD/INR ₹${snapshot.instruments.USDINR?.price ?? '?'}  (${snapshot.instruments.USDINR?.changePct?.toFixed(2) ?? '?'}%)`,
  ].join('\n')
}

function parseReelCopyResponse(raw) {
  try { return JSON.parse(raw) }
  catch {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error(`Haiku JSON parse failed: ${raw.slice(0, 200)}`)
  }
}

const reelPromptTemplate = loadPromptTemplate(join(ROOT, 'prompts'), PROMPT_VERSION)

// ── Copy extraction — brief mode ──────────────────────────────────────────────
async function extractReelCopy(brief, snapshot, history = []) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const excerpt = brief.content
    .replace(/^---[\s\S]*?---/, '')
    .replace(/## Price Bridge[\s\S]*?##/, '##')
    .replace(/\*BhaavBrief is not.*$/s, '')
    .trim().slice(0, 1000)

  const prompt = renderPromptTemplate(reelPromptTemplate, {
    SOURCE_LABEL:          'Brief',
    SOURCE_TITLE:          brief.data.title,
    CONTEXT_LINE:          '',
    PRICES_BLOCK:          formatPricesBlock(snapshot),
    SOURCE_BODY_BLOCK:     `Excerpt:\n${excerpt}\n`,
    HISTORY_CONTEXT_BLOCK: historyContext(history),
  })

  const msg = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages:   [{ role: 'user', content: prompt }],
  })

  return parseReelCopyResponse(msg.content[0].text.trim())
}

// ── Copy extraction — news / trend mode ──────────────────────────────────────
async function extractNewsReelCopy(topic, context, snapshot, history = []) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = renderPromptTemplate(reelPromptTemplate, {
    SOURCE_LABEL:          'Topic',
    SOURCE_TITLE:          topic,
    CONTEXT_LINE:          context ? `\nContext: ${context}` : '',
    PRICES_BLOCK:          formatPricesBlock(snapshot),
    SOURCE_BODY_BLOCK:     '',
    HISTORY_CONTEXT_BLOCK: historyContext(history),
  })

  const msg = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages:   [{ role: 'user', content: prompt }],
  })

  return parseReelCopyResponse(msg.content[0].text.trim())
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
  if (process.env.FORCE_MOOD) return process.env.FORCE_MOOD
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
  // Sarah — mature, reassuring, confident female voice
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL'

  if (!apiKey) { console.warn('  ⚠️  ELEVENLABS_API_KEY not set — skipping voiceover'); return null }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method:  'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text:      script,
      model_id:  'eleven_multilingual_v2',
      voice_settings: { stability: 0.22, similarity_boost: 0.72, style: 0.28, use_speaker_boost: true },
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

// ── Hindi reel variant ────────────────────────────────────────────────────────
async function generateHindiVariant(copy, padded, filePrefix, musicPath, framesDir, dur) {
  const client      = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  // Sarah — soft, mature, reassuring female voice (same as the English reel);
  // eleven_multilingual_v2 carries her timbre into Hindi. || (not ??) so an
  // empty ELEVENLABS_HINDI_VOICE_ID secret (GitHub Actions injects unset
  // secrets as "", not undefined) still falls back to this default.
  const hindiVoiceId = process.env.ELEVENLABS_HINDI_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  🇮🇳  Generating Hindi variant...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. Translate voiceover to Hindi
  console.log('🔤  Translating voiceover to Hindi...')
  let hindiVoiceover = copy.voiceover
  try {
    const transRes = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Translate this English voiceover to Hindi (Devanagari script).\nKeep all numbers, commodity names (MCX Gold, MCX Silver, MCX Crude, COMEX, OPEC, WTI, Federal Reserve, RBI, USDINR) in English — only translate the connecting narrative.\nOutput ONLY the Hindi voiceover text, nothing else.\n\nEnglish: ${copy.voiceover}`,
      }],
    })
    hindiVoiceover = transRes.content[0].text.trim()
    console.log(`  ✅  Translated (${hindiVoiceover.length} chars)`)
  } catch (e) {
    console.warn(`  ⚠️  Translation failed (${e.message}) — using English voiceover`)
  }

  // 2. Generate Hindi TTS
  const HI_VO_FILE  = join(ROOT, `.reel-vo-${padded}-hi.mp3`)
  const apiKey      = process.env.ELEVENLABS_API_KEY
  let hindiVoicePath = null
  if (apiKey) {
    console.log('🎙️   Generating Hindi voiceover...')
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${hindiVoiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: hindiVoiceover,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.22, similarity_boost: 0.72, style: 0.28, use_speaker_boost: true },
        }),
        signal: AbortSignal.timeout(30000),
      })
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer())
        writeFileSync(HI_VO_FILE, buf)
        console.log(`  ✅  Hindi voiceover (${(buf.length / 1024).toFixed(0)} KB)`)
        hindiVoicePath = HI_VO_FILE
      } else {
        console.warn(`  ⚠️  ElevenLabs Hindi TTS failed (${res.status}) — encoding without voiceover`)
      }
    } catch (e) {
      console.warn(`  ⚠️  ElevenLabs Hindi TTS error (${e.message}) — encoding without voiceover`)
    }
  } else {
    console.warn('  ⚠️  ELEVENLABS_API_KEY not set — encoding Hindi without voiceover')
  }

  // 3. Measure Hindi audio duration (for trim bound)
  let hindiVoiceTrim = dur
  if (hindiVoicePath && existsSync(hindiVoicePath)) {
    try {
      const probeOut = execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', hindiVoicePath],
        { encoding: 'utf8' }
      ).trim()
      const probed = parseFloat(probeOut)
      if (Number.isFinite(probed) && probed > 0) hindiVoiceTrim = Math.min(probed + 0.1, dur)
    } catch {}
  }

  // 4. Encode Hindi MP4 (reuses same frames)
  const HI_OUT_FILE = join(ROOT, 'public/reels', `${filePrefix}-${padded}-hi.mp4`)
  const HI_CAP_FILE = join(ROOT, 'public/reels', `${filePrefix}-${padded}-hi.txt`)
  console.log('⚙️   Encoding Hindi reel...')
  const hiArgs = ['-y', '-framerate', '30', '-i', join(framesDir, 'f%04d.png')]
  if (hindiVoicePath) {
    hiArgs.push('-i', musicPath, '-i', hindiVoicePath,
      '-filter_complex',
      `[1:a]atrim=0:${dur},afade=t=out:st=${dur - 2.5}:d=2.5,asetpts=PTS-STARTPTS,volume=0.16[music];` +
      `[2:a]atrim=0:${hindiVoiceTrim},asetpts=PTS-STARTPTS,volume=1.0[voice];` +
      `[music][voice]amix=inputs=2:duration=first:normalize=0[aout]`,
      '-map', '0:v', '-map', '[aout]'
    )
  } else {
    hiArgs.push('-i', musicPath,
      '-af', `atrim=0:${dur},afade=t=out:st=${dur - 2.0}:d=2.0,asetpts=PTS-STARTPTS`
    )
  }
  hiArgs.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', HI_OUT_FILE)
  execFileSync('ffmpeg', hiArgs, { stdio: 'pipe' })
  console.log(`  ✅  ${HI_OUT_FILE}`)
  if (hindiVoicePath && existsSync(hindiVoicePath)) rmSync(hindiVoicePath)

  // 5. Hindi caption — translate hook + beats, keep link/hashtags
  console.log('📝  Translating caption...')
  let hiHook  = copy.hook_caption ?? copy.stat_line ?? ''
  let hiBeat1 = copy.beat1 ?? ''
  let hiBeat2 = copy.beat2 ?? ''
  try {
    const capRes = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Translate these lines to Hindi (Devanagari script). Keep numbers and English terms (MCX, RBI, USDINR, COMEX, etc.) in English. Output ONLY the translations, one per line, in the same order.\n\nLine 1: ${hiHook}\nLine 2: ${hiBeat1}\nLine 3: ${hiBeat2}`,
      }],
    })
    const lines = capRes.content[0].text.trim().split('\n')
      .map(l => l.replace(/^Line \d+:\s*/i, '').trim()).filter(Boolean)
    if (lines[0]) hiHook  = lines[0]
    if (lines[1]) hiBeat1 = lines[1]
    if (lines[2]) hiBeat2 = lines[2]
  } catch {}

  const hiHashtags = '#BhaavBrief #MCX #CommodityMarkets #IndianMarkets #MCXTrading #हिंदी #कमोडिटीमार्केट'
  const hiCaption = [
    hiHook, '', hiBeat1, hiBeat2, '',
    `Watch: ${copy.beat3 ?? ''}`,
    '\nbhaavbrief.in 👇\n',
    'Follow @bhaavbrief for daily MCX updates. 🔔',
    hiHashtags,
  ].join('\n')
  writeFileSync(HI_CAP_FILE, hiCaption, 'utf8')
  console.log(`  ✅  ${HI_CAP_FILE}`)

  // 6. Write Hindi output path file
  writeFileSync(join(ROOT, '.reel-hi-output-path.txt'), relative(ROOT, HI_OUT_FILE), 'utf8')

  // 7. Tag existing history entry with hi_path
  try {
    const history = readHistory()
    const entry   = history.find(h => h.file === `${filePrefix}-${padded}`)
    if (entry) {
      entry.hi_path = relative(ROOT, HI_OUT_FILE)
      writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8')
      console.log('  📚  History updated with hi_path')
    }
  } catch (e) {
    console.warn(`  ⚠️  History hi_path update failed: ${e.message}`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  ✅  Hindi reel complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

// ── Canvas constants ──────────────────────────────────────────────────────────
const W = 1080, H = 1920, FPS = 30

// Timing in seconds — these are the PLANNED baseline, used for the initial
// console log and as the fallback when there's no voiceover to measure.
// They get rescaled to the real ElevenLabs audio length once it's generated
// (see "Voiceover-driven timing rescale" below) — a duration assumed here at
// script-writing time is a guess; the TTS provider's actual output is the
// ground truth. Previously this was fixed and the render loop always
// produced exactly TOTAL_FRAMES frames while the audio mix hard-trimmed the
// voiceover to fit (`atrim=0:${DUR-1.5}`), silently cutting off whatever the
// voice hadn't finished saying by then — the same bug class documented in
// generate-ivix-reel.mjs's history, now fixed at the source (this file is
// the shared engine both scripts/generate-brief-reel.mjs's own callers and
// scripts/generate-learn-reel.mjs render through).
const COVER_DUR  = 0     // cover removed — hook renders from frame 0 (first-frame value rule);
                         // drawCover() kept below but never dispatched while this is 0
let   HOOK_DUR   = 3.0
let   BEAT1_DUR  = 8.0
let   BEAT2_DUR  = 8.0
let   BEAT3_DUR  = 7.0
let   PAYOFF_DUR = 5.0
const CTA_DUR    = 4.0   // silent/music-only outro tail — not part of the spoken script, stays fixed
const TOTAL_DUR  = COVER_DUR + HOOK_DUR + BEAT1_DUR + BEAT2_DUR + BEAT3_DUR + PAYOFF_DUR + CTA_DUR
// The portion of the video the voiceover actually speaks over (everything
// except the silent CTA outro) — rescaling target for the real audio length.
const SPEECH_DUR_BASELINE = HOOK_DUR + BEAT1_DUR + BEAT2_DUR + BEAT3_DUR + PAYOFF_DUR

// Frame boundaries — recomputed after the rescale below; declared here as
// the planned baseline so renderFrame()'s dispatch logic has valid values
// even when there's no voiceover (silent fallback keeps the old fixed pacing).
let COVER_END  = Math.round(COVER_DUR  * FPS)
let HOOK_END   = COVER_END  + Math.round(HOOK_DUR   * FPS)
let BEAT1_END  = HOOK_END   + Math.round(BEAT1_DUR  * FPS)
let BEAT2_END  = BEAT1_END  + Math.round(BEAT2_DUR  * FPS)
let BEAT3_END  = BEAT2_END  + Math.round(BEAT3_DUR  * FPS)
let PAYOFF_END = BEAT3_END  + Math.round(PAYOFF_DUR * FPS)
let CTA_END    = PAYOFF_END + Math.round(CTA_DUR    * FPS)
let TOTAL_FRAMES = CTA_END

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

// Instagram Reels safe zone: top 160px and bottom 260px are covered by UI overlays
const TOP_SAFE = 168
const BOT_SAFE = H - 268

// ── Shared header (wordmark + price strip) ────────────────────────────────────
function drawHeader(ctx, snapshot) {
  const PAD = 60

  // Gold top bar
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 6)

  // Wordmark — inside safe zone
  ctx.fillStyle     = GOLD
  ctx.font          = 'bold 22px "NotoSans", "Inter", sans-serif'
  ctx.textAlign     = 'left'
  ctx.letterSpacing = '5px'
  ctx.fillText('BHAAVBRIEF', PAD, TOP_SAFE + 28)
  ctx.letterSpacing = '0px'

  // Thin separator
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, TOP_SAFE + 44); ctx.lineTo(W-PAD, TOP_SAFE + 44); ctx.stroke()

  // Price strip — 4 instruments
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

    ctx.fillStyle     = INK_4
    ctx.font          = 'bold 14px "NotoSans", "Inter", sans-serif'
    ctx.textAlign     = 'left'
    ctx.letterSpacing = '1px'
    ctx.fillText(inst.label, px, TOP_SAFE + 74)
    ctx.letterSpacing = '0px'

    ctx.fillStyle = INK
    ctx.font      = 'bold 20px "NotoSans", "Inter", sans-serif'
    ctx.fillText(instr ? inst.fmt(instr.price) : '—', px, TOP_SAFE + 100)

    ctx.fillStyle = isUp ? GREEN : RED
    ctx.font      = '16px "NotoSans", "Inter", sans-serif'
    ctx.fillText(`${isUp ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`, px, TOP_SAFE + 122)
  })

  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, TOP_SAFE + 140); ctx.lineTo(W-PAD, TOP_SAFE + 140); ctx.stroke()
}
const HEADER_BOTTOM = TOP_SAFE + 148

// ── Phase 0: COVER — static title card, always fully rendered ────────────────
function drawCover(ctx, copy, mood, edition) {
  const bg = MOOD_BG[mood] ?? '#18180F'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Gold bars top & bottom
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 6)
  ctx.fillRect(0, H - 6, W, 6)

  const midY = H / 2

  // Large wordmark
  ctx.fillStyle     = GOLD
  ctx.font          = 'bold 76px "NotoSans", "Inter", sans-serif'
  ctx.textAlign     = 'center'
  ctx.letterSpacing = '14px'
  ctx.fillText('BHAAVBRIEF', W / 2, midY - 60)
  ctx.letterSpacing = '0px'

  // Thin rule
  ctx.strokeStyle = '#FFFFFF22'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(180, midY - 14); ctx.lineTo(W - 180, midY - 14); ctx.stroke()

  // Tagline
  ctx.fillStyle = INK_6
  ctx.font      = '32px "NotoSans", "Inter", sans-serif'
  ctx.fillText('Daily MCX Intelligence', W / 2, midY + 36)

  // Edition or mode label
  ctx.fillStyle = INK_4
  ctx.font      = '22px "NotoSans", "Inter", sans-serif'
  ctx.fillText(edition != null ? `Edition #${edition}` : 'Market Update', W / 2, midY + 86)
}

// ── Phase 1a: HOOK — concept / explainer / trend / breaking ──────────────────
function drawHookConcept(ctx, t, copy, mood, edition) {
  const isBreaking = copy.content_type === 'breaking'
  const isLearn101 = process.env.REEL_SERIES === 'learn101'
  const accentColor = isBreaking ? '#E74C3C' : (isLearn101 ? '#2E86AB' : GOLD)
  const bg = isBreaking ? '#1A0505' : (MOOD_BG[mood] ?? '#18180F')

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = accentColor
  ctx.fillRect(0, 0, W, 6)

  // Wordmark
  ctx.globalAlpha = easeOut(t * 10)
  ctx.fillStyle   = accentColor
  ctx.font        = 'bold 24px "NotoSans", "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '7px'
  ctx.fillText('BHAAVBRIEF', W / 2, TOP_SAFE + 24)
  ctx.letterSpacing = '0px'

  // "BREAKING" badge for breaking news
  if (isBreaking) {
    ctx.globalAlpha = easeOut(Math.min(1, t * 12))
    const bw = 180, bh = 40, bx = W / 2 - bw / 2, by = TOP_SAFE + 44
    ctx.fillStyle = '#E74C3C'
    roundRect(ctx, bx, by, bw, bh, 6); ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 19px "NotoSans", "Inter", sans-serif'
    ctx.letterSpacing = '4px'
    ctx.fillText('BREAKING', W / 2, by + 28)
    ctx.letterSpacing = '0px'
  } else if (isLearn101) {
    ctx.globalAlpha = easeOut(Math.min(1, t * 12))
    const bw = 150, bh = 40, bx = W / 2 - bw / 2, by = TOP_SAFE + 44
    ctx.fillStyle = '#2E86AB'
    roundRect(ctx, bx, by, bw, bh, 6); ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 19px "NotoSans", "Inter", sans-serif'
    ctx.letterSpacing = '3px'
    ctx.fillText('MCX 101', W / 2, by + 28)
    ctx.letterSpacing = '0px'
  } else {
    ctx.globalAlpha = easeOut(Math.max(0, t * 8 - 0.3))
    ctx.strokeStyle = '#FFFFFF15'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(120, TOP_SAFE + 46); ctx.lineTo(W - 120, TOP_SAFE + 46); ctx.stroke()
  }

  // Main concept text — large, centered in safe zone
  const midY = TOP_SAFE + (BOT_SAFE - TOP_SAFE) / 2
  ctx.font = 'bold 62px "NotoSans", "Inter", sans-serif'
  ctx.textAlign = 'center'
  const conceptLines = wrapText(ctx, copy.stat_line ?? '', W - 160)
  const lineH = 84
  const blockH = conceptLines.length * lineH
  const startY = midY - blockH / 2

  conceptLines.forEach((line, i) => {
    const lineT = Math.max(0, (t - i * 0.08) * 6)
    const alpha = easeOut(Math.min(1, lineT))
    const yShift = (1 - spring(Math.min(1, lineT))) * 32
    ctx.globalAlpha = alpha
    ctx.fillStyle   = CREAM
    ctx.fillText(line, W / 2, startY + i * lineH - yShift)
  })

  // Hook sub-line below — legible by ≈1s of video, same rationale as drawHook
  ctx.globalAlpha = easeOut(Math.max(0, t * 5 - 0.6))
  ctx.fillStyle   = INK_6
  ctx.font        = '34px "NotoSans", "Inter", sans-serif'
  const subLines = wrapText(ctx, copy.hook_caption ?? '', W - 200)
  const subStartY = midY + blockH / 2 + 60
  subLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, W / 2, subStartY + i * 48)
  })

  // Edition / mode chip
  ctx.globalAlpha = easeOut(Math.max(0, t * 3 - 1.5))
  ctx.fillStyle   = '#FFFFFF0C'
  roundRect(ctx, W / 2 - 90, BOT_SAFE - 56, 180, 42, 21); ctx.fill()
  ctx.fillStyle   = INK_6
  ctx.font        = '18px "NotoSans", "Inter", sans-serif'
  ctx.fillText(edition != null ? `Edition #${edition}` : 'Market Update', W / 2, BOT_SAFE - 26)

  ctx.globalAlpha = 1
}

// ── Phase 1b: HOOK — price move (animated delta count-up) ────────────────────
function drawHook(ctx, t, copy, snapshot, mood, edition, closes) {
  const bg = MOOD_BG[mood] ?? '#18180F'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Gold top bar
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 6)

  // Wordmark — inside safe zone
  ctx.globalAlpha = easeOut(t * 10)
  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 24px "NotoSans", "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '7px'
  ctx.fillText('BHAAVBRIEF', W/2, TOP_SAFE + 24)
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
  ctx.globalAlpha = easeOut(Math.max(0, t * 6 - 0.6))
  ctx.strokeStyle = '#FFFFFF18'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(120, 810); ctx.lineTo(W-120, 810); ctx.stroke()

  // Stat line — the punchline. Fully opaque by hook-local t≈0.34 (≈1.0s of
  // video) — the viewer's stay/scroll decision happens inside the first
  // 1-1.5s, so the payoff can't wait for t=0.5 like it used to.
  ctx.globalAlpha = easeOut(Math.max(0, t * 5 - 0.7))
  ctx.fillStyle   = CREAM
  ctx.font        = 'bold 52px "NotoSans", "Inter", sans-serif'
  const hookLines = wrapText(ctx, copy?.stat_line ?? '', W - 160)
  let hy = 890
  for (const l of hookLines.slice(0, 2)) { ctx.fillText(l, W/2, hy); hy += 70 }

  // 7-day trend sparkline — the big count-up number above is one day's
  // move; this shows the shape of the week behind it. Not LLM-gated (no
  // hallucination risk, pure data) — drawSparkline itself no-ops (returns
  // false) when fewer than 2 real closes exist, e.g. right after an
  // instrument-token rollover, so this is always safe to call unconditionally.
  const sparkW = 700, sparkH = 160
  const sparkX = (W - sparkW) / 2
  const sparkY = 1080
  ctx.globalAlpha = easeOut(Math.max(0, t * 4 - 1.0))
  ctx.fillStyle   = INK_6
  ctx.font        = '18px "NotoSans", "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '2px'
  ctx.fillText('7-DAY TREND', W / 2, sparkY - 20)
  ctx.letterSpacing = '0px'
  drawSparkline(ctx, {
    x: sparkX, y: sparkY, w: sparkW, h: sparkH,
    closes, upColor: '#2ECC71', downColor: '#E74C3C', lineWidth: 3,
  })

  // Edition chip — inside bottom safe zone
  ctx.globalAlpha = easeOut(Math.max(0, t * 3 - 1.5))
  ctx.fillStyle   = '#FFFFFF0C'
  roundRect(ctx, W/2 - 80, BOT_SAFE - 56, 160, 42, 21); ctx.fill()
  ctx.fillStyle   = INK_6
  ctx.font        = '18px "NotoSans", "Inter", sans-serif'
  ctx.fillText(edition != null ? `Edition #${edition}` : 'Market Update', W/2, BOT_SAFE - 26)

  ctx.globalAlpha = 1
}

// ── Phase 2-4: BEAT screens — one idea per screen, lines animate in ───────────
function drawBeat(ctx, t, text, beatIndex, snapshot, mood, chart = null) {
  const PAD = 68

  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)

  // Shared header (renders within safe zone)
  drawHeader(ctx, snapshot)

  // Beat index label — inside top safe zone
  ctx.fillStyle     = INK_4
  ctx.font          = 'bold 16px "NotoSans", "Inter", sans-serif'
  ctx.textAlign     = 'right'
  ctx.letterSpacing = '1px'
  ctx.fillText(`0${beatIndex} / 03`, W - PAD, TOP_SAFE + 28)
  ctx.letterSpacing = '0px'

  // Footer — inside bottom safe zone
  ctx.strokeStyle = BORDER; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, BOT_SAFE - 58); ctx.lineTo(W - PAD, BOT_SAFE - 58); ctx.stroke()
  ctx.fillStyle = INK_4; ctx.font = '18px "NotoSans", "Inter", sans-serif'; ctx.textAlign = 'left'
  ctx.fillText('bhaavbrief.in', PAD, BOT_SAFE - 38)
  ctx.fillStyle = GOLD; ctx.font = 'bold 18px "NotoSans", "Inter", sans-serif'; ctx.textAlign = 'right'
  ctx.fillText('Daily MCX Intelligence', W - PAD, BOT_SAFE - 38)

  // Progress bar — moved below the footer text (previously sat at
  // BOT_SAFE-36, only 6px from the footer text's baseline at BOT_SAFE-30,
  // so the gold fill visually struck through "bhaavbrief.in" — confirmed via
  // a real rendered frame, 2026-07-31). Now sits in the clear ~20px gap
  // between the footer and the true bottom safe-zone edge.
  const barY = BOT_SAFE - 14, barH = 5, barX = PAD, barW = W - PAD * 2
  ctx.fillStyle = BORDER
  roundRect(ctx, barX, barY, barW, barH, 2); ctx.fill()
  const fill = ((beatIndex - 1) / 3 + t / 3) * barW
  ctx.fillStyle = GOLD
  roundRect(ctx, barX, barY, Math.max(0, fill), barH, 2); ctx.fill()

  // Main text — lines animate in. When this beat hosts a chart, text is
  // vertically centered within the TOP ~45% of the content region instead
  // of the whole thing, leaving the bottom for the chart — a layout change
  // inside drawBeat rather than a new phase, so beat pacing/animation stays
  // unified with the no-chart case.
  const hasChart   = !!chart && chart.beat === beatIndex && chart.type !== 'none'
  const contentTop = HEADER_BOTTOM + 20
  const contentBot = BOT_SAFE - 80
  const fullH       = contentBot - contentTop
  const textBot     = hasChart ? contentTop + fullH * 0.45 : contentBot
  const chartTop    = hasChart ? textBot + 60 : null

  ctx.font = 'bold 56px "NotoSans", "Inter", sans-serif'
  ctx.textAlign = 'left'
  const lines = wrapText(ctx, text, W - PAD * 2)
  const lineHeight = 76
  const totalTextH = lines.length * lineHeight
  const startY = contentTop + (textBot - contentTop - totalTextH) / 2 + lineHeight

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

  // Chart — fades in after the text lines have mostly settled (t≈0.7 per
  // the comment above), not simultaneously with them.
  if (hasChart) {
    const chartX = PAD, chartW = W - PAD * 2, chartH = contentBot - chartTop
    ctx.globalAlpha = easeOut(Math.max(0, t * 2.5 - 0.6))
    ctx.textAlign = 'center'

    if (chart.type === 'icon_array') {
      drawIconArray(ctx, {
        x: chartX, y: chartTop, w: chartW,
        filled: chart.icon_array.filled, total: chart.icon_array.total,
        unitLabel: chart.icon_array.unit_label ?? '',
        filledColor: GOLD, emptyColor: BORDER, textColor: INK,
      })
    } else if (chart.type === 'two_bar') {
      const tb = chart.two_bar
      const unit = tb.unit ?? ''
      const fmt = v => unit === '₹' ? `₹${Math.round(v).toLocaleString('en-IN')}` : `${v.toLocaleString('en-IN')}${unit}`
      drawComparisonBars(ctx, {
        x: chartX, y: chartTop, w: chartW, h: chartH,
        bars: [
          { label: tb.labelA, value: tb.valueA, fmt, color: GOLD, emphasis: true },
          { label: tb.labelB, value: tb.valueB, fmt, color: INK_4 },
        ],
        mutedColor: INK_4, textColor: INK,
      })
    }
    ctx.globalAlpha = 1
  }
}

// ── Phase 5: PAYOFF ───────────────────────────────────────────────────────────
function drawPayoff(ctx, t, copy, mood) {
  const bg = MOOD_BG[mood] ?? '#18180F'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 6)

  // Wordmark — inside safe zone
  ctx.globalAlpha = easeOut(t * 8)
  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 24px "NotoSans", "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '7px'
  ctx.fillText('BHAAVBRIEF', W/2, TOP_SAFE + 24)
  ctx.letterSpacing = '0px'

  // Thin rule
  ctx.globalAlpha = easeOut(Math.max(0, t * 6 - 0.3))
  ctx.strokeStyle = '#FFFFFF15'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(140, TOP_SAFE + 46); ctx.lineTo(W-140, TOP_SAFE + 46); ctx.stroke()

  // Payoff text — centered within safe zone. ctx.font MUST be set to the
  // actual rendering size before wrapText() measures it — it was previously
  // still 'bold 24px' here (leftover from the wordmark above), so lines got
  // wrapped as if they'd render at 24px, then were actually drawn at 68px:
  // massive horizontal overflow off both edges of the canvas. Confirmed via
  // a real rendered frame (2026-07-31) before this fix.
  ctx.font = 'bold 68px "NotoSans", "Inter", sans-serif'
  const payLines = wrapText(ctx, copy.payoff ?? '', W - 140)
  const lineH    = 90
  const safeH    = BOT_SAFE - TOP_SAFE
  const startY   = TOP_SAFE + safeH / 2 - (payLines.length * lineH) / 2 + lineH * 0.6

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

  // All CTA content centered within safe zone
  const midY = TOP_SAFE + (BOT_SAFE - TOP_SAFE) / 2

  // Large BHAAVBRIEF wordmark
  ctx.globalAlpha = easeOut(t * 6)
  ctx.fillStyle   = GOLD
  ctx.font        = 'bold 52px "NotoSans", "Inter", sans-serif'
  ctx.textAlign   = 'center'
  ctx.letterSpacing = '10px'
  ctx.fillText('BHAAVBRIEF', W/2, midY - 110)
  ctx.letterSpacing = '0px'

  // Tagline
  ctx.globalAlpha = easeOut(Math.max(0, t * 5 - 0.4))
  ctx.fillStyle   = INK_6
  ctx.font        = '32px "NotoSans", "Inter", sans-serif'
  ctx.fillText('Daily MCX Intelligence', W/2, midY - 50)

  // Rule
  ctx.globalAlpha = easeOut(Math.max(0, t * 5 - 0.6))
  ctx.strokeStyle = '#FFFFFF12'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, midY - 10); ctx.lineTo(W - PAD, midY - 10); ctx.stroke()

  // Follow CTA
  ctx.globalAlpha = easeOut(Math.max(0, t * 5 - 0.8))
  ctx.fillStyle   = CREAM
  ctx.font        = 'bold 34px "NotoSans", "Inter", sans-serif'
  ctx.fillText('Follow for your daily edge', W/2, midY + 50)

  ctx.globalAlpha = easeOut(Math.max(0, t * 5 - 1.0))
  ctx.fillStyle   = GOLD
  ctx.font        = '28px "NotoSans", "Inter", sans-serif'
  ctx.fillText('@bhaavbrief  ·  bhaavbrief.in', W/2, midY + 100)

  // Edition
  ctx.globalAlpha = easeOut(Math.max(0, t * 4 - 1.2))
  ctx.fillStyle   = INK_4
  ctx.font        = '20px "NotoSans", "Inter", sans-serif'
  ctx.fillText(edition != null ? `Edition #${edition}` : 'Market Update', W/2, midY + 156)

  ctx.globalAlpha = 1
}

// ── Frame dispatcher ──────────────────────────────────────────────────────────
function renderFrame(frame, copy, data, snapshot, mood, hookCloses) {
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')
  // Deliberately NOT coalesced to a placeholder like '?' — null means "no
  // edition" (news/topic/learn-reel mode), and every draw*() function below
  // checks `edition != null` to show 'Market Update' instead. Coalescing
  // here to '?' made that check always true and rendered a literal
  // "Edition #?" on screen for every non-brief reel — confirmed via a real
  // rendered frame, 2026-07-31.
  const edition = data.edition ?? null

  if (frame < COVER_END) {
    drawCover(ctx, copy, mood, edition)
  } else if (frame < HOOK_END) {
    const t = (frame - COVER_END) / (HOOK_END - COVER_END)
    if (copy.content_type === 'price_move') {
      drawHook(ctx, t, copy, snapshot, mood, edition, hookCloses)
    } else {
      drawHookConcept(ctx, t, copy, mood, edition)
    }
  } else if (frame < BEAT1_END) {
    drawBeat(ctx, (frame - HOOK_END) / (BEAT1_END - HOOK_END), copy.beat1, 1, snapshot, mood, copy.chart)
  } else if (frame < BEAT2_END) {
    drawBeat(ctx, (frame - BEAT1_END) / (BEAT2_END - BEAT1_END), copy.beat2, 2, snapshot, mood, copy.chart)
  } else if (frame < BEAT3_END) {
    drawBeat(ctx, (frame - BEAT2_END) / (BEAT3_END - BEAT2_END), copy.beat3, 3, snapshot, mood, copy.chart)
  } else if (frame < PAYOFF_END) {
    drawPayoff(ctx, (frame - BEAT3_END) / (PAYOFF_END - BEAT3_END), copy, mood)
  } else {
    drawCTA(ctx, (frame - PAYOFF_END) / (CTA_END - PAYOFF_END), mood, edition)
  }

  return canvas.toBuffer('image/png')
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 44)
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

// ── Mode detection ────────────────────────────────────────────────────────────
const TOPIC   = process.env.TOPIC?.trim() || null
const CONTEXT = process.env.CONTEXT?.trim() || null
const isNewsMode = !!TOPIC

let edition = null, data = {}, content = '', padded = null, filePrefix = ''

if (isNewsMode) {
  // News / trend mode — no brief needed
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  padded     = `${dateStamp}-${slugify(TOPIC)}`
  filePrefix = 'news'
  // TAGS env (comma-separated, matching TAG_MAP keys below, e.g. "Fed,Inflation")
  // lets a news-mode reel carry topical hashtags — brief mode gets these from
  // the brief's frontmatter `tags`, but news mode has no such file to read
  // from, so without this every TOPIC/CONTEXT reel silently fell back to only
  // the 5 generic hashtags regardless of subject.
  const tags = process.env.TAGS?.trim() ? process.env.TAGS.split(',').map(t => t.trim()) : []
  data       = { title: TOPIC, tags, edition: null }
} else {
  // Brief mode — EDITION env or auto-detect
  edition = process.env.EDITION ? parseInt(process.env.EDITION) : null
  if (!edition) {
    const nums = readdirSync(join(ROOT, 'content/briefs'))
      .map(f => f.match(/edition-(\d+)\.mdx/)?.[1]).filter(Boolean).map(Number)
    edition = Math.max(...nums)
  }
  const briefData = readBrief(edition)
  data       = briefData.data
  content    = briefData.content
  padded     = briefData.padded
  filePrefix = 'brief-edition'
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  BhaavBrief — Reel Generator`)
console.log(isNewsMode
  ? `  NEWS MODE  (${TOTAL_DUR.toFixed(1)}s / ${TOTAL_FRAMES} frames)`
  : `  Edition #${edition}  (${TOTAL_DUR.toFixed(1)}s / ${TOTAL_FRAMES} frames)`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

if (isNewsMode) {
  console.log(`📰  "${TOPIC}"`)
  if (CONTEXT) console.log(`📋  Context: ${CONTEXT}`)
} else {
  console.log(`📖  "${data.title}"`)
  console.log(`🏷️   ${(data.tags ?? []).join(', ')}`)
}

const snapshot = readSnapshot()
const history  = readHistory()

const mood = classifyMood(data, snapshot)
console.log(`🎵  Mood: ${mood}`)
const musicPath = await ensureMusic(mood)
console.log(`  → ${musicPath.split('/').slice(-2).join('/')}\n`)

console.log('🤖  Extracting copy via Haiku...')
if (history.length) console.log(`  📚  Learning from ${Math.min(history.length, 8)} past reels`)
const copy = isNewsMode
  ? await extractNewsReelCopy(TOPIC, CONTEXT, snapshot, history)
  : await extractReelCopy({ data, content }, snapshot, history)

// Deterministic guard on the chart Haiku just emitted — see
// scripts/lib/chartValidation.mjs's header for why a prompt instruction
// alone isn't trusted to keep a number from being fabricated. Demotes to
// type:'none' (drawBeat falls back to its existing plain-text rendering)
// if the structure is invalid or the numbers don't trace back to the
// source material. Uses the full brief content (not the 1000-char excerpt
// actually sent to Haiku) / full CONTEXT text as the source-of-truth pool —
// a superset of what the prompt saw, so this can only be more permissive
// toward genuine numbers, never reject something Haiku legitimately saw.
copy.chart = validateChart(copy.chart, {
  facts: [isNewsMode ? (CONTEXT ?? '') : content],
  snapshot,
})
console.log(`  type:         "${copy.content_type}"`)
console.log(`  hook_caption: "${copy.hook_caption}"`)
console.log(`  stat:         "${copy.stat_line}"`)
console.log(`  beat1:        "${copy.beat1}"`)
console.log(`  beat2:        "${copy.beat2}"`)
console.log(`  beat3:        "${copy.beat3}"`)
console.log(`  payoff:       "${copy.payoff}"`)
console.log(`  chart:        ${copy.chart?.type ?? 'none'}${copy.chart?.type !== 'none' ? ` (beat ${copy.chart.beat})` : ''}`)

// Computed once (not per-frame — the hook phase alone is ~90 frames) for
// drawHook's 7-day trend sparkline. Only meaningful for price_move reels;
// dominantMover() is cheap (no I/O, just comparing up to 4 candidates) so
// calling it here once for its resolved `.key` and again per-frame inside
// drawHook itself (as it already did before this) is negligible overhead.
const hookCloses = copy.content_type === 'price_move'
  ? getCloses(dominantMover(snapshot, copy?.dominant_instrument).key, 7)
  : []
console.log(`  voice:        "${copy.voiceover}"\n`)

const VO_FILE = join(ROOT, `.reel-vo-${padded}.mp3`)
console.log('🎙️   Generating voiceover...')
const voiceoverPath = copy.voiceover ? await generateVoiceover(copy.voiceover, VO_FILE) : null
console.log()

// ── Voiceover-driven timing rescale ────────────────────────────────────────
// The planned HOOK/BEAT1-3/PAYOFF durations above are a guess made before
// the voiceover exists. Measure what ElevenLabs actually produced and
// rescale those phases (proportionally, keeping their relative weight) to
// match — this is what actually prevents the video cutting the voiceover
// off, rather than hoping the guess was close enough. CTA_DUR is excluded
// on purpose: it's a silent/music-only outro, not part of the spoken script.
let measuredVoiceDur = null
if (voiceoverPath && existsSync(voiceoverPath)) {
  try {
    const probeOut = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', voiceoverPath],
      { encoding: 'utf8' }
    ).trim()
    const probed = parseFloat(probeOut)
    if (Number.isFinite(probed) && probed > 0) {
      measuredVoiceDur = probed
      // Clamp the rescale factor — a wildly small/large factor almost
      // certainly means something else went wrong (empty/garbled audio),
      // not a legitimately fast/slow read of this particular script.
      const rawScale = probed / SPEECH_DUR_BASELINE
      const scale    = clamp(rawScale, 0.7, 1.8)
      if (Math.abs(rawScale - scale) > 0.01) {
        console.warn(`  ⚠️  Voiceover implies a ${rawScale.toFixed(2)}x scale — clamped to ${scale.toFixed(2)}x (measured ${probed.toFixed(1)}s)`)
      }
      HOOK_DUR   *= scale
      BEAT1_DUR  *= scale
      BEAT2_DUR  *= scale
      BEAT3_DUR  *= scale
      PAYOFF_DUR *= scale
      COVER_END  = Math.round(COVER_DUR  * FPS)
      HOOK_END   = COVER_END  + Math.round(HOOK_DUR   * FPS)
      BEAT1_END  = HOOK_END   + Math.round(BEAT1_DUR  * FPS)
      BEAT2_END  = BEAT1_END  + Math.round(BEAT2_DUR  * FPS)
      BEAT3_END  = BEAT2_END  + Math.round(BEAT3_DUR  * FPS)
      PAYOFF_END = BEAT3_END  + Math.round(PAYOFF_DUR * FPS)
      CTA_END    = PAYOFF_END + Math.round(CTA_DUR    * FPS)
      TOTAL_FRAMES = CTA_END
      console.log(`  🎯  Voiceover measured ${probed.toFixed(1)}s (planned ${SPEECH_DUR_BASELINE.toFixed(1)}s) — video rescaled to ${(TOTAL_FRAMES / FPS).toFixed(1)}s total`)
    } else {
      console.warn(`  ⚠️  ffprobe returned an unusable duration ("${probeOut}") — keeping planned ${TOTAL_DUR.toFixed(1)}s timing`)
    }
  } catch (e) {
    console.warn(`  ⚠️  ffprobe failed on the voiceover file (${e.message}) — keeping planned ${TOTAL_DUR.toFixed(1)}s timing`)
  }
}

const FRAMES_DIR = join(ROOT, '.reel-frames-tmp')
const OUT_DIR    = join(ROOT, 'public/reels')
const OUT_FILE   = join(OUT_DIR, `${filePrefix}-${padded}.mp4`)
const CAP_FILE   = join(OUT_DIR, `${filePrefix}-${padded}.txt`)

if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true })
mkdirSync(FRAMES_DIR, { recursive: true })
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

console.log(`🎬  Rendering ${TOTAL_FRAMES} frames...`)
const t0 = Date.now()
for (let f = 0; f < TOTAL_FRAMES; f++) {
  writeFileSync(
    join(FRAMES_DIR, `f${String(f).padStart(4,'0')}.png`),
    renderFrame(f, copy, data, snapshot, mood, hookCloses)
  )
  if (f % 100 === 0) process.stdout.write(`  ${f}/${TOTAL_FRAMES}\n`)
}
console.log(`  ${TOTAL_FRAMES}/${TOTAL_FRAMES} — ${((Date.now()-t0)/1000).toFixed(1)}s\n`)

console.log(`⚙️   Encoding (${mood}${voiceoverPath ? ' + voice' : ''})...`)
const DUR  = TOTAL_FRAMES / FPS
const args = ['-y', '-framerate', String(FPS), '-i', join(FRAMES_DIR, 'f%04d.png')]

if (voiceoverPath) {
  // Trim the voice track to its own real measured length (not a guessed
  // DUR-1.5) — DUR was itself derived from this same measurement above, so
  // this no longer cuts off speech; it's just a safety bound against the
  // odd extra frame ffmpeg's own decode might disagree with ffprobe on.
  // Falls back to the old DUR-1.5 heuristic only if measurement failed.
  const voiceTrim = measuredVoiceDur != null ? Math.min(measuredVoiceDur + 0.1, DUR) : DUR - 1.5
  args.push('-i', musicPath, '-i', voiceoverPath,
    '-filter_complex',
    `[1:a]atrim=0:${DUR},afade=t=out:st=${DUR-2.5}:d=2.5,asetpts=PTS-STARTPTS,volume=0.16[music];` +
    `[2:a]atrim=0:${voiceTrim},asetpts=PTS-STARTPTS,volume=1.0[voice];` +
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
// KEEP_FRAMES=1 leaves the rendered PNGs behind for visual inspection (e.g.
// via the Read tool on specific f%04d.png files) after a real end-to-end
// run — the standalone scripts/dev-preview-chart.mjs harness is faster for
// iterating on a single chart, but a real run is still what confirms actual
// Haiku-emitted chart data renders correctly in situ.
const keepForHindi = process.env.GENERATE_HINDI_REEL === 'true'
if (!process.env.KEEP_FRAMES && !keepForHindi) rmSync(FRAMES_DIR, { recursive: true })
else if (process.env.KEEP_FRAMES) console.log(`  🗂️   KEEP_FRAMES set — frames left in ${FRAMES_DIR}`)
if (voiceoverPath && existsSync(voiceoverPath)) rmSync(voiceoverPath)

// Caption
const TAG_MAP = {
  'MCX Gold':'#MCXGold','MCX Silver':'#MCXSilver','MCX Crude':'#MCXCrude',
  'MCX Copper':'#MCXCopper','MCX NatGas':'#MCXNatGas','Macro':'#MacroEconomics',
  'Geopolitics':'#Geopolitics','OPEC':'#OPEC','RBI':'#RBI',
  'Fed':'#FederalReserve','USD/INR':'#USDINR','Inflation':'#Inflation',
}
const hashtags = buildHashtags(
  (data.tags??[]).map(t => TAG_MAP[t]).filter(Boolean),
  ['#BhaavBrief','#MCX','#CommodityMarkets','#IndianMarkets','#MCXTrading'],
).join(' ')

const briefLink = !isNewsMode
  ? `\nFull brief → bhaavbrief.in/briefs/${data.urlSlug ?? `edition-${padded}`} 👇\n`
  : process.env.LEARN_URL
    ? `\nFull guide → ${process.env.LEARN_URL} 👇\n`
    : `\nbhaavbrief.in 👇\n`

const followCta = !isNewsMode
  ? 'Follow @bhaavbrief for the next one before market open. 🔔'
  : process.env.LEARN_URL
    ? 'Follow @bhaavbrief for the next explainer. 🔔'
    : 'Follow @bhaavbrief for the next update. 🔔'

const caption = [
  copy.hook_caption ?? copy.stat_line ?? data.title,
  '',
  copy.beat1,
  copy.beat2,
  '',
  `Watch: ${copy.beat3}`,
  briefLink,
  followCta,
  hashtags,
].join('\n')

writeFileSync(CAP_FILE, caption, 'utf8')

// Append to reel history
appendHistory({
  file:          `${filePrefix}-${padded}`,
  topic:         isNewsMode ? TOPIC : data.title,
  content_type:  copy.content_type ?? 'unknown',
  mood,
  hook_caption:  copy.hook_caption ?? '',
  stat_line:     copy.stat_line ?? '',
  payoff:        copy.payoff ?? '',
  beat1:         copy.beat1 ?? '',
  beat2:         copy.beat2 ?? '',
  beat3:         copy.beat3 ?? '',
  instagram_id:  null,   // filled in by post-reel-instagram.mjs after publishing
  generated_at:  new Date().toISOString(),
  edition:       edition ?? null,
})

// Report the resolved output path back to a caller (e.g. generate-learn-reel.mjs,
// which shells out to this script and can't independently recompute the filename
// without risking drift from the slugify logic above). ROOT-relative, matching
// the REEL_FILE convention post-reel-instagram.mjs expects (it does join(ROOT, REEL_FILE)
// — an absolute path there would double up into a broken, nonexistent path).
writeFileSync(join(ROOT, '.reel-output-path.txt'), relative(ROOT, OUT_FILE), 'utf8')

if (keepForHindi) {
  await generateHindiVariant(copy, padded, filePrefix, musicPath, FRAMES_DIR, DUR)
  if (!process.env.KEEP_FRAMES && existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true })
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  ✅  ${OUT_FILE}`)
console.log(`  ✅  ${CAP_FILE}`)
console.log(`  🎵  ${mood} → ${musicPath.split('/').slice(-2).join('/')}`)
console.log(`  🎙️   Voice: ${voiceoverPath ? 'ElevenLabs' : 'none'}`)
console.log(`  📚  History: ${readHistory().length} reels logged`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
