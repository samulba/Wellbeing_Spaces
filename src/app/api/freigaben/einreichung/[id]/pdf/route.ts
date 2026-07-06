import { NextRequest, NextResponse } from 'next/server'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import {
  pdfEur,
  logoAlsBase64,
  pdfKopf, pdfTitel, pdfFusszeilen, pdfFirmenname,
  TABLE_STYLES, TABLE_HEAD_STYLES, ALT_ROW, STATUS_FARBEN,
  WB_GREEN, GRAY_900, GRAY_600, GRAY_400, GRAY_100,
  MARGIN, PAGE_W, PAGE_H,
} from '@/lib/pdf-helpers'
import type { FreigabeEinreichung, FreigabeEinreichungPosition } from '@/lib/supabase/types'

type Params = { params: Promise<{ id: string }> }

function statusLabel(s: string): string {
  if (s === 'freigegeben') return 'Freigegeben'
  if (s === 'abgelehnt') return 'Abgelehnt'
  if (s === 'ueberarbeitung') return 'Überarbeitung'
  return 'Offen'
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  // ── Auth ──────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = await getOrganisationId()

  // ── Daten laden (org-scoped) ──────────────────────────────
  const [{ data: belegRaw }, { data: branding }, { data: org }] = await Promise.all([
    supabase.from('freigabe_einreichungen').select('*').eq('id', id).eq('organisation_id', orgId).maybeSingle(),
    supabase.from('branding').select('*').maybeSingle(),
    supabase.from('organisationen').select(
      'name, rechtsform, handelsregister_nr, registergericht, geschaeftsfuehrer, ust_id, steuernummer, bank_name, bank_iban, bank_bic',
    ).eq('id', orgId).maybeSingle(),
  ])

  if (!belegRaw) return NextResponse.json({ error: 'Beleg nicht gefunden' }, { status: 404 })
  const beleg = belegRaw as FreigabeEinreichung
  const positionen = (beleg.positionen ?? []) as FreigabeEinreichungPosition[]
  const summen = beleg.summen

  const { data: projekt } = await supabase
    .from('projekte').select('name').eq('id', beleg.projekt_id).eq('organisation_id', orgId).maybeSingle()
  const projektName = (projekt as { name?: string } | null)?.name ?? 'Projekt'

  const abgesendet = (() => {
    try { return new Intl.DateTimeFormat('de-DE', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(beleg.abgesendet_am)) }
    catch { return beleg.abgesendet_am }
  })()

  // ── jsPDF ─────────────────────────────────────────────────
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const firmenname = pdfFirmenname(branding)
  const logo = await logoAlsBase64(branding?.logo_url ?? null)

  // ── Kopf + Titel (Design-System) ──────────────────────────
  let y = pdfKopf(doc, { logo, branding, org: org ?? null })
  y = pdfTitel(doc, y, { keyword: 'FREIGABE-PROTOKOLL', meta: `Freigabe Nr. ${beleg.lfd_nr}` })

  // ── Zwei-Spalten-Block: Projekt/Unterzeichner | Zeitpunkt ──
  const col2 = PAGE_W / 2 + 5
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GRAY_400)
  doc.text('PROJEKT', MARGIN, y)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...GRAY_900)
  doc.text(projektName, MARGIN, y + 5)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY_600)
  doc.text(`Freigegeben durch: ${beleg.unterzeichner_name}`, MARGIN, y + 10)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GRAY_400)
  doc.text('VERBINDLICH ABGESENDET', col2, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY_600)
  doc.text(abgesendet, col2, y + 5)
  y += 18

  // ── Allgemeiner Kommentar ─────────────────────────────────
  if (beleg.allgemeiner_kommentar && beleg.allgemeiner_kommentar.trim()) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GRAY_400)
    doc.text('ANMERKUNG DES KUNDEN', MARGIN, y); y += 4
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY_600)
    const lines = doc.splitTextToSize(beleg.allgemeiner_kommentar, PAGE_W - MARGIN * 2) as string[]
    doc.text(lines, MARGIN, y); y += lines.length * 4.5 + 4
  }

  // ── Positions-Tabelle ─────────────────────────────────────
  // Brutto-Spalte NUR wenn der (unveränderliche) Snapshot sie enthält —
  // neue Belege speichern einzelpreis_brutto, alte rendern exakt wie bisher.
  const hatBrutto = positionen.some((p) => p.einzelpreis_brutto != null)

  const tableRows = positionen.map((p, i) => {
    const meta: string[] = []
    if (p.raum_name) meta.push(p.raum_name)
    if (p.bereich_name) meta.push(p.bereich_name)
    if (p.block_name) meta.push(`Block: ${p.block_name}`)
    let bez = p.produkt_name
    if (meta.length) bez += `\n${meta.join(' · ')}`
    if (p.ist_kundenwahl) bez += `\n[Kundenwahl]`
    if (p.kommentar && p.kommentar.trim()) bez += `\nKundenwunsch: ${p.kommentar.trim()}`
    const zeile = [
      String(i + 1),
      bez,
      statusLabel(p.status),
      `${p.menge}${p.einheit ? ' ' + p.einheit : ''}`,
      p.einzelpreis_netto != null ? pdfEur(p.einzelpreis_netto) : '—',
    ]
    if (hatBrutto) zeile.push(p.einzelpreis_brutto != null ? pdfEur(p.einzelpreis_brutto) : '—')
    return zeile
  })

  const kopfZeile = ['Pos', 'Produkt', 'Status', 'Menge', 'Einzelpreis netto']
  if (hatBrutto) kopfZeile.push('Einzelpreis brutto')
  const spaltenStile: Record<number, { cellWidth?: number | 'auto'; halign?: 'left' | 'center' | 'right'; fontStyle?: 'bold' }> = {
    0: { cellWidth: 12, halign: 'center' },
    1: { cellWidth: 'auto' },
    2: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
    3: { cellWidth: hatBrutto ? 16 : 20, halign: 'center' },
    4: { cellWidth: hatBrutto ? 26 : 28, halign: 'right' },
  }
  if (hatBrutto) spaltenStile[5] = { cellWidth: 26, halign: 'right', fontStyle: 'bold' }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [kopfZeile],
    body: tableRows,
    styles: TABLE_STYLES,
    headStyles: TABLE_HEAD_STYLES,
    alternateRowStyles: { fillColor: ALT_ROW },
    columnStyles: spaltenStile,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const v = String(data.cell.raw)
        if (v === 'Freigegeben') data.cell.styles.textColor = STATUS_FARBEN.freigegeben
        else if (v === 'Abgelehnt') data.cell.styles.textColor = STATUS_FARBEN.abgelehnt
        else if (v === 'Überarbeitung') data.cell.styles.textColor = STATUS_FARBEN.ueberarbeitung
        else data.cell.styles.textColor = STATUS_FARBEN.ausstehend
      }
      // Preis-Spaltenköpfe rechtsbündig (wie die Werte darunter)
      if (data.section === 'head' && data.column.index >= 4) data.cell.styles.halign = 'right'
    },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7

  // ── Zusammenfassung ───────────────────────────────────────
  if (y > PAGE_H - 40) { doc.addPage(); y = MARGIN + 5 }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY_600)
  doc.text(
    `Gesamt: ${summen?.gesamt ?? positionen.length}   ·   Freigegeben: ${summen?.freigegeben ?? 0}   ·   Abgelehnt: ${summen?.abgelehnt ?? 0}   ·   Überarbeitung: ${summen?.ueberarbeitung ?? 0}`,
    MARGIN, y,
  )
  y += 7
  // Brutto-Zeile nur bei neuen Belegen (Snapshot enthält die Felder)
  if (summen?.summe_freigegeben_brutto != null) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY_600)
    doc.text(`Freigegeben (netto): ${pdfEur(summen?.summe_freigegeben_netto ?? 0)}`, PAGE_W - MARGIN, y, { align: 'right' })
    y += 6
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...WB_GREEN)
    doc.text(
      `Freigegeben (brutto, inkl. ${Math.round((summen.mwst_satz ?? 0.19) * 100)} % MwSt.): ${pdfEur(summen.summe_freigegeben_brutto)}`,
      PAGE_W - MARGIN, y, { align: 'right' },
    )
    y += 10
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...WB_GREEN)
    doc.text(`Freigegeben (netto): ${pdfEur(summen?.summe_freigegeben_netto ?? 0)}`, PAGE_W - MARGIN, y, { align: 'right' })
    y += 10
  }

  // ── Unveränderlichkeits-Hinweis + Prüfsumme ───────────────
  doc.setDrawColor(...GRAY_100); doc.setLineWidth(0.3); doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 4
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRAY_400)
  doc.text(
    'Dieser Beleg dokumentiert die verbindliche Kundenfreigabe zum oben genannten Zeitpunkt und ist unveränderlich gespeichert.',
    MARGIN, y,
  )
  y += 3.5
  if (beleg.content_hash) doc.text(`Prüfsumme (SHA-256): ${beleg.content_hash}`, MARGIN, y)

  // ── Footer: Legal (inkl. Rechtsträger) + Seitenzahl ───────
  pdfFusszeilen(doc, { firmenname, org: org ?? null, includeBank: false, zusatz: `Freigabe-Protokoll Nr. ${beleg.lfd_nr}` })

  const pdfBytes = doc.output('arraybuffer')
  const safeName = projektName.replace(/[^\w\s\-]/g, '_')
  const filename = `Freigabe-Protokoll_Nr-${beleg.lfd_nr}_${safeName}.pdf`

  return new Response(pdfBytes, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
