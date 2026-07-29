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
 * showed up: Haiku confirmed a price was "correct per snapshot" and then
 * blocked anyway on pure narrative clarity ("conflates ... without
 * clarity") — a style/tone objection its own system prompt forbids it from
 * making. Both are the same failure mode (the severity label doesn't track
 * the checker's own reasoning), just new vocabulary — see
 * semanticDemote.test.mjs for the real detail strings this now covers.
 */

const SELF_CONTRADICTION_PATTERNS = [
  /\bno\s+block\b/i,
  /\bno\s+contradiction\b/i,
  /\bnot\s+a\s+contradiction\b/i,
  /\bconsistent\s+with\b/i,
  /\bmatches\s+snapshot\b/i,
  /\bwhich\s+matches\b/i,
  /\bconsistent\.?\s*pass\b/i,
  /\bpass\.?\s*$/i,
  /\bchecks\s+out\b/i,
  /\bis\s+acceptable\s+as\b/i,
  /\b(?:is|are)\s+correct\s+per\s+snapshot\b/i,
  /\bare\s+consistent\b/i,
  // Style/tone objections the checker's system prompt explicitly forbids —
  // only fires on the narrow phrasing Haiku has actually produced, not on
  // any use of "clarify" (a genuine two-number contradiction that also asks
  // the writer to "clarify which is correct" must stay blocked).
  /\bwithout\s+clarity\b/i,
  /\bconflates\b.*\bclarity\b/i,
];

/** @param {string} detail */
export function isSelfContradicted(detail) {
  const text = (detail ?? "").trim();
  return SELF_CONTRADICTION_PATTERNS.some((re) => re.test(text));
}

/**
 * @param {"block"|"warn"} severity
 * @param {string} detail
 * @returns {"SEMANTIC-BLOCK"|"SEMANTIC-WARN"}
 */
export function classifySemanticIssue(severity, detail) {
  const isBlock = severity === "block" && !isSelfContradicted(detail);
  return isBlock ? "SEMANTIC-BLOCK" : "SEMANTIC-WARN";
}
