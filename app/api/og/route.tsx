import { ImageResponse } from 'next/og'
import { NextRequest }   from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title   = searchParams.get('title')   ?? 'India Commodity Intelligence'
  const edition = searchParams.get('edition') ?? ''
  const date    = searchParams.get('date')    ?? ''
  const tags    = searchParams.get('tags')    ?? ''
  const type    = searchParams.get('type')    ?? 'brief'

  const isFlash = type === 'flash'
  const badge   = isFlash ? 'Flash' : (edition ? `Edition #${edition}` : 'Daily Brief')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#FAFAF6',
          padding: '56px 64px',
          fontFamily: 'serif',
        }}
      >
        {/* Gold top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 6, background: '#C8720A', display: 'flex',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 40,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{
              fontFamily: 'serif', fontSize: 28, fontWeight: 600,
              color: '#18180F', letterSpacing: '-0.5px',
            }}>
              Bhaav<span style={{ color: '#C8720A' }}>Brief</span>
            </span>
            <span style={{
              fontSize: 11, fontFamily: 'monospace',
              background: '#C8720A', color: '#fff',
              padding: '3px 10px', borderRadius: 3,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              {badge}
            </span>
          </div>
          {date && (
            <span style={{
              fontSize: 15, fontFamily: 'monospace',
              color: '#8A8A7A', letterSpacing: '0.05em',
            }}>
              {date}
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <p style={{
            fontSize: title.length > 60 ? 38 : 46,
            fontWeight: 500, color: '#18180F',
            lineHeight: 1.2, margin: 0,
            letterSpacing: '-0.5px',
          }}>
            {title}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #DDDDD0', paddingTop: 24,
          marginTop: 32,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {tags.split(',').filter(Boolean).slice(0, 3).map(tag => (
              <span key={tag} style={{
                fontSize: 11, fontFamily: 'monospace',
                color: '#C8720A', background: 'rgba(200,114,10,0.1)',
                padding: '4px 10px', borderRadius: 3,
                letterSpacing: '0.06em',
              }}>
                {tag.trim()}
              </span>
            ))}
          </div>
          <span style={{
            fontSize: 12, fontFamily: 'monospace',
            color: '#8A8A7A', letterSpacing: '0.05em',
          }}>
            bhaavbrief.in
          </span>
        </div>
      </div>
    ),
    {
      width:  1200,
      height: 630,
    }
  )
}
