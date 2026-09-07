import { describe, test, expect } from "vitest";
import { validateChart, validateBeatCharts, deriveSnapshotChart } from "./chartValidation.mjs";

const FACTS = [
  "MCX gold offers roughly 14–20x leverage; Gold ETFs offer none — 1x price exposure only",
  "MCX Gold Mini (100g) needs ₹55,000–75,000 SPAN margin",
  "Recommended practical starting capital is ₹1,00,000–1,25,000 for Gold Mini",
];

describe("validateChart — pass-through cases", () => {
  test("type 'none' passes through unchanged", () => {
    expect(validateChart({ type: "none" }, { facts: FACTS })).toEqual({ type: "none" });
  });

  test("missing/non-object chart demotes to none", () => {
    expect(validateChart(null, { facts: FACTS })).toEqual({ type: "none" });
    expect(validateChart(undefined, { facts: FACTS })).toEqual({ type: "none" });
    expect(validateChart("not an object", { facts: FACTS })).toEqual({ type: "none" });
  });

  test("unknown type demotes to none", () => {
    expect(validateChart({ type: "pie_chart", beat: 1 }, { facts: FACTS })).toEqual({ type: "none" });
  });

  test("a `beat` field, if present, is ignored — the schema is now one chart per beat, positional", () => {
    const chart = { type: "icon_array", beat: 4, icon_array: { filled: 17, total: 20 } };
    expect(validateChart(chart, { facts: FACTS })).toEqual(chart);
  });
});

describe("validateChart — icon_array", () => {
  test("a value picked from within a stated range is accepted (17 from '14-20x')", () => {
    const chart = { type: "icon_array", beat: 1, icon_array: { filled: 17, total: 20, unit_label: "x leverage" } };
    expect(validateChart(chart, { facts: FACTS })).toEqual(chart);
  });

  test("a genuinely fabricated number outside any range/single is rejected", () => {
    const chart = { type: "icon_array", beat: 1, icon_array: { filled: 47, total: 50 } };
    expect(validateChart(chart, { facts: FACTS })).toEqual({ type: "none" });
  });

  test("total: 0 is rejected, not a divide-by-zero", () => {
    const chart = { type: "icon_array", beat: 1, icon_array: { filled: 0, total: 0 } };
    expect(() => validateChart(chart, { facts: FACTS })).not.toThrow();
    expect(validateChart(chart, { facts: FACTS })).toEqual({ type: "none" });
  });

  test("filled > total is rejected", () => {
    const chart = { type: "icon_array", beat: 1, icon_array: { filled: 25, total: 20 } };
    expect(validateChart(chart, { facts: FACTS })).toEqual({ type: "none" });
  });

  test("total > 20 is rejected even if both numbers are real", () => {
    // 20 and 20 individually plausible, but total=20 filled=20 total>20 case:
    const chart = { type: "icon_array", beat: 1, icon_array: { filled: 30, total: 30 } };
    expect(validateChart(chart, { facts: FACTS })).toEqual({ type: "none" });
  });

  test("non-integer filled/total is rejected", () => {
    const chart = { type: "icon_array", beat: 1, icon_array: { filled: 17.5, total: 20 } };
    expect(validateChart(chart, { facts: FACTS })).toEqual({ type: "none" });
  });

  test("negative filled is rejected", () => {
    const chart = { type: "icon_array", beat: 1, icon_array: { filled: -1, total: 20 } };
    expect(validateChart(chart, { facts: FACTS })).toEqual({ type: "none" });
  });
});

