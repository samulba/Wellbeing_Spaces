import { NextRequest, NextResponse } from 'next/server'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import {
  pdfEur, pdfDatum, pdfHeute,
  logoAlsBase64,
  pdfKopf, pdfTitel, pdfFusszeilen, pdfFirmenname, pdfSummenBlock,
  TABLE_STYLES, TABLE_HEAD_STYLES, ALT_ROW,
  GRAY_900, GRAY_600, GRAY_400, GRAY_100,
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
  const firmenname = pdfFirmenname(branding)
  const logo = await logoAlsBase64(branding?.logo_url ?? null)

  // ── Kopf + Titel (Design-System) ──────────────────────────
  let y = pdfKopf(doc, { logo, branding, org: org ?? null })
  y = pdfTitel(doc, y, { keyword: 'ANGEBOT', meta: `Angebotsnummer: ${angebot.nummer}` })

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
    head: [['Pos', 'Bezeichnung', 'Menge', 'Einzelpreis', 'Gesamtpreis']],
    body: tableRows,
    styles: TABLE_STYLES,
    headStyles: TABLE_HEAD_STYLES,
    alternateRowStyles: { fillColor: ALT_ROW },
    columnStyles: {
      0: { cellWidth: 12,  halign: 'center' },
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

  y = pdfSummenBlock(doc, y, summenLines)

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

  // ── Footer: Legal (inkl. Rechtsträger) + Seitenzahl ───────
  pdfFusszeilen(doc, { firmenname, org: org ?? null, includeBank: true })

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
