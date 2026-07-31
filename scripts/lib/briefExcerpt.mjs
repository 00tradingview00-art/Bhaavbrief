/**
 * scripts/lib/briefExcerpt.mjs — builds the brief text handed to the Layer 2
 * semantic checker (validate-brief.mjs). Previously that call hardcoded
 * `brief.slice(0, 3000)`, but published briefs run 6,000-8,000+ chars, so the
 * checker was silently blind to roughly the back half of every brief. A
 * citation of a derived value (e.g. goldSilverRatio) placed past char 3000
 * arrived at the checker mid-sentence, which it correctly reported as
 * unverifiable — and that sometimes came back as a false SEMANTIC-BLOCK
 * (2026-07-31, edition #76: gold-silver ratio citation cut off, "Incomplete
 * text prevents validation"). MAX_CHARS here is a sanity ceiling against a
 * pathological input, not a truncation window — it sits well above any
 * observed brief length so real briefs are never cut.
 */

export const MAX_CHARS = 20000;

/** @param {string} brief - brief body (frontmatter already stripped) */
export function briefExcerptForSemanticCheck(brief) {
  return brief.length <= MAX_CHARS ? brief : brief.slice(0, MAX_CHARS);
}
