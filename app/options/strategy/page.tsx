import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import StrategyBuilder from '@/components/mcx/StrategyBuilder'
import { auth } from '@clerk/nextjs/server'
import { isProUser } from '@/lib/subscription'
import { safeJsonLd } from '@/lib/seo'

export const dynamic = 'force-dynamic'

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'MCX Options Strategy Builder',
      url: 'https://bhaavbrief.in/options/strategy',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (web browser)',
      description: 'Build and analyse multi-leg MCX commodity options strategies with live payoff diagrams and IV regime signals.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      provider: { '@id': 'https://bhaavbrief.in/#organization' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'Options', item: 'https://bhaavbrief.in/options' },
        { '@type': 'ListItem', position: 3, name: 'Strategy Builder' },
      ],
    },
  ],
}

export const metadata: Metadata = {
  title: 'MCX Options Strategy Builder — BhaavBrief',
  description: 'Build and analyse multi-leg MCX commodity options strategies with live payoff diagrams and IV regime signals.',
  keywords: [
    'MCX options strategy India',
    'MCX bull call spread',
    'MCX straddle strangle',
    'MCX options payoff calculator',
    'MCX options strategy builder India',
    'MCX commodity options hedging',
    'MCX covered call India',
    'MCX options multi-leg strategy',
    'MCX gold silver crude options strategy',
  ],
}

const VALID_INSTRUMENTS = ['GOLD', 'GOLDM', 'SILVER', 'SILVERM', 'CRUDEOIL', 'CRUDEOILM', 'NATURALGAS', 'COPPER']

// StrategyBuilder's instrument codes → data/market-structure.json's key scheme
const MARGIN_KEY_MAP: Record<string, string> = {
  GOLD: 'gold', SILVER: 'silver', CRUDEOIL: 'crude', NATURALGAS: 'natgas', COPPER: 'copper',
}

// Mini contracts deliberately aren't added to data/market-structure.json —
// that file is a much larger shared content resource (commodities SEO pages,
// keyword-article generation, site-guardian) with a rich per-commodity schema;
// adding sparse mini-only entries there risks half-populated data reaching
// those other consumers. These figures are sourced from this site's own
// /learn/mcx-margin-calculator page (same real SPAN margin ranges shown
// there), kept local to where they're actually used.
const MINI_MARGIN_FALLBACK: Record<string, string> = {
  GOLDM:     '₹55,000–75,000',
  SILVERM:   '₹25,000–40,000',
  CRUDEOILM: '₹3,000–5,000',
}

function loadMarginByInstrument(): Record<string, string | null> {
  const file = path.join(process.cwd(), 'data/market-structure.json')
  const marketStructure = JSON.parse(fs.readFileSync(file, 'utf8'))
  return {
    ...Object.fromEntries(
      Object.entries(MARGIN_KEY_MAP).map(([code, key]) => [code, marketStructure[key]?.typicalMargin ?? null]),
    ),
    ...MINI_MARGIN_FALLBACK,
  }
}

export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ instrument?: string }>
}) {
  const { instrument } = await searchParams
  const defaultInstrument = VALID_INSTRUMENTS.includes(instrument?.toUpperCase() ?? '')
    ? instrument!.toUpperCase()
    : 'GOLD'
  const marginByInstrument = loadMarginByInstrument()
  const { userId } = await auth()
  const isPro = await isProUser(userId ?? null)
  // Keyed on defaultInstrument: StrategyBuilder seeds its `instrument` state
  // from this prop once (useState's initial-value pattern) and never re-syncs
  // it — a key forces a full remount (fully resetting internal state) if this
  // page's instance is ever reused across a ?instrument= change without a
  // remount happening on its own, rather than silently keeping stale legs/
  // chain data for the instrument the page loaded with.
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(SCHEMA) }} />
      <StrategyBuilder key={defaultInstrument} defaultInstrument={defaultInstrument} marginByInstrument={marginByInstrument} isPro={isPro} />
    </>
  )
}
