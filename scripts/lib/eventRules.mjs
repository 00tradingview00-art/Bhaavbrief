/**
 * scripts/lib/eventRules.mjs — computed release dates for data/event-map.json.
 *
 * Plain .mjs so both scripts/refresh-event-calendar.mjs (persists the file)
 * and lib/eventMap.ts (applies the same rules at read time) use one copy.
 *
 * - rule_based events (EIA, API, Baker Hughes, CFTC) recur on a fixed weekday
 *   and UTC time. They were rolled forward only by the weekly Monday refresh,
 *   so each one sat in the past — invisible on /calendar — for most of the
 *   week after it fired. Applied at read time they are always upcoming.
 * - mcx_expiry events take their date from data/kite-instruments.json, which
 *   the 08:45 IST rollover (kite-morning-auth.yml) keeps on the live
 *   front-month contract. They were hand-maintained and had all gone stale
 *   (Jul–Sep dates on 30 Sep, e.g. Gold's 5 Oct expiry was missing).
 * - manual events are left alone (irregular official schedules).
 */

// Weekday + UTC time per rule_based event id. dow: 0=Sun..6=Sat.
export const RULES = {
  eia_natural_gas_storage:     { dow: 4, hourUtc: 14, minUtc: 30 }, // Thu
  eia_petroleum_status_report: { dow: 3, hourUtc: 14, minUtc: 30 }, // Wed
  api_crude_inventories:       { dow: 2, hourUtc: 20, minUtc: 30 }, // Tue
  baker_hughes_rig_count:      { dow: 5, hourUtc: 17, minUtc: 0 },  // Fri
  cftc_cot_report:             { dow: 5, hourUtc: 19, minUtc: 30 }, // Fri
}

/** Next instant after `fromUtc` on weekday `dow` at hh:mm UTC. */
export function nextOccurrence(fromUtc, dow, hourUtc, minUtc) {
  const d = new Date(fromUtc)
  d.setUTCHours(hourUtc, minUtc, 0, 0)
  let diff = (dow - d.getUTCDay() + 7) % 7
  if (diff === 0 && d.getTime() <= fromUtc.getTime()) diff = 7
  d.setUTCDate(d.getUTCDate() + diff)
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
      const next = nextOccurrence(now, rule.dow, rule.hourUtc, rule.minUtc)
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
