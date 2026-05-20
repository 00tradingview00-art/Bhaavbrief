'use client'
import { useState } from 'react'

type InvestTabId = 'indian-etf' | 'indian-stocks' | 'global-etf' | 'global-stocks'

interface InvestItem {
  name: string
  ticker: string
  badge: string
  badgeType: 'mf' | 'etf' | 'stock' | 'global'
  price: string
  change: number
  changePct: string
  platform: string
  exposure: string
}

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  mf:     { bg: '#F0F4FF', color: '#2B4FC7' },
  etf:    { bg: '#FFF3E0', color: '#B45309' },
  stock:  { bg: '#F3F0FF', color: '#6B21A8' },
  global: { bg: '#EFFAF4', color: '#166534' },
}

const TABS: { id: InvestTabId; label: string }[] = [
  { id: 'indian-etf',     label: 'Indian ETFs & MFs'  },
  { id: 'indian-stocks',  label: 'Indian Stocks'       },
  { id: 'global-etf',     label: 'Global ETFs'         },
  { id: 'global-stocks',  label: 'Global Stocks'       },
]

const DATA: Record<InvestTabId, InvestItem[]> = {
  'indian-etf': [
    { name: 'Nippon India Gold BeES',        ticker: 'GOLDBEES · NSE',    badge: 'ETF',            badgeType: 'etf',    price: '₹62.84',       change: 0.79,  changePct: '+0.79%', platform: 'Zerodha · Groww · Angel',  exposure: 'Physical Gold'       },
    { name: 'SBI Gold ETF',                  ticker: 'SBIGETS · NSE',     badge: 'ETF',            badgeType: 'etf',    price: '₹63.12',       change: 0.81,  changePct: '+0.81%', platform: 'All platforms',            exposure: 'Physical Gold'       },
    { name: 'HDFC Gold ETF',                 ticker: 'HDFCMFGETF · NSE',  badge: 'ETF',            badgeType: 'etf',    price: '₹63.40',       change: 0.77,  changePct: '+0.77%', platform: 'All platforms',            exposure: 'Physical Gold'       },
    { name: 'Nippon India Silver ETF',       ticker: 'SILVERBEES · NSE',  badge: 'ETF',            badgeType: 'etf',    price: '₹94.20',       change: 1.12,  changePct: '+1.12%', platform: 'Zerodha · Groww',          exposure: 'Physical Silver'     },
    { name: 'ICICI Pru Silver ETF',          ticker: 'ICICISILVER · NSE', badge: 'ETF',            badgeType: 'etf',    price: '₹94.05',       change: 1.08,  changePct: '+1.08%', platform: 'All platforms',            exposure: 'Physical Silver'     },
    { name: 'ICICI Pru Commodities Fund',    ticker: 'Direct Growth',     badge: 'Mutual Fund',    badgeType: 'mf',     price: '₹24.18 NAV',   change: 0.61,  changePct: '+0.61%', platform: 'MF Central · Kuvera',      exposure: 'Broad Commodities'   },
    { name: 'Nippon India Commodities Fund', ticker: 'Direct Growth',     badge: 'Mutual Fund',    badgeType: 'mf',     price: '₹31.42 NAV',   change: 0.54,  changePct: '+0.54%', platform: 'MF Central · Kuvera',      exposure: 'Energy + Metals'     },
    { name: 'HDFC Gold Fund',                ticker: 'FoF · No demat',    badge: 'Mutual Fund',    badgeType: 'mf',     price: '₹22.91 NAV',   change: 0.78,  changePct: '+0.78%', platform: 'All platforms',            exposure: 'Gold ETF FoF'        },
    { name: 'Tata Resources & Energy Fund',  ticker: 'Direct Growth',     badge: 'Mutual Fund',    badgeType: 'mf',     price: '₹38.14 NAV',   change: 0.42,  changePct: '+0.42%', platform: 'MF Central · Kuvera',      exposure: 'Energy + Resources'  },
  ],
  'indian-stocks': [
    { name: 'Hindalco Industries',  ticker: 'HINDALCO · NSE',   badge: 'Stock', badgeType: 'stock', price: '₹682.40', change: 1.24,  changePct: '+1.24%', platform: 'All platforms', exposure: 'Aluminium · Copper'      },
    { name: 'Vedanta Limited',      ticker: 'VEDL · NSE',       badge: 'Stock', badgeType: 'stock', price: '₹484.75', change: -0.38, changePct: '-0.38%', platform: 'All platforms', exposure: 'Zinc · Lead · Oil'       },
    { name: 'Hindustan Zinc',       ticker: 'HINDZINC · NSE',   badge: 'Stock', badgeType: 'stock', price: '₹792.60', change: 0.82,  changePct: '+0.82%', platform: 'All platforms', exposure: 'Zinc · Silver'           },
    { name: 'Hindustan Copper',     ticker: 'HINDCOPPER · NSE', badge: 'Stock', badgeType: 'stock', price: '₹284.90', change: 0.64,  changePct: '+0.64%', platform: 'All platforms', exposure: 'Copper'                  },
    { name: 'NMDC Limited',         ticker: 'NMDC · NSE',       badge: 'Stock', badgeType: 'stock', price: '₹218.30', change: -0.54, changePct: '-0.54%', platform: 'All platforms', exposure: 'Iron Ore'                },
    { name: 'Coal India',           ticker: 'COALINDIA · NSE',  badge: 'Stock', badgeType: 'stock', price: '₹392.15', change: 0.21,  changePct: '+0.21%', platform: 'All platforms', exposure: 'Thermal Coal'            },
    { name: 'SAIL',                 ticker: 'SAIL · NSE',       badge: 'Stock', badgeType: 'stock', price: '₹138.45', change: -0.18, changePct: '-0.18%', platform: 'All platforms', exposure: 'Steel'                   },
    { name: 'JSW Steel',            ticker: 'JSWSTEEL · NSE',   badge: 'Stock', badgeType: 'stock', price: '₹924.80', change: 0.48,  changePct: '+0.48%', platform: 'All platforms', exposure: 'Steel'                   },
    { name: 'MOIL Limited',         ticker: 'MOIL · NSE',       badge: 'Stock', badgeType: 'stock', price: '₹392.60', change: 0.34,  changePct: '+0.34%', platform: 'All platforms', exposure: 'Manganese'               },
  ],
  'global-etf': [
    { name: 'SPDR Gold Shares',           ticker: 'GLD · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', price: '$295.42', change: 0.71,  changePct: '+0.71%', platform: 'Vested · INDmoney',  exposure: 'Physical Gold'      },
    { name: 'iShares Gold Trust',         ticker: 'IAU · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', price: '$43.28',  change: 0.68,  changePct: '+0.68%', platform: 'Vested · INDmoney',  exposure: 'Physical Gold'      },
    { name: 'iShares Silver Trust',       ticker: 'SLV · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', price: '$31.28',  change: 1.06,  changePct: '+1.06%', platform: 'Vested · INDmoney',  exposure: 'Physical Silver'    },
    { name: 'VanEck Gold Miners',         ticker: 'GDX · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', price: '$48.16',  change: 1.42,  changePct: '+1.42%', platform: 'Vested · INDmoney',  exposure: 'Gold Miners'        },
    { name: 'VanEck Junior Gold Miners',  ticker: 'GDXJ · NYSE Arca', badge: 'Global ETF', badgeType: 'global', price: '$58.92',  change: 1.84,  changePct: '+1.84%', platform: 'Vested · INDmoney',  exposure: 'Junior Gold Miners' },
    { name: 'Global X Copper Miners',     ticker: 'COPX · NYSE Arca', badge: 'Global ETF', badgeType: 'global', price: '$42.84',  change: -0.32, changePct: '-0.32%', platform: 'Vested · INDmoney',  exposure: 'Copper Miners'      },
    { name: 'United States Oil Fund',     ticker: 'USO · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', price: '$74.18',  change: -0.61, changePct: '-0.61%', platform: 'Vested · INDmoney',  exposure: 'WTI Crude Futures'  },
    { name: 'SPDR Metals & Mining',       ticker: 'XME · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', price: '$64.20',  change: 0.28,  changePct: '+0.28%', platform: 'Vested · INDmoney',  exposure: 'Broad Metals/Mining'},
    { name: 'iShares MSCI Global Miners', ticker: 'PICK · NYSE Arca', badge: 'Global ETF', badgeType: 'global', price: '$14.82',  change: 0.14,  changePct: '+0.14%', platform: 'Vested · INDmoney',  exposure: 'Diversified Miners' },
    { name: 'Global X Lithium & Battery', ticker: 'LIT · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', price: '$32.48',  change: -0.88, changePct: '-0.88%', platform: 'Vested · INDmoney',  exposure: 'Lithium · Battery'  },
  ],
  'global-stocks': [
    { name: 'Barrick Gold',          ticker: 'GOLD · NYSE', badge: 'Global Stock', badgeType: 'global', price: '$21.84', change: 1.32,  changePct: '+1.32%', platform: 'Vested · INDmoney', exposure: 'Gold Mining'              },
    { name: 'Newmont Corporation',   ticker: 'NEM · NYSE',  badge: 'Global Stock', badgeType: 'global', price: '$58.40', change: 0.94,  changePct: '+0.94%', platform: 'Vested · INDmoney', exposure: 'Gold Mining'              },
    { name: 'Wheaton Precious Metals',ticker: 'WPM · NYSE', badge: 'Global Stock', badgeType: 'global', price: '$72.38', change: 1.18,  changePct: '+1.18%', platform: 'Vested · INDmoney', exposure: 'Gold · Silver Streaming' },
    { name: 'Freeport-McMoRan',      ticker: 'FCX · NYSE',  badge: 'Global Stock', badgeType: 'global', price: '$46.28', change: -0.44, changePct: '-0.44%', platform: 'Vested · INDmoney', exposure: 'Copper Mining'            },
    { name: 'BHP Group',             ticker: 'BHP · NYSE',  badge: 'Global Stock', badgeType: 'global', price: '$54.92', change: -0.28, changePct: '-0.28%', platform: 'Vested · INDmoney', exposure: 'Diversified Mining'       },
    { name: 'Rio Tinto',             ticker: 'RIO · NYSE',  badge: 'Global Stock', badgeType: 'global', price: '$68.14', change: 0.38,  changePct: '+0.38%', platform: 'Vested · INDmoney', exposure: 'Iron · Copper · Aluminium'},
    { name: 'Vale S.A.',             ticker: 'VALE · NYSE', badge: 'Global Stock', badgeType: 'global', price: '$10.48', change: -0.76, changePct: '-0.76%', platform: 'Vested · INDmoney', exposure: 'Iron Ore · Nickel'        },
    { name: 'Glencore',              ticker: 'GLNCY · OTC', badge: 'Global Stock', badgeType: 'global', price: '$12.84', change: 0.16,  changePct: '+0.16%', platform: 'Vested',             exposure: 'Diversified Commodities'  },
    { name: 'Albemarle',             ticker: 'ALB · NYSE',  badge: 'Global Stock', badgeType: 'global', price: '$84.20', change: -1.14, changePct: '-1.14%', platform: 'Vested · INDmoney', exposure: 'Lithium'                  },
  ],
}

