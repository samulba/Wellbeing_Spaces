import { brandingFuerToken } from '@/app/actions/branding'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Kunden-Portal' }

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const branding = await brandingFuerToken()
  const prim     = branding?.primary_color    ?? '#445c49'
  const bg       = branding?.background_color ?? '#f6ede2'
  const font     = branding?.font_family      ?? 'Montserrat'

  return (
    <html lang="de">
      <head>
        <link
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`}
          rel="stylesheet"
        />
        <style>{`
          :root { --brand-primary: ${prim}; --brand-bg: ${bg}; }
          body  { font-family: '${font}', sans-serif; background: ${bg}; }
        `}</style>
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
