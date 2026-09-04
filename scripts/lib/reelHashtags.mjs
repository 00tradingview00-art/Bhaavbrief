/**
 * scripts/lib/reelHashtags.mjs — caps an Instagram Reel's hashtag count at a
 * fixed limit. Every reel generator was independently concatenating topical
 * tags with a fixed set of brand tags with no cap, so tagged content could
 * carry 6-10 hashtags — over the 5-tag limit the 2026 algorithm penalizes
 * ("stuffing suppresses reach"). One tested implementation instead of a
 * separate copy per generator.
 */

/**
 * @param {string[]} topicalTags - content-specific tags, most relevant first
 * @param {string[]} brandTags - always-on fixed tags, most important first
 * @param {number} cap - max total hashtags (default 5)
 * @returns {string[]} deduped, capped list — topical tags first (more useful
 *   for discovery), brand tags filling remaining slots. At least one brand
 *   tag slot is always reserved, so the lead brand tag never gets crowded out
 *   by topical tags alone.
 */
export function buildHashtags(topicalTags, brandTags, cap = 5) {
  const topical = [...new Set(topicalTags)].slice(0, Math.max(cap - 1, 0))
  return [...new Set([...topical, ...brandTags])].slice(0, cap)
}
