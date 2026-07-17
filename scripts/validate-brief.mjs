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
import { checkWeekday } from "./lib/weekdayCheck.js";

const [, , snapshotPath, briefPath] = process.argv;
if (!snapshotPath || !briefPath) {
  console.error("usage: node validate-brief.mjs <snapshot.json> <brief.mdx>");
  process.exit(2); // can't even start — never a content rejection
}

if (!fs.existsSync(snapshotPath)) {
  console.error(`Snapshot not found: ${snapshotPath} — run fetch-snapshot.mjs first`);
  process.exit(2);
}
if (!fs.existsSync(briefPath)) {
  console.error(`Brief not found: ${briefPath}`);
  process.exit(2);
}

const issues = [];

// Marks a failure as "the gate itself couldn't run" (upstream API down, a check
// threw on malformed input, etc.) as distinct from "the gate ran and correctly
// rejected the content." Both block publication, but only the former should page
// a human — see the exit-code contract at the bottom of this file. Root cause of
// the 2026-07-16 missed brief: three attempts were blocked by a semantic-check API
// error with no retry and no way for the workflow to tell "gate broke" from
// "gate rejected bad content" apart, so the failure was silently swallowed as
// routine content-quality noise.
function pushInternalError(msg) {
  issues.push(`GATE_INTERNAL_ERROR: ${msg}`);
}

