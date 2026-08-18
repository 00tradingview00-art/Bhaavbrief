/**
 * scripts/lib/seo-title.js — single source of truth for the brief SEO
 * <title> length rule, shared by lib/seo.ts (TS, allowJs:true can import
 * this) and scripts/generate-brief.js (plain Node, can't import .ts).
 *
 * SEO guideline is ~60 chars before Google truncates in the SERP.
 */

export const SEO_TITLE_MAX = 60

export function truncateSeoTitle(title) {
  if (title.length <= SEO_TITLE_MAX) return title
  const cut = title.slice(0, SEO_TITLE_MAX)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
}
