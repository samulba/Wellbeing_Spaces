'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'

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
  projektName: string
  kundeName: string | null
  produkte: PdfProdukt[]
  mwst: number
}

const STATUSLABEL: Record<string, string> = {
  ausstehend:     'Ausstehend',
  freigegeben:    'Freigegeben',
  abgelehnt:      'Abgelehnt',
  ueberarbeitung: 'Überarb.',
}

const r2 = (n: number) => Math.round(n * 100) / 100
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €'

export default function PdfExportButton({ projektName, kundeName, produkte, mwst }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageW  = doc.internal.pageSize.getWidth()
      const pageH  = doc.internal.pageSize.getHeight()
      const margin = 14
      const heute  = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

      // ── Header-Linie ──────────────────────────────────────
      doc.setFillColor(68, 92, 73)             // wellbeing-green #445c49
      doc.rect(margin, 12, pageW - margin * 2, 0.6, 'F')

      // Wellbeing Spaces – oben rechts
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(68, 92, 73)
      doc.text('Wellbeing Spaces', pageW - margin, 10, { align: 'right' })

      // Datum – oben links
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(heute, margin, 10)

      // ── Titel-Block ───────────────────────────────────────
      let y = 22

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(17, 24, 39)   // gray-900
      doc.text(projektName, margin, y)
      y += 7

      if (kundeName) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(107, 114, 128)  // gray-500
        doc.text(`Kunde: ${kundeName}`, margin, y)
        y += 5
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(156, 163, 175)
      doc.text(`${produkte.length} Produkt${produkte.length !== 1 ? 'e' : ''}  ·  MwSt. ${Math.round(mwst * 100)}%`, margin, y)
      y += 6

      // ── Tabelle ───────────────────────────────────────────
      const rows = produkte.map((p) => {
        const vpBrutto = r2(p.vpNetto * (1 + mwst))
        const statusLabel = STATUSLABEL[p.status] ?? p.status
        return [
          p.name,
          p.raumName,
          p.kategorie ?? '–',
          `${p.menge}${p.einheit ? ' ' + p.einheit : ''}`,
          eur(p.vpNetto),
          eur(vpBrutto),
          statusLabel,
        ]
      })

      const statusFarbe = (status: string): [number, number, number] => {
        if (status === 'Freigegeben') return [209, 250, 229]   // emerald-100
        if (status === 'Abgelehnt')   return [254, 226, 226]   // red-100
        if (status === 'Überarb.')    return [254, 243, 199]   // amber-100
        return [243, 244, 246]                                  // gray-100
      }

      // Gesamtsummen
      const sumNetto  = r2(produkte.reduce((s, p) => s + p.vpNetto * p.menge, 0))
      const sumBrutto = r2(sumNetto * (1 + mwst))

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Produkt', 'Raum', 'Kategorie', 'Menge', 'VP netto', 'VP brutto', 'Status']],
        body: rows,
        foot: [[
          { content: 'Gesamt', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
          { content: eur(sumNetto),  styles: { fontStyle: 'bold', halign: 'right' } },
          { content: eur(sumBrutto), styles: { fontStyle: 'bold', halign: 'right' } },
          '',
        ]],
        showFoot: 'lastPage',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          textColor: [17, 24, 39],
        },
        headStyles: {
          fillColor: [99, 102, 241],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        footStyles: {
          fillColor: [243, 244, 246],
          textColor: [17, 24, 39],
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 28 },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 24, halign: 'right' },
          6: { cellWidth: 'auto', halign: 'center' },
        },
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 6) {
            const label = data.cell.raw as string
            data.cell.styles.fillColor = statusFarbe(label)
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })

      // ── Seitenzahl ────────────────────────────────────────
      const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(156, 163, 175)
        doc.text(`Seite ${i} / ${pageCount}`, pageW / 2, pageH - 8, { align: 'center' })
      }

      // ── Speichern ─────────────────────────────────────────
      const safeName = projektName.replace(/[^\w\s\-äöüÄÖÜß]/g, '_')
      const datum    = new Date().toISOString().slice(0, 10)
      doc.save(`${safeName}-${datum}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FileText className="w-3.5 h-3.5" />
      {loading ? 'Generiere…' : 'PDF Export'}
    </button>
  )
}
