#!/usr/bin/env node
/**
 * validate-brief.mjs — publish gate for BhaavBrief
 *
 * Usage (GitHub Actions step, after generate, before commit):
 *   node scripts/validate-brief.mjs data/market-snapshot.json content/briefs/edition-NNN.mdx
 *
 * Exit 0 = publish. Exit 1 = block, with issues printed to the job log.
 *
 * Layer 1: deterministic checks (free, instant, catches ~80%)
 * Layer 2: one Claude Haiku call for semantic contradictions (catches the rest)
 *
 * Env: ANTHROPIC_API_KEY
 */

import fs from "node:fs";

const [, , snapshotPath, briefPath] = process.argv;
if (!snapshotPath || !briefPath) {
  console.error("usage: node validate-brief.mjs <snapshot.json> <brief.mdx>");
  process.exit(1);
}

if (!fs.existsSync(snapshotPath)) {
  console.error(`Snapshot not found: ${snapshotPath} — run fetch-snapshot.mjs first`);
  process.exit(1);
}
if (!fs.existsSync(briefPath)) {
  console.error(`Brief not found: ${briefPath}`);
  process.exit(1);
}

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const fullFile  = fs.readFileSync(briefPath, "utf8");

// Strip MDX frontmatter (--- ... ---) before number/date checks so frontmatter
// numeric fields (edition: 42) don't count as price references.
const fmEnd = fullFile.indexOf("---", 4);
const brief = fmEnd > 3 ? fullFile.slice(fmEnd + 3).trim() : fullFile;

const issues = [];

// ---------------------------------------------------------------------------
// LAYER 1 — deterministic
// ---------------------------------------------------------------------------

// 1. Every ₹/$ figure in the brief body must be near a snapshot number or a known
//    derived value (price, prevClose, or intraday delta). Catches clear hallucinations.

const snapshotNumbers = [];
for (const [key, inst] of Object.entries(snapshot.instruments)) {
  if (inst.price     > 0) snapshotNumbers.push({ key: `${key}.price`,     value: inst.price });
  if (inst.prevClose > 0) snapshotNumbers.push({ key: `${key}.prevClose`, value: inst.prevClose });
  // Also accept intraday dollar/rupee deltas — they appear in "fell $170" style sentences
  if (inst.price > 0 && inst.prevClose > 0) {
    const delta = Math.abs(inst.price - inst.prevClose);
    if (delta > 0) snapshotNumbers.push({ key: `${key}.delta`, value: delta });
  }
}
for (const [key, value] of Object.entries(snapshot.derived ?? {})) {
  if (typeof value === "number" && value > 0)
    snapshotNumbers.push({ key: `derived.${key}`, value });
}

// Match ₹/$ figures but NOT when followed by "crore" or "lakh" (those are company impact
// estimates like "₹555 crore", not commodity prices).
const moneyRe = /(?:₹|Rs\.?\s?|\$)\s?([\d,]+(?:\.\d+)?)(?!\s*(?:crore|lakh|cr\b|L\b))/gi;
const TOLERANCE    = 0.15;  // 15% — S/R bands, intraday ranges; semantic layer handles clear hallucinations
const IGNORE_BELOW = 50;    // skip "$5" prose fragments

for (const m of brief.matchAll(moneyRe)) {
  const val = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(val) || val < IGNORE_BELOW) continue;
  const near = snapshotNumbers.some(
    (s) => Math.abs(val - s.value) / s.value <= TOLERANCE
  );
  // Round numbers are legitimate S/R level references (₹150,000 gold, ₹500 NatGas, $95 WTI etc.)
  const isRoundLevel = (val >= 1000 && val % 500 === 0) || (val >= 50 && val % 25 === 0);
  if (!near && !isRoundLevel) {
    issues.push(
      `NUMBER: "${m[0]}" not within ${TOLERANCE * 100}% of any snapshot value or delta — hallucinated or stale?`
    );
  }
}

// 2. Direction check: headline words must not contradict signed changePct data.
const dirChecks = [
  { name: "gold",   inst: "MCX_GOLD"   },
  { name: "silver", inst: "MCX_SILVER" },
  { name: "crude",  inst: "MCX_CRUDE"  },
  { name: "copper", inst: "MCX_COPPER" },
];
const firstBlock = brief.slice(0, 600).toLowerCase();
const UP   = /(surge|jump|rall|gain|rise|soar|climb)/;
const DOWN = /(slam|slide|crash|drop|fall|plunge|bleed|sink|rout)/;
for (const { name, inst } of dirChecks) {
  const pct = snapshot.instruments[inst]?.changePct;
  if (pct == null) continue;
  const idx = firstBlock.indexOf(name);
  if (idx === -1) continue;
  const ctx = firstBlock.slice(Math.max(0, idx - 40), idx + 60);
  if (pct > 0.3 && DOWN.test(ctx))
    issues.push(`DIRECTION: headline implies ${name} down, snapshot says +${pct}%`);
  if (pct < -0.3 && UP.test(ctx))
    issues.push(`DIRECTION: headline implies ${name} up, snapshot says ${pct}%`);
}

