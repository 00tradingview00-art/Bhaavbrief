'use client'

import { useState } from 'react'

const INSTRUMENTS = {
  GOLD:       { label: 'Gold',         unit: 'INR/10g',   lotSize: 100,  tickSize: 1,    tickValue: 100,  priceMin: 80000,  priceMax: 200000, placeholder: '141000' },
  SILVER:     { label: 'Silver',       unit: 'INR/kg',    lotSize: 30,   tickSize: 1,    tickValue: 30,   priceMin: 60000,  priceMax: 150000, placeholder: '96000'  },
  CRUDEOIL:   { label: 'Crude Oil',    unit: 'INR/bbl',   lotSize: 100,  tickSize: 1,    tickValue: 100,  priceMin: 2000,   priceMax: 12000,  placeholder: '6500'   },
  NATURALGAS: { label: 'Natural Gas',  unit: 'INR/mmBtu', lotSize: 1250, tickSize: 0.1,  tickValue: 125,  priceMin: 100,    priceMax: 800,    placeholder: '380'    },
  COPPER:     { label: 'Copper',       unit: 'INR/kg',    lotSize: 2500, tickSize: 0.05, tickValue: 125,  priceMin: 600,    priceMax: 1500,   placeholder: '860'    },
} as const

type InstrumentKey = keyof typeof INSTRUMENTS

function isPriceUnusual(price: number, min: number, max: number) {
  return price < min || price > max
}

export default function PLCalculatorClient() {
  const [instrument, setInstrument] = useState<InstrumentKey>('GOLD')
  const [lots,       setLots]       = useState(1)
  const [buyPrice,   setBuyPrice]   = useState<string>(INSTRUMENTS.GOLD.placeholder)
  const [sellPrice,  setSellPrice]  = useState<string>(INSTRUMENTS.GOLD.placeholder)
  const [side,       setSide]       = useState<'long' | 'short'>('long')

  const meta   = INSTRUMENTS[instrument]
  const buy    = parseFloat(buyPrice)
  const sell   = parseFloat(sellPrice)
  const hasVal = Number.isFinite(buy) && Number.isFinite(sell) && buy > 0 && sell > 0 && lots > 0

  const pnl = hasVal
    ? (side === 'long' ? sell - buy : buy - sell) * meta.lotSize * lots
    : null

  const priceWarning = hasVal && (
    isPriceUnusual(buy, meta.priceMin, meta.priceMax) ||
    isPriceUnusual(sell, meta.priceMin, meta.priceMax)
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.75rem', borderRadius: 6,
    border: '1px solid var(--border)', fontSize: '0.9rem', boxSizing: 'border-box',
    fontFamily: 'var(--font-mono)', background: 'var(--surface)',
    color: 'var(--ink)',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 5,
  }

  return (
    <div style={{ display: 'grid', gap: '0.9rem', fontFamily: 'var(--font-sans)' }}>
      <div>
        <label style={labelStyle}>Commodity</label>
        <select value={instrument} onChange={e => setInstrument(e.target.value as InstrumentKey)} style={{ ...inputStyle, fontFamily: 'var(--font-sans)' }}>
          {Object.entries(INSTRUMENTS).map(([k, v]) => (
            <option key={k} value={k}>{v.label} ({v.unit})</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Position</label>
          <select value={side} onChange={e => setSide(e.target.value as 'long' | 'short')} style={{ ...inputStyle, fontFamily: 'var(--font-sans)' }}>
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
            type="number"
            placeholder={meta.placeholder}
            value={buyPrice}
            onChange={e => setBuyPrice(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>{side === 'long' ? 'Sell Price' : 'Buy Price'} ({meta.unit})</label>
          <input
            type="number"
            placeholder={meta.placeholder}
            value={sellPrice}
            onChange={e => setSellPrice(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {priceWarning && (
        <div style={{
          padding: '0.65rem 0.9rem', borderRadius: 6,
          background: '#FFFBEB', border: '1px solid #FDE68A',
          fontSize: '0.8rem', color: '#92400E', lineHeight: 1.4,
        }}>
          ⚠ Price looks unusual for MCX {meta.label} (typical range: ₹{meta.priceMin.toLocaleString('en-IN')}–₹{meta.priceMax.toLocaleString('en-IN')} {meta.unit}). Please double-check your entry.
        </div>
      )}

      {pnl !== null && (
        <div style={{
          padding: '1.25rem', borderRadius: 8, textAlign: 'center',
          background: pnl >= 0 ? 'var(--up-bg)' : 'var(--down-bg)',
          border: `1px solid ${pnl >= 0 ? '#A7F3D0' : '#FECACA'}`,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.25rem', fontWeight: 700, color: pnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
            {pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ink-3)', marginTop: 5, fontFamily: 'var(--font-sans)' }}>
            {lots} lot{lots > 1 ? 's' : ''} × {meta.lotSize} {meta.unit.split('/')[1]} × ₹{Math.abs(side === 'long' ? parseFloat(sellPrice) - parseFloat(buyPrice) : parseFloat(buyPrice) - parseFloat(sellPrice)).toFixed(2)} per unit
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.75rem', color: 'var(--ink-3)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
        <strong>Lot size:</strong> {meta.lotSize} {meta.unit.split('/')[1]} ·{' '}
        <strong>Tick:</strong> ₹{meta.tickSize} → ₹{meta.tickValue} per tick per lot ·{' '}
        <strong>Margin:</strong> see <a href="/learn/mcx-margin-calculator" style={{ color: 'var(--gold)' }}>margin calculator</a>
      </div>
    </div>
  )
}
