import { describe, test, expect } from "vitest";
import { parseRbiRepoRate, compareRepoRate } from "./repoRateCheck.mjs";

// Trimmed from rbi.org.in's "Current Rates" box as served on 7 Oct 2026.
const RBI_HTML = `<div class="ratesBox"><h3>Current Rates</h3><p>Policy&nbsp; Rates</p>
<table><tr><td>Policy Repo Rate</td><td> : 5.25%</td></tr>
<tr><td>Standing Deposit Facility Rate</td><td> : 5.00%</td></tr>
<tr><td>Marginal Standing Facility Rate</td><td> : 5.50%</td></tr>
<tr><td>Bank Rate</td><td> : 5.50%</td></tr></table></div>`;

describe("parseRbiRepoRate", () => {
  test("reads the repo rate, not the neighbouring MSF/Bank Rate rows", () => {
    expect(parseRbiRepoRate(RBI_HTML)).toBe(5.25);
  });

  test("returns null when the box is missing (page redesign, block page)", () => {
    expect(parseRbiRepoRate("<html><body>Access Denied</body></html>")).toBeNull();
    expect(parseRbiRepoRate(undefined)).toBeNull();
  });
});

describe("compareRepoRate", () => {
  test("ok when both agree", () => {
    expect(compareRepoRate({ rbiRate: 5.5, siteRate: 5.5, siteAsOf: "2026-10-07", today: "2026-11-01" }).status).toBe("ok");
  });

  test("rbi-lagging right after we update and RBI's box still shows the old rate", () => {
    expect(compareRepoRate({ rbiRate: 5.25, siteRate: 5.5, siteAsOf: "2026-10-07", today: "2026-10-07" }).status).toBe("rbi-lagging");
    expect(compareRepoRate({ rbiRate: 5.25, siteRate: 5.5, siteAsOf: "2026-10-07", today: "2026-10-10" }).status).toBe("rbi-lagging");
  });

  test("mismatch when RBI changed and our figure is older than the grace window", () => {
    expect(compareRepoRate({ rbiRate: 5.75, siteRate: 5.5, siteAsOf: "2026-10-07", today: "2026-12-06" }).status).toBe("mismatch");
  });

  test("unreadable when the RBI figure could not be parsed", () => {
    expect(compareRepoRate({ rbiRate: null, siteRate: 5.5, siteAsOf: "2026-10-07", today: "2026-10-08" }).status).toBe("unreadable");
  });
});
