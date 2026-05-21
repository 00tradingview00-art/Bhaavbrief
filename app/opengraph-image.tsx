import { ImageResponse } from 'next/og'
import { OG_SIZE, C, loadFont } from '@/lib/og'

export const alt          = "BhaavBrief — India's MCX Commodity Intelligence"
export const size         = OG_SIZE
export const contentType  = 'image/png'

export default async function OGImage() {
  const { data: font, name: fontName } = await loadFont()
  const serif = fontName

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: C.bg, display: 'flex', flexDirection: 'column' }}>

        {/* Gold top bar */}
        <div style={{ width: '100%', height: 6, background: C.gold, flexShrink: 0 }} />

        {/* Main area */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '66px 88px 0', flex: 1 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 64 }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: C.ink,  fontFamily: serif, letterSpacing: -1 }}>Bhaav</span>
            <span style={{ fontSize: 34, fontWeight: 700, color: C.gold, fontFamily: serif, letterSpacing: -1 }}>Brief</span>
            <span style={{ marginLeft: 16, fontSize: 12, color: C.ink4, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              India's Commodity Intelligence
            </span>
          </div>

          {/* Headline */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 58, fontWeight: 700, color: C.ink, lineHeight: 1.08, letterSpacing: -1.5, fontFamily: serif, marginBottom: 28 }}>
              <span>MCX Markets</span>
              <span>Intelligence</span>
            </div>
            <div style={{ fontSize: 22, color: C.ink3, fontFamily: 'sans-serif', letterSpacing: 0.5 }}>
              Gold · Silver · Crude Oil · Copper · Natural Gas
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 88px', borderTop: `1px solid ${C.rule}` }}>
          <div style={{ fontSize: 15, color: C.ink4, fontFamily: 'sans-serif' }}>bhaavbrief.in</div>
          <div style={{ fontSize: 12, color: C.gold, background: C.goldPale, padding: '6px 14px', borderRadius: 4, fontFamily: 'sans-serif', letterSpacing: 1.5 }}>
            FREE · EVERY WEEKDAY
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: fontName, data: font, weight: 700, style: 'normal' as const }] }
  )
}
