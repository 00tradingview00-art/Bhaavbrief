import type { CoreInstrument, TerminalInstrumentData } from '@/lib/terminalData'
import { CORE_INSTRUMENTS, GATEWAY_META } from '@/lib/terminalData'

interface Props {
  terminalData: Record<CoreInstrument, TerminalInstrumentData | null>
}

// Matches app/tools/mcx-pcr/page.tsx's pcrSignal() exactly.
function pcrSignal(pcr: number | null): { label: string; color: string; bg: string } {
  if (pcr === null) return { label: 'N/A', color: 'var(--ink-3)', bg: 'var(--surface-3)' }
  if (pcr > 1.2) return { label: 'Bullish', color: 'var(--up)', bg: 'var(--up-bg)' }
  if (pcr > 0.8) return { label: 'Neutral', color: 'var(--ink-3)', bg: 'var(--surface-3)' }
  return { label: 'Bearish', color: 'var(--down)', bg: 'var(--down-bg)' }
}

const PCR_SCALE_MAX = 2.0

export default function OptionsIntelligencePanel({ terminalData }: Props) {
  return (
    <div className="terminal-two-col" style={{ display: 'grid', gap: 16 }}>
      {/* Put-Call Ratio */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18 }}>
        <h3 style={{ margin: '0 0 2px', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Put-Call Ratio</h3>
        <p style={{ margin: '0 0 14px', fontSize: 11.5, color: 'var(--ink-3)' }}>
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
              <div style={{ flex: 1, height: 16, background: 'var(--surface-3)', borderRadius: 4, position: 'relative' }}>
                {pcr !== null && (
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 4, width: `${pct}%`, background: meta.color }} />
                )}
              </div>
              <div style={{ width: 40, flex: 'none', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                {pcr !== null ? pcr.toFixed(2) : '—'}
              </div>
              <span style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 999, fontWeight: 600, width: 52, textAlign: 'center', color: signal.color, background: signal.bg }}>
                {signal.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Max Pain Proximity */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18 }}>
        <h3 style={{ margin: '0 0 2px', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Max Pain Proximity</h3>
        <p style={{ margin: '0 0 14px', fontSize: 11.5, color: 'var(--ink-3)' }}>
          Distance of the futures price from the strike where option-writer payout is minimized
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Instrument', 'Max Pain', 'Futures', 'Distance'].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 0 ? 'left' : 'right', fontWeight: 500, color: 'var(--ink-3)',
                  fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em',
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
                  <td style={{ padding: '9px 6px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {maxPain ? maxPain.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                  </td>
                  <td style={{ padding: '9px 6px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {spot ? spot.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                  </td>
                  <td style={{
                    padding: '9px 6px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'var(--font-mono)',
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
