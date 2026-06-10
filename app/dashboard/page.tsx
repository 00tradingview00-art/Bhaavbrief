import { Metadata }         from 'next'
import WatchlistDashboard  from '@/components/WatchlistDashboard'

export const metadata: Metadata = {
  title:       'My Commodity Dashboard | BhaavBrief',
  description: 'Your personal MCX commodity watchlist — live prices, sparklines, and AI-driven market context for gold, crude, silver, copper and natural gas.',
  alternates:  { canonical: 'https://bhaavbrief.in/dashboard' },
}

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily:    'var(--font-mono)',
          fontSize:       9,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color:          'var(--gold)',
          marginBottom:   8,
        }}>
          My Dashboard
        </div>
        <h1 style={{
          fontFamily:    'var(--font-serif)',
          fontSize:      'clamp(1.6rem, 3vw, 2.2rem)',
          fontWeight:     600,
          lineHeight:     1.15,
          letterSpacing: '-0.3px',
          color:          'var(--ink)',
          margin:        '0 0 8px',
        }}>
          Your Commodity Watchlist
        </h1>
        <p style={{
          fontSize:   14,
          color:      'var(--ink-3)',
          lineHeight: 1.65,
          margin:      0,
          maxWidth:    520,
        }}>
          Pick the commodities you track. Your selection is saved on this device.
          Prices update every 30 minutes during MCX market hours.
        </p>
      </div>

      <WatchlistDashboard />

    </div>
  )
}
