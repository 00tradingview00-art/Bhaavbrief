import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getCloses } from "./historyReader.mjs";

let dir;

function writeDay(date, instruments) {
  fs.writeFileSync(path.join(dir, `${date}.json`), JSON.stringify({ instruments }));
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "historyReader-test-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("getCloses", () => {
  test("returns closes oldest to newest", () => {
    writeDay("2026-07-01", { MCX_GOLD: { price: 141000 } });
    writeDay("2026-07-02", { MCX_GOLD: { price: 141500 } });
    writeDay("2026-07-03", { MCX_GOLD: { price: 142000 } });
    expect(getCloses("MCX_GOLD", 30, dir)).toEqual([141000, 141500, 142000]);
  });

  test("requesting more days than files exist returns what's available, doesn't crash", () => {
    writeDay("2026-07-01", { MCX_GOLD: { price: 141000 } });
    writeDay("2026-07-02", { MCX_GOLD: { price: 141500 } });
    expect(getCloses("MCX_GOLD", 30, dir)).toEqual([141000, 141500]);
  });

  test("slices to only the most recent N days", () => {
    writeDay("2026-07-01", { MCX_GOLD: { price: 100 } });
    writeDay("2026-07-02", { MCX_GOLD: { price: 200 } });
    writeDay("2026-07-03", { MCX_GOLD: { price: 300 } });
    expect(getCloses("MCX_GOLD", 2, dir)).toEqual([200, 300]);
  });

  test("skips a malformed/corrupt day file instead of throwing", () => {
    writeDay("2026-07-01", { MCX_GOLD: { price: 141000 } });
    fs.writeFileSync(path.join(dir, "2026-07-02.json"), "{not valid json");
    writeDay("2026-07-03", { MCX_GOLD: { price: 142000 } });
    expect(getCloses("MCX_GOLD", 30, dir)).toEqual([141000, 142000]);
  });

  test("skips a day where the instrument key is absent", () => {
    writeDay("2026-07-01", { MCX_GOLD: { price: 141000 } });
    writeDay("2026-07-02", { USDINR: { price: 95.5 } }); // no MCX_GOLD this day
    writeDay("2026-07-03", { MCX_GOLD: { price: 142000 } });
    expect(getCloses("MCX_GOLD", 30, dir)).toEqual([141000, 142000]);
  });

  test("skips a non-finite or non-positive price", () => {
    writeDay("2026-07-01", { MCX_GOLD: { price: 141000 } });
    writeDay("2026-07-02", { MCX_GOLD: { price: 0 } });
    writeDay("2026-07-03", { MCX_GOLD: { price: -50 } });
    writeDay("2026-07-04", { MCX_GOLD: { price: NaN } });
    writeDay("2026-07-05", { MCX_GOLD: { price: 142000 } });
    expect(getCloses("MCX_GOLD", 30, dir)).toEqual([141000, 142000]);
  });

  test("ignores non-date-named files in the directory", () => {
    writeDay("2026-07-01", { MCX_GOLD: { price: 141000 } });
    fs.writeFileSync(path.join(dir, "README.md"), "not a snapshot");
    fs.writeFileSync(path.join(dir, "latest.json"), JSON.stringify({ instruments: { MCX_GOLD: { price: 999999 } } }));
    expect(getCloses("MCX_GOLD", 30, dir)).toEqual([141000]);
  });

  test("returns empty array when the directory doesn't exist", () => {
    expect(getCloses("MCX_GOLD", 30, "/nonexistent/path/xyz")).toEqual([]);
  });

  test("returns empty array for a falsy instrument key", () => {
    writeDay("2026-07-01", { MCX_GOLD: { price: 141000 } });
    expect(getCloses("", 30, dir)).toEqual([]);
    expect(getCloses(undefined, 30, dir)).toEqual([]);
  });

  test("works for a non-MCX key like USDINR", () => {
    writeDay("2026-07-01", { USDINR: { price: 95.1 } });
    writeDay("2026-07-02", { USDINR: { price: 95.6 } });
    expect(getCloses("USDINR", 30, dir)).toEqual([95.1, 95.6]);
  });
});
