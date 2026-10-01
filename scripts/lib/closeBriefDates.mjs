/**
 * Date handling for the evening MCX close brief (scripts/evening-close-brief.js).
 *
 * Everything is keyed by the trading SESSION the brief reports on
 * (scripts/lib/mcxSession.js tradingSessionDate), never the clock at run
 * time. GitHub runs the 21:00 IST schedule hours late, often after midnight,
 * and the script mixed a UTC filename date, an IST duplicate check and a
 * Claude-written slug date — producing "…-29-mcx-close-30sep2026…" names,
 * duplicate briefs for one session and Friday sessions skipped as Saturday.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const IST_OFFSET_MS = 5.5 * 3600 * 1000

/** "2026-09-29" → "29sep2026" (the slug's date token). */
export function slugDateToken(session) {
  const [y, m, d] = session.split('-')
  return `${d}${MONTHS[Number(m) - 1]}${y}`
}

/**
 * Final file slug: session-date prefix + Claude's slug with its date token
 * forced to the session (Claude sometimes derives it from the wall clock).
 */
export function closeBriefSlug(rawSlug, session) {
  const token = slugDateToken(session)
  const fixed = (rawSlug || `mcx-close-${token}`).replace(/mcx-close-\d{1,2}[a-z]{3}\d{4}/i, `mcx-close-${token}`)
  return `${session}-${fixed}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80)
}

/** Human date for the prompt, e.g. "Tuesday, 29 September 2026". */
export function sessionDisplayDate(session) {
  return new Date(`${session}T12:00:00+05:30`).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
}

/**
 * Canonical `date` frontmatter: midnight IST on the session date, so the
 * article groups under that day and sorts below its intraday flashes.
 */
export function sessionAnchorISO(session) {
  return new Date(`${session}T00:00:00+05:30`).toISOString()
}

/**
 * Whether a run at `now` may publish a close brief: 21:00 IST through 06:00
 * IST the next morning. The upper bound was 02:00, which dropped the brief
 * whenever GitHub's schedule ran more than ~5 hours late.
 */
export function isInEveningWindow(now = new Date()) {
  const hour = new Date(now.getTime() + IST_OFFSET_MS).getUTCHours()
  return hour >= 21 || hour < 6
}
