import { describe, test, expect } from "vitest";
import { buildReport } from "./generate-reel-report.mjs";

const NOW = new Date("2026-09-08T09:00:00Z").getTime();
const DAYS_AGO = (n) => new Date(NOW - n * 24 * 3600 * 1000).toISOString();

function reel(overrides) {
  return {
    file: "brief-edition-100",
    hook_caption: "Test hook",
    content_type: "macro_trend",
    posted_at: DAYS_AGO(2),
    insights: { views: 40, reach: 35, ig_reels_avg_watch_time: 2500 },
    charts: { beat1: "two_bar", beat2: "none", beat3: "none" },
    ...overrides,
  };
}

describe("buildReport", () => {
  test("empty history — everything reports as n/a, no throw", () => {
    const r = buildReport({ history: [], followerHistory: [], now: NOW });
    expect(r.reelsThisWeek).toBe(0);
    expect(r.avgViewsThis).toBeNull();
    expect(r.viewsChangePct).toBeNull();
    expect(r.top3).toEqual([]);
    expect(r.chartCoveragePct).toBeNull();
    expect(r.followerDelta).toBeNull();
  });

  test("ignores reels without insights or without posted_at", () => {
    const history = [
      reel({ file: "no-insights", insights: undefined }),
      reel({ file: "not-posted", posted_at: undefined }),
      reel({ file: "good" }),
    ];
    const r = buildReport({ history, followerHistory: [], now: NOW });
    expect(r.reelsThisWeek).toBe(1);
  });

  test("splits reels into this-week vs prior-week buckets by posted_at", () => {
    const history = [
      reel({ file: "this-week-1", posted_at: DAYS_AGO(1) }),
      reel({ file: "this-week-2", posted_at: DAYS_AGO(6) }),
      reel({ file: "prior-week-1", posted_at: DAYS_AGO(10) }),
      reel({ file: "too-old", posted_at: DAYS_AGO(20) }),
    ];
    const r = buildReport({ history, followerHistory: [], now: NOW, windowDays: 7 });
    expect(r.reelsThisWeek).toBe(2);
    expect(r.reelsPriorWeek).toBe(1);
  });

  test("computes average views and week-over-week % change", () => {
    const history = [
      reel({ file: "a", posted_at: DAYS_AGO(1), insights: { views: 60 } }),
      reel({ file: "b", posted_at: DAYS_AGO(2), insights: { views: 40 } }),
      reel({ file: "c", posted_at: DAYS_AGO(10), insights: { views: 25 } }),
    ];
    const r = buildReport({ history, followerHistory: [], now: NOW });
    expect(r.avgViewsThis).toBe(50); // (60+40)/2
    expect(r.avgViewsPrior).toBe(25);
    expect(r.viewsChangePct).toBe(100); // 50 vs 25 = +100%
  });

  test("top3/bottom3 are sorted by views, most-viewed first for top3", () => {
    const history = [
      reel({ file: "low", posted_at: DAYS_AGO(1), insights: { views: 10 } }),
      reel({ file: "high", posted_at: DAYS_AGO(1), insights: { views: 90 } }),
      reel({ file: "mid", posted_at: DAYS_AGO(1), insights: { views: 50 } }),
    ];
    const r = buildReport({ history, followerHistory: [], now: NOW });
    expect(r.top3.map((e) => e.file)).toEqual(["high", "mid", "low"]);
  });

  test("bottom3 is empty when there are 3 or fewer reels (top3 already shows everything)", () => {
    const history = [
      reel({ file: "a", posted_at: DAYS_AGO(1), insights: { views: 10 } }),
      reel({ file: "b", posted_at: DAYS_AGO(1), insights: { views: 20 } }),
    ];
    const r = buildReport({ history, followerHistory: [], now: NOW });
    expect(r.bottom3).toEqual([]);
  });

  test("content-type breakdown groups and averages correctly, sorted best-first", () => {
    const history = [
      reel({ file: "a", posted_at: DAYS_AGO(1), content_type: "explainer", insights: { views: 80 } }),
      reel({ file: "b", posted_at: DAYS_AGO(1), content_type: "explainer", insights: { views: 60 } }),
      reel({ file: "c", posted_at: DAYS_AGO(1), content_type: "macro_trend", insights: { views: 20 } }),
    ];
    const r = buildReport({ history, followerHistory: [], now: NOW });
    expect(r.contentTypeBreakdown[0]).toEqual({ type: "explainer", count: 2, avgViews: 70 });
    expect(r.contentTypeBreakdown[1]).toEqual({ type: "macro_trend", count: 1, avgViews: 20 });
  });

  test("chart coverage % counts reels with at least one non-none beat chart", () => {
    const history = [
      reel({ file: "a", posted_at: DAYS_AGO(1), charts: { beat1: "two_bar", beat2: "none", beat3: "none" } }),
      reel({ file: "b", posted_at: DAYS_AGO(1), charts: { beat1: "none", beat2: "none", beat3: "none" } }),
    ];
    const r = buildReport({ history, followerHistory: [], now: NOW });
    expect(r.chartCoveragePct).toBe(50);
  });

  test("chart coverage is null when no reels this week carry chart data (pre-Fix-2 entries)", () => {
    const history = [reel({ file: "a", posted_at: DAYS_AGO(1), charts: undefined })];
    const r = buildReport({ history, followerHistory: [], now: NOW });
    expect(r.chartCoveragePct).toBeNull();
  });

  test("follower delta is threaded through from followerHistory", () => {
    const followerHistory = [
      { date: "2026-09-08", followers_count: 900 },
      { date: "2026-09-01", followers_count: 850 },
    ];
    const r = buildReport({ history: [], followerHistory, now: NOW });
    expect(r.followerDelta).toEqual({
      latest: 900, prior: 850, delta: 50, priorDate: "2026-09-01", latestDate: "2026-09-08",
    });
  });
});
