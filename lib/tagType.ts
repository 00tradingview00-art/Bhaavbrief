import type { PillTone } from '@/components/ui/Pill'

// Consolidates the two near-duplicate getTagType() copies previously in
// app/page.tsx and app/briefs/page.tsx (this is the more complete keyword set).
export function tagTone(tag?: string): PillTone {
  if (!tag) return 'neutral'
  const t = tag.toLowerCase()
  if (t.includes('crude') || t.includes('energy') || t.includes('gas') || t.includes('oil') || t.includes('petroleum')) return 'energy'
  if (t.includes('gold') || t.includes('silver') || t.includes('copper') || t.includes('metal') || t.includes('zinc') || t.includes('bullion')) return 'metals'
  if (t.includes('macro') || t.includes('rbi') || t.includes('sebi') || t.includes('fed') || t.includes('dollar') || t.includes('rupee') || t.includes('rate')) return 'macro'
  if (t.includes('agri') || t.includes('ncdex') || t.includes('pepper') || t.includes('soy')) return 'agri'
  return 'neutral'
}
