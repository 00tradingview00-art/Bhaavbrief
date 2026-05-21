import { getPrices } from '@/lib/prices'

function fmtUsd(v: number, decimals = 2): string {
  if (!v) return '—'
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

function fmtInr(v: number): string {
  if (!v) return '—'
  return `₹${v.toFixed(2)}`
}

function fmtNum(v: number, decimals = 2): string {
  if (!v) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export default async function RefPanel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: Record<string, any> = (await getPrices() ?? {}) as Record<string, any>

  const globalRef = [
    { name: 'COMEX Gold',      value: fmtUsd(p.comexGold, 0) },
    { name: 'COMEX Silver',    value: fmtUsd(p.comexSilver) },
    { name: 'WTI Crude',       value: fmtUsd(p.wti) },
    { name: 'Brent Crude',     value: fmtUsd(p.brent) },
    { name: 'Henry Hub Gas',   value: fmtUsd(p.henryHub) },
    { name: 'LME Copper',      value: p.copper?.lme > 0 ? `$${Math.round(p.copper.lme).toLocaleString('en-US')}` : '—' },
    { name: 'LME Aluminium',   value: p.aluminium?.lme > 0 ? `$${Math.round(p.aluminium.lme).toLocaleString('en-US')}` : '—' },
  ]

  const macroRates = [
    { name: 'USD / INR',       value: fmtInr(p.usdinr) },
    { name: 'DXY Index',       value: fmtNum(p.dxy) },
    { name: '10Y US Treasury', value: p.treasury10y > 0 ? `${p.treasury10y.toFixed(2)}%` : '—' },
    { name: 'RBI Repo Rate',   value: '6.00%' },
    { name: 'Sensex',          value: p.sensex > 0 ? Math.round(p.sensex).toLocaleString('en-IN') : '—' },
    { name: 'Nifty 50',        value: p.nifty > 0 ? Math.round(p.nifty).toLocaleString('en-IN') : '—' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <RefCard title="Global Reference" rows={globalRef} />
      <RefCard title="Key Rates" rows={macroRates} />
    </div>
  )
}

function RefCard({ title, rows }: { title: string; rows: { name: string; value: string }[] }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
      <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 14 }}>
        {title}
      </p>
      {rows.map(({ name, value }) => (
        <div key={name} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 0', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{value}</span>
        </div>
      ))}
    </div>
  )
}
