/**
 * scripts/lib/upcomingEvents.mjs — the real scheduled events the brief's
 * "Tomorrow:" line may name, taken from data/event-map.json.
 *
 * Without this list the generator had no event dates at all and guessed:
 * the 05 Oct 2026 brief put the CFTC COT report (released Fridays) on
 * "Tuesday", because the prompt forces any day name to be the next trading
 * day. Events whose stored date is already past (a manual-cadence entry not
 * yet refreshed by hand) are left out rather than shown with a wrong date.
 */

import { applyComputedDates } from './eventRules.mjs'

const IST_OFFSET_MS = 330 * 60 * 1000

const istDate = (date) => new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)

// An event later today is written as "today", never by its weekday: the
// publish gate (scripts/lib/weekdayCheck.js) rejects a "Tomorrow:" line
// that names today's own day.
function formatIST(date, now) {
  if (istDate(date) === istDate(now)) {
    return 'today at ' + new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(date) + ' IST'
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date) + ' IST'
}

/**
 * @param {Array<object>} events        data/event-map.json `events`
 * @param {Date} now
 * @param {object|null} instruments     parsed data/kite-instruments.json
 * @param {string} nextTradingDate      YYYY-MM-DD (IST) of the next trading session
 * @param {number} [minCount=3]         always list at least this many upcoming events
 * @returns {Array<{id: string, name: string, whenIST: string, contracts: string[]}>}
 */
export function upcomingEvents(events, now, instruments, nextTradingDate, minCount = 3) {
  // End of the next trading day, IST.
  const windowEnd = new Date(Date.parse(`${nextTradingDate}T23:59:59Z`) - IST_OFFSET_MS)
  const future = applyComputedDates(events, now, instruments)
    .map(e => ({ e, at: new Date(e.next_release_utc) }))
    .filter(({ at }) => !Number.isNaN(at.getTime()) && at > now)
    .sort((a, b) => a.at - b.at)
  // Everything up to the end of the next session, topped up with the
  // nearest later events so the brief always has a real choice.
  const inWindow = future.filter(({ at }) => at <= windowEnd).length
  const chosen = future.slice(0, Math.max(inWindow, minCount))
  return chosen.map(({ e, at }) => ({
    id: e.id,
    name: e.name,
    whenIST: formatIST(at, now),
    contracts: e.affected_contracts ?? [],
  }))
}

export function formatUpcomingEventsBlock(list) {
  if (list.length === 0) return '(no scheduled events found in the calendar)'
  return list.map(ev => `- ${ev.name} — ${ev.whenIST} (affects: ${ev.contracts.join(', ') || 'n/a'})`).join('\n')
}
