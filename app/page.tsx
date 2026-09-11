import { getAllBriefs } from '@/lib/briefs'
import { isTodaysBriefDelayed } from '@/lib/tradingCalendar'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'
import Pill from '@/components/ui/Pill'
import { tagTone } from '@/lib/tagType'
import Card from '@/components/ui/Card'
import Link from 'next/link'
import SubscribeForm from '@/components/SubscribeForm'
import ContinueReading from '@/components/ContinueReading'
import { getActiveArcs } from '@/lib/arcs'
import { getNextHighImpactEvent } from '@/lib/eventMap'
import TerminalTabbar from '@/components/terminal/TerminalTabbar'
import CommodityGatewayCard from '@/components/terminal/CommodityGatewayCard'
import OptionsIntelligencePanel from '@/components/terminal/OptionsIntelligencePanel'
import MarketPulsePanel from '@/components/terminal/MarketPulsePanel'
import MacroCard from '@/components/terminal/MacroCard'
import { getTerminalData, CORE_INSTRUMENTS, GATEWAY_META } from '@/lib/terminalData'
import { getSparklineCloses } from '@/lib/history'

// BhaavBrief Terminal — the homepage as a unified dashboard rather than a
// standalone landing page. Built incrementally (see
// ~/.claude/plans/fancy-nibbling-fern.md): each section below is only added
// to TERMINAL_SECTIONS once its real module exists, so the tabbar never
// links to an empty/placeholder section on a live page.
const TERMINAL_SECTIONS = [
  { id: 'pulse',       label: 'Market Pulse' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'options',     label: 'Options Intelligence' },
  { id: 'macro',       label: 'Macro' },
  { id: 'brief',       label: 'Brief & Calendar' },
]

// Cache homepage for 60s — TickerStrip handles live prices client-side
export const revalidate = 60

export const metadata = {
  title: 'BhaavBrief — Daily MCX Market Brief, Event Calendar & Commodity Intelligence',
  description: 'Daily MCX intelligence at 9:30 AM IST: an event calendar mapping EIA, OPEC, CPI, FOMC and RBI MPC releases to the MCX contracts they move, plus daily briefs for crude oil, natural gas, gold, silver and copper. Educational and informational only.',
  alternates: { canonical: 'https://bhaavbrief.in' },
  keywords: [
    'MCX commodity intelligence India',
    'MCX daily brief India',
    'BhaavBrief',
    'MCX gold silver crude oil brief',
    'MCX trading analysis India',
    'commodity market India today',
    'MCX options chain India',
    'MCX market brief 9:30 AM IST',
    'MCX event calendar India',
  ],
}

// ── Macro (Cross-Asset) ────────────────────────────────────────────────────────
// 3 derivable metrics only — DXY, US 10Y yield, and FII/DII net flow have no
// fetched-data source anywhere in this codebase (confirmed by repo-wide grep;
// they appear only as copy text in learn articles and prompt strings), so
// they're omitted rather than faked. Each metric below is plain arithmetic on
// fields the snapshot already carries — no new fetches.
interface MacroMetric {
  label: string
  value: string
  delta: { text: string; up: boolean } | null
  note:  string
}

