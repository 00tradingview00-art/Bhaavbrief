/**
 * scripts/lib/eventRules.mjs — computed release dates for data/event-map.json.
 *
 * Plain .mjs so both scripts/refresh-event-calendar.mjs (persists the file)
 * and lib/eventMap.ts (applies the same rules at read time) use one copy.
 *
 * - rule_based events (EIA, API, Baker Hughes, CFTC, NOAA) recur on a fixed
 *   weekday (or daily) and time. They were rolled forward only by the weekly Monday refresh,
 *   so each one sat in the past — invisible on /calendar — for most of the
 *   week after it fired. Applied at read time they are always upcoming.
 * - US/Eastern-anchored releases (EIA, API) are defined in hourEt/minEt, not
 *   a fixed hourUtc — EIA's own schedule is "10:30 ET" year-round, which is
 *   14:30 UTC under EDT and 15:30 UTC under EST. A fixed UTC hour here was
 *   the same bug mcxHours.js's header comment already documents being fixed
 *   for MCX's own session close: correct for ~8 months a year, an hour
 *   early the rest (roughly November to March). See isUsDst in mcxHours.js.
 * - mcx_expiry events take their date from data/kite-instruments.json, which
 *   the 08:45 IST rollover (kite-morning-auth.yml) keeps on the live
 *   front-month contract. They were hand-maintained and had all gone stale
 *   (Jul–Sep dates on 30 Sep, e.g. Gold's 5 Oct expiry was missing).
 * - manual events are left alone (irregular official schedules).
 * - EIA holiday weeks: RULES above is the *regular* weekday/time and has no
 *   concept of a US federal holiday — EIA shifts both the day and the time
 *   on those weeks (direction varies per holiday, e.g. Thanksgiving week's
 *   natural-gas report moves earlier, Wed instead of Thu; Veterans Day
 *   week's petroleum report moved later, Thu instead of Wed), so there is no
 *   formula to derive it from. HOLIDAY_OVERRIDES below is a short, dated
 *   list sourced each year from EIA's own published exception calendars
 *   (ir.eia.gov/ngs/schedule.html, eia.gov/petroleum/supply/weekly/schedule.php)
 *   — a human has to refresh it; nothing here infers it automatically.
 */

import { isUsDst } from './mcxHours.js'

// Weekday + time per rule_based event id. dow: 0=Sun..6=Sat; omit dow for a
// release that comes out every day. US/Eastern-anchored releases use
// hourEt/minEt (DST-resolved below); everything else uses a fixed hourUtc.
export const RULES = {
  eia_natural_gas_storage:     { dow: 4, hourEt: 10, minEt: 30 }, // Thu, 10:30 ET
  eia_petroleum_status_report: { dow: 3, hourEt: 10, minEt: 30 }, // Wed, 10:30 ET
  api_crude_inventories:       { dow: 2, hourEt: 16, minEt: 30 }, // Tue, 4:30 PM ET
  baker_hughes_rig_count:      { dow: 5, hourUtc: 17, minUtc: 0 },  // Fri
  cftc_cot_report:             { dow: 5, hourUtc: 19, minUtc: 30 }, // Fri
  // CPC 6-10/8-14 day outlooks: daily, 3–4pm ET (20:00 UTC is inside that
  // window in both EDT and EST).
  noaa_weather_outlook:        { hourUtc: 20, minUtc: 0 },
}

// Dated exceptions for US-federal-holiday weeks, per rule_based event id.
// `replaces` is the date RULES above would otherwise produce for that week
// (in the event's own US/Eastern calendar date); when the regularly-computed
// occurrence lands on that date, this override's date/time is used instead.
// Entries whose `replaces` date has already passed are harmless dead weight
// (they can never match a future computed occurrence) — prune periodically.
export const HOLIDAY_OVERRIDES = {
  eia_natural_gas_storage: [
    // Thanksgiving week: usual Thu 10:30 ET → Wed 25 Nov, 12:00 ET.
    { replaces: '2026-11-26', dateEt: '2026-11-25', hourEt: 12, minEt: 0 },
  ],
  eia_petroleum_status_report: [
    // Veterans Day week (observed Wed 11 Nov 2026): usual Wed 10:30 ET → Thu 12 Nov, 12:00 ET.
    { replaces: '2026-11-11', dateEt: '2026-11-12', hourEt: 12, minEt: 0 },
  ],
}

