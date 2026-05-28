import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Load system & local fonts
const fontDirs = ['/usr/share/fonts/truetype/noto', '/usr/share/fonts/', '/System/Library/Fonts']
for (const dir of fontDirs) {
  if (existsSync(dir)) { try { GlobalFonts.loadFontsFromDir(dir) } catch {} }
}
const interPath = join(ROOT, 'public/fonts/Inter-Bold.ttf')
if (existsSync(interPath)) GlobalFonts.registerFromPath(interPath, 'Inter')

// Render at 2x → export at 500px (anti-aliasing & crispness)
const SCALE = 2
const W = 500 * SCALE
const H = 500 * SCALE

const DARK   = '#1C1A14'
const GOLD   = '#C4A35A'
const GOLD_L = '#DFC07A'
const CREAM  = '#F0E8D5'
const MUTED  = '#8A7A58'

const canvas = createCanvas(W, H)
const ctx    = canvas.getContext('2d')

function s(n) { return n * SCALE }

// ── Background ────────────────────────────────────────────────────────────────
ctx.fillStyle = DARK
ctx.fillRect(0, 0, W, H)

// ── Subtle radial vignette (center lighter) ───────────────────────────────────
const vignette = ctx.createRadialGradient(W/2, H*0.42, s(30), W/2, H*0.42, s(280))
vignette.addColorStop(0, 'rgba(28,22,14,0)')
vignette.addColorStop(1, 'rgba(10,8,4,0.40)')
ctx.fillStyle = vignette
ctx.fillRect(0, 0, W, H)

// ── Thin inset border frame ───────────────────────────────────────────────────
const F = s(20)
ctx.strokeStyle = GOLD
ctx.lineWidth = s(1.2)
ctx.strokeRect(F, F, W - F*2, H - F*2)

// ── Corner ornaments (tiny diagonal cuts) ────────────────────────────────────
const CO = s(12), CF = F
;[
  [CF, CF, CO, 0, 0, CO],
  [W-CF, CF, W-CO-CF+CF, 0, W, CO],
  [CF, H-CF, CO+CF-CF, H, 0, H-CO],
  [W-CF, H-CF, W-CO-CF+CF, H, W, H-CO],
].forEach(([x1, y1, x2a, y2a, x2b, y2b]) => {
  // Not drawing cuts — use tiny dot ornaments instead
})

// corner dot ornaments
const dotR = s(3)
for (const [cx, cy] of [[F+s(10), F+s(10)], [W-F-s(10), F+s(10)], [F+s(10), H-F-s(10)], [W-F-s(10), H-F-s(10)]]) {
  ctx.beginPath()
  ctx.arc(cx, cy, dotR, 0, Math.PI*2)
  ctx.fillStyle = GOLD
  ctx.fill()
}

// ── Circular emblem ring ──────────────────────────────────────────────────────
const CX = W / 2
const CY = H * 0.38
const R  = s(130)

ctx.beginPath()
ctx.arc(CX, CY, R, 0, Math.PI*2)
ctx.strokeStyle = GOLD
ctx.lineWidth = s(1.5)
ctx.stroke()

// Inner thin ring
ctx.beginPath()
ctx.arc(CX, CY, R - s(8), 0, Math.PI*2)
ctx.strokeStyle = MUTED
ctx.lineWidth = s(0.6)
ctx.stroke()

// ── "BB" monogram inside circle ───────────────────────────────────────────────
// Gold gradient for depth
const grad = ctx.createLinearGradient(CX - s(80), CY - s(80), CX + s(80), CY + s(80))
grad.addColorStop(0, GOLD_L)
grad.addColorStop(0.5, '#EDD898')
grad.addColorStop(1, GOLD)
ctx.fillStyle = grad

ctx.font = `bold ${s(172)}px Georgia, "Times New Roman", serif`
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('B', CX, CY + s(6))

// ── Ornamental separator ──────────────────────────────────────────────────────
const sepY  = H * 0.67
const sepX1 = W * 0.20
const sepX2 = W * 0.80

ctx.strokeStyle = GOLD
ctx.lineWidth = s(1)
ctx.beginPath()
ctx.moveTo(sepX1, sepY)
ctx.lineTo(W/2 - s(14), sepY)
ctx.stroke()
ctx.beginPath()
ctx.moveTo(W/2 + s(14), sepY)
ctx.lineTo(sepX2, sepY)
ctx.stroke()

// Diamond ornament centre
ctx.save()
ctx.translate(W/2, sepY)
ctx.rotate(Math.PI / 4)
const D = s(5.5)
ctx.fillStyle = GOLD
ctx.fillRect(-D/2, -D/2, D, D)
ctx.restore()

// ── "BhaavBrief" — elegant serif title ───────────────────────────────────────
ctx.fillStyle = CREAM
ctx.font = `bold ${s(52)}px Georgia, "Times New Roman", serif`
ctx.textAlign = 'center'
ctx.textBaseline = 'alphabetic'
ctx.letterSpacing = `${s(2)}px`
ctx.fillText('BhaavBrief', W/2, H * 0.79)

// ── Tagline ───────────────────────────────────────────────────────────────────
ctx.fillStyle = GOLD
ctx.font = `${s(16)}px "Inter", Arial, sans-serif`
ctx.letterSpacing = `${s(4)}px`
ctx.fillText('COMMODITY  INTELLIGENCE', W/2, H * 0.88)

// ── Save at 500×500 ───────────────────────────────────────────────────────────
const finalCanvas = createCanvas(500, 500)
const fctx = finalCanvas.getContext('2d')
fctx.drawImage(canvas, 0, 0, W, H, 0, 0, 500, 500)

const outPath = join(ROOT, 'public/bhaavbrief-logo.png')
writeFileSync(outPath, finalCanvas.toBuffer('image/png'))
console.log(`Logo saved: ${outPath}`)
