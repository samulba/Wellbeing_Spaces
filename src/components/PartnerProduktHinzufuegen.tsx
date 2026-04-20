import Link from 'next/link'
import { Plus } from 'lucide-react'

/**
 * "Produkt hinzufügen"-Button auf der Partner-Detailseite.
 * Leitet auf das vollständige Produkt-Formular der Bibliothek-Seite mit
 * ?partner_id=… weiter — dadurch ist die Felder-Tiefe identisch zu allen
 * anderen Neuanlage-Flows (kein halbgares Mini-Modal mehr).
 */
export default function PartnerProduktHinzufuegen({
  partnerId,
}: {
  partnerId: string
}) {
  return (
    <Link
      href={`/dashboard/produkte/bibliothek/neu?partner_id=${partnerId}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green-light rounded-lg hover:bg-wellbeing-cream transition-colors"
    >
      <Plus className="w-3.5 h-3.5" />
      Produkt hinzufügen
    </Link>
  )
}
