#!/usr/bin/env node
/**
 * scripts/clone-voice.mjs
 *
 * Clones a voice sample via ElevenLabs Instant Voice Cloning,
 * saves the resulting voice_id to .env.local as ELEVENLABS_VOICE_ID.
 *
 * Usage:
 *   node scripts/clone-voice.mjs /path/to/your-voice.mp3
 *   node scripts/clone-voice.mjs ~/Downloads/my-voice.m4a
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname, basename, extname }        from 'path'
import { fileURLToPath }                            from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')
const ENV_FILE  = join(ROOT, '.env.local')

// ── Load .env.local ───────────────────────────────────────────────────────────
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const API_KEY   = process.env.ELEVENLABS_API_KEY
const SAMPLE    = process.argv[2]

if (!API_KEY) {
  console.error('❌  ELEVENLABS_API_KEY not set in .env.local')
  process.exit(1)
}

if (!SAMPLE || !existsSync(SAMPLE)) {
  console.error(`❌  Audio file not found: ${SAMPLE}`)
  console.error('    Usage: node scripts/clone-voice.mjs /path/to/sample.mp3')
  process.exit(1)
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  ElevenLabs — Instant Voice Clone`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
console.log(`  Sample: ${SAMPLE}`)
console.log(`  Size:   ${(readFileSync(SAMPLE).length / 1024).toFixed(0)} KB\n`)

// ── Upload sample ─────────────────────────────────────────────────────────────
console.log('⬆️   Uploading voice sample to ElevenLabs...')

const form = new FormData()
form.append('name', 'BhaavBrief Host')
form.append('description', 'BhaavBrief daily MCX intelligence reel host voice')
form.append('files', new Blob([readFileSync(SAMPLE)], { type: 'audio/mpeg' }), basename(SAMPLE))

const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
  method:  'POST',
  headers: { 'xi-api-key': API_KEY },
  body:    form,
  signal:  AbortSignal.timeout(60000),
})

const data = await res.json()

if (!res.ok || !data.voice_id) {
  console.error('❌  Clone failed:', JSON.stringify(data, null, 2))
  process.exit(1)
}

const VOICE_ID = data.voice_id
console.log(`  ✅  Voice cloned! ID: ${VOICE_ID}\n`)

// ── Test the cloned voice ─────────────────────────────────────────────────────
console.log('🎙️   Generating test clip...')
const testRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
  method:  'POST',
  headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Gold dropped two thousand rupees today as peace talks turned formal. The war premium is gone. Watch four thousand eighty on Comex. BhaavBrief.',
    model_id: 'eleven_turbo_v2_5',
    voice_settings: { stability: 0.30, similarity_boost: 0.75, style: 0.50, use_speaker_boost: true },
  }),
  signal: AbortSignal.timeout(30000),
})

if (testRes.ok) {
  const buf = Buffer.from(await testRes.arrayBuffer())
  const testPath = join(ROOT, 'public/reels/voice-clone-test.mp3')
  writeFileSync(testPath, buf)
  console.log(`  ✅  Test clip saved: ${testPath}`)
  console.log(`       Open it to confirm it sounds right.\n`)
} else {
  console.warn(`  ⚠️  Test generation failed (${testRes.status}) — voice was still cloned\n`)
}

// ── Save voice_id to .env.local ───────────────────────────────────────────────
let envContent = readFileSync(ENV_FILE, 'utf8')

if (envContent.includes('ELEVENLABS_VOICE_ID=')) {
  envContent = envContent.replace(/ELEVENLABS_VOICE_ID=.*/, `ELEVENLABS_VOICE_ID=${VOICE_ID}`)
} else {
  envContent = envContent.replace(
    'ELEVENLABS_API_KEY=',
    `ELEVENLABS_VOICE_ID=${VOICE_ID}\nELEVENLABS_API_KEY=`,
  )
}
writeFileSync(ENV_FILE, envContent)

console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  ✅  ELEVENLABS_VOICE_ID=${VOICE_ID}`)
console.log(`       Saved to .env.local`)
console.log(``)
console.log(`  Next steps:`)
console.log(`  1. Open public/reels/voice-clone-test.mp3 and confirm it sounds like you`)
console.log(`  2. Add ELEVENLABS_VOICE_ID=${VOICE_ID} to GitHub Actions secrets`)
console.log(`  3. Run: EDITION=50 node scripts/generate-brief-reel.mjs`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
