import { getAllBriefs } from '@/lib/briefs'
import { getPrices, type PriceData } from '@/lib/prices'
import Tag from '@/components/Tag'
import Link from 'next/link'
import SubscribeForm from '@/components/SubscribeForm'
import CommodityPulse from '@/components/CommodityPulse'
import EIACard from '@/components/EIACard'

// Cache homepage for 60s — TickerStrip handles live prices client-side
export const revalidate = 60

// ── Market Snapshot ───────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (!n) return '—'
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}
function fmtUSD(n: number, dp = 2) {
  if (!n) return '—'
  return '$' + n.toFixed(dp)
}
function fmtPct(n: number) {
  if (n === undefined || n === null) return '—'
  const sign = n >= 0 ? '+' : ''
  return sign + n.toFixed(2) + '%'
}

interface SnapItem {
  label: string
  price: string
  pct: number
  unit: string
}

function MarketSnapshot({ data }: { data: PriceData | null }) {
  if (!data) return null

  const items: SnapItem[] = [
    { label: 'MCX Gold',   price: fmtINR(data.gold?.mcx),   pct: data.gold?.mcxChangePct  ?? 0, unit: '/ 10g'  },
    { label: 'MCX Crude',  price: fmtINR(data.crude?.mcx),  pct: data.crude?.mcxChangePct ?? 0, unit: '/ bbl'  },
    { label: 'MCX Silver', price: fmtINR(data.silver?.mcx), pct: data.silver?.mcxChangePct ?? 0, unit: '/ kg'  },
    { label: 'USD / INR',  price: fmtUSD(data.usdinr, 4),   pct: data.usdinrChangePct      ?? 0, unit: ''      },
  ]

  return (
    <div className="market-snap">
      {items.map((item) => {
        const up = item.pct >= 0
        return (
          <div key={item.label} style={{
            background: 'var(--surface)',
            padding: '14px 16px',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 6,
            }}>
              {item.label}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 17,
              fontWeight: 500,
              color: 'var(--ink)',
              lineHeight: 1,
              marginBottom: 5,
            }}>
              {item.price}
              {item.unit && (
                <span style={{ fontSize: 9, color: 'var(--ink-4)', marginLeft: 3, fontWeight: 400 }}>
                  {item.unit}
                </span>
              )}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 500,
              color: up ? 'var(--up)' : 'var(--down)',
            }}>
              {fmtPct(item.pct)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tag helper ────────────────────────────────────────────────────────────────

function getTagType(tag?: string): string {
  if (!tag) return 'default'
  const t = tag.toLowerCase()
  if (t.includes('crude') || t.includes('energy') || t.includes('gas') || t.includes('oil') || t.includes('petroleum')) return 'energy'
  if (t.includes('gold') || t.includes('silver') || t.includes('copper') || t.includes('metal') || t.includes('zinc') || t.includes('bullion')) return 'metals'
  if (t.includes('macro') || t.includes('rbi') || t.includes('sebi') || t.includes('fed') || t.includes('dollar') || t.includes('rupee') || t.includes('rate')) return 'macro'
  if (t.includes('agri') || t.includes('ncdex') || t.includes('pepper') || t.includes('soy')) return 'agri'
  return 'default'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [briefs, prices] = await Promise.all([
    getAllBriefs(),
    getPrices().catch(() => null),
  ])
  const [latest, ...previous] = briefs

  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      {latest && (
        <section style={{
          borderTop: '3px solid var(--gold)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 'clamp(20px, 4vw, 32px) clamp(18px, 4vw, 36px)',
          marginBottom: 40,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Gold accent bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 3, background: 'var(--gold)',
          }} />

          {/* Edition label */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 18,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9, fontWeight: 500,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--gold)',
              background: 'var(--gold-pale)',
              padding: '3px 8px',
              border: '1px solid rgba(181,134,42,0.25)',
              borderRadius: 3,
            }}>
              Edition #{String(latest.edition).padStart(3, '0')}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10, color: 'var(--ink-4)',
              letterSpacing: '0.04em',
            }}>
              {latest.displayDate}
            </span>
          </div>

          {/* Title + description: two-col on desktop */}
          <div className="home-hero-inner">
            <div>
              <h1 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(26px, 3.5vw, 38px)',
                fontWeight: 500,
                lineHeight: 1.18,
                letterSpacing: '-0.4px',
                color: 'var(--ink)',
                margin: '0 0 16px',
              }}>
                {latest.title}
              </h1>

              <p style={{
                fontSize: 15,
                color: 'var(--ink-2)',
                lineHeight: 1.75,
                margin: '0 0 20px',
                maxWidth: 600,
              }}>
                {latest.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 24 }}>
                {latest.tags?.map((tag: string) => (
                  <Tag key={tag} type={getTagType(tag)}>{tag}</Tag>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link
                  href={`/briefs/${latest.slug}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'var(--ink)', color: '#fff',
                    padding: '10px 22px', borderRadius: 6,
                    fontSize: 13, fontWeight: 500, textDecoration: 'none',
                    letterSpacing: '0.01em',
                  }}
                >
                  Read today&apos;s brief →
                </Link>
                <Link
                  href="/briefs"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'transparent', color: 'var(--ink-2)',
                    padding: '10px 20px', borderRadius: 6,
                    fontSize: 13, fontWeight: 400, textDecoration: 'none',
                    border: '1px solid var(--border)',
                  }}
                >
                  All briefs
                </Link>
              </div>
            </div>

            {/* Edition watermark — desktop only */}
            <div className="home-watermark" style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 80,
              fontWeight: 600,
              color: 'var(--border)',
              lineHeight: 1,
              userSelect: 'none',
              flexShrink: 0,
              letterSpacing: '-4px',
            }}>
              #{latest.edition}
            </div>
          </div>
        </section>
      )}

      {/* ── COMMODITY PULSE ──────────────────────────────────────────────────── */}
      <CommodityPulse />

      {/* ── TWO-COLUMN BODY ──────────────────────────────────────────────────── */}
      <div className="home-body">

        {/* LEFT ─ market snap + previous briefs */}
        <div>

          {/* Market snapshot */}
          <MarketSnapshot data={prices} />

          {/* Previous briefs header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 0, paddingBottom: 12,
            borderBottom: '2px solid var(--ink)',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--ink)',
            }}>
              Previous Editions
            </span>
            <Link href="/briefs" style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10, color: 'var(--gold)', textDecoration: 'none',
              letterSpacing: '0.04em',
            }}>
              View all →
            </Link>
          </div>

          {/* Brief list */}
          {previous.slice(0, 6).map((brief, idx) => (
            <Link
              key={brief.slug}
              href={`/briefs/${brief.slug}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr',
                gap: '0 16px',
                padding: '20px 0',
                borderBottom: '1px solid var(--border)',
                textDecoration: 'none',
                alignItems: 'start',
              }}
            >
              {/* Edition number column */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 500,
                color: idx === 0 ? 'var(--gold)' : 'var(--ink-4)',
                lineHeight: 1,
                paddingTop: 3,
                letterSpacing: '-0.5px',
              }}>
                #{brief.edition}
              </div>

              {/* Content column */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Tag type={getTagType(brief.tags?.[0])}>{brief.tags?.[0] ?? 'Brief'}</Tag>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10, color: 'var(--ink-4)',
                    letterSpacing: '0.03em',
                  }}>
                    {brief.displayDate}
                  </span>
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 18,
                  fontWeight: 500,
                  lineHeight: 1.3,
                  color: 'var(--ink)',
                  margin: '0 0 6px',
                }}>
                  {brief.title}
                </h2>
                <p style={{
                  fontSize: 13, color: 'var(--ink-3)',
                  lineHeight: 1.65, margin: 0,
                }}>
                  {brief.description}
                </p>
              </div>
            </Link>
          ))}

          {previous.length > 6 && (
            <div style={{ paddingTop: 20 }}>
              <Link href="/briefs" style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11, color: 'var(--gold)',
                textDecoration: 'none', letterSpacing: '0.04em',
              }}>
                View all {briefs.length} editions →
              </Link>
            </div>
          )}
        </div>

        {/* RIGHT ─ sticky sidebar */}
        <div className="home-sidebar">

          {/* Subscribe card */}
          <div id="subscribe" style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 16,
          }}>
            <div style={{
              background: 'var(--ink)',
              padding: '14px 20px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9, letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                marginBottom: 4,
              }}>
                Free daily brief
              </div>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 16, fontWeight: 500,
                color: '#fff', margin: 0, lineHeight: 1.35,
              }}>
                Start your morning with an edge
              </p>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <p style={{
                fontSize: 13, color: 'var(--ink-3)',
                lineHeight: 1.65, marginBottom: 14,
              }}>
                Join India&apos;s sharpest commodity traders. MCX intelligence every weekday at 9:30 AM.
              </p>
              <SubscribeForm compact />
            </div>
          </div>

          {/* Stats strip */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            textAlign: 'center',
          }}>
            {[
              { val: '5 min', label: 'Daily read' },
              { val: '9:30 AM', label: 'Delivered' },
            ].map(({ val, label }) => (
              <div key={label}>
                <div style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 20, fontWeight: 500, color: 'var(--ink)', lineHeight: 1,
                }}>
                  {val}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9, color: 'var(--ink-4)',
                  letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 5,
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Live markets CTA */}
          <Link href="/markets" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--up)',
                  marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span className="live-dot" />
                  Live markets
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>
                  MCX OHLC, Volume &amp; Open Interest
                </p>
              </div>
              <span style={{ color: 'var(--gold)', fontSize: 20, flexShrink: 0 }}>→</span>
            </div>
          </Link>

          {/* EIA crude inventory card */}
          <EIACard />

          {/* About */}
          <div id="about" style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 20px',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9, fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10,
            }}>
              About BhaavBrief
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.75, margin: 0 }}>
              Independent commodity intelligence for Indian traders and merchants.
              MCX energy, metals, and NCDEX agri — through a geopolitical and supply-demand lens.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
