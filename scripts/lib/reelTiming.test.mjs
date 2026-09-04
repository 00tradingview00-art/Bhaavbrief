import { describe, test, expect } from "vitest";
import { computeReelTiming } from "./reelTiming.mjs";

const BASELINE = {
  COVER_DUR: 0, HOOK_DUR: 3.0, BEAT1_DUR: 8.0, BEAT2_DUR: 8.0, BEAT3_DUR: 7.0,
  PAYOFF_DUR: 5.0, CTA_DUR: 4.0,
};
const FPS = 30;
// speechBaseline = 3+8+8+7+5 = 31

describe("computeReelTiming", () => {
  test("no measured duration — keeps the planned baseline (scale 1)", () => {
    const t = computeReelTiming(BASELINE, null, FPS);
    expect(t.scale).toBe(1);
    expect(t.HOOK_DUR).toBe(3.0);
    expect(t.CTA_END).toBe(Math.round(35 * FPS));
    expect(t.TOTAL_FRAMES).toBe(t.CTA_END);
  });

  test("undefined duration behaves the same as null", () => {
    const t = computeReelTiming(BASELINE, undefined, FPS);
    expect(t.scale).toBe(1);
  });

  test("measured duration exactly matches the baseline — scale 1, unclamped", () => {
    const t = computeReelTiming(BASELINE, 31, FPS);
    expect(t.scale).toBeCloseTo(1, 5);
    expect(t.clamped).toBe(false);
  });

  test("a 3x-too-long voiceover clamps the scale to 1.8x", () => {
    const t = computeReelTiming(BASELINE, 93, FPS); // 93/31 = 3.0
    expect(t.rawScale).toBeCloseTo(3.0, 5);
    expect(t.scale).toBeCloseTo(1.8, 5);
    expect(t.clamped).toBe(true);
    expect(t.HOOK_DUR).toBeCloseTo(3.0 * 1.8, 5);
  });

  test("a 0.1x-too-short voiceover clamps the scale to 0.7x", () => {
    const t = computeReelTiming(BASELINE, 3.1, FPS); // 3.1/31 = 0.1
    expect(t.rawScale).toBeCloseTo(0.1, 5);
    expect(t.scale).toBeCloseTo(0.7, 5);
    expect(t.clamped).toBe(true);
  });

  test("NaN or non-positive measured duration falls back to scale 1", () => {
    expect(computeReelTiming(BASELINE, NaN, FPS).scale).toBe(1);
    expect(computeReelTiming(BASELINE, 0, FPS).scale).toBe(1);
    expect(computeReelTiming(BASELINE, -5, FPS).scale).toBe(1);
  });

  test("frame boundaries are monotonically increasing and end at TOTAL_FRAMES", () => {
    const t = computeReelTiming(BASELINE, 40, FPS);
    const order = [t.COVER_END, t.HOOK_END, t.BEAT1_END, t.BEAT2_END, t.BEAT3_END, t.PAYOFF_END, t.CTA_END];
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
    expect(t.TOTAL_FRAMES).toBe(t.CTA_END);
  });

  test("two independent calls with different durations don't interfere (no shared mutable state)", () => {
    const english = computeReelTiming(BASELINE, 24, FPS);
    const hindi   = computeReelTiming(BASELINE, 29, FPS);
    expect(english.TOTAL_FRAMES).not.toBe(hindi.TOTAL_FRAMES);
    // re-running english again gives the same result — nothing was mutated
    const englishAgain = computeReelTiming(BASELINE, 24, FPS);
    expect(englishAgain).toEqual(english);
  });
});
