/**
 * scripts/lib/charts.mjs — hand-rolled Canvas2D chart primitives for the
 * reel (scripts/generate-brief-reel.mjs) and card
 * (scripts/generate-instagram-card.js) generators. Both already depend on
 * @napi-rs/canvas, which fully supports arc()/bezier/gradients — no new
 * dependency added here, just new drawing code against that existing API.
 *
 * Every function takes `ctx` plus explicit color params (the reel and card
 * scripts each define slightly different palette constants today — e.g.
 * RED is #C0392B in the reel vs #991818 in the card — this module doesn't
 * try to unify those, callers just pass whichever palette they already have).
 *
 * These are hero visuals (filling ~300-400px of a 1080px-wide vertical
 * frame), not dense dashboard rows — sizes default accordingly (thick bars,
 * large icons) rather than the compact sizing that would suit a small UI
 * widget.
 *
 * Every function returns true/false — whether it actually drew anything —
 * so callers can fall back to plain-text rendering on false instead of
 * leaving a blank gap on screen. These guards exist here, not only in the
 * upstream scripts/lib/chartValidation.mjs gate, because these functions
 * are also called directly from a standalone preview harness with
 * hand-written fixtures that never go through that gate.
 *
 * `reveal` (0-1, default 1): every function accepts this to draw a
 * progressive "coming into being" animation — a sparkline traces itself in,
 * bars grow from zero, icons fill in one at a time — instead of appearing
 * fully-formed under a plain alpha fade (the caller still controls the
 * fade/alpha separately). Callers pass an eased value derived from their own
 * per-frame `t`; reveal=1 reproduces the old fully-drawn behavior exactly,
 * so existing call sites keep working unchanged until they opt in.
 */

const clamp01  = v => Math.max(0, Math.min(1, v))
const easeOut  = t => 1 - Math.pow(1 - clamp01(t), 3)

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

/**
 * Icon-array pictograph — `filled` of `total` circular tokens, filled in
 * `filledColor` and the rest outlined in `emptyColor`. Wraps to a second row
 * automatically once single-row icon size would drop below a readable
 * floor. Caption (`${filled}${unitLabel}`) drawn below the grid.
 *
 * @returns {boolean} false if total<=0 or filled>total (nothing drawn) —
 *   caller should fall back to plain text.
 */
export function drawIconArray(ctx, {
  x, y, w, filled, total, unitLabel = '', label = '',
  filledColor, emptyColor, textColor,
  iconSize = 36, maxIcons = 20, gap = 12, reveal = 1,
}) {
  if (!(total > 0) || !Number.isFinite(filled) || filled < 0 || filled > total) return false
  const count = Math.min(total, maxIcons)
  const cols  = count <= 10 ? count : Math.ceil(count / 2)
  const rows  = Math.ceil(count / cols)

  const minDiameter = 14
  const availW      = w
  const diameter     = Math.max(minDiameter, Math.min(iconSize, (availW - gap * (cols - 1)) / cols))
  const rowH          = diameter + gap
  const gridW          = cols * diameter + (cols - 1) * gap
  const gridH            = rows * diameter + (rows - 1) * (gap * 0.6)
  const startX             = x + (w - gridW) / 2

  // Icons pop in left-to-right, one at a time, instead of all appearing at
  // once — `visible` is a fractional position along that sequence, so the
  // icon currently "in progress" gets a partial scale/alpha for a soft pop.
  const visible = clamp01(reveal) * count
  for (let i = 0; i < count; i++) {
    const iconT = clamp01(visible - i)
    if (iconT <= 0) continue
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx  = startX + col * (diameter + gap) + diameter / 2
    const cy  = y + row * (diameter + gap * 0.6) + diameter / 2
    const isFilled = i < filled
    const scale = 0.5 + 0.5 * easeOut(iconT)
    ctx.save()
    ctx.globalAlpha = easeOut(iconT)
    ctx.beginPath()
    ctx.arc(cx, cy, (diameter / 2) * scale, 0, Math.PI * 2)
    if (isFilled) {
      ctx.fillStyle = filledColor
      ctx.fill()
    } else {
      ctx.strokeStyle = emptyColor
      ctx.lineWidth   = Math.max(1.5, diameter * 0.08)
      ctx.stroke()
    }
    ctx.restore()
  }

  // Caption fades in once the icon sequence has mostly finished popping in.
  const captionAlpha = easeOut((reveal - 0.7) / 0.3)
  if (captionAlpha <= 0) return true
  ctx.save()
  ctx.globalAlpha = captionAlpha
  const captionY = y + gridH + 40
  if (label) {
    ctx.fillStyle = textColor
    ctx.font      = '18px "NotoSans", "Inter", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, x + w / 2, captionY)
  }
  ctx.fillStyle = filledColor
  ctx.font      = 'bold 40px "NotoSans", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${filled}${unitLabel ? ' ' + unitLabel : ''}`, x + w / 2, captionY + (label ? 46 : 0))
  ctx.restore()

  return true
}

