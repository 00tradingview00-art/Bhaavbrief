'use client'
import { useState } from 'react'

type InvestTabId = 'indian-etf' | 'indian-stocks' | 'global-etf' | 'global-stocks'

interface InvestItem {
  name:      string
  ticker:    string
  badge:     string
  badgeType: 'mf' | 'etf' | 'stock' | 'global'
  platform:  string
  exposure:  string
}

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  mf:     { bg: '#F0F4FF', color: '#2B4FC7' },
  etf:    { bg: '#FFF3E0', color: '#B45309' },
  stock:  { bg: '#F3F0FF', color: '#6B21A8' },
  global: { bg: '#EFFAF4', color: '#166534' },
}

const TABS: { id: InvestTabId; label: string }[] = [
  { id: 'indian-etf',    label: 'Indian ETFs & MFs' },
  { id: 'indian-stocks', label: 'Indian Stocks'      },
  { id: 'global-etf',   label: 'Global ETFs'         },
  { id: 'global-stocks', label: 'Global Stocks'      },
]

const DATA: Record<InvestTabId, InvestItem[]> = {
  'indian-etf': [
    { name: 'Nippon India Gold BeES',        ticker: 'GOLDBEES · NSE',    badge: 'ETF',         badgeType: 'etf',  platform: 'Zerodha · Groww · Angel',  exposure: 'Physical Gold'       },
    { name: 'SBI Gold ETF',                  ticker: 'SBIGETS · NSE',     badge: 'ETF',         badgeType: 'etf',  platform: 'All platforms',            exposure: 'Physical Gold'       },
    { name: 'HDFC Gold ETF',                 ticker: 'HDFCMFGETF · NSE',  badge: 'ETF',         badgeType: 'etf',  platform: 'All platforms',            exposure: 'Physical Gold'       },
    { name: 'Nippon India Silver ETF',       ticker: 'SILVERBEES · NSE',  badge: 'ETF',         badgeType: 'etf',  platform: 'Zerodha · Groww',          exposure: 'Physical Silver'     },
    { name: 'ICICI Pru Silver ETF',          ticker: 'ICICISILVER · NSE', badge: 'ETF',         badgeType: 'etf',  platform: 'All platforms',            exposure: 'Physical Silver'     },
    { name: 'ICICI Pru Commodities Fund',    ticker: 'Direct Growth',     badge: 'Mutual Fund', badgeType: 'mf',   platform: 'MF Central · Kuvera',      exposure: 'Broad Commodities'   },
    { name: 'Nippon India Commodities Fund', ticker: 'Direct Growth',     badge: 'Mutual Fund', badgeType: 'mf',   platform: 'MF Central · Kuvera',      exposure: 'Energy + Metals'     },
    { name: 'HDFC Gold Fund',                ticker: 'FoF · No demat',    badge: 'Mutual Fund', badgeType: 'mf',   platform: 'All platforms',            exposure: 'Gold ETF FoF'        },
    { name: 'Tata Resources & Energy Fund',  ticker: 'Direct Growth',     badge: 'Mutual Fund', badgeType: 'mf',   platform: 'MF Central · Kuvera',      exposure: 'Energy + Resources'  },
  ],
  'indian-stocks': [
    { name: 'Hindalco Industries',   ticker: 'HINDALCO · NSE',   badge: 'Stock', badgeType: 'stock', platform: 'All platforms', exposure: 'Aluminium · Copper'      },
    { name: 'Vedanta Limited',       ticker: 'VEDL · NSE',       badge: 'Stock', badgeType: 'stock', platform: 'All platforms', exposure: 'Zinc · Lead · Oil'       },
    { name: 'Hindustan Zinc',        ticker: 'HINDZINC · NSE',   badge: 'Stock', badgeType: 'stock', platform: 'All platforms', exposure: 'Zinc · Silver'           },
    { name: 'Hindustan Copper',      ticker: 'HINDCOPPER · NSE', badge: 'Stock', badgeType: 'stock', platform: 'All platforms', exposure: 'Copper'                  },
    { name: 'NMDC Limited',          ticker: 'NMDC · NSE',       badge: 'Stock', badgeType: 'stock', platform: 'All platforms', exposure: 'Iron Ore'                },
    { name: 'Coal India',            ticker: 'COALINDIA · NSE',  badge: 'Stock', badgeType: 'stock', platform: 'All platforms', exposure: 'Thermal Coal'            },
    { name: 'SAIL',                  ticker: 'SAIL · NSE',       badge: 'Stock', badgeType: 'stock', platform: 'All platforms', exposure: 'Steel'                   },
    { name: 'JSW Steel',             ticker: 'JSWSTEEL · NSE',   badge: 'Stock', badgeType: 'stock', platform: 'All platforms', exposure: 'Steel'                   },
    { name: 'MOIL Limited',          ticker: 'MOIL · NSE',       badge: 'Stock', badgeType: 'stock', platform: 'All platforms', exposure: 'Manganese'               },
  ],
  'global-etf': [
    { name: 'SPDR Gold Shares',           ticker: 'GLD · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', platform: 'Vested · INDmoney',  exposure: 'Physical Gold'       },
    { name: 'iShares Gold Trust',         ticker: 'IAU · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', platform: 'Vested · INDmoney',  exposure: 'Physical Gold'       },
    { name: 'iShares Silver Trust',       ticker: 'SLV · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', platform: 'Vested · INDmoney',  exposure: 'Physical Silver'     },
    { name: 'VanEck Gold Miners',         ticker: 'GDX · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', platform: 'Vested · INDmoney',  exposure: 'Gold Miners'         },
    { name: 'VanEck Junior Gold Miners',  ticker: 'GDXJ · NYSE Arca', badge: 'Global ETF', badgeType: 'global', platform: 'Vested · INDmoney',  exposure: 'Junior Gold Miners'  },
    { name: 'Global X Copper Miners',     ticker: 'COPX · NYSE Arca', badge: 'Global ETF', badgeType: 'global', platform: 'Vested · INDmoney',  exposure: 'Copper Miners'       },
    { name: 'United States Oil Fund',     ticker: 'USO · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', platform: 'Vested · INDmoney',  exposure: 'WTI Crude Futures'   },
    { name: 'SPDR Metals & Mining',       ticker: 'XME · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', platform: 'Vested · INDmoney',  exposure: 'Broad Metals/Mining' },
    { name: 'iShares MSCI Global Miners', ticker: 'PICK · NYSE Arca', badge: 'Global ETF', badgeType: 'global', platform: 'Vested · INDmoney',  exposure: 'Diversified Miners'  },
    { name: 'Global X Lithium & Battery', ticker: 'LIT · NYSE Arca',  badge: 'Global ETF', badgeType: 'global', platform: 'Vested · INDmoney',  exposure: 'Lithium · Battery'   },
  ],
  'global-stocks': [
    { name: 'Barrick Gold',           ticker: 'GOLD · NYSE',  badge: 'Global Stock', badgeType: 'global', platform: 'Vested · INDmoney', exposure: 'Gold Mining'               },
    { name: 'Newmont Corporation',    ticker: 'NEM · NYSE',   badge: 'Global Stock', badgeType: 'global', platform: 'Vested · INDmoney', exposure: 'Gold Mining'               },
    { name: 'Wheaton Precious Metals', ticker: 'WPM · NYSE',  badge: 'Global Stock', badgeType: 'global', platform: 'Vested · INDmoney', exposure: 'Gold · Silver Streaming'  },
    { name: 'Freeport-McMoRan',       ticker: 'FCX · NYSE',   badge: 'Global Stock', badgeType: 'global', platform: 'Vested · INDmoney', exposure: 'Copper Mining'             },
    { name: 'BHP Group',              ticker: 'BHP · NYSE',   badge: 'Global Stock', badgeType: 'global', platform: 'Vested · INDmoney', exposure: 'Diversified Mining'        },
    { name: 'Rio Tinto',              ticker: 'RIO · NYSE',   badge: 'Global Stock', badgeType: 'global', platform: 'Vested · INDmoney', exposure: 'Iron · Copper · Aluminium' },
    { name: 'Vale S.A.',              ticker: 'VALE · NYSE',  badge: 'Global Stock', badgeType: 'global', platform: 'Vested · INDmoney', exposure: 'Iron Ore · Nickel'         },
    { name: 'Glencore',               ticker: 'GLNCY · OTC',  badge: 'Global Stock', badgeType: 'global', platform: 'Vested',            exposure: 'Diversified Commodities'   },
    { name: 'Albemarle',              ticker: 'ALB · NYSE',   badge: 'Global Stock', badgeType: 'global', platform: 'Vested · INDmoney', exposure: 'Lithium'                   },
  ],
}

function InvestCard({ item }: { item: InvestItem }) {
  const badge = BADGE_STYLES[item.badgeType]

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

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 19, fontWeight: 500, color: 'var(--ink-4)', marginBottom: 16 }}>
        —
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        background: 'var(--surface-3)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '12px 16px',
        marginTop: 16,
        marginBottom: 24,
        fontSize: 13,
        color: 'var(--ink-3)',
        lineHeight: 1.6,
      }}>
        Live prices coming soon via NSE &amp; NYSE data feeds. Buy Indian instruments via Zerodha, Groww, or Kuvera. Buy global instruments via <strong>Vested Finance</strong> or <strong>INDmoney</strong> under RBI LRS ($250K/year limit).
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
