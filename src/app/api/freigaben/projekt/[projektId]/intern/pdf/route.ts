import { NextRequest, NextResponse } from 'next/server'
import type { RowInput, CellHookData } from 'jspdf-autotable'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { getMwstSatz } from '@/app/actions/einstellungen'
import { effektiverVpNetto, einkaufNettoNachRabatt } from '@/lib/preise'
import {
  pdfEur, pdfHeute,
  logoAlsBase64,
  pdfLegalFooterZeilen,
  WB_GREEN, GRAY_900, GRAY_600, GRAY_400, GRAY_100, WHITE,
  MARGIN, PAGE_W, PAGE_H,
} from '@/lib/pdf-helpers'

type Params = { params: Promise<{ projektId: string }> }

const r2 = (n: number) => Math.round(n * 100) / 100

type RpRow = {
  menge: number
  verkaufspreis_override: number | null
  rabatt_prozent: number | null
  reihenfolge: number
  produkte: {
    id: string
    name: string
    artikelnummer: string | null
    einheit: string | null
    verkaufspreis: number | null
    einkaufspreis: number | null
    einkaufsrabatt_prozent: number | null
    deleted_at: string | null
    partner: { id: string; name: string } | null
  } | null
  raeume: { name: string | null; projekt_id: string } | null
}

