import Link from 'next/link'
import KundeFormular from '@/components/KundeFormular'
import { kundeAnlegen } from '@/app/actions/kunden'

export default function NeuerKundePage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/kunden"
          className="text-xs text-stone-400 hover:text-stone-700 transition-colors mb-3 inline-block"
        >
          ← Zurück zu Kunden
        </Link>
        <h1 className="text-xl font-semibold text-stone-800">Neuer Kunde</h1>
      </div>

      <div className="bg-white border border-stone-100 rounded-xl p-6">
        <KundeFormular
          aktion={kundeAnlegen}
          abbrechen="/dashboard/kunden"
        />
      </div>
    </div>
  )
}