// 3. Date sanity: brief must reference the snapshot's own calendar month/year.
//    We check the FULL file (including frontmatter) so the date: "YYYY-MM-DD"
//    field also counts as a match.
const istDate = new Date(snapshot.generatedAt).toLocaleDateString("en-GB", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "long",
  year: "numeric",
}); // e.g. "10 June 2026"
const [, monthName, yearNum] = istDate.split(" ");
if (!fullFile.includes(monthName) && !fullFile.includes(yearNum)) {
  issues.push(
    `DATE: brief never mentions "${monthName}" or "${yearNum}" (snapshot date ${istDate})`
  );
}

// 4. Slug guard: catches the "27-ay2026" class of bug before it mints a bad URL.
//    This is now fixed in fetch-snapshot + slug generator but keep as a safety net.
const slugRe = /\b\d{1,2}-?ay-?20\d{2}\b|\b-(an|eb|ar|pr|ay|un|ul|ug|ep|ct|ov|ec)20\d{2}\b/;
if (slugRe.test(fullFile)) {
  issues.push("SLUG: malformed month fragment detected (the 'ay2026' bug class)");
}

// 5. Banned phrasing: advice-shaped language on a non-SEBI-registered platform.
const banned = [
  /is (now |it )?the (right )?time to (buy|invest)/i,
  /\b(should you|we recommend|buy now|sell now)\b/i,
];
for (const re of banned) {
  const hit = brief.match(re);
  if (hit)
    issues.push(
      `COMPLIANCE: advice-shaped phrase "${hit[0]}" — reframe as context, not a call`
    );
}

// ---------------------------------------------------------------------------
// LAYER 2 — semantic pass (one Claude Haiku call)
// ---------------------------------------------------------------------------

async function semanticCheck() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    issues.push("SEMANTIC: ANTHROPIC_API_KEY not set — failing closed");
    return;
  }

  // Use Haiku for speed + cost efficiency on this validation task
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system:
        "You are a pre-publication fact-consistency checker for a financial morning brief. " +
        "You are NOT an editor of style or tone. You only flag factual self-contradictions. " +
        "Respond ONLY with JSON: {\"pass\": boolean, \"issues\": [{\"severity\": \"block\"|\"warn\", \"detail\": string}]}. " +
        "No markdown fences, no preamble.",
      messages: [
        {
          role: "user",
          content:
            `Today's date (IST): ${istDate}\n\n` +
            `MARKET SNAPSHOT (the only valid numbers):\n${JSON.stringify(snapshot.instruments, null, 2)}\n\n` +
            `DRAFT BRIEF (first 3000 chars):\n${brief.slice(0, 3000)}\n\n` +
            "Flag as 'block':\n" +
            "1. Two different prices for the same instrument anywhere in the text\n" +
            "2. Event timing contradictions (e.g. 'CPI due tonight' vs 'CPI tomorrow'; wrong month label)\n" +
            "3. Headline direction contradicting body data\n" +
            "4. A percentage that doesn't match its own from/to prices\n" +
            "Flag as 'warn':\n" +
            "5. Historical claims stated as fact with specific numbers that cannot be sourced from the snapshot\n" +
            "Ignore style, tone, word choice, and any Hinglish phrases.",
        },
      ],
    }),
  });

  if (!res.ok) {
    issues.push(`SEMANTIC: API error ${res.status} — failing closed (manual review required)`);
    return;
  }
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .replace(/```json|```/g, "")
    .trim();
  try {
    const verdict = JSON.parse(text);
    for (const it of verdict.issues ?? []) {
      const detail = (it.detail ?? "").toLowerCase();
      // Haiku sometimes returns severity:"block" but then explains in the detail that
      // there is actually no contradiction. Demote those to warnings.
      const selfContradicted =
        detail.includes("no block issue") ||
        detail.includes("no contradiction") ||
        detail.includes("no block on this") ||
        detail.includes("not a contradiction") ||
        detail.includes("consistent with");
      const isBlock = it.severity === "block" && !selfContradicted;
      issues.push(`${isBlock ? "SEMANTIC-BLOCK" : "SEMANTIC-WARN"}: ${it.detail}`);
    }
  } catch {
    issues.push("SEMANTIC: unparseable checker response — failing closed");
  }
}

await semanticCheck();

// ---------------------------------------------------------------------------
// Verdict — SEMANTIC-WARN prints but doesn't block; everything else blocks.
// ---------------------------------------------------------------------------

const blockers = issues.filter((i) => !i.startsWith("SEMANTIC-WARN"));

console.log("\n=== BhaavBrief publish gate ===");
if (issues.length === 0) {
  console.log("PASS — no issues found.");
} else {
  for (const i of issues) console.log(` - ${i}`);
}

if (blockers.length > 0) {
  console.error(`\nBLOCKED: ${blockers.length} blocking issue(s). Brief NOT published.`);
  process.exit(1);
}
console.log(
  "\nPASS" +
    (issues.length ? ` (with ${issues.length} warning(s) logged above)` : "") +
    "\n"
);
process.exit(0);