function computeMacro(snap: ReturnType<typeof loadSnapshot>): MacroMetric[] {
  if (!snap) return []
  const { BRENT, WTI, COMEX_GOLD, COMEX_SILVER } = snap.instruments
  const metrics: MacroMetric[] = []

  if (BRENT?.price > 0 && WTI?.price > 0) {
    const spread = BRENT.price - WTI.price
    const priorSpread = BRENT.prevClose > 0 && WTI.prevClose > 0 ? BRENT.prevClose - WTI.prevClose : null
    metrics.push({
      label: 'Brent–WTI Spread',
      value: `$${spread.toFixed(2)}`,
      delta: priorSpread !== null ? { text: `${spread >= priorSpread ? '+' : ''}${(spread - priorSpread).toFixed(2)} vs prior close`, up: spread >= priorSpread } : null,
      note:  'Brent minus WTI, both COMEX/NYMEX reference (15-min delayed)',
    })
  }

  if (snap.derived?.goldSilverRatio > 0) {
    const ratio = snap.derived.goldSilverRatio
    const priorRatio = COMEX_GOLD?.prevClose > 0 && COMEX_SILVER?.prevClose > 0 ? COMEX_GOLD.prevClose / COMEX_SILVER.prevClose : null
    metrics.push({
      label: 'Gold/Silver Ratio',
      value: `${ratio.toFixed(1)}x`,
      delta: priorRatio !== null ? { text: `${ratio >= priorRatio ? '+' : ''}${(ratio - priorRatio).toFixed(1)}x vs prior close`, up: ratio >= priorRatio } : null,
      note:  'COMEX gold ÷ COMEX silver, USD basis',
    })
  }

  if (COMEX_GOLD?.price > 0 && WTI?.price > 0) {
    const ratio = COMEX_GOLD.price / WTI.price
    const priorRatio = COMEX_GOLD.prevClose > 0 && WTI.prevClose > 0 ? COMEX_GOLD.prevClose / WTI.prevClose : null
    metrics.push({
      label: 'Gold/Crude Ratio',
      value: `${ratio.toFixed(1)}x`,
      delta: priorRatio !== null ? { text: `${ratio >= priorRatio ? '+' : ''}${(ratio - priorRatio).toFixed(1)}x vs prior close`, up: ratio >= priorRatio } : null,
      note:  'Barrels of WTI crude one troy oz of gold buys',
    })
  }

  return metrics
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const briefs = await getAllBriefs()
  const snap   = loadSnapshot()
  const prices = snap ? snapshotToPriceData(snap) : null
  const terminalData = await getTerminalData()
  const macroMetrics = computeMacro(snap)
  const activeArcs = getActiveArcs()
  const [latest, ...previous] = briefs
  const nextEvent = getNextHighImpactEvent()
  const briefDelayed = isTodaysBriefDelayed(latest?.date)

  return (
    <div>
      {/* ── SITE INTRO ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 10,
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
        <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: 720, marginBottom: 20 }}>
          Daily market briefs and an event calendar for MCX crude oil, natural gas, gold, silver, and base metals — published every trading day at 9:30 AM IST, before the session finds direction.
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

      <ContinueReading />

      <TerminalTabbar sections={TERMINAL_SECTIONS} />

      {/* ══════════════════════════════════════════════════════════════════════
          MARKET PULSE — composite iVIX + vol premium + USDINR. Numeric facts
          only, no narrative "why" text (see MarketPulsePanel's own comment
          for why a Calm/Elevated/Stress regime read isn't shown here).
          ══════════════════════════════════════════════════════════════════ */}
      <section id="pulse" style={{ marginBottom: 48 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink)',
          marginBottom: 14,
        }}>
          Market Pulse
        </div>
        <MarketPulsePanel terminalData={terminalData} prices={prices} />
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          COMMODITY TERMINAL — the 5 core MCX instruments as gateway cards:
          price, day change, iVIX/AAV/vol premium/PCR/Max Pain/OI, sparkline,
          and deep links — all from getTerminalData() (lib/options.ts's
          already-cached getOptionsChain, one call per instrument) plus the
          existing price snapshot and daily-close history.
          ══════════════════════════════════════════════════════════════════ */}
      <section id="commodities" style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink)',
          }}>
            Commodity Terminal
          </div>
          <Link href="/markets" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}>
            All 10 MCX markets →
          </Link>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12,
        }}>
          {CORE_INSTRUMENTS.map(instrument => {
            const meta = GATEWAY_META[instrument]
            return (
              <CommodityGatewayCard
                key={instrument}
                meta={meta}
                priceData={prices ? prices[meta.priceKey] : null}
                optionsData={terminalData[instrument]}
                sparkCloses={getSparklineCloses(meta.historyField, 20)}
              />
            )
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          OPTIONS INTELLIGENCE — PCR and Max Pain across the 5 core
          instruments, from the same terminalData fetch as the gateway cards.
          ══════════════════════════════════════════════════════════════════ */}
      <section id="options" style={{ marginBottom: 48 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink)',
          marginBottom: 14,
        }}>
          Options Intelligence
        </div>
        <OptionsIntelligencePanel terminalData={terminalData} />
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          CROSS-ASSET & MACRO — 3 derivable metrics (see computeMacro's own
          comment for why DXY/US10Y/FII-DII are omitted rather than faked).
          Renders nothing if the snapshot is unavailable.
          ══════════════════════════════════════════════════════════════════ */}
      {macroMetrics.length > 0 && (
        <section id="macro" style={{ marginBottom: 48 }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink)',
            marginBottom: 14,
          }}>
            Cross-Asset &amp; Macro
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {macroMetrics.map(m => <MacroCard key={m.label} {...m} />)}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          BRIEF & CALENDAR — today's edition, developing stories, upcoming
          events, and the subscribe growth loop.
          ══════════════════════════════════════════════════════════════════ */}
      <section id="brief">
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink)',
          marginBottom: 14,
        }}>
          Brief &amp; Calendar
        </div>

      {latest && (
        <section style={{
          borderTop: '3px solid var(--gold)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
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
              fontFamily: 'var(--font-sans)',
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
              fontFamily: 'var(--font-sans)',
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
                  <Pill key={tag} tone={tagTone(tag)} size="sm">{tag}</Pill>
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
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>
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

      <div className="home-body">

        {/* LEFT ─ previous briefs */}
        <div style={{ minWidth: 0 }}>

          {/* Previous editions — compact 3-item list (was a bare link with no
              visible briefs, which read as broken/empty rather than
              intentionally compressed). Full list still lives on /briefs. */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 16, paddingBottom: 8, borderTop: '2px solid var(--ink)',
          }}>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--ink)',
            }}>
              Previous Editions
            </span>
            <Link href="/briefs" style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 10, color: 'var(--gold)',
              letterSpacing: '0.04em', textDecoration: 'none',
            }}>
              View all {briefs.length} editions →
            </Link>
          </div>

          {previous.slice(0, 3).map(brief => (
            <Link
              key={brief.slug}
              href={`/briefs/${brief.slug}`}
              style={{
                display: 'flex', alignItems: 'baseline', gap: 12,
                padding: '12px 0', borderBottom: '1px solid var(--border)',
                textDecoration: 'none',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-4)',
                flexShrink: 0, minWidth: 32,
              }}>
                #{brief.edition}
              </span>
              <span style={{
                fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                minWidth: 0,
              }}>
                {brief.title}
              </span>
            </Link>
          ))}
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
                  borderTop: '1px solid rgba(181,134,42,0.35)',
                  borderRight: '1px solid rgba(181,134,42,0.35)',
                  borderBottom: '1px solid rgba(181,134,42,0.35)',
                  borderLeft: '3px solid var(--gold)',
                  borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                  boxShadow: 'var(--shadow-xs)',
                  padding: '14px 16px',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-sans)',
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
                    fontFamily: 'var(--font-sans)',
                    fontSize: 10,
                    color: 'var(--gold)',
                  }}>
                    Follow this story →
                  </span>
                </div>
              </Link>
            )
          })()}

          {/* Next high-impact event teaser */}
          {nextEvent && (
            <Link href={`/calendar#${nextEvent.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                background: 'var(--gold-pale)',
                borderTop: '1px solid var(--border)',
                borderRight: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                borderLeft: '3px solid var(--gold)',
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                boxShadow: 'var(--shadow-xs)',
                padding: '14px 16px',
                marginBottom: 16,
              }}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6,
                }}>
                  Next High-Impact Event
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, marginBottom: 4 }}>
                  {nextEvent.name}
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {new Intl.DateTimeFormat('en-IN', {
                    timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short',
                    hour: 'numeric', minute: '2-digit', hour12: true,
                  }).format(new Date(nextEvent.next_release_utc))} IST · Full calendar →
                </div>
              </div>
            </Link>
          )}

          {/* Stats strip */}
          <Card padding="sm" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            textAlign: 'center',
            marginBottom: 16,
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
                  fontFamily: 'var(--font-sans)',
                  fontSize: 10, color: 'var(--ink-4)',
                  letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 5,
                }}>
                  {label}
                </div>
              </div>
            ))}
          </Card>

          {/* Subscribe CTA block — the page's single "primary" (gold-button) ask.
              Was desktop-only on the theory that mobile already saw the quiet
              hero form above the fold; that meant mobile visitors never reached
              the one deliberately unmistakable CTA at all. Shown on all
              breakpoints now — it sits far enough down-page from the hero form
              that they're never both in view together, so the Gold Rule's
              per-viewport scarcity budget still holds.
              Part 12 §12.5.1: intentionally dark even on the otherwise-light site,
              the doc's own explicitly called-out treatment for this one block. */}
          <div id="subscribe" style={{
            background: '#0C0E00',
            border: '1px solid #252800',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            marginBottom: 16,
            padding: '20px 20px 18px',
          }}>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 19, fontWeight: 700,
              color: '#fff', margin: '0 0 8px', lineHeight: 1.3,
            }}>
              Get it before market opens.
            </p>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.04em',
              color: 'rgba(255,255,255,0.5)', margin: '0 0 16px',
            }}>
              Every weekday · 9:30 AM IST · Free · {briefs.length} editions
            </p>
            <SubscribeForm compact primary location="footer" />
          </div>

          {/* About */}
          <div id="about">
          <Card padding="sm">
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10,
            }}>
              About BhaavBrief
            </p>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.75, margin: 0 }}>
              Independent commodity intelligence for India&apos;s traders, investors, merchants and businesses.
              MCX energy, metals, and NCDEX agri — prices, context, and what moves them.
            </p>
          </Card>
          </div>
        </div>

      </div>
      </section>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.25rem 2rem' }}>
        <p style={{ fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.6 }}>
          For educational and informational purposes only. Not registered with SEBI or any regulatory authority. Nothing here constitutes investment advice or a solicitation to trade.
        </p>
      </div>
    </div>
  )
}
