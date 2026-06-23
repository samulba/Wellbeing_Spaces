import { NextRequest, NextResponse } from 'next/server'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import {
  pdfEur, pdfDatum,
  logoAlsBase64,
  pdfLegalFooterZeilen,
  WB_GREEN, GRAY_900, GRAY_600, GRAY_400, GRAY_100, WHITE,
  MARGIN, PAGE_W, PAGE_H,
} from '@/lib/pdf-helpers'

type Params = { params: Promise<{ id: string }> }

type PosRow = {
  menge: number
  einzelpreis_netto: number
  notiz: string | null
  reihenfolge: number
  raum_produkte: {
    produkte: { name: string; artikelnummer: string | null; einheit: string | null } | null
    raeume: { name: string | null; projekte: { name: string | null } | null } | null
  } | null
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  // ── Auth prüfen ───────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrganisationId()

  // ── Daten laden (org-scoped) ──────────────────────────────
  const [
    { data: best },
    { data: branding },
    { data: org },
  ] = await Promise.all([
    supabase
      .from('lieferanten_bestellungen')
      .select(`
        *,
        partner(name, ansprechpartner, adresse, email, telefon, ust_id),
        lieferanten_bestellung_positionen(
          menge, einzelpreis_netto, notiz, reihenfolge,
          raum_produkte(produkte(name, artikelnummer, einheit), raeume(name, projekte(name)))
        )
      `)
      .eq('id', id)
      .eq('organisation_id', orgId)
      .single(),
    supabase.from('branding').select('*').maybeSingle(),
    supabase.from('organisationen').select(
      'name, rechtsform, handelsregister_nr, registergericht, geschaeftsfuehrer, ust_id, steuernummer, bank_name, bank_iban, bank_bic',
    ).eq('id', orgId).maybeSingle(),
  ])

  if (!best) return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 })

  const partner = best.partner as {
    name: string; ansprechpartner: string | null; adresse: string | null
    email: string | null; telefon: string | null; ust_id: string | null
  } | null

  const positionen = ((best.lieferanten_bestellung_positionen ?? []) as unknown as PosRow[])
    .slice()
    .sort((a, b) => (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0))

  // ── jsPDF laden ───────────────────────────────────────────
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const firmenname = branding?.firmenname ?? 'Wellbeing Spaces'
  const logo = await logoAlsBase64(branding?.logo_url ?? null)

  // ── Header (identisch zu Angebot/Vertrag) ─────────────────
  const logoH = 14
  const logoY = MARGIN - 4
  if (logo) doc.addImage(logo.data, logo.format, MARGIN, logoY, 36, logoH)

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
  firmLines.forEach((line, i) => doc.text(line, colRight, MARGIN + 5 + i * 4.2, { align: 'right' }))

  const lineY = Math.max(logoY + logoH, MARGIN + 5 + firmLines.length * 4.2) + 3
  doc.setFillColor(...WB_GREEN)
  doc.rect(MARGIN, lineY, PAGE_W - MARGIN * 2, 0.6, 'F')

  // ── Titel: BESTELLUNG ─────────────────────────────────────
  let y = lineY + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...WB_GREEN)
  doc.text('BESTELLUNG', MARGIN, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY_400)
  doc.text(`Bestellnummer: ${best.bestellnummer ?? '—'}`, MARGIN, y + 6)
  y += 16

  // ── 2-Spalten-Block: Lieferant | Datum ────────────────────
  const col2 = PAGE_W / 2 + 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_400)
  doc.text('LIEFERANT', MARGIN, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...GRAY_900)
  doc.text(partner?.name ?? '–', MARGIN, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY_600)
  let lyOff = y + 10
  if (partner?.ansprechpartner) { doc.text(partner.ansprechpartner, MARGIN, lyOff); lyOff += 4.5 }
  if (partner?.adresse) {
    partner.adresse.split('\n').forEach((l) => {
      if (l.trim()) { doc.text(l.trim(), MARGIN, lyOff); lyOff += 4.5 }
    })
  }
  if (partner?.email)  { doc.text(partner.email, MARGIN, lyOff); lyOff += 4.5 }
  if (partner?.ust_id) { doc.text(`USt-IdNr. ${partner.ust_id}`, MARGIN, lyOff); lyOff += 4.5 }

  // Datum (rechts)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_400)
  doc.text('DATUM', col2, y)

  const datumsZeilen: [string, string][] = [
    ['Bestelldatum:', pdfDatum((best.bestellt_am as string | null) ?? (best.created_at as string | null))],
    ['Liefertermin:', pdfDatum(best.liefertermin_geplant as string | null)],
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

  y = Math.max(lyOff, dyOff) + 6

  // Lieferadresse (unsere Firma — Sammelbestellungen können mehrere Projekte betreffen)
  if (branding?.adresse) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY_400)
    doc.text(`Lieferadresse: ${firmenname}, ${branding.adresse.replace(/\n/g, ', ')}`, MARGIN, y)
    y += 8
  }

  // ── Positions-Tabelle ─────────────────────────────────────
  const tableRows = positionen.map((p, i) => {
    const prod = p.raum_produkte?.produkte
    const ctxParts: string[] = []
    if (prod?.artikelnummer) ctxParts.push(`Art.-Nr. ${prod.artikelnummer}`)
    const r = p.raum_produkte?.raeume
    if (r) {
      const ort = [r.projekte?.name, r.name].filter(Boolean).join(' · ')
      if (ort) ctxParts.push(ort)
    }
    const name = prod?.name ?? '–'
    const ctx  = ctxParts.join('  ·  ')
    const gesamt = Math.round((Number(p.einzelpreis_netto) || 0) * (Number(p.menge) || 0) * 100) / 100
    return [
      String(i + 1),
      ctx ? `${name}\n${ctx}` : name,
      `${p.menge} ${prod?.einheit ?? 'Stk'}`,
      pdfEur(Number(p.einzelpreis_netto) || 0),
      pdfEur(gesamt),
    ]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Pos', 'Artikel', 'Menge', 'Einzelpreis', 'Gesamt']],
    body: tableRows,
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3, overflow: 'linebreak', textColor: GRAY_900 },
    headStyles: { fillColor: WB_GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8, halign: 'left' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 12,  halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25,  halign: 'center' },
      3: { cellWidth: 32,  halign: 'right' },
      4: { cellWidth: 32,  halign: 'right', fontStyle: 'bold' },
    },
  })

  // ── Summen-Block (netto — Einkauf) ────────────────────────
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  const netto   = Number(best.gesamtpreis_netto) || 0
  const versand = Number(best.versandkosten) || 0
  const gesamt  = Math.round((netto + versand) * 100) / 100

  const summenLines: { label: string; wert: string; gross?: boolean }[] = [
    { label: 'Nettobetrag:', wert: pdfEur(netto) },
  ]
  if (versand > 0) summenLines.push({ label: 'Versandkosten:', wert: pdfEur(versand) })
  summenLines.push({ label: 'Gesamt (netto):', wert: pdfEur(gesamt), gross: true })

  const sumW = 80
  const sumX = PAGE_W - MARGIN - sumW
  summenLines.forEach((s) => {
    if (s.gross) {
      doc.setDrawColor(...GRAY_100)
      doc.setLineWidth(0.3)
      doc.line(sumX, y - 1, PAGE_W - MARGIN, y - 1)
    }
    doc.setFont('helvetica', s.gross ? 'bold' : 'normal')
    doc.setFontSize(s.gross ? 9.5 : 8.5)
    doc.setTextColor(...(s.gross ? WB_GREEN : GRAY_600))
    doc.text(s.label, sumX, y)
    doc.text(s.wert, PAGE_W - MARGIN, y, { align: 'right' })
    y += 5.5
  })
  y += 8

  // ── Anmerkungen ───────────────────────────────────────────
  if (best.notizen) {
    if (y > PAGE_H - 40) { doc.addPage(); y = MARGIN + 5 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRAY_900)
    doc.text('Anmerkungen', MARGIN, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY_600)
    const aLines = doc.splitTextToSize(String(best.notizen), PAGE_W - MARGIN * 2) as string[]
    doc.text(aLines, MARGIN, y)
  }

  // ── Footer: Legal + Seitenzahl ────────────────────────────
  const legalZeilen = pdfLegalFooterZeilen(org ?? null, { includeBank: true })
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY_400)
    const legalStartY = PAGE_H - 14 - (legalZeilen.length - 1) * 3
    legalZeilen.forEach((zeile, idx) => doc.text(zeile, PAGE_W / 2, legalStartY + idx * 3, { align: 'center' }))
    doc.setFontSize(7)
    doc.text(`${firmenname}  ·  Seite ${i} / ${pageCount}`, PAGE_W / 2, PAGE_H - 8, { align: 'center' })
  }

  // ── Response ──────────────────────────────────────────────
  const pdfBytes = doc.output('arraybuffer')
  const filename = `Bestellung_${(best.bestellnummer ?? id).toString().replace(/[^\w\s\-]/g, '_')}.pdf`
  return new Response(pdfBytes, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
