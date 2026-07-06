'use client'

import { Layers, Handshake } from 'lucide-react'
import PdfExportDialog from '@/components/PdfExportDialog'

interface Option { id: string; name: string }

interface Props {
  raumId: string
  /** Gruppen (produkt_bereiche), die im Raum tatsächlich vorkommen. */
  gruppen: Option[]
  hatOhneGruppe: boolean
  /** Partner, deren Produkte im Raum liegen. */
  partner: Option[]
  hatOhnePartner: boolean
}

/**
 * „PDF"-Export der Raum-Produktübersicht — dünner Wrapper um den generischen
 * PdfExportDialog (S137/S139): Gruppen + Partner filterbar, Preis-Spalten
 * (EK netto / Kundenpreis brutto) optional. Ohne Häkchen bleibt die PDF
 * Lieferanten-sicher ohne Preise.
 */
export default function RaumPdfExportModal({ raumId, gruppen, hatOhneGruppe, partner, hatOhnePartner }: Props) {
  return (
    <PdfExportDialog
      titel="Produktübersicht als PDF"
      basePath={`/api/raeume/${raumId}/pdf`}
      filterGroups={[
        { key: 'gruppen', label: 'Gruppen', icon: Layers, options: gruppen, ohneLabel: hatOhneGruppe ? 'Ohne Gruppe' : null },
        { key: 'partner', label: 'Partner / Lieferant', icon: Handshake, options: partner, ohneLabel: hatOhnePartner ? 'Ohne Partner' : null },
      ]}
      preisModus={{
        typ: 'checkboxen',
        toggles: [
          { key: 'ek', label: 'EK netto (Einkauf)' },
          { key: 'vk', label: 'Kundenpreis (brutto)' },
        ],
        hinweis: 'Ohne Häkchen enthält die PDF keine Preise — sicher zum Weiterleiten an Lieferanten.',
      }}
      emptyHint="Bitte mindestens eine Gruppe und einen Partner auswählen."
    />
  )
}
