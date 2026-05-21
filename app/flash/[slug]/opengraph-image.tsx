import { ImageResponse } from 'next/og'
import { getFlash, getAllFlash } from '@/lib/flash'
import { OG_SIZE, C, loadFont, truncate } from '@/lib/og'

export const size        = OG_SIZE
export const contentType = 'image/png'

export async function generateStaticParams() {
  return getAllFlash().map(f => ({ slug: f.slug }))
}

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const flash    = getFlash(slug)
  if (!flash || !flash.published) return new Response('Not found', { status: 404 })

  const { data: font, name: fontName } = await loadFont()
  const serif = fontName
  const title = truncate(flash.title, 90)

  const CAT: Record<string, { bg: string; color: string; label: string }> = {
    energy:  { bg: '#2A1F00', color: '#D4A830', label: '⚡ ENERGY'  },
    metals:  { bg: '#0A2015', color: '#5AAA70', label: '⬡ METALS'  },
    forex:   { bg: '#1A1528', color: '#9B7FE8', label: '₹ FOREX'   },
    macro:   { bg: '#1A1A14', color: '#7A7668', label: '◎ MACRO'   },
  }
  const cat = CAT[flash.category] ?? CAT.macro

  const formattedDate = flash.date
    ? new Date(flash.date).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
      })
    : ''

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: C.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* Colour accent bar based on category */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: cat.color }} />

        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '64px 88px 0', flex: 1 }}>

          {/* Category + Flash badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: cat.color, background: cat.bg,
              padding: '5px 12px', borderRadius: 3, fontFamily: 'sans-serif', letterSpacing: 1.5,
            }}>
              {cat.label}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.gold, background: C.goldPale,
              padding: '5px 12px', borderRadius: 3, fontFamily: 'sans-serif', letterSpacing: 1.5,
            }}>
              INTELLIGENCE FLASH
            </div>
            {formattedDate && (
              <div style={{ fontSize: 12, color: C.ink4, fontFamily: 'sans-serif' }}>
                {formattedDate} IST
              </div>
            )}
          </div>

          {/* Title */}
          <div style={{ fontSize: 48, fontWeight: 700, color: C.ink, lineHeight: 1.12, letterSpacing: -0.8, fontFamily: serif, flex: 1 }}>
            {title}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 88px', borderTop: `1px solid ${C.rule}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.ink,  fontFamily: serif }}>Bhaav</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.gold, fontFamily: serif }}>Brief</span>
            <span style={{ marginLeft: 10, fontSize: 12, color: C.ink4, fontFamily: 'sans-serif' }}>Intelligence Feed</span>
          </div>
          <div style={{ fontSize: 13, color: C.ink4, fontFamily: 'sans-serif' }}>bhaavbrief.in</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: fontName, data: font, weight: 700, style: 'normal' as const }] }
  )
}
