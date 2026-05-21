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

  return (
    <>
      <div style={{
        fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.65,
        padding: '10px 14px', marginBottom: 20,
        background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6,
      }}>
        <strong style={{ color: 'var(--ink-3)' }}>For educational purposes only.</strong>{' '}
        Prices may be delayed. Not investment advice. BhaavBrief is not SEBI registered.
      </div>
      <MarketsClient initialPrices={initialPrices} />
    </>
  )
}
