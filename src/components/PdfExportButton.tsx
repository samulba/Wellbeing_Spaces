import { FileText } from 'lucide-react'

/**
 * Typ aus Legacy-Grund noch exportiert, wird aber in der aktuellen Server-Route
 * (src/app/api/projekte/[id]/pdf/route.ts) nicht mehr benötigt.
 * Kann entfernt werden, sobald alle Importe bereinigt sind.
 */
export type PdfProdukt = {
  name: string
  raumName: string
  kategorie: string | null
  menge: number
  einheit: string | null
  vpNetto: number
  status: string
}

interface Props {
  projektId: string
}

/**
 * Einfacher Download-Link auf die Server-PDF-Route.
 * Cover-Page, Raum-Sections, klickbare Produkt-Links und Logo werden
 * server-seitig gerendert (konsistent mit Angebote-/Vertrags-PDFs).
 */
export default function PdfExportButton({ projektId }: Props) {
  return (
    <a
      href={`/api/projekte/${projektId}/pdf`}
      className="inline-flex items-center gap-2 px-3.5 py-2 border border-wellbeing-green/40 hover:border-wellbeing-green bg-white hover:bg-wellbeing-cream/40 text-wellbeing-green-dark text-xs font-medium rounded-lg transition-colors"
      title="Projekt als PDF exportieren (Cover + Raum-Sections + klickbare Produktlinks)"
    >
      <FileText className="w-3.5 h-3.5" />
      PDF Export
    </a>
  )
}
