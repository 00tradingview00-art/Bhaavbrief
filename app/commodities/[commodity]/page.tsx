import { notFound }        from 'next/navigation'
import Link                 from 'next/link'
import type { Metadata }    from 'next'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'

type CommodityPriceKey = 'gold' | 'silver' | 'crude' | 'copper' | 'natgas' | 'zinc' | 'aluminium' | 'lead' | 'nickel'
import { getAllArticles }   from '@/lib/articles'
import { getAllBriefs }     from '@/lib/briefs'
import { getActiveArcs }    from '@/lib/arcs'
import { normalizeCommodityValue, KEY_TO_MCX_LABEL, type CommodityKey } from '@/lib/commodityTags'
import fs                   from 'fs'
import path                 from 'path'
import CommodityChartWrapper from '@/components/CommodityChartWrapper'
import UpcomingEventsForCommodity from '@/components/UpcomingEventsForCommodity'
import CommodityVisitTracker from '@/components/CommodityVisitTracker'

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
  'gold':        { key: 'gold',      priceKey: 'gold',      color: '#B45309' },
  'silver':      { key: 'silver',    priceKey: 'silver',    color: '#2B4FC7' },
  'crude-oil':   { key: 'crude',     priceKey: 'crude',     color: '#7C3AED' },
  'copper':      { key: 'copper',    priceKey: 'copper',    color: '#065F46' },
  'natural-gas': { key: 'natgas',    priceKey: 'natgas',    color: '#D97706' },
  'zinc':        { key: 'zinc',      priceKey: 'zinc',      color: '#475569' },
  'aluminium':   { key: 'aluminium', priceKey: 'aluminium', color: '#6366F1' },
  'lead':        { key: 'lead',      priceKey: 'lead',      color: '#64748B' },
  'nickel':      { key: 'nickel',    priceKey: 'nickel',    color: '#0F766E' },
}

const BASE = 'https://bhaavbrief.in'

