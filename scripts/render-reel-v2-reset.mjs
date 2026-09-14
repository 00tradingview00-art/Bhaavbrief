#!/usr/bin/env node
/** Audio-first, review-only currency pilot. No publishing or history mutation.
 * node scripts/render-reel-v2-reset.mjs [--local-voice] [--frames-only]
 * Premium voice uses existing ElevenLabs credentials, verifies gender, and caches
 * each spoken shot + alignment. --local-voice explicitly selects draft system TTS.
 */
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateReelV2 } from './lib/reelV2Compliance.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const reel = JSON.parse(readFileSync(join(ROOT, 'reels/v2/gold-rupee-reset-001.json'), 'utf8'))
const claims = JSON.parse(readFileSync(join(ROOT, 'data/claims.json'), 'utf8')).claims ?? []
const issues = validateReelV2(reel, claims).filter(x => x !== 'Reel is not human-approved')
if (issues.length) throw new Error(issues.join('\n'))
if (reel.storyboard.map(s => s.narration).join(' ') !== reel.voiceover) throw new Error('Spoken shots differ from validated voiceover')
const local = process.argv.includes('--local-voice')
const framesOnly = process.argv.includes('--frames-only')
const OUT = join(ROOT, 'output/reels-reset')
const CACHE = join(OUT, 'cache')
mkdirSync(CACHE, { recursive: true })
const FPS = 30, W = 1080, H = 1920
const exec = (bin, args) => execFileSync(bin, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
const probe = path => Number(exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path]).trim())
if (existsSync(join(ROOT, '.env.local'))) process.loadEnvFile(join(ROOT, '.env.local'))
const key = process.env.ELEVENLABS_API_KEY
let voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'
let voiceName = 'Samantha (local draft)'
const voiceSource = local ? 'say_draft' : 'elevenlabs'
async function api(path, body) {
  const response = await fetch(`https://api.elevenlabs.io${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${data.detail?.message || data.detail?.status || 'request rejected'}. Use --local-voice for a labelled draft only.`)
  return data
}
if (!local) {
  if (!key) throw new Error('No ElevenLabs key. Use --local-voice for a labelled draft only.')
  let metadata = await api(`/v1/voices/${voiceId}`)
  if (metadata.labels?.gender !== 'female') {
    voiceId = 'EXAVITQu4vr4xnSDxMaL'
    metadata = await api(`/v1/voices/${voiceId}`)
  }
  if (metadata.labels?.gender !== 'female') throw new Error('Cannot verify female narration')
  voiceName = metadata.name
  console.log(`Verified female voice: ${voiceName}; accent: ${metadata.labels?.accent ?? 'unspecified'}`)
}

// Word groups use provider character alignment, not an assumed speech speed.
// Local draft timing is explicitly approximate and recorded in the QA manifest.
function captionsFor(text, alignment, duration) {
  const normalized = alignment?.characters?.join('') ?? text
  const words = [...normalized.matchAll(/\S+/g)]
  const groups = []
  let chunk = []
  for (let i = 0; i < words.length; i++) {
    chunk.push(words[i])
    if (chunk.length === 5 || /[.!?]$/.test(words[i][0]) || i === words.length - 1) {
      const first = chunk[0].index, last = chunk.at(-1).index + chunk.at(-1)[0].length - 1
      groups.push({
        text: chunk.map(w => w[0]).join(' '),
        start: alignment?.character_start_times_seconds?.[first] ?? first / normalized.length * duration,
        end: alignment?.character_end_times_seconds?.[last] ?? (last + 1) / normalized.length * duration,
      })
      chunk = []
    }
  }
  return groups
}

