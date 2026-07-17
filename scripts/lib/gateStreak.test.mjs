import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import { computeNextStreak, readStreak, AUTO_PUBLISH_THRESHOLD } from "./gateStreak.mjs";

describe("computeNextStreak", () => {
  beforeEach(() => {
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("no file — simulates a fresh repo with no streak yet");
    });
  });
  afterEach(() => vi.restoreAllMocks());

  test("starts at 1 on the first clean pass with no prior streak file", () => {
    const r = computeNextStreak(true, 1);
    expect(r.consecutiveCleanPasses).toBe(1);
    expect(r.autoPublishEligible).toBe(false);
  });

  test("a dirty pass resets to 0 regardless of prior streak", () => {
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ consecutiveCleanPasses: 29 }));
    const r = computeNextStreak(false, 30);
    expect(r.consecutiveCleanPasses).toBe(0);
    expect(r.autoPublishEligible).toBe(false);
  });

  test("autoPublishEligible flips true exactly at the threshold, not before", () => {
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ consecutiveCleanPasses: AUTO_PUBLISH_THRESHOLD - 2 }));
    const notYet = computeNextStreak(true, 100);
    expect(notYet.consecutiveCleanPasses).toBe(AUTO_PUBLISH_THRESHOLD - 1);
    expect(notYet.autoPublishEligible).toBe(false);

    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ consecutiveCleanPasses: AUTO_PUBLISH_THRESHOLD - 1 }));
    const atThreshold = computeNextStreak(true, 101);
    expect(atThreshold.consecutiveCleanPasses).toBe(AUTO_PUBLISH_THRESHOLD);
    expect(atThreshold.autoPublishEligible).toBe(true);
  });

  test("readStreak defaults to zero when the file is missing/malformed", () => {
    expect(readStreak()).toEqual({ consecutiveCleanPasses: 0, lastEdition: null });
  });
});
