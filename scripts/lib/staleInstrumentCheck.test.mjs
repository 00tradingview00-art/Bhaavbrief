import { describe, test, expect } from "vitest";
import { checkStaleInstruments } from "./staleInstrumentCheck.mjs";

describe("checkStaleInstruments", () => {
  test("blocks when a stale instrument is cited by name", () => {
    const brief = "MCX NatGas at ₹256.70/mmBtu is down -0.95% today.";
    const instruments = { MCX_NATGAS: { price: 256.7, stale: true } };
    const issues = checkStaleInstruments(brief, instruments);
    expect(issues.length).toBe(1);
    expect(issues[0]).toContain("MCX NatGas");
    expect(issues[0]).toContain("stale");
  });

  test("no issue when the stale instrument isn't mentioned in the brief", () => {
    const brief = "MCX Gold at ₹141,406 is off ₹197 today.";
    const instruments = { MCX_NATGAS: { price: 256.7, stale: true } };
    expect(checkStaleInstruments(brief, instruments)).toEqual([]);
  });

  test("no issue when the instrument is fresh", () => {
    const brief = "MCX NatGas at ₹256.70/mmBtu is down -0.95% today.";
    const instruments = { MCX_NATGAS: { price: 256.7 } };
    expect(checkStaleInstruments(brief, instruments)).toEqual([]);
  });

  test("catches 'Natural Gas' as well as 'NatGas' (case-insensitive)", () => {
    const brief = "Natural Gas is the standout mover today.";
    const instruments = { MCX_NATGAS: { price: 256.7, stale: true } };
    expect(checkStaleInstruments(brief, instruments).length).toBe(1);
  });

  test("flags multiple stale instruments independently", () => {
    const brief = "Gold slipped while Crude held steady.";
    const instruments = {
      MCX_GOLD:  { price: 141406, stale: true },
      MCX_CRUDE: { price: 7867,   stale: true },
      MCX_SILVER: { price: 217178 },
    };
    expect(checkStaleInstruments(brief, instruments).length).toBe(2);
  });

  test("handles a missing instruments object gracefully", () => {
    expect(checkStaleInstruments("Gold is up today.", undefined)).toEqual([]);
  });
});
