import MarketsClient from '@/components/markets/MarketsClient'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'

export const metadata = {
  title: 'MCX Live Prices Today — Gold, Silver, Crude Oil, Copper | BhaavBrief',
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

export const dynamic  = 'force-dynamic'
export const revalidate = 0

export default async function MarketsPage() {
  const snap = loadSnapshot()
  const initialPrices = snap ? snapshotToPriceData(snap) : null
  return <MarketsClient initialPrices={initialPrices} />
}
