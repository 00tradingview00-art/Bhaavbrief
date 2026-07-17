import { describe, test, expect } from "vitest";
import { resolveEdge, formatEdgeResultBlock } from "./edgeLedger.mjs";

describe("resolveEdge", () => {
  test("confirmed: price closed above the watched level", () => {
    const edge = { edgeMetric: "COMEX_GOLD", edgeLevel: 3997, edgeCondition: "above" };
    const snapshot = { instruments: { COMEX_GOLD: { price: 4010 } } };
    const r = resolveEdge(edge, snapshot);
    expect(r.verdict).toBe("confirmed");
    expect(r.resolvedValue).toBe(4010);
  });

  test("rejected: price closed below the watched 'above' level", () => {
    const edge = { edgeMetric: "COMEX_GOLD", edgeLevel: 3997, edgeCondition: "above" };
    const snapshot = { instruments: { COMEX_GOLD: { price: 3980 } } };
    const r = resolveEdge(edge, snapshot);
    expect(r.verdict).toBe("rejected");
  });

  test("confirmed: price closed below the watched 'below' level", () => {
    const edge = { edgeMetric: "WTI", edgeLevel: 80, edgeCondition: "below" };
    const snapshot = { instruments: { WTI: { price: 78.5 } } };
    expect(resolveEdge(edge, snapshot).verdict).toBe("confirmed");
  });

  test("unresolved: no edge frontmatter on the prior edition (e.g. an older-format brief)", () => {
    expect(resolveEdge({}, { instruments: {} }).verdict).toBe("unresolved");
    expect(resolveEdge(undefined, { instruments: {} }).verdict).toBe("unresolved");
  });

  test("unresolved: edgeCondition is neither above nor below (malformed generation)", () => {
    const edge = { edgeMetric: "COMEX_GOLD", edgeLevel: 3997, edgeCondition: "near" };
    expect(resolveEdge(edge, { instruments: { COMEX_GOLD: { price: 4000 } } }).verdict).toBe("unresolved");
  });

  test("unresolved: today's snapshot has no price for the watched metric", () => {
    const edge = { edgeMetric: "MCX_NATGAS", edgeLevel: 280, edgeCondition: "above" };
    expect(resolveEdge(edge, { instruments: {} }).verdict).toBe("unresolved");
  });

  test("unresolved: today's snapshot has a zero/invalid price for the watched metric", () => {
    const edge = { edgeMetric: "COMEX_GOLD", edgeLevel: 3997, edgeCondition: "above" };
    expect(resolveEdge(edge, { instruments: { COMEX_GOLD: { price: 0 } } }).verdict).toBe("unresolved");
  });
});

describe("formatEdgeResultBlock", () => {
  test("renders a confirmed result", () => {
    const edge = { edgeMetric: "COMEX_GOLD", edgeLevel: 3997, edgeCondition: "above" };
    const resolution = { verdict: "confirmed", resolvedValue: 4010, reason: null };
    const block = formatEdgeResultBlock(66, edge, resolution);
    expect(block).toContain("Edition #66");
    expect(block).toContain("Confirmed");
    expect(block).toContain("4,010");
  });

  test("returns null when there is no edge to report (prior edition predates this feature)", () => {
    expect(formatEdgeResultBlock(10, {}, { verdict: "unresolved", resolvedValue: null, reason: "x" })).toBeNull();
  });
});
