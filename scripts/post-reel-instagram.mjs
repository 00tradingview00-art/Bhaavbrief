#!/usr/bin/env node
/**
 * scripts/post-reel-instagram.mjs
 *
 * Posts an MP4 reel to Instagram via the Graph API resumable upload.
 * No public URL required — video bytes are uploaded directly.
 *
 * Flow:
 *   1. Create IG REELS container with upload_type=resumable → get upload URI
 *   2. POST video bytes to upload URI
 *   3. Poll container status until FINISHED
 *   4. Publish
 *
 * Usage:
 *   node scripts/post-reel-instagram.mjs
 *   REEL_FILE=public/reels/my-reel.mp4 node scripts/post-reel-instagram.mjs
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Load .env.local ───────────────────────────────────────────────────────────
const envFile = join(ROOT, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const IG_USER  = process.env.INSTAGRAM_USER_ID
const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN

if (!IG_USER || !IG_TOKEN) {
  console.error('❌  INSTAGRAM_USER_ID or INSTAGRAM_ACCESS_TOKEN not set in .env.local')
  process.exit(1)
}

const HISTORY_FILE = join(ROOT, 'data/reel-history.json')
function loadHistory() {
  try { return JSON.parse(readFileSync(HISTORY_FILE, 'utf8')) } catch { return [] }
}
// The v1 file key is the bare filename ("brief-edition-103"); v2 reels live
// one directory deeper (public/reels/v2/<id>.mp4) and are keyed "v2/<id>" in
// reel-history.json — deriving the key from the path relative to
// public/reels/ (not just basename()) makes both conventions fall out of
// the same logic instead of needing a v2 special case.
function historyKeyFor(reelRelPath) {
  return reelRelPath.replace(/^public\/reels\//, '').replace(/\.mp4$/, '')
}

// Only ever auto-picks a reel that hasn't already been posted (no
// instagram_id yet in reel-history.json) — scans both the v1 root and the
// v2 subdirectory. Previously this only scanned public/reels/ itself for a
// brief-edition-*/news-* filename pattern, so it could never even see a v2
// reel, and had no concept of "already posted" — it just grabbed whatever
// file had the newest mtime, which risked re-posting or posting the wrong
// reel if more than one produced-but-unposted file was sitting around.
function detectLatestReel() {
  const history = loadHistory()
  const postedKeys = new Set(history.filter((h) => h.instagram_id).map((h) => h.file))
  try {
    const candidates = []
    for (const sub of ['', 'v2']) {
      const dir = join(ROOT, 'public/reels', sub)
      let files
      try { files = readdirSync(dir) } catch { continue }
      for (const f of files) {
        if (!f.endsWith('.mp4')) continue
        const relPath = sub ? `public/reels/${sub}/${f}` : `public/reels/${f}`
        if (postedKeys.has(historyKeyFor(relPath))) continue // already posted — never auto-repost
        candidates.push({ relPath, mtime: statSync(join(ROOT, relPath)).mtimeMs })
      }
    }
    candidates.sort((a, b) => b.mtime - a.mtime)
    if (candidates.length) return candidates[0].relPath
  } catch {}
  return 'public/reels/usdinr-forward-reel.mp4'
}
const REEL_REL  = process.env.REEL_FILE ?? detectLatestReel()
const REEL_PATH = join(ROOT, REEL_REL)
const REEL_KEY  = historyKeyFor(REEL_REL)

if (!existsSync(REEL_PATH)) {
  console.error(`❌  Reel not found: ${REEL_PATH}`)
  process.exit(1)
}

// A file explicitly passed via REEL_FILE still goes through this guard —
// auto-detection already excludes posted reels, but an explicit path is
// exactly how someone would accidentally re-post one (e.g. a stale REEL_FILE
// left over from a previous run). Override with REEL_FORCE_REPOST=1.
const existingHistory = loadHistory().find((h) => h.file === REEL_KEY)
if (existingHistory?.instagram_id && !process.env.REEL_FORCE_REPOST) {
  console.error(`❌  ${REEL_KEY} already posted (instagram_id: ${existingHistory.instagram_id}, ${existingHistory.posted_at}). Set REEL_FORCE_REPOST=1 to post again anyway.`)
  process.exit(1)
}

// Caption: env var → sidecar .txt file → hard-coded fallback
function resolveCaption() {
  if (process.env.REEL_CAPTION) return process.env.REEL_CAPTION
  const sidecar = REEL_PATH.replace(/\.mp4$/, '.txt')
  if (existsSync(sidecar)) {
    console.log(`  Using caption from sidecar: ${sidecar}`)
    return readFileSync(sidecar, 'utf8').trim()
  }
  return DEFAULT_CAPTION
}