describe("validateChart — two_bar", () => {
  test("real numbers from source facts are accepted", () => {
    const chart = {
      type: "two_bar", beat: 2,
      two_bar: { labelA: "MCX Gold Mini margin", valueA: 65000, labelB: "Recommended capital", valueB: 112500, unit: "₹" },
    };
    expect(validateChart(chart, { facts: FACTS })).toEqual(chart);
  });

  test("a real number with float rounding is accepted (tolerance)", () => {
    const chart = {
      type: "two_bar", beat: 2,
      two_bar: { labelA: "A", valueA: 65001.3, labelB: "B", valueB: 112499.7, unit: "₹" },
    };
    expect(validateChart(chart, { facts: FACTS })).toEqual(chart);
  });

  test("a fabricated value is rejected", () => {
    const chart = {
      type: "two_bar", beat: 2,
      two_bar: { labelA: "A", valueA: 999999, labelB: "B", valueB: 112500, unit: "₹" },
    };
    expect(validateChart(chart, { facts: FACTS })).toEqual({ type: "none" });
  });

  test("missing labels are rejected", () => {
    const chart = { type: "two_bar", beat: 2, two_bar: { valueA: 65000, valueB: 112500 } };
    expect(validateChart(chart, { facts: FACTS })).toEqual({ type: "none" });
  });

  test("non-finite values are rejected", () => {
    const chart = { type: "two_bar", beat: 2, two_bar: { labelA: "A", valueA: NaN, labelB: "B", valueB: 112500 } };
    expect(validateChart(chart, { facts: FACTS })).toEqual({ type: "none" });
  });

  test("validates against a snapshot's numeric leaves for daily-brief mode (no facts)", () => {
    const snapshot = { instruments: { MCX_GOLD: { price: 141809, prevClose: 141781 } } };
    const chart = {
      type: "two_bar", beat: 1,
      two_bar: { labelA: "Today", valueA: 141809, labelB: "Yesterday", valueB: 141781, unit: "₹" },
    };
    expect(validateChart(chart, { snapshot })).toEqual(chart);
  });

  test("rejects a value not present in either facts or snapshot", () => {
    const snapshot = { instruments: { MCX_GOLD: { price: 141809, prevClose: 141781 } } };
    const chart = {
      type: "two_bar", beat: 1,
      two_bar: { labelA: "Today", valueA: 999999, labelB: "Yesterday", valueB: 141781, unit: "₹" },
    };
    expect(validateChart(chart, { snapshot })).toEqual({ type: "none" });
  });
});

describe("validateBeatCharts", () => {
  test("validates each beat independently — one bad beat doesn't demote the others", () => {
    const good = { type: "icon_array", icon_array: { filled: 17, total: 20 } };
    const bad  = { type: "icon_array", icon_array: { filled: 999, total: 20 } }; // fabricated
    const result = validateBeatCharts(
      { beat1_chart: good, beat2_chart: bad, beat3_chart: { type: "none" } },
      { facts: FACTS }
    );
    expect(result.beat1_chart).toEqual(good);
    expect(result.beat2_chart).toEqual({ type: "none" });
    expect(result.beat3_chart).toEqual({ type: "none" });
  });

  test("missing input defaults every beat to none", () => {
    expect(validateBeatCharts(undefined, { facts: FACTS })).toEqual({
      beat1_chart: { type: "none" }, beat2_chart: { type: "none" }, beat3_chart: { type: "none" },
    });
  });
});

describe("deriveSnapshotChart", () => {
  test("builds a Today vs Yesterday two_bar chart from a real snapshot", () => {
    const snapshot = { instruments: { MCX_GOLD: { price: 141809, prevClose: 141781 } } };
    expect(deriveSnapshotChart(snapshot, "MCX_GOLD")).toEqual({
      type: "two_bar",
      two_bar: { labelA: "Today", valueA: 141809, labelB: "Yesterday", valueB: 141781, unit: "₹" },
    });
  });

  test("returns none when price and prevClose are identical (nothing to compare)", () => {
    const snapshot = { instruments: { MCX_GOLD: { price: 141809, prevClose: 141809 } } };
    expect(deriveSnapshotChart(snapshot, "MCX_GOLD")).toEqual({ type: "none" });
  });

  test("returns none when the instrument or snapshot is missing", () => {
    expect(deriveSnapshotChart(null, "MCX_GOLD")).toEqual({ type: "none" });
    expect(deriveSnapshotChart({ instruments: {} }, "MCX_GOLD")).toEqual({ type: "none" });
  });

  test("returns none when prevClose is non-finite", () => {
    const snapshot = { instruments: { MCX_GOLD: { price: 141809, prevClose: null } } };
    expect(deriveSnapshotChart(snapshot, "MCX_GOLD")).toEqual({ type: "none" });
  });

  test("the derived chart itself passes validateChart against the same snapshot", () => {
    const snapshot = { instruments: { MCX_GOLD: { price: 141809, prevClose: 141781 } } };
    const derived = deriveSnapshotChart(snapshot, "MCX_GOLD");
    expect(validateChart(derived, { snapshot })).toEqual(derived);
  });
});
