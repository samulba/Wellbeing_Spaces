import { brandingFuerToken } from '@/app/actions/branding'
import Image from 'next/image'
import Link from 'next/link'
import LoginForm from './LoginForm'

export default async function PortalLoginPage() {
  const branding = await brandingFuerToken()
  const firma    = branding?.firmenname    ?? 'Wellbeing Spaces'
  const prim     = branding?.primary_color ?? '#445c49'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          {branding?.logo_url ? (
            <Image src={branding.logo_url} alt={firma} width={120} height={40} className="mx-auto mb-4 h-10 w-auto object-contain" />
          ) : (
            <div className="mx-auto mb-4 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: prim }}>
              <span className="text-white font-bold text-lg">{firma[0]}</span>
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-900">Kunden-Portal</h1>
          <p className="text-sm text-gray-500 mt-1">{firma}</p>
        </div>

        {/* Formular */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <LoginForm prim={prim} />
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Noch kein Zugang?{' '}
          <Link href="/portal" className="underline hover:text-gray-600">
            Mehr erfahren
          </Link>
        </p>
      </div>
    </div>
  )
}
