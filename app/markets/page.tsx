import MarketsClient from '@/components/markets/MarketsClient'
import { getPrices } from '@/lib/prices'

export const metadata = {
  title: 'MCX Live Prices — Gold, Silver, Crude Oil, Copper',
  description: 'Live MCX commodity prices with OHLC, Volume and Open Interest. Gold, Silver, Crude Oil, Copper and Natural Gas futures — real-time data during MCX market hours (9 AM–11:30 PM IST).',
  alternates: { canonical: 'https://bhaavbrief.in/markets' },
  openGraph: {
    title: 'MCX Live Prices — Gold, Silver, Crude Oil, Copper',
    description: 'Live MCX commodity prices with OHLC, Volume and Open Interest. Updated every 30 seconds during market hours.',
    url: 'https://bhaavbrief.in/markets',
    siteName: 'BhaavBrief',
    type: 'website' as const,
    locale: 'en_IN',
  },
  twitter: { card: 'summary' as const, title: 'MCX Live Prices | BhaavBrief', description: 'Gold, Silver, Crude Oil, Copper, Natural Gas — live MCX prices.', site: '@bhaavbrief' },
}

export const dynamic  = 'force-dynamic'
export const revalidate = 0

export default async function MarketsPage() {
  let initialPrices = null
  try { initialPrices = await getPrices() } catch { /* client will fetch on load */ }

  return <MarketsClient initialPrices={initialPrices} />
}
