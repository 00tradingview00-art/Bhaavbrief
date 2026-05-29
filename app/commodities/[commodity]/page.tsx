import { notFound }        from 'next/navigation'
import Link                 from 'next/link'
import type { Metadata }    from 'next'
import { getPrices }        from '@/lib/prices'
import { getAllArticles }   from '@/lib/articles'
import { getAllBriefs }     from '@/lib/briefs'
import fs                   from 'fs'
import path                 from 'path'
import CommodityChartWrapper from '@/components/CommodityChartWrapper'

// Revalidate every 5 minutes — live prices + new articles
export const revalidate = 300

type CommodityInfo = {
  name: string; mcxSymbol: string; unit: string; lotSize: string; tickSize: string
  typicalMargin: string; contractValue: string; importParity: string
  supplyControl: string; keyBodies: string[]; demandDrivers: string[]
  priceDrivers: string[]; keyRisk: string; taxNote: string; macroLinks: string[]
}

function loadMarketStructure(): Record<string, CommodityInfo> {
  const file = path.join(process.cwd(), 'data/market-structure.json')
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

// ── Slug → internal key mapping ───────────────────────────────────────────────

const SLUG_MAP: Record<string, { key: string; priceKey: string; color: string }> = {
  'gold':        { key: 'gold',   priceKey: 'gold',   color: '#B45309' },
  'silver':      { key: 'silver', priceKey: 'silver', color: '#2B4FC7' },
  'crude-oil':   { key: 'crude',  priceKey: 'crude',  color: '#7C3AED' },
  'copper':      { key: 'copper', priceKey: 'copper', color: '#065F46' },
  'natural-gas': { key: 'natgas', priceKey: 'natgas', color: '#D97706' },
}

const BASE = 'https://bhaavbrief.in'

const COMMODITY_META: Record<string, { title: string; description: string; keywords: string[] }> = {
  gold: {
    title: 'Why MCX Gold Is Moving Today — Live Price & Analysis',
    description: 'MCX gold price live today — why gold is up or down: Fed policy, rupee-dollar moves, COMEX spread and geopolitics. OHLC, import parity and daily intelligence for Indian traders.',
    keywords: [
      'why is MCX gold moving today',
      'MCX gold price today analysis India',
      'why MCX gold up today',
      'why MCX gold fell today',
      'MCX gold COMEX import parity',
      'rupee fall MCX gold impact',
      'MCX gold lot size margin 2026',
      'MCX gold standard vs mini difference',
      'MCX gold vs sovereign gold bond India',
    ],
  },
  silver: {
    title: 'Why MCX Silver Is Moving Today — Live Price & Analysis',
    description: 'MCX silver price live today — why silver is up or down: gold-silver ratio, industrial demand, COMEX moves and rupee impact. OHLC and daily intelligence for Indian traders.',
    keywords: [
      'why is MCX silver moving today',
      'MCX silver price today analysis India',
      'MCX silver lot size margin 2026',
      'gold silver ratio India MCX',
      'MCX silver mini micro difference',
      'why MCX silver up today',
      'solar panel demand silver India MCX',
      'MCX silver COMEX parity today',
    ],
  },
  crude: {
    title: 'Why MCX Crude Oil Is Moving Today — WTI, OPEC Analysis',
    description: 'MCX crude oil price live today — why crude is up or down: OPEC decisions, WTI/Brent spread, Iran risk, rupee impact. OHLC, import parity and daily intelligence for Indian traders.',
    keywords: [
      'why is MCX crude oil moving today',
      'why crude oil falling today India',
      'why crude oil rising today MCX',
      'OPEC decision MCX crude oil India',
      'MCX crude WTI Brent difference',
      'MCX crude oil lot size margin 2026',
      'MCX crude oil mini contract lot size',
      'petrol diesel crude oil MCX link India',
    ],
  },
  copper: {
    title: 'Why MCX Copper Is Moving Today — LME, China & Analysis',
    description: 'MCX copper price live today — why copper is up or down: China PMI, LME inventory, COMEX moves and rupee impact. OHLC, import parity and daily intelligence for Indian traders.',
    keywords: [
      'why is MCX copper moving today',
      'MCX copper price today analysis India',
      'China demand MCX copper impact',
      'MCX copper LME COMEX price India',
      'MCX copper lot size margin 2026',
      'why MCX copper up today',
      'MCX copper mini contract lot size',
      'copper cable wire price MCX India',
    ],
  },
  natgas: {
    title: 'Why MCX Natural Gas Is Moving Today — Henry Hub Analysis',
    description: 'MCX natural gas price live today — why nat gas is up or down: Henry Hub correlation, winter demand, LNG exports and rupee impact. OHLC and daily intelligence for Indian traders.',
    keywords: [
      'why is MCX natural gas moving today',
      'MCX natural gas price today analysis India',
      'Henry Hub MCX natural gas correlation',
      'MCX natural gas lot size margin 2026',
      'why MCX nat gas up today India',
      'MCX natural gas mini contract',
      'natural gas price India analysis today',
    ],
  },
}

interface Props {
  params: Promise<{ commodity: string }>
}

export function generateStaticParams() {
  return Object.keys(SLUG_MAP).map(c => ({ commodity: c }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { commodity } = await params
  const entry = SLUG_MAP[commodity]
  if (!entry) return {}

  const meta = COMMODITY_META[entry.key]
  const title       = meta ? `${meta.title} | BhaavBrief` : `MCX ${entry.key} Price Today — Live Price & Analysis | BhaavBrief`
  const description = meta?.description ?? `Live MCX ${entry.key} price today in India. OHLC levels, import parity from COMEX, who controls supply, and what moves the price — with daily AI-generated market intelligence.`
  const keywords    = meta?.keywords ?? []

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `${BASE}/commodities/${commodity}` },
    openGraph: {
      title,
      description,
      url:      `${BASE}/commodities/${commodity}`,
      siteName: 'BhaavBrief',
      type:     'website',
    },
    twitter: {
      card:        'summary',
      title,
      description,
    },
  }
}

function fmt(n: number, decimals = 0): string {
  if (!n || n === 0) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function pctBadge(pct: number) {
  const up    = pct >= 0
  const color = up ? '#16A34A' : '#DC2626'
  const bg    = up ? '#F0FDF4' : '#FEF2F2'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 14, fontWeight: 600, color,
      background: bg, padding: '2px 8px', borderRadius: 4,
    }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
    </span>
  )
}

