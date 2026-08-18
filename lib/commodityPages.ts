/**
 * Shared commodity → page mapping, extracted from app/briefs/[slug]/page.tsx
 * so app/arcs/[id]/page.tsx (and any future caller) don't each keep their own
 * copy. Keys are the commodity label strings used across content data —
 * includes both "MCX Natural Gas" (briefs/commodities) and "MCX NatGas"
 * (data/story-arcs.json uses the shorter form) pointing at the same page.
 */

export const COMMODITY_PAGE_MAP: Record<string, { slug: string; label: string }> = {
  'MCX Gold':        { slug: 'gold',        label: 'MCX Gold' },
  'MCX Silver':      { slug: 'silver',      label: 'MCX Silver' },
  'MCX Crude':       { slug: 'crude-oil',   label: 'MCX Crude Oil' },
  'MCX Copper':      { slug: 'copper',      label: 'MCX Copper' },
  'MCX Natural Gas': { slug: 'natural-gas', label: 'MCX Natural Gas' },
  'MCX NatGas':      { slug: 'natural-gas', label: 'MCX Natural Gas' },
}

// Map from commodity page slug → MCX options API instrument key
export const SLUG_TO_INSTRUMENT: Record<string, string> = {
  'gold':        'GOLD',
  'silver':      'SILVER',
  'crude-oil':   'CRUDEOIL',
  'copper':      'COPPER',
  'natural-gas': 'NATURALGAS',
}
