import { notFound }   from 'next/navigation'
import { Metadata }   from 'next'
import Link           from 'next/link'
import { getArcById, getAllArcs } from '@/lib/arcs'
import { getBrief }   from '@/lib/briefs'

export const revalidate = 3600

const BASE_URL = 'https://bhaavbrief.in'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const arc = getArcById(id)
  if (!arc) return { title: 'Story not found' }

  const title       = arc.title
  const description = `${arc.summary} Day-by-day coverage of ${arc.primaryCommodity} on MCX.`
  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/arcs/${arc.id}` },
    openGraph: { type: 'article', url: `${BASE_URL}/arcs/${arc.id}`, title, description, siteName: 'BhaavBrief' },
  }
}

export async function generateStaticParams() {
  return getAllArcs().map(a => ({ id: a.id }))
}

export default async function ArcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const arc = getArcById(id)
  if (!arc) notFound()

  // Load brief metadata for each edition
  const briefs = arc.editions.map(edition => {
    const slug = `edition-${String(edition).padStart(3, '0')}`
    return getBrief(slug)
  }).filter(Boolean)

  const statusColor  = arc.status === 'active' ? 'var(--up)' : 'var(--ink-4)'
  const statusBg     = arc.status === 'active' ? 'var(--up-bg)' : 'var(--surface-3)'
  const statusLabel  = arc.status === 'active' ? `ACTIVE · Day ${arc.latestDay}` : 'RESOLVED'

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: '2rem' }}>
        {[
          { label: 'Home',   href: '/' },
          { label: 'Briefs', href: '/briefs' },
          { label: 'Story Arc', href: null },
        ].map((c, i, arr) => (
          <span key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {c.href
              ? <a href={c.href} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', textDecoration: 'none' }}>{c.label}</a>
              : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>{c.label}</span>
            }
            {i < arr.length - 1 && <span style={{ color: 'var(--border-2)', fontSize: 10 }}>›</span>}
          </span>
        ))}
      </nav>

      {/* Arc header */}
      <div style={{
        borderLeft: '3px solid var(--gold)',
        paddingLeft: '1.25rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: statusColor,
            background: statusBg,
            padding: '3px 8px',
            borderRadius: 3,
          }}>
            {statusLabel}
          </span>
          {arc.primaryCommodity && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'white',
              background: 'var(--ink-3)',
              padding: '2px 7px',
              borderRadius: 3,
            }}>
              {arc.primaryCommodity.replace('MCX ', '')}
            </span>
          )}
          {arc.keyLevel && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--gold)',
              background: 'var(--gold-pale)',
              padding: '2px 7px',
              borderRadius: 3,
              border: '1px solid rgba(181,134,42,0.25)',
            }}>
              Key: {arc.keyLevel}
            </span>
          )}
        </div>

        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(1.5rem, 3vw, 2rem)',
          fontWeight: 700,
          lineHeight: 1.15,
          color: 'var(--ink)',
          margin: '0 0 10px',
        }}>
          {arc.title}
        </h1>

        {arc.summary && (
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0 }}>
            {arc.summary}
          </p>
        )}

        <div style={{
          display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap',
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)',
        }}>
          <span>Started {new Date(arc.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</span>
          {arc.endDate && <span>Resolved {new Date(arc.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</span>}
          <span>{arc.editions.length} brief{arc.editions.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 16, top: 0, bottom: 0,
          width: 1, background: 'var(--border)',
        }} />

        {briefs.map((brief, idx) => brief && (
          <Link key={brief.slug} href={`/briefs/${brief.urlSlug}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              display: 'flex',
              gap: 20,
              marginBottom: 24,
              position: 'relative',
            }}>
              {/* Day dot */}
              <div style={{
                width: 32,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}>
                <div style={{
                  width: 32, height: 32,
                  borderRadius: '50%',
                  background: idx === 0 ? 'var(--gold)' : 'var(--surface)',
                  border: `2px solid ${idx === 0 ? 'var(--gold)' : 'var(--border-2)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: idx === 0 ? '#fff' : 'var(--ink-3)',
                  zIndex: 1,
                  position: 'relative',
                }}>
                  {idx + 1}
                </div>
              </div>

              {/* Content */}
              <div style={{
                flex: 1,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '14px 16px',
                transition: 'border-color 0.15s',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  letterSpacing: '0.06em',
                  marginBottom: 6,
                }}>
                  DAY {idx + 1} · {brief.displayDate.split(',')[0].toUpperCase()} · Edition #{String(brief.edition).padStart(3, '0')}
                </div>
                <div style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  lineHeight: 1.3,
                  marginBottom: brief.description ? 6 : 0,
                }}>
                  {brief.title}
                </div>
                {brief.description && (
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>
                    {brief.description}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}

        {arc.status === 'active' && (
          <div style={{ display: 'flex', gap: 20, opacity: 0.5 }}>
            <div style={{ width: 32, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '2px dashed var(--border-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>…</span>
              </div>
            </div>
            <div style={{
              flex: 1, border: '1px dashed var(--border)',
              borderRadius: 8, padding: '14px 16px',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                Story continues · Next edition tomorrow
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Back */}
      <div style={{ marginTop: 40 }}>
        <Link href="/briefs" style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--gold)', textDecoration: 'none',
        }}>
          ← All editions
        </Link>
      </div>
    </div>
  )
}