/**
 * 2-4 horizontal comparison bars. `baseline` supports a future
 * diverging-bar use case (values above/below a reference point); for the
 * simple two_bar case both values share baseline 0.
 *
 * @param {Array<{label: string, value: number, fmt?: (v:number)=>string, color: string, emphasis?: boolean}>} bars
 * @returns {boolean} false if every bar's value is 0/non-finite relative to baseline.
 */
export function drawComparisonBars(ctx, {
  x, y, w, h, bars, baseline = 0,
  mutedColor, textColor, barHeight = 72, labelGap = 14, reveal = 1,
}) {
  if (!Array.isArray(bars) || bars.length < 2 || bars.length > 4) return false
  const magnitudes = bars.map(b => Number.isFinite(b?.value) ? Math.abs(b.value - baseline) : 0)
  const maxMag = Math.max(...magnitudes)
  if (!(maxMag > 0)) return false

  const rowGap = Math.max(20, (h - bars.length * barHeight) / Math.max(1, bars.length - 1))
  const maxBarW = w * 0.92

  // Bars grow in one at a time (staggered start per row) rather than
  // appearing at full width immediately.
  const stagger = 0.15
  const perBarWindow = 1 - stagger * (bars.length - 1)

  bars.forEach((bar, i) => {
    const rowY = y + i * (barHeight + rowGap)
    const mag  = magnitudes[i]
    const fullBarW = Math.max(mag > 0 ? 8 : 0, (mag / maxMag) * maxBarW)
    const growT = easeOut(clamp01((reveal - i * stagger) / perBarWindow))
    const barW = fullBarW * growT
    const color = bar.emphasis ? bar.color : (mutedColor ?? bar.color)

    // Label above the bar
    ctx.save()
    ctx.globalAlpha = growT > 0 ? Math.max(growT, 0.001) : 0
    ctx.fillStyle = textColor
    ctx.font      = '20px "NotoSans", "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(bar.label ?? '', x, rowY - labelGap)
    ctx.restore()

    if (barW <= 0) return

    // Bar itself
    roundRect(ctx, x, rowY, Math.max(2, barW), barHeight, 8)
    ctx.fillStyle = color
    ctx.fill()

    // Value at the bar's tip — inside if there's room, else just outside.
    // Only shown once the bar has grown close to its final width, so the
    // number doesn't race ahead of (or lag behind) the bar it labels.
    if (growT < 0.85) return
    const valueText = typeof bar.fmt === 'function' ? bar.fmt(bar.value) : String(bar.value)
    ctx.font = 'bold 28px "NotoSans", "Inter", sans-serif'
    const textW = ctx.measureText(valueText).width
    const fitsInside = barW - 24 > textW
    ctx.fillStyle = fitsInside ? '#FFFFFF' : textColor
    ctx.textAlign = fitsInside ? 'right' : 'left'
    ctx.fillText(
      valueText,
      fitsInside ? x + barW - 16 : x + barW + 16,
      rowY + barHeight / 2 + 10
    )
  })

  return true
}

/** Interpolated point at a fractional index along `points` (e.g. 2.4 -> 40% of the way from points[2] to points[3]). */
function pointAtFraction(points, idx) {
  const lo = Math.floor(idx), hi = Math.min(lo + 1, points.length - 1)
  const t  = idx - lo
  return {
    px: points[lo].px + (points[hi].px - points[lo].px) * t,
    py: points[lo].py + (points[hi].py - points[lo].py) * t,
  }
}

