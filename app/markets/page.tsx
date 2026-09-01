import MarketsClient from '@/components/markets/MarketsClient'
import SectionTabs from '@/components/SectionTabs'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'
import { loadEIA } from '@/lib/eia'
import { getSparklineCloses } from '@/lib/history'
import { safeJsonLd } from '@/lib/seo'

const SPARKLINE_COMMODITIES = ['gold', 'silver', 'crude', 'copper', 'natgas']

export const metadata = {
  title: 'MCX Live Prices Today — Gold, Silver, Crude Oil, Copper',
  description: 'MCX live prices today: Gold, Silver, Crude Oil, Copper, Natural Gas, Zinc, Lead, Aluminium, Nickel futures with OHLC, Volume and Open Interest. Updated every 30 seconds during market hours (9 AM–11:30 PM IST).',
  keywords: [
    'MCX live prices today',
    'MCX gold price live India',
    'MCX crude oil price today',
    'MCX silver price live',
    'MCX copper natural gas price',
    'MCX zinc price live India',
    'MCX lead price today India',
    'MCX aluminium price live',
    'MCX nickel price today India',
    'MCX OHLC volume open interest',
    'commodity futures price India',
    'MCX market hours India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/markets' },
  openGraph: {
    title: 'MCX Live Prices — Gold, Silver, Crude, Zinc, Nickel | BhaavBrief',
    description: 'Live MCX commodity prices with OHLC, Volume and Open Interest. Gold, Silver, Crude, Copper, Zinc, Lead, Aluminium, Nickel — updated every 30 seconds.',
    url: 'https://bhaavbrief.in/markets',
    siteName: 'BhaavBrief',
    type: 'website' as const,
    locale: 'en_IN',
  },
  twitter: { card: 'summary' as const, title: 'MCX Live Prices | BhaavBrief', description: 'Gold, Silver, Crude Oil, Copper, Natural Gas — live MCX prices with OHLC and open interest.', site: '@bhaavbrief' },
}

export const revalidate = 30

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Dataset',
      '@id': 'https://bhaavbrief.in/markets',
      name: 'MCX Live Prices',
      description: 'Live MCX commodity futures prices — Gold, Silver, Crude Oil, Copper, Natural Gas, Zinc, Lead, Aluminium, Nickel — with OHLC, Volume, and Open Interest, updated every 30 seconds during market hours.',
      url: 'https://bhaavbrief.in/markets',
      creator: { '@type': 'Organization', name: 'BhaavBrief', url: 'https://bhaavbrief.in' },
      variableMeasured: ['Open', 'High', 'Low', 'Close', '% Change', 'Volume', 'Open Interest'],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'MCX Live Prices' },
      ],
    },
  ],
}

export default async function MarketsPage() {
  const snap = loadSnapshot()
  const initialPrices = snap ? snapshotToPriceData(snap) : null
  const eiaData = await loadEIA()
  const sparklines = Object.fromEntries(
    SPARKLINE_COMMODITIES.map(key => [key, getSparklineCloses(key)])
  )
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(SCHEMA) }} />
      <SectionTabs
        active="/markets"
        tabs={[
          { label: 'Futures', href: '/markets' },
          { label: 'Basis',   href: '/basis' },
        ]}
      />
      <MarketsClient initialPrices={initialPrices} eiaData={eiaData} sparklines={sparklines} />
    </>
  )
}
