import type { CoreInstrument, TerminalInstrumentData } from '@/lib/terminalData'
import { CORE_INSTRUMENTS } from '@/lib/terminalData'
import type { PriceData } from '@/lib/prices'

interface Props {
  terminalData: Record<CoreInstrument, TerminalInstrumentData | null>
  prices:       PriceData | null
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

// Market Pulse ships numeric facts only — no "why" narrative. A composite
// iVIX regime read (Calm/Elevated/Stress) would need a real historical
// distribution to compare today's reading against; no such series exists
// here without pulling in the Redis iv-hist store used by the Pro-gated IV
// Rank feature (app/tools/mcx-iv-rank), which is itself a paid feature this
// page shouldn't give away for free. So: today's composite level and vol
// premium only, not a regime label or a 30-day range claim.
export default function MarketPulsePanel({ terminalData, prices }: Props) {
  const ivixValues = CORE_INSTRUMENTS
    .map(i => terminalData[i]?.ivix)
    .filter((v): v is number => v !== null && v !== undefined)
  const volPremiumValues = CORE_INSTRUMENTS
    .map(i => terminalData[i]?.volPremium)
    .filter((v): v is number => v !== null && v !== undefined)

  const compositeIvix = avg(ivixValues)
  const compositeVolPremium = avg(volPremiumValues)

  const usdinr = prices?.usdinr ?? 0
  const usdinrPct = prices?.usdinrChangePct ?? 0
  const usdinrUp = usdinrPct >= 0

  return (
    <div className="terminal-pulse-grid" style={{
      display: 'grid', gap: 1,
      background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden',
    }}>
      <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
          MCX Composite iVIX
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
          {compositeIvix !== null ? compositeIvix.toFixed(1) + '%' : '—'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          Simple average of implied volatility across Gold, Silver, Crude, Nat Gas, Copper
        </div>
      </div>

      <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
          Composite Vol Premium
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 600,
          color: compositeVolPremium === null ? 'var(--ink)' : compositeVolPremium >= 0 ? 'var(--up)' : 'var(--down)',
        }}>
          {compositeVolPremium !== null ? `${compositeVolPremium >= 0 ? '+' : ''}${compositeVolPremium.toFixed(1)}pp` : '—'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          Implied vol (iVIX) minus 20-day realized vol (AAV), averaged across the 5 instruments
        </div>
      </div>

      <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
          USD/INR
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
          {usdinr > 0 ? usdinr.toFixed(2) : '—'}
        </div>
        <div style={{ fontSize: 11, color: usdinr > 0 ? (usdinrUp ? 'var(--up)' : 'var(--down)') : 'var(--ink-3)' }}>
          {usdinr > 0 ? (
            <>
              {usdinrUp ? '+' : ''}{usdinrPct.toFixed(2)}% —{' '}
              {/* Matches components/markets/MarketsClient.tsx's exact wording for the
                  same USDINR direction, so the same fact reads identically on both pages. */}
              {usdinrUp
                ? 'a weaker rupee amplifies MCX gains from global commodity price moves today.'
                : 'a stronger rupee dampens MCX gains from global commodity price moves today.'}
            </>
          ) : 'Unavailable'}
        </div>
      </div>
    </div>
  )
}
