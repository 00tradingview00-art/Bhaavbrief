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

> India's First Commodity Intelligence Platform — daily MCX briefs, intraday flash signals, and deep educational guides for Indian commodity traders, businesses, and investors.

BhaavBrief publishes commodity intelligence every weekday at 9:30 AM IST covering MCX Gold, Silver, Crude Oil, Copper, Natural Gas, Zinc, Aluminium, Lead, and Nickel. Each brief leads with OHLC levels, open interest, percent change, and global benchmark prices (COMEX, LME, WTI/Brent, USD/INR) before narrative analysis. Through the day, the Flash Intelligence feed covers breaking signals — policy decisions, OPEC+ moves, price dislocations. The MCX Option Chain provides live Black-76 Greeks, implied volatility (iVIX), Max Pain, and PCR. The MCX Event Calendar maps scheduled macro/data-release events (EIA storage, FOMC, RBI MPC, Union Budget, China PMI) to the contracts they typically move, with historical impact statistics. The Learn section provides India-specific MCX trading guides with exact ₹ figures, MCX lot sizes, margin requirements, and regulatory detail not available elsewhere.

Not SEBI registered. Educational and informational purposes only. No buy/sell calls.

## Main Sections

- [Home](${BASE}/): Commodity intelligence hub with live prices and latest brief
- [Daily Briefs](${BASE}/briefs): All MCX morning editions — OHLC, open interest, macro context
- [Flash Intelligence](${BASE}/news): Intraday market signals and breaking commodity news
- [Live Prices](${BASE}/markets): Real-time MCX commodity prices with OHLC and change
- [MCX Option Chain](${BASE}/options): Live Black-76 Greeks, implied volatility (iVIX), Max Pain, PCR, OI concentration map
- [MCX Event Calendar](${BASE}/calendar): Scheduled macro/data-release events mapped to MCX contracts — EIA, FOMC, RBI MPC, Union Budget, China PMI, with historical impact stats
- [Learn MCX Trading](${BASE}/learn): Complete guides on futures, margins, lot sizes, order types, hours, hedging, and taxation
- [How to Invest](${BASE}/invest): Gold ETF, Silver ETF, commodity mutual funds for Indian investors
- [About](${BASE}/about): Mission, principles, what we cover, and how it works

## Commodity Intelligence Pages

- [MCX Gold](${BASE}/commodities/gold): Gold price analysis, COMEX reference, import parity, FAQ
- [MCX Silver](${BASE}/commodities/silver): Silver price analysis, gold-silver ratio, industrial demand
- [MCX Crude Oil](${BASE}/commodities/crude-oil): Crude analysis, WTI/Brent context, petrol/diesel linkage
- [MCX Copper](${BASE}/commodities/copper): Copper analysis, LME reference, China PMI signals
- [MCX Natural Gas](${BASE}/commodities/natural-gas): Nat gas analysis, EIA inventory, seasonal context
- [MCX Zinc](${BASE}/commodities/zinc): Zinc price analysis, LME reference, China PMI/base-metals demand
- [MCX Aluminium](${BASE}/commodities/aluminium): Aluminium price analysis, LME reference, industrial demand drivers
- [MCX Lead](${BASE}/commodities/lead): Lead price analysis, battery/auto demand, base-metals context
- [MCX Nickel](${BASE}/commodities/nickel): Nickel price analysis, stainless steel/EV battery demand, supply drivers

## MCX Trading Guides (Learn Section)

Beginner guides with India-specific ₹ amounts, MCX-specific rules, and operational detail:

