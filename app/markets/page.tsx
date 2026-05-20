import { Suspense } from 'react'
import PricesTable from '@/components/markets/PricesTable'
import PriceCards from '@/components/markets/PriceCards'
import RefPanel from '@/components/markets/RefPanel'

export const metadata = {
  title: 'Markets — BhaavBrief',
  description: 'Live MCX, COMEX, NYMEX and LME commodity prices with USD/INR and key macro rates.',
}

export const revalidate = 0

export default function MarketsPage() {
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, color: 'var(--ink)', margin: '0 0 4px' }}>
            Markets
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            MCX · COMEX · NYMEX · LME reference prices · Refreshes every 15 min
          </p>
        </div>
        <span className="live-dot" style={{ fontSize: 12, color: 'var(--up)', fontWeight: 500 }}>
          Live
        </span>
      </div>

      {/* Price cards */}
      <Suspense fallback={<PriceCardsSkeleton />}>
        <PriceCards />
      </Suspense>

      {/* Two-column: table + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, marginTop: 32, alignItems: 'start' }}>
        <Suspense fallback={<TableSkeleton />}>
          <PricesTable />
        </Suspense>
        <Suspense fallback={<RefSkeleton />}>
          <RefPanel />
        </Suspense>
      </div>
    </div>
  )
}

function PriceCardsSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
      {Array(6).fill(0).map((_, i) => (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', height: 100 }} />
      ))}
    </div>
  )
}

function TableSkeleton() {
  return <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, height: 400 }} />
}

function RefSkeleton() {
  return <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, height: 300 }} />
}
