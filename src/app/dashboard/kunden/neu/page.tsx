import Link from 'next/link'
import KundeFormular from '@/components/KundeFormular'
import { kundeAnlegen } from '@/app/actions/kunden'

export default function NeuerKundePage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/kunden"
          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors mb-3 inline-block"
        >
          ← Zurück zu Kunden
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Neuer Kunde</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <KundeFormular
          aktion={kundeAnlegen}
          abbrechen="/dashboard/kunden"
        />
      </div>
    </div>
  )
}
