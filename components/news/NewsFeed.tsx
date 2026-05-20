'use client'
import { useState } from 'react'
import Tag from '@/components/Tag'

const FILTERS = ['All', 'Gold', 'Silver', 'Crude', 'Copper', 'Nat Gas', 'Macro', 'Agri', 'Geopolitics']

interface NewsItem {
  id: number
  category: string
  time: string
  source: string
  headline: string
  description: string
  sentiment: 'bull' | 'bear' | 'neut'
  sentimentLabel: string
  tagType: string
}

// In production this data comes from your RSS / news API
// Replace with: const news = await fetchNews() in a server component
const SAMPLE_NEWS: NewsItem[] = [
  {
    id: 1,
    category: 'Metals',
    time: '6h ago',
    source: 'Economic Times',
    headline: 'MCX Opens Doors to Local Silver Refiners After India Tightens Imports',
    description: 'MCX expands domestic silver refinery tie-ups as government curbs silver imports to protect local industry. Impact on delivery mechanism and spot premium analyzed.',
    sentiment: 'bull',
    sentimentLabel: 'Bullish Silver',
    tagType: 'metals',
  },
  {
    id: 2,
    category: 'Macro',
    time: '6h ago',
    source: 'Bloomberg',
    headline: 'MCX Rallies Nearly 50% Since the Start of 2026: What\'s Driving the Surge?',
    description: 'India\'s largest commodity exchange hits record volumes. FII participation, retail growth, and global volatility all contributing. Structural shift or cyclical peak?',
    sentiment: 'bull',
    sentimentLabel: 'Bullish MCX',
    tagType: 'macro',
  },
  {
    id: 3,
    category: 'Energy',
    time: '8h ago',
    source: 'Reuters',
    headline: 'OPEC+ Considers Additional Output Cuts Ahead of June Meeting',
    description: 'Saudi Arabia and Russia signal willingness to extend supply curbs through Q3. WTI finds support at $74 on the news. MCX Crude watching ₹6,300 level closely.',
    sentiment: 'bull',
    sentimentLabel: 'Bullish Crude',
    tagType: 'energy',
  },
  {
    id: 4,
    category: 'Macro',
    time: '10h ago',
    source: 'RBI',
    headline: 'RBI Keeps Repo Rate Unchanged at 6%; Rupee Reaction Muted',
    description: 'MPC votes 4-2 to hold rates. INR holds at 84.38 post-policy. Gold and silver see limited moves but longer-term rate trajectory now clearer for commodity traders.',
    sentiment: 'neut',
    sentimentLabel: 'Neutral',
    tagType: 'macro',
  },
  {
    id: 5,
    category: 'Geopolitics',
    time: '12h ago',
    source: 'WSJ',
    headline: 'US-Iran Nuclear Talks Collapse; Strait of Hormuz Risk Premium Returns',
    description: 'Negotiations fail on enrichment caps. Crude oil risk premium re-prices. Gold surges on safe haven demand. Dollar holds steady. Full MCX impact assessment inside.',
    sentiment: 'bull',
    sentimentLabel: 'Bullish Gold · Crude',
    tagType: 'energy',
  },
  {
    id: 6,
    category: 'Metals',
    time: '14h ago',
    source: 'LME',
    headline: 'Copper Falls 2% on Weak China Manufacturing PMI; MCX Copper Follows',
    description: 'Caixin Manufacturing PMI misses expectations at 49.1. Copper slides below $9,800/t on LME. MCX Copper breaks ₹870 support. Next level watched: ₹855.',
    sentiment: 'bear',
    sentimentLabel: 'Bearish Copper',
    tagType: 'metals',
  },
]

const SENTIMENT_STYLES = {
  bull: { bg: '#EDFAF3', color: '#166534' },
  bear: { bg: '#FEF2F2', color: '#991B1B' },
  neut: { bg: 'var(--surface-3)', color: 'var(--ink-3)' },
}

const SENTIMENT_ICONS = { bull: '●', bear: '●', neut: '○' }

const FILTER_TAG_MAP: Record<string, string> = {
  Gold: 'metals', Silver: 'metals', Crude: 'energy',
  Copper: 'metals', 'Nat Gas': 'energy', Macro: 'macro',
  Agri: 'agri', Geopolitics: 'energy',
}

export default function NewsFeed() {
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = activeFilter === 'All'
    ? SAMPLE_NEWS
    : SAMPLE_NEWS.filter(n =>
        n.category.toLowerCase().includes(activeFilter.toLowerCase()) ||
        n.headline.toLowerCase().includes(activeFilter.toLowerCase())
      )

  return (
    <div>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid var(--border-2)',
              background: activeFilter === f ? 'var(--ink)' : 'var(--surface)',
              color: activeFilter === f ? '#fff' : 'var(--ink-3)',
              cursor: 'pointer',
              transition: 'all .15s',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* News items */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-4)', padding: '32px 0' }}>No headlines in this category right now.</p>
      ) : (
        filtered.map(item => {
          const sentStyle = SENTIMENT_STYLES[item.sentiment]
          return (
            <div key={item.id} style={{ padding: '20px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                <Tag type={item.tagType}>{item.category}</Tag>
                <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{item.time}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>·</span>
                <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{item.source}</span>
              </div>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 17,
                fontWeight: 500,
                lineHeight: 1.4,
                color: 'var(--ink)',
                margin: '0 0 7px',
              }}>
                {item.headline}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0 }}>
                {item.description}
              </p>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 12, marginTop: 12,
                fontSize: 11, fontWeight: 600, letterSpacing: '0.2px',
                background: sentStyle.bg, color: sentStyle.color,
              }}>
                {SENTIMENT_ICONS[item.sentiment]} {item.sentimentLabel}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}
