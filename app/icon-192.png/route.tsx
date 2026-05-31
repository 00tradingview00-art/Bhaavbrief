import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        width: 192, height: 192,
        background: '#0E0D0A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 118, fontWeight: 700, color: '#B5862A', fontFamily: 'serif' }}>B</span>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
