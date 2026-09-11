import Link from 'next/link'
import type { MCXData } from '@/lib/prices'
import type { TerminalInstrumentData } from '@/lib/terminalData'
import Sparkline from '@/components/ui/Sparkline'
import Pill from '@/components/ui/Pill'
import type { PillTone } from '@/components/ui/Pill'
import WatchlistStar from './WatchlistStar'

export interface GatewayMeta {
  slug:   string  // /commodities/{slug}, /options/{slug}
  label:  string  // "Gold"
  symbol: string  // "GOLD"
  color:  string
  unit:   string  // "/10g"
}

interface Props {
  meta:        GatewayMeta
  priceData:   MCXData | null
  optionsData: TerminalInstrumentData | null
  sparkCloses: number[]
}

function fmtNum(n: number | null | undefined, dp = 2): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

// PCR signal thresholds match app/tools/mcx-pcr/page.tsx's pcrSignal() exactly
// (>1.2 bullish, >0.8 neutral, else bearish) — not re-derived, just mirrored,
// so the same PCR reading never gets a different label on two pages. Tone
// maps onto components/ui/Pill.tsx's tone system rather than hand-rolling
// color/background, so this badge matches every other badge on the site.
function pcrSignal(pcr: number | null): { label: string; tone: PillTone } {
  if (pcr === null) return { label: 'N/A', tone: 'neutral' }
  if (pcr > 1.2) return { label: 'Bullish OI', tone: 'up' }
  if (pcr > 0.8) return { label: 'Balanced',   tone: 'neutral' }
  return { label: 'Bearish OI', tone: 'down' }
}

export default function CommodityGatewayCard({ meta, priceData, optionsData, sparkCloses }: Props) {
  const price  = priceData?.mcx ?? 0
  const pct    = priceData?.mcxChangePct ?? 0
  const stale  = priceData?.mcxStale ?? false
  const up     = pct >= 0
  const signal = pcrSignal(optionsData?.pcr ?? null)

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-xs)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.color, flex: 'none' }} />
          <span>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{meta.symbol}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--ink-4)', display: 'block' }}>{meta.label}</span>
          </span>
        </div>
        <WatchlistStar instrumentKey={meta.slug} />
      </div>

      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 20, fontWeight: 600, color: 'var(--ink)', textAlign: 'right' }}>
          {price > 0 ? '₹' + fmtNum(price, price < 1000 ? 2 : 0) : '—'}
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'var(--font-sans)', fontSize: 12 }}>
          {stale ? (
            <span style={{ color: 'var(--ink-4)' }}>last known · {meta.unit}</span>
          ) : (
            <span style={{ color: up ? 'var(--up)' : 'var(--down)' }}>
              {up ? '▲' : '▼'} {up ? '+' : ''}{pct.toFixed(2)}% · {meta.unit}
            </span>
          )}
        </div>
      </div>

      {sparkCloses.length >= 2 && (
        <div style={{ width: '100%' }}>
          <Sparkline closes={sparkCloses} size="card" />
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px',
        paddingTop: 8, borderTop: '1px solid var(--border)',
      }}>
        {[
          { k: 'iVIX',       v: optionsData ? fmtNum(optionsData.ivix) + '%' : '—' },
          { k: '20D avg',    v: optionsData ? fmtNum(optionsData.aav['20d']) + '%' : '—' },
          { k: 'Vol prem.',  v: optionsData?.volPremium != null ? `${optionsData.volPremium > 0 ? '+' : ''}${fmtNum(optionsData.volPremium)}pp` : '—' },
          { k: 'PCR',        v: optionsData ? fmtNum(optionsData.pcr, 2) : '—' },
          { k: 'Max pain',   v: optionsData?.maxPain ? '₹' + fmtNum(optionsData.maxPain, 0) : '—' },
          { k: 'OI vs low',  v: optionsData?.oiVsDayLow != null ? `${optionsData.oiVsDayLow > 0 ? '+' : ''}${fmtNum(optionsData.oiVsDayLow, 0)}` : '—' },
        ].map(row => (
          <div key={row.k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase', color: 'var(--ink-4)' }}>{row.k}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{row.v}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pill tone={signal.tone} size="xs">{signal.label}</Pill>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href={`/commodities/${meta.slug}`} style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none' }}>Price →</Link>
          <Link href={`/options/${meta.slug}`} style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none' }}>Options →</Link>
        </div>
      </div>
    </div>
  )
}
