#!/usr/bin/env node
/**
 * Adds the release audio to an approved V2 visual render.
 * V2 stays female-narrated: this script refuses any other voice profile.
 *
 * Usage:
 *   node scripts/produce-reel-v2.mjs reels/v2/market-myth-rupee-001.json
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateReelV2 } from './lib/reelV2Compliance.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestArg = process.argv[2]
if (!manifestArg) throw new Error('Usage: node scripts/produce-reel-v2.mjs <manifest.json>')

const envFile = join(ROOT, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [key, ...values] = line.split('=')
    if (key?.trim() && values.length && !process.env[key.trim()]) process.env[key.trim()] = values.join('=').trim()
  }
}

const manifestPath = resolve(process.cwd(), manifestArg)
const reel = JSON.parse(readFileSync(manifestPath, 'utf8'))
let claims = []
try {
  claims = JSON.parse(readFileSync(join(ROOT, 'data/claims.json'), 'utf8')).claims ?? []
} catch {
  // No ledger file yet — every historical-% claim below correctly fails
  // closed (nothing to match against), which is the safe default.
}
const issues = validateReelV2(reel, claims)
if (issues.length) throw new Error(`V2 release blocked:\n${issues.map(issue => `- ${issue}`).join('\n')}`)
if (reel.voice_profile !== 'female') throw new Error('V2 release blocked: only the female voice profile is allowed.')

const visual = join(ROOT, 'public/reels/v2/previews', `${reel.id}-review-v2.mp4`)
const output = join(ROOT, 'public/reels/v2', `${reel.id}.mp4`)
const caption = join(ROOT, 'public/reels/v2', `${reel.id}.txt`)
if (!existsSync(visual)) throw new Error(`Render the approved V2 visual first: ${visual}`)

const music = join(ROOT, 'public/reels/music/calm.mp3')
if (!existsSync(music)) throw new Error(`Music bed missing: ${music}`)
const duration = Number(reel.duration_target_seconds)
if (!Number.isFinite(duration) || duration <= 0) throw new Error('A positive duration_target_seconds is required.')

// The approved visual was rendered earlier by render-reel-v2-preview.mjs
// using whatever duration_target_seconds was in the manifest *then*. If the
// manifest changed since (a shorter duration edited in after render), the
// mux below would silently trim the already-approved visual via -shortest
// instead of failing loudly — verify they still agree before doing any
// TTS/mux work.
const visualDuration = Number(
  execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', visual,
  ], { encoding: 'utf8' }).trim(),
)
if (!Number.isFinite(visualDuration) || Math.abs(visualDuration - duration) > 0.5) {
  throw new Error(
    `Visual/manifest duration mismatch: ${visual} is ${visualDuration.toFixed(2)}s but the manifest ` +
    `specifies ${duration}s. Re-render the preview (render-reel-v2-preview.mjs) before producing.`,
  )
}

let premiumVoice = false
const voiceMp3 = join(ROOT, `.reel-v2-${reel.id}.mp3`)
const voiceAiff = join(ROOT, `.reel-v2-${reel.id}.aiff`)
let voice = voiceAiff
if (process.env.ELEVENLABS_API_KEY) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: reel.voiceover,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.28, similarity_boost: 0.72, style: 0.18, use_speaker_boost: true },
        // Explicit rather than relying on the API's current default — the
        // response is MP3, so the file this writes must be named .mp3, not
        // the misleading .aiff extension the rest of this file used to
        // share with the `say` fallback below regardless of which ran.
        output_format: 'mp3_44100_128',
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (response.ok) {
      voice = voiceMp3
      writeFileSync(voice, Buffer.from(await response.arrayBuffer()))
      premiumVoice = true
    } else {
      // ElevenLabs returns 401 for both an invalid key AND a permission/
      // quota problem on a valid key (e.g. quota_exceeded) — the status
      // code alone is misleading. Surface the actual detail so this doesn't
      // send someone chasing a key rotation for what's really a billing issue.
      let detail = ''
      try { detail = JSON.parse(await response.text())?.detail?.message ?? '' } catch { /* non-JSON error body */ }
      console.warn(`ElevenLabs unavailable (${response.status}${detail ? `: ${detail}` : ''}); using local female voice fallback.`)
    }
  } catch (error) {
    console.warn(`ElevenLabs unavailable (${error.message}); using local female voice fallback.`)
  }
}
if (!premiumVoice) {
  // Samantha is an installed female English voice. This keeps the release
  // compliant when the premium provider is unavailable; no male fallback is permitted.
  // `say -o <path>.aiff` genuinely produces AIFF, unlike the ElevenLabs path above.
  execFileSync('say', ['-v', 'Samantha', '-r', '178', '-o', voiceAiff, reel.voiceover])
}

const fadeStart = Math.max(0, duration - 2.5)
try {
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', visual, '-stream_loop', '-1', '-i', music, '-i', voice,
    '-filter_complex', `[1:a]atrim=0:${duration},afade=t=out:st=${fadeStart}:d=2.5,volume=0.12[music];[2:a]volume=1.0[voice];[music][voice]amix=inputs=2:duration=first:normalize=0[a]`,
    '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', output,
  ], { stdio: 'inherit' })
} finally {
  if (existsSync(voice)) rmSync(voice)
}

// The caption CTA must repeat the editorial payoff, not inject a generic
// engagement request after a careful explanation.
const saveFrame = reel.editorial_brief?.save_frame ?? reel.editorial_brief?.memory_check
const postCaption = `${reel.caption}${saveFrame ? `\n\n${saveFrame}` : ''}\n\n#MCX #Gold #USDINR #IndianMarkets #CommodityMarkets #BhaavBrief`
writeFileSync(caption, postCaption, 'utf8')

// Record this reel in the shared history log the same way the v1 generators
// do, using the "v2/<id>" file key post-reel-instagram.mjs derives from the
// public/reels/ path — so that script has something to attach instagram_id/
// posted_at to later. Upsert (not append) so re-running production after an
// edit doesn't create a duplicate row or clobber a posting that already
// happened; voice_source records which narration actually shipped, since
// the ElevenLabs fallback (see above) is otherwise invisible after the fact.
const historyFile = join(ROOT, 'data/reel-history.json')
const historyKey = `v2/${reel.id}`
let history = []
try { history = JSON.parse(readFileSync(historyFile, 'utf8')) } catch { /* first reel ever produced */ }
const existingIndex = history.findIndex((h) => h.file === historyKey)
const historyEntry = {
  ...(existingIndex === -1 ? {} : history[existingIndex]),
  file: historyKey,
  topic: reel.hook,
  content_type: 'reel_v2',
  series: reel.series,
  voice_profile: reel.voice_profile,
  voice_source: premiumVoice ? 'elevenlabs' : 'say_fallback',
  generated_at: new Date().toISOString(),
}
if (existingIndex === -1) history.push(historyEntry)
else history[existingIndex] = historyEntry
writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf8')

console.log(`Produced: ${output}`)
console.log(`Caption: ${caption}`)
console.log(`History: ${historyKey} (${premiumVoice ? 'elevenlabs' : 'say_fallback'} voice)`)
