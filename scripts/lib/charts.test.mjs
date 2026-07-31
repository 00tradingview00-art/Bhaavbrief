import { describe, test, expect, vi, beforeEach } from "vitest";
import { drawIconArray, drawComparisonBars, drawSparkline } from "./charts.mjs";

// Minimal no-op mock of the Canvas2D API surface these functions use —
// lets the pure layout/guard math be tested without a real @napi-rs/canvas
// context. Calls are tracked via vi.fn() so tests can assert what was
// (or wasn't) drawn, not just the boolean return value.
function mockCtx() {
  return {
    beginPath: vi.fn(), closePath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(),
    arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    set fillStyle(v) {}, get fillStyle() { return this._fs; },
    set strokeStyle(v) {}, get strokeStyle() { return this._ss; },
    font: "", textAlign: "left", lineWidth: 1, lineJoin: "miter", lineCap: "butt",
  };
}

describe("drawIconArray", () => {
  let ctx;
  beforeEach(() => { ctx = mockCtx(); });

  const base = { x: 0, y: 0, w: 900, filledColor: "#C8720A", emptyColor: "#999", textColor: "#111" };

  test("returns false and draws nothing when total <= 0", () => {
    expect(drawIconArray(ctx, { ...base, filled: 0, total: 0 })).toBe(false);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  test("returns false when filled > total", () => {
    expect(drawIconArray(ctx, { ...base, filled: 25, total: 20 })).toBe(false);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  test("returns false when filled is negative", () => {
    expect(drawIconArray(ctx, { ...base, filled: -1, total: 10 })).toBe(false);
  });

  test("returns false when filled is non-finite", () => {
    expect(drawIconArray(ctx, { ...base, filled: NaN, total: 10 })).toBe(false);
  });

  test("draws exactly `total` icons for a valid within-cap request", () => {
    expect(drawIconArray(ctx, { ...base, filled: 7, total: 10 })).toBe(true);
    expect(ctx.arc).toHaveBeenCalledTimes(10);
  });

  test("caps icon count at maxIcons even if total is larger", () => {
    expect(drawIconArray(ctx, { ...base, filled: 40, total: 50, maxIcons: 20 })).toBe(true);
    expect(ctx.arc).toHaveBeenCalledTimes(20);
  });

  test("filled=total draws all icons, still returns true", () => {
    expect(drawIconArray(ctx, { ...base, filled: 5, total: 5 })).toBe(true);
    expect(ctx.arc).toHaveBeenCalledTimes(5);
  });

  test("filled=0 (valid, just an empty pictograph) still draws and returns true", () => {
    expect(drawIconArray(ctx, { ...base, filled: 0, total: 8 })).toBe(true);
    expect(ctx.arc).toHaveBeenCalledTimes(8);
  });
});

describe("drawComparisonBars", () => {
  let ctx;
  beforeEach(() => { ctx = mockCtx(); });

  const base = { x: 0, y: 0, w: 900, h: 400, mutedColor: "#999", textColor: "#111" };

  test("returns false with fewer than 2 bars", () => {
    expect(drawComparisonBars(ctx, { ...base, bars: [{ label: "A", value: 10, color: "#f00" }] })).toBe(false);
  });

  test("returns false with more than 4 bars", () => {
    const bars = Array.from({ length: 5 }, (_, i) => ({ label: `B${i}`, value: 10, color: "#f00" }));
    expect(drawComparisonBars(ctx, { ...base, bars })).toBe(false);
  });

  test("returns false when every bar's value is 0", () => {
    const bars = [{ label: "A", value: 0, color: "#f00" }, { label: "B", value: 0, color: "#0f0" }];
    expect(drawComparisonBars(ctx, { ...base, bars })).toBe(false);
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  test("returns false when every bar's value is non-finite", () => {
    const bars = [{ label: "A", value: NaN, color: "#f00" }, { label: "B", value: undefined, color: "#0f0" }];
    expect(drawComparisonBars(ctx, { ...base, bars })).toBe(false);
  });

  test("draws a fill per bar for a valid 2-bar comparison", () => {
    const bars = [
      { label: "MCX Gold", value: 17, fmt: v => `${v}x`, color: "#C8720A", emphasis: true },
      { label: "Gold ETF", value: 1, fmt: v => `${v}x`, color: "#8A8A7A" },
    ];
    expect(drawComparisonBars(ctx, { ...base, bars })).toBe(true);
    expect(ctx.fill).toHaveBeenCalledTimes(2);
  });

  test("handles a valid 4-bar comparison (upper bound)", () => {
    const bars = Array.from({ length: 4 }, (_, i) => ({ label: `B${i}`, value: (i + 1) * 10, color: "#f00" }));
    expect(drawComparisonBars(ctx, { ...base, bars })).toBe(true);
    expect(ctx.fill).toHaveBeenCalledTimes(4);
  });

  test("one zero-value bar among non-zero bars still draws (false only when ALL are zero)", () => {
    const bars = [
      { label: "A", value: 0, color: "#f00" },
      { label: "B", value: 50, color: "#0f0" },
    ];
    expect(drawComparisonBars(ctx, { ...base, bars })).toBe(true);
  });
});

describe("drawSparkline", () => {
  let ctx;
  beforeEach(() => { ctx = mockCtx(); });

  const base = { x: 0, y: 0, w: 300, h: 60, upColor: "#0f0", downColor: "#f00" };

  test("returns false with fewer than 2 points", () => {
    expect(drawSparkline(ctx, { ...base, closes: [100] })).toBe(false);
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  test("returns false with an empty array", () => {
    expect(drawSparkline(ctx, { ...base, closes: [] })).toBe(false);
  });

  test("returns false when fewer than 2 values are finite", () => {
    expect(drawSparkline(ctx, { ...base, closes: [100, NaN, undefined] })).toBe(false);
  });

  test("draws a line for a valid ascending series", () => {
    expect(drawSparkline(ctx, { ...base, closes: [100, 105, 110, 108, 115] })).toBe(true);
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
  });

  test("does not divide by zero when all closes are identical (flat line)", () => {
    expect(() => drawSparkline(ctx, { ...base, closes: [100, 100, 100] })).not.toThrow();
    expect(drawSparkline(ctx, { ...base, closes: [100, 100, 100] })).toBe(true);
  });

  test("draws the area wash and end dot by default", () => {
    drawSparkline(ctx, { ...base, closes: [100, 90, 95] });
    expect(ctx.createLinearGradient).toHaveBeenCalledTimes(1);
    expect(ctx.arc).toHaveBeenCalledTimes(1); // end dot
  });

  test("skips area/dot when explicitly disabled", () => {
    drawSparkline(ctx, { ...base, closes: [100, 90, 95], showArea: false, showDot: false });
    expect(ctx.createLinearGradient).not.toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });
});
