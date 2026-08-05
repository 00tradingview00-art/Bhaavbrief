/**
 * scripts/lib/commodity-to-learn-slug.js — maps a brief's primary commodity
 * (from deriveCommodityLabelsFromTags(), see commodity-tags.js) to one
 * related-reading link appended to the brief body.
 *
 * Gold and copper get topic-specific destinations closed against real GSC
 * demand gaps (see docs/postmortems — copper has no dedicated /learn page,
 * "what is mcx gold" is the worst-ranking gold query despite gold being the
 * best-covered commodity). Everything else falls back to the two flagship
 * /learn pages docs/LEARN_SEO_ARCHITECTURE.md prioritized. Each commodity
 * alternates between its two options by edition number so consecutive
 * same-commodity editions don't always link the identical page.
 */

const LINKS = {
  'MCX Gold': [
    { href: '/learn/mcx-gold-contracts', label: 'MCX Gold Contracts Guide' },
    { href: '/articles/2026-07-03-what-is-mcx-gold', label: 'What Is MCX Gold?' },
  ],
  'MCX Copper': [
    { href: '/articles/2026-07-03-mcx-copper-margin', label: 'MCX Copper Margin Explained' },
  ],
}

const FALLBACK = [
  { href: '/learn/mcx-lot-sizes', label: 'MCX Lot Sizes Guide' },
  { href: '/learn/mcx-margin-calculation', label: 'MCX Margin Calculation Guide' },
]

export function getRelatedLink(commodities, edition) {
  if (!commodities?.length) return null
  const options = LINKS[commodities[0]] ?? FALLBACK
  const n = Number(edition)
  const idx = Number.isFinite(n) ? n % options.length : 0
  return options[idx] ?? null
}
