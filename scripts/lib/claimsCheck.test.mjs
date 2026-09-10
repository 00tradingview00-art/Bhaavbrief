import { describe, test, expect } from "vitest";
import { checkClaims } from "./claimsCheck.mjs";

const REAL_LEDGER = [
  { claim_id: "eia_natural_gas_storage__natgas", values: { avgAbsMovePct: 2.34, maxAbsMovePct: 5.56 } },
  { claim_id: "eia_petroleum_status_report__crude", values: { avgAbsMovePct: 3.83, maxAbsMovePct: 16.95 } },
  { claim_id: "api_crude_inventories__crude", values: { avgAbsMovePct: 3.5, maxAbsMovePct: 15.56 } },
  { claim_id: "cftc_cot_report__gold", values: { avgAbsMovePct: 1.54, maxAbsMovePct: 11.66 } },
  { claim_id: "cftc_cot_report__copper", values: { avgAbsMovePct: 1.19, maxAbsMovePct: 4.98 } },
];

describe("checkClaims — regression tests for the numeric-coincidence false negative", () => {
  test("edition #66's real fabricated claims are both caught", () => {
    const brief =
      "In past instances, Brent has fallen 3-5% within 24 hours of such announcements, and MCX gold has typically given back 1-2% as the safe-haven demand component unwinds alongside it.";
    const issues = checkClaims(brief, REAL_LEDGER);
    expect(issues.length).toBe(2);
    expect(issues[0]).toContain("5%");
    expect(issues[1]).toContain("2%");
  });

  test("the exact false negative found during verification: a fabricated crude '5%' must not match an unrelated copper claim (4.98) just because both are close in magnitude", () => {
    // Before the commodity-context requirement was added, this passed
    // (incorrectly) because cftc_cot_report__copper's maxAbsMovePct (4.98) is
    // within 0.05 of the fabricated 5 — even though the sentence never
    // mentions copper.
    const brief = "In past instances, Brent has fallen 3-5% within a week.";
    const issues = checkClaims(brief, REAL_LEDGER);
    expect(issues.length).toBe(1);
  });

  test("a real ledger-backed natgas claim is not flagged", () => {
    const brief = "EIA Natural Gas Storage Report releases have historically moved MCX Natural Gas by an average of 2.34% in the following session.";
    expect(checkClaims(brief, REAL_LEDGER)).toEqual([]);
  });

  test("a real ledger-backed copper claim (the same 4.98 value) is not flagged when copper is actually mentioned", () => {
    const brief = "CFTC positioning reports have historically moved MCX Copper by up to 4.98% in the following session.";
    expect(checkClaims(brief, REAL_LEDGER)).toEqual([]);
  });

  test("no historical-phrase trigger word, no check fires even with a % present", () => {
    const brief = "MCX Gold is trading 13.46% above import parity today.";
    expect(checkClaims(brief, REAL_LEDGER)).toEqual([]);
  });

  test("empty ledger correctly fails closed on any historical % claim", () => {
    const brief = "Gold has historically risen 5% in similar episodes.";
    const issues = checkClaims(brief, []);
    expect(issues.length).toBe(1);
  });
});

describe("checkClaims — widened trigger phrases (Codex/Deep-Research backstop)", () => {
  test("a fabricated stat using a trigger word outside the original four is still caught", () => {
    const brief = "Silver tends to fall 6% in the week after such an announcement.";
    const issues = checkClaims(brief, REAL_LEDGER);
    expect(issues.length).toBe(1);
    expect(issues[0]).toContain("6%");
  });

  test("'seasonally' is also recognized as a historical-claim trigger", () => {
    expect(checkClaims("Crude seasonally drops 9% into year-end.", REAL_LEDGER).length).toBe(1);
  });

  test("'data shows'/'records show' deliberately NOT treated as triggers — too often just live-data narration, not a historical claim (verified against real published content)", () => {
    expect(checkClaims("Data shows gold rallying 8% today on safe-haven demand.", REAL_LEDGER)).toEqual([]);
  });

  test("'often' requires a word boundary — must not match inside 'softened'/'softening'", () => {
    expect(checkClaims("Silver softened 2% in early trade on profit-taking.", REAL_LEDGER)).toEqual([]);
  });

  test("the search window stops at an em dash so an unrelated live figure in an aside isn't misattributed", () => {
    const brief = "Gold historically stays resilient — the COMEX crude gain of 4.17% is separate.";
    expect(checkClaims(brief, REAL_LEDGER)).toEqual([]);
  });

  test("a real ledger-backed claim using a widened trigger phrase is not flagged", () => {
    const brief = "CFTC positioning reports often move MCX Copper by up to 4.98% in the following session.";
    expect(checkClaims(brief, REAL_LEDGER)).toEqual([]);
  });

  test("an unledgered stat marked '(analysis)' right after the sentence is excused", () => {
    const brief = "Silver tends to fall 6% in the week after such an announcement. *(analysis)*";
    expect(checkClaims(brief, REAL_LEDGER)).toEqual([]);
  });

  test("an unledgered stat marked with an <!-- analysis --> comment is excused", () => {
    const brief = "Gold usually gives back 3% into the close on these days. <!-- analysis -->";
    expect(checkClaims(brief, REAL_LEDGER)).toEqual([]);
  });

  test("the analysis marker does not excuse an unrelated claim later in the text", () => {
    const brief =
      "Gold usually gives back 3% into the close on these days. *(analysis)* " +
      "Separately, silver has historically fallen 7% on similar days.";
    const issues = checkClaims(brief, REAL_LEDGER);
    expect(issues.length).toBe(1);
    expect(issues[0]).toContain("7%");
  });

  test("live/computed figures with no historical trigger word still pass through untouched", () => {
    const brief = "MCX Gold is trading 13.46% above import parity today.";
    expect(checkClaims(brief, REAL_LEDGER)).toEqual([]);
  });
});
