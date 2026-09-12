#!/usr/bin/env node
/**
 * Render a watermarked V2 editorial preview from a reel manifest.
 *
 * This intentionally has no voice, Instagram upload, or publish behavior.
 * It is a creative-review artifact: a human sees the image direction, motion,
 * hierarchy, and safe-area copy before a narrated production render exists.
 *
 * Usage:
 *   node scripts/render-reel-v2-preview.mjs reels/v2/price-you-feel-gold-001.json --draft
 */

import { createCanvas, loadImage } from '@napi-rs/canvas'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { validateReelV2 } from './lib/reelV2Compliance.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [manifestPath, ...flags] = process.argv.slice(2)
const isDraft = flags.includes('--draft')
// Review renders prioritize iteration speed. Final production renders will
// run at 24 fps with narration and timed captions; this draft path uses 15
// fps so a 10-second visual concept can be reviewed in under a minute.
const FPS = 15
const W = 1080
const H = 1920

if (!manifestPath) {
  console.error('Usage: node scripts/render-reel-v2-preview.mjs <manifest.json> [--draft]')
  process.exit(2)
}

const manifestAbsolute = resolve(process.cwd(), manifestPath)
if (!existsSync(manifestAbsolute)) {
  console.error(`Manifest not found: ${manifestAbsolute}`)
  process.exit(2)
}

const reel = JSON.parse(readFileSync(manifestAbsolute, 'utf8'))
let claims = []
try {
  claims = JSON.parse(readFileSync(join(ROOT, 'data/claims.json'), 'utf8')).claims ?? []
} catch {
  // No ledger file yet — every historical-% claim below correctly fails
  // closed (nothing to match against), which is the safe default.
}
const issues = validateReelV2(reel, claims)
const nonApprovalIssues = issues.filter((issue) => issue !== 'Reel is not human-approved')
if (nonApprovalIssues.length || (!isDraft && issues.length)) {
  console.error('Preview blocked:')
  for (const issue of issues) console.error(`- ${issue}`)
  console.error('Use --draft only for a human-review artifact; it will be watermarked.')
  process.exit(1)
}

function resolveAssetPath(asset) {
  return isAbsolute(asset) ? asset : join(ROOT, asset)
}

// A storyboard may specify a scene asset. That makes a V2 reel a short
// editorial sequence instead of a single still with a slow zoom.
const assetRefs = [...new Set([
  reel.visual_asset,
  ...(reel.storyboard ?? []).map((scene) => scene.visual_asset),
].filter(Boolean))]
const images = new Map()
for (const asset of assetRefs) {
  const assetPath = resolveAssetPath(asset)
  if (!existsSync(assetPath)) {
    console.error(`Visual asset not found: ${assetPath}`)
    process.exit(2)
  }
  images.set(asset, await loadImage(assetPath))
}
const duration = Number(reel.duration_target_seconds ?? 10)
const frameCount = Math.round(duration * FPS)
const framesDir = mkdtempSync(join(tmpdir(), 'bhaavbrief-reel-v2-'))
const outDir = join(ROOT, 'public/reels/v2/previews')
mkdirSync(outDir, { recursive: true })
const suffix = isDraft ? '-draft' : '-review'
// Versioned review artifacts avoid colliding with a previous, interrupted
// renderer. Encode to a per-process temporary file and atomically reveal the
// final file only after ffmpeg exits successfully.
const outFile = join(outDir, `${reel.id}${suffix}-v2.mp4`)
const temporaryOutFile = join(outDir, `.${reel.id}-${process.pid}.mp4`)

function sceneAt(time) {
  return (reel.storyboard ?? []).find((scene) => {
    const [start, end] = scene.seconds.split('-').map(Number)
    return time >= start && time < end
  }) ?? reel.storyboard?.at(-1)
}

