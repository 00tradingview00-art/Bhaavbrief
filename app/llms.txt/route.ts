import { getAllBriefs } from '@/lib/briefs'
import { getAllArticles } from '@/lib/articles'

export const dynamic = 'force-dynamic'

const BASE = 'https://bhaavbrief.in'

export async function GET() {
  const [briefs, articles] = await Promise.all([
    getAllBriefs(),
    getAllArticles(),
  ])

  const recentBriefs  = briefs.slice(0, 10)
  const recentArticles = articles.slice(0, 10)

  const body = `# BhaavBrief

> India's First Commodity Intelligence Platform — daily MCX briefs, intraday flash signals, and live geo risk tracking for Indian commodity traders, businesses, and investors.

BhaavBrief publishes commodity intelligence every weekday at 9:30 AM IST covering MCX Gold, Silver, Crude Oil, Copper, and Natural Gas. Each brief leads with OHLC levels, open interest, percent change, and global benchmark prices (COMEX, LME, WTI/Brent, USD/INR) before narrative analysis. Through the day, the Flash Intelligence feed covers breaking signals — policy decisions, OPEC+ moves, price dislocations. The Geo Risk Radar monitors geopolitical chokepoints (Hormuz, Red Sea) in real time.

Not SEBI registered. Educational and informational purposes only. No buy/sell calls.

## Main Sections

- [Home](${BASE}/): Commodity intelligence hub with live prices and latest brief
- [Daily Briefs](${BASE}/briefs): All MCX morning editions — OHLC, open interest, macro context
- [Flash Intelligence](${BASE}/news): Intraday market signals and breaking commodity news
- [Live Prices](${BASE}/markets): Real-time MCX commodity prices with OHLC and change
- [Learn MCX Trading](${BASE}/learn): Guides on futures, margins, lot sizes, hedging, and taxation
- [How to Invest](${BASE}/invest): Gold ETF, Silver ETF, commodity mutual funds for Indian investors
- [About](${BASE}/about): Mission, principles, what we cover, and how it works

## Commodity Intelligence Pages

- [MCX Gold](${BASE}/commodities/gold): Gold price analysis, COMEX reference, import parity, FAQ
- [MCX Silver](${BASE}/commodities/silver): Silver price analysis, gold-silver ratio, industrial demand
- [MCX Crude Oil](${BASE}/commodities/crude-oil): Crude analysis, WTI/Brent context, petrol/diesel linkage
- [MCX Copper](${BASE}/commodities/copper): Copper analysis, LME reference, China PMI signals
- [MCX Natural Gas](${BASE}/commodities/natural-gas): Nat gas analysis, EIA inventory, seasonal context

## Recent Daily Briefs

${recentBriefs.map(b =>
  `- [${b.title}](${BASE}/briefs/${b.slug}): ${b.displayDate ?? b.date}${b.summary ? ' — ' + b.summary.slice(0, 120) : ''}`
).join('\n')}

## Recent Flash Intelligence

${recentArticles.map(a =>
  `- [${a.title}](${BASE}/articles/${a.slug}): ${a.displayDate}${a.description ? ' — ' + a.description.slice(0, 120) : ''}`
).join('\n')}

## Data Coverage

Commodities: MCX Gold (₹/10g), MCX Silver (₹/kg), MCX Crude Oil (₹/bbl), MCX Copper (₹/kg), MCX Natural Gas (₹/mmBtu)
Global references: COMEX Gold ($/oz), COMEX Silver ($/oz), LME Copper ($/MT), WTI Crude ($/bbl), Brent Crude ($/bbl), Henry Hub Gas ($/mmBtu)
Currency: USD/INR
Data points per brief: Open, High, Low, Close, % Change, Open Interest, Volume

## Contact

Email: brief@bhaavbrief.in
Twitter/X: @bhaavbrief
Launched: May 2026
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
