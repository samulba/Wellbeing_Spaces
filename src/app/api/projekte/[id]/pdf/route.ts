import { NextRequest, NextResponse } from 'next/server'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import {
  pdfEur, pdfHeute,
  logoAlsBase64,
  pdfKopf, pdfFusszeilen, pdfFirmenname, pdfSummenBlock,
  TABLE_STYLES, TABLE_HEAD_STYLES, ALT_ROW, CREAM, PDF_ROT,
  WB_GREEN, GRAY_900, GRAY_600, GRAY_400, GRAY_100,
  MARGIN, PAGE_W, COL_W,
} from '@/lib/pdf-helpers'
import { effektiverVpNetto, bruttoVon, r2 } from '@/lib/preise'
import { getMwstSatz } from '@/app/actions/einstellungen'
import { getRaumBudgetDetails } from '@/app/actions/raeume'

type Params = { params: Promise<{ id: string }> }

type RaumProduktRow = {
  raum_id: string
  menge: number
  reihenfolge: number | null
  verkaufspreis_override: number | null
  rabatt_prozent: number | null
  produkte: {
    id: string
    name: string
    kategorie: string | null
    einheit: string
    verkaufspreis: number | null
    produkt_url: string | null
    deleted_at: string | null
    hinweis_extern: string | null
    hinweis_extern_sichtbar: boolean
  } | null
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrganisationId()

  // ── Auswahl-Parameter (Export-Dialog) — OHNE Parameter identisch zu vorher ──
  //   raeume=<id,id>            nur diese Räume (Teilmenge; unbekannte IDs ignoriert)
  //   preise=netto|brutto|keine Preismodus (fehlt/netto = bisheriges Netto-Layout;
  //                             brutto = Kundenpreise inkl. MwSt je Zeile;
  //                             keine = komplett ohne €-Angaben)
  //   inline=1                  Vorschau im Browser statt Download
  const sp = req.nextUrl.searchParams
  const preiseParam = sp.get('preise')
  const preise: 'netto' | 'brutto' | 'keine' =
    preiseParam === 'brutto' ? 'brutto' : preiseParam === 'keine' ? 'keine' : 'netto'
  const raeumeParamRoh = (sp.get('raeume') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const inline = sp.get('inline') === '1'

  const [{ data: projekt }, { data: branding }, { data: org }, mwstSatz] = await Promise.all([
    supabase
      .from('projekte')
      .select('*, kunden(name, email, adresse, ansprechpartner)')
      .eq('id', id).eq('organisation_id', orgId).single(),
    supabase.from('branding').select('*').maybeSingle(),
    supabase.from('organisationen').select(
      'name, rechtsform, handelsregister_nr, registergericht, geschaeftsfuehrer, ust_id, steuernummer, bank_name, bank_iban, bank_bic',
    ).eq('id', orgId).maybeSingle(),
    getMwstSatz(),
  ])

  if (!projekt) return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })

  const { data: raeumeAlle } = await supabase
    .from('raeume')
    .select('id, name, budget, reihenfolge')
    .eq('projekt_id', id)
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')

  // Räume-Filter: nur gültige (geladene) IDs zählen; leer/nur-unbekannt → alle.
  const bekannteIds = new Set((raeumeAlle ?? []).map((r) => r.id as string))
  const raeumeFilter = raeumeParamRoh.filter((rid) => bekannteIds.has(rid))
  const raeumeGefiltert = raeumeFilter.length > 0 && raeumeFilter.length < bekannteIds.size
  const raeume = raeumeGefiltert
    ? (raeumeAlle ?? []).filter((r) => raeumeFilter.includes(r.id as string))
    : (raeumeAlle ?? [])

  const raumIds = raeume.map((r) => r.id)
  const { data: rpsRaw } = raumIds.length > 0
    ? await supabase
        .from('raum_produkte')
        .select(`
          raum_id, menge, reihenfolge, verkaufspreis_override, rabatt_prozent,
          produkte(
            id, name, kategorie, einheit, verkaufspreis, produkt_url, deleted_at,
            hinweis_extern, hinweis_extern_sichtbar
          )
        `)
        .in('raum_id', raumIds)
        .order('reihenfolge')
    : { data: [] as RaumProduktRow[] }

  const rps = ((rpsRaw ?? []) as unknown as RaumProduktRow[]).filter(
    (rp) => rp.produkte && rp.produkte.deleted_at == null,
  )

  const budgetDetails = await getRaumBudgetDetails(id)
  const budgetByRaum = new Map(budgetDetails.map((d) => [d.raumId, d]))

  // Raum-Zusatzkosten (Mig 112) + Service-Raten (Mig 112)
  const [{ data: zkRaw }, { data: srRaw }] = await Promise.all([
    raumIds.length > 0
      ? supabase
          .from('raum_zusatzkosten')
          .select('raum_id, titel, kategorie, betrag_netto')
          .in('raum_id', raumIds)
      : Promise.resolve({ data: [] as Array<{ raum_id: string; titel: string; kategorie: string; betrag_netto: number }> }),
    supabase
      .from('service_raten')
      .select('betrag, faellig_am, status')
      .eq('projekt_id', id)
      .eq('organisation_id', orgId)
      .order('reihenfolge', { ascending: true })
      .order('faellig_am',  { ascending: true, nullsFirst: false }),
  ])

  const zusatzkosten = (zkRaw ?? []) as Array<{ raum_id: string; titel: string; kategorie: string; betrag_netto: number }>
  const serviceRaten = (srRaw ?? []) as Array<{ betrag: number; faellig_am: string | null; status: string }>

  const zkByRaum = new Map<string, Array<{ titel: string; kategorie: string; betrag_netto: number }>>()
  let zkSumNetto = 0
  for (const zk of zusatzkosten) {
    zkSumNetto += zk.betrag_netto
    const list = zkByRaum.get(zk.raum_id) ?? []
    list.push({ titel: zk.titel, kategorie: zk.kategorie, betrag_netto: zk.betrag_netto })
    zkByRaum.set(zk.raum_id, list)
  }

  // Service-Pauschale + Modell aus Projekt. Bei Räume-Teilauswahl wird die
  // PROJEKT-Pauschale bewusst NICHT eingerechnet (Teilmenge + volle Pauschale
  // wäre irreführend) — dito der Zahlungsplan.
  const servicePauschale = raeumeGefiltert ? 0 : ((projekt as { service_pauschale: number | null }).service_pauschale ?? 0)
  const serviceModell    = (projekt as { service_modell: string | null }).service_modell ?? null

  // Gesamtsummen
  const produkteGesamt = rps.length
  let sumNetto = 0
  for (const rp of rps) {
    const vp = effektiverVpNetto(
      { verkaufspreis_override: rp.verkaufspreis_override, rabatt_prozent: rp.rabatt_prozent },
      rp.produkte?.verkaufspreis ?? null,
    )
    sumNetto += vp * rp.menge
  }
  // sumBrutto = nur Produkte (ohne Zusatzkosten + Service). Wird in dieser
  // Version nicht direkt verwendet — siehe coverSummeBruttoEinfach + gesamtBrutto.

  // ── jsPDF laden ───────────────────────────────────────────
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const firmenname = pdfFirmenname(branding)
  const logo = await logoAlsBase64(branding?.logo_url ?? null)
  const kopf = () => pdfKopf(doc, { logo, branding, org: org ?? null })

  // ── COVER-PAGE ─────────────────────────────────────────────
  let y = kopf()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WB_GREEN)
  doc.text('PROJEKT', MARGIN, y)
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...GRAY_900)
  const projTitelLines = doc.splitTextToSize(projekt.name as string, COL_W) as string[]
  doc.text(projTitelLines, MARGIN, y + 8)
  y += 8 + projTitelLines.length * 9

  // Kunde + Datum als 2-Spalten
  const kunde = (projekt as { kunden?: { name?: string; email?: string; adresse?: string; ansprechpartner?: string | null } }).kunden
  const col2 = PAGE_W / 2 + 5
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_400)
  doc.text('KUNDE', MARGIN, y)
  doc.text('DATUM', col2, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...GRAY_900)
  doc.text(kunde?.name ?? '–', MARGIN, y + 5)
  doc.text(pdfHeute(), col2, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY_600)
  let ky = y + 10
  if (kunde?.ansprechpartner) { doc.text(kunde.ansprechpartner, MARGIN, ky); ky += 4.5 }
  if (kunde?.adresse) {
    kunde.adresse.split('\n').forEach((l: string) => {
      const tr = l.trim()
      if (tr) { doc.text(tr, MARGIN, ky); ky += 4.5 }
    })
  }
  if (kunde?.email) { doc.text(kunde.email, MARGIN, ky); ky += 4.5 }
  y = Math.max(ky, y + 15) + 10

  // Projekt-KPI-Box (Produkte · Räume · Summe) — Summe nur, wenn Preise gezeigt werden.
  // Cover-Summe brutto = Produkte + Zusatzkosten + Service (stimmt mit der Gesamt-Seite überein).
  const coverSummeBruttoEinfach = bruttoVon(sumNetto + zkSumNetto + (serviceModell === 'pauschale' ? servicePauschale : 0), mwstSatz)
  const boxes: [string, string][] = [
    ['Produkte', String(produkteGesamt)],
    ['Räume', String(raeume.length)],
    ...(preise !== 'keine' ? [['Summe brutto', pdfEur(coverSummeBruttoEinfach)] as [string, string]] : []),
  ]
  const boxW = (COL_W - (boxes.length - 1) * 5) / boxes.length
  const boxY = y
  const boxH = 22
  boxes.forEach(([label, wert], i) => {
    const x = MARGIN + i * (boxW + 5)
    doc.setFillColor(...CREAM)
    doc.setDrawColor(...GRAY_100)
    doc.roundedRect(x, boxY, boxW, boxH, 2, 2, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY_400)
    doc.text(label.toUpperCase(), x + 5, boxY + 7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...WB_GREEN)
    doc.text(wert, x + 5, boxY + 16)
  })
  y = boxY + boxH + 8

  // Netto-Summe kleiner (entfällt im Modus „ohne Preise")
  if (preise !== 'keine') {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRAY_600)
    doc.text(`Summe netto: ${pdfEur(sumNetto)}  ·  MwSt. ${Math.round(mwstSatz * 100)}%`, MARGIN, y)
    y += 5
  }

  // Aktive Auswahl sichtbar machen (Teilmenge der Räume)
  if (raeumeGefiltert) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRAY_600)
    const namen = raeume.map((r) => r.name as string).join(', ')
    const zeilen = doc.splitTextToSize(`Auswahl:  Räume: ${namen}`, COL_W) as string[]
    doc.text(zeilen, MARGIN, y)
  }

  // ── PRO RAUM eine Seite ───────────────────────────────────
  for (const raum of raeume) {
    doc.addPage()
    y = kopf()

    // Raum-Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...WB_GREEN)
    doc.text('RAUM', MARGIN, y)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...GRAY_900)
    doc.text(raum.name, MARGIN, y + 8)
    y += 14

    // Budget-Progress (falls Budget) — entfällt im Modus „ohne Preise" (€-Angaben)
    const bd = budgetByRaum.get(raum.id)
    if (preise !== 'keine' && bd && bd.budget != null && bd.budget > 0) {
      const barW = 70
      const barH = 3
      const pct = Math.min(1, bd.verbraucht / bd.budget)
      doc.setFillColor(...GRAY_100)
      doc.rect(MARGIN, y, barW, barH, 'F')
      const ueber = bd.verbraucht > bd.budget
      doc.setFillColor(...(ueber ? PDF_ROT : WB_GREEN))
      doc.rect(MARGIN, y, barW * pct, barH, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...GRAY_600)
      doc.text(
        `${pdfEur(bd.verbraucht)} von ${pdfEur(bd.budget)}  ·  ${Math.round(pct * 100)}%`,
        MARGIN + barW + 5,
        y + 2.5,
      )
      y += 8
    }

    const raumRps = rps
      .filter((rp) => rp.raum_id === raum.id)
      .sort((a, b) => (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0))

    if (raumRps.length === 0) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(...GRAY_400)
      doc.text('Noch keine Produkte in diesem Raum.', MARGIN, y + 6)
      continue
    }

    // Tabelle — Spalten je Preismodus:
    //   netto  (Standard) → Pos | Produkt | Menge | Basis | Rabatt | VP/Stk | Gesamt (wie bisher)
    //   brutto            → Pos | Produkt | Menge | Preis/Stk brutto | Gesamt brutto
    //   keine             → Pos | Produkt | Menge
    let raumNetto = 0
    const linkPositions: { page: number; x: number; y: number; w: number; h: number; url: string }[] = []

    const tableRows = raumRps.map((rp, i) => {
      const p = rp.produkte!
      const vp = effektiverVpNetto(
        { verkaufspreis_override: rp.verkaufspreis_override, rabatt_prozent: rp.rabatt_prozent },
        p.verkaufspreis,
      )
      const basis = rp.verkaufspreis_override ?? p.verkaufspreis ?? 0
      const gesamt = vp * rp.menge
      raumNetto += gesamt
      let nameCell = p.name
      if (p.kategorie) nameCell += `\n${p.kategorie}`
      if (p.hinweis_extern) nameCell += `\nHinweis: ${p.hinweis_extern}`
      const basisZellen = [String(i + 1), nameCell, `${rp.menge} ${p.einheit}`]
      if (preise === 'keine') return basisZellen
      if (preise === 'brutto') {
        const stkBrutto = bruttoVon(vp, mwstSatz)
        return [...basisZellen, pdfEur(stkBrutto), pdfEur(r2(stkBrutto * rp.menge))]
      }
      return [
        ...basisZellen,
        pdfEur(basis),
        rp.rabatt_prozent != null ? `−${rp.rabatt_prozent}%` : '–',
        pdfEur(vp),
        pdfEur(gesamt),
      ]
    })

    const kopfZeile =
      preise === 'keine'  ? ['Pos', 'Produkt', 'Menge'] :
      preise === 'brutto' ? ['Pos', 'Produkt', 'Menge', 'Preis/Stk brutto', 'Gesamt brutto'] :
                            ['Pos', 'Produkt', 'Menge', 'Basis', 'Rabatt', 'VP/Stk', 'Gesamt']
    const spaltenStile: Record<number, { cellWidth?: number | 'auto'; halign?: 'left' | 'center' | 'right'; fontStyle?: 'bold' }> = {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
    }
    if (preise === 'brutto') {
      spaltenStile[3] = { cellWidth: 32, halign: 'right' }
      spaltenStile[4] = { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
    } else if (preise === 'netto') {
      spaltenStile[3] = { cellWidth: 22, halign: 'right' }
      spaltenStile[4] = { cellWidth: 18, halign: 'right' }
      spaltenStile[5] = { cellWidth: 22, halign: 'right' }
      spaltenStile[6] = { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
    }

    autoTable(doc, {
      startY: y + 2,
      margin: { left: MARGIN, right: MARGIN },
      head: [kopfZeile],
      body: tableRows,
      styles: TABLE_STYLES,
      headStyles: TABLE_HEAD_STYLES,
      alternateRowStyles: { fillColor: ALT_ROW },
      columnStyles: spaltenStile,
      didParseCell: (data) => {
        // Preis-Spaltenköpfe rechtsbündig (wie die Werte darunter)
        if (data.section === 'head' && data.column.index >= 3) data.cell.styles.halign = 'right'
      },
      didDrawCell: (data) => {
        if (data.section !== 'body' || data.column.index !== 1) return
        const rowIdx = data.row.index
        const rp = raumRps[rowIdx]
        const url = rp?.produkte?.produkt_url
        if (!url) return
        // Klickbarer Link auf die gesamte Produkt-Zelle
        linkPositions.push({
          page: (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber,
          x: data.cell.x,
          y: data.cell.y,
          w: data.cell.width,
          h: data.cell.height,
          url,
        })
      },
    })

    // Links nachträglich via doc.link setzen (page-stable)
    const currentPage = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
    for (const lp of linkPositions) {
      doc.setPage(lp.page)
      doc.link(lp.x, lp.y, lp.w, lp.h, { url: lp.url })
    }
    doc.setPage(currentPage)

    // Raum-Zusatzkosten + Raum-Summe — entfallen komplett im Modus „ohne Preise"
    if (preise !== 'keine') {
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
      let raumY = finalY
      const raumZk = zkByRaum.get(raum.id) ?? []
      let raumZkNetto = 0
      if (raumZk.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...GRAY_600)
        doc.text('Zusatzkosten:', MARGIN, raumY + 4)
        raumY += 6
        doc.setFont('helvetica', 'normal')
        for (const zk of raumZk) {
          raumZkNetto += zk.betrag_netto
          const betrag = preise === 'brutto' ? bruttoVon(zk.betrag_netto, mwstSatz) : zk.betrag_netto
          doc.text(`• ${zk.titel} (${zk.kategorie})`, MARGIN + 4, raumY)
          doc.text(pdfEur(betrag), PAGE_W - MARGIN, raumY, { align: 'right' })
          raumY += 4
        }
      }

      // Raum-Summe (Produkte + Zusatzkosten) — im Brutto-Modus als Brutto-Summe
      const raumSummeNetto = raumNetto + raumZkNetto
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...WB_GREEN)
      const raumSummeText = preise === 'brutto'
        ? `Raum-Summe brutto: ${pdfEur(bruttoVon(raumSummeNetto, mwstSatz))}`
        : `Raum-Summe netto: ${pdfEur(raumSummeNetto)}`
      doc.text(raumSummeText, PAGE_W - MARGIN, raumY + 4, { align: 'right' })
    }
  }

  // ── GESAMT-SEITE (entfällt im Modus „ohne Preise") ────────
  if (preise !== 'keine') {
  doc.addPage()
  y = kopf()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...GRAY_900)
  doc.text('Gesamtsumme', MARGIN, y + 8)
  y += 18

  // Gesamtsummen-Berechnung inkl. Zusatzkosten + Service (Mig 112)
  const budgetVerbrauchtNetto  = sumNetto + zkSumNetto                           // Produkte + Zusatzkosten
  const serviceNetto           = serviceModell === 'pauschale' ? servicePauschale : 0
  const gesamtNetto            = budgetVerbrauchtNetto + serviceNetto
  const gesamtBrutto           = bruttoVon(gesamtNetto, mwstSatz)

  const summenLines: { label: string; wert: string; bold?: boolean; gross?: boolean }[] = [
    { label: 'Produkte netto:', wert: pdfEur(sumNetto) },
  ]
  if (zkSumNetto > 0) {
    summenLines.push({ label: 'Zusatzkosten netto:', wert: pdfEur(zkSumNetto) })
    summenLines.push({ label: 'Zwischensumme netto:', wert: pdfEur(budgetVerbrauchtNetto), bold: true })
  }
  if (serviceNetto > 0) {
    summenLines.push({ label: 'Service-Pauschale netto:', wert: pdfEur(serviceNetto) })
  }
  summenLines.push(
    { label: `MwSt. (${Math.round(mwstSatz * 100)}%):`, wert: pdfEur(r2(gesamtNetto * mwstSatz)) },
    { label: 'Gesamtbetrag brutto:', wert: pdfEur(gesamtBrutto), bold: true, gross: true },
  )

  y = pdfSummenBlock(doc, y, summenLines)

  // ── Service-Raten-Plan (nur ohne Räume-Teilauswahl — Projekt-Ebene) ──
  const aktiveRaten = raeumeGefiltert ? [] : serviceRaten.filter((r) => r.status !== 'storniert')
  if (aktiveRaten.length > 0) {
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...GRAY_900)
    doc.text('Zahlungsplan Service-Pauschale', MARGIN, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const bezahlt   = aktiveRaten.filter((r) => r.status === 'bezahlt').reduce((s, r) => s + r.betrag, 0)
    const geplant   = aktiveRaten.reduce((s, r) => s + r.betrag, 0)
    doc.setTextColor(...GRAY_600)
    doc.text(`${aktiveRaten.length} Raten · ${pdfEur(bezahlt)} von ${pdfEur(geplant)} bezahlt`, MARGIN, y)
    y += 6

    for (const r of aktiveRaten) {
      const fmtDate = r.faellig_am
        ? new Date(r.faellig_am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'ohne Faelligkeit'
      const statusLabel =
        r.status === 'bezahlt' ? 'bezahlt' :
        r.status === 'gestellt' ? 'Rechnung gestellt' :
        'offen'
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...GRAY_600)
      doc.text(`• ${fmtDate}  ·  ${statusLabel}`, MARGIN + 2, y)
      doc.text(pdfEur(r.betrag), PAGE_W - MARGIN, y, { align: 'right' })
      y += 4.5
    }
  }
  }

  // ── Footer: Legal (inkl. Rechtsträger) + Seitenzahlen ─────
  pdfFusszeilen(doc, { firmenname, org: org ?? null, includeBank: false })

  const pdfBytes = doc.output('arraybuffer')
  const safeName = (projekt.name as string).replace(/[^\w\s\-]/g, '_').slice(0, 40)
  const filename = `Projekt_${safeName}.pdf`

  return new Response(pdfBytes, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
