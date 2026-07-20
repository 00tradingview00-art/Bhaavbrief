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
