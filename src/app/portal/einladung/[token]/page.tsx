import { einladungValidieren } from '@/app/actions/portal'
import { brandingFuerToken } from '@/app/actions/branding'
import Image from 'next/image'
import Link from 'next/link'
import RegistrierungForm from './RegistrierungForm'

interface Props { params: { token: string } }

export default async function EinladungPage({ params }: Props) {
  const [einladung, branding] = await Promise.all([
    einladungValidieren(params.token),
    brandingFuerToken(),
  ])

  const firma = branding?.firmenname    ?? 'Wellbeing Spaces'
  const prim  = branding?.primary_color ?? '#445c49'

  if (!einladung) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl">✗</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Link ungültig oder abgelaufen</h1>
          <p className="text-sm text-gray-500 mb-6">
            Dieser Einladungslink ist nicht mehr gültig. Bitte wenden Sie sich an {firma}.
          </p>
          <Link href="/portal/login" className="text-sm underline text-gray-500 hover:text-gray-700">
            Zum Login
          </Link>
        </div>
      </div>
    )
  }

  if (einladung.bereitsRegistriert) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Sie haben bereits einen Account</h1>
          <p className="text-sm text-gray-500 mb-6">Melden Sie sich mit Ihrer E-Mail-Adresse an.</p>
          <Link href="/portal/login"
            className="inline-block px-6 py-3 text-sm font-semibold text-white rounded-xl"
            style={{ background: prim }}>
            Zum Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {branding?.logo_url ? (
            <Image src={branding.logo_url} alt={firma} width={120} height={40} className="mx-auto mb-4 h-10 w-auto object-contain" />
          ) : (
            <div className="mx-auto mb-4 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: prim }}>
              <span className="text-white font-bold text-lg">{firma[0]}</span>
            </div>
          )}
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Einladung von {firma}</p>
          <h1 className="text-xl font-bold text-gray-900">Konto erstellen</h1>
          <p className="text-sm text-gray-500 mt-1">
            Willkommen, {einladung.vorname || einladung.email}!<br />
            Für: <strong>{einladung.kundeName}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-400 mb-4 text-center">{einladung.email}</p>
          <RegistrierungForm
            einladungsToken={params.token}
            initialVorname={einladung.vorname}
            initialNachname={einladung.nachname}
            prim={prim}
          />
        </div>
      </div>
    </div>
  )
}