function InvestCard({ item }: { item: InvestItem }) {
  const badge = BADGE_STYLES[item.badgeType]
  const isUp = item.change >= 0

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '18px 20px',
      transition: 'border-color .15s',
      cursor: 'default',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{item.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{item.ticker}</div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 3,
          background: badge.bg, color: badge.color, whiteSpace: 'nowrap', marginLeft: 8,
        }}>
          {item.badge}
        </span>
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 19, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>
        {item.price}
      </div>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
        background: isUp ? 'var(--up-bg)' : 'var(--down-bg)',
        color: isUp ? 'var(--up)' : 'var(--down)',
      }}>
        {isUp ? '▲' : '▼'} {item.changePct} today
      </span>

      <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{item.platform}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>{item.exposure}</span>
      </div>
    </div>
  )
}

export default function InvestPage() {
  const [activeTab, setActiveTab] = useState<InvestTabId>('indian-etf')

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, color: 'var(--ink)', margin: '0 0 4px' }}>
          Invest in Commodities
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          ETFs, Mutual Funds, Mining Stocks — Indian and Global · accessible from India
        </p>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'var(--gold-pale)',
        border: '1px solid #DEC08A',
        borderRadius: 8,
        padding: '12px 16px',
        marginTop: 16,
        marginBottom: 24,
        fontSize: 13,
        color: 'var(--ink-2)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--gold-dark)' }}>Prices are indicative.</strong> Indian ETF/MF data refreshes via Yahoo Finance. Global prices shown are previous-day close. Buy Indian instruments via Zerodha, Groww, or Kuvera. Buy global instruments via <strong>Vested Finance</strong> or <strong>INDmoney</strong> under RBI LRS ($250K/year limit).
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: activeTab === id ? 500 : 400,
              color: activeTab === id ? 'var(--ink)' : 'var(--ink-3)',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === id ? '2px solid var(--gold)' : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {DATA[activeTab].map((item) => (
          <InvestCard key={`${item.ticker}-${item.name}`} item={item} />
        ))}
      </div>
    </div>
  )
}
