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
