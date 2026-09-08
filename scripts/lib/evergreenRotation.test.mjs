import { describe, test, expect } from "vitest";
import { pickNextEvergreenType } from "./evergreenRotation.mjs";

describe("pickNextEvergreenType", () => {
  test("no prior state defaults to learn", () => {
    expect(pickNextEvergreenType(null)).toBe("learn");
    expect(pickNextEvergreenType(undefined)).toBe("learn");
  });

  test("a corrupted/unrecognized value self-heals to learn", () => {
    expect(pickNextEvergreenType("bogus")).toBe("learn");
    expect(pickNextEvergreenType("")).toBe("learn");
  });

  test("toggles from learn to campaign", () => {
    expect(pickNextEvergreenType("learn")).toBe("campaign");
  });

  test("toggles from campaign to learn", () => {
    expect(pickNextEvergreenType("campaign")).toBe("learn");
  });

  test("a real sequence alternates strictly with no repeats", () => {
    let last = null;
    const sequence = [];
    for (let i = 0; i < 6; i++) {
      last = pickNextEvergreenType(last);
      sequence.push(last);
    }
    expect(sequence).toEqual(["learn", "campaign", "learn", "campaign", "learn", "campaign"]);
  });
});
