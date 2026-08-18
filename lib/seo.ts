/**
 * SEO utilities for BhaavBrief
 * Centralises all keyword and metadata logic
 */

import { truncateSeoTitle } from '../scripts/lib/seo-title.js'

export const BASE_URL = 'https://bhaavbrief.in'

// High-intent keywords for commodity intelligence in India
// Mapped to search volume priority
export const CORE_KEYWORDS = {
  high: [
    'MCX commodity prices today',
    'crude oil price India today',
    'gold price MCX today',
    'mandi bhav today',
    'commodity market India',
  ],
  medium: [
    'NCDEX agri prices',
    'commodity intelligence India',
    'MCX trading analysis',
    'commodity newsletter India',
    'silver price MCX today',
    'copper price MCX',
    'natural gas price MCX',
  ],
  long_tail: [
    'why is crude oil price rising today India',
    'MCX gold price tomorrow prediction',
    'commodity market analysis for Indian traders',
    'bhaav commodity prices India',
    'MCX options analysis India',
    'geopolitical impact on commodity prices India',
    'NCDEX soybean price today',
    'monsoon impact on commodity prices India',
  ],
}

// Rendered via title:{absolute} in app/briefs/[slug]/page.tsx so layout.tsx's
// "%s | BhaavBrief" template suffix doesn't add back the length truncateSeoTitle
// removes. Truncation logic lives in scripts/lib/seo-title.js so the plain-Node
// brief generator can share it too (can't import this .ts file directly).
export function buildBriefTitle(title: string): string {
  return truncateSeoTitle(title)
}

// Generate keyword-rich description
export function buildBriefDescription(summary: string, commodities: string[], date: string): string {
  const dateFormatted = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const commodityStr  = commodities?.join(', ') || 'MCX Commodities'
  return `${summary} ${commodityStr} intelligence and analysis for ${dateFormatted}. BhaavBrief — India's daily commodity brief for MCX traders.`
}

// Canonical URL builder
export function canonicalUrl(path: string): string {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

// Safely serialize a schema.org object for a <script type="application/ld+json"> tag.
// JSON.stringify escapes JSON syntax but not HTML — a stray "<" in AI-generated text
// (e.g. a brief title or FAQ answer) can prematurely close the </script> tag and corrupt
// the block. Escaping "<" to its unicode form prevents that without altering the JSON value.
export function safeJsonLd(schema: unknown): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}

// OpenGraph image URL builder
export function ogImageUrl(slug?: string): string {
  if (slug) return `${BASE_URL}/og/briefs/${slug}.png`
  return `${BASE_URL}/og-default.png`
}
