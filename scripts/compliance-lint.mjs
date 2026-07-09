#!/usr/bin/env node
/**
 * compliance-lint.mjs — SEBI banned-phrase gate for BhaavBrief
 *
 * BhaavBrief operates without SEBI Research Analyst / Investment Adviser
 * registration. Generated content must be descriptive/statistical/educational
 * only — never a buy/sell/hold call, a price target, or a directive. This
 * script is the programmatic gate that enforces that, run on every generated
 * brief before publish (and in CI on any PR/push touching brief content).
 *
 * Usage:
 *   node scripts/compliance-lint.mjs <snapshot.json> <brief.mdx>
 *
 * Exit 0 = clean. Exit 1 = blocked, with every offending line printed.
 *
 * Mirrors validate-brief.mjs's CLI shape and issue-array/exit-code
 * conventions so the two scripts slot into the pipeline identically.
 * validate-brief.mjs's own 2 banned-phrase regexes are left untouched —
 * this script is the canonical superset going forward.
 */

import fs from "node:fs";

const [, , snapshotPath, briefPath] = process.argv;
if (!snapshotPath || !briefPath) {
  console.error("usage: node compliance-lint.mjs <snapshot.json> <brief.mdx>");
  process.exit(1);
}

if (!fs.existsSync(briefPath)) {
  console.error(`Brief not found: ${briefPath}`);
  process.exit(1);
}

const fullFile = fs.readFileSync(briefPath, "utf8");

// Strip MDX frontmatter (--- ... ---), same convention as validate-brief.mjs.
const fmEnd = fullFile.indexOf("---", 4);
let brief = fmEnd > 3 ? fullFile.slice(fmEnd + 3).trim() : fullFile;

// Strip the mandatory compliance disclaimer appended by generate-brief.js —
// it's boilerplate legal text (not generated prose) and contains phrases like
// "buy, sell, or hold recommendation" / "consult a registered advisor" that
// would otherwise trip this very linter.
const DISCLAIMER_MARKER = "*BhaavBrief is not a SEBI-registered";
const disclaimerIdx = brief.indexOf(DISCLAIMER_MARKER);
if (disclaimerIdx !== -1) {
  brief = brief.slice(0, disclaimerIdx);
}

const issues = [];

// ---------------------------------------------------------------------------
// Context-aware allowlist — educational/pattern-name phrases that must never
// be flagged even though they share vocabulary with banned advisory phrases.
// ---------------------------------------------------------------------------

const ALLOWLIST_PATTERNS = [
  /\b(bullish|bearish)\s+(engulfing|harami|hammer|doji|divergence|crossover|flag|pennant|reversal(?:\s+pattern)?|continuation(?:\s+pattern)?|candle(?:stick)?)\b/gi,
  /\b(golden|death)\s+cross\b/gi,
];

function protectedSpans(text) {
  const spans = [];
  for (const re of ALLOWLIST_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      spans.push([m.index, m.index + m[0].length]);
      if (m[0].length === 0) re.lastIndex++; // guard against zero-width loops
    }
  }
  return spans;
}

function overlapsProtected(index, length, spans) {
  const end = index + length;
  return spans.some(([s, e]) => index < e && end > s);
}

const guardedSpans = protectedSpans(brief);

// ---------------------------------------------------------------------------
// Banned-phrase bank
// ---------------------------------------------------------------------------

const BANNED = [
  // 1. Directive-at-reader — imperative/second-person action verbs
  { category: "DIRECTIVE", re: /\byou should (buy|sell|accumulate|exit|enter|hold|book profits?)\b/gi },
  { category: "DIRECTIVE", re: /\btraders? should (buy|sell|accumulate|exit|enter|hold|book profits?)\b/gi },
  { category: "DIRECTIVE", re: /\b(buy|sell) (now|the dip|this dip)\b/gi },
  { category: "DIRECTIVE", re: /\b(consider|time to|should) book(?:ing)? profits?\b/gi },
  { category: "DIRECTIVE", re: /\b(add|accumulate) on dips?\b/gi },

  // 2. Target / stop-loss as a recommendation — only when paired with a level
  { category: "TARGET", re: /\b(stop[- ]?loss|SL|target price|price target)\b[^.]{0,25}(₹|\$|\d)/gi },

  // 3. Bullish/bearish as a stated view (allowlist-protected above)
  { category: "STANCE", re: /\bwe (?:are|remain|stay|turn(?:ed)?) (bullish|bearish)\b/gi },
  { category: "STANCE", re: /\b(bullish|bearish) on\b/gi },
  { category: "STANCE", re: /\b(bullish|bearish) (stance|view|bias|outlook)\b/gi },
  { category: "STANCE", re: /\bturn(?:ing)? (bullish|bearish)\b/gi },

  // 4. Predictive/directive framing
  { category: "PREDICTIVE", re: /\bwill (rally|crash|surge|plunge|soar|tank)\b/gi },
  { category: "PREDICTIVE", re: /\b(likely|expected|set) to (rise|fall|rally|crash|move (?:up|down))\b/gi },
  { category: "PREDICTIVE", re: /\bshould (go|move|head) (up|down|higher|lower)\b/gi },
  { category: "PREDICTIVE", re: /\bexpect(?:ed)? (?:prices? )?to (rise|fall)\b/gi },

  // 5. Advisory-language markers
  { category: "ADVISORY", re: /\b(sure[- ]?shot|multibagger|hot tip|our advice is|our recommendation is|trading call|this is a (?:buy|sell) call)\b/gi },
];

for (const { category, re } of BANNED) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(brief)) !== null) {
    if (!overlapsProtected(m.index, m[0].length, guardedSpans)) {
      issues.push(`COMPLIANCE-${category}: "${m[0]}"`);
    }
    if (m[0].length === 0) re.lastIndex++;
  }
}

// ---------------------------------------------------------------------------
// Verdict — every issue blocks. There is no "advisory-only" warn tier for a
// hard legal constraint.
// ---------------------------------------------------------------------------

console.log("\n=== BhaavBrief compliance lint ===");
if (issues.length === 0) {
  console.log("PASS — no banned phrases found.\n");
  process.exit(0);
}

for (const i of issues) console.log(` - ${i}`);
console.error(`\nBLOCKED: ${issues.length} compliance issue(s). Brief NOT published.\n`);
process.exit(1);
