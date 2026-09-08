import { describe, test, expect } from "vitest";
import {
  isPriceMoveHighImpact, isGeoPolicyHighImpact, isBriefGeoPolicyHighImpact, isBriefHighImpact,
} from "./reelImpact.mjs";

describe("isPriceMoveHighImpact", () => {
  test("exactly at the threshold is high impact (inclusive)", () => {
    expect(isPriceMoveHighImpact(1.5)).toBe(true);
    expect(isPriceMoveHighImpact(-1.5)).toBe(true);
  });

  test("just under the threshold is not", () => {
    expect(isPriceMoveHighImpact(1.49)).toBe(false);
    expect(isPriceMoveHighImpact(-1.49)).toBe(false);
  });

  test("zero/missing is not high impact", () => {
    expect(isPriceMoveHighImpact(0)).toBe(false);
    expect(isPriceMoveHighImpact(undefined)).toBe(false);
    expect(isPriceMoveHighImpact(null)).toBe(false);
  });
});

describe("isGeoPolicyHighImpact", () => {
  test("non-neutral impact + a geo/policy category is high impact", () => {
    expect(isGeoPolicyHighImpact("bullish", "Geopolitics")).toBe(true);
    expect(isGeoPolicyHighImpact("bearish", "Policy")).toBe(true);
  });

  test("neutral impact never qualifies, even in a geo/policy category", () => {
    expect(isGeoPolicyHighImpact("neutral", "Geopolitics")).toBe(false);
  });

  test("non-neutral impact in a non-geo/policy category doesn't qualify", () => {
    expect(isGeoPolicyHighImpact("bullish", "Metals")).toBe(false);
  });
});

describe("isBriefGeoPolicyHighImpact", () => {
  const flatInstruments = {
    MCX_GOLD: { changePct: 0.1 }, MCX_CRUDE: { changePct: -0.2 },
    MCX_SILVER: { changePct: 0.3 }, MCX_COPPER: { changePct: 0.0 }, USDINR: { changePct: 0.05 },
  };
  const movedInstruments = { ...flatInstruments, MCX_GOLD: { changePct: 0.6 } };

  test("geo tag but every tracked instrument flat — does NOT qualify", () => {
    expect(isBriefGeoPolicyHighImpact(["Geopolitics"], flatInstruments)).toBe(false);
  });

  test("geo tag with one instrument at exactly the non-flat threshold qualifies", () => {
    const instruments = { ...flatInstruments, MCX_SILVER: { changePct: 0.5 } };
    expect(isBriefGeoPolicyHighImpact(["Geopolitics"], instruments)).toBe(true);
  });

  test("geo tag with a real move qualifies", () => {
    expect(isBriefGeoPolicyHighImpact(["War"], movedInstruments)).toBe(true);
  });

  test("no geo tag at all never qualifies, even with a big move", () => {
    expect(isBriefGeoPolicyHighImpact(["Metals"], movedInstruments)).toBe(false);
    expect(isBriefGeoPolicyHighImpact([], movedInstruments)).toBe(false);
  });

  test("missing tags/instruments doesn't throw", () => {
    expect(isBriefGeoPolicyHighImpact(undefined, undefined)).toBe(false);
    expect(isBriefGeoPolicyHighImpact(null, null)).toBe(false);
  });
});

describe("isBriefHighImpact", () => {
  const flatInstruments = {
    MCX_GOLD: { changePct: 0.1 }, MCX_CRUDE: { changePct: -0.2 },
    MCX_SILVER: { changePct: 0.3 }, MCX_COPPER: { changePct: 0.0 }, USDINR: { changePct: 0.05 },
  };

  test("a big move with no geo tag qualifies via the price branch", () => {
    const instruments = { ...flatInstruments, MCX_CRUDE: { changePct: 1.8 } };
    const result = isBriefHighImpact([], instruments);
    expect(result.highImpact).toBe(true);
    expect(result.reason).toBe("price:MCX_CRUDE:1.80%");
  });

  test("everything flat, no geo tag — not high impact", () => {
    const result = isBriefHighImpact(["Metals"], flatInstruments);
    expect(result).toEqual({ highImpact: false, reason: null });
  });

  test("geo tag with a moderate move qualifies via the geo branch when no single instrument hits 1.5%", () => {
    const instruments = { ...flatInstruments, USDINR: { changePct: 0.7 } };
    const result = isBriefHighImpact(["Fed"], instruments);
    expect(result).toEqual({ highImpact: true, reason: "geo-policy-tag-with-nonflat-move" });
  });

  test("a big move in an untracked instrument is correctly ignored", () => {
    // MCX_NICKEL isn't one of the brief's 5 tracked instruments.
    const instruments = { ...flatInstruments, MCX_NICKEL: { changePct: 4.2 } };
    const result = isBriefHighImpact([], instruments);
    expect(result).toEqual({ highImpact: false, reason: null });
  });

  test("missing tags/instruments doesn't throw and reports not high impact", () => {
    expect(isBriefHighImpact(undefined, undefined)).toEqual({ highImpact: false, reason: null });
  });

  test("a big mover buried alphabetically after other flat instruments is still found", () => {
    const instruments = {
      MCX_COPPER: { changePct: 0.1 },
      MCX_CRUDE: { changePct: 0.1 },
      MCX_GOLD: { changePct: 0.1 },
      MCX_SILVER: { changePct: 0.1 },
      USDINR: { changePct: 1.9 },
    };
    const result = isBriefHighImpact([], instruments);
    expect(result.highImpact).toBe(true);
    expect(result.reason).toBe("price:USDINR:1.90%");
  });
});
