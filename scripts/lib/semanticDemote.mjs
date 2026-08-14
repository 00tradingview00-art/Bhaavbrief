/**
 * scripts/lib/semanticDemote.mjs — demotes a semantic-checker "block" verdict
 * to a warning when the checker's own explanation admits there is no real
 * issue. Extracted from validate-brief.mjs for testability.
 *
 * The original implementation matched an exact-substring list (e.g. "no
 * contradiction", "no block issue"). In production this repeatedly missed
 * phrasings Haiku actually produces for a genuine non-issue — "No block
 * applies here upon re-reading.", "This is consistent, no block.", "NO
 * BLOCK — this is consistent." — each blocked 2026-07-20's brief three runs
 * in a row despite the checker's own text concluding there was no problem.
 * The fix generalizes to a regex on "no block"/"no contradiction" as a
 * whole phrase (any punctuation/casing after it) instead of enumerating
 * exact substrings.
 *
 * Recurred 2026-07-27 to 2026-07-29 with phrasings the list above didn't
 * catch — Haiku walked through the math, concluded "these are consistent"
 * / "this checks out" / "acceptable as a multi-session reference", and
 * still returned severity:"block". A distinct variant of the same bug also
 * showed up repeatedly the same week: Haiku verifies every number with its
 * own "✓" checkmarks, then blocks anyway on pure narrative clarity/labeling
 * — "conflates ... without clarity", "without clear separation", "creates
 * ambiguity about which market's move is being discussed" — style/tone
 * objections its own system prompt forbids it from making. All of these are
 * the same failure mode (the severity label doesn't track the checker's own
 * reasoning), just new vocabulary each time — see semanticDemote.test.mjs
 * for the real detail strings this now covers. "conflates" is matched
 * standalone (not requiring "clarity" nearby) because every observed
 * instance of that verb described a labeling/mixing complaint, never an
 * asserted numeric mismatch.
 *
 * A more blatant version blocked 6 issues in one run the same day: each
 * detail was just "[claim]. [arithmetic]. ✓ Consistent." — Haiku's own
 * terminal word, with no complaint stated at all. Matched narrowly
 * (bare "consistent" at the very end of the string) rather than a broader
 * "correct"/"confirmed" ending pattern, since a broad version risks
 * matching a genuine "...is NOT correct." block on the trailing word alone.
 *
 * 2026-07-29: patching one new phrasing at a time is fundamentally
 * unbounded — there is always another way for Haiku to word "these two
 * numbers match." classifySemanticIssue() now also takes the two numbers
 * the checker claims are in conflict (valueA/valueB, from a schema change
 * in validate-brief.mjs's attemptSemanticCheck) and checks them
 * arithmetically in this file, in trusted code, instead of pattern-matching
 * more prose. When they're actually equal (within a tight tolerance — every
 * real defect observed so far differed by 50%+, nowhere near this), the
 * issue is demoted regardless of what words Haiku used. The regex list
 * above remains the fallback for non-numeric objections (event timing,
 * headline direction, style/labeling complaints) where there's no pair of
 * numbers to check.
 */

// Two numbers the checker claims conflict are treated as "actually equal"
// (i.e. not a real conflict) within 1% relative or 1 absolute unit,
// whichever is larger — tight enough that rounding/formatting differences
// pass, while every real defect seen in production (which differed by 50%
// or more) stays outside it.
function valuesEffectivelyEqual(a, b) {
  if (typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) || !Number.isFinite(b)) {
    return false;
  }
  return Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.01);
}

const SELF_CONTRADICTION_PATTERNS = [
  /\bno\s+block\b/i,
  /\bno\s+contradiction\b/i,
  /\bnot\s+a\s+contradiction\b/i,
  /\bconsistent\s+with\b/i,
  /\bmatches\s+snapshot\b/i,
  // "not a contradiction" broadened to tolerate an intervening qualifier —
  // 2026-07-31: "not a factual contradiction" missed the exact-adjacency
  // version of this pattern and blocked an otherwise-clean brief.
  /\bnot\s+a\s+\w+\s+contradiction\b/i,
  // Bare terminal "No issue." — same failure mode as the "Consistent."
  // terminal pattern below, anchored to end-of-string for the same reason.
  /\bno\s+issue\.?\s*$/i,
  /\bwhich\s+matches\b/i,
  /\bconsistent\.?\s*pass\b/i,
  // Negative lookbehind so "do not pass."/"cannot pass." (a genuine failed
  // check) isn't matched by the bare terminal "pass." this pattern targets —
  // 2026-08-14: an unguarded version of this regex silently demoted a real
  // contradiction ending in that phrasing.
  /(?<!not\s)(?<!n't\s)\bpass\.?\s*$/i,
  /\bchecks\s+out\b/i,
  /\bis\s+acceptable\s+as\b/i,
  /\b(?:is|are)\s+correct\s+per\s+snapshot\b/i,
  /\bare\s+consistent\b/i,
  // Style/tone objections the checker's system prompt explicitly forbids —
  // only fires on the narrow phrasing Haiku has actually produced, not on
  // any use of "clarify" (a genuine two-number contradiction that also asks
  // the writer to "clarify which is correct" must stay blocked).
  /\bwithout\s+clarity\b/i,
  /\bconflates\b/i,
  /\bwithout\s+clear\s+separation\b/i,
  /\bcreates?\s+ambiguity\b/i,
  /\bwithout\s+(?:clear\s+)?distinction\b/i,
  // Bare terminal verdict — "... ✓ Consistent." with nothing else said.
  // Anchored to end-of-string specifically so it can't match a "consistent"
  // that appears mid-detail while a different, still-live issue follows.
  // Same negation guard as the "pass" pattern above, for the same reason —
  // "are not consistent."/"aren't consistent." must stay blocked.
  /(?<!not\s)(?<!n't\s)\bconsistent\.?\s*$/i,
];

/** @param {string} detail */
export function isSelfContradicted(detail) {
  const text = (detail ?? "").trim();
  return SELF_CONTRADICTION_PATTERNS.some((re) => re.test(text));
}

/**
 * @param {"block"|"warn"} severity
 * @param {string} detail
 * @param {number|null} [valueA] - one of the two numbers the checker claims conflict
 * @param {number|null} [valueB] - the other
 * @returns {"SEMANTIC-BLOCK"|"SEMANTIC-WARN"}
 */
export function classifySemanticIssue(severity, detail, valueA = null, valueB = null) {
  if (severity !== "block") return "SEMANTIC-WARN";
  if (valuesEffectivelyEqual(valueA, valueB)) return "SEMANTIC-WARN";
  const isBlock = !isSelfContradicted(detail);
  return isBlock ? "SEMANTIC-BLOCK" : "SEMANTIC-WARN";
}
