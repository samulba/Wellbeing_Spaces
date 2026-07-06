import { NextRequest, NextResponse } from 'next/server'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import {
  pdfEur, pdfDatum,
  logoAlsBase64,
  pdfKopf, pdfTitel, pdfFusszeilen, pdfFirmenname, pdfSummenBlock,
  TABLE_STYLES, TABLE_HEAD_STYLES, ALT_ROW,
  GRAY_900, GRAY_600, GRAY_400,
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
  const firmenname = pdfFirmenname(branding)
  const logo = await logoAlsBase64(branding?.logo_url ?? null)

  // ── Kopf + Titel (Design-System) ──────────────────────────
  let y = pdfKopf(doc, { logo, branding, org: org ?? null })
  y = pdfTitel(doc, y, { keyword: 'BESTELLUNG', meta: `Bestellnummer: ${best.bestellnummer ?? '—'}` })

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

  // ── Summen-Block (netto — Einkauf) ────────────────────────
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  const netto   = Number(best.gesamtpreis_netto) || 0
  const versand = Number(best.versandkosten) || 0
  const gesamt  = Math.round((netto + versand) * 100) / 100

  y = pdfSummenBlock(doc, y, [
    { label: 'Nettobetrag:', wert: pdfEur(netto) },
    ...(versand > 0 ? [{ label: 'Versandkosten:', wert: pdfEur(versand) }] : []),
    { label: 'Gesamt (netto):', wert: pdfEur(gesamt), bold: true, gross: true },
  ])
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

  // ── Footer: Legal (inkl. Rechtsträger) + Seitenzahl ───────
  pdfFusszeilen(doc, { firmenname, org: org ?? null, includeBank: true })

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
