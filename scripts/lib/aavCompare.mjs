/**
 * scripts/lib/aavCompare.mjs — pure helpers for scripts/validate-aav-vs-official.mjs.
 *
 * Parses an official AAV export (an HTML <table> saved with an .xls extension:
 * Commodity | Trading Date | 5-Day | 10-Day | 20-Day | 40-Day | 60-Day) and
 * diffs it against the AAV windows our own /api/options route returns.
 *
 * The official file is a local reference only. It is never committed and never
 * displayed on the site (the exchange's terms forbid republishing its data), so
 * nothing in here writes it anywhere.
 */

export const WINDOWS = ['5d', '10d', '20d', '40d', '60d']

const HEADER = ['Commodity', 'Trading Date', '5-Day', '10-Day', '20-Day', '40-Day', '60-Day']

function cellText(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()
}

/**
 * @param {string} html  contents of the official AAV export
 * @returns {{ date: string, byCommodity: Record<string, Record<string, number>> }}
 *   `date` is the single trading date in ISO form (YYYY-MM-DD).
 * @throws if the header differs, a value is not numeric, or more than one date is present.
 */
export function parseOfficialAav(html) {
  const rows = []
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let tr
  while ((tr = trRe.exec(html))) {
    const cells = []
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    let td
    while ((td = tdRe.exec(tr[1]))) cells.push(cellText(td[1]))
    if (cells.length) rows.push(cells)
  }
  if (rows.length < 2) throw new Error('No data rows found in AAV file')
  if (HEADER.some((h, i) => rows[0][i] !== h)) {
    throw new Error(`Unexpected AAV header: ${rows[0].join(' | ')}`)
  }

  const dates = new Set()
  const byCommodity = {}
  for (const r of rows.slice(1)) {
    if (r.length < HEADER.length) throw new Error(`Short AAV row: ${r.join(' | ')}`)
    dates.add(toIsoDate(r[1]))
    const vals = {}
    WINDOWS.forEach((w, i) => {
      const n = Number(r[2 + i])
      if (!Number.isFinite(n)) throw new Error(`Non-numeric ${w} value for ${r[0]}: "${r[2 + i]}"`)
      vals[w] = n
    })
    byCommodity[r[0]] = vals
  }
  if (dates.size !== 1) {
    throw new Error(`Expected a single trading date, found ${dates.size}: ${[...dates].join(', ')}`)
  }
  return { date: [...dates][0], byCommodity }
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** '18 Sep 2026' -> '2026-09-18' */
export function toIsoDate(s) {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(s.trim())
  const mi = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1
  if (!m || mi < 0) throw new Error(`Unrecognised date: "${s}"`)
  return `${m[3]}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/**
 * @param {Record<string, number | null>} ours      AAV windows from our API
 * @param {Record<string, number>}        official  AAV windows from the official file
 * @returns {Record<string, { ours: number | null, official: number, diff: number | null }>}
 */
export function diffAav(ours, official) {
  const out = {}
  for (const w of WINDOWS) {
    const o = ours?.[w]
    const off = official[w]
    out[w] = {
      ours: o ?? null,
      official: off,
      diff: o == null ? null : Math.round((o - off) * 100) / 100,
    }
  }
  return out
}

/** Largest absolute diff across the windows we could compare; null if none. */
export function maxAbsDiff(diffs) {
  const vals = Object.values(diffs).map(d => d.diff).filter(d => d != null)
  return vals.length ? Math.max(...vals.map(Math.abs)) : null
}
