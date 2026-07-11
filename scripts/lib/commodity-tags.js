/**
 * scripts/lib/commodity-tags.js — plain-JS mirror of lib/commodityTags.ts.
 *
 * A duplicate, not an import, because scripts/ runs as plain Node ESM and
 * cannot resolve the Next app's TypeScript/`@/` path aliases. Keep the two
 * in sync if the alias table or label convention ever changes (see
 * lib/commodityTags.ts's KEY_TO_MCX_LABEL comment for why "MCX NatGas" and
 * not "MCX Natural Gas").
 */

const ALIASES = {
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

export const KEY_TO_MCX_LABEL = {
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

export function normalizeCommodityValue(raw) {
  if (!raw) return null
  const cleaned = String(raw).toLowerCase().trim().replace(/^mcx\s+/, '')
  return ALIASES[cleaned] ?? null
}

export function deriveCommodityKeysFromTags(tags) {
  if (!tags?.length) return []
  const seen = new Set()
  for (const tag of tags) {
    const key = normalizeCommodityValue(tag)
    if (key) seen.add(key)
  }
  return Array.from(seen)
}

export function deriveCommodityLabelsFromTags(tags) {
  return deriveCommodityKeysFromTags(tags).map(k => KEY_TO_MCX_LABEL[k])
}
