import { describe, test, expect } from "vitest";
import { briefExcerptForSemanticCheck, MAX_CHARS } from "./briefExcerpt.mjs";

describe("briefExcerptForSemanticCheck", () => {
  test("returns a typical published-brief-length text (6-8KB) in full, unclipped", () => {
    const brief = "x".repeat(7293); // edition-074's actual length
    const result = briefExcerptForSemanticCheck(brief);
    expect(result.length).toBe(7293);
    expect(result).toBe(brief);
  });

  test("does not cut off a citation placed past the old 3000-char truncation point", () => {
    const tail = "the gold-silver ratio at 70.5 is elevated versus its 90-day average.";
    const brief = "x".repeat(3500) + tail;
    const result = briefExcerptForSemanticCheck(brief);
    expect(result.endsWith(tail)).toBe(true);
  });

  test("returns short briefs unchanged", () => {
    const brief = "MCX Gold is up 0.5% today.";
    expect(briefExcerptForSemanticCheck(brief)).toBe(brief);
  });

  test("still caps a pathologically oversized input at MAX_CHARS", () => {
    const brief = "x".repeat(MAX_CHARS + 500);
    const result = briefExcerptForSemanticCheck(brief);
    expect(result.length).toBe(MAX_CHARS);
  });
});
