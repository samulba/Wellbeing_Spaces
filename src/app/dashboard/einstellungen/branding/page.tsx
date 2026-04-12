import { brandingAbrufen } from '@/app/actions/branding'
import BrandingEditor from '@/components/BrandingEditor'

export default async function BrandingPage() {
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
