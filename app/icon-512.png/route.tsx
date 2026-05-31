import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        width: 512, height: 512,
        background: '#0E0D0A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 316, fontWeight: 700, color: '#B5862A', fontFamily: 'serif' }}>B</span>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
