import { getAllBriefs } from '@/lib/briefs'
import Tag from '@/components/Tag'
import Link from 'next/link'

export const metadata = {
  title: 'MCX Daily Commodity Briefs — Market Outlook & Analysis',
  description: 'Daily MCX commodity briefs for Indian traders. Each edition explains what moved gold, crude oil, silver and copper — and why. Geopolitical lens, supply-demand signals, rupee-dollar impact, price outlook. Every weekday.',
  keywords: [
    'MCX commodity daily analysis India',
    'MCX market outlook today',
    'MCX gold crude silver daily brief',
    'commodity market outlook India weekday',
    'MCX geopolitical impact analysis',
    'rupee dollar commodity brief India',
    'MCX supply demand price outlook',
    'commodity trading analysis India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/briefs' },
  openGraph: {
    title: 'MCX Daily Commodity Briefs — Market Outlook & Analysis | BhaavBrief',
    description: 'Daily MCX commodity intelligence — what moved gold, crude, silver and why. Geopolitical lens, supply-demand, rupee-dollar. Every weekday.',
    url: 'https://bhaavbrief.in/briefs',
    siteName: 'BhaavBrief',
    type: 'website' as const,
    locale: 'en_IN',
  },
  twitter: { card: 'summary' as const, title: 'MCX Daily Briefs | BhaavBrief', description: 'What moved MCX gold, crude oil and silver — and why. Daily commodity intelligence for Indian traders.', site: '@bhaavbrief' },
}

function getTagType(tag?: string): string {
  if (!tag) return 'default'
  const t = tag.toLowerCase()
  if (t.includes('crude') || t.includes('energy') || t.includes('gas')) return 'energy'
  if (t.includes('gold') || t.includes('silver') || t.includes('copper') || t.includes('metal') || t.includes('zinc')) return 'metals'
  if (t.includes('macro') || t.includes('rbi') || t.includes('sebi') || t.includes('fed') || t.includes('dollar')) return 'macro'
  if (t.includes('agri') || t.includes('ncdex')) return 'agri'
  return 'default'
}

export default async function BriefsPage() {
  const briefs = await getAllBriefs()

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, color: 'var(--ink)', margin: '0 0 4px' }}>
          All Briefs
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          {briefs.length} editions published · Every weekday at 9:30 AM IST
        </p>
      </div>

      {briefs.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--ink-4)', padding: '32px 0' }}>No briefs found. Check your content/briefs directory.</p>
      ) : (
        briefs.map((brief) => (
          <Link
            key={brief.slug}
            href={`/briefs/${brief.slug}`}
            style={{ display: 'block', textDecoration: 'none', padding: '20px 0', borderBottom: '1px solid var(--border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {brief.tags?.slice(0, 1).map((tag: string) => (
                <Tag key={tag} type={getTagType(tag)}>{tag}</Tag>
              ))}
              <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{brief.displayDate}</span>
              {brief.edition > 0 && (
                <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
                  · #{brief.edition}
                </span>
              )}
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              fontWeight: 500,
              lineHeight: 1.3,
              color: 'var(--ink)',
              margin: '0 0 7px',
            }}>
              {brief.title}
            </h2>
            {brief.description && (
              <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0 }}>
                {brief.description}
              </p>
            )}
          </Link>
        ))
      )}
    </div>
  )
}