function drawCover(ctx, image, t) {
  const scale = Math.max(W / image.width, H / image.height) * (1.04 + t * 0.06)
  const width = image.width * scale
  const height = image.height * scale
  const x = (W - width) / 2 - t * 26
  const y = (H - height) / 2 - t * 12
  ctx.drawImage(image, x, y, width, height)

  const shade = ctx.createLinearGradient(0, 0, 0, H)
  shade.addColorStop(0, 'rgba(5,8,12,0.22)')
  shade.addColorStop(0.46, 'rgba(5,8,12,0.04)')
  shade.addColorStop(1, 'rgba(5,8,12,0.78)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, W, H)
}

function drawBrand(ctx) {
  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  ctx.font = '600 25px Arial'
  ctx.letterSpacing = '5px'
  ctx.fillText('BHAAVBRIEF', 72, 104)
  ctx.fillStyle = '#C8720A'
  ctx.fillRect(72, 126, 116, 5)
}

function drawCopy(ctx, copy, time) {
  if (!copy) return
  const alpha = Math.min(1, Math.max(0, time * 4))
  ctx.globalAlpha = alpha
  ctx.font = '700 66px Arial'
  ctx.fillStyle = '#FFFFFF'
  ctx.shadowColor = 'rgba(0,0,0,0.8)'
  ctx.shadowBlur = 18
  const maxWidth = 866
  // Respect manual \n breaks authored into the copy (used to pair a number/
  // label with its descriptor) before word-wrapping each resulting line by
  // pixel width — a bare /\s+/ split treats \n as ordinary whitespace and
  // silently re-flows those pairings.
  const lines = []
  for (const rawLine of copy.toUpperCase().split('\n')) {
    const words = rawLine.split(/\s+/).filter(Boolean)
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line)
        line = word
      } else line = candidate
    }
    if (line) lines.push(line)
  }
  const y = 1420 - (lines.length - 1) * 74
  lines.forEach((value, i) => ctx.fillText(value, 72, y + i * 80))
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}

function drawSignal(ctx, progress) {
  const y = 1515
  ctx.strokeStyle = 'rgba(200,114,10,0.82)'
  ctx.lineWidth = 5
  ctx.beginPath()
  for (let x = 72; x <= W - 72; x += 12) {
    const local = (x - 72) / (W - 144)
    const amp = 10 + local * 44
    const value = y - Math.sin((local * 8 + progress * 3) * Math.PI) * amp - local * 60
    if (x === 72) ctx.moveTo(x, value)
    else ctx.lineTo(x, value)
  }
  ctx.stroke()
}

function drawSource(ctx, source) {
  if (!source) return
  ctx.fillStyle = 'rgba(8, 12, 16, 0.72)'
  // Keep evidence labels visually adjacent to, but never inside, the large
  // memory copy (which begins around y=1346 for two-line captions).
  ctx.fillRect(72, 1210, Math.min(780, 38 + source.length * 13), 48)
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.font = '600 20px Arial'
  ctx.fillText(source.toUpperCase(), 90, 1242)
}

function drawFooter(ctx, time) {
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = '500 24px Arial'
  ctx.fillText('Educational data, not investment advice.', 72, 1780)
  ctx.fillStyle = '#C8720A'
  ctx.fillRect(72, 1810, 180, 4)
  if (isDraft) {
    ctx.save()
    ctx.translate(W - 80, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.globalAlpha = 0.58 + Math.sin(time * 3) * 0.1
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '700 22px Arial'
    ctx.letterSpacing = '3px'
    ctx.fillText('DRAFT • NOT FOR POSTING', 0, 0)
    ctx.restore()
    ctx.globalAlpha = 1
  }
}

try {
  for (let frame = 0; frame < frameCount; frame++) {
    const time = frame / FPS
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')
    const scene = sceneAt(time)
    const sceneImage = images.get(scene?.visual_asset ?? reel.visual_asset)
    drawCover(ctx, sceneImage, time / duration)
    drawBrand(ctx)
    // Fade copy in once at the beginning of its scene, then hold it. Passing
    // `time % 1` here restarted opacity every second and made every caption
    // visibly blink in the published cut.
    const sceneStart = scene?.seconds ? Number(scene.seconds.split('-')[0]) : time
    drawCopy(ctx, scene?.copy, time - sceneStart)
    drawSource(ctx, scene?.source)
    drawSignal(ctx, time / duration)
    drawFooter(ctx, time)
    // JPEG intermediates are visually sufficient for a watermarked review
    // export and render far faster than lossless 1080×1920 PNG frames.
    writeFileSync(
      join(framesDir, `frame-${String(frame).padStart(4, '0')}.jpg`),
      canvas.toBuffer('image/jpeg', 82),
    )
  }

  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-framerate', String(FPS),
    '-i', join(framesDir, 'frame-%04d.jpg'),
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-r', String(FPS), temporaryOutFile,
  ])
  renameSync(temporaryOutFile, outFile)
  console.log(`Preview rendered: ${outFile}`)
} finally {
  if (existsSync(temporaryOutFile)) rmSync(temporaryOutFile, { force: true })
  rmSync(framesDir, { recursive: true, force: true })
}
