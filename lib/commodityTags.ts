/**
 * lib/commodityTags.ts — pure, client-safe normalizer for the commodity
 * strings scattered across brief/article frontmatter in inconsistent forms
 * ("MCX Crude", "Crude Oil", "crude", "MCX Nat Gas", "Natural Gas", ...).
 *
 * generate-brief.js writes `tags` reliably but has never written the
 * separate `commodities` frontmatter array (confirmed dead field since at
 * least edition 54 — see components/TapeMovers.tsx's local workaround,
 * which this module replaces with one shared source of truth).
 */

export const CANONICAL_COMMODITY_KEYS = [
  'gold', 'silver', 'crude', 'copper', 'natgas', 'zinc', 'aluminium', 'lead', 'nickel',
] as const

export type CommodityKey = typeof CANONICAL_COMMODITY_KEYS[number]

const ALIASES: Record<string, CommodityKey> = {
  'gold': 'gold',
  'silver': 'silver',
  'crude': 'crude', 'crude oil': 'crude',
  'copper': 'copper',
  'natgas': 'natgas', 'nat gas': 'natgas', 'natural gas': 'natgas',
  'zinc': 'zinc',
  'aluminium': 'aluminium', 'aluminum': 'aluminium',
  'lead': 'lead',
  'nickel': 'nickel',
}

// Matches the literal strings generate-brief.js's LLM prompt and
// data/story-arcs.json actually use (confirmed via grep — "MCX NatGas", not
// "MCX Natural Gas") so brief-derived labels line up with the arc system's
// primaryCommodity/tags convention instead of silently mismatching it.
export const KEY_TO_MCX_LABEL: Record<CommodityKey, string> = {
  gold: 'MCX Gold',
  silver: 'MCX Silver',
  crude: 'MCX Crude',
  copper: 'MCX Copper',
  natgas: 'MCX NatGas',
  zinc: 'MCX Zinc',
  aluminium: 'MCX Aluminium',
  lead: 'MCX Lead',
  nickel: 'MCX Nickel',
}

// Single source of truth for commodity accent colors — was previously
// duplicated across app/articles/[slug]/page.tsx, app/events/[slug]/page.tsx
// and app/events/page.tsx, and had already drifted (natgas disagreed).
// Values match the authoritative SLUG_MAP colors in
// app/commodities/[commodity]/page.tsx.
export const COMMODITY_ACCENT_COLORS: Record<CommodityKey | 'macro', string> = {
  gold: '#B45309',
  silver: '#2B4FC7',
  crude: '#7C3AED',
  copper: '#065F46',
  natgas: '#D97706',
  zinc: '#475569',
  aluminium: '#6366F1',
  lead: '#64748B',
  nickel: '#0F766E',
  macro: '#6B21A8',
}

/** Normalizes any raw tag/commodity string ("MCX Crude", "Crude Oil", "crude") to a canonical key, or null if it isn't a commodity. */
export function normalizeCommodityValue(raw: string | null | undefined): CommodityKey | null {
  if (!raw) return null
  const cleaned = raw.toLowerCase().trim().replace(/^mcx\s+/, '')
  return ALIASES[cleaned] ?? null
}

/** Maps a tags array to the set of canonical commodity keys it references, deduped, order-preserving. */
export function deriveCommodityKeysFromTags(tags: string[] | null | undefined): CommodityKey[] {
  if (!tags?.length) return []
  const seen = new Set<CommodityKey>()
  for (const tag of tags) {
    const key = normalizeCommodityValue(tag)
    if (key) seen.add(key)
  }
  return Array.from(seen)
}

/** Same as deriveCommodityKeysFromTags but returns "MCX X" labels, matching the legacy `commodities` frontmatter shape. */
export function deriveCommodityLabelsFromTags(tags: string[] | null | undefined): string[] {
  return deriveCommodityKeysFromTags(tags).map(k => KEY_TO_MCX_LABEL[k])
}
