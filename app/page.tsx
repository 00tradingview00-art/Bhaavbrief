import { getAllBriefs } from '@/lib/briefs'
import { isTodaysBriefDelayed } from '@/lib/tradingCalendar'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'
import type { PriceData } from '@/lib/prices'
import Tag from '@/components/Tag'
import Link from 'next/link'
import SubscribeForm from '@/components/SubscribeForm'
import CommodityPulse from '@/components/CommodityPulse'
import EIACard from '@/components/EIACard'
import { loadEIA } from '@/lib/eia'
import { getActiveArcs } from '@/lib/arcs'
import { getNextHighImpactEvent } from '@/lib/eventMap'

// Cache homepage for 60s — TickerStrip handles live prices client-side
export const revalidate = 60

export const metadata = {
  title: 'BhaavBrief — Daily MCX Market Brief, Event Calendar & Commodity Intelligence',
  description: 'Daily MCX intelligence at 9:30 AM IST: an event calendar mapping EIA, OPEC, CPI, FOMC and RBI MPC releases to the MCX contracts they move, plus daily briefs for crude oil, natural gas, gold, silver and copper. Educational and informational only.',
  alternates: { canonical: 'https://bhaavbrief.in' },
}

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
              fontSize: 10,
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
                <span style={{ fontSize: 10, color: 'var(--ink-4)', marginLeft: 3, fontWeight: 400 }}>
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
  const [briefs, eiaData] = await Promise.all([
    getAllBriefs(),
    loadEIA(),
  ])
  const snap   = loadSnapshot()
  const prices = snap ? snapshotToPriceData(snap) : null
  const activeArcs = getActiveArcs()
  const [latest, ...previous] = briefs
  const nextEvent = getNextHighImpactEvent()
  const briefDelayed = isTodaysBriefDelayed(latest?.date)

  return (
    <div>
      {/* ── SITE INTRO ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--gold)',
        }}>
          BhaavBrief — India&apos;s Daily Commodity Intelligence
        </div>
      </div>

      {/* ── VALUE PROP (SEO/AI-Overview quotable section) ───────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontWeight: 800,
          fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', lineHeight: 1.15,
          letterSpacing: '-0.02em', color: 'var(--ink)', margin: '0 0 10px',
        }}>
          India&apos;s Commodity Intelligence Platform for MCX Traders
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: 720, marginBottom: 16 }}>
          Daily market briefs and an event calendar for MCX crude oil, natural gas, gold, silver, and base metals — published every trading day at 9:30 AM IST, before the session finds direction.
        </p>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.7, maxWidth: 720, marginBottom: 20 }}>
          BhaavBrief publishes a daily MCX market brief at 9:30 AM IST covering crude oil, natural gas, gold, silver, copper, and USD/INR, alongside an event calendar that maps global data releases — EIA inventory reports, OPEC meetings, US CPI, FOMC decisions, RBI MPC, and China PMI — to the specific MCX contracts they historically move. The calendar reports historical event-impact statistics, so traders know what is scheduled, when it releases in IST, and how much the market has typically moved — without offering any trading advice or recommendations.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/briefs" style={{
            display: 'inline-block', background: 'var(--ink)', color: 'var(--surface)',
            fontSize: 14, fontWeight: 500, textDecoration: 'none',
            padding: '10px 20px', borderRadius: 4,
          }}>
            Read Today&apos;s Brief (free)
          </Link>
          <Link href="/calendar" style={{
            display: 'inline-block', background: 'var(--surface)', color: 'var(--ink)',
            fontSize: 14, fontWeight: 500, textDecoration: 'none',
            padding: '10px 20px', borderRadius: 4, border: '1px solid var(--border)',
          }}>
            See What Moves Each Commodity
          </Link>
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      {latest && (
        <section style={{
          borderTop: '3px solid var(--gold)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 4,
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
              fontSize: 10, fontWeight: 500,
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

          {briefDelayed && (
            <p style={{
              fontSize: 13, color: '#8A5A00', background: '#FFF6E0',
              border: '1px solid #F0D585', borderRadius: 4,
              padding: '8px 12px', marginBottom: 18,
            }}>
              Today&apos;s edition is delayed. Showing the latest available brief below — a fresh one will replace it as soon as it publishes.
            </p>
          )}

          {/* Title + description: two-col on desktop */}
          <div className="home-hero-inner">
            <div>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(26px, 3.5vw, 38px)',
                fontWeight: 500,
                lineHeight: 1.18,
                letterSpacing: '-0.4px',
                color: 'var(--ink)',
                margin: '0 0 16px',
              }}>
                {latest.title}
              </h2>

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

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
                <Link
                  href={`/briefs/${latest.slug}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'var(--ink)', color: '#fff',
                    padding: '10px 22px', borderRadius: 4,
                    fontSize: 15, fontWeight: 500, textDecoration: 'none',
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
                    padding: '10px 20px', borderRadius: 4,
                    fontSize: 15, fontWeight: 400, textDecoration: 'none',
                    border: '1px solid var(--border)',
                  }}
                >
                  All briefs
                </Link>
              </div>

              {/* Subscribe — after value proof, not before */}
              <div style={{ maxWidth: 400, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>
                  Get it in your inbox · Every weekday at 9:30 AM
                </div>
                <SubscribeForm compact location="hero" />
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
                fontSize: 15,
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
                  fontSize: 15, color: 'var(--ink-3)',
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

          {/* Developing Story — shows when an active arc exists */}
          {activeArcs.length > 0 && (() => {
            const arc = activeArcs[0]
            return (
              <Link href={`/arcs/${arc.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
                <div style={{
                  background: 'var(--gold-pale)',
                  border: '1px solid rgba(181,134,42,0.35)',
                  borderLeft: '3px solid var(--gold)',
                  borderRadius: '0 8px 8px 0',
                  padding: '14px 16px',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    fontWeight: 700,
                    marginBottom: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <span className="live-dot" style={{ background: 'var(--gold)' }} />
                    Developing Story · Day {arc.latestDay}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    lineHeight: 1.3,
                    marginBottom: 6,
                  }}>
                    {arc.title}
                  </div>
                  <p style={{
                    fontSize: 12,
                    color: 'var(--ink-3)',
                    margin: '0 0 8px',
                    lineHeight: 1.5,
                  }}>
                    {arc.summary}
                  </p>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--gold)',
                  }}>
                    Follow this story →
                  </span>
                </div>
              </Link>
            )
          })()}

          {/* Live markets CTA */}
          <Link href="/markets" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '14px 16px',
              marginBottom: 16,
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--up)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span className="live-dot" />
                  Live MCX
                </div>
                <span style={{ color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>All markets →</span>
              </div>
              {/* Mini price rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Gold',   price: prices?.gold?.mcx,   pct: prices?.gold?.mcxChangePct,   unit: '/10g' },
                  { label: 'Crude',  price: prices?.crude?.mcx,  pct: prices?.crude?.mcxChangePct,  unit: '/bbl' },
                  { label: 'Silver', price: prices?.silver?.mcx, pct: prices?.silver?.mcxChangePct, unit: '/kg'  },
                ].map(({ label, price, pct, unit }) => {
                  const up = (pct ?? 0) >= 0
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', minWidth: 44 }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>
                        {price ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                        <span style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 2 }}>{unit}</span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: up ? 'var(--up)' : 'var(--down)', minWidth: 52, textAlign: 'right' }}>
                        {pct != null ? `${up ? '+' : ''}${pct.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Footer hint */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                OHLC · Volume · Open Interest · 5 commodities
              </div>
            </div>
          </Link>

          {/* Next high-impact event teaser */}
          {nextEvent && (
            <Link href={`/calendar#${nextEvent.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                background: 'var(--gold-pale)',
                border: '1px solid var(--border)',
                borderLeft: '3px solid var(--gold)',
                borderRadius: '0 4px 4px 0',
                padding: '14px 16px',
                marginBottom: 16,
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6,
                }}>
                  Next High-Impact Event
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, marginBottom: 4 }}>
                  {nextEvent.name}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {new Intl.DateTimeFormat('en-IN', {
                    timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short',
                    hour: 'numeric', minute: '2-digit', hour12: true,
                  }).format(new Date(nextEvent.next_release_utc))} IST · Full calendar →
                </div>
              </div>
            </Link>
          )}

          {/* EIA crude inventory card */}
          <EIACard initialData={eiaData} />

          {/* Stats strip */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 4,
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
                  fontSize: 10, color: 'var(--ink-4)',
                  letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 5,
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Subscribe card — desktop only (mobile sees the hero form above the fold) */}
          <div id="subscribe" className="desktop-only" style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 16,
          }}>
            <div style={{
              background: 'var(--ink)',
              padding: '14px 20px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10, letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                marginBottom: 4,
              }}>
                Daily brief
              </div>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 16, fontWeight: 500,
                color: '#fff', margin: 0, lineHeight: 1.35,
              }}>
                Get today&apos;s brief by 9:30 AM IST.
              </p>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <p style={{
                fontSize: 15, color: 'var(--ink-3)',
                lineHeight: 1.65, marginBottom: 14,
              }}>
                Full MCX analysis — gold, crude, silver — in your inbox by 9:30 AM IST, every weekday.
              </p>
              <SubscribeForm compact location="footer" />
            </div>
          </div>

          {/* About */}
          <div id="about" style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '16px 20px',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10,
            }}>
              About BhaavBrief
            </p>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.75, margin: 0 }}>
              Independent commodity intelligence for India&apos;s traders, investors, merchants and businesses.
              MCX energy, metals, and NCDEX agri — prices, context, and what moves them.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
