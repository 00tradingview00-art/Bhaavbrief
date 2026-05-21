import { ImageResponse } from 'next/og'
import { getBrief, getAllBriefs } from '@/lib/briefs'
import { OG_SIZE, C, loadFont, truncate } from '@/lib/og'

export const size        = OG_SIZE
export const contentType = 'image/png'

export async function generateStaticParams() {
  const briefs = await getAllBriefs()
  return briefs.map(b => ({ slug: b.slug }))
}

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const brief    = getBrief(slug)
  if (!brief) return new Response('Not found', { status: 404 })

  const { data: font, name: fontName } = await loadFont()
  const serif = fontName
  const title = truncate(brief.title, 80)
  const desc  = truncate(brief.description || brief.summary || '', 100)

  const TAG_COLORS: Record<string, { bg: string; color: string }> = {
    energy:  { bg: '#2A1F00', color: '#D4A830' },
    metals:  { bg: '#0A2015', color: '#5AAA70' },
    macro:   { bg: '#1A1528', color: '#9B7FE8' },
    agri:    { bg: '#0A200F', color: '#4CAF6E' },
    default: { bg: '#1A1A14', color: '#7A7668' },
  }
  const primaryTag = brief.tags?.[0]?.toLowerCase() ?? ''
  const tagType    = Object.keys(TAG_COLORS).find(k => primaryTag.includes(k)) ?? 'default'
  const tagStyle   = TAG_COLORS[tagType]

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: C.bg, display: 'flex', flexDirection: 'column' }}>

        {/* Gold top bar */}
        <div style={{ width: '100%', height: 6, background: C.gold, flexShrink: 0 }} />

        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '58px 88px 0', flex: 1 }}>

          {/* Meta row: edition badge + tag + date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.gold, background: C.goldPale,
              padding: '5px 12px', borderRadius: 3, fontFamily: 'sans-serif', letterSpacing: 1.5,
            }}>
              EDITION #{String(brief.edition).padStart(3, '0')}
            </div>
            {brief.tags?.[0] && (
              <div style={{
                fontSize: 11, fontWeight: 700, color: tagStyle.color, background: tagStyle.bg,
                padding: '5px 12px', borderRadius: 3, fontFamily: 'sans-serif', letterSpacing: 1,
              }}>
                {brief.tags[0].toUpperCase()}
              </div>
            )}
            <div style={{ fontSize: 12, color: C.ink4, fontFamily: 'sans-serif', letterSpacing: 0.5 }}>
              {brief.displayDate}
            </div>
          </div>

          {/* Title */}
          <div style={{ fontSize: 50, fontWeight: 700, color: C.ink, lineHeight: 1.1, letterSpacing: -1, fontFamily: serif, marginBottom: 20, flex: 1 }}>
            {title}
          </div>

          {/* Description */}
          {desc && (
            <div style={{ fontSize: 19, color: C.ink3, lineHeight: 1.55, fontFamily: 'sans-serif', marginBottom: 32, maxWidth: 900 }}>
              {desc}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 88px', borderTop: `1px solid ${C.rule}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.ink,  fontFamily: serif }}>Bhaav</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.gold, fontFamily: serif }}>Brief</span>
          </div>
          <div style={{ fontSize: 13, color: C.ink4, fontFamily: 'sans-serif' }}>bhaavbrief.in</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: fontName, data: font, weight: 700, style: 'normal' as const }] }
  )
}
