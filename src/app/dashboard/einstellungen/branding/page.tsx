import { redirect } from 'next/navigation'
import { FEATURE_FLAGS } from '@/lib/feature-flags'
import { brandingAbrufen } from '@/app/actions/branding'
import BrandingEditor from '@/components/BrandingEditor'

/**
 * Branding-Bereich ist derzeit ueber FEATURE_FLAGS.branding deaktiviert.
 * Bei Aufruf wird auf die Einstellungs-Startseite weitergeleitet. Sobald
 * das Flag wieder auf `true` steht, ist die alte Seite ohne weitere
 * Aenderung erreichbar.
 */
export default async function BrandingPage() {
  if (!FEATURE_FLAGS.branding) {
    redirect('/dashboard/einstellungen?tab=profil')
  }

  const branding = await brandingAbrufen()

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Branding</h1>
        <p className="text-sm text-gray-500 mt-0.5">Farben, Logo und Erscheinungsbild für Kundenansichten</p>
      </div>
      <BrandingEditor branding={branding} />
    </div>
  )
}
