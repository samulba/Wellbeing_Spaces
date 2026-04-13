import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Wellbeing Spaces – Interior Design Projektmanagement Software'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2d3e31 0%, #445c49 60%, #2d3e31 100%)',
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* Dot grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(148,193,164,0.12) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '800px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(148,193,164,0.2) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(148,193,164,0.15)',
              border: '1px solid rgba(148,193,164,0.3)',
              borderRadius: '100px',
              padding: '8px 20px',
              marginBottom: '32px',
            }}
          >
            <span style={{ color: '#94c1a4', fontSize: '13px', fontWeight: 700, letterSpacing: '0.15em' }}>
              INTERIOR DESIGN SOFTWARE
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.05,
              marginBottom: '24px',
              letterSpacing: '-1px',
            }}
          >
            Wellbeing Spaces
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '26px',
              color: 'rgba(255,255,255,0.55)',
              maxWidth: '700px',
              lineHeight: 1.4,
              marginBottom: '48px',
            }}
          >
            Projekte verwalten. Preise kalkulieren.
            Kunden per Link zur Freigabe einladen.
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {['✓ DSGVO-konform', '✓ EU-Server', '✓ Beta kostenlos'].map((tag) => (
              <div
                key={tag}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* URL bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '60px',
            color: 'rgba(255,255,255,0.25)',
            fontSize: '16px',
          }}
        >
          wellbeing-spaces.de
        </div>
      </div>
    ),
    { ...size }
  )
}