const COMMODITY_META: Record<string, { title: string; description: string; keywords: string[]; faq: Array<{ q: string; a: string }> }> = {
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
    faq: [
      { q: 'Why is MCX gold price up today?', a: 'MCX gold rises when any of these happen: the US dollar weakens (making dollar-priced gold cheaper globally), the Indian rupee falls against the dollar (requiring more rupees to buy the same gold), geopolitical tensions rise (safe-haven demand), US Federal Reserve signals rate cuts, or global central banks increase gold buying. A 1% rupee depreciation alone can add ₹1,000–₹1,500 to MCX gold per 10g even if COMEX gold is flat.' },
      { q: 'Why is MCX gold price falling today?', a: 'MCX gold falls when: the US dollar strengthens (COMEX gold drops), the Indian rupee appreciates, US real yields rise (raising the opportunity cost of holding gold), the Fed signals rate hikes, or geopolitical tensions ease. Import duty cuts by the Indian government can also cause a sharp fall — each 1% duty reduction drops MCX gold by roughly ₹1,000/10g.' },
      { q: 'Why does MCX gold price differ from international (COMEX) gold price?', a: 'MCX gold is priced in Indian rupees, not US dollars. The formula is: MCX Gold (₹/10g) = (COMEX $/oz ÷ 31.1035) × 10 × USD/INR × (1 + import duty + GST). At current duty levels (~15%), a COMEX price of $3,000/oz with USD/INR at ₹84 gives an MCX theoretical of ~₹93,000/10g. When actual MCX price is higher than this, it signals strong domestic demand or import tightness.' },
      { q: 'What is the MCX Gold Mini lot size and margin?', a: 'MCX Gold Mini has a lot size of 100 grams, quoted in ₹ per 10 grams. At mid-2026 gold prices (~₹1,00,000/10g), one lot of Gold Mini is worth approximately ₹10 lakh. The required SPAN margin is approximately ₹55,000–₹75,000 per lot — making it the most accessible gold futures contract for retail traders. The standard 1 kg Gold contract requires ₹5–7 lakh in margin.' },
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
    faq: [
      { q: 'Why is MCX silver price up or down today?', a: 'Silver moves on two separate demand streams: monetary (like gold) and industrial. It rises when gold rises, but also when industrial demand is strong — particularly solar panel manufacturing, electronics, and EVs. Silver typically moves 2–3× more than gold in percentage terms. If gold is up 0.5% and silver is up 1.2%, the extra industrial demand or a favourable gold-silver ratio is likely driving the outperformance.' },
      { q: 'What is the gold-silver ratio and why does it matter for MCX?', a: 'The gold-silver ratio is the price of gold divided by the price of silver. Historically it oscillates between 60x and 90x. When the ratio is above 85x, silver is considered cheap relative to gold — traders watch for a mean reversion rally in silver. When below 65x, gold is relatively cheap. Indian traders use this ratio to time switches between MCX Gold and MCX Silver positions.' },
      { q: 'What is the MCX Silver Mini lot size and margin?', a: 'MCX Silver Mini has a lot size of 5 kg, quoted in ₹ per kg. At mid-2026 silver prices (~₹1,00,000/kg), one Silver Mini lot is worth approximately ₹5 lakh. SPAN margin is approximately ₹25,000–₹40,000 per lot. The Silver Micro (1 kg) requires only ₹5,000–₹8,000 margin — suitable for beginners.' },
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
    faq: [
      { q: 'Why is MCX crude oil price up or down today?', a: 'MCX crude oil moves with WTI and Brent crude benchmarks, adjusted for USD/INR. Key triggers for a move today: OPEC+ production cut or increase announcements, US EIA weekly inventory data (every Wednesday at 8 PM IST — a large inventory build is bearish, a draw is bullish), Iran-related geopolitical news (Strait of Hormuz risk), US dollar strength or weakness, and India\'s rupee level against the dollar.' },
      { q: 'Does MCX crude oil price affect petrol and diesel prices in India?', a: 'Yes, but with a significant delay and government intervention in between. Indian oil marketing companies (BPCL, IOCL, HPCL) absorb crude oil price swings for weeks before passing them to consumers. A sustained ₹500–₹1000/bbl rise in MCX crude over 2–3 months typically triggers a petrol/diesel price revision. Short-term MCX crude moves of 1–3% rarely translate immediately to pump prices.' },
      { q: 'What is the MCX Crude Oil Mini lot size and margin?', a: 'MCX Crude Oil Mini has a lot size of 10 barrels, quoted in ₹ per barrel. At ~₹6,500/bbl, one Crude Mini lot is worth ~₹65,000. SPAN margin is approximately ₹3,000–₹5,000 per lot — the most accessible energy futures contract for retail traders. The standard 100-barrel contract requires ₹30,000–₹45,000 margin. Crude expires around the 19th–20th of each month.' },
      { q: 'What is the OPEC decision and how does it affect MCX crude?', a: 'OPEC+ (23 nations including Saudi Arabia and Russia) controls ~40% of global oil supply. When they announce production cuts, crude prices typically rise sharply — often ₹200–500/bbl on MCX within a single session. When they raise output, prices fall. OPEC meets every 2–3 months; pre-meeting signals from Saudi Arabia\'s energy ministry often move markets before the official decision.' },
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
    faq: [
      { q: 'Why is MCX copper price up or down today?', a: 'Copper is known as "Dr. Copper" because its price reflects global economic health. MCX copper rises when: China\'s PMI (Purchasing Managers\' Index) is above 50 (signals manufacturing expansion), China announces infrastructure stimulus, LME copper inventory falls (tight supply), or the US dollar weakens. It falls when China\'s economy slows, PMI drops below 50, or LME inventory builds sharply. China consumes ~55% of global copper.' },
      { q: 'How does China affect MCX copper price in India?', a: 'China is the dominant demand driver for copper globally. Any data suggesting Chinese manufacturing is accelerating — PMI, industrial production, infrastructure project announcements — moves MCX copper within hours. The monthly Caixin and NBS China PMI releases (early morning IST) are the most watched single data points for MCX copper traders. China\'s property sector slowdown in 2022–2024 was a sustained bearish driver for copper.' },
      { q: 'What is the MCX Copper lot size and margin?', a: 'MCX Copper standard contract has a lot size of 1,000 kg (1 metric tonne), quoted in ₹ per kg. At ~₹960/kg, one lot is worth approximately ₹9.6 lakh. SPAN margin is approximately ₹80,000–₹1.2 lakh. The Copper Mini (250 kg) requires ₹20,000–₹30,000 margin and is more accessible for retail traders. Tick size is ₹0.05/kg — each tick move earns or costs ₹50 on the standard lot.' },
    ],
  },
  zinc: {
    title: 'Why MCX Zinc Is Moving Today — LME, Hindustan Zinc Analysis',
    description: 'MCX zinc price live today — why zinc is up or down: LME stocks, Hindustan Zinc output, China galvanizing demand and rupee impact. OHLC and daily intelligence for Indian traders.',
    keywords: [
      'why is MCX zinc moving today',
      'MCX zinc price today analysis India',
      'MCX zinc lot size India',
      'Hindustan Zinc MCX price impact',
      'LME zinc price India MCX',
      'Indonesia nickel ban MCX zinc',
      'why MCX zinc up today',
      'MCX zinc mini contract lot size',
      'galvanizing steel zinc price India',
    ],
    faq: [
      { q: 'Why is MCX zinc price up or down today?', a: 'MCX zinc is primarily driven by LME zinc prices (converted via USD/INR) and domestic supply from Hindustan Zinc. It rises when LME zinc warehouse stocks fall (tight supply), China galvanizing demand picks up (real estate or auto recovery), or Hindustan Zinc announces production cuts. It falls when Chinese property sector slows, global steel output drops, or the rupee strengthens against the dollar. Zinc\'s main use — galvanizing steel to prevent rust — ties it tightly to the construction and auto cycle.' },
      { q: 'How does Hindustan Zinc affect MCX zinc price?', a: 'Hindustan Zinc (Vedanta subsidiary, listed on NSE as HINDZINC) is India\'s dominant zinc producer, supplying ~75% of India\'s primary zinc needs. Any change in their production guidance, mine closures at Rajasthan operations, or quarterly earnings surprises directly moves MCX zinc. Hindustan Zinc\'s dividend policy also affects the Vedanta group\'s cash flow, which occasionally triggers sell-side zinc inventory movements. Watch for their quarterly results (April, July, October, January).' },
      { q: 'What is MCX zinc lot size and margin?', a: 'MCX Zinc standard contract has a lot size of 1,000 kg, quoted in ₹ per kg. At mid-2026 zinc prices (~₹285/kg), one lot is worth approximately ₹2.85 lakh. SPAN margin is approximately ₹7,000–14,000 per lot. The Zinc Mini (500 kg) requires roughly half the margin. Tick size is ₹0.05/kg — each tick is ₹50 on the standard lot.' },
    ],
  },
  aluminium: {
    title: 'Why MCX Aluminium Is Moving Today — LME, China Smelter Analysis',
    description: 'MCX aluminium price live today — why aluminium is up or down: China smelter output, LME stocks, EU energy costs and rupee impact. OHLC and daily intelligence for Indian traders.',
    keywords: [
      'why is MCX aluminium moving today',
      'MCX aluminium price today analysis India',
      'MCX aluminium lot size India',
      'China smelter policy MCX aluminium',
      'LME aluminium price India MCX',
      'why MCX aluminium up today',
      'MCX aluminium mini contract lot size',
      'Hindalco MCX aluminium impact',
      'EV aluminium demand India MCX',
    ],
    faq: [
      { q: 'Why is MCX aluminium price up or down today?', a: 'MCX aluminium tracks LME aluminium (London Metal Exchange) via import parity. It rises when Chinese aluminium smelters curtail output (power rationing, environmental inspections), LME warehouse stocks fall, or the rupee weakens. It falls when China pumps more aluminium into the market, energy costs ease (lowering smelting costs), or the US imposes safeguard measures that redirect Chinese exports. Aluminium is the most "state-influenced" base metal — Chinese government power subsidies are the single biggest price suppressant.' },
      { q: 'How does Chinese aluminium production affect MCX prices in India?', a: 'China produces 58% of global primary aluminium. Monthly output data from China\'s National Bureau of Statistics (NBS), released around the 16th of each month, is the most closely watched supply signal. A surprise drop in Chinese output typically lifts LME prices 1–3% within a session. Indian producers (Hindalco, BALCO/Vedanta) also respond — they benefit from higher LME prices but face competition from cheaper Chinese imports. Watch for Chinese power availability in Yunnan and Inner Mongolia where most smelters operate.' },
      { q: 'What is MCX aluminium lot size and margin?', a: 'MCX Aluminium standard contract has a lot size of 1,000 kg, quoted in ₹ per kg. At mid-2026 aluminium prices (~₹265/kg), one lot is worth approximately ₹2.65 lakh. SPAN margin is approximately ₹5,000–9,000 per lot. The Aluminium Mini (500 kg) is available for smaller capital. Tick size is ₹0.05/kg.' },
    ],
  },
  lead: {
    title: 'Why MCX Lead Is Moving Today — Battery, Hindustan Zinc Analysis',
    description: 'MCX lead price live today — why lead is up or down: battery demand, inverter cycle, Hindustan Zinc output and rupee impact. OHLC and daily intelligence for Indian traders.',
    keywords: [
      'why is MCX lead moving today',
      'MCX lead price today analysis India',
      'MCX lead lot size India',
      'Hindustan Zinc lead price India',
      'lead acid battery MCX lead price',
      'why MCX lead up today',
      'MCX lead mini contract lot size',
      'India inverter battery lead demand',
      'LME lead price India MCX',
    ],
    faq: [
      { q: 'Why is MCX lead price up or down today?', a: 'Lead\'s price is 80% driven by battery demand — auto starter batteries, inverter/UPS batteries, and e-rickshaws. MCX lead rises when Indian auto production recovers, pre-monsoon inverter restocking begins (March–May), or Hindustan Zinc cuts lead output. It falls when vehicle production slumps, scrap battery availability rises (secondary smelting supply), or LME lead warehouse stocks build. India has one of the world\'s largest inverter markets, making Indian domestic demand a unique driver that can diverge from global LME signals.' },
      { q: 'Why does India\'s inverter market matter for MCX lead price?', a: 'India has over 100 million lead-acid inverter/UPS batteries installed in homes and offices, with an average replacement cycle of 3–4 years. The pre-summer period (March–June) sees a spike in inverter battery replacements as households prepare for power cuts — this creates a recurring seasonal demand pulse for lead in India. This domestic demand sometimes causes MCX lead to trade at a premium to LME import parity. E-rickshaw battery demand in UP, Bihar, and Rajasthan adds another India-specific consumption layer that doesn\'t exist in most other markets.' },
      { q: 'What is MCX lead lot size and margin?', a: 'MCX Lead standard contract has a lot size of 1,000 kg, quoted in ₹ per kg. At mid-2026 lead prices (~₹185/kg), one lot is worth approximately ₹1.85 lakh. SPAN margin is approximately ₹5,000–9,000 per lot. Lead is among the lowest-capital base metal contracts on MCX, but it can still swing 2–4% on battery demand or Hindustan Zinc news.' },
    ],
  },
  nickel: {
    title: 'Why MCX Nickel Is Moving Today — Indonesia, LME & EV Analysis',
    description: 'MCX nickel price live today — why nickel is up or down: Indonesia export ban, LME stocks, EV battery demand and rupee impact. OHLC and daily intelligence for Indian traders.',
    keywords: [
      'why is MCX nickel moving today',
      'MCX nickel price today analysis India',
      'MCX nickel lot size India',
      'Indonesia nickel export ban MCX India',
      'why MCX nickel up today',
      'MCX nickel mini contract lot size',
      'EV battery nickel demand MCX India',
      'LME nickel short squeeze India',
      'Norilsk Nickel price MCX India',
    ],
    faq: [
      { q: 'Why is MCX nickel price up or down today?', a: 'MCX nickel tracks LME nickel and is one of the most volatile base metals. It rises when Indonesia signals tighter nickel ore export controls, LME nickel stocks fall, stainless steel demand surges from China, or EV battery demand upgrades nickel consumption forecasts. It falls when Indonesia increases RKAB (mining quota) allowances, China stainless steel output slows, or battery chemistry shifts from NMC (nickel-rich) to LFP (no nickel) accelerate. The March 2022 LME short squeeze (price doubled to $100,000/tonne in 48 hours before trading was halted) remains a defining reminder of nickel\'s extreme volatility.' },
      { q: 'Why does Indonesia\'s nickel policy matter so much for MCX nickel price?', a: 'Indonesia banned nickel ore exports in 2020 and now controls 48% of global mined nickel supply — the highest concentration of any critical mineral in one country. Any Indonesian government statement about export quotas, RKAB mining permits, or processing requirements moves global nickel prices immediately. Indonesia has used this leverage to force global battery and stainless steel manufacturers to build processing plants (HPAL facilities) inside Indonesia, effectively verticalizing the entire nickel-to-battery supply chain. For Indian traders, Indonesian policy announcements at dawn (IST) can gap MCX nickel up or down 3–5% at the open.' },
      { q: 'What is MCX nickel lot size and margin?', a: 'MCX Nickel standard contract has a lot size of 250 kg, quoted in ₹ per kg. At mid-2026 nickel prices (~₹1,650/kg), one lot is worth approximately ₹4.1 lakh. SPAN margin is approximately ₹20,000–35,000 per lot. Despite the smaller lot size, nickel\'s high price-per-kg and volatility make it a high-risk contract. Nickel is available in 250 kg increments only (no mini contract on MCX).' },
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
    faq: [
      { q: 'Why is MCX natural gas price up or down today?', a: 'MCX Natural Gas tracks US Henry Hub prices (converted to rupees). It rises when: US natural gas storage draws are larger than expected (EIA report every Thursday at ~8:30 PM IST), winter heating demand is strong in the US or Europe, LNG export capacity increases tighten US domestic supply, or the rupee weakens. It falls when storage builds exceed expectations, weather forecasts are mild, or US production hits new highs.' },
      { q: 'What is the EIA natural gas report and when is it released?', a: 'The US Energy Information Administration (EIA) releases weekly natural gas storage data every Thursday at approximately 8:30 PM IST. This is the most important weekly event for MCX Natural Gas traders. A storage draw larger than the market consensus is bullish (price rises); a build larger than consensus is bearish (price falls). The 5-year average storage level is used as the benchmark.' },
      { q: 'What is the MCX Natural Gas lot size and margin?', a: 'MCX Natural Gas standard contract has a lot size of 1,250 mmBtu, quoted in ₹ per mmBtu. At ~₹320/mmBtu, one lot is worth approximately ₹4 lakh. SPAN margin is approximately ₹20,000–₹30,000. The Natural Gas Mini (250 mmBtu) requires only ₹4,000–₹6,000 margin — but natural gas is the most volatile MCX contract (5–10% single-day moves are common), so even the Mini carries significant risk for beginners.' },
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
  const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
  const baseTitle   = meta ? meta.title : `MCX ${entry.key} Price Today — Live Price & Analysis`
  const title       = `${baseTitle} | ${todayStr}`
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
  const meta   = COMMODITY_META[entry.key]

  const [articles, allBriefs] = await Promise.all([
    getAllArticles().catch(() => []),
    getAllBriefs(),
  ])
  const snap   = loadSnapshot()
  const prices = snap ? snapshotToPriceData(snap) : null

  const priceData = prices ? prices[entry.priceKey as CommodityPriceKey] : null
  const ltp       = priceData?.mcx         ?? 0
  const pct       = priceData?.mcxChangePct ?? 0
  const open      = priceData?.mcxOpen      ?? 0
  const high      = priceData?.mcxHigh      ?? 0
  const low       = priceData?.mcxLow       ?? 0
  const prevClose = priceData?.mcxPrevClose  ?? 0

  const commodityArticles = articles
    .filter(a => normalizeCommodityValue(a.commodity) === entry.key)
    .slice(0, 6)

  // Label used in brief frontmatter / arc data — single shared source of
  // truth (was a locally duplicated map that disagreed with the arc system's
  // natgas naming convention; see lib/commodityTags.ts).
  const briefCommodityLabel = KEY_TO_MCX_LABEL[entry.key as CommodityKey]
  const recentBriefs = allBriefs
    .filter(b => b.commodities.includes(briefCommodityLabel))
    .slice(0, 5)

  // Developing Story banner — active arc where this commodity is the lead or a named participant.
  // Prefer an arc where this commodity is actually PRIMARY over one that merely
  // tags it (e.g. don't show the crude page's arc on the gold page just
  // because the crude arc's tags happen to include "MCX Gold"); break ties by
  // most recently started.
  const commodityArcs = getActiveArcs()
    .filter(arc => arc.primaryCommodity === briefCommodityLabel || arc.tags.includes(briefCommodityLabel))
    .sort((a, b) => {
      const aPrimary = a.primaryCommodity === briefCommodityLabel ? 1 : 0
      const bPrimary = b.primaryCommodity === briefCommodityLabel ? 1 : 0
      if (aPrimary !== bPrimary) return bPrimary - aPrimary
      return b.startDate.localeCompare(a.startDate)
    })
  const leadArc = commodityArcs[0]

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
          // Per-commodity targeted Q&As (search-intent aligned)
          ...(meta?.faq ?? []).map(({ q, a }) => ({
            '@type': 'Question',
            name:    q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          })),
          // Generic market-structure Q&As
          {
            '@type': 'Question',
            name:    `What moves MCX ${info.name} price?`,
            acceptedAnswer: { '@type': 'Answer', text: info.priceDrivers.join(' ') },
          },
          {
            '@type': 'Question',
            name:    `Who are the main buyers of ${info.name} in India?`,
            acceptedAnswer: { '@type': 'Answer', text: info.demandDrivers.join(' ') },
          },
          {
            '@type': 'Question',
            name:    `Who controls ${info.name} supply globally?`,
            acceptedAnswer: { '@type': 'Answer', text: info.supplyControl },
          },
          {
            '@type': 'Question',
            name:    `What are the key risks in MCX ${info.name} trading?`,
            acceptedAnswer: { '@type': 'Answer', text: info.keyRisk },
          },
        ],
      },
    ],
  }

  const speakableSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: pageUrl,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.commodity-price-summary'],
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableSchema) }} />
      <CommodityVisitTracker slug={commodity} name={info.name} />

      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 12, display: 'flex', gap: 8 }}>
        <Link href="/" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>Home</Link>
        <span>›</span>
        <span style={{ color: 'var(--ink-3)' }}>Commodities</span>
        <span>›</span>
        <span style={{ color: 'var(--ink-2)' }}>{info.name}</span>
      </div>
      {/* Hero — live price */}
      <div className="commodity-price-summary" style={{
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
              <span style={{ fontSize: 15, color: 'var(--ink-4)' }}>{info.mcxSymbol}</span>
              <span style={{ fontSize: 15, color: 'var(--ink-4)' }}>·</span>
              <span style={{ fontSize: 15, color: 'var(--ink-4)' }}>{info.unit}</span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500,
              color: 'var(--ink)', margin: '0 0 4px', lineHeight: 1.2,
            }}>
              MCX {info.name} Price Today
            </h1>
            <p style={{ fontSize: 15, color: 'var(--ink-4)', margin: 0 }}>
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
          {/* Developing Story — shows when an active arc involves this commodity */}
          {leadArc && (
            <Link href={`/arcs/${leadArc.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 24 }}>
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
                  Developing Story · Day {leadArc.latestDay}
                </div>
                <div style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  lineHeight: 1.3,
                  marginBottom: 6,
                }}>
                  {leadArc.title}
                </div>
                <p style={{
                  fontSize: 13,
                  color: 'var(--ink-3)',
                  margin: '0 0 8px',
                  lineHeight: 1.5,
                }}>
                  {leadArc.summary}
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
          )}

          {/* Recent intelligence */}
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500,
            color: 'var(--ink)', margin: '0 0 16px',
          }}>
            {info.name} Intelligence
          </h2>

          {commodityArticles.length === 0 ? (
            <div style={{
              background: 'var(--surface-3)', borderRadius: 4, padding: '20px 24px',
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
                    borderRadius: 4, padding: '16px 20px',
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
                      <div style={{ fontSize: 15, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.5 }}>
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
                      borderRadius: 4, padding: '14px 20px',
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
            borderRadius: 4, padding: '20px 24px', marginBottom: 32,
          }}>
            <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {info.priceDrivers.map((driver, i) => (
                <li key={i} style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{driver}</li>
              ))}
            </ul>
          </div>

          <UpcomingEventsForCommodity commodityKey={entry.key} name={info.name} />

          {/* Demand drivers */}
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)', margin: '0 0 16px' }}>
            Demand Drivers
          </h2>
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '20px 24px', marginBottom: 32,
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
            borderRadius: 4, padding: '16px 20px', marginBottom: 32,
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
            borderRadius: 4, padding: '20px',
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
                <span style={{ fontSize: 15, color: 'var(--ink-2)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
              </div>
            ))}
            <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 10, lineHeight: 1.5 }}>
              Margins are illustrative. Check your broker&apos;s SPAN calculator for live requirements.
            </p>
          </div>

          {/* Supply control */}
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '20px',
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>
              Who Controls Supply
            </div>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.7, margin: 0 }}>
              {info.supplyControl}
            </p>
          </div>

          {/* Macro links */}
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '20px',
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
            borderRadius: 4, padding: '16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
              Tax Treatment
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: 0, lineHeight: 1.6 }}>{info.taxNote}</p>
          </div>

          {/* Related guides — links to /learn */}
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '20px',
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 12 }}>
              Learn MCX Trading
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Contract lot sizes & margins',  href: '/learn/mcx-lot-sizes' },
                { label: 'How futures & leverage work',   href: '/learn/mcx-margin-calculation' },
                { label: 'Contango & backwardation',      href: '/learn/mcx-rollover' },
                { label: 'How jewellers hedge',           href: '/learn' },
                { label: 'MCX taxation guide',            href: '/learn/mcx-commodity-tax-india' },
                ...(entry.key === 'gold' ? [
                  { label: 'MCX Gold vs Gold ETF',        href: '/learn/gold-etf-vs-mcx-gold' },
                  { label: 'MCX Gold contract guide',     href: '/learn/mcx-gold-contracts' },
                ] : []),
              ].map(({ label, href }) => (
                <Link key={label} href={href} style={{
                  fontSize: 15, color: 'var(--gold)', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.4,
                }}>
                  <span style={{ fontSize: 10, opacity: 0.6 }}>→</span> {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Other commodity pages */}
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>
              Also Track
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>
              Precious &amp; Energy
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {[
                { label: 'Gold',    href: '/commodities/gold',        key: 'gold' },
                { label: 'Silver',  href: '/commodities/silver',      key: 'silver' },
                { label: 'Crude',   href: '/commodities/crude-oil',   key: 'crude' },
                { label: 'Copper',  href: '/commodities/copper',      key: 'copper' },
                { label: 'Nat Gas', href: '/commodities/natural-gas', key: 'natgas' },
              ].filter(c => c.key !== entry.key).map(c => (
                <Link key={c.key} href={c.href} style={{
                  fontSize: 12, fontWeight: 500, textDecoration: 'none',
                  padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border-2)',
                  color: 'var(--ink-3)', background: 'var(--surface-2)',
                }}>
                  {c.label}
                </Link>
              ))}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>
              Base Metals
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: 'Zinc',      href: '/commodities/zinc',      key: 'zinc' },
                { label: 'Aluminium', href: '/commodities/aluminium', key: 'aluminium' },
                { label: 'Lead',      href: '/commodities/lead',      key: 'lead' },
                { label: 'Nickel',    href: '/commodities/nickel',    key: 'nickel' },
              ].filter(c => c.key !== entry.key).map(c => (
                <Link key={c.key} href={c.href} style={{
                  fontSize: 12, fontWeight: 500, textDecoration: 'none',
                  padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border-2)',
                  color: 'var(--ink-3)', background: 'var(--surface-2)',
                }}>
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav strip */}
      <div style={{ marginTop: 16, paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Link href="/articles" style={{
          fontSize: 15, color, fontWeight: 500, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          ← All Market Intelligence
        </Link>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/markets" style={{ fontSize: 15, color: 'var(--ink-3)', textDecoration: 'none' }}>
            Live Prices
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: 'var(--ink-3)', textDecoration: 'none' }}>
            Learn MCX
          </Link>
          <Link href="/invest" style={{ fontSize: 15, color: 'var(--ink-3)', textDecoration: 'none' }}>
            How to Invest
          </Link>
        </div>
      </div>

      {/* SEBI disclaimer — moved here (Part 12 §12.11: "below the content,
          above the bottom nav"), was previously at the very top of the page,
          227 lines away from the event-impact stats it's meant to cover. */}
      <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '20px 0 0', lineHeight: 1.6 }}>
        BhaavBrief is not a SEBI-registered investment advisor. Prices and analysis are for informational purposes only. Nothing here constitutes a buy, sell, or hold recommendation. Consult a SEBI-registered advisor before making any financial decision.
      </p>
    </>
  )
}
