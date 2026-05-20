// Static reference panel — update values manually or wire to API
export default function RefPanel() {
  const globalRef = [
    { name: 'COMEX Gold',      value: '—' },
    { name: 'COMEX Silver',    value: '—' },
    { name: 'WTI Crude',       value: '—' },
    { name: 'Brent Crude',     value: '—' },
    { name: 'Henry Hub Gas',   value: '—' },
    { name: 'LME Copper',      value: '—' },
    { name: 'LME Aluminium',   value: '—' },
  ]

  const macroRates = [
    { name: 'USD / INR',       value: '—' },
    { name: 'DXY Index',       value: '—' },
    { name: '10Y US Treasury', value: '—' },
    { name: 'RBI Repo Rate',   value: '6.00%' },
    { name: 'Sensex',          value: '—' },
    { name: 'Nifty 50',        value: '—' },
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
