import { describe, test, expect } from "vitest";
import { checkWeekday } from "./weekdayCheck.js";

// Regression tests for D-08. The first three cases are drawn directly from
// real production content found during the 2026-07-17 audit and the
// follow-up archive-wide scan: editions #66 and #57 both shipped with this
// bug live, and #58/#64 were initially-flagged false positives that forced
// the check to be narrowed (see checkWeekday's own comments for why).

describe("checkWeekday", () => {
  test("edition #66 class of bug: Friday brief naming Friday as the next session", () => {
    const brief =
      "**Tomorrow:** US Federal Reserve (FOMC) officials are scheduled to speak across Friday's global session, with any commentary on rate trajectory expected by evening IST — if language leans toward rates staying higher for longer, gold's run toward $4,000 faces a real-yield headwind.";
    const issues = checkWeekday(brief, "2026-07-17T04:03:23.646Z"); // a Friday
    expect(issues.length).toBe(1);
    expect(issues[0]).toContain('names "Friday"');
    expect(issues[0]).toContain('should be "Monday"');
  });

  test("edition #66 corrected text is clean", () => {
    const brief =
      "**Tomorrow:** US Federal Reserve (FOMC) officials are scheduled to speak across the next global session, with any commentary on rate trajectory expected by evening IST.";
    expect(checkWeekday(brief, "2026-07-17T04:03:23.646Z")).toEqual([]);
  });

  test("edition #58 false-positive class: a backward-looking reference after the em-dash is not flagged", () => {
    const brief =
      "**Tomorrow:** US Federal Reserve communications or any scheduled FOMC member speech in the next 24 hours — a tone that emphasises sticky inflation and caution on cuts challenges the entire basis of Friday's move.";
    // Published on a Monday — "Friday's move" refers to the PRIOR Friday, not tomorrow.
    expect(checkWeekday(brief, "2026-07-06T04:00:00.000Z")).toEqual([]);
  });

  test("edition #64 false-positive class: 'Tuesday evening' on a Tuesday brief is a same-day reference, not the bug", () => {
    const brief =
      "**Tomorrow:** US Federal Reserve's rate committee (FOMC) meeting minutes and any Fed speaker remarks expected in the US session Tuesday evening, around 11:30 PM IST — if the commentary signals rates staying higher for longer, dollar strength extends.";
    expect(checkWeekday(brief, "2026-07-14T04:00:00.000Z")).toEqual([]); // published on a Tuesday
  });

  test("no Tomorrow line at all -> no issues", () => {
    expect(checkWeekday("Just some brief text with no Tomorrow section.", "2026-07-17T04:00:00.000Z")).toEqual([]);
  });

  test("next trading day correctly skips a weekend (Friday brief -> Monday, not Saturday)", () => {
    const brief = "**Tomorrow:** Some event — condition A; condition B.";
    // No day name mentioned at all, so this should be clean regardless —
    // this case exists to document the walk-forward-past-weekend behavior
    // indirectly via the "should be X" wording in the Friday-bug case above.
    expect(checkWeekday(brief, "2026-07-17T04:00:00.000Z")).toEqual([]);
  });
});
