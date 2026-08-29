'use client'

import { useState } from 'react'

const INSTRUMENTS = {
  GOLD:       { label: 'Gold',         unit: 'INR/10g',   lotSize: 100,  tickSize: 1,    tickValue: 100   },
  SILVER:     { label: 'Silver',       unit: 'INR/kg',    lotSize: 30,   tickSize: 1,    tickValue: 30    },
  CRUDEOIL:   { label: 'Crude Oil',    unit: 'INR/bbl',   lotSize: 100,  tickSize: 1,    tickValue: 100   },
  NATURALGAS: { label: 'Natural Gas',  unit: 'INR/mmBtu', lotSize: 1250, tickSize: 0.1,  tickValue: 125   },
  COPPER:     { label: 'Copper',       unit: 'INR/kg',    lotSize: 2500, tickSize: 0.05, tickValue: 125   },
} as const

type InstrumentKey = keyof typeof INSTRUMENTS

export default function PLCalculatorClient() {
  const [instrument, setInstrument] = useState<InstrumentKey>('GOLD')
  const [lots,       setLots]       = useState(1)
  const [buyPrice,   setBuyPrice]   = useState('')
  const [sellPrice,  setSellPrice]  = useState('')
  const [side,       setSide]       = useState<'long' | 'short'>('long')

  const meta   = INSTRUMENTS[instrument]
  const buy    = parseFloat(buyPrice)
  const sell   = parseFloat(sellPrice)
  const hasVal = Number.isFinite(buy) && Number.isFinite(sell) && buy > 0 && sell > 0 && lots > 0

  const pnl = hasVal
    ? (side === 'long' ? sell - buy : buy - sell) * meta.lotSize * lots
    : null

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.75rem', borderRadius: 6,
    border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600, opacity: 0.7, marginBottom: 4,
  }

  return (
    <div style={{ display: 'grid', gap: '0.9rem' }}>
      <div>
        <label style={labelStyle}>Commodity</label>
        <select value={instrument} onChange={e => setInstrument(e.target.value as InstrumentKey)} style={inputStyle}>
          {Object.entries(INSTRUMENTS).map(([k, v]) => (
            <option key={k} value={k}>{v.label} ({v.unit})</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Position</label>
          <select value={side} onChange={e => setSide(e.target.value as 'long' | 'short')} style={inputStyle}>
            <option value="long">Long (Buy first)</option>
            <option value="short">Short (Sell first)</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Lots</label>
          <input
            type="number" min={1} value={lots}
            onChange={e => setLots(Math.max(1, parseInt(e.target.value) || 1))}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>{side === 'long' ? 'Buy Price' : 'Sell Price'} ({meta.unit})</label>
          <input
            type="number" placeholder="0.00" value={buyPrice}
            onChange={e => setBuyPrice(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>{side === 'long' ? 'Sell Price' : 'Buy Price'} ({meta.unit})</label>
          <input
            type="number" placeholder="0.00" value={sellPrice}
            onChange={e => setSellPrice(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {pnl !== null && (
        <div style={{
          padding: '1rem', borderRadius: 8, textAlign: 'center',
          background: pnl >= 0 ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${pnl >= 0 ? '#bbf7d0' : '#fecaca'}`,
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: pnl >= 0 ? '#15803d' : '#dc2626' }}>
            {pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.65, marginTop: 4 }}>
            {lots} lot{lots > 1 ? 's' : ''} × {meta.lotSize} {meta.unit.split('/')[1]} × ₹{Math.abs(side === 'long' ? parseFloat(sellPrice) - parseFloat(buyPrice) : parseFloat(buyPrice) - parseFloat(sellPrice)).toFixed(2)} per unit
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.75rem', opacity: 0.55, borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
        <strong>Lot size:</strong> {meta.lotSize} {meta.unit.split('/')[1]} ·{' '}
        <strong>Tick:</strong> ₹{meta.tickSize} → ₹{meta.tickValue} per tick per lot ·{' '}
        <strong>Margin:</strong> see <a href="/learn/mcx-margin-calculator" style={{ color: '#1a1a1a' }}>margin calculator</a>
      </div>
    </div>
  )
}