/** US/Eastern wall-clock hour → UTC hour, for the US-DST status of `dateStr` (YYYY-MM-DD). */
function etHourToUtc(hourEt, dateStr) {
  return hourEt + (isUsDst(dateStr) ? 4 : 5) // EDT = UTC-4, EST = UTC-5
}

/** Next instant after `fromUtc` on weekday `dow` (any day if undefined) at hh:mm UTC. */
export function nextOccurrence(fromUtc, dow, hourUtc, minUtc) {
  const d = new Date(fromUtc)
  d.setUTCHours(hourUtc, minUtc, 0, 0)
  let diff = dow === undefined ? 0 : (dow - d.getUTCDay() + 7) % 7
  if (diff === 0 && d.getTime() <= fromUtc.getTime()) diff = dow === undefined ? 1 : 7
  d.setUTCDate(d.getUTCDate() + diff)
  return d
}

/**
 * Like nextOccurrence, but for a US/Eastern wall-clock rule (hourEt/minEt).
 * Two-pass: guess the UTC hour from `fromUtc`'s own DST status, find the
 * candidate date, then re-resolve DST from that candidate date itself and
 * redo the lookup if it disagrees — the one week a year the two can differ
 * is the DST-changeover week, always a Sunday, never the event's own
 * weekday, but cheap enough to just always double-check.
 */
export function nextOccurrenceEastern(fromUtc, dow, hourEt, minEt) {
  const guessHourUtc = etHourToUtc(hourEt, fromUtc.toISOString().slice(0, 10))
  const next = nextOccurrence(fromUtc, dow, guessHourUtc, minEt)
  const actualHourUtc = etHourToUtc(hourEt, next.toISOString().slice(0, 10))
  return actualHourUtc === guessHourUtc ? next : nextOccurrence(fromUtc, dow, actualHourUtc, minEt)
}

/**
 * Swaps in a HOLIDAY_OVERRIDES entry when `computedNext` (a regular-rule
 * occurrence) lands on a date that entry says to replace. Otherwise returns
 * `computedNext` unchanged.
 */
function applyHolidayOverride(eventId, computedNext) {
  const override = HOLIDAY_OVERRIDES[eventId]?.find(
    (o) => o.replaces === computedNext.toISOString().slice(0, 10)
  )
  if (!override) return computedNext
  const d = new Date(`${override.dateEt}T00:00:00.000Z`)
  d.setUTCHours(etHourToUtc(override.hourEt, override.dateEt), override.minEt, 0, 0)
  return d
}

// mcx_expiry event id → key in data/kite-instruments.json
const EXPIRY_INSTRUMENT = {
  mcx_expiry_gold: 'gold', mcx_expiry_silver: 'silver', mcx_expiry_crude: 'crude',
  mcx_expiry_copper: 'copper', mcx_expiry_natgas: 'natgas', mcx_expiry_zinc: 'zinc',
  mcx_expiry_lead: 'lead', mcx_expiry_aluminium: 'aluminium', mcx_expiry_nickel: 'nickel',
}

/**
 * Returns a copy of `events` with computed dates applied. Pure.
 * @param {Array<{id: string, cadence_type: string, next_release_utc: string}>} events
 * @param {Date} now
 * @param {Record<string, {expiry?: string}> | null} instruments  parsed kite-instruments.json
 */
export function applyComputedDates(events, now, instruments) {
  return events.map((event) => {
    if (event.cadence_type === 'rule_based') {
      const rule = RULES[event.id]
      if (!rule || new Date(event.next_release_utc).getTime() > now.getTime()) return event
      const next = 'hourEt' in rule
        ? applyHolidayOverride(event.id, nextOccurrenceEastern(now, rule.dow, rule.hourEt, rule.minEt))
        : nextOccurrence(now, rule.dow, rule.hourUtc, rule.minUtc)
      return { ...event, next_release_utc: next.toISOString() }
    }
    if (event.cadence_type === 'mcx_expiry') {
      const expiry = instruments?.[EXPIRY_INSTRUMENT[event.id]]?.expiry
      if (!expiry || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return event
      // Keep the event's own time of day (the session close it describes).
      const time = String(event.next_release_utc).slice(10) || 'T17:55:00Z'
      return { ...event, next_release_utc: `${expiry}${time}` }
    }
    return event
  })
}
