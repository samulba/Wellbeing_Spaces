import { NextRequest, NextResponse } from 'next/server'
import type { RowInput, CellHookData } from 'jspdf-autotable'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { getMwstSatz } from '@/app/actions/einstellungen'
import { effektiverVpNetto, einkaufNettoNachRabatt } from '@/lib/preise'
import {
  pdfHeute,
  pdfEur,
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
  verkaufspreis_override: number | null
  rabatt_prozent: number | null
  produkte: {
    id: string
    name: string
    artikelnummer: string | null
    kategorie: string | null
    deleted_at: string | null
    produkt_url: string | null
    partner_id: string | null
    einkaufspreis: number | null
    einkaufsrabatt_prozent: number | null
    verkaufspreis: number | null
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
 * Kundenfreigabe. OHNE Parameter Lieferanten-sicher (keine Preise, alle Produkte);
 * per Auswahl-Parametern (siehe unten) filterbar nach Partner/Gruppen und optional
 * mit EK-netto- und/oder Brutto-Kundenpreis-Spalte (z. B. nur Paulmann mit EK netto
 * für die Lieferanten-Anfrage).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { raumId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrganisationId()

  // ── Auswahl-Parameter (Modal „PDF") — ohne Parameter identisch zu vorher ──
  //   partner=<id,id,ohne>  nur diese Partner ('ohne' = Produkte ohne Partner)
  //   gruppen=<id,id,ohne>  nur diese Gruppen/Bereiche ('ohne' = ohne Gruppe)
  //   ek=1                  Spalte „EK netto" (Einkaufspreis nach EK-Rabatt)
  //   vk=1                  Spalte „Preis brutto" (Kundenpreis inkl. MwSt)
  //   inline=1              Vorschau im Browser statt Download
  const sp = req.nextUrl.searchParams
  const parseFilter = (wert: string | null): Set<string> | null => {
    const teile = (wert ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    return teile.length > 0 ? new Set(teile) : null
  }
  const partnerFilter = parseFilter(sp.get('partner'))
  const gruppenFilter = parseFilter(sp.get('gruppen'))
  const zeigeEk = sp.get('ek') === '1'
  const zeigeVk = sp.get('vk') === '1'
  const inline  = sp.get('inline') === '1'

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
      .select('menge, notizen, reihenfolge, bereich_id, produkt_gruppe_id, verkaufspreis_override, rabatt_prozent, produkte(id, name, artikelnummer, kategorie, deleted_at, produkt_url, partner_id, einkaufspreis, einkaufsrabatt_prozent, verkaufspreis, partner(name))')
      .eq('raum_id', raumId)
      .eq('organisation_id', orgId),
    supabase.from('produkt_bereiche').select('id, name').eq('raum_id', raumId).eq('organisation_id', orgId),
    supabase.from('produkt_gruppen').select('id, name, bereich_id').eq('raum_id', raumId).eq('organisation_id', orgId),
  ])

  const bereichName = new Map<string, string>((bereiche ?? []).map((b) => [b.id as string, b.name as string]))
  const gruppe = new Map<string, { name: string; bereich_id: string | null }>(
    (gruppen ?? []).map((g) => [g.id as string, { name: g.name as string, bereich_id: (g.bereich_id as string | null) ?? null }]),
  )

  // Soft-gelöschte Produkte raus, Auswahl-Filter anwenden, nach (Gruppe, reihenfolge) sortieren
  const rows = ((rpData ?? []) as unknown as RpRow[])
    .filter((r) => r.produkte && r.produkte.deleted_at == null)
    .map((r) => {
      const block = r.produkt_gruppe_id ? gruppe.get(r.produkt_gruppe_id) : null
      const bId = block?.bereich_id ?? r.bereich_id ?? null
      const gruppenName = (bId && bereichName.get(bId)) || block?.name || '—'
      return { ...r, bId, gruppenName }
    })
    .filter((r) => !partnerFilter || partnerFilter.has(r.produkte!.partner_id ?? 'ohne'))
    .filter((r) => !gruppenFilter || gruppenFilter.has(r.bId ?? 'ohne'))
    .sort((a, b) => a.gruppenName.localeCompare(b.gruppenName, 'de') || a.reihenfolge - b.reihenfolge)

  // MwSt nur laden, wenn der Brutto-Kundenpreis gebraucht wird.
  const mwst = zeigeVk ? await getMwstSatz() : 0

  // Namen der gewählten Partner (für Meta-Zeile + Dateiname bei genau einem Partner).
  const partnerNamen = new Map<string, string>()
  if (partnerFilter) {
    const echteIds = Array.from(partnerFilter).filter((id) => id !== 'ohne')
    if (echteIds.length > 0) {
      const { data: pn } = await supabase.from('partner').select('id, name').in('id', echteIds)
      for (const p of (pn ?? []) as { id: string; name: string }[]) partnerNamen.set(p.id, p.name)
    }
  }

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
  // Aktive Auswahl sichtbar machen — der Empfänger sieht, dass es ein Ausschnitt ist.
  const auswahlTeile: string[] = []
  if (partnerFilter) {
    const namen = Array.from(partnerFilter).map((id) => (id === 'ohne' ? 'Ohne Partner' : (partnerNamen.get(id) ?? 'Partner'))).sort((a, b) => a.localeCompare(b, 'de'))
    auswahlTeile.push(`Partner: ${namen.join(', ')}`)
  }
  if (gruppenFilter) {
    const namen = Array.from(gruppenFilter).map((id) => (id === 'ohne' ? 'Ohne Gruppe' : (bereichName.get(id) ?? 'Gruppe'))).sort((a, b) => a.localeCompare(b, 'de'))
    auswahlTeile.push(`Gruppen: ${namen.join(', ')}`)
  }
  if (auswahlTeile.length > 0) {
    doc.setTextColor(...GRAY_600)
    doc.text(`Auswahl:  ${auswahlTeile.join('   ·   ')}`, MARGIN, y + 16.5)
    y += 4.5
  }
  y += 18

  // ── Tabelle, nach Gruppen gegliedert ─────────────────────────
  // Gruppen erscheinen als Abschnitts-Kopfzeilen (statt einer wiederholten
  // „Gruppe"-Spalte) → übersichtlicher. Produktname ist klickbar (produkt_url).
  // Preis-Spalten NUR auf Wunsch (ek/vk) — Standard bleibt Lieferanten-sicher ohne Preise.
  const head = ['Pos', 'Produkt', 'Hersteller', 'Menge']
  if (zeigeEk) head.push('EK netto')
  if (zeigeVk) head.push('Preis brutto')
  const spalten = head.length

  const body: RowInput[] = []
  const rowUrl: (string | null)[] = []   // parallel zu body — Link je Zeile (null = Gruppen-Kopf)
  let pos = 0
  let letzteGruppe: string | null = null
  let sumEk = 0
  let sumVk = 0
  for (const r of rows) {
    if (r.gruppenName !== letzteGruppe) {
      letzteGruppe = r.gruppenName
      body.push([{
        content: r.gruppenName === '—' ? 'Ohne Gruppe' : r.gruppenName,
        colSpan: spalten,
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
    const zeile: (string | { content: string })[] = [String(pos), artikel, p.partner?.name ?? (p.kategorie ?? '—'), `${r.menge}`]
    const menge = Number(r.menge) || 0
    if (zeigeEk) {
      const ek = einkaufNettoNachRabatt(p.einkaufspreis, p.einkaufsrabatt_prozent)
      sumEk += ek * menge
      zeile.push(ek > 0 ? pdfEur(ek) : '—')
    }
    if (zeigeVk) {
      const vpNetto = effektiverVpNetto(
        { verkaufspreis_override: r.verkaufspreis_override, rabatt_prozent: r.rabatt_prozent },
        p.verkaufspreis,
      )
      const brutto = Math.round(vpNetto * (1 + mwst) * 100) / 100
      sumVk += brutto * menge
      zeile.push(brutto > 0 ? pdfEur(brutto) : '—')
    }
    body.push(zeile)
    rowUrl.push(safeProduktUrl(p.produkt_url))
  }

  // Spaltenbreiten dynamisch — Preis-Spalten rechtsbündig, Hersteller rückt zusammen.
  const columnStyles: Record<number, { cellWidth?: number | 'auto'; halign?: 'left' | 'center' | 'right'; textColor?: [number, number, number]; fontStyle?: 'bold' }> = {
    0: { cellWidth: 12, halign: 'center', textColor: GRAY_400 },
    1: { cellWidth: 'auto' },
    2: { cellWidth: zeigeEk && zeigeVk ? 30 : 40, textColor: GRAY_600 },
    3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
  }
  let ci = 4
  if (zeigeEk) columnStyles[ci++] = { cellWidth: 24, halign: 'right' }
  if (zeigeVk) columnStyles[ci++] = { cellWidth: 26, halign: 'right' }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [head],
    body,
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3, overflow: 'linebreak', textColor: GRAY_900, valign: 'middle', lineWidth: 0 },
    headStyles: { fillColor: WB_GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8, halign: 'left', cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    alternateRowStyles: { fillColor: [250, 251, 250] },
    columnStyles,
    didParseCell: (data: CellHookData) => {
      // Produktname grün einfärben, wenn ein klickbarer Link vorhanden ist.
      if (data.section === 'body' && data.column.index === 1 && rowUrl[data.row.index]) {
        data.cell.styles.textColor = WB_GREEN
      }
      // Preis-Spaltenköpfe rechtsbündig (wie die Werte darunter).
      if (data.section === 'head' && data.column.index >= 4) {
        data.cell.styles.halign = 'right'
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
    doc.text(
      partnerFilter || gruppenFilter ? 'Keine Produkte in dieser Auswahl.' : 'Keine Produkte in diesem Raum.',
      MARGIN, y,
    )
  } else {
    const gesamtMenge = rows.reduce((s, r) => s + (Number(r.menge) || 0), 0)
    const summenTeile = [`${rows.length} Positionen`, `Gesamtmenge ${gesamtMenge}`]
    if (zeigeEk) summenTeile.push(`Summe EK netto: ${pdfEur(Math.round(sumEk * 100) / 100)}`)
    if (zeigeVk) summenTeile.push(`Summe brutto (Kunde): ${pdfEur(Math.round(sumVk * 100) / 100)}`)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY_600)
    doc.text(summenTeile.join('  ·  '), MARGIN, y)
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
  let safe = String(raum.name ?? 'Raum').replace(/[^\w\s\-]/g, '_')
  // Genau EIN Partner gewählt → Name in den Dateinamen („…_Terrasse_Paulmann.pdf").
  if (partnerFilter) {
    const echte = Array.from(partnerFilter).filter((id) => id !== 'ohne')
    if (echte.length === 1 && partnerFilter.size === 1) {
      const pName = partnerNamen.get(echte[0])
      if (pName) safe += `_${pName.replace(/[^\w\s\-]/g, '_')}`
    }
  }
  return new Response(pdfBytes, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="Produktuebersicht_${safe}.pdf"`,
      'Cache-Control':       'no-store',
    },
  })
}