// Everything below (through the end of the semantic check) runs inside one
// top-level try/catch. Code-review finding: the first version of this fix only
// wrapped the two checks added alongside it (weekday, parity-warning) — a crash
// anywhere else (a malformed snapshot, a bug in an older check) still exited 1,
// the exact code the workflow treats as "gate worked, stay silent." Verified
// live: `echo '{"broken json' > x.json && node validate-brief.mjs x.json ...`
// crashed with exit 1 before this fix. Wrapping the whole body, not just the
// new checks, is what actually closes the D-04 class of gap.
try {

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const fullFile  = fs.readFileSync(briefPath, "utf8");

// Load OHLC technical levels (written by a brief generator, when present) — these
// are real Kite data but live outside the snapshot, so the validator must know about them.
const technicalsPath = snapshotPath.replace("market-snapshot.json", "brief-technicals.json");
const briefTechnicals = fs.existsSync(technicalsPath)
  ? JSON.parse(fs.readFileSync(technicalsPath, "utf8"))
  : {};

// Strip MDX frontmatter (--- ... ---) before number/date checks so frontmatter
// numeric fields (edition: 42) don't count as price references.
const fmEnd = fullFile.indexOf("---", 4);
const brief = fmEnd > 3 ? fullFile.slice(fmEnd + 3).trim() : fullFile;

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
// Add Kite OHLC technical levels — written to brief-technicals.json before the brief is
// generated, when available. These include day range, week/month highs-lows, 20-SMA,
// and nearest S/R bands — all real Kite historical data, not in the main snapshot.
for (const [inst, levels] of Object.entries(briefTechnicals)) {
  for (const [field, value] of Object.entries(levels)) {
    if (typeof value === "number" && value > IGNORE_BELOW)
      snapshotNumbers.push({ key: `tech.${inst}.${field}`, value });
  }
}
// Add COMEX/NYMEX overnight prices (USD) — written to brief-comex.json when available.
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

// 3b. Weekday sanity (D-08) — extracted into scripts/lib/weekdayCheck.js so
//     the logic is a testable pure function (see weekdayCheck.test.mjs)
//     instead of inline script logic with no regression coverage.
try {
  for (const msg of checkWeekday(brief, snapshot.generatedAt)) {
    issues.push(msg);
  }
} catch (e) {
  // A throw here (malformed snapshot.generatedAt, unreadable holidays file, etc.)
  // must not crash the process uncaught — that would skip the verdict/exit-code
  // logic below and lose the GATE_INTERNAL_ERROR signal entirely.
  pushInternalError(`weekday check threw: ${e.message}`);
}

// 3c. Parity wedge divergence (D-02): fetch-snapshot.mjs cross-checks the
//     gold and silver import-parity spreads and writes a warning to the
//     snapshot if they diverge beyond tolerance (they carry a similar duty/GST
//     structure and should track). Surfaced here as non-blocking for now —
//     the live gap (~11pts) is far past tolerance right now and the root
//     cause (which metal's feed, or the duty assumption itself, is off) isn't
//     resolved yet, so this does not block publication until that's settled.
//     Promote to a blocker by changing the "PARITY-WARN:" prefix below to
//     something not excluded by the `blockers` filter further down, once
//     confidence is established.
try {
  for (const w of snapshot.warnings ?? []) {
    if (w.type === "PARITY_WEDGE_DIVERGENCE") {
      issues.push(`PARITY-WARN: ${w.detail}`);
    }
  }
} catch (e) {
  pushInternalError(`parity warning check threw: ${e.message}`);
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

// A single attempt at the semantic check. Returns:
//   { ok: true, verdict }                       — got a parsed verdict, may still contain issues
//   { ok: false, retryable, reason }             — failed; retryable failures get one retry in semanticCheck()
async function attemptSemanticCheck() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, retryable: false, reason: "ANTHROPIC_API_KEY not set" };
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
      max_tokens: 2048,
      system:
        "You are a pre-publication fact-consistency checker for a financial morning brief. " +
        "You are NOT an editor of style or tone. You only flag clear factual self-contradictions WITHIN today's brief. " +
        "The \"issues\" array is a list of PROBLEMS ONLY. Do not walk through each check and report its outcome. " +
        "If a check passes, omit it entirely — do not add an entry that concludes 'PASS', 'consistent', or 'no contradiction'. " +
        "An empty issues array is the expected, common result for a correct brief. " +
        "Respond ONLY with JSON: {\"pass\": boolean, \"issues\": [{\"severity\": \"block\"|\"warn\", \"detail\": string}]}. " +
        "No markdown fences, no preamble.",
      messages: [
        {
          role: "user",
          content:
            `Today's date (IST): ${istDate}\n\n` +
            `MARKET SNAPSHOT (MCX closing prices only — see scope note below):\n${JSON.stringify(snapshot.instruments, null, 2)}\n\n` +
            `DERIVED VALUES (pre-computed — trust these, never recompute them yourself):\n${JSON.stringify(snapshot.derived ?? {}, null, 2)}\n\n` +
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
            "• IMPORT PARITY PREMIUM — It is entirely valid and expected for a brief to state the current MCX Gold price is X% above import parity, AND ALSO to discuss that this premium is changing/compressing/expanding during the session. These two statements use the same current price and the same import parity calculation — there is no contradiction. Discussing how a premium evolves over time is not a data inconsistency. NEVER flag import parity premium analysis as a block.\n" +
            "• UNIT DIFFERENCE — MCX Gold is quoted PER 10g; COMEX Gold is quoted PER troy oz (31.1035g). A Price Bridge table showing COMEX $X/oz alongside MCX ₹Y/10g does NOT imply direct convertibility — they are different weight units. To compare: importParityGoldINR (in snapshot derived section) = COMEX × USDINR × (10/31.1035) and represents the true COMEX equivalent in INR/10g. MCX trading at a premium over importParityGoldINR is expected and is NOT a price error. NEVER flag the Price Bridge table format as a calculation error for gold.\n" +
            "• GOLD-SILVER RATIO — MCX Gold (₹/10g) and MCX Silver (₹/kg) are quoted in different units per weight, so their ratio is NOT the gold-silver ratio — never compute it yourself from the MCX instrument prices. The correct ratio (COMEX gold $/oz ÷ COMEX silver $/oz) is precomputed in DERIVED VALUES as goldSilverRatio. If the brief states a gold-silver ratio, compare it ONLY against that derived field, not against a value you calculate from MCX prices.\n" +
            "• References to 'yesterday's edition', 'last session', 'prior close', or historical moves from previous days are NOT today's data. A historical % (e.g. 'silver fell 6.46% yesterday') cannot contradict today's snapshot %.\n" +
            "• Any price cited with a specific edition reference (e.g. 'in Edition 47', 'Edition #47', 'Edition 047') is a historical data point from a prior session — it CANNOT be compared against today's snapshot prevClose. Do NOT flag these as contradictions.\n" +
            "• A brief that uses BOTH 'yesterday's close' (matching snapshot prevClose) AND a specific prior edition's close (e.g. 'since Edition 047's close at ₹146,475') within the same analysis is NOT self-contradictory — yesterday and Edition 047 are different trading sessions with different prices. The difference is intentional multi-session context. NEVER flag this pattern as an inconsistency.\n" +
            "• Round a snapshot changePct to 2 decimal places before comparing with text. E.g. -0.4479% rounds to -0.45% — that is NOT a mismatch with '0.45%' in the text.\n" +
            "• USD/INR and other FX rates: ANY discrepancy of ≤0.20 INR between the brief and the snapshot is acceptable — this applies regardless of whether the value is labeled 'Friday close', 'prior session', 'prevClose', 'yesterday', etc. A difference of ₹0.03 or ₹0.05 or ₹0.10 is NEVER a block for FX. Only flag FX as block if discrepancy exceeds ₹0.20.\n\n" +
            "Flag as 'block' ONLY:\n" +
            "1. The SAME instrument cited at two genuinely different CURRENT (today's session) prices within today's body text — historical references (prior sessions, prior editions) are EXCLUDED from this check entirely; EXCEPT for current prices: (a) rounding differences of ≤$1 for gold/silver, ≤$0.10 for crude oil, ≤$0.01 for copper/natgas; (b) one price is the current market price and the other is explicitly labelled as a support level, resistance level, target, or price 'to watch' — a support level differing from the current price by up to 5% is legitimate technical analysis, NOT a contradiction\n" +
            "2. Event timing contradictions (e.g. 'CPI due tonight' vs 'CPI tomorrow'; wrong month label)\n" +
            "3. Headline direction word (surge/slump) directly contradicting the same instrument's data in the body\n" +
            "4. A percentage that doesn't match its own explicit from/to prices by MORE THAN 0.02 percentage points — rounding at 2 decimal places is always acceptable (e.g. '15.94% premium' when the exact value is 15.9364% is CORRECT — do NOT flag this). Only flag if the discrepancy is ≥0.03 percentage points.\n" +
            "Flag as 'warn' only:\n" +
            "5. A specific rupee or dollar number stated as fact that genuinely contradicts another number in the same brief\n" +
            "Do NOT flag: MCX vs COMEX % differences, intraday ranges, moving averages, weekly/monthly highs/lows, COMEX USD prices, historical vs today comparisons, rounding differences ≤0.05%, support/resistance levels that differ from the current price by ≤5%, style/tone.",
        },
      ],
    }),
  });

  if (!res.ok) {
    // 5xx is the upstream having a bad moment — worth a retry. 4xx (auth, bad
    // request) won't be fixed by retrying, so don't burn the attempt budget on it.
    return { ok: false, retryable: res.status >= 500, reason: `API error ${res.status}` };
  }
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .replace(/```json|```/g, "")
    .trim();
  try {
    return { ok: true, verdict: JSON.parse(text) };
  } catch {
    console.error("DEBUG raw checker response:\n" + text);
    return { ok: false, retryable: true, reason: "unparseable checker response" };
  }
}

