import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Regression test for the briefType gate added to validate-brief.mjs
// (2026-08-14): G-04 (Price Bridge), G-11 (STRUCTURE), and G-08 (CONTINUITY/
// edition numbering) are morning-daily-brief-only checks that were made
// unconditional when introduced (2026-07-17), silently blocking every
// evening close brief since — see scripts/evening-close-brief.js's own
// 4-section, non-numeric-edition format vs. the 9-section, numbered-edition
// format these checks expect. Runs the real CLI as a subprocess (the script
// is not structured as importable functions) with ANTHROPIC_API_KEY cleared
// so the semantic-check layer short-circuits without a network call.

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VALIDATE_SCRIPT = path.join(ROOT, "scripts/validate-brief.mjs");

let tmpDir, snapshotPath, briefPath;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-brief-test-"));
  snapshotPath = path.join(tmpDir, "snapshot.json");
  briefPath = path.join(tmpDir, "brief.mdx");

  fs.writeFileSync(
    snapshotPath,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      generatedAtIST: "test",
      source: "test",
      instruments: {
        MCX_GOLD:    { price: 141000, prevClose: 140800, changePct: 0.14 },
        MCX_SILVER:  { price: 217000, prevClose: 216000, changePct: 0.46 },
        MCX_CRUDE:   { price: 7800,   prevClose: 7750,   changePct: 0.65 },
        USDINR:      { price: 95.4,   prevClose: 95.3,   changePct: 0.10 },
        COMEX_GOLD:  { price: 4400,   prevClose: 4390,   changePct: 0.23 },
        WTI:         { price: 82,     prevClose: 81,     changePct: 1.23 },
      },
      derived: {},
      warnings: [],
    })
  );

  // Deliberately shaped like a real evening close brief: 4 sections, none of
  // which match any morning-brief required header, and a non-numeric edition
  // — exactly what scripts/evening-close-brief.js actually produces.
  fs.writeFileSync(
    briefPath,
    `---
title: "Test Evening Close Brief"
date: "${new Date().toISOString()}"
edition: "evening-brief"
---

## What Moved

Gold and silver drifted lower today.

## Why It Moved

Dollar strength weighed on metals.

## What It Means

Traders should watch tomorrow's US CPI print.

## Tomorrow's Setup

Watch COMEX opening levels around 8pm IST.
`
  );
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function runGate(briefType) {
  const args = [VALIDATE_SCRIPT, snapshotPath, briefPath];
  if (briefType) args.push(briefType);
  try {
    const stdout = execFileSync("node", args, {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, ANTHROPIC_API_KEY: "" },
    });
    return stdout;
  } catch (e) {
    return (e.stdout ?? "") + (e.stderr ?? "");
  }
}

describe("validate-brief.mjs — briefType gate", () => {
  test("evening-close type: G-04/G-11/G-08 (morning-only checks) do not fire on a 4-section, non-numeric-edition brief", () => {
    const output = runGate("evening-close");
    expect(output).not.toMatch(/STRUCTURE:/);
    expect(output).not.toMatch(/CONTINUITY:/);
    expect(output).not.toMatch(/BRIDGE:/);
  });

  test("default (morning) type: the exact same brief still gets blocked by G-04/G-11/G-08 as before", () => {
    const output = runGate(); // no type arg — default/backward-compatible behavior
    expect(output).toMatch(/STRUCTURE: required section "Price Bridge" is missing/);
    expect(output).toMatch(/STRUCTURE: required section "Macro Thread" is missing/);
    expect(output).toMatch(/STRUCTURE: required section "Who Is Affected" is missing/);
    expect(output).toMatch(/CONTINUITY: brief frontmatter is missing an edition or date field/);
  });
});
