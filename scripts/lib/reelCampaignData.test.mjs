import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { computeIvRank, pickLeadEvent, topOiStrikes, getBasisSnapshot } from "./reelCampaignData.mjs";

describe("computeIvRank", () => {
  const history = Array.from({ length: 20 }, (_, i) => ({ date: `2026-08-${i + 1}`, iv: i + 1 })); // 1..20

  test("current value at the top of history ranks near 100", () => {
    expect(computeIvRank(history, 20)).toBe(95); // 19/20 below
  });

  test("current value at the bottom of history ranks 0", () => {
    expect(computeIvRank(history, 1)).toBe(0);
  });

  test("current value mid-range ranks ~50", () => {
    expect(computeIvRank(history, 10)).toBe(45); // 9/20 below
  });

  test("too little history returns null rather than a meaningless rank", () => {
    expect(computeIvRank(history.slice(0, 5), 3)).toBeNull();
  });

  test("non-finite current value returns null", () => {
    expect(computeIvRank(history, NaN)).toBeNull();
    expect(computeIvRank(history, undefined)).toBeNull();
  });
});

describe("pickLeadEvent", () => {
  const soon = { name: "A", next_release_utc: "2026-09-05T00:00:00Z", impact_tier: "medium" };
  const laterHigh = { name: "B", next_release_utc: "2026-09-10T00:00:00Z", impact_tier: "high" };
  const evenLaterHigh = { name: "C", next_release_utc: "2026-09-15T00:00:00Z", impact_tier: "high" };

  test("empty list returns null", () => {
    expect(pickLeadEvent([])).toBeNull();
  });

  test("prefers the soonest high-impact event over a sooner lower-impact one", () => {
    expect(pickLeadEvent([soon, laterHigh, evenLaterHigh])).toEqual(laterHigh);
  });

  test("falls back to the soonest event overall when nothing is high-impact", () => {
    const lowOnly = { name: "D", next_release_utc: "2026-09-06T00:00:00Z", impact_tier: "low" };
    expect(pickLeadEvent([lowOnly, soon])).toEqual(soon);
  });
});

describe("topOiStrikes", () => {
  test("sorts by combined CE+PE OI, descending, capped at n", () => {
    const chain = [
      { strike: 100, CE: { oi: 10 }, PE: { oi: 5 } },   // 15
      { strike: 105, CE: { oi: 50 }, PE: { oi: 40 } },  // 90
      { strike: 110, CE: { oi: 1 },  PE: { oi: 1 } },   // 2
      { strike: 115, CE: { oi: 20 }, PE: { oi: 20 } },  // 40
    ];
    expect(topOiStrikes(chain, 2)).toEqual([
      { strike: 105, oi: 90 },
      { strike: 115, oi: 40 },
    ]);
  });

  test("missing CE/PE oi treated as zero, not a crash", () => {
    const chain = [{ strike: 100, CE: {}, PE: {} }];
    expect(topOiStrikes(chain, 5)).toEqual([{ strike: 100, oi: 0 }]);
  });
});

describe("getBasisSnapshot", () => {
  let root;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "reel-campaign-data-test-"));
    mkdirSync(join(root, "data/history"), { recursive: true });
    writeFileSync(join(root, "data/history/2026-09-03.json"), JSON.stringify({
      instruments: { MCX_CRUDE: { price: 7000 }, WTI: { price: 84 }, USDINR: { price: 88 } },
      derived: {},
    }));
    writeFileSync(join(root, "data/history/2026-09-04.json"), JSON.stringify({
      instruments: { MCX_CRUDE: { price: 7100 }, WTI: { price: 85 }, USDINR: { price: 88.2 } },
      derived: { mcxComexGoldSpreadPct: 3.4, mcxComexSilverSpreadPct: 21.9 },
    }));
  });

  afterAll(() => { rmSync(root, { recursive: true, force: true }) });

  test("reads the latest (alphabetically last) history file", () => {
    const snap = getBasisSnapshot(root);
    expect(snap.asOf).toBe("2026-09-04");
    expect(snap.goldSpreadPct).toBe(3.4);
    expect(snap.silverSpreadPct).toBe(21.9);
    expect(snap.crudeSpreadPct).not.toBeNull();
  });

  test("no history directory returns null", () => {
    const empty = mkdtempSync(join(tmpdir(), "reel-campaign-data-empty-"));
    expect(getBasisSnapshot(empty)).toBeNull();
    rmSync(empty, { recursive: true, force: true });
  });

  test("all spreads null returns null rather than an empty-looking snapshot", () => {
    const root2 = mkdtempSync(join(tmpdir(), "reel-campaign-data-nulls-"));
    mkdirSync(join(root2, "data/history"), { recursive: true });
    writeFileSync(join(root2, "data/history/2026-09-04.json"), JSON.stringify({
      instruments: {}, derived: {},
    }));
    expect(getBasisSnapshot(root2)).toBeNull();
    rmSync(root2, { recursive: true, force: true });
  });
});