- [How Much Money to Start MCX Trading](${BASE}/learn/how-much-money-to-start-mcx-trading): Exact capital needed by contract — ₹8,000–15,000 for Crude Mini, ₹1,00,000+ for Gold Mini, margin vs recommended capital
- [MCX Gold vs Physical Gold](${BASE}/learn/mcx-gold-vs-physical-gold): MCX gold is a futures contract not real gold — delivery process, minimum investment, who should use each
- [Which MCX Commodity to Trade](${BASE}/learn/which-mcx-commodity-to-trade): Decision matrix by capital and risk — Crude Mini for beginners, Gold Mini for ₹75K+ traders
- [MCX Trading Hours India](${BASE}/learn/mcx-trading-hours): MCX open 9 AM to 11:30 PM IST — session quality guide, EIA timing, commodity-specific best windows
- [MCX Order Types Explained](${BASE}/learn/mcx-order-types): Market, Limit, SL, SL-M orders — why SL-M is the correct stop loss, worked examples
- [What is COMEX](${BASE}/learn/what-is-comex): COMEX explained for Indian MCX traders — why New York sets MCX gold price, IST trading hours, tracking tools
- [COMEX vs MCX Gold Price](${BASE}/learn/comex-vs-mcx-gold): Import parity formula, 6% BCD + 3% AIDC + 3% GST duty structure, USD/INR role
- [MCX Contract Expiry Dates 2026](${BASE}/learn/mcx-contract-expiry): When MCX contracts expire, DVCAL settlement, rollover vs exit timing
- [MCX Circuit Limits 2026](${BASE}/learn/mcx-circuit-limits): Two-stage circuit system (±3%, ±6%), commodity-specific bands, what to do when frozen
- [MCX Margin Calculator](${BASE}/learn/mcx-margin-calculator): Live SPAN margin estimates for every MCX contract
- [Best Time to Trade MCX](${BASE}/learn/best-time-to-trade-mcx): Morning vs evening session, COMEX overlap, when NOT to trade
- [Why USD/INR Moves MCX Gold](${BASE}/learn/why-usdinr-affects-mcx-gold): Rupee-dollar link with import parity formula and live examples
- [MCX Futures Rollover Guide](${BASE}/learn/mcx-rollover): When to rollover, rollover cost calculation, contango vs backwardation
- [MCX Commodity Tax India](${BASE}/learn/mcx-commodity-tax-india): Business income taxation, CTT, ITR-3 filing, loss carry-forward
- [MCX Lot Sizes 2026](${BASE}/learn/mcx-lot-sizes): Every contract lot size, tick size, contract value

## Recent Daily Briefs

${recentBriefs.map(b =>
  `- [${b.title}](${BASE}/briefs/${b.slug}): ${b.displayDate ?? b.date}${b.summary ? ' — ' + b.summary.slice(0, 120) : ''}`
).join('\n')}

## Recent Flash Intelligence

${recentArticles.map(a =>
  `- [${a.title}](${BASE}/articles/${a.slug}): ${a.displayDate}${a.description ? ' — ' + a.description.slice(0, 120) : ''}`
).join('\n')}

## Data Coverage

Commodities: MCX Gold (₹/10g), MCX Silver (₹/kg), MCX Crude Oil (₹/bbl), MCX Copper (₹/kg), MCX Natural Gas (₹/mmBtu), MCX Zinc (₹/kg), MCX Aluminium (₹/kg), MCX Lead (₹/kg), MCX Nickel (₹/kg)
Global references: COMEX Gold ($/oz), COMEX Silver ($/oz), LME Copper ($/MT), WTI Crude ($/bbl), Brent Crude ($/bbl), Henry Hub Gas ($/mmBtu)
Currency: USD/INR
Data points per brief: Open, High, Low, Close, % Change, Open Interest, Volume
Scheduled events tracked: EIA Natural Gas Storage, EIA Petroleum Status, API Crude Inventories, OPEC+/JMMC, US CPI, FOMC, US Non-Farm Payrolls, China NBS/Caixin PMI, USDA WASDE, MPOB Palm Oil, Baker Hughes Rig Count, India CPI/WPI, RBI MPC, Union Budget of India, CFTC Commitment of Traders, MCX contract expiry — see /calendar

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
