import { describe, test, expect } from "vitest";
import { buildHashtags } from "./reelHashtags.mjs";

const BRAND = ["#BhaavBrief", "#MCX", "#CommodityMarkets", "#IndianMarkets", "#MCXTrading"];

describe("buildHashtags", () => {
  test("no topical tags — falls back to brand tags, capped", () => {
    expect(buildHashtags([], BRAND)).toEqual(BRAND.slice(0, 5));
  });

  test("one topical tag fits ahead of brand tags", () => {
    expect(buildHashtags(["#MCXGold"], BRAND)).toEqual([
      "#MCXGold", "#BhaavBrief", "#MCX", "#CommodityMarkets", "#IndianMarkets",
    ]);
  });

  test("three topical tags never exceed the cap", () => {
    const result = buildHashtags(["#MCXGold", "#MCXSilver", "#Geopolitics"], BRAND);
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result).toContain("#BhaavBrief");
  });

  test("five or more topical tags still leave room for #BhaavBrief", () => {
    const many = ["#A", "#B", "#C", "#D", "#E", "#F"];
    const result = buildHashtags(many, BRAND);
    expect(result.length).toBe(5);
    expect(result).toContain("#BhaavBrief");
  });

  test("dedupes topical tags that overlap with brand tags", () => {
    const result = buildHashtags(["#MCX", "#MCXGold"], BRAND);
    expect(new Set(result).size).toBe(result.length);
  });

  test("respects a custom cap", () => {
    expect(buildHashtags(["#MCXGold"], BRAND, 3)).toEqual(["#MCXGold", "#BhaavBrief", "#MCX"]);
  });
});
