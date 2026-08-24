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
- [MCX Gold Contracts](${BASE}/learn/mcx-gold-contracts): Standard (1kg), Mini (100g), Guinea (8g), Petal (1g) — lot sizes, live contract values, margin, which to trade
- [MCX Margin Calculation Explained](${BASE}/learn/mcx-margin-calculation): SPAN vs exposure margin, worked examples for Gold Mini, Crude Mini, Silver and Copper, how margin calls work
- [MCX Gold vs Gold ETF](${BASE}/learn/gold-etf-vs-mcx-gold): Tax treatment, capital, leverage, liquidity, SIP options, LTCG rules — futures vs ETF comparison

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

## Frequently Asked

Q: Why does MCX gold price differ from COMEX gold price?
A: MCX Gold (quoted in ₹ per 10 grams) is the COMEX Gold price (quoted in $ per troy ounce) converted through the USD/INR exchange rate, plus India's import duty structure — 6% Basic Customs Duty, 3% Agriculture Infrastructure and Development Cess, and 3% GST. This duty-and-currency stack is why MCX gold trades at a premium (import parity) over the raw USD-to-INR converted COMEX price. Full formula: ${BASE}/learn/comex-vs-mcx-gold

Q: What are the MCX Gold contract lot sizes?
A: MCX Gold trades in four contract sizes: Gold (1 kg, the standard contract), Gold Mini (100 g), Gold Guinea (8 g), and Gold Petal (1 g) — each with its own margin and minimum capital requirement. Detail and live contract values: ${BASE}/learn/mcx-gold-contracts

Q: What are MCX trading hours in India?
A: MCX is open 9:00 AM to 11:30 PM IST on trading days (11:55 PM on days the US observes Daylight Saving Time). Session-by-session quality and best times per commodity: ${BASE}/learn/mcx-trading-hours

Q: How much money do I need to start MCX trading?
A: It depends on the contract — roughly ₹8,000–15,000 of margin for Crude Oil Mini, versus ₹1,00,000+ for a standard Gold contract. Exact capital needed by contract: ${BASE}/learn/how-much-money-to-start-mcx-trading

Q: Why does MCX use the Black-76 model instead of Black-Scholes for options pricing?
A: MCX options are options on futures contracts, not on spot. Black-76 prices options directly off the futures price and is the standard for commodity and futures options worldwide, whereas Black-Scholes assumes an option on a spot asset with a continuous dividend/cost-of-carry adjustment — Black-76 gives more accurate implied volatility and Greeks for MCX Gold, Silver, Crude Oil and other futures-based options. Live chain: ${BASE}/options

Q: Is BhaavBrief SEBI registered, or does it give trading advice?
A: No. BhaavBrief is not registered with SEBI or any regulatory authority. It publishes market data and context, not personalized investment advice or buy/sell recommendations. Full methodology and disclaimer: ${BASE}/methodology

## Contact

Email: 00tradingview00@gmail.com
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
