import Link from 'next/link'
import type { PriceData } from '@/lib/prices'
import { getSparklineCloses } from '@/lib/history'
import Sparkline from '@/components/ui/Sparkline'

// Prominent flagship-commodity price card (Part 12 §12.5 "Gold Hero Card").
export default function GoldHeroCard({ data }: { data: PriceData | null }) {
  const gold = data?.gold
  if (!gold || !gold.mcx) return null

  const closes = getSparklineCloses('gold')

  const up = (gold.mcxChangePct ?? 0) >= 0

  return (
    <Link href="/commodities/gold" style={{ textDecoration: 'none', display: 'block', marginBottom: 32 }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--gold)',
        borderRadius: 4,
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--ink-4)', marginBottom: 8,
          }}>
            MCX Gold · /10g
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700,
              color: 'var(--ink)', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            }}>
              ₹{gold.mcx.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
              padding: '3px 8px', borderRadius: 5,
              background: up ? 'var(--up-bg)' : 'var(--down-bg)',
              color: up ? 'var(--up)' : 'var(--down)',
            }}>
              {up ? '+' : ''}{(gold.mcxChangePct ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {closes.length >= 2 && <Sparkline closes={closes} size="hero" />}
          {gold.comex > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 4,
              }}>
                COMEX Gold
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600,
                color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums',
              }}>
                ${gold.comex.toFixed(2)}
                <span style={{
                  marginLeft: 6, fontSize: 11,
                  color: (gold.comexChangePct ?? 0) >= 0 ? 'var(--up)' : 'var(--down)',
                }}>
                  {(gold.comexChangePct ?? 0) >= 0 ? '+' : ''}{(gold.comexChangePct ?? 0).toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
