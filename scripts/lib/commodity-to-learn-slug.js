/**
 * scripts/lib/commodity-to-learn-slug.js — maps a brief's primary commodity
 * (from deriveCommodityLabelsFromTags(), see commodity-tags.js) to one
 * related-reading link appended to the brief body.
 *
 * Gold and copper get topic-specific destinations closed against real GSC
 * demand gaps (see docs/postmortems — copper has no dedicated /learn page,
 * "what is mcx gold" is the worst-ranking gold query despite gold being the
 * best-covered commodity). Silver, Crude and Natural Gas have no dedicated
 * /learn page at all (checked against lib/learn-link-map.js's full allow-list
 * — every entry there is a generic MCX-mechanics page, not commodity-specific),
 * so there's no topic-specific link to give them; they fall back to a pool of
 * generic-but-genuinely-relevant pages instead. Each commodity alternates
 * through its options by edition number so consecutive same-commodity
 * editions don't always link the identical page.
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

// Widened from 2 to 5 entries (2026-08) so Silver/Crude/Natural Gas/macro
// editions — the majority of briefs — spread link equity across more of the
// existing /learn pages instead of concentrating it on just two.
const FALLBACK = [
  { href: '/learn/mcx-lot-sizes', label: 'MCX Lot Sizes Guide' },
  { href: '/learn/mcx-margin-calculation', label: 'MCX Margin Calculation Guide' },
  { href: '/learn/mcx-trading-hours', label: 'MCX Trading Hours (IST)' },
  { href: '/learn/mcx-contract-expiry', label: 'MCX Contract Expiry Explained' },
  { href: '/learn/mcx-commodity-tax-india', label: 'MCX Commodity Tax Guide' },
]

export function getRelatedLink(commodities, edition) {
  if (!commodities?.length) return null
  const options = LINKS[commodities[0]] ?? FALLBACK
  const n = Number(edition)
  const idx = Number.isFinite(n) ? n % options.length : 0
  return options[idx] ?? null
}
