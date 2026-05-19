import Masthead from '@/components/Masthead'
import PriceTicker from '@/components/PriceTicker'
import BriefCard from '@/components/BriefCard'
import { getAllBriefs } from '@/lib/briefs'

export const revalidate = 900

export default function BriefsPage() {
  const briefs = getAllBriefs()

  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <Masthead />
      <PriceTicker />
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8A7A', borderTop: '2px solid #18180F', paddingTop: 8, marginBottom: '1.5rem' }}>
          All Briefs · BhaavBrief Archive
        </div>
        {briefs.length === 0 ? (
          <p style={{ fontSize: 14, color: '#48483A', fontWeight: 300 }}>First edition coming soon. Subscribe to get it at 7 AM.</p>
        ) : (
          briefs.map(b => <BriefCard key={b.slug} brief={b} />)
        )}
      </div>
    </div>
  )
}
