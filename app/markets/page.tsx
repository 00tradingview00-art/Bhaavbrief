import MarketsClient from '@/components/markets/MarketsClient'
import { getPrices } from '@/lib/prices'

export const metadata = {
  title: 'Markets — BhaavBrief',
  description: 'Live MCX commodity prices with OHLC, Volume, Open Interest, and global reference rates.',
}

export const dynamic  = 'force-dynamic'
export const revalidate = 0

export default async function MarketsPage() {
  let initialPrices = null
  try { initialPrices = await getPrices() } catch { /* client will fetch on load */ }

  return <MarketsClient initialPrices={initialPrices} />
}
