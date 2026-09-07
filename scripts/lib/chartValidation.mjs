/**
 * scripts/lib/chartValidation.mjs — deterministic guard on the
 * `beat1_chart`/`beat2_chart`/`beat3_chart` fields Haiku emits alongside
 * reel copy (scripts/generate-brief-reel.mjs's extractReelCopy/
 * extractNewsReelCopy), before that data is trusted to render via
 * scripts/lib/charts.mjs. One chart per beat, each validated independently —
 * earlier versions of this schema had a single `chart: {type, beat}` field
 * covering the whole reel, so at most one of the three beats ever got a
 * chart at all.
 *
 * This codebase has already learned, repeatedly (scripts/lib/claimsCheck.mjs,
 * scripts/lib/staleInstrumentCheck.mjs, scripts/lib/semanticDemote.mjs, the
 * two-layer publish gate in validate-brief.mjs), that a prompt instruction
 * alone doesn't reliably stop an LLM from stating a wrong or malformed
 * number. The same discipline applies to chart data: validateChart() checks
 * structural sanity, then checks the numbers actually trace back to the
 * source material, before letting anything render. A chart that fails
 * either check is demoted to { type: 'none' } — the caller falls back to
 * plain-text rendering — never rendered wrong, never thrown.
 *
 * Unlike claimsCheck.mjs's exact-value ledger match, this uses a range-aware
 * plausibility check: Haiku is explicitly instructed to pick ONE concrete
 * value out of a stated range (e.g. "14-20x leverage" -> 17), so requiring
 * an exact substring/value match would wrongly reject every legitimate
 * range-derived pick. A value is accepted if it falls inside any numeric
 * range mentioned in the source text, or within a small tolerance of any
 * single number mentioned in the source text or the day's snapshot.
 *
 * deriveSnapshotChart() is the non-LLM safety net: a plain "Today vs
 * Yesterday" comparison built straight from the snapshot, for beats where
 * Haiku genuinely found no comparable pair worth charting.
 */

const NUMBER_RE = /([\d,]+(?:\.\d+)?)/g
const RANGE_RE  = /([\d,]+(?:\.\d+)?)\s*[–-]\s*([\d,]+(?:\.\d+)?)/g

