import { brandingFuerToken } from '@/app/actions/branding'
import Link from 'next/link'
import Image from 'next/image'

export default async function PortalLandingPage() {
  const branding = await brandingFuerToken()
  const firma    = branding?.firmenname ?? 'Wellbeing Spaces'
  const prim     = branding?.primary_color ?? '#445c49'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {branding?.logo_url ? (
          <Image src={branding.logo_url} alt={firma} width={120} height={40} className="mx-auto mb-8 h-10 w-auto object-contain" />
        ) : (
          <div className="mx-auto mb-8 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: prim }}>
            <span className="text-white font-bold text-lg">{firma[0]}</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Willkommen im Kunden-Portal</h1>
        <p className="text-sm text-gray-500 mb-8">
          Ihr persönlicher Bereich bei <strong>{firma}</strong>.<br />
          Projekte verfolgen, Produkte freigeben und mit Ihrem Ansprechpartner kommunizieren.
        </p>
        <Link
          href="/portal/login"
          className="inline-flex items-center justify-center w-full py-3 px-6 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90"
          style={{ background: prim }}
        >
          Anmelden
        </Link>
        <p className="mt-6 text-xs text-gray-400">
          Noch keinen Zugang? Kontaktieren Sie {firma}.
        </p>
      </div>
    </div>
  )
}
