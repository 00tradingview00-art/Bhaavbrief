/**
 * scripts/lib/weekdayCheck.js — D-08 weekday-consistency check, extracted
 * from validate-brief.mjs so it's a testable pure function instead of inline
 * script logic (see scripts/lib/weekdayCheck.test.mjs).
 *
 * Catches a brief's "Tomorrow:" line naming today's own weekday for the
 * upcoming session (e.g. a Friday brief saying "scheduled across Friday's
 * global session") — confirmed live in production (editions #57 and #66)
 * before this check existed.
 */

import { isTradingHoliday } from "./holidays.js";

/**
 * @param {string} briefBody - the brief content (frontmatter already stripped)
 * @param {string} generatedAtISO - snapshot.generatedAt, an ISO timestamp
 * @returns {string[]} issue messages, empty if the brief is clean
 */
export function checkWeekday(briefBody, generatedAtISO) {
  const issues = [];

  const snapshotDateIST = new Date(new Date(generatedAtISO).getTime() + 5.5 * 3600000)
    .toISOString().slice(0, 10);
  let nextTradingDateStr = snapshotDateIST;
  do {
    nextTradingDateStr = new Date(
      new Date(nextTradingDateStr + "T00:00:00Z").getTime() + 86400000
    ).toISOString().slice(0, 10);
  } while (isTradingHoliday(nextTradingDateStr));
  const correctNextDayName = new Date(nextTradingDateStr + "T00:00:00Z")
    .toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" });
  const todayDayName = new Date(snapshotDateIST + "T00:00:00Z")
    .toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" });

  const tomorrowMatch = briefBody.match(/\*\*Tomorrow:\*\*([^\n]*)/i);
  if (tomorrowMatch) {
    // Only check the event/timing clause (before the first em-dash) — the
    // template's structure is "Tomorrow: [event, time] — [condition]; [condition]",
    // and everything after the dash is a conditional/consequence clause that
    // routinely contains backward-looking day references (e.g. "challenges the
    // entire basis of Friday's move", describing a PAST session) which are never
    // a claim about the next session and must not be flagged.
    const eventClause = tomorrowMatch[1].split("—")[0];
    const DAY_RE = /\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/g;
    for (const m of eventClause.matchAll(DAY_RE)) {
      const day = m[1];
      // Deliberately narrow to the one audit-confirmed, high-precision bug class:
      // today's own day name used for the upcoming session. A broader "any day
      // that isn't the correct next trading day" check was tried and produced a
      // real false positive in verification (a brief legitimately referencing a
      // past Friday's move) — precision matters more than recall on a check that
      // blocks publication.
      if (day !== todayDayName) continue;
      // "Tuesday evening"-style mentions are a legitimate same-day-later
      // reference — US session hours land within the same IST calendar day the
      // morning brief publishes — not the bug. Only flag when NOT followed by
      // such a qualifier.
      const after = eventClause.slice(m.index + m[0].length, m.index + m[0].length + 15);
      if (/^\s*(evening|night|tonight)/i.test(after)) continue;
      issues.push(
        `WEEKDAY: "Tomorrow:" line names "${day}" — that is TODAY's day, not the next session (should be "${correctNextDayName}")`
      );
    }
  }

  return issues;
}
