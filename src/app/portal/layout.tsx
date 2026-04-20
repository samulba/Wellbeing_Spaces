import { brandingFuerToken } from '@/app/actions/branding'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Kunden-Portal' }

/** HEX → 'r,g,b' für rgba()-Mischungen im CSS */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '').trim()
  if (h.length !== 3 && h.length !== 6) return '68,92,73'
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `${r},${g},${b}`
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const branding = await brandingFuerToken()

  const firmenname = branding?.firmenname        ?? 'Wellbeing Spaces'
  const prim       = branding?.primary_color     ?? '#445c49'
  const secondary  = branding?.secondary_color   ?? '#94c1a4'
  const accent     = branding?.accent_color      ?? '#f6ede2'
  const bg         = branding?.background_color  ?? '#f6ede2'
  const textColor  = branding?.text_color        ?? '#1a2e1e'
  const font       = branding?.font_family       ?? 'Montserrat'
  const buttonText = (branding as { button_text_color?: string })?.button_text_color ?? '#ffffff'
  const favicon    = branding?.favicon_url ?? null
  const customCss  = branding?.custom_css  ?? null

  const primRgb = hexToRgb(prim)

  return (
    <html lang="de">
      <head>
        <title>{`${firmenname} – Kunden-Portal`}</title>
        {favicon && <link rel="icon" href={favicon} />}
        <link
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700;800&display=swap`}
          rel="stylesheet"
        />
        <style>{`
          :root {
            --brand-primary:       ${prim};
            --brand-primary-rgb:   ${primRgb};
            --brand-secondary:     ${secondary};
            --brand-accent:        ${accent};
            --brand-bg:            ${bg};
            --brand-text:          ${textColor};
            --brand-button-text:   ${buttonText};
          }
          html, body { font-family: '${font}', system-ui, sans-serif; }
          body { background: ${bg}; color: ${textColor}; }

          /* Gemeinsame Utility-Klassen für Portal-Komponenten */
          .brand-primary          { background-color: var(--brand-primary); color: var(--brand-button-text); }
          .brand-primary:hover    { filter: brightness(0.92); }
          .brand-primary-text     { color: var(--brand-primary); }
          .brand-primary-border   { border-color: var(--brand-primary); }
          .brand-ring             { box-shadow: 0 0 0 3px rgba(var(--brand-primary-rgb), 0.15); }
          .brand-accent-bg        { background-color: var(--brand-accent); }
        `}</style>
        {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
