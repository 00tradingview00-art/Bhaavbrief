import { describe, test, expect } from "vitest";
import { getExpiredCoreInstruments } from "./instrumentExpiryCheck.mjs";

describe("getExpiredCoreInstruments", () => {
  test("flags a core instrument whose expiry is today or earlier", () => {
    const instruments = { gold: { symbol: "GOLD26AUGFUT", expiry: "2026-08-05" } };
    const expired = getExpiredCoreInstruments(instruments, "2026-08-05");
    expect(expired).toEqual([{ key: "gold", symbol: "GOLD26AUGFUT", expiry: "2026-08-05" }]);
  });

  test("flags an instrument that expired before today", () => {
    const instruments = { gold: { symbol: "GOLD26AUGFUT", expiry: "2026-08-01" } };
    expect(getExpiredCoreInstruments(instruments, "2026-08-05").length).toBe(1);
  });

  test("does not flag an instrument that expires in the future", () => {
    const instruments = { gold: { symbol: "GOLD26OCTFUT", expiry: "2026-10-05" } };
    expect(getExpiredCoreInstruments(instruments, "2026-08-05")).toEqual([]);
  });

  test("flags multiple expired core instruments independently", () => {
    const instruments = {
      gold:   { symbol: "GOLD26AUGFUT",   expiry: "2026-08-05" },
      silver: { symbol: "SILVER26AUGFUT", expiry: "2026-08-05" },
      crude:  { symbol: "CRUDEOIL26SEPFUT", expiry: "2026-09-19" },
    };
    const expired = getExpiredCoreInstruments(instruments, "2026-08-06");
    expect(expired.map((e) => e.key)).toEqual(["gold", "silver"]);
  });

  test("ignores non-core instruments even if expired", () => {
    const instruments = { zinc: { symbol: "ZINC26JULFUT", expiry: "2026-07-31" } };
    expect(getExpiredCoreInstruments(instruments, "2026-08-05")).toEqual([]);
  });

  test("handles a missing instruments object or missing entries gracefully", () => {
    expect(getExpiredCoreInstruments(undefined, "2026-08-05")).toEqual([]);
    expect(getExpiredCoreInstruments({}, "2026-08-05")).toEqual([]);
    expect(getExpiredCoreInstruments({ gold: {} }, "2026-08-05")).toEqual([]);
  });
});
