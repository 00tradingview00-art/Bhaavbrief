import { describe, test, expect } from "vitest";
import { appendFollowerSnapshot, followerDelta } from "./followerHistory.mjs";

describe("appendFollowerSnapshot", () => {
  test("prepends to an empty history", () => {
    const snap = { date: "2026-09-08", followers_count: 812, fetched_at: "2026-09-08T03:30:00Z" };
    expect(appendFollowerSnapshot([], snap)).toEqual([snap]);
  });

  test("prepends newest-first ahead of existing entries", () => {
    const prior = { date: "2026-09-07", followers_count: 800, fetched_at: "x" };
    const snap = { date: "2026-09-08", followers_count: 812, fetched_at: "y" };
    expect(appendFollowerSnapshot([prior], snap)).toEqual([snap, prior]);
  });

  test("a same-day re-run overwrites today's snapshot instead of duplicating it", () => {
    const first = { date: "2026-09-08", followers_count: 800, fetched_at: "x" };
    const rerun = { date: "2026-09-08", followers_count: 805, fetched_at: "y" };
    const prior = { date: "2026-09-07", followers_count: 790, fetched_at: "z" };
    const result = appendFollowerSnapshot([first, prior], rerun);
    expect(result).toEqual([rerun, prior]);
  });

  test("treats non-array history as empty", () => {
    const snap = { date: "2026-09-08", followers_count: 812, fetched_at: "x" };
    expect(appendFollowerSnapshot(null, snap)).toEqual([snap]);
    expect(appendFollowerSnapshot(undefined, snap)).toEqual([snap]);
  });
});

describe("followerDelta", () => {
  test("returns null with fewer than 2 snapshots", () => {
    expect(followerDelta([], 7)).toBeNull();
    expect(followerDelta([{ date: "2026-09-08", followers_count: 812 }], 7)).toBeNull();
  });

  test("returns null when no snapshot is old enough", () => {
    const history = [
      { date: "2026-09-08", followers_count: 812 },
      { date: "2026-09-07", followers_count: 800 },
    ];
    expect(followerDelta(history, 7)).toBeNull();
  });

  test("computes delta against the nearest snapshot at least `days` old", () => {
    const history = [
      { date: "2026-09-08", followers_count: 900 },
      { date: "2026-09-05", followers_count: 850 },
      { date: "2026-09-01", followers_count: 800 },
    ];
    expect(followerDelta(history, 7)).toEqual({
      latest: 900, prior: 800, delta: 100, priorDate: "2026-09-01", latestDate: "2026-09-08",
    });
  });

  test("tolerates a missed day — uses the nearest snapshot at or beyond the cutoff, not an exact 7-day match", () => {
    const history = [
      { date: "2026-09-08", followers_count: 900 },
      { date: "2026-09-05", followers_count: 870 }, // only 3 days back — not old enough yet
      { date: "2026-08-28", followers_count: 800 }, // 11 days back — first one that qualifies
    ];
    const result = followerDelta(history, 7);
    expect(result.prior).toBe(800);
    expect(result.delta).toBe(100);
  });
});