// Retries once on a retryable failure before routing the final failure through
// GATE_INTERNAL_ERROR (see pushInternalError above) rather than an ordinary
// SEMANTIC issue — this is what makes a transient upstream 5xx alert instead of
// silently blocking publication the way it did on 2026-07-16.
async function semanticCheck() {
  const MAX_ATTEMPTS = 2;
  let result;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    result = await attemptSemanticCheck();
    if (result.ok || !result.retryable) break;
    if (attempt < MAX_ATTEMPTS) {
      console.error(`SEMANTIC: attempt ${attempt} failed (${result.reason}) — retrying...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  if (!result.ok) {
    pushInternalError(`semantic check failed: ${result.reason}`);
    return;
  }

  for (const it of result.verdict.issues ?? []) {
    const detail = (it.detail ?? "").toLowerCase();
    // Haiku sometimes returns severity:"block" but then explains in the detail that
    // there is actually no contradiction. Demote those to warnings.
    const selfContradicted =
      detail.includes("no block issue") ||
      detail.includes("no contradiction") ||
      detail.includes("no historical contradiction") ||
      detail.includes("no block on this") ||
      detail.includes("not a contradiction") ||
      detail.includes("consistent with") ||
      /\bconsistent\.?\s*pass\b/.test(detail) ||
      /\bpass\.?\s*$/.test(detail.trim()) ||
      detail.includes("matches snapshot") ||
      detail.includes("which matches");
    const isBlock = it.severity === "block" && !selfContradicted;
    issues.push(`${isBlock ? "SEMANTIC-BLOCK" : "SEMANTIC-WARN"}: ${it.detail}`);
  }
}

await semanticCheck();

} catch (e) {
  // Catches anything the specific try/catches above (weekday, parity) don't:
  // a malformed snapshot, a bug in NUMBER/DIRECTION/DATE/SLUG/COMPLIANCE, a
  // missing snapshot.instruments field, etc. Without this, any of those crash
  // uncaught with exit code 1 — indistinguishable from a legitimate content
  // rejection to the calling workflow.
  console.error("DEBUG uncaught error in publish gate:\n" + (e.stack ?? e.message));
  pushInternalError(`gate crashed: ${e.message}`);
}

// ---------------------------------------------------------------------------
// Verdict — SEMANTIC-WARN and PARITY-WARN print but don't block; everything
// else blocks.
//
// Exit code contract (the calling workflow branches on this — see
// generate-brief.yml / evening-close-brief.yml "Alert on failure" steps):
//   0 = pass
//   1 = blocked by a legitimate content rejection — the gate worked correctly,
//       stay silent (this is routine, expected, happens on real bad content)
//   2 = blocked (at least partly) because the gate itself couldn't run a check
//       (GATE_INTERNAL_ERROR present) — this must always alert a human, since
//       it means validation was skipped or degraded, not that content failed it
// ---------------------------------------------------------------------------

const NON_BLOCKING_PREFIXES = ["SEMANTIC-WARN", "PARITY-WARN"];
const blockers = issues.filter((i) => !NON_BLOCKING_PREFIXES.some((p) => i.startsWith(p)));
const hasInternalError = issues.some((i) => i.startsWith("GATE_INTERNAL_ERROR:"));

console.log("\n=== BhaavBrief publish gate ===");
if (issues.length === 0) {
  console.log("PASS — no issues found.");
} else {
  for (const i of issues) console.log(` - ${i}`);
}

if (blockers.length > 0) {
  console.error(`\nBLOCKED: ${blockers.length} blocking issue(s). Brief NOT published.`);
  process.exit(hasInternalError ? 2 : 1);
}
console.log(
  "\nPASS" +
    (issues.length ? ` (with ${issues.length} warning(s) logged above)` : "") +
    "\n"
);
process.exit(0);
