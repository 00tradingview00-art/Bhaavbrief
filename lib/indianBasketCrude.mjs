/**
 * lib/indianBasketCrude.mjs — PPAC "Indian Basket" crude oil benchmark
 *
 * PPAC publishes this as a periodic report
 * (https://ppac.gov.in/prices/international-prices-of-crude-oil), not a
 * live feed — the page's own "Notes" row states the date the $/bbl figure
 * is as of, typically a few business days behind today (live-checked
 * 24 Nov 2026: the page stated "as on 19.11.2026"). The visible table is
 * empty on a raw HTML fetch; the real data loads via a same-origin POST to
 * AjaxController/getInternationalPricesCrudeOil with form fields
 * {financialYear, reportBy, pageId} read off the page's own
 * <select>/<input> elements — confirmed via a live Chrome network capture,
 * 24 Nov 2026. No auth, cookies, or CAPTCHA needed for this read-only call,
 * despite the page's unrelated sign-in form using one.
 */
import { todayIST } from '../scripts/lib/holidays.js'

const ENDPOINT = 'https://ppac.gov.in/AjaxController/getInternationalPricesCrudeOil'
const REPORT_BY_USD_PER_BBL = '4' // the page's <select id="getReportBy"> has only this one option
const PAGE_ID = '30'              // the page's <input id="page_id"> value

// India's financial year runs 1 April - 31 March. PPAC's own
// <select id="financialYear"> uses this exact "YYYY-YYYY+1" format
// (e.g. "2026-2027") — confirmed against its selected <option>, live.
export function currentIndianFinancialYear(dateStrIST) {
  const [y, m] = dateStrIST.split('-').map(Number)
  return m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

// The one row (position in the response varies — never assume a fixed
// index) whose free-text "Notes" line states the latest daily figure, e.g.:
//   "- Crude Oil Indian Basket as on 19.11.2026 is $90.89/bbl."
//   "- Crude Oil Indian Basket as on 31.03.2026 is $ 124.85/bbl."
// Both forms (with/without a space after "$") were seen live across the
// 2025-2026 and 2026-2027 financial-year reports, 24 Nov 2026 — the regex
// tolerates both rather than assuming the newer form is permanent.
const NOTE_RE = /Indian\s+[Bb]asket.*?as\s+on\s+(\d{2})\.(\d{2})\.(\d{4})\s+is\s+\$\s*([\d.]+)\s*\/?\s*bbl/

export function parseIndianBasketNote(result) {
  if (!result || typeof result !== 'object') return null
  for (const row of Object.values(result)) {
    const title = row?.title
    if (typeof title !== 'string') continue
    const m = title.match(NOTE_RE)
    if (!m) continue
    const [, dd, mm, yyyy, usd] = m
    const usdPerBbl = Number(usd)
    if (!(usdPerBbl > 0)) continue
    return { date: `${yyyy}-${mm}-${dd}`, usdPerBbl }
  }
  return null
}

// Never throws — a parse/network failure here must never block the
// snapshot pipeline (same contract as every other optional-instrument
// fetch in scripts/fetch-snapshot.mjs).
export async function fetchIndianBasketCrude({ dateStrIST = todayIST(), timeoutMs = 9000 } = {}) {
  try {
    const body = new URLSearchParams({
      financialYear: currentIndianFinancialYear(dateStrIST),
      reportBy: REPORT_BY_USD_PER_BBL,
      pageId: PAGE_ID,
    })
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 BhaavBrief/2.0',
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const data = await res.json()
    return parseIndianBasketNote(data?.result)
  } catch {
    return null
  }
}
