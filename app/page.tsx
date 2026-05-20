import { getAllBriefs } from '@/lib/briefs'
import Tag from '@/components/Tag'
import Link from 'next/link'

export default async function HomePage() {
  const briefs = await getAllBriefs()
  const [latest, ...previous] = briefs

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40, alignItems: 'start' }}>

      {/* LEFT — Main content */}
      <div>
        {/* Hero brief */}
        {latest && (
          <div style={{ marginBottom: 48 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 500, letterSpacing: '0.8px',
              textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14,
            }}>
              <span style={{ width: 20, height: 1, background: 'var(--gold)', display: 'inline-block' }} />
              {latest.displayDate} · Edition #{latest.edition}
            </div>

            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 38,
              fontWeight: 500,
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              color: 'var(--ink)',
              margin: '0 0 14px',
            }}>
              {latest.title}
            </h1>

            <p style={{
              fontSize: 15,
              color: 'var(--ink-2)',
              lineHeight: 1.75,
              margin: '0 0 20px',
              maxWidth: 560,
            }}>
              {latest.description}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {latest.tags?.map((tag: string) => (
                <Tag key={tag} type={getTagType(tag)}>{tag}</Tag>
              ))}
            </div>

            <Link
              href={`/briefs/${latest.slug}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--gold)', color: '#fff',
                padding: '10px 22px', borderRadius: 6,
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
              }}
            >
              Read today&apos;s brief →
            </Link>
          </div>
        )}

        {/* Previous briefs */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16, paddingBottom: 12,
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              Previous Briefs
            </span>
            <Link href="/briefs" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>

          {previous.slice(0, 5).map((brief) => (
            <Link
              key={brief.slug}
              href={`/briefs/${brief.slug}`}
              style={{ display: 'block', textDecoration: 'none', padding: '18px 0', borderBottom: '1px solid var(--border)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <Tag type={getTagType(brief.tags?.[0])}>{brief.tags?.[0] ?? 'Brief'}</Tag>
                <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{brief.displayDate}</span>
              </div>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                fontWeight: 500,
                lineHeight: 1.3,
                color: 'var(--ink)',
                margin: '0 0 6px',
              }}>
                {brief.title}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0 }}>
                {brief.description}
              </p>
              {brief.tags && brief.tags.length > 1 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {brief.tags.slice(0, 5).map((tag: string) => (
                    <Tag key={tag} type={getTagType(tag)}>{tag}</Tag>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* RIGHT — Sidebar */}
      <div style={{ position: 'sticky', top: 80 }}>
        {/* Subscribe card */}
        <div id="subscribe" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 22,
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>
            Start your morning with an edge
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65, marginBottom: 18 }}>
            Join India&apos;s sharpest commodity traders. MCX intelligence every weekday at 7 AM. Free forever.
          </p>
          <SubscribeForm />
        </div>

        {/* Why we built this */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 22,
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
            Why we built this
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.75, marginBottom: 20 }}>
            Indian commodity traders pay ₹5L+ a year for Bloomberg or spend 2 hours piecing together intelligence from 10 sources. BhaavBrief does that work for you — free, every weekday, before the MCX bell.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
            {[
              { val: '₹0', label: 'Forever Free' },
              { val: '5 min', label: 'Daily Read' },
              { val: '7 AM', label: 'Every Day' },
            ].map(({ val, label }) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* About card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 22,
        }}>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12 }}>
            About BhaavBrief
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.75, margin: 0 }}>
            Independent commodity intelligence for Indian traders and merchants. MCX energy, metals, and NCDEX agri — through a geopolitical and supply-demand lens. Published at 7 AM IST every weekday.
          </p>
        </div>
      </div>
    </div>
  )
}

function SubscribeForm() {
  return (
    <form action="https://app.brevo.com/..." method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        type="email"
        name="email"
        placeholder="Enter your email address"
        required
        style={{
          width: '100%',
          border: '1px solid var(--border-2)',
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 13,
          fontFamily: 'var(--font-sans)',
          background: 'var(--surface-2)',
          color: 'var(--ink)',
          boxSizing: 'border-box',
        }}
      />
      <button
        type="submit"
        style={{
          width: '100%',
          background: 'var(--ink)',
          color: '#fff',
          border: 'none',
          padding: '10px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Subscribe free →
      </button>
      <a
        href="https://wa.me/..."
        style={{
          width: '100%',
          background: '#25D366',
          color: '#fff',
          border: 'none',
          padding: '10px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxSizing: 'border-box',
        }}
      >
        📱 Get alerts on WhatsApp
      </a>
      <p style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', margin: 0 }}>
        No spam · Unsubscribe anytime
      </p>
    </form>
  )
}

function getTagType(tag?: string): string {
  if (!tag) return 'default'
  const t = tag.toLowerCase()
  if (t.includes('crude') || t.includes('energy') || t.includes('gas')) return 'energy'
  if (t.includes('gold') || t.includes('silver') || t.includes('copper') || t.includes('metal') || t.includes('zinc')) return 'metals'
  if (t.includes('macro') || t.includes('rbi') || t.includes('sebi') || t.includes('fed') || t.includes('dollar')) return 'macro'
  if (t.includes('agri') || t.includes('ncdex') || t.includes('pepper') || t.includes('soy')) return 'agri'
  return 'default'
}
