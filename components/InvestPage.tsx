'use client'
import { useState, useEffect } from 'react'
import Pill, { type PillTone } from '@/components/ui/Pill'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'indian-etf' | 'indian-mf' | 'indian-stocks' | 'global-etf' | 'global-stocks'

interface Instrument {
  name:        string
  ticker:      string         // display ticker
  priceKey:    string         // key into prices API (NSE symbol or global ticker)
  exchange:    'NSE' | 'NYSE' | 'LSE' | 'OTC'
  type:        'ETF' | 'MF' | 'Stock'
  isGlobal:    boolean
  commodity:   string[]       // filter tags
  expenseRatio?: string
  aum?:        string
  platform:    string
  source:      string         // authoritative source label
  underlying:  string         // what it tracks
  note?:       string
}

// ── Instrument Data — sourced from NSE, Kite, iShares, SPDR, VanEck ─────────

const INSTRUMENTS: Record<TabId, Instrument[]> = {

  'indian-etf': [
    // Gold ETFs — source: NSE India ETF list + AMC fact sheets
    { name: 'Nippon India Gold ETF (GoldBEES)', ticker: 'GOLDBEES',     priceKey: 'GOLDBEES',    exchange: 'NSE', type: 'ETF', isGlobal: false, commodity: ['Gold'],             expenseRatio: '0.79%', aum: '₹10,200 Cr', platform: 'Zerodha · Groww · Angel', source: 'NSE / Nippon AMC',     underlying: 'Physical Gold (LBMA)' },
    { name: 'SBI Gold ETF',                     ticker: 'SETFGOLD',     priceKey: 'SETFGOLD',    exchange: 'NSE', type: 'ETF', isGlobal: false, commodity: ['Gold'],             expenseRatio: '0.61%', aum: '₹2,800 Cr',  platform: 'All platforms',           source: 'NSE / SBI MF',         underlying: 'Physical Gold (LBMA)' },
    { name: 'HDFC Gold ETF',                    ticker: 'HDFCGOLD',     priceKey: 'HDFCGOLD',    exchange: 'NSE', type: 'ETF', isGlobal: false, commodity: ['Gold'],             expenseRatio: '0.59%', aum: '₹3,400 Cr',  platform: 'All platforms',           source: 'NSE / HDFC MF',        underlying: 'Physical Gold (LBMA)' },
    { name: 'Axis Gold ETF',                    ticker: 'AXISGOLD',     priceKey: 'AXISGOLD',    exchange: 'NSE', type: 'ETF', isGlobal: false, commodity: ['Gold'],             expenseRatio: '0.49%', aum: '₹680 Cr',    platform: 'All platforms',           source: 'NSE / Axis MF',        underlying: 'Physical Gold (LBMA)' },
    // Silver ETFs — launched 2022 onwards
    { name: 'Nippon India Silver ETF',          ticker: 'SILVERBEES',   priceKey: 'SILVERBEES',  exchange: 'NSE', type: 'ETF', isGlobal: false, commodity: ['Silver'],           expenseRatio: '0.56%', aum: '₹2,100 Cr',  platform: 'Zerodha · Groww',         source: 'NSE / Nippon AMC',     underlying: 'Physical Silver (LBMA)' },
    { name: 'ICICI Pru Silver ETF',             ticker: 'SILVERIETF',   priceKey: 'SILVERIETF',  exchange: 'NSE', type: 'ETF', isGlobal: false, commodity: ['Silver'],           expenseRatio: '0.40%', aum: '₹1,450 Cr',  platform: 'All platforms',           source: 'NSE / ICICI Pru MF',   underlying: 'Physical Silver (LBMA)' },
  ],

  'indian-mf': [
    // Commodity MFs — source: AMFI India + AMC websites
    { name: 'ICICI Pru Commodities Fund',       ticker: 'Direct Growth', priceKey: '',           exchange: 'NSE', type: 'MF', isGlobal: false, commodity: ['Diversified'],       expenseRatio: '0.78%', aum: '₹2,400 Cr',  platform: 'MF Central · Kuvera',    source: 'AMFI / ICICI Pru MF',  underlying: 'Global commodity companies' },
    { name: 'Nippon India Commodities Fund',    ticker: 'Direct Growth', priceKey: '',           exchange: 'NSE', type: 'MF', isGlobal: false, commodity: ['Energy', 'Metals'],  expenseRatio: '0.87%', aum: '₹1,100 Cr',  platform: 'MF Central · Kuvera',    source: 'AMFI / Nippon AMC',    underlying: 'Energy + Metals companies' },
    { name: 'Tata Resources & Energy Fund',     ticker: 'Direct Growth', priceKey: '',           exchange: 'NSE', type: 'MF', isGlobal: false, commodity: ['Energy'],            expenseRatio: '0.66%', aum: '₹920 Cr',    platform: 'MF Central · Kuvera',    source: 'AMFI / Tata MF',       underlying: 'Energy + Resources' },
    { name: 'DSP Natural Resources & NE',       ticker: 'Direct Growth', priceKey: '',           exchange: 'NSE', type: 'MF', isGlobal: false, commodity: ['Diversified'],       expenseRatio: '0.93%', aum: '₹710 Cr',    platform: 'MF Central · Kuvera',    source: 'AMFI / DSP MF',        underlying: 'Natural resources global' },
    { name: 'HDFC Gold Fund (FoF)',             ticker: 'FoF · No demat', priceKey: '',          exchange: 'NSE', type: 'MF', isGlobal: false, commodity: ['Gold'],              expenseRatio: '0.18%', aum: '₹2,800 Cr',  platform: 'All platforms',          source: 'AMFI / HDFC MF',       underlying: 'HDFC Gold ETF', note: 'No demat needed' },
    { name: 'Axis Gold Fund (FoF)',             ticker: 'FoF · No demat', priceKey: '',          exchange: 'NSE', type: 'MF', isGlobal: false, commodity: ['Gold'],              expenseRatio: '0.10%', aum: '₹650 Cr',    platform: 'All platforms',          source: 'AMFI / Axis MF',       underlying: 'Axis Gold ETF', note: 'No demat needed' },
  ],

  'indian-stocks': [
    // Source: NSE listed companies with primary commodity revenue
    { name: 'Hindalco Industries',              ticker: 'HINDALCO',     priceKey: 'HINDALCO',    exchange: 'NSE', type: 'Stock', isGlobal: false, commodity: ['Aluminium', 'Copper'], platform: 'All platforms', source: 'NSE',  underlying: 'Aluminium smelting + Novelis copper' },
    { name: 'Vedanta Limited',                  ticker: 'VEDL',         priceKey: 'VEDL',        exchange: 'NSE', type: 'Stock', isGlobal: false, commodity: ['Zinc', 'Oil', 'Aluminium'], platform: 'All platforms', source: 'NSE', underlying: 'Zinc · Lead · Aluminium · Oil' },
    { name: 'Hindustan Zinc',                   ticker: 'HINDZINC',     priceKey: 'HINDZINC',    exchange: 'NSE', type: 'Stock', isGlobal: false, commodity: ['Zinc', 'Silver'],    platform: 'All platforms', source: 'NSE',  underlying: 'Zinc + Silver by-product' },
    { name: 'Hindustan Copper',                 ticker: 'HINDCOPPER',   priceKey: 'HINDCOPPER',  exchange: 'NSE', type: 'Stock', isGlobal: false, commodity: ['Copper'],           platform: 'All platforms', source: 'NSE',  underlying: 'Copper mining (Govt PSU)' },
    { name: 'NMDC Limited',                     ticker: 'NMDC',         priceKey: 'NMDC',        exchange: 'NSE', type: 'Stock', isGlobal: false, commodity: ['Iron Ore'],         platform: 'All platforms', source: 'NSE',  underlying: 'Iron ore (Govt PSU)' },
    { name: 'Coal India',                       ticker: 'COALINDIA',    priceKey: 'COALINDIA',   exchange: 'NSE', type: 'Stock', isGlobal: false, commodity: ['Coal'],             platform: 'All platforms', source: 'NSE',  underlying: 'Thermal coal (Govt PSU)' },
    { name: 'MOIL Limited',                     ticker: 'MOIL',         priceKey: 'MOIL',        exchange: 'NSE', type: 'Stock', isGlobal: false, commodity: ['Manganese'],        platform: 'All platforms', source: 'NSE',  underlying: 'Manganese ore (Govt PSU)' },
    { name: 'JSW Steel',                        ticker: 'JSWSTEEL',     priceKey: 'JSWSTEEL',    exchange: 'NSE', type: 'Stock', isGlobal: false, commodity: ['Steel'],            platform: 'All platforms', source: 'NSE',  underlying: 'Integrated steel producer' },
    { name: 'SAIL',                             ticker: 'SAIL',         priceKey: 'SAIL',        exchange: 'NSE', type: 'Stock', isGlobal: false, commodity: ['Steel'],            platform: 'All platforms', source: 'NSE',  underlying: 'Steel (Govt PSU)' },
    { name: 'ONGC',                             ticker: 'ONGC',         priceKey: 'ONGC',        exchange: 'NSE', type: 'Stock', isGlobal: false, commodity: ['Oil', 'Gas'],       platform: 'All platforms', source: 'NSE',  underlying: 'Upstream oil & gas (Govt PSU)' },
    { name: 'GAIL India',                       ticker: 'GAIL',         priceKey: 'GAIL',        exchange: 'NSE', type: 'Stock', isGlobal: false, commodity: ['Gas'],              platform: 'All platforms', source: 'NSE',  underlying: 'Natural gas transmission + LPG' },
  ],

  'global-etf': [
    // Source: iShares, SPDR, VanEck official product pages
    // Gold ETFs
    { name: 'SPDR Gold Shares',                 ticker: 'GLD',  priceKey: 'GLD',  exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Gold'],            expenseRatio: '0.40%', aum: '$73B',   platform: 'Vested · INDmoney',  source: 'SPDR / State Street',    underlying: 'Physical Gold (LBMA allocated)' },
    { name: 'iShares Gold Trust',               ticker: 'IAU',  priceKey: 'IAU',  exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Gold'],            expenseRatio: '0.25%', aum: '$32B',   platform: 'Vested · INDmoney',  source: 'iShares / BlackRock',    underlying: 'Physical Gold (LBMA)' },
    { name: 'iShares Gold Trust Micro',         ticker: 'IAUM', priceKey: 'IAUM', exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Gold'],            expenseRatio: '0.09%', aum: '$1.2B',  platform: 'Vested · INDmoney',  source: 'iShares / BlackRock',    underlying: 'Physical Gold — lowest cost', note: 'Lowest expense ratio' },
    // Silver ETFs
    { name: 'iShares Silver Trust',             ticker: 'SLV',  priceKey: 'SLV',  exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Silver'],          expenseRatio: '0.50%', aum: '$14B',   platform: 'Vested · INDmoney',  source: 'iShares / BlackRock',    underlying: 'Physical Silver (LBMA)' },
    { name: 'Aberdeen Silver ETF',              ticker: 'SIVR', priceKey: 'SIVR', exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Silver'],          expenseRatio: '0.30%', aum: '$1.1B',  platform: 'Vested · INDmoney',  source: 'Aberdeen Standard',      underlying: 'Physical Silver (LBMA)' },
    // Gold Miners
    { name: 'VanEck Gold Miners ETF',           ticker: 'GDX',  priceKey: 'GDX',  exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Gold'],            expenseRatio: '0.51%', aum: '$15B',   platform: 'Vested · INDmoney',  source: 'VanEck',                 underlying: 'Large-cap gold mining companies' },
    { name: 'VanEck Junior Gold Miners ETF',    ticker: 'GDXJ', priceKey: 'GDXJ', exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Gold'],            expenseRatio: '0.52%', aum: '$5.8B',  platform: 'Vested · INDmoney',  source: 'VanEck',                 underlying: 'Small/mid-cap gold miners' },
    // Copper & Base Metals
    { name: 'Global X Copper Miners ETF',       ticker: 'COPX', priceKey: 'COPX', exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Copper'],          expenseRatio: '0.65%', aum: '$3.2B',  platform: 'Vested · INDmoney',  source: 'Global X',               underlying: 'Global copper mining companies' },
    // Energy / Oil
    { name: 'United States Oil Fund',           ticker: 'USO',  priceKey: 'USO',  exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Oil'],             expenseRatio: '0.60%', aum: '$1.4B',  platform: 'Vested · INDmoney',  source: 'USCF Investments',       underlying: 'Near-month WTI crude futures', note: 'Futures roll — not spot' },
    { name: 'United States Brent Oil Fund',     ticker: 'BNO',  priceKey: 'BNO',  exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Oil'],             expenseRatio: '0.75%', aum: '$120M',  platform: 'Vested · INDmoney',  source: 'USCF Investments',       underlying: 'Near-month Brent crude futures', note: 'Futures roll — not spot' },
    // Broad Metals & Mining
    { name: 'SPDR Metals & Mining ETF',         ticker: 'XME',  priceKey: 'XME',  exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Diversified'],     expenseRatio: '0.35%', aum: '$1.8B',  platform: 'Vested · INDmoney',  source: 'SPDR / State Street',    underlying: 'US metals & mining companies (equal weight)' },
    { name: 'iShares MSCI Global Miners',       ticker: 'PICK', priceKey: 'PICK', exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Diversified'],     expenseRatio: '0.39%', aum: '$820M',  platform: 'Vested · INDmoney',  source: 'iShares / BlackRock',    underlying: 'Global diversified mining companies' },
    // Critical Minerals / Battery
    { name: 'Global X Lithium & Battery Tech',  ticker: 'LIT',  priceKey: 'LIT',  exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Lithium'],         expenseRatio: '0.75%', aum: '$1.9B',  platform: 'Vested · INDmoney',  source: 'Global X',               underlying: 'Lithium mining + battery companies' },
    { name: 'VanEck Rare Earth/Strategic Metal',ticker: 'REMX', priceKey: 'REMX', exchange: 'NYSE', type: 'ETF', isGlobal: true, commodity: ['Rare Earths'],     expenseRatio: '0.54%', aum: '$740M',  platform: 'Vested · INDmoney',  source: 'VanEck',                 underlying: 'Rare earth & strategic metals miners' },
  ],

  'global-stocks': [
    // Source: NYSE/LSE listed; exposure verified from company annual reports
    // Gold
    { name: 'Newmont Corporation',              ticker: 'NEM',   priceKey: 'NEM',   exchange: 'NYSE', type: 'Stock', isGlobal: true, commodity: ['Gold'],          platform: 'Vested · INDmoney', source: 'NYSE',  underlying: "World's largest gold producer" },
    { name: 'Barrick Gold',                     ticker: 'GOLD',  priceKey: 'GOLD',  exchange: 'NYSE', type: 'Stock', isGlobal: true, commodity: ['Gold'],          platform: 'Vested · INDmoney', source: 'NYSE',  underlying: 'Gold + Copper mining (Tier 1 assets)' },
    { name: 'Agnico Eagle Mines',               ticker: 'AEM',   priceKey: 'AEM',   exchange: 'NYSE', type: 'Stock', isGlobal: true, commodity: ['Gold'],          platform: 'Vested · INDmoney', source: 'NYSE',  underlying: 'Senior gold producer — Canada/Americas' },
    { name: 'Wheaton Precious Metals',          ticker: 'WPM',   priceKey: 'WPM',   exchange: 'NYSE', type: 'Stock', isGlobal: true, commodity: ['Gold', 'Silver'], platform: 'Vested · INDmoney', source: 'NYSE', underlying: 'Precious metals streaming (royalty model)' },
    // Copper
    { name: 'Freeport-McMoRan',                 ticker: 'FCX',   priceKey: 'FCX',   exchange: 'NYSE', type: 'Stock', isGlobal: true, commodity: ['Copper'],        platform: 'Vested · INDmoney', source: 'NYSE',  underlying: 'Largest publicly traded copper miner' },
    { name: 'Teck Resources (Class B)',         ticker: 'TECK',  priceKey: 'TECK',  exchange: 'NYSE', type: 'Stock', isGlobal: true, commodity: ['Copper', 'Zinc'], platform: 'Vested · INDmoney', source: 'NYSE', underlying: 'Copper + Zinc mining (QB2 ramp-up)' },
    // Diversified Major Miners
    { name: 'BHP Group',                        ticker: 'BHP',   priceKey: 'BHP',   exchange: 'NYSE', type: 'Stock', isGlobal: true, commodity: ['Copper', 'Iron Ore', 'Coal'], platform: 'Vested · INDmoney', source: 'NYSE', underlying: 'World-scale diversified miner' },
    { name: 'Rio Tinto',                        ticker: 'RIO',   priceKey: 'RIO',   exchange: 'NYSE', type: 'Stock', isGlobal: true, commodity: ['Iron Ore', 'Copper', 'Aluminium'], platform: 'Vested · INDmoney', source: 'NYSE', underlying: 'Iron ore + Copper + Aluminium' },
    { name: 'Vale S.A.',                        ticker: 'VALE',  priceKey: 'VALE',  exchange: 'NYSE', type: 'Stock', isGlobal: true, commodity: ['Iron Ore', 'Nickel'], platform: 'Vested · INDmoney', source: 'NYSE', underlying: 'World\'s largest iron ore producer' },
    { name: 'Glencore',                         ticker: 'GLNCY', priceKey: 'GLNCY', exchange: 'OTC',  type: 'Stock', isGlobal: true, commodity: ['Diversified'],   platform: 'Vested',            source: 'OTC/LSE', underlying: 'Trading + Mining — oil, copper, coal, zinc' },
    // Aluminium / Specialty
    { name: 'Alcoa Corporation',                ticker: 'AA',    priceKey: 'AA',    exchange: 'NYSE', type: 'Stock', isGlobal: true, commodity: ['Aluminium'],     platform: 'Vested · INDmoney', source: 'NYSE',  underlying: 'Aluminium smelting + Alumina refining' },
    // Lithium
    { name: 'Albemarle Corporation',            ticker: 'ALB',   priceKey: 'ALB',   exchange: 'NYSE', type: 'Stock', isGlobal: true, commodity: ['Lithium'],       platform: 'Vested · INDmoney', source: 'NYSE',  underlying: 'World\'s largest lithium producer' },
  ],
}

// ── All commodity filter tags across all tabs ─────────────────────────────────
const ALL_COMMODITIES = ['Gold', 'Silver', 'Copper', 'Oil', 'Gas', 'Aluminium', 'Zinc', 'Iron Ore', 'Coal', 'Steel', 'Lithium', 'Diversified']

const TABS: { id: TabId; label: string; count: number }[] = [
  { id: 'indian-etf',    label: 'Indian ETFs',    count: INSTRUMENTS['indian-etf'].length },
  { id: 'indian-mf',     label: 'Indian MFs',     count: INSTRUMENTS['indian-mf'].length },
  { id: 'indian-stocks', label: 'Indian Stocks',  count: INSTRUMENTS['indian-stocks'].length },
  { id: 'global-etf',    label: 'Global ETFs',    count: INSTRUMENTS['global-etf'].length },
  { id: 'global-stocks', label: 'Global Stocks',  count: INSTRUMENTS['global-stocks'].length },
]

const TYPE_TONE: Record<string, PillTone> = {
  ETF:   'energy',
  MF:    'metals',
  Stock: 'macro',
}

// ── Price helpers ─────────────────────────────────────────────────────────────

interface PriceData {
  price: number
  changePct?: number
}

function formatPrice(instrument: Instrument, prices: { nse: Record<string, PriceData>; global: Record<string, PriceData> }): PriceData | null {
  if (!instrument.priceKey) return null
  return instrument.isGlobal ? (prices.global[instrument.priceKey] ?? null) : (prices.nse[instrument.priceKey] ?? null)
}

function PriceBadge({ data, currency }: { data: PriceData | null; currency: '₹' | '$' }) {
  if (!data) return (
    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#C8C8B8' }}>—</span>
  )
  const chg    = data.changePct ?? 0
  const isUp   = chg >= 0
  const color  = chg === 0 ? '#8A8A7A' : isUp ? '#1E6630' : '#991818'
  const prefix = chg === 0 ? '' : isUp ? '+' : ''
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: '#18180F' }}>
        {currency}{data.price.toLocaleString('en-IN', { maximumFractionDigits: currency === '$' ? 2 : 0 })}
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color, marginTop: 1 }}>
        {prefix}{chg.toFixed(2)}%
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function InstrumentCard({ item, prices }: { item: Instrument; prices: { nse: Record<string, PriceData>; global: Record<string, PriceData> } }) {
  const typeTone  = TYPE_TONE[item.type] ?? 'macro'
  const priceData = formatPrice(item, prices)
  const currency  = item.isGlobal ? '$' : '₹'

  return (
    <div style={{
      background: '#FAFAF6',
      border: '0.5px solid #DDDDD0',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>
      {/* Top row: type badge + price */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <Pill tone={typeTone} size="xs">{item.type}</Pill>
        <PriceBadge data={priceData} currency={currency} />
      </div>

      {/* Name */}
      <div style={{ fontSize: 15, fontWeight: 600, color: '#18180F', lineHeight: 1.35, marginBottom: 3 }}>
        {item.name}
      </div>

      {/* Ticker + exchange */}
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#8A8A7A', marginBottom: 10 }}>
        {item.ticker} · {item.exchange}
      </div>

      {/* Underlying */}
      <div style={{ fontSize: 15, color: '#48483A', lineHeight: 1.6, marginBottom: 10, fontWeight: 300 }}>
        {item.underlying}
      </div>

      {/* Note if any */}
      {item.note && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#C8720A', marginBottom: 10, letterSpacing: '0.04em' }}>
          ✦ {item.note}
        </div>
      )}

      {/* Metrics row */}
      <div style={{ borderTop: '0.5px solid #DDDDD0', paddingTop: 10, marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {item.expenseRatio && (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#8A8A7A' }}>
              TER {item.expenseRatio}
            </span>
          )}
          {item.aum && (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#8A8A7A' }}>
              AUM {item.aum}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          {/* Commodity tags */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {item.commodity.slice(0, 3).map(c => (
              <Pill key={c} tone="neutral" size="xs">{c.toUpperCase()}</Pill>
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#8A8A7A', marginTop: 4 }}>
            {item.platform}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InvestPage() {
  const [activeTab,      setActiveTab]      = useState<TabId>('indian-etf')
  const [commodityFilter, setCommodityFilter] = useState<string>('All')
  const [prices,          setPrices]          = useState<{ nse: Record<string, PriceData>; global: Record<string, PriceData> }>({ nse: {}, global: {} })
  const [priceTime,       setPriceTime]       = useState<string>('')
  const [loadingPrices,   setLoadingPrices]   = useState(true)

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('/api/invest-prices')
        if (!res.ok) return
        const data = await res.json()
        setPrices({ nse: data.nse ?? {}, global: data.global ?? {} })
        if (data.fetchedAt) {
          setPriceTime(new Date(data.fetchedAt).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
          }) + ' IST')
        }
      } catch {}
      finally { setLoadingPrices(false) }
    }
    fetchPrices()
    const id = setInterval(fetchPrices, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const items = INSTRUMENTS[activeTab].filter(item =>
    commodityFilter === 'All' || item.commodity.includes(commodityFilter)
  )

  const nseCount    = Object.keys(prices.nse).length
  const globalCount = Object.keys(prices.global).length

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '0.5px solid #DDDDD0' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#18180F', margin: '0 0 8px' }}>
          Invest in Commodities
        </h1>
        <p style={{ fontSize: 15, color: '#48483A', margin: '0 0 14px', fontWeight: 300, lineHeight: 1.6, maxWidth: 560 }}>
          Every way to access commodity markets from India — ETFs, Mutual Funds, listed stocks, and global instruments.
        </p>
        {/* Price status */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {loadingPrices ? (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#8A8A7A' }}>Loading prices...</span>
          ) : (
            <>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.08em', color: nseCount > 0 ? '#1E6630' : '#8A8A7A' }}>
                {nseCount > 0 ? `● NSE live (${nseCount})` : '○ NSE offline'}
              </span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.08em', color: globalCount > 0 ? '#1E6630' : '#8A8A7A' }}>
                {globalCount > 0 ? `● Global live (${globalCount})` : '○ Global offline'}
              </span>
              {priceTime && (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#C8C8B8' }}>
                  as of {priceTime}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* RBI LRS note for global */}
      {(activeTab === 'global-etf' || activeTab === 'global-stocks') && (
        <div style={{ background: '#F3F2EC', border: '0.5px solid #DDDDD0', padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#48483A', lineHeight: 1.6 }}>
          <strong style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.06em' }}>RBI LRS:</strong> Global instruments accessible via Vested Finance or INDmoney under the Liberalised Remittance Scheme (USD 250,000/year limit). Subject to TCS on remittance above ₹7L/year.
        </div>
      )}

      {/* Commodity filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {['All', ...ALL_COMMODITIES].map(c => {
          const count = c === 'All' ? items.length : INSTRUMENTS[activeTab].filter(i => i.commodity.includes(c)).length
          if (count === 0 && c !== 'All') return null
          return (
            <Pill key={c} size="md" tone="neutral" active={commodityFilter === c} onClick={() => setCommodityFilter(c)}>
              {c}
            </Pill>
          )
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid #DDDDD0', marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setCommodityFilter('All') }}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.02em', textTransform: 'uppercase',
              padding: '10px 16px', whiteSpace: 'nowrap',
              border: 'none', background: 'none',
              borderBottom: activeTab === id ? '2px solid #18180F' : '2px solid transparent',
              color: activeTab === id ? '#18180F' : '#8A8A7A',
              cursor: 'pointer', marginBottom: -1,
            }}
          >
            {label} <span style={{ opacity: 0.5 }}>{count}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {items.map(item => (
          <InstrumentCard key={`${item.ticker}-${item.name}`} item={item} prices={prices} />
        ))}
      </div>

      {items.length === 0 && (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#8A8A7A', padding: '32px 0' }}>
          No instruments in this category with the selected filter.
        </p>
      )}

    </div>
  )
}
