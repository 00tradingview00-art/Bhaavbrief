import { CARD_ORDER } from '@/lib/learn-cards'

export const metadata = { title: 'Learn Cards — Instagram Downloads | BhaavBrief' }

export default function LearnCardsPage() {
  // Group by highlight section
  const groups: Record<string, typeof CARD_ORDER> = {}
  for (const card of CARD_ORDER) {
    if (!groups[card.highlight]) groups[card.highlight] = []
    groups[card.highlight].push(card)
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#18180F' }}>
        Learn Cards — Instagram Stories
      </h1>
      <p style={{ color: '#8A8A7A', marginBottom: 48, fontSize: 15 }}>
        1080×1920 PNG cards for Instagram highlights. Click Download to save each card.
      </p>

      {Object.entries(groups).map(([section, cards]) => (
        <div key={section} style={{ marginBottom: 40 }}>
          <h2 style={{
            fontSize: 15, fontWeight: 700, letterSpacing: 2,
            color: '#C8720A', marginBottom: 16, textTransform: 'uppercase',
          }}>
            {section}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {cards.map(card => (
              <div key={card.slug} style={{
                border: '1px solid #E0DFD5', borderRadius: 4,
                padding: '16px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#18180F', marginBottom: 2 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A8A7A' }}>{card.slug}</div>
                </div>
                <a
                  href={`/api/learn-card/${card.slug}`}
                  download={`${card.slug}.png`}
                  style={{
                    background: '#C8720A', color: '#fff',
                    fontSize: 15, fontWeight: 600,
                    padding: '8px 16px', borderRadius: 4,
                    textDecoration: 'none', flexShrink: 0,
                  }}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 48, padding: '20px 0', borderTop: '1px solid #E0DFD5', color: '#8A8A7A', fontSize: 13 }}>
        All cards are 1080×1920 (9:16 Instagram story format).
        Post directly or add to a &ldquo;Learn MCX&rdquo; highlight reel.
      </div>
    </main>
  )
}
