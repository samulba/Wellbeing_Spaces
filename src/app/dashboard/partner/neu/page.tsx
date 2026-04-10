import Link from 'next/link'
import PartnerFormular from '@/components/PartnerFormular'
import { partnerAnlegen } from '@/app/actions/partner'

export default function NeuerPartnerPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard/partner" className="text-xs text-gray-400 hover:text-indigo-600 transition-colors mb-3 inline-block">
          ← Zurück zu Partner
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Neuer Partner</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <PartnerFormular aktion={partnerAnlegen} abbrechen="/dashboard/partner" />
      </div>
    </div>
  )
}
