import { NextRequest, NextResponse } from 'next/server'
import type { RowInput, CellHookData } from 'jspdf-autotable'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { getMwstSatz } from '@/app/actions/einstellungen'
import { effektiverVpNetto, einkaufNettoNachRabatt, r2 } from '@/lib/preise'
import {
  pdfEur, pdfHeute,
  logoAlsBase64,
  pdfKopf, pdfTitel, pdfFusszeilen, pdfFirmenname, pdfSummenBlock, pdfGruppenKopfZeile,
  TABLE_STYLES, TABLE_HEAD_STYLES, ALT_ROW, STATUS_FARBEN, SUBTOTAL_STYLE,
  WB_GREEN, GRAY_600, GRAY_400,
  MARGIN, PAGE_H,
} from '@/lib/pdf-helpers'

type Params = { params: Promise<{ projektId: string }> }

const STATUS_LABEL: Record<string, string> = {
  freigegeben: 'Freigegeben', abgelehnt: 'Abgelehnt', ueberarbeitung: 'Überarbeitung', ausstehend: 'Ausstehend',
}
const statusLabel = (s: string | null) => STATUS_LABEL[s ?? 'ausstehend'] ?? 'Ausstehend'
const statusFarbe = (s: string | null): [number, number, number] =>
  STATUS_FARBEN[(s ?? 'ausstehend') as keyof typeof STATUS_FARBEN] ?? STATUS_FARBEN.ausstehend

