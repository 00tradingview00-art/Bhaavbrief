type SentimentLevel = 'bull' | 'bear' | 'neut'

interface CommoditySentiment {
  name: string
  level: SentimentLevel
  pct: number
  summary: string
}

// In production: derive from Claude analysis of news headlines
const SENTIMENT_DATA: CommoditySentiment[] = [
  { name: 'Gold',     level: 'bull', pct: 78, summary: '78% bullish signals · 12 headlines' },
  { name: 'Silver',   level: 'bull', pct: 65, summary: '65% bullish signals · 8 headlines'  },
  { name: 'Crude Oil',level: 'neut', pct: 50, summary: 'Mixed signals · 9 headlines'         },
  { name: 'Copper',   level: 'bear', pct: 60, summary: 'China demand fears · 6 headlines'    },
  { name: 'Nat Gas',  level: 'bear', pct: 70, summary: 'Seasonal oversupply · 5 headlines'   },
]

const LEVEL_STYLES: Record<SentimentLevel, { pill: { bg: string; color: string }; bar: string; label: string }> = {
  bull: { pill: { bg: '#EDFAF3', color: '#166534' }, bar: '#1B7A4A', label: 'Bullish' },
  bear: { pill: { bg: '#FEF2F2', color: '#991B1B' }, bar: '#B53A2A', label: 'Bearish' },
  neut: { pill: { bg: 'var(--surface-3)', color: '#7A7668' }, bar: '#B8B4A8', label: 'Neutral' },
}

export default function SentimentPanel() {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '18px 20px',
      position: 'sticky',
      top: 120,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 500, letterSpacing: '0.7px',
        textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 20,
      }}>
        Commodity Sentiment
      </p>

      {SENTIMENT_DATA.map(({ name, level, pct, summary }) => {
        const styles = LEVEL_STYLES[level]
        return (
          <div key={name} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{name}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3,
                background: styles.pill.bg, color: styles.pill.color,
              }}>
                {styles.label}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden', marginBottom: 5 }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: styles.bar }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{summary}</span>
          </div>
        )
      })}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
        <p style={{ fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.6, margin: 0 }}>
          Sentiment scored automatically from news headlines using Claude. Refreshed every 15 min.
        </p>
      </div>
    </div>
  )
}
