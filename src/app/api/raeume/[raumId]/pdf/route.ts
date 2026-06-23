import { NextRequest, NextResponse } from 'next/server'
import type { RowInput, CellHookData } from 'jspdf-autotable'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import {
  pdfHeute,
  logoAlsBase64,
  pdfLegalFooterZeilen,
  WB_GREEN, GRAY_900, GRAY_600, GRAY_400, GRAY_100, WHITE,
  MARGIN, PAGE_W, PAGE_H,
} from '@/lib/pdf-helpers'

type Params = { params: Promise<{ raumId: string }> }

type RpRow = {
  menge: number
  notizen: string | null
  reihenfolge: number
  bereich_id: string | null
  produkt_gruppe_id: string | null
  produkte: {
    id: string
    name: string
    artikelnummer: string | null
    kategorie: string | null
    deleted_at: string | null
    produkt_url: string | null
    partner: { name: string } | null
  } | null
}

/** Externe Produkt-URL absichern (Protokoll ergänzen) — für klickbare Links im PDF. */
function safeProduktUrl(u: string | null): string | null {
  if (!u) return null
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

/**
 * Produkt-Übersicht eines Raums als PDF — als „Proof" an den Lieferanten VOR der
 * Kundenfreigabe. Supplier-safe: KEINE Verkaufspreise, nur Produkte/Mengen/Gruppen.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { raumId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrganisationId()

  const [{ data: raum }, { data: branding }, { data: org }] = await Promise.all([
    supabase
      .from('raeume')
      .select('id, name, projekte(name, kunden(name))')
      .eq('id', raumId)
      .eq('organisation_id', orgId)
      .single(),
    supabase.from('branding').select('*').maybeSingle(),
    supabase.from('organisationen').select(
      'name, rechtsform, handelsregister_nr, registergericht, geschaeftsfuehrer, ust_id, steuernummer, bank_name, bank_iban, bank_bic',
    ).eq('id', orgId).maybeSingle(),
  ])
  if (!raum) return NextResponse.json({ error: 'Raum nicht gefunden' }, { status: 404 })

  const [{ data: rpData }, { data: bereiche }, { data: gruppen }] = await Promise.all([
    supabase
      .from('raum_produkte')
      .select('menge, notizen, reihenfolge, bereich_id, produkt_gruppe_id, produkte(id, name, artikelnummer, kategorie, deleted_at, produkt_url, partner(name))')
      .eq('raum_id', raumId)
      .eq('organisation_id', orgId),
    supabase.from('produkt_bereiche').select('id, name').eq('raum_id', raumId).eq('organisation_id', orgId),
    supabase.from('produkt_gruppen').select('id, name, bereich_id').eq('raum_id', raumId).eq('organisation_id', orgId),
  ])

  const bereichName = new Map<string, string>((bereiche ?? []).map((b) => [b.id as string, b.name as string]))
  const gruppe = new Map<string, { name: string; bereich_id: string | null }>(
    (gruppen ?? []).map((g) => [g.id as string, { name: g.name as string, bereich_id: (g.bereich_id as string | null) ?? null }]),
  )

  // Soft-gelöschte Produkte raus, nach (Gruppe, reihenfolge) sortieren
  const rows = ((rpData ?? []) as unknown as RpRow[])
    .filter((r) => r.produkte && r.produkte.deleted_at == null)
    .map((r) => {
      const block = r.produkt_gruppe_id ? gruppe.get(r.produkt_gruppe_id) : null
      const bId = block?.bereich_id ?? r.bereich_id ?? null
      const gruppenName = (bId && bereichName.get(bId)) || block?.name || '—'
      return { ...r, gruppenName }
    })
    .sort((a, b) => a.gruppenName.localeCompare(b.gruppenName, 'de') || a.reihenfolge - b.reihenfolge)

  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const firmenname = branding?.firmenname ?? 'Wellbeing Spaces'
  const logo = await logoAlsBase64(branding?.logo_url ?? null)

  // ── Header ────────────────────────────────────────────────
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

  // ── Titel ─────────────────────────────────────────────────
  const projektRaw = raum.projekte as unknown as { name: string; kunden: { name: string } | null } | null
  let y = lineY + 10
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...WB_GREEN)
  doc.text('PRODUKTÜBERSICHT', MARGIN, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRAY_900)
  doc.text(`Raum: ${raum.name as string}`, MARGIN, y + 7)
  doc.setFontSize(8.5); doc.setTextColor(...GRAY_400)
  const meta = [projektRaw?.name ? `Projekt: ${projektRaw.name}` : null, projektRaw?.kunden?.name ? `Kunde: ${projektRaw.kunden.name}` : null, `Stand: ${pdfHeute()}`].filter(Boolean).join('   ·   ')
  doc.text(meta, MARGIN, y + 12)
  y += 18

  // ── Tabelle (ohne Preise), nach Gruppen gegliedert ────────────
  // Gruppen erscheinen als Abschnitts-Kopfzeilen (statt einer wiederholten
  // „Gruppe"-Spalte) → übersichtlicher. Produktname ist klickbar (produkt_url).
  const body: RowInput[] = []
  const rowUrl: (string | null)[] = []   // parallel zu body — Link je Zeile (null = Gruppen-Kopf)
  let pos = 0
  let letzteGruppe: string | null = null
  for (const r of rows) {
    if (r.gruppenName !== letzteGruppe) {
      letzteGruppe = r.gruppenName
      body.push([{
        content: r.gruppenName === '—' ? 'Ohne Gruppe' : r.gruppenName,
        colSpan: 4,
        styles: {
          fillColor: GRAY_100, textColor: WB_GREEN, fontStyle: 'bold', fontSize: 8.5,
          cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 },
        },
      }])
      rowUrl.push(null)
    }
    pos++
    const p = r.produkte!
    const artikel = p.artikelnummer ? `${p.name}\nArt.-Nr. ${p.artikelnummer}` : p.name
    body.push([String(pos), artikel, p.partner?.name ?? (p.kategorie ?? '—'), `${r.menge}`])
    rowUrl.push(safeProduktUrl(p.produkt_url))
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Pos', 'Produkt', 'Hersteller', 'Menge']],
    body,
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3, overflow: 'linebreak', textColor: GRAY_900, valign: 'middle', lineWidth: 0 },
    headStyles: { fillColor: WB_GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8, halign: 'left', cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    alternateRowStyles: { fillColor: [250, 251, 250] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', textColor: GRAY_400 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 40, textColor: GRAY_600 },
      3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data: CellHookData) => {
      // Produktname grün einfärben, wenn ein klickbarer Link vorhanden ist.
      if (data.section === 'body' && data.column.index === 1 && rowUrl[data.row.index]) {
        data.cell.styles.textColor = WB_GREEN
      }
    },
    didDrawCell: (data: CellHookData) => {
      if (data.section === 'body' && data.column.index === 1) {
        const url = rowUrl[data.row.index]
        if (url) doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url })
      }
    },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY_400)
    doc.text('Keine Produkte in diesem Raum.', MARGIN, y)
  } else {
    const gesamtMenge = rows.reduce((s, r) => s + (Number(r.menge) || 0), 0)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY_600)
    doc.text(`${rows.length} Positionen · Gesamtmenge ${gesamtMenge}`, MARGIN, y)

    // ── Gesamtmenge je Produkt (im Raum mehrfach verwendet) ─────
    // Summiert dasselbe Produkt über alle Gruppen/Positionen — zeigt auf einen
    // Blick, wie viele Stück eines Artikels der Raum insgesamt braucht.
    const agg = new Map<string, { name: string; artikelnummer: string | null; url: string | null; menge: number; count: number; gruppen: Set<string> }>()
    for (const r of rows) {
      const p = r.produkte!
      const e = agg.get(p.id) ?? { name: p.name, artikelnummer: p.artikelnummer, url: safeProduktUrl(p.produkt_url), menge: 0, count: 0, gruppen: new Set<string>() }
      e.menge += Number(r.menge) || 0
      e.count += 1
      e.gruppen.add(r.gruppenName === '—' ? 'Ohne Gruppe' : r.gruppenName)
      agg.set(p.id, e)
    }
    const mehrfach = Array.from(agg.values())
      .filter((e) => e.count >= 2)
      .sort((a, b) => b.menge - a.menge || a.name.localeCompare(b.name, 'de'))

    if (mehrfach.length > 0) {
      y += 11
      if (y > PAGE_H - 50) { doc.addPage(); y = MARGIN }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...WB_GREEN)
      doc.text('Gesamtmenge je Produkt', MARGIN, y)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY_400)
      doc.text('im Raum mehrfach verwendet', MARGIN, y + 4.5)
      y += 9

      const sumBody: RowInput[] = []
      const sumUrl: (string | null)[] = []
      for (const e of mehrfach) {
        sumBody.push([e.name, e.artikelnummer ?? '—', Array.from(e.gruppen).join(', '), `${e.menge}`])
        sumUrl.push(e.url)
      }

      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Produkt', 'Art.-Nr.', 'Gruppen', 'Gesamt']],
        body: sumBody,
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3, overflow: 'linebreak', textColor: GRAY_900, valign: 'middle', lineWidth: 0 },
        headStyles: { fillColor: WB_GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8, halign: 'left' },
        alternateRowStyles: { fillColor: [250, 251, 250] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 28, textColor: GRAY_600 },
          2: { cellWidth: 46, textColor: GRAY_600 },
          3: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (data: CellHookData) => {
          if (data.section === 'body' && data.column.index === 0 && sumUrl[data.row.index]) {
            data.cell.styles.textColor = WB_GREEN
          }
        },
        didDrawCell: (data: CellHookData) => {
          if (data.section === 'body' && data.column.index === 0) {
            const url = sumUrl[data.row.index]
            if (url) doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url })
          }
        },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
    }
  }

  // ── Footer ────────────────────────────────────────────────
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
  const safe = String(raum.name ?? 'Raum').replace(/[^\w\s\-]/g, '_')
  return new Response(pdfBytes, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="Produktuebersicht_${safe}.pdf"`,
      'Cache-Control':       'no-store',
    },
  })
}
