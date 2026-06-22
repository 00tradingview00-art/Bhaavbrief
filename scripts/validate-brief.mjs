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

// Load OHLC technical levels written by daily-open-brief.js — these are real
// Kite data but live outside the snapshot, so the validator must know about them.
const technicalsPath = snapshotPath.replace("market-snapshot.json", "brief-technicals.json");
const briefTechnicals = fs.existsSync(technicalsPath)
  ? JSON.parse(fs.readFileSync(technicalsPath, "utf8"))
  : {};

// Strip MDX frontmatter (--- ... ---) before number/date checks so frontmatter
// numeric fields (edition: 42) don't count as price references.
const fmEnd = fullFile.indexOf("---", 4);
const brief = fmEnd > 3 ? fullFile.slice(fmEnd + 3).trim() : fullFile;

const issues = [];

// ---------------------------------------------------------------------------
// LAYER 1 — deterministic
// ---------------------------------------------------------------------------

// Match ₹/$ figures but NOT when followed by "crore" or "lakh" (those are company impact
// estimates like "₹555 crore", not commodity prices).
const moneyRe = /(?:₹|Rs\.?\s?|\$)\s?([\d,]+(?:\.\d+)?)(?!\s*(?:crore|lakh|cr\b|L\b))/gi;
const TOLERANCE    = 0.15;  // 15% — S/R bands, intraday ranges; semantic layer handles clear hallucinations
const IGNORE_BELOW = 50;    // skip "$5" prose fragments

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
// Add Kite OHLC technical levels — written to brief-technicals.json by daily-open-brief.js
// before the brief is generated. These include day range, week/month highs-lows, 20-SMA,
// and nearest S/R bands — all real Kite historical data, not in the main snapshot.
for (const [inst, levels] of Object.entries(briefTechnicals)) {
  for (const [field, value] of Object.entries(levels)) {
    if (typeof value === "number" && value > IGNORE_BELOW)
      snapshotNumbers.push({ key: `tech.${inst}.${field}`, value });
  }
}
// Add COMEX/NYMEX overnight prices (USD) — written to brief-comex.json by daily-open-brief.js.
// COMEX Gold (~$3,300/oz) and WTI Crude (~$68/bbl) are above IGNORE_BELOW but can never
// match INR snapshot values, so they need their own accepted-number pool.
const comexPath = snapshotPath.replace("market-snapshot.json", "brief-comex.json");
const briefComex = fs.existsSync(comexPath)
  ? JSON.parse(fs.readFileSync(comexPath, "utf8"))
  : {};
for (const [key, c] of Object.entries(briefComex)) {
  if (typeof c.price === "number" && c.price > 0)
    snapshotNumbers.push({ key: `comex.${key}.price`, value: c.price });
}

// Add derived spread/premium values to the acceptable pool — the AI often calculates
// MCX Gold premium over import parity (MCX Gold - importParityGoldINR) and similar
// cross-commodity spreads. These are real values not in the raw snapshot.
const mcxGold = snapshot.instruments.MCX_GOLD?.price ?? 0;
const importParity = snapshot.derived?.importParityGoldINR ?? 0;
if (mcxGold > 0 && importParity > 0) {
  const premium = Math.abs(mcxGold - importParity);
  if (premium > IGNORE_BELOW)
    snapshotNumbers.push({ key: "derived.mcxGoldImportPremium", value: premium });
}

// Pre-build a set of text positions that follow a historical-delta phrase
// (e.g. "₹2,834 decline", "fell ₹602", "down ₹1,200", "from ₹2,834", "after ₹500 gain").
// These are change amounts, not price levels, so they don't need to match a snapshot value.
const DELTA_PREFIX = /(?:fell|dropped|declined?|gained?|rose|climbed|slid|lost|up|down|from|after|since|following|over|change(?:d)?\s*(?:by)?|move(?:d)?\s*(?:by)?|(?:yesterday'?s?|prior|last.session'?s?|previous.session'?s?|prior.session'?s?)\s+\w*)\s*(?:by\s*)?$/i;
const DELTA_SUFFIX = /^\s*(?:decline|fall|drop|gain|rise|move|selloff|correction|recovery|change|appreciation|depreciation|revaluation|cushion|premium|spread|above|below)/i;
const historicalDeltaPositions = new Set();
for (const m of brief.matchAll(moneyRe)) {
  const before = brief.slice(Math.max(0, m.index - 60), m.index);
  const after  = brief.slice(m.index + m[0].length, m.index + m[0].length + 40);
  if (DELTA_PREFIX.test(before) || DELTA_SUFFIX.test(after)) {
    historicalDeltaPositions.add(m.index);
  }
}

for (const m of brief.matchAll(moneyRe)) {
  const val = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(val) || val < IGNORE_BELOW) continue;
  // Skip numbers that are historical delta amounts (change values, not price levels)
  if (historicalDeltaPositions.has(m.index)) continue;
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