export default async function CommodityPage({ params }: Props) {
  const { commodity } = await params
  const entry = SLUG_MAP[commodity]
  if (!entry) notFound()

  const marketStructure = loadMarketStructure()
  const info   = marketStructure[entry.key]
  const color  = entry.color

  const [prices, articles, allBriefs] = await Promise.all([
    getPrices().catch(() => null),
    getAllArticles().catch(() => []),
    getAllBriefs(),
  ])

  const priceData = prices ? (prices as Record<string, any>)[entry.priceKey] : null
  const ltp       = priceData?.mcx         ?? 0
  const pct       = priceData?.mcxChangePct ?? 0
  const open      = priceData?.mcxOpen      ?? 0
  const high      = priceData?.mcxHigh      ?? 0
  const low       = priceData?.mcxLow       ?? 0
  const prevClose = priceData?.mcxPrevClose  ?? 0

  const commodityArticles = articles
    .filter(a => a.commodity === entry.priceKey || a.commodity === entry.key)
    .slice(0, 6)

  // Map commodity slug to the label used in brief frontmatter
  const BRIEF_COMMODITY_MAP: Record<string, string> = {
    gold:   'MCX Gold',
    silver: 'MCX Silver',
    crude:  'MCX Crude',
    copper: 'MCX Copper',
    natgas: 'MCX Natural Gas',
  }
  const briefCommodityLabel = BRIEF_COMMODITY_MAP[entry.key]
  const recentBriefs = allBriefs
    .filter(b => b.commodities.includes(briefCommodityLabel))
    .slice(0, 5)

  const pageDescription = `Live MCX ${info.name} price today in India. OHLC levels, import parity from COMEX, who controls supply, and what moves the price — with daily AI-generated market intelligence.`
  const pageUrl         = `${BASE}/commodities/${commodity}`

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home',        item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Commodities', item: `${BASE}/commodities` },
          { '@type': 'ListItem', position: 3, name: info.name,     item: pageUrl },
        ],
      },
      {
        '@type':        'FinancialProduct',
        name:           `MCX ${info.name} Futures`,
        description:    pageDescription,
        url:            pageUrl,
        tickerSymbol:   info.mcxSymbol,
        category:       'Commodity Futures',
        provider: {
          '@type': 'Organization',
          name:    'Multi Commodity Exchange of India (MCX)',
          url:     'https://www.mcxindia.com',
        },
        ...(ltp > 0 ? {
          offers: {
            '@type':         'Offer',
            price:           ltp,
            priceCurrency:   'INR',
            priceSpecification: {
              '@type':           'UnitPriceSpecification',
              price:             ltp,
              priceCurrency:     'INR',
              unitText:          info.unit,
            },
          },
        } : {}),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name:    `What moves MCX ${info.name} price?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text:    info.priceDrivers.join(' '),
            },
          },
          {
            '@type': 'Question',
            name:    `Who are the main buyers of ${info.name} in India?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text:    info.demandDrivers.join(' '),
            },
          },
          {
            '@type': 'Question',
            name:    `Who controls ${info.name} supply globally?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text:    info.supplyControl,
            },
          },
          {
            '@type': 'Question',
            name:    `How is MCX ${info.name} price calculated from international prices?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text:    `The MCX ${info.name} price is derived using the import parity formula: ${info.importParity}`,
            },
          },
          {
            '@type': 'Question',
            name:    `What are the key risks in MCX ${info.name} trading?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text:    info.keyRisk,
            },
          },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 24, display: 'flex', gap: 8 }}>
        <Link href="/" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>Home</Link>
        <span>›</span>
        <span style={{ color: 'var(--ink-3)' }}>Commodities</span>
        <span>›</span>
        <span style={{ color: 'var(--ink-2)' }}>{info.name}</span>
      </div>

      {/* Hero — live price */}
      <div style={{
        background: 'var(--surface-1)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '28px 32px', marginBottom: 32,
        borderTop: `3px solid ${color}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                padding: '3px 8px', borderRadius: 4, background: `${color}15`, color,
              }}>MCX</span>
              <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>{info.mcxSymbol}</span>
              <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>·</span>
              <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>{info.unit}</span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500,
              color: 'var(--ink)', margin: '0 0 4px', lineHeight: 1.2,
            }}>
              MCX {info.name} Price Today
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0 }}>
              Live MCX price · Updated in real time
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-1px' }}>
              {ltp > 0 ? `₹${fmt(ltp)}` : '—'}
            </div>
            <div style={{ marginTop: 6 }}>
              {pct !== 0 ? pctBadge(pct) : null}
            </div>
          </div>
        </div>

        {/* OHLC strip */}
        {(open > 0 || high > 0) && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12, marginTop: 24,
            padding: '16px 0 0', borderTop: '1px solid var(--border)',
          }}>
            {[
              { label: 'Open',       value: fmt(open) },
              { label: 'High',       value: fmt(high) },
              { label: 'Low',        value: fmt(low)  },
              { label: 'Prev Close', value: fmt(prevClose) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--ink-2)', fontWeight: 500 }}>
                  ₹{value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical chart */}
      <CommodityChartWrapper commodity={commodity} color={color} unit={info.unit} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
        {/* Left column */}
        <div>
          {/* Recent intelligence */}
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500,
            color: 'var(--ink)', margin: '0 0 16px',
          }}>
            {info.name} Intelligence
          </h2>

          {commodityArticles.length === 0 ? (
            <div style={{
              background: 'var(--surface-3)', borderRadius: 8, padding: '20px 24px',
              fontSize: 14, color: 'var(--ink-4)', marginBottom: 32,
            }}>
              No recent articles — check back after 9 AM IST when the daily brief publishes.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {commodityArticles.map(a => (
                <Link key={a.slug} href={`/articles/${a.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'var(--surface-1)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '16px 20px',
                    transition: 'border-color 0.15s',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6, display: 'flex', gap: 8 }}>
                      <span>{a.edition === 'morning-brief' ? '☀ Open Brief' : a.edition === 'evening-brief' ? '🌙 Close Brief' : '⚡ Flash'}</span>
                      <span>·</span>
                      <span>{a.displayDate}</span>
                      {a.time && <><span>·</span><span>{a.time} IST</span></>}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500,
                      color: 'var(--ink)', lineHeight: 1.3,
                    }}>
                      {a.title}
                    </div>
                    {a.description && (
                      <div style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.5 }}>
                        {a.description}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Recent briefs covering this commodity */}
          {recentBriefs.length > 0 && (
            <>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)', margin: '0 0 16px' }}>
                Recent {info.name} Briefs
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                {recentBriefs.map(b => (
                  <Link key={b.slug} href={`/briefs/${b.slug}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'var(--surface-1)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '14px 20px',
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 5, display: 'flex', gap: 8 }}>
                        <span style={{ color, fontWeight: 600 }}>Edition #{b.edition}</span>
                        <span>·</span>
                        <span>{b.displayDate}</span>
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500,
                        color: 'var(--ink)', lineHeight: 1.3,
                      }}>
                        {b.title}
                      </div>
                    </div>
                  </Link>
                ))}
                <Link href="/briefs" style={{
                  fontSize: 12, color, fontWeight: 500, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                }}>
                  View all briefs →
                </Link>
              </div>
            </>
          )}

          {/* What moves the price */}
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)', margin: '0 0 16px' }}>
            What Moves {info.name}
          </h2>
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '20px 24px', marginBottom: 32,
          }}>
            <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {info.priceDrivers.map((driver, i) => (
                <li key={i} style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{driver}</li>
              ))}
            </ul>
          </div>

          {/* Demand drivers */}
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)', margin: '0 0 16px' }}>
            Demand Drivers
          </h2>
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '20px 24px', marginBottom: 32,
          }}>
            <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {info.demandDrivers.map((d, i) => (
                <li key={i} style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{d}</li>
              ))}
            </ul>
          </div>

          {/* Key risk */}
          <div style={{
            background: '#FEF3C7', border: '1px solid #F59E0B',
            borderRadius: 8, padding: '16px 20px', marginBottom: 32,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
              Risk Note
            </div>
            <div style={{ fontSize: 14, color: '#78350F', lineHeight: 1.6 }}>{info.keyRisk}</div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Contract specs */}
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '20px',
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 14 }}>
              MCX Contract Specs
            </div>
            {[
              { label: 'Lot size',         value: info.lotSize },
              { label: 'Quoted',           value: info.unit },
              { label: 'Tick size',        value: info.tickSize },
              { label: 'Contract value',   value: info.contractValue },
              { label: 'SPAN margin',      value: info.typicalMargin },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '8px 0', borderBottom: '1px solid var(--border)',
                gap: 8,
              }}>
                <span style={{ fontSize: 12, color: 'var(--ink-4)', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
              </div>
            ))}
            <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 10, lineHeight: 1.5 }}>
              Margins are illustrative. Check your broker's SPAN calculator for live requirements.
            </p>
          </div>

          {/* Import parity */}
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '20px',
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>
              Import Parity Formula
            </div>
            <div style={{
              fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7,
              background: 'var(--surface-3)', borderRadius: 6, padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
            }}>
              {info.importParity}
            </div>
          </div>

          {/* Supply control */}
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '20px',
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>
              Who Controls Supply
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7, margin: 0 }}>
              {info.supplyControl}
            </p>
          </div>

          {/* Macro links */}
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '20px',
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 12 }}>
              Watch These Signals
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {info.macroLinks.map(link => (
                <span key={link} style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 4,
                  background: `${color}10`, color, fontWeight: 500,
                  border: `1px solid ${color}30`,
                }}>
                  {link}
                </span>
              ))}
            </div>
          </div>

          {/* Tax */}
          <div style={{
            background: 'var(--surface-3)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
              Tax Treatment
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: 0, lineHeight: 1.6 }}>{info.taxNote}</p>
          </div>
        </div>
      </div>

      {/* All articles link */}
      <div style={{ marginTop: 16, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <Link href="/articles" style={{
          fontSize: 13, color, fontWeight: 500, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          ← All Market Intelligence
        </Link>
      </div>
    </>
  )
}