type RpRow = {
  menge: number
  verkaufspreis_override: number | null
  rabatt_prozent: number | null
  reihenfolge: number
  freigabe_status: string | null
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
      'menge, verkaufspreis_override, rabatt_prozent, reihenfolge, freigabe_status, ' +
      'produkte!inner(id, name, artikelnummer, einheit, verkaufspreis, einkaufspreis, einkaufsrabatt_prozent, deleted_at, partner(id, name)), ' +
      'raeume!inner(name, projekt_id)',
    )
    .eq('organisation_id', orgId)
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
    status: string
    menge: number
    reihenfolge: number
    ekGesamt: number
    vkBruttoGesamt: number
    margeGesamt: number
  }
  type Gruppe = { partnerName: string; ohnePartner: boolean; positionen: Position[]; ekΣ: number; vkBruttoΣ: number; margeΣ: number }

  const gruppen = new Map<string, Gruppe>()
  // Summen zählen NUR freigegebene Positionen (= echter Bestellwert); die Liste
  // zeigt aber alle Produkte mit ihrem Status.
  let gesamtEk = 0, gesamtVkBrutto = 0, gesamtMarge = 0, gesamtPositionen = 0, freigegebenCount = 0

  for (const r of rows) {
    const p = r.produkte!
    const menge = Number(r.menge) || 0
    const status = r.freigabe_status ?? 'ausstehend'
    const istFrei = status === 'freigegeben'
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
      status,
      menge,
      reihenfolge: r.reihenfolge ?? 0,
      ekGesamt, vkBruttoGesamt, margeGesamt,
    })
    if (istFrei) {
      g.ekΣ = r2(g.ekΣ + ekGesamt); g.vkBruttoΣ = r2(g.vkBruttoΣ + vkBruttoGesamt); g.margeΣ = r2(g.margeΣ + margeGesamt)
      gesamtEk = r2(gesamtEk + ekGesamt); gesamtVkBrutto = r2(gesamtVkBrutto + vkBruttoGesamt); gesamtMarge = r2(gesamtMarge + margeGesamt)
      freigegebenCount++
    }
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
  const firmenname = pdfFirmenname(branding)
  const logo = await logoAlsBase64(branding?.logo_url ?? null)

  // ── Kopf + Titel (Design-System) ──────────────────────────
  const kundeName = (projekt.kunden as unknown as { name: string } | null)?.name ?? null
  const meta = [`Projekt: ${projekt.name as string}`, kundeName ? `Kunde: ${kundeName}` : null, `Stand: ${pdfHeute()}`].filter(Boolean).join('   ·   ')
  let y = pdfKopf(doc, { logo, branding, org: org ?? null })
  y = pdfTitel(doc, y, { keyword: 'FREIGABE – INTERNE ÜBERSICHT', meta })

  if (gesamtPositionen === 0) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRAY_400)
    doc.text('Noch keine Produkte in diesem Projekt.', MARGIN, y)
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY_400)
    doc.text(`${gesamtPositionen} Produkt${gesamtPositionen === 1 ? '' : 'e'} · ${gruppenSortiert.length} Partner · ${freigegebenCount} freigegeben`, MARGIN, y - 4)
    // Headline-Brutto prominent (nur freigegebene Positionen)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...WB_GREEN)
    doc.text(`Gesamtkosten freigegeben (brutto): ${pdfEur(gesamtVkBrutto)}`, MARGIN, y + 2.5)
    y += 9

    // ── EINE Tabelle: Partner-Kopf → Positionen → Zwischensumme ──
    const body: RowInput[] = []
    let pos = 0
    for (const g of gruppenSortiert) {
      body.push(pdfGruppenKopfZeile(`${g.partnerName}   (${g.positionen.length})`, 7))
      for (const it of g.positionen) {
        pos++
        const ctx: string[] = []
        if (it.artikelnummer) ctx.push(`Art.-Nr. ${it.artikelnummer}`)
        if (it.raumName) ctx.push(it.raumName)
        const produkt = ctx.length ? `${it.name}\n${ctx.join('  ·  ')}` : it.name
        body.push([
          String(pos),
          produkt,
          { content: statusLabel(it.status), styles: { textColor: statusFarbe(it.status), fontStyle: 'bold', halign: 'center' } },
          `${it.menge} ${it.einheit}`,
          pdfEur(it.ekGesamt),
          pdfEur(it.vkBruttoGesamt),
          pdfEur(it.margeGesamt),
        ])
      }
      const sub = SUBTOTAL_STYLE
      body.push([
        { content: `Summe ${g.partnerName} (freigegeben)`, colSpan: 4, styles: { ...sub, halign: 'right' } },
        { content: pdfEur(g.ekΣ),       styles: { ...sub, halign: 'right' } },
        { content: pdfEur(g.vkBruttoΣ), styles: { ...sub, halign: 'right' } },
        { content: pdfEur(g.margeΣ),    styles: { ...sub, halign: 'right' } },
      ])
    }

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Pos', 'Produkt', 'Status', 'Menge', 'EK netto', 'VK brutto', 'Marge']],
      body,
      styles: TABLE_STYLES,
      headStyles: TABLE_HEAD_STYLES,
      alternateRowStyles: { fillColor: ALT_ROW },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', textColor: GRAY_400 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 25, halign: 'right', textColor: GRAY_600 },
        5: { cellWidth: 27, halign: 'right' },
        6: { cellWidth: 23, halign: 'right' },
      },
      didParseCell: (data: CellHookData) => {
        // Kopf-Ausrichtung: Pos/Status/Menge zentriert, EK/VK/Marge rechtsbündig
        if (data.section === 'head') {
          if (data.column.index >= 4) data.cell.styles.halign = 'right'
          else if (data.column.index === 0 || data.column.index === 2 || data.column.index === 3) data.cell.styles.halign = 'center'
        }
      },
    })

    // ── Grand-Total (rechts) ──────────────────────────────────
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7
    if (y > PAGE_H - 40) { doc.addPage(); y = MARGIN + 6 }
    y = pdfSummenBlock(doc, y, [
      { label: 'Einkauf netto (freigegeben):',  wert: pdfEur(gesamtEk) },
      { label: 'Marge netto (freigegeben):',    wert: pdfEur(gesamtMarge) },
      { label: 'Verkauf brutto (freigegeben):', wert: pdfEur(gesamtVkBrutto), bold: true, gross: true },
    ])

    // Intern-Hinweis
    y += 4
    if (y > PAGE_H - 24) { doc.addPage(); y = MARGIN + 6 }
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...GRAY_400)
    doc.text('Interne Übersicht – enthält Einkaufs-/Margenangaben, nicht für den Kunden. Summen zählen nur freigegebene Positionen.', MARGIN, y)
  }

  // ── Footer: Legal (inkl. Rechtsträger) + Seitenzahl ───────
  pdfFusszeilen(doc, { firmenname, org: org ?? null, includeBank: false })

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