// 2. Direction check: a direction word must directly modify the commodity name —
//    i.e. the commodity and direction verb appear as adjacent tokens with only
//    whitespace/punctuation between them. This prevents "Gold Surges, Crude Craters"
//    from flagging crude as "implies up" just because "surges" (for gold) is nearby.
const dirChecks = [
  { name: "gold",   inst: "MCX_GOLD"   },
  { name: "silver", inst: "MCX_SILVER" },
  { name: "crude",  inst: "MCX_CRUDE"  },
  { name: "copper", inst: "MCX_COPPER" },
];
const firstBlock = brief.slice(0, 600).toLowerCase();
// These patterns match "[commodity] [surges]" or "[surges] [commodity]" —
// only when the direction word is the direct grammatical neighbour of the name.
function buildDirRegex(name, verbPat) {
  return new RegExp(
    `(?:${name}[^a-z]{0,6}(?:${verbPat})|(?:${verbPat})[^a-z]{0,6}${name})`,
    'i'
  );
}
const UP_VERBS   = 'surge|jump|rall|gain|rise|soar|climb';
const DOWN_VERBS = 'slam|slide|crash|drop|fall|plunge|bleed|sink|rout|crater';
for (const { name, inst } of dirChecks) {
  const pct = snapshot.instruments[inst]?.changePct;
  if (pct == null) continue;
  if (pct > 0.3 && buildDirRegex(name, DOWN_VERBS).test(firstBlock))
    issues.push(`DIRECTION: headline implies ${name} down, snapshot says +${pct}%`);
  if (pct < -0.3 && buildDirRegex(name, UP_VERBS).test(firstBlock))
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
        "You are NOT an editor of style or tone. You only flag clear factual self-contradictions WITHIN today's brief. " +
        "Respond ONLY with JSON: {\"pass\": boolean, \"issues\": [{\"severity\": \"block\"|\"warn\", \"detail\": string}]}. " +
        "No markdown fences, no preamble.",
      messages: [
        {
          role: "user",
          content:
            `Today's date (IST): ${istDate}\n\n` +
            `MARKET SNAPSHOT (MCX closing prices only — see scope note below):\n${JSON.stringify(snapshot.instruments, null, 2)}\n\n` +
            `DRAFT BRIEF (first 3000 chars):\n${brief.slice(0, 3000)}\n\n` +
            "SNAPSHOT SCOPE — understand this before flagging anything:\n" +
            "The snapshot contains ONLY: MCX last traded price, previous close, and % change for 9 MCX commodities and 4 currency pairs.\n" +
            "The snapshot does NOT contain (these come from separate sources and are always valid):\n" +
            "  • Intraday ranges (day high / day low) — from Kite live quotes\n" +
            "  • 20-day SMA, weekly high/low, monthly high/low — from Kite historical OHLC\n" +
            "  • COMEX/NYMEX USD prices: Gold $/oz, Silver $/oz, WTI Crude $/bbl, Copper $/lb, NatGas $/mmBtu\n" +
            "  • USD/INR exchange rate\n" +
            "Do NOT flag any of the above categories as missing from the snapshot — they are sourced separately.\n\n" +
            "RULES — read carefully before flagging anything:\n" +
            "• MCX and COMEX are DIFFERENT markets. MCX Gold % change and COMEX Gold % change WILL differ — this is never a contradiction.\n" +
            "• MCX prices are in INR; COMEX prices are in USD. Never compare them as if they are the same.\n" +
            "• References to 'yesterday's edition', 'last session', 'prior close', or historical moves from previous days are NOT today's data. A historical % (e.g. 'silver fell 6.46% yesterday') cannot contradict today's snapshot %.\n" +
            "• Round a snapshot changePct to 2 decimal places before comparing with text. E.g. -0.4479% rounds to -0.45% — that is NOT a mismatch with '0.45%' in the text.\n" +
            "• USD/INR and other FX rates: ANY discrepancy of ≤0.20 INR between the brief and the snapshot is acceptable — this applies regardless of whether the value is labeled 'Friday close', 'prior session', 'prevClose', 'yesterday', etc. A difference of ₹0.03 or ₹0.05 or ₹0.10 is NEVER a block for FX. Only flag FX as block if discrepancy exceeds ₹0.20.\n\n" +
            "Flag as 'block' ONLY:\n" +
            "1. The SAME instrument cited at two genuinely different CURRENT prices within today's body text — EXCEPT: (a) rounding differences of ≤$1 for gold/silver, ≤$0.10 for crude oil, ≤$0.01 for copper/natgas; (b) one price is the current market price and the other is explicitly labelled as a support level, resistance level, target, or price 'to watch' — a support level differing from the current price by up to 5% is legitimate technical analysis, NOT a contradiction\n" +
            "2. Event timing contradictions (e.g. 'CPI due tonight' vs 'CPI tomorrow'; wrong month label)\n" +
            "3. Headline direction word (surge/slump) directly contradicting the same instrument's data in the body\n" +
            "4. A percentage that doesn't match its own explicit from/to prices (e.g. '5% fall from $100 to $98' — 5% is wrong)\n" +
            "Flag as 'warn' only:\n" +
            "5. A specific rupee or dollar number stated as fact that genuinely contradicts another number in the same brief\n" +
            "Do NOT flag: MCX vs COMEX % differences, intraday ranges, moving averages, weekly/monthly highs/lows, COMEX USD prices, historical vs today comparisons, rounding differences ≤0.05%, support/resistance levels that differ from the current price by ≤5%, style/tone.",
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
        detail.includes("consistent with") ||
        detail.includes("matches snapshot") ||
        detail.includes("which matches");
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
