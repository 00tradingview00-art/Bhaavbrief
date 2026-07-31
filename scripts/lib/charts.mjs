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
 */

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
  iconSize = 36, maxIcons = 20, gap = 12,
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

  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx  = startX + col * (diameter + gap) + diameter / 2
    const cy  = y + row * (diameter + gap * 0.6) + diameter / 2
    const isFilled = i < filled
    ctx.beginPath()
    ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2)
    if (isFilled) {
      ctx.fillStyle = filledColor
      ctx.fill()
    } else {
      ctx.strokeStyle = emptyColor
      ctx.lineWidth   = Math.max(1.5, diameter * 0.08)
      ctx.stroke()
    }
  }

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
  mutedColor, textColor, barHeight = 72, labelGap = 14,
}) {
  if (!Array.isArray(bars) || bars.length < 2 || bars.length > 4) return false
  const magnitudes = bars.map(b => Number.isFinite(b?.value) ? Math.abs(b.value - baseline) : 0)
  const maxMag = Math.max(...magnitudes)
  if (!(maxMag > 0)) return false

  const rowGap = Math.max(20, (h - bars.length * barHeight) / Math.max(1, bars.length - 1))
  const maxBarW = w * 0.92

  bars.forEach((bar, i) => {
    const rowY = y + i * (barHeight + rowGap)
    const mag  = magnitudes[i]
    const barW = Math.max(mag > 0 ? 8 : 0, (mag / maxMag) * maxBarW)
    const color = bar.emphasis ? bar.color : (mutedColor ?? bar.color)

    // Label above the bar
    ctx.fillStyle = textColor
    ctx.font      = '20px "NotoSans", "Inter", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(bar.label ?? '', x, rowY - labelGap)

    // Bar itself
    roundRect(ctx, x, rowY, Math.max(2, barW), barHeight, 8)
    ctx.fillStyle = color
    ctx.fill()

    // Value at the bar's tip — inside if there's room, else just outside
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
  upColor, downColor, lineWidth = 3, showArea = true, showDot = true,
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

  if (showArea) {
    ctx.beginPath()
    ctx.moveTo(points[0].px, y + h)
    for (const p of points) ctx.lineTo(p.px, p.py)
    ctx.lineTo(points[points.length - 1].px, y + h)
    ctx.closePath()
    const gradient = ctx.createLinearGradient(0, y, 0, y + h)
    gradient.addColorStop(0, `${color}33`) // ~20% alpha wash at top
    gradient.addColorStop(1, `${color}00`) // transparent at bottom
    ctx.fillStyle = gradient
    ctx.fill()
  }

  ctx.beginPath()
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py)))
  ctx.strokeStyle = color
  ctx.lineWidth   = lineWidth
  ctx.lineJoin    = 'round'
  ctx.lineCap     = 'round'
  ctx.stroke()

  if (showDot) {
    const last = points[points.length - 1]
    ctx.beginPath()
    ctx.arc(last.px, last.py, lineWidth * 1.8, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }

  return true
}
