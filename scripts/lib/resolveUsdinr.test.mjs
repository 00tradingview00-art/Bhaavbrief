import { describe, test, expect } from "vitest";
import { resolveUsdinr } from "./resolveUsdinr.mjs";

describe("resolveUsdinr", () => {
  test("uses Kite when present, ignoring Yahoo and Frankfurter even if also present", () => {
    const kite = { price: 95.40, prevClose: 95.10, changePct: 0.315 };
    const yahoo = { price: 93.55, prevClose: 93.50, changePct: 0.05 };
    const result = resolveUsdinr(kite, yahoo, 94.0, 95.0);
    expect(result).toEqual({ price: 95.40, prevClose: 95.10, changePct: 0.315, unit: 'INR' });
  });

  test("falls back to Yahoo when Kite is absent", () => {
    const yahoo = { price: 93.55, prevClose: 93.50, changePct: 0.0535 };
    const result = resolveUsdinr(null, yahoo, 94.0, 93.4);
    expect(result).toEqual({ price: 93.55, prevClose: 93.50, changePct: 0.0535, unit: 'INR' });
  });

  test("falls back to Yahoo when Kite price is present but zero/invalid", () => {
    const kite = { price: 0, prevClose: 95.10, changePct: 0 };
    const yahoo = { price: 93.55, prevClose: 93.50, changePct: 0.0535 };
    expect(resolveUsdinr(kite, yahoo, 94.0, 93.4)).toEqual({ price: 93.55, prevClose: 93.50, changePct: 0.0535, unit: 'INR' });
  });

  test("falls back to Frankfurter when both Kite and Yahoo are absent, deriving prevClose from prior snapshot price", () => {
    const result = resolveUsdinr(null, null, 94.20, 93.80);
    expect(result.price).toBe(94.20);
    expect(result.prevClose).toBe(93.80);
    expect(result.changePct).toBeCloseTo(((94.20 - 93.80) / 93.80) * 100, 6);
    expect(result.unit).toBe('INR');
  });

  test("Frankfurter fallback with no prior snapshot price uses rate itself as prevClose (changePct 0)", () => {
    const result = resolveUsdinr(null, null, 94.20, undefined);
    expect(result).toEqual({ price: 94.20, prevClose: 94.20, changePct: 0, unit: 'INR' });
  });

  test("returns null when all three sources are absent", () => {
    expect(resolveUsdinr(null, null, null, 93.4)).toBeNull();
    expect(resolveUsdinr(undefined, undefined, undefined, undefined)).toBeNull();
  });
});
