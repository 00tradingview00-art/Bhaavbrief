import { readFileSync } from 'fs'
import path from 'path'

interface NewsItem {
  id:      string
  title:   string
  category: string
  tagType: string
  pubDate: string
}

interface CommodityCount {
  name:  string
  count: number
  pct:   number
}

const COMMODITY_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'Gold',        re: /\bgold\b/i },
  { name: 'Silver',      re: /\bsilver\b/i },
  { name: 'Crude Oil',   re: /\bcrude|brent|wti\b/i },
  { name: 'Copper',      re: /\bcopper\b/i },
  { name: 'Natural Gas', re: /natural.gas|nat.gas|\blng\b/i },
]

function loadCoverage(): CommodityCount[] {
  try {
    const file  = path.join(process.cwd(), 'data/ai-news.json')
    const items = JSON.parse(readFileSync(file, 'utf8')) as NewsItem[]

    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const recent = items.filter(i => new Date(i.pubDate).getTime() > cutoff)

    const counts = COMMODITY_PATTERNS.map(({ name, re }) => ({
      name,
      count: recent.filter(i => re.test(`${i.title} ${i.category}`)).length,
    }))

    const total = counts.reduce((s, c) => s + c.count, 0) || 1

    return counts
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .map(c => ({ ...c, pct: Math.round((c.count / total) * 100) }))
  } catch {
    return []
  }
}

export default function SentimentPanel() {
  const coverage = loadCoverage()

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
        margin: '0 0 20px',
      }}>
        Coverage Today
      </p>

      {coverage.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: 0 }}>
          No signals in the last 24h
        </p>
      ) : (
        coverage.map(({ name, count, pct }) => (
          <div key={name} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{name}</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--ink-4)', letterSpacing: '0.04em',
              }}>
                {count} signal{count !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: 'var(--gold)' }} />
            </div>
          </div>
        ))
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
        <p style={{ fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.6, margin: 0 }}>
          Signal count from intelligence items in the last 24h.
        </p>
      </div>
    </div>
  )
}
