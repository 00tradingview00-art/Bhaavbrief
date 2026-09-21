#!/usr/bin/env node
/**
 * A presenter-led Reel renderer. Unlike the V2 panning-card renderer, this
 * keeps one talking head in frame while the actual mechanism is constructed
 * as readable, timed visual objects. It renders a review MP4 only; publishing
 * remains a separate explicit action.
 *
 * Usage: node scripts/render-v3-explainer.mjs
 */
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const W = 1080, H = 1920, FPS = 24, DURATION = 15
const outputDir = join(ROOT, 'public/reels/v3')
const visualOnly = process.argv.includes('--visual-only')
const output = join(outputDir, `vix-is-uncertainty-001-${visualOnly ? 'visual-review' : 'review'}.mp4`)
const visual = join(ROOT, 'public/reels/v3/assets/bhaavbrief-presenter-v1.png')
const voiceover = 'The VIX is not a fear gauge. It is built from SPX option prices across many strikes. Those prices become a thirty-day volatility measure. So VIX shows expected movement, not whether the S and P will rise or fall.'

if (!existsSync(visual)) throw new Error(`Missing presenter asset: ${visual}`)
mkdirSync(outputDir, { recursive: true })

const image = await loadImage(visual)
const frames = mkdtempSync(join(tmpdir(), 'bhaavbrief-v3-'))
const voice = join(frames, 'voice.mp3')

function ease(t) { const n = Math.max(0, Math.min(1, t)); return n * n * (3 - 2 * n) }
function alpha(t, start, end) { return ease(Math.min((t - start) / .28, (end - t) / .28, 1)) }
function rounded(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill()
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke() }
}
function text(ctx, value, x, y, size, color = '#F8F5EE', weight = 700, align = 'left') {
  ctx.font = `${weight} ${size}px Inter, Arial`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y)
}
function arrow(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 7; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  const a = Math.atan2(y2-y1, x2-x1); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 18*Math.cos(a-.5), y2 - 18*Math.sin(a-.5)); ctx.lineTo(x2 - 18*Math.cos(a+.5), y2 - 18*Math.sin(a+.5)); ctx.closePath(); ctx.fill()
}
function drawHeader(ctx, t) {
  text(ctx, 'BHAAVBRIEF', 72, 94, 26, '#F8F5EE', 800)
  ctx.fillStyle = '#D79A35'; ctx.fillRect(72, 112, 124, 5)
  rounded(ctx, 700, 58, 308, 52, 26, 'rgba(10,13,17,.64)', 'rgba(255,255,255,.16)')
  text(ctx, 'OPTIONS, EXPLAINED', 854, 92, 18, '#F8F5EE', 700, 'center')
  ctx.fillStyle = `rgba(5,7,10,${.40 + Math.min(t, 1) * .28})`; ctx.fillRect(0, 780, W, H-780)
}
function drawHook(ctx, t) {
  const a = alpha(t, 0, 3.1); ctx.globalAlpha = a
  rounded(ctx, 70, 920, 940, 290, 28, 'rgba(10,13,17,.88)', 'rgba(255,255,255,.18)')
  text(ctx, 'VIX IS NOT A', 540, 1012, 50, '#F8F5EE', 700, 'center')
  text(ctx, 'FEAR GAUGE.', 540, 1090, 76, '#F0B44C', 800, 'center')
  text(ctx, 'It measures the price of uncertainty.', 540, 1150, 28, '#D7D1C7', 500, 'center')
  ctx.globalAlpha = 1
}
function drawMechanism(ctx, t) {
  const a = alpha(t, 3, 10.8); ctx.globalAlpha = a
  text(ctx, 'IT STARTS WITH OPTION PRICES', 540, 930, 30, '#F8F5EE', 800, 'center')
  const grow = ease((t - 3.2) / .7)
  rounded(ctx, 96, 1005, 360*grow, 108, 24, '#DBF0DF', '#70B57E'); text(ctx, 'CALLS', 276*grow, 1050, 28, '#17683C', 800, 'center'); text(ctx, 'upside prices', 276*grow, 1083, 21, '#3A7B51', 500, 'center')
  rounded(ctx, 624 + 360*(1-grow), 1005, 360*grow, 108, 24, '#F7DDDD', '#D27777'); text(ctx, 'PUTS', 804 - 180*(1-grow), 1050, 28, '#A93232', 800, 'center'); text(ctx, 'downside prices', 804 - 180*(1-grow), 1083, 21, '#A95656', 500, 'center')
  arrow(ctx, 276, 1130, 410, 1222, '#6DBA7C'); arrow(ctx, 804, 1130, 670, 1222, '#DD6868')
  rounded(ctx, 130, 1242, 820, 118, 28, 'rgba(250,248,242,.96)', '#D5CFC4')
  const dotColors = ['#59B96B','#59B96B','#59B96B','#59B96B','#E66C6C','#E66C6C','#E66C6C','#E66C6C']
  dotColors.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(248 + i*84, 1300, 18, 0, Math.PI*2); ctx.fill() })
  text(ctx, 'A WIDE RANGE OF SPX STRIKES', 540, 1340, 21, '#34312D', 700, 'center')
  ctx.globalAlpha = 1
}
function drawTime(ctx, t) {
  const a = alpha(t, 7.1, 13.7); ctx.globalAlpha = a
  rounded(ctx, 116, 1440, 848, 112, 28, '#F2CA67', '#F7DC98')
  text(ctx, '23–37', 258, 1510, 48, '#2D2921', 800, 'center'); text(ctx, 'DAYS TO EXPIRY', 604, 1498, 24, '#2D2921', 700, 'center'); text(ctx, 'WEIGHTED INTO A CONSTANT 30-DAY MEASURE', 604, 1530, 17, '#6B5723', 600, 'center')
  arrow(ctx, 540, 1568, 540, 1630, '#F0B44C')
  rounded(ctx, 220, 1650, 640, 116, 26, 'rgba(12,15,20,.92)', 'rgba(240,180,76,.56)')
  text(ctx, 'VIX', 540, 1708, 54, '#F8F5EE', 800, 'center'); text(ctx, '30-DAY EXPECTED VOLATILITY', 540, 1742, 18, '#D7D1C7', 600, 'center')
  ctx.globalAlpha = 1
}
function drawConclusion(ctx, t) {
  const a = alpha(t, 11, DURATION); ctx.globalAlpha = a
  rounded(ctx, 70, 1160, 940, 236, 28, 'rgba(10,13,17,.92)', 'rgba(240,180,76,.38)')
  text(ctx, 'EXPECTED MOVEMENT.', 540, 1242, 52, '#F0B44C', 800, 'center')
  text(ctx, 'NOT A DIRECTION CALL.', 540, 1315, 42, '#F8F5EE', 800, 'center')
  text(ctx, 'A rising VIX can accompany upside or downside volatility.', 540, 1362, 21, '#D7D1C7', 500, 'center')
  ctx.globalAlpha = 1
}
function drawFooter(ctx) {
  rounded(ctx, 72, 1812, 724, 42, 21, 'rgba(10,13,17,.74)'); text(ctx, 'SOURCE: CBOE VIX METHODOLOGY', 94, 1840, 17, '#D7D1C7', 700)
  text(ctx, 'Educational, not investment advice.', 1008, 1840, 16, '#D7D1C7', 500, 'right')
}

