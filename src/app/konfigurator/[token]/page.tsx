import { konfiguratorAbrufen } from '@/app/actions/konfigurator'
import { brandingFuerToken } from '@/app/actions/branding'
import KonfiguratorClient from './KonfiguratorClient'

interface Props {
  params: { token: string }
}

export default async function KonfiguratorPage({ params }: Props) {
  const [daten, branding] = await Promise.all([
    konfiguratorAbrufen(params.token),
    brandingFuerToken(),
  ])

  if (!daten) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="w-12 h-12 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-gray-500 font-bold text-lg">!</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Link nicht verfügbar</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Dieser Konfigurator-Link ist ungültig, abgelaufen oder wurde deaktiviert.
          </p>
        </div>
      </div>
    )
  }

  if (daten.session.status === 'abgeschlossen') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Auswahl abgeschlossen</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Ihre Produktauswahl wurde bereits übermittelt. Vielen Dank!
          </p>
        </div>
      </div>
    )
  }

  return (
    <KonfiguratorClient
      token={params.token}
      daten={daten}
      branding={branding}
    />
  )
}
