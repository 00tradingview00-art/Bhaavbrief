import { ImageResponse } from 'next/og'

export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: 180, height: 180,
        background: '#0E0D0A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 110, fontWeight: 700, color: '#B5862A', fontFamily: 'serif' }}>B</span>
      </div>
    ),
    { ...size }
  )
}
