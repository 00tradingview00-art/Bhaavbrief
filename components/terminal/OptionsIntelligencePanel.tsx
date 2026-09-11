import type { CoreInstrument, TerminalInstrumentData } from '@/lib/terminalData'
import { CORE_INSTRUMENTS, GATEWAY_META } from '@/lib/terminalData'
import Pill from '@/components/ui/Pill'
import type { PillTone } from '@/components/ui/Pill'

interface Props {
  terminalData: Record<CoreInstrument, TerminalInstrumentData | null>
}

// Matches app/tools/mcx-pcr/page.tsx's pcrSignal() exactly. Tone maps onto
// components/ui/Pill.tsx so this badge matches every other badge on the site.
function pcrSignal(pcr: number | null): { label: string; tone: PillTone } {
  if (pcr === null) return { label: 'N/A', tone: 'neutral' }
  if (pcr > 1.2) return { label: 'Bullish', tone: 'up' }
  if (pcr > 0.8) return { label: 'Neutral', tone: 'neutral' }
  return { label: 'Bearish', tone: 'down' }
}

const PCR_SCALE_MAX = 2.0

export default function OptionsIntelligencePanel({ terminalData }: Props) {
  return (
    <div className="terminal-two-col" style={{ display: 'grid', gap: 16 }}>
      {/* Put-Call Ratio */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', padding: 18 }}>
        <h3 style={{ margin: '0 0 2px', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Put-Call Ratio</h3>
        <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--ink-3)' }}>
          Total put OI ÷ call OI · &gt;1.2 skews bullish positioning, &lt;0.8 skews bearish
        </p>
        {CORE_INSTRUMENTS.map(instrument => {
          const data = terminalData[instrument]
          const meta = GATEWAY_META[instrument]
          const pcr = data?.pcr ?? null
          const signal = pcrSignal(pcr)
          const pct = pcr !== null ? Math.min(pcr / PCR_SCALE_MAX, 1) * 100 : 0
          return (
            <div key={instrument} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 78, flex: 'none', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.color, flex: 'none' }} />
                {meta.label}
              </div>
              <div style={{ flex: 1, height: 16, background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                {pcr !== null && (
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 'var(--radius-sm)', width: `${pct}%`, background: meta.color }} />
                )}
              </div>
              <div style={{ width: 40, flex: 'none', fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                {pcr !== null ? pcr.toFixed(2) : '—'}
              </div>
              <Pill tone={signal.tone} size="xs" style={{ width: 52, justifyContent: 'center' }}>{signal.label}</Pill>
            </div>
          )
        })}
      </div>

      {/* Max Pain Proximity */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', padding: 18 }}>
        <h3 style={{ margin: '0 0 2px', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Max Pain Proximity</h3>
        <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--ink-3)' }}>
          Distance of the futures price from the strike where option-writer payout is minimized
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Instrument', 'Max Pain', 'Futures', 'Distance'].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 0 ? 'left' : 'right', fontWeight: 500, color: 'var(--ink-3)',
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em',
                  padding: '8px 6px', borderBottom: '1px solid var(--border)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CORE_INSTRUMENTS.map(instrument => {
              const data = terminalData[instrument]
              const meta = GATEWAY_META[instrument]
              const maxPain = data?.maxPain ?? null
              const spot = data?.futurePrice ?? null
              const dist = maxPain && spot ? ((spot - maxPain) / maxPain) * 100 : null
              return (
                <tr key={instrument}>
                  <td style={{ padding: '9px 6px', borderBottom: '1px solid var(--border)' }}>{meta.label}</td>
                  <td style={{ padding: '9px 6px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums' }}>
                    {maxPain ? '₹' + maxPain.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                  </td>
                  <td style={{ padding: '9px 6px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums' }}>
                    {spot ? '₹' + spot.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                  </td>
                  <td style={{
                    padding: '9px 6px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums',
                    color: dist === null ? 'var(--ink-3)' : dist >= 0 ? 'var(--up)' : 'var(--down)',
                  }}>
                    {dist !== null ? `${dist >= 0 ? '+' : ''}${dist.toFixed(2)}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
