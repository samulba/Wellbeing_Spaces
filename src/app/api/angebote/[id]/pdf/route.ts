import { NextRequest, NextResponse } from 'next/server'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import {
  pdfEur, pdfDatum, pdfHeute,
  logoAlsBase64,
  pdfLegalFooterZeilen,
  WB_GREEN, GRAY_900, GRAY_600, GRAY_400, GRAY_100, WHITE,
  MARGIN, PAGE_W, PAGE_H,
} from '@/lib/pdf-helpers'
import type { AngebotPosition } from '@/lib/supabase/types'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  // ── Auth prüfen ───────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrganisationId()

  // ── Daten laden ───────────────────────────────────────────
  const [
    { data: angebot },
    { data: branding },
    { data: org },
  ] = await Promise.all([
    supabase.from('angebote').select('*').eq('id', id).eq('organisation_id', orgId).single(),
    supabase.from('branding').select('*').maybeSingle(),
    supabase.from('organisationen').select(
      'name, rechtsform, handelsregister_nr, registergericht, geschaeftsfuehrer, ust_id, steuernummer, bank_name, bank_iban, bank_bic',
    ).eq('id', orgId).maybeSingle(),
  ])

  if (!angebot) return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })

  const { data: kunde } = await supabase
    .from('kunden')
    .select('name, email, adresse, ansprechpartner')
    .eq('id', angebot.kunde_id)
    .single()

  // ── jsPDF laden ───────────────────────────────────────────
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const firmenname = branding?.firmenname ?? 'Wellbeing Spaces'
  const logo = await logoAlsBase64(branding?.logo_url ?? null)

  // ── Header ────────────────────────────────────────────────
  let logoW = 0
  const logoH = 14
  const logoY = MARGIN - 4

  if (logo) {
    // Seitenverhältnis approximieren (max 40mm breit)
    logoW = 36
    doc.addImage(logo.data, logo.format, MARGIN, logoY, logoW, logoH)
  }

  // Firmeninfo rechts
  const colRight = PAGE_W - MARGIN
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...GRAY_900)
  doc.text(firmenname, colRight, MARGIN, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY_600)

  const firmLines: string[] = []
  if (branding?.adresse) firmLines.push(branding.adresse)
  const kontakt: string[] = []
  if (branding?.telefon) kontakt.push(`Tel: ${branding.telefon}`)
  if (branding?.email)   kontakt.push(branding.email)
  if (branding?.website) kontakt.push(branding.website)
  if (kontakt.length) firmLines.push(kontakt.join('  ·  '))
  if (org?.ust_id)       firmLines.push(`USt-IdNr. ${org.ust_id}`)

  firmLines.forEach((line, i) => {
    doc.text(line, colRight, MARGIN + 5 + i * 4.2, { align: 'right' })
  })

  // Trennlinie wellbeing-green
  const lineY = Math.max(logoY + logoH, MARGIN + 5 + firmLines.length * 4.2) + 3
  doc.setFillColor(...WB_GREEN)
  doc.rect(MARGIN, lineY, PAGE_W - MARGIN * 2, 0.6, 'F')

  // ── Titel: ANGEBOT ────────────────────────────────────────
  let y = lineY + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...WB_GREEN)
  doc.text('ANGEBOT', MARGIN, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY_400)
  doc.text(`Angebotsnummer: ${angebot.nummer}`, MARGIN, y + 6)
  y += 16

  // ── Zwei-Spalten-Block: Kunde | Datum ─────────────────────
  const col2 = PAGE_W / 2 + 5

  // Kunde (links)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_400)
  doc.text('AN', MARGIN, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...GRAY_900)
  const kundeName = kunde?.name ?? '–'
  doc.text(kundeName, MARGIN, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY_600)
  let kyOff = y + 10
  if ((kunde as { ansprechpartner?: string | null })?.ansprechpartner) {
    doc.text((kunde as { ansprechpartner: string }).ansprechpartner, MARGIN, kyOff)
    kyOff += 4.5
  }
  if (kunde?.adresse) {
    const adrLines = kunde.adresse.split('\n')
    adrLines.forEach((l: string) => {
      if (l.trim()) { doc.text(l.trim(), MARGIN, kyOff); kyOff += 4.5 }
    })
  }
  if (kunde?.email) { doc.text(kunde.email, MARGIN, kyOff); kyOff += 4.5 }

  // Datum (rechts)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_400)
  doc.text('DATUM', col2, y)

  const datumsZeilen: [string, string][] = [
    ['Datum:', pdfHeute()],
    ['Gültig bis:', pdfDatum(angebot.gueltig_bis)],
  ]
  let dyOff = y + 5
  datumsZeilen.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRAY_600)
    doc.text(label, col2, dyOff)
    doc.setFont('helvetica', 'normal')
    doc.text(val, col2 + 28, dyOff)
    dyOff += 5
  })

  y = Math.max(kyOff, dyOff) + 8

  // ── Einleitung ────────────────────────────────────────────
  if (angebot.einleitung) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY_600)
    const lines = doc.splitTextToSize(angebot.einleitung, PAGE_W - MARGIN * 2) as string[]
    doc.text(lines, MARGIN, y)
    y += lines.length * 4.5 + 6
  }

  // ── Positionen-Tabelle ────────────────────────────────────
  const positionen: AngebotPosition[] = (angebot.positionen ?? []) as AngebotPosition[]

  const tableRows = positionen.map((p, i) => [
    String(i + 1),
    p.beschreibung ? `${p.name}\n${p.beschreibung}` : p.name,
    `${p.menge} ${p.einheit}`,
    pdfEur(p.einzelpreis),
    pdfEur(p.gesamtpreis),
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Pos.', 'Bezeichnung', 'Menge', 'Einzelpreis', 'Gesamtpreis']],
    body: tableRows,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 3,
      overflow: 'linebreak',
      textColor: GRAY_900,
    },
    headStyles: {
      fillColor: WB_GREEN,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 10,  halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25,  halign: 'center' },
      3: { cellWidth: 32,  halign: 'right' },
      4: { cellWidth: 32,  halign: 'right', fontStyle: 'bold' },
    },
  })

  // ── Summen-Block ──────────────────────────────────────────
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  y = finalY

  const summenLines: { label: string; wert: string; bold?: boolean; gross?: boolean }[] = []

  const netto = angebot.netto_summe ?? 0
  summenLines.push({ label: 'Nettobetrag:', wert: pdfEur(netto) })

  if (angebot.rabatt_prozent && angebot.rabatt_betrag) {
    summenLines.push({
      label: `Rabatt (${angebot.rabatt_prozent}%):`,
      wert: `– ${pdfEur(angebot.rabatt_betrag)}`,
    })
    const nettoNachRabatt = netto - (angebot.rabatt_betrag ?? 0)
    summenLines.push({ label: 'Netto nach Rabatt:', wert: pdfEur(nettoNachRabatt), bold: true })
  }

  summenLines.push({
    label: `MwSt. (${angebot.mwst_satz}%):`,
    wert: pdfEur(angebot.mwst_betrag ?? 0),
  })

  summenLines.push({
    label: 'Gesamtbetrag (brutto):',
    wert: pdfEur(angebot.brutto_summe ?? 0),
    bold: true,
    gross: true,
  })

  const sumW  = 80
  const sumX  = PAGE_W - MARGIN - sumW
  const lineH = 5.5

  summenLines.forEach((s) => {
    if (s.gross) {
      // Trennlinie vor Brutto
      doc.setDrawColor(...GRAY_100)
      doc.setLineWidth(0.3)
      doc.line(sumX, y - 1, PAGE_W - MARGIN, y - 1)
    }
    doc.setFont('helvetica', s.bold ? 'bold' : 'normal')
    doc.setFontSize(s.gross ? 9.5 : 8.5)
    const textClr = s.gross ? WB_GREEN : GRAY_600
    doc.setTextColor(...textClr)
    doc.text(s.label, sumX, y)
    doc.text(s.wert, PAGE_W - MARGIN, y, { align: 'right' })
    y += lineH
  })

  y += 8

  // ── Anmerkungen ───────────────────────────────────────────
  if (angebot.anmerkungen) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRAY_900)
    doc.text('Anmerkungen', MARGIN, y)
    y += 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY_600)
    const aLines = doc.splitTextToSize(angebot.anmerkungen, PAGE_W - MARGIN * 2) as string[]
    doc.text(aLines, MARGIN, y)
    y += aLines.length * 4 + 8
  }

  // ── AGB ───────────────────────────────────────────────────
  if (angebot.agb_text) {
    // Neue Seite wenn nicht mehr genug Platz
    if (y > PAGE_H - 40) { doc.addPage(); y = MARGIN + 5 }

    doc.setDrawColor(...GRAY_100)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
    y += 5

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY_400)
    doc.text('ALLGEMEINE GESCHÄFTSBEDINGUNGEN', MARGIN, y)
    y += 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY_400)
    const agbLines = doc.splitTextToSize(angebot.agb_text, PAGE_W - MARGIN * 2) as string[]
    // Max 60 Zeilen AGB anzeigen
    const visibleAgb = agbLines.slice(0, 60)
    doc.text(visibleAgb, MARGIN, y)
  }

  // ── Footer: Legal + Seitenzahl ────────────────────────────
  // Auf jeder Seite unten: 1-3 Legal-Zeilen (sehr klein, GRAY_400),
  // darunter die Seitenzahl.
  const legalZeilen = pdfLegalFooterZeilen(org ?? null, { includeBank: true })
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY_400)

    // Legal-Zeilen (von oben nach unten, direkt über der Seitenzahl)
    const legalStartY = PAGE_H - 14 - (legalZeilen.length - 1) * 3
    legalZeilen.forEach((zeile, idx) => {
      doc.text(zeile, PAGE_W / 2, legalStartY + idx * 3, { align: 'center' })
    })

    // Seitenzahl
    doc.setFontSize(7)
    doc.text(
      `${firmenname}  ·  Seite ${i} / ${pageCount}`,
      PAGE_W / 2,
      PAGE_H - 8,
      { align: 'center' }
    )
  }

  // ── Als Response zurückgeben ──────────────────────────────
  const pdfBytes = doc.output('arraybuffer')
  const safeName = (angebot.titel ?? 'Angebot').replace(/[^\w\s\-]/g, '_')
  const filename  = `Angebot_${angebot.nummer}_${safeName}.pdf`

  return new Response(pdfBytes, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