function parseNum(str) {
  const n = parseFloat(String(str).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * Extracts every number mentioned in free text, plus any "A-B"/"A–B" ranges
 * as {min,max} pairs.
 * @param {string} text
 * @returns {{ ranges: Array<{min:number,max:number}>, singles: number[] }}
 */
function extractNumbersAndRanges(text) {
  const ranges = []
  const singles = []
  const rangeSpans = [] // [start,end) of matched range text, so the plain-number pass below doesn't double-count each range's endpoints

  let m
  RANGE_RE.lastIndex = 0
  while ((m = RANGE_RE.exec(text))) {
    const a = parseNum(m[1]), b = parseNum(m[2])
    if (a != null && b != null) {
      ranges.push({ min: Math.min(a, b), max: Math.max(a, b) })
      rangeSpans.push([m.index, m.index + m[0].length])
    }
  }

  NUMBER_RE.lastIndex = 0
  let n
  while ((n = NUMBER_RE.exec(text))) {
    const insideRange = rangeSpans.some(([s, e]) => n.index >= s && n.index < e)
    if (insideRange) continue
    const v = parseNum(n[1])
    if (v != null) singles.push(v)
  }

  return { ranges, singles }
}

/** Recursively collects every finite numeric leaf value from an object (e.g. a market snapshot). */
function flattenNumbers(obj, out = []) {
  if (obj == null) return out
  if (typeof obj === 'number' && Number.isFinite(obj)) { out.push(obj); return out }
  if (typeof obj === 'object') {
    for (const v of Object.values(obj)) flattenNumbers(v, out)
  }
  return out
}

/**
 * @param {number} value
 * @param {{ ranges: Array<{min:number,max:number}>, singles: number[] }} pool
 * @param {number} tolerancePct - relative tolerance for matching a single number (not a range)
 */
function isPlausible(value, pool, tolerancePct = 0.08) {
  if (!Number.isFinite(value)) return false
  for (const r of pool.ranges) {
    if (value >= r.min - 1e-6 && value <= r.max + 1e-6) return true
  }
  for (const s of pool.singles) {
    const tol = Math.max(1, Math.abs(s) * tolerancePct)
    if (Math.abs(value - s) <= tol) return true
  }
  return false
}

function isValidIconArray(ia) {
  return !!ia
    && Number.isInteger(ia.total) && ia.total > 0 && ia.total <= 20
    && Number.isInteger(ia.filled) && ia.filled >= 0 && ia.filled <= ia.total
}

function isValidTwoBar(tb) {
  return !!tb
    && typeof tb.labelA === 'string' && tb.labelA.trim().length > 0
    && typeof tb.labelB === 'string' && tb.labelB.trim().length > 0
    && Number.isFinite(tb.valueA) && Number.isFinite(tb.valueB)
}

/**
 * @param {{ type: 'icon_array'|'two_bar'|'none', beat?: number, icon_array?: object, two_bar?: object }} chart
 * @param {{ facts?: string[], snapshot?: object }} source
 * @returns {object} the original chart if it passes both checks, otherwise { type: 'none' }
 */
export function validateChart(chart, { facts = [], snapshot = null } = {}) {
  if (!chart || typeof chart !== 'object') return { type: 'none' }
  if (chart.type === 'none') return { type: 'none' }
  if (chart.type !== 'icon_array' && chart.type !== 'two_bar') return { type: 'none' }

  const pool = extractNumbersAndRanges(Array.isArray(facts) ? facts.join(' \n ') : '')
  if (snapshot) pool.singles.push(...flattenNumbers(snapshot))

  if (chart.type === 'icon_array') {
    if (!isValidIconArray(chart.icon_array)) return { type: 'none' }
    const { filled, total } = chart.icon_array
    if (!isPlausible(filled, pool) || !isPlausible(total, pool)) return { type: 'none' }
    return chart
  }

  // two_bar
  if (!isValidTwoBar(chart.two_bar)) return { type: 'none' }
  const { valueA, valueB } = chart.two_bar
  if (!isPlausible(valueA, pool) || !isPlausible(valueB, pool)) return { type: 'none' }
  return chart
}

/**
 * Validates one chart per beat (each independently — a beat's chart is only
 * ever demoted to `{type:'none'}` on its own merits, never because a
 * sibling beat's chart failed). Replaces the old single-chart-per-reel
 * `chart: {type, beat}` schema, where only one of the three beats could
 * ever carry a chart.
 * @param {{beat1_chart?: object, beat2_chart?: object, beat3_chart?: object}} charts
 * @param {{ facts?: string[], snapshot?: object }} source
 */
export function validateBeatCharts({ beat1_chart, beat2_chart, beat3_chart } = {}, source) {
  return {
    beat1_chart: validateChart(beat1_chart, source),
    beat2_chart: validateChart(beat2_chart, source),
    beat3_chart: validateChart(beat3_chart, source),
  }
}

/**
 * Builds a "Today vs Yesterday" two_bar chart directly from the day's
 * already-fetched price snapshot — no LLM involved, so it carries zero
 * hallucination risk. Used as a safety net when Haiku legitimately found no
 * comparable pair for a beat (validateChart demoted it to `{type:'none'}`),
 * so a reel is never left with every beat showing plain text.
 * @returns {object} a two_bar chart, or {type:'none'} if the snapshot lacks
 *   a finite price/prevClose pair for this instrument, or they're equal
 *   (nothing to compare).
 */
export function deriveSnapshotChart(snapshot, instrumentKey, unit = '₹') {
  const instr = snapshot?.instruments?.[instrumentKey]
  const price = instr?.price
  const prevClose = instr?.prevClose
  if (!Number.isFinite(price) || !Number.isFinite(prevClose) || price === prevClose) return { type: 'none' }
  return {
    type: 'two_bar',
    two_bar: { labelA: 'Today', valueA: price, labelB: 'Yesterday', valueB: prevClose, unit },
  }
}