try {
  for (let frame = 0; frame < FPS * DURATION; frame++) {
    const t = frame / FPS, canvas = createCanvas(W, H), ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, W, H); drawHeader(ctx, t)
    if (t < 3.2) drawHook(ctx, t)
    if (t >= 2.8 && t < 11) drawMechanism(ctx, t)
    if (t >= 7) drawTime(ctx, t)
    if (t >= 10.8) drawConclusion(ctx, t)
    drawFooter(ctx)
    writeFileSync(join(frames, `frame-${String(frame).padStart(4, '0')}.jpg`), canvas.toBuffer('image/jpeg', 88))
  }
  const music = join(ROOT, 'public/reels/music/calm.mp3')
  if (visualOnly) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, 'frame-%04d.jpg'), '-stream_loop', '-1', '-i', music, '-filter_complex', `[1:a]atrim=0:${DURATION},afade=t=out:st=12.5:d=2.5,volume=.10[a]`, '-map', '0:v:0', '-map', '[a]', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', output])
  } else {
    // This deliberate non-ElevenLabs path uses Microsoft's Edge neural speech
    // service through the locally-installed `edge-tts` client. It has no
    // BhaavBrief API key, quota or account dependency. The text is authored
    // in this file; no market/customer data is transmitted.
    execFileSync('python3', ['-m', 'edge_tts', '--voice', 'en-IN-NeerjaNeural', '--rate', '+0%', '--text', voiceover, '--write-media', voice])
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, 'frame-%04d.jpg'), '-stream_loop', '-1', '-i', music, '-i', voice, '-filter_complex', `[1:a]atrim=0:${DURATION},afade=t=out:st=12.5:d=2.5,volume=.10[bed];[2:a]volume=1.0[narration];[bed][narration]amix=inputs=2:duration=first:normalize=0[a]`, '-map', '0:v:0', '-map', '[a]', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', output])
  }
  console.log(`Rendered review reel: ${output}`)
} finally { rmSync(frames, { recursive: true, force: true }) }
