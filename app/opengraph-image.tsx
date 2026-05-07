import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'IdeaByLunch — Your Idea, Fully Cooked.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE0B2 50%, #FFCC80 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#1D1D1F',
              color: '#FFCC80',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            ✦
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.5px' }}>
            IdeaByLunch
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: '#1D1D1F',
              letterSpacing: '-3px',
              lineHeight: 1,
            }}
          >
            Your idea,
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: '#1D1D1F',
              letterSpacing: '-3px',
              lineHeight: 1,
            }}
          >
            fully cooked.
          </div>
          <div style={{ fontSize: 32, color: '#3a2e1a', maxWidth: 900, marginTop: 16, lineHeight: 1.3 }}>
            Brief in 60 seconds. Live product in 48 hours.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 22, color: '#1D1D1F', opacity: 0.7 }}>ideabylunch.com</div>
          <div style={{ fontSize: 22, color: '#1D1D1F', fontWeight: 600 }}>Pay once · You own it</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
