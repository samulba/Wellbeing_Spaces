'use client'

import { DoorOpen } from 'lucide-react'
import PdfExportDialog from '@/components/PdfExportDialog'

interface Option { id: string; name: string }

/**
 * PDF-Export der Projekt-Präsentation mit Auswahl + Live-Vorschau:
 * Räume filterbar, Preismodus wählbar — Kundenpreise BRUTTO ist der Standard
 * (User-Entscheidung); Netto-Detail und „ohne Preise" bleiben wählbar.
 * Ohne Dialog (nackte URL) liefert die Route weiter das Netto-Layout.
 */
export default function ProjektPdfExportModal({ projektId, raeume }: { projektId: string; raeume: Option[] }) {
  return (
    <PdfExportDialog
      titel="Projekt als PDF"
      basePath={`/api/projekte/${projektId}/pdf`}
      filterGroups={[
        { key: 'raeume', label: 'Räume', icon: DoorOpen, options: raeume },
      ]}
      preisModus={{
        typ: 'radio',
        param: 'preise',
        default: 'brutto',
        options: [
          { value: 'brutto', label: 'Kundenpreise (brutto)', hint: 'inkl. MwSt — für den Kunden' },
          { value: 'netto',  label: 'Netto-Detail',          hint: 'mit Basis/Rabatt-Spalten' },
          { value: 'keine',  label: 'Ohne Preise',           hint: 'nur Produkte & Mengen' },
        ],
      }}
      emptyHint="Bitte mindestens einen Raum auswählen."
    />
  )
}