let cursor = 0
const timeline = []
for (let i = 0; i < reel.storyboard.length; i++) {
  const shot = reel.storyboard[i]
  const hash = createHash('sha256').update(JSON.stringify({ text: shot.narration, voiceId: local ? 'Samantha-178' : voiceId, model: 'eleven_multilingual_v2' })).digest('hex').slice(0, 16)
  const audio = join(CACHE, `${hash}.${local ? 'aiff' : 'mp3'}`)
  const alignFile = join(CACHE, `${hash}.json`)
  let alignment
  if (!existsSync(audio) || !(probe(audio) > 0)) {
    if (local) exec('say', ['-v', 'Samantha', '-r', '178', '-o', audio, shot.narration])
    else {
      const data = await api(`/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
        text: shot.narration, model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.12, use_speaker_boost: true },
        previous_text: reel.storyboard[i - 1]?.narration, next_text: reel.storyboard[i + 1]?.narration,
      })
      alignment = data.normalized_alignment ?? data.alignment
      if (!data.audio_base64 || !alignment) throw new Error('Missing audio or alignment')
      writeFileSync(audio, Buffer.from(data.audio_base64, 'base64'))
      writeFileSync(alignFile, JSON.stringify(alignment))
    }
  }
  if (!local && !alignment) alignment = JSON.parse(readFileSync(alignFile, 'utf8'))
  const audioDuration = probe(audio)
  if (!Number.isFinite(audioDuration) || audioDuration <= 0) throw new Error('Invalid audio duration')
  const duration = Math.ceil(Math.max(shot.min_seconds, audioDuration + 0.18) * FPS) / FPS
  const segment = join(CACHE, `shot-${i}.wav`)
  exec('ffmpeg', ['-y', '-v', 'error', '-i', audio, '-af', `apad,atrim=0:${duration}`, '-ar', '48000', '-ac', '2', segment])
  timeline.push({ ...shot, start: cursor, end: cursor + duration, audioDuration, segment, captions: captionsFor(shot.narration, alignment, audioDuration) })
  cursor += duration
  console.log(`Shot ${i + 1}: voice ${audioDuration.toFixed(2)}s; scene ${duration.toFixed(2)}s`)
}
const duration = Math.round(cursor * FPS) / FPS
if (duration > 18) throw new Error(`Pilot runs ${duration}s; shorten copy instead of trimming speech`)
const hero = await loadImage(join(ROOT, reel.visual_asset))
GlobalFonts.registerFromPath(join(ROOT, 'public/fonts/NotoSans-Regular.ttf'), 'ReelSans')
GlobalFonts.registerFromPath(join(ROOT, 'public/fonts/NotoSans-Bold.ttf'), 'ReelSans')
GlobalFonts.registerFromPath(join(ROOT, 'public/fonts/NotoSansDevanagari-Regular.ttf'), 'ReelCurrency')
const font = 'ReelSans'
const GOLD = '#F4C46A', WHITE = '#F5F1E8', MUTED = '#A7AAA9', BG = '#101519'
const ease = t => { t = Math.max(0, Math.min(1, t)); return 1 - (1 - t) ** 3 }
function text(ctx, value, x, y, size = 48, color = WHITE, weight = 700, max = 820) {
  ctx.font = `${weight} ${size}px ${value.includes('₹') ? 'ReelCurrency' : font}`
  if (ctx.measureText(value).width > max) throw new Error(`Text overflows ${max}px: ${value}`)
  ctx.fillStyle = color; ctx.fillText(value, x, y)
}
function box(ctx, x, y, w, h, fill, radius = 22, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill()
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke() }
}
function heroScene(ctx, scale = 1) {
  const s = Math.max(W / hero.width, H / hero.height) * scale
  ctx.drawImage(hero, (W - hero.width * s) / 2, (H - hero.height * s) / 2, hero.width * s, hero.height * s)
  const shade = ctx.createLinearGradient(0, 0, 0, H)
  shade.addColorStop(0, 'rgba(5,8,10,0.3)'); shade.addColorStop(0.5, 'rgba(5,8,10,0)'); shade.addColorStop(1, 'rgba(5,8,10,0.85)')
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H)
}
const money = n => `₹${Math.round(n).toLocaleString('en-IN')}`
const illustration = reel.illustration
function draw(time) {
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d')
  const shot = timeline.find(s => time >= s.start && time < s.end) ?? timeline.at(-1)
  const localTime = time - shot.start
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  if (shot.kind === 'hook' || shot.kind === 'payoff') {
    heroScene(ctx, shot.kind === 'hook' ? 1.02 + 0.025 * ease(localTime / 2.4) : 1.045 - 0.025 * ease(localTime / 2.4))
    const lines = shot.copy.split('\n')
    text(ctx, lines[0], 86, 418, 76)
    text(ctx, lines[1], 86, 510, 76, GOLD)
    if (shot.kind === 'hook') {
      box(ctx, 86, 1135, 460, 76, '#12181ce8', 18, '#a1854d')
      text(ctx, 'The currency effect', 110, 1185, 37, GOLD)
    } else {
      box(ctx, 86, 1135, 700, 82, '#12181ce8', 18, '#a1854d')
      text(ctx, 'Check gold + USD/INR together', 110, 1188, 38, GOLD)
    }
  } else {
    // The physical object persists as a small crop; the mechanism becomes foreground.
    ctx.save(); ctx.globalAlpha = 0.12; heroScene(ctx, 1); ctx.restore()
    text(ctx, 'A weaker rupee.', 86, 418, 72)
    text(ctx, 'A higher rupee cost.', 86, 506, 72, GOLD)
    box(ctx, 86, 574, 810, 134, '#20272b', 22, '#57605f')
    text(ctx, 'DOLLAR VALUE • HELD CONSTANT', 112, 617, 25, MUTED)
    text(ctx, `$${illustration.dollar_value}`, 112, 676, 54)
    text(ctx, 'same amount of gold', 316, 669, 30, MUTED)
    const change = ease((localTime - 1.6) / 1.0)
    const fx = illustration.inr_per_dollar_before + change * (illustration.inr_per_dollar_after - illustration.inr_per_dollar_before)
    box(ctx, 86, 744, 390, 332, '#20272b')
    box(ctx, 506, 744, 390, 332, '#2a2820', 22, GOLD)
    text(ctx, 'BEFORE', 112, 796, 29, MUTED)
    text(ctx, 'WEAKER RUPEE', 532, 796, 29, GOLD, 700, 335)
    text(ctx, `₹${illustration.inr_per_dollar_before} / $`, 112, 873, 54)
    text(ctx, `₹${fx.toFixed(change === 0 || change === 1 ? 0 : 1)} / $`, 532, 873, 54)
    text(ctx, 'RUPEE EQUIVALENT', 112, 947, 24, MUTED)
    text(ctx, 'RUPEE EQUIVALENT', 532, 947, 24, MUTED)
    text(ctx, money(illustration.dollar_value * illustration.inr_per_dollar_before), 112, 1022, 62)
    text(ctx, money(illustration.dollar_value * fx), 532, 1022, 62, GOLD)
    text(ctx, 'Dollar value × rupees per dollar', 86, 1143, 38, WHITE, 500)
    text(ctx, 'Currency conversion only • not a retail quote', 86, 1200, 29, MUTED, 500)
    text(ctx, 'Mechanism: World Gold Council • source in caption', 86, 1342, 23, MUTED, 500)
  }
  text(ctx, 'BHAAVBRIEF', 86, 302, 28, WHITE)
  ctx.fillStyle = GOLD; ctx.fillRect(86, 321, 58, 4)
  text(ctx, 'ILLUSTRATION • NOT TODAY’S PRICES', 86, 1385, 25, MUTED, 500)
  text(ctx, 'Educational data, not investment advice.', 86, 1424, 25, MUTED, 500)
  text(ctx, local ? 'CREATIVE DRAFT • TEMP VOICE' : 'CREATIVE DRAFT', 86, 1470, 22, GOLD)
  const caption = shot.captions.find((c, i) => localTime >= c.start && localTime < (shot.captions[i + 1]?.start ?? c.end + 0.15))
  if (caption) {
    ctx.font = `500 38px ${font}`
    const width = ctx.measureText(caption.text).width
    box(ctx, 86, 1253, Math.min(820, width + 36), 64, '#05090dec', 12)
    text(ctx, caption.text, 104, 1296, 38, WHITE, 500, 784)
  }
  return canvas
}

// Useful keyframes are retained; no generic placeholders stand in for the export.
const frameTimes = [0, timeline[1].start + 0.8, timeline[1].start + 3.5, timeline[2].start + 1]
frameTimes.forEach((t, i) => writeFileSync(join(OUT, `frame-${i + 1}.png`), draw(t).toBuffer('image/png')))
const qa = { id: reel.id, review_status: 'draft', duration_seconds: duration, fps: FPS, width: W, height: H, voice_source: voiceSource, voice_name: voiceName, caption_timing: local ? 'approximate draft timing' : 'provider character alignment', timeline: timeline.map(({ segment, ...s }) => s) }
writeFileSync(join(OUT, 'render.json'), JSON.stringify(qa, null, 2))
writeFileSync(join(OUT, 'caption.txt'), reel.caption)
if (framesOnly) { console.log(`Frames: ${OUT}`); process.exit(0) }
const framesDir = join(CACHE, 'frames'); mkdirSync(framesDir, { recursive: true })
for (let frame = 0; frame < Math.round(duration * FPS); frame++) {
  writeFileSync(join(framesDir, `frame-${String(frame).padStart(5, '0')}.jpg`), draw(frame / FPS).toBuffer('image/jpeg', 93))
}
const inputs = timeline.flatMap(s => ['-i', s.segment])
const voiceConcat = timeline.map((_, i) => `[${i + 1}:a]`).join('') + `concat=n=${timeline.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=7[voice]`
const musicIndex = timeline.length + 1
const music = `[${musicIndex}:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=0.07,afade=t=in:st=${timeline[0].end}:d=0.7,afade=t=out:st=${duration - 0.8}:d=0.8[music]`
const output = join(OUT, `${reel.id}-draft.mp4`)
exec('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', join(framesDir, 'frame-%05d.jpg'), ...inputs,
  '-stream_loop', '-1', '-i', join(ROOT, 'public/reels/music/calm.mp3'),
  '-filter_complex', `${voiceConcat};${music};[voice][music]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]`,
  '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-t', String(duration), '-movflags', '+faststart', output])
console.log(`Review draft: ${output} (${probe(output).toFixed(2)}s)`)