const DEFAULT_CAPTION = `RBI held the rupee flat today — but the real move was hidden in the forwards.

Your 1-year forward premium just dropped 12 bps to 2.80%.
$1L booked → ₹11,000 saved.
$3L booked → ₹33,000 saved.

If you import in dollars, your hedge got cheaper — not because the rupee moved, but because rate expectations did.

Save this for your next forward booking. 👇

#USDINR #RBI #ForwardPremium #CurrencyHedging #IndianImporters #MCX #BhaavBrief #IndianMarkets #ForexIndia #RupeeWatch #ImportExport #HedgingStrategy`

const CAPTION = resolveCaption()

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function pollContainerStatus(containerId, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    await sleep(10000)
    const r = await fetch(
      `https://graph.facebook.com/v22.0/${containerId}?fields=status_code&access_token=${IG_TOKEN}`,
      { signal: AbortSignal.timeout(10000) }
    )
    const d = await r.json()
    const status = d.status_code ?? 'PENDING'
    process.stdout.write(`  ⏳  Container: ${status} (${i + 1}/${maxRetries})\r`)
    if (status === 'FINISHED') { console.log(`  ✅  Container ready            `); return true }
    if (status === 'ERROR') throw new Error(`Container failed: ${JSON.stringify(d)}`)
  }
  throw new Error('Container timed out')
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  BhaavBrief — Post Reel to Instagram')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const videoBytes = readFileSync(REEL_PATH)
const fileSize   = statSync(REEL_PATH).size
console.log(`📹  ${REEL_REL} (${(fileSize / 1024).toFixed(0)} KB)\n`)

// 1. Create container with resumable upload
console.log('📱  Creating Reels container (resumable)...')
const initRes = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    media_type:    'REELS',
    upload_type:   'resumable',
    caption:       CAPTION,
    share_to_feed: true,
    thumb_offset:  1300,   // ms — hook text is fully rendered by ~1s, so the
                           // feed thumbnail shows the price-move hook, not a blank frame
    access_token:  IG_TOKEN,
  }),
  signal: AbortSignal.timeout(30000),
})
const initData = await initRes.json()
if (initData.error) {
  console.error('❌  Container init failed:', JSON.stringify(initData.error, null, 2))
  process.exit(1)
}
const containerId = initData.id
const uploadUri   = initData.uri
console.log(`  ✅  Container: ${containerId}`)
console.log(`  Upload URI:  ${uploadUri?.slice(0, 60)}...\n`)

// 2. Upload video bytes
console.log(`⬆️   Uploading ${(fileSize / 1024).toFixed(0)} KB to Instagram...`)
const uploadRes = await fetch(uploadUri, {
  method:  'POST',
  headers: {
    'Authorization':  `OAuth ${IG_TOKEN}`,
    'offset':         '0',
    'file_size':      String(fileSize),
    'Content-Type':   'application/octet-stream',
  },
  body: videoBytes,
  signal: AbortSignal.timeout(120000),
})
const uploadText = await uploadRes.text()
if (!uploadRes.ok) {
  console.error('❌  Upload failed:', uploadRes.status, uploadText)
  process.exit(1)
}
console.log(`  ✅  Upload complete (${uploadRes.status})\n`)

// 3. Poll until processed
console.log('⚙️   Waiting for Instagram to process video...')
await pollContainerStatus(containerId)
console.log()

// 4. Publish
console.log('🚀  Publishing reel...')
const publishRes = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media_publish`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ creation_id: containerId, access_token: IG_TOKEN }),
  signal: AbortSignal.timeout(30000),
})
const publishData = await publishRes.json()
if (publishData.error) {
  console.error('❌  Publish failed:', JSON.stringify(publishData.error, null, 2))
  process.exit(1)
}

// Update reel history with Instagram ID
if (existsSync(HISTORY_FILE)) {
  try {
    const history = JSON.parse(readFileSync(HISTORY_FILE, 'utf8'))
    const entry = history.find(h => h.file === REEL_KEY)
    if (entry) {
      entry.instagram_id = publishData.id
      entry.posted_at    = new Date().toISOString()
      writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8')
      console.log(`  📚  History updated: ${REEL_KEY}`)
    } else {
      // No pre-existing row (e.g. posted a file manually, bypassing
      // produce-reel-v2.mjs's own history upsert) — record it now rather
      // than silently losing the instagram_id/posted_at.
      history.push({ file: REEL_KEY, instagram_id: publishData.id, posted_at: new Date().toISOString() })
      writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8')
      console.log(`  📚  History created: ${REEL_KEY} (no prior entry found)`)
    }
  } catch (e) { console.warn('  ⚠️  History update failed:', e.message) }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  ✅  Reel posted! ID: ${publishData.id}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