/**
 * INTERNE Freigabe-Kostenübersicht eines Projekts als PDF — alle aktuell
 * freigegebenen Produkte, gruppiert nach Partner, mit EK netto + VK brutto +
 * Marge. NUR intern (auth + org-scoped) — enthält Einkaufs-/Margenangaben.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { projektId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrganisationId()

  const [{ data: projekt }, { data: branding }, { data: org }, mwst] = await Promise.all([
    supabase
      .from('projekte')
      .select('id, name, kunden(name)')
      .eq('id', projektId)
      .eq('organisation_id', orgId)
      .single(),
    supabase.from('branding').select('*').maybeSingle(),
    supabase.from('organisationen').select(
      'name, rechtsform, handelsregister_nr, registergericht, geschaeftsfuehrer, ust_id, steuernummer, bank_name, bank_iban, bank_bic',
    ).eq('id', orgId).maybeSingle(),
    getMwstSatz(),
  ])
  if (!projekt) return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })

  const { data: rpData } = await supabase
    .from('raum_produkte')
    .select(
      'menge, verkaufspreis_override, rabatt_prozent, reihenfolge, ' +
      'produkte!inner(id, name, artikelnummer, einheit, verkaufspreis, einkaufspreis, einkaufsrabatt_prozent, deleted_at, partner(id, name)), ' +
      'raeume!inner(name, projekt_id)',
    )
    .eq('organisation_id', orgId)
    .eq('freigabe_status', 'freigegeben')
    .eq('raeume.projekt_id', projektId)

  // Soft-gelöschte Bibliotheksprodukte raus (produkte.deleted_at; raum_produkte
  // hat KEIN deleted_at). Dann nach Partner gruppieren.
  const rows = ((rpData ?? []) as unknown as RpRow[])
    .filter((r) => r.produkte && r.produkte.deleted_at == null)

  type Position = {
    name: string
    artikelnummer: string | null
    einheit: string
    raumName: string | null
    menge: number
    reihenfolge: number
    ekGesamt: number
    vkBruttoGesamt: number
    margeGesamt: number
  }
  type Gruppe = { partnerName: string; ohnePartner: boolean; positionen: Position[]; ekΣ: number; vkBruttoΣ: number; margeΣ: number }

  const gruppen = new Map<string, Gruppe>()
  let gesamtEk = 0, gesamtVkBrutto = 0, gesamtMarge = 0, gesamtPositionen = 0

  for (const r of rows) {
    const p = r.produkte!
    const menge = Number(r.menge) || 0
    const vpNetto   = effektiverVpNetto({ verkaufspreis_override: r.verkaufspreis_override, rabatt_prozent: r.rabatt_prozent }, p.verkaufspreis)
    const vpBrutto  = r2(vpNetto * (1 + mwst))
    const ekNetto   = einkaufNettoNachRabatt(p.einkaufspreis, p.einkaufsrabatt_prozent ?? null)
    const ekGesamt        = r2(ekNetto * menge)
    const vkBruttoGesamt  = r2(vpBrutto * menge)
    const margeGesamt     = r2((vpNetto - ekNetto) * menge)

    const key = p.partner?.id ?? '__ohne__'
    const partnerName = p.partner?.name ?? 'Ohne Partner'
    let g = gruppen.get(key)
    if (!g) { g = { partnerName, ohnePartner: !p.partner, positionen: [], ekΣ: 0, vkBruttoΣ: 0, margeΣ: 0 }; gruppen.set(key, g) }
    g.positionen.push({
      name: p.name,
      artikelnummer: p.artikelnummer,
      einheit: p.einheit ?? 'Stk',
      raumName: r.raeume?.name ?? null,
      menge,
      reihenfolge: r.reihenfolge ?? 0,
      ekGesamt, vkBruttoGesamt, margeGesamt,
    })
    g.ekΣ = r2(g.ekΣ + ekGesamt); g.vkBruttoΣ = r2(g.vkBruttoΣ + vkBruttoGesamt); g.margeΣ = r2(g.margeΣ + margeGesamt)
    gesamtEk = r2(gesamtEk + ekGesamt); gesamtVkBrutto = r2(gesamtVkBrutto + vkBruttoGesamt); gesamtMarge = r2(gesamtMarge + margeGesamt)
    gesamtPositionen++
  }

  // Partner alphabetisch, „Ohne Partner" ans Ende
  const gruppenSortiert = Array.from(gruppen.values()).sort((a, b) =>
    (a.ohnePartner ? 1 : 0) - (b.ohnePartner ? 1 : 0) || a.partnerName.localeCompare(b.partnerName, 'de'),
  )
  for (const g of gruppenSortiert) g.positionen.sort((a, b) => a.reihenfolge - b.reihenfolge || a.name.localeCompare(b.name, 'de'))

  // ── PDF aufbauen ──────────────────────────────────────────
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const firmenname = branding?.firmenname ?? 'Wellbeing Spaces'
  const logo = await logoAlsBase64(branding?.logo_url ?? null)

  // Header
  const logoH = 14
  const logoY = MARGIN - 4
  if (logo) doc.addImage(logo.data, logo.format, MARGIN, logoY, 36, logoH)
  const colRight = PAGE_W - MARGIN
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...GRAY_900)
  doc.text(firmenname, colRight, MARGIN, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY_600)
  const firmLines: string[] = []
  if (branding?.adresse) firmLines.push(branding.adresse)
  const kontakt: string[] = []
  if (branding?.telefon) kontakt.push(`Tel: ${branding.telefon}`)
  if (branding?.email)   kontakt.push(branding.email)
  if (branding?.website) kontakt.push(branding.website)
  if (kontakt.length) firmLines.push(kontakt.join('  ·  '))
  firmLines.forEach((line, i) => doc.text(line, colRight, MARGIN + 5 + i * 4.2, { align: 'right' }))

  const lineY = Math.max(logoY + logoH, MARGIN + 5 + firmLines.length * 4.2) + 3
  doc.setFillColor(...WB_GREEN)
  doc.rect(MARGIN, lineY, PAGE_W - MARGIN * 2, 0.6, 'F')

  // Titel + Meta
  const kundeName = (projekt.kunden as unknown as { name: string } | null)?.name ?? null
  let y = lineY + 10
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...WB_GREEN)
  doc.text('FREIGABE – INTERNE ÜBERSICHT', MARGIN, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY_400)
  const meta = [`Projekt: ${projekt.name as string}`, kundeName ? `Kunde: ${kundeName}` : null, `Stand: ${pdfHeute()}`].filter(Boolean).join('   ·   ')
  doc.text(meta, MARGIN, y + 6)

  if (gesamtPositionen === 0) {
    doc.setFontSize(10); doc.setTextColor(...GRAY_400)
    doc.text('Noch keine freigegebenen Produkte in diesem Projekt.', MARGIN, y + 18)
  } else {
    doc.setFontSize(8.5); doc.setTextColor(...GRAY_400)
    doc.text(`Nur freigegebene Produkte · ${gesamtPositionen} Position${gesamtPositionen === 1 ? '' : 'en'} · ${gruppenSortiert.length} Partner`, MARGIN, y + 10.5)
    // Headline-Brutto prominent
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...WB_GREEN)
    doc.text(`Gesamtkosten (brutto): ${pdfEur(gesamtVkBrutto)}`, MARGIN, y + 17)
    y += 24

    // ── EINE Tabelle: Partner-Kopf → Positionen → Zwischensumme ──
    const body: RowInput[] = []
    let pos = 0
    for (const g of gruppenSortiert) {
      body.push([{
        content: `${g.partnerName}   (${g.positionen.length})`,
        colSpan: 6,
        styles: { fillColor: GRAY_100, textColor: WB_GREEN, fontStyle: 'bold', fontSize: 9, cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 } },
      }])
      for (const it of g.positionen) {
        pos++
        const ctx: string[] = []
        if (it.artikelnummer) ctx.push(`Art.-Nr. ${it.artikelnummer}`)
        if (it.raumName) ctx.push(it.raumName)
        const produkt = ctx.length ? `${it.name}\n${ctx.join('  ·  ')}` : it.name
        body.push([
          String(pos),
          produkt,
          `${it.menge} ${it.einheit}`,
          pdfEur(it.ekGesamt),
          pdfEur(it.vkBruttoGesamt),
          pdfEur(it.margeGesamt),
        ])
      }
      const sub = { fillColor: [245, 247, 245] as [number, number, number], fontStyle: 'bold' as const, textColor: GRAY_900 }
      body.push([
        { content: `Summe ${g.partnerName}`, colSpan: 3, styles: { ...sub, halign: 'right' } },
        { content: pdfEur(g.ekΣ),       styles: { ...sub, halign: 'right' } },
        { content: pdfEur(g.vkBruttoΣ), styles: { ...sub, halign: 'right' } },
        { content: pdfEur(g.margeΣ),    styles: { ...sub, halign: 'right' } },
      ])
    }

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Pos', 'Produkt', 'Menge', 'EK netto', 'VK brutto', 'Marge']],
      body,
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3, overflow: 'linebreak', textColor: GRAY_900, valign: 'middle', lineWidth: 0 },
      headStyles: { fillColor: WB_GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8, halign: 'left' },
      alternateRowStyles: { fillColor: [250, 251, 250] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', textColor: GRAY_400 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 27, halign: 'right', textColor: GRAY_600 },
        4: { cellWidth: 29, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
      },
      didParseCell: (data: CellHookData) => {
        // Spaltenköpfe EK/VK/Marge rechtsbündig
        if (data.section === 'head' && data.column.index >= 3) data.cell.styles.halign = 'right'
      },
    })

    // ── Grand-Total (rechts) ──────────────────────────────────
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7
    if (y > PAGE_H - 40) { doc.addPage(); y = MARGIN + 6 }
    const summen: { label: string; wert: string; gross?: boolean }[] = [
      { label: 'Einkauf (netto):',  wert: pdfEur(gesamtEk) },
      { label: 'Marge (netto):',    wert: pdfEur(gesamtMarge) },
      { label: 'Verkauf (brutto):', wert: pdfEur(gesamtVkBrutto), gross: true },
    ]
    const sumW = 85
    const sumX = PAGE_W - MARGIN - sumW
    for (const s of summen) {
      if (s.gross) {
        doc.setDrawColor(...GRAY_100); doc.setLineWidth(0.3)
        doc.line(sumX, y - 1, PAGE_W - MARGIN, y - 1)
      }
      doc.setFont('helvetica', s.gross ? 'bold' : 'normal')
      doc.setFontSize(s.gross ? 10 : 8.5)
      doc.setTextColor(...(s.gross ? WB_GREEN : GRAY_600))
      doc.text(s.label, sumX, y)
      doc.text(s.wert, PAGE_W - MARGIN, y, { align: 'right' })
      y += s.gross ? 6 : 5.5
    }

    // Intern-Hinweis
    y += 4
    if (y > PAGE_H - 24) { doc.addPage(); y = MARGIN + 6 }
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...GRAY_400)
    doc.text('Interne Übersicht – enthält Einkaufs- und Margenangaben. Nicht für den Kunden bestimmt.', MARGIN, y)
  }

  // Footer
  const legalZeilen = pdfLegalFooterZeilen(org ?? null, { includeBank: false })
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRAY_400)
    const legalStartY = PAGE_H - 14 - (legalZeilen.length - 1) * 3
    legalZeilen.forEach((zeile, idx) => doc.text(zeile, PAGE_W / 2, legalStartY + idx * 3, { align: 'center' }))
    doc.setFontSize(7)
    doc.text(`${firmenname}  ·  Seite ${i} / ${pageCount}`, PAGE_W / 2, PAGE_H - 8, { align: 'center' })
  }

  const pdfBytes = doc.output('arraybuffer')
  const safe = String(projekt.name ?? 'Projekt').replace(/[^\w\s\-]/g, '_')
  return new Response(pdfBytes, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="Freigabe_Intern_${safe}.pdf"`,
      'Cache-Control':       'no-store',
    },
  })
}
