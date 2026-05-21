import { getPrices } from '@/lib/prices'

type ExchangeKey = 'MCX' | 'COMEX' | 'NYMEX' | 'LME'

interface PriceRow {
  commodity: string
  exchange: ExchangeKey
  priceKey: string
  pctKey: string
  highKey?: string
  lowKey?: string
  formatPrice: (v: number) => string
}

const ROWS: PriceRow[] = [
  { commodity: 'Gold',        exchange: 'MCX',   priceKey: 'gold.mcx',       pctKey: 'gold.mcxChangePct',    formatPrice: v => `₹${v.toLocaleString('en-IN')}` },
  { commodity: 'Gold',        exchange: 'COMEX', priceKey: 'gold.comex',     pctKey: 'gold.comexChangePct',  formatPrice: v => `$${v.toLocaleString('en-US')}` },
  { commodity: 'Silver',      exchange: 'MCX',   priceKey: 'silver.mcx',     pctKey: 'silver.mcxChangePct',  formatPrice: v => `₹${v.toLocaleString('en-IN')}` },
  { commodity: 'Silver',      exchange: 'COMEX', priceKey: 'silver.comex',   pctKey: 'silver.comexChangePct',formatPrice: v => `$${v.toFixed(2)}` },
  { commodity: 'Crude Oil',   exchange: 'MCX',   priceKey: 'crude.mcx',      pctKey: 'crude.mcxChangePct',   formatPrice: v => `₹${v.toLocaleString('en-IN')}` },
  { commodity: 'WTI Crude',   exchange: 'NYMEX', priceKey: 'crude.wti',      pctKey: 'crude.wtiChangePct',   formatPrice: v => `$${v.toFixed(2)}` },
  { commodity: 'Brent Crude', exchange: 'NYMEX', priceKey: 'crude.brent',    pctKey: 'crude.brentChangePct', formatPrice: v => `$${v.toFixed(2)}` },
  { commodity: 'Copper',      exchange: 'MCX',   priceKey: 'copper.mcx',     pctKey: 'copper.mcxChangePct',  formatPrice: v => `₹${v.toFixed(2)}` },
  { commodity: 'Copper',      exchange: 'LME',   priceKey: 'copper.lme',     pctKey: 'copper.lmeChangePct',  formatPrice: v => `$${v.toLocaleString('en-US')}` },
  { commodity: 'Nat Gas',     exchange: 'MCX',   priceKey: 'natgas.mcx',     pctKey: 'natgas.mcxChangePct',  formatPrice: v => `₹${v.toFixed(2)}` },
  { commodity: 'Aluminium',   exchange: 'LME',   priceKey: 'aluminium.lme',  pctKey: 'aluminium.lmeChangePct',formatPrice: v => `$${v.toLocaleString('en-US')}` },
]

const EXCHANGE_BADGE: Record<ExchangeKey, { bg: string; color: string }> = {
  MCX:   { bg: '#FFF3E0', color: '#B45309' },
  COMEX: { bg: '#F0F4FF', color: '#2B4FC7' },
  NYMEX: { bg: '#F3F0FF', color: '#6B21A8' },
  LME:   { bg: '#EFFAF4', color: '#166534' },
}

function getNestedValue(obj: Record<string, unknown>, path: string): number {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj) as number ?? 0
}

export default async function PricesTable() {
  const prices = (await getPrices() ?? {}) as unknown as Record<string, unknown>

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          Full Price Table
        </span>
        <span className="live-dot" style={{ fontSize: 11, color: 'var(--up)', fontWeight: 500 }}>Live</span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            {['Commodity', 'Exchange', 'Price', '1D Change', '52W High', '52W Low'].map(h => (
              <th key={h} style={{
                fontSize: 10, fontWeight: 500, letterSpacing: '0.6px',
                textTransform: 'uppercase', color: 'var(--ink-4)',
                padding: '10px 16px', textAlign: 'left',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => {
            const price = getNestedValue(prices, row.priceKey)
            const pct = getNestedValue(prices, row.pctKey)
            const isUp = pct >= 0
            const badge = EXCHANGE_BADGE[row.exchange]

            return (
              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                  {row.commodity}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 3,
                    letterSpacing: '0.3px',
                    background: badge.bg, color: badge.color,
                  }}>
                    {row.exchange}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>
                  {price > 0 ? row.formatPrice(price) : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {price > 0 ? (
                    <span style={{ fontSize: 12, fontWeight: 500, color: isUp ? 'var(--up)' : 'var(--down)' }}>
                      {isUp ? '▲ +' : '▼ '}{pct.toFixed(2)}%
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>—</td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>—</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