/**
 * Line + area-wash sparkline from a plain closes[] array (oldest -> newest),
 * direction-colored (up/down by first vs last close) — same visual
 * convention as components/ui/Sparkline.tsx on the website, ported to
 * canvas calls instead of an SVG path string.
 *
 * @returns {boolean} false if fewer than 2 points (nothing meaningful to draw a line from).
 */
export function drawSparkline(ctx, {
  x, y, w, h, closes,
  upColor, downColor, lineWidth = 3, showArea = true, showDot = true, reveal = 1,
}) {
  if (!Array.isArray(closes) || closes.length < 2) return false
  const finite = closes.filter(v => Number.isFinite(v))
  if (finite.length < 2) return false

  const min = Math.min(...finite)
  const max = Math.max(...finite)
  const range = max - min || 1 // flat line guard — avoid divide-by-zero when all closes are equal

  const isUp = finite[finite.length - 1] >= finite[0]
  const color = isUp ? upColor : downColor

  const points = finite.map((v, i) => ({
    px: x + (i / (finite.length - 1)) * w,
    py: y + h - ((v - min) / range) * h,
  }))

  // The line traces itself in left-to-right instead of appearing all at
  // once — `headIdx` is the fractional point index the visible line
  // currently ends at.
  const headIdx = clamp01(reveal) * (points.length - 1)
  if (headIdx <= 0) return true
  const head = pointAtFraction(points, headIdx)
  const visiblePoints = [...points.slice(0, Math.floor(headIdx) + 1), head]

  if (showArea) {
    ctx.beginPath()
    ctx.moveTo(visiblePoints[0].px, y + h)
    for (const p of visiblePoints) ctx.lineTo(p.px, p.py)
    ctx.lineTo(visiblePoints[visiblePoints.length - 1].px, y + h)
    ctx.closePath()
    const gradient = ctx.createLinearGradient(0, y, 0, y + h)
    gradient.addColorStop(0, `${color}33`) // ~20% alpha wash at top
    gradient.addColorStop(1, `${color}00`) // transparent at bottom
    ctx.fillStyle = gradient
    ctx.fill()
  }

  ctx.beginPath()
  visiblePoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py)))
  ctx.strokeStyle = color
  ctx.lineWidth   = lineWidth
  ctx.lineJoin    = 'round'
  ctx.lineCap     = 'round'
  ctx.stroke()

  if (showDot) {
    ctx.beginPath()
    ctx.arc(head.px, head.py, lineWidth * 1.8, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }

  return true
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

/**
 * Word-synced caption band — a fixed-position pill with its own semi-opaque
 * background (readable over any phase background, light or dark) and up to
 * 2 lines of bold centered text. `chunk` is a
 * scripts/lib/reelCaptions.mjs-shaped `{text, start, end}` (only `.text` is
 * used here — timing/frame-selection is the caller's job); `null`/no-text
 * draws nothing.
 * @returns {boolean} false if there's no chunk/text to show.
 */
export function drawCaptionOverlay(ctx, {
  x, y, w, chunk, fontFamily = '"NotoSans", "Inter", sans-serif',
  bgColor = 'rgba(10,10,8,0.72)', textColor = '#FFFFFF',
  minHeight = 84, fontSize = 44, lineHeight = 50, radius = 14,
}) {
  if (!chunk?.text) return false

  ctx.font = `bold ${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  const lines = wrapText(ctx, chunk.text, w - 48).slice(0, 2)
  const textBlockH = lines.length * lineHeight
  const boxH = Math.max(minHeight, textBlockH + 34)

  roundRect(ctx, x, y, w, boxH, radius)
  ctx.fillStyle = bgColor
  ctx.fill()

  const startY = y + (boxH - textBlockH) / 2 + lineHeight * 0.72
  ctx.fillStyle = textColor
  lines.forEach((line, i) => ctx.fillText(line, x + w / 2, startY + i * lineHeight))

  return true
}
