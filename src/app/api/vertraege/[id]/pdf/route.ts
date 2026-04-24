import { NextRequest, NextResponse } from 'next/server'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import {
  pdfDatum, pdfHeute,
  logoAlsBase64,
  htmlZuBloecke,
  pdfLegalFooterZeilen,
  WB_GREEN, GRAY_900, GRAY_600, GRAY_400, GRAY_100,
  MARGIN, PAGE_W, PAGE_H,
} from '@/lib/pdf-helpers'

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
    { data: vertrag },
    { data: branding },
    { data: org },
  ] = await Promise.all([
    supabase.from('vertraege').select('*').eq('id', id).eq('organisation_id', orgId).single(),
    supabase.from('branding').select('*').maybeSingle(),
    supabase.from('organisationen').select(
      'name, rechtsform, handelsregister_nr, registergericht, geschaeftsfuehrer, ust_id, steuernummer, bank_name, bank_iban, bank_bic',
    ).eq('id', orgId).maybeSingle(),
  ])

  if (!vertrag) return NextResponse.json({ error: 'Vertrag nicht gefunden' }, { status: 404 })

  const { data: kunde } = await supabase
    .from('kunden')
    .select('name, email, adresse')
    .eq('id', vertrag.kunde_id)
    .single()

  // ── jsPDF laden ───────────────────────────────────────────
  const { default: jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const firmenname = branding?.firmenname ?? 'Wellbeing Spaces'
  const logo = await logoAlsBase64(branding?.logo_url ?? null)

  // ── Header ────────────────────────────────────────────────
  let logoW = 0
  const logoH = 14
  const logoY = MARGIN - 4

  if (logo) {
    logoW = 36
    doc.addImage(logo.data, logo.format, MARGIN, logoY, logoW, logoH)
  }

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

  const lineY = Math.max(logoY + logoH, MARGIN + 5 + firmLines.length * 4.2) + 3
  doc.setFillColor(...WB_GREEN)
  doc.rect(MARGIN, lineY, PAGE_W - MARGIN * 2, 0.6, 'F')

  // ── Titel-Block ───────────────────────────────────────────
  let y = lineY + 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY_400)
  doc.text('VERTRAG', MARGIN, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...GRAY_900)
  const titelLines = doc.splitTextToSize(vertrag.titel, PAGE_W - MARGIN * 2) as string[]
  doc.text(titelLines, MARGIN, y)
  y += titelLines.length * 8 + 3

  // Datum + Status
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_400)
  const metaZeilen: string[] = [`Datum: ${pdfHeute()}`]
  if (vertrag.gueltig_bis) metaZeilen.push(`Gültig bis: ${pdfDatum(vertrag.gueltig_bis)}`)
  doc.text(metaZeilen.join('   ·   '), MARGIN, y)
  y += 10

  // ── Vertragsinhalt ────────────────────────────────────────
  const bloecke = htmlZuBloecke(vertrag.inhalt_html)

  for (const block of bloecke) {
    // Seitenumbruch prüfen (mind. 20mm vor Footer frei lassen)
    if (y > PAGE_H - 35) {
      doc.addPage()
      y = MARGIN + 8
    }

    if (block.type === 'hr') {
      doc.setDrawColor(...GRAY_100)
      doc.setLineWidth(0.4)
      doc.line(MARGIN, y, PAGE_W - MARGIN, y)
      y += 5
      continue
    }

    if (block.type === 'h1') {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(...GRAY_900)
      const lines = doc.splitTextToSize(block.text, PAGE_W - MARGIN * 2) as string[]
      doc.text(lines, MARGIN, y)
      y += lines.length * 6 + 3
    } else if (block.type === 'h2') {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...WB_GREEN)
      const lines = doc.splitTextToSize(block.text, PAGE_W - MARGIN * 2) as string[]
      doc.text(lines, MARGIN, y)
      y += lines.length * 5.5 + 2
    } else if (block.type === 'h3') {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...GRAY_900)
      const lines = doc.splitTextToSize(block.text, PAGE_W - MARGIN * 2) as string[]
      doc.text(lines, MARGIN, y)
      y += lines.length * 5 + 2
    } else if (block.type === 'li') {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...GRAY_600)
      const bullet = '·  '
      const lines = doc.splitTextToSize(block.text, PAGE_W - MARGIN * 2 - 6) as string[]
      doc.text(bullet + lines[0], MARGIN + 2, y)
      lines.slice(1).forEach((line) => {
        y += 4.5
        doc.text('   ' + line, MARGIN + 2, y)
      })
      y += 5
    } else {
      // paragraph
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...GRAY_600)
      const lines = doc.splitTextToSize(block.text, PAGE_W - MARGIN * 2) as string[]
      doc.text(lines, MARGIN, y)
      y += lines.length * 4.5 + 3
    }
  }

  // ── Unterschriftsbereich ──────────────────────────────────
  const signH = 55  // Höhe des Unterschriftsblocks
  if (y + signH > PAGE_H - 20) {
    doc.addPage()
    y = MARGIN + 8
  } else {
    y += 12
  }

  // Trennlinie
  doc.setDrawColor(...GRAY_100)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 8

  const signColW = (PAGE_W - MARGIN * 2 - 10) / 2
  const colL = MARGIN
  const colR = MARGIN + signColW + 10

  // Überschriften
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_900)
  doc.text('AUFTRAGGEBER / KUNDE', colL, y)
  doc.text('AUFTRAGNEHMER', colR, y)
  y += 5

  // Namen
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY_600)
  doc.text(kunde?.name ?? '–', colL, y)
  doc.text(firmenname, colR, y)
  y += 14

  // Linie: Ort, Datum
  doc.setDrawColor(...GRAY_400)
  doc.setLineWidth(0.3)
  doc.line(colL, y, colL + signColW, y)
  doc.line(colR, y, colR + signColW, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY_400)
  doc.text('Ort, Datum', colL, y + 4)
  doc.text('Ort, Datum', colR, y + 4)
  y += 18

  // Linie: Unterschrift
  doc.setDrawColor(...GRAY_400)
  doc.line(colL, y, colL + signColW, y)
  doc.line(colR, y, colR + signColW, y)

  doc.text('Unterschrift', colL, y + 4)
  doc.text('Unterschrift', colR, y + 4)

  // ── Footer: Legal + Seitenzahl ────────────────────────────
  // Legal-Footer auf jeder Seite, ohne Bank-Daten (bei Verträgen
  // nicht relevant), darunter die Seitenzahl.
  const legalZeilen = pdfLegalFooterZeilen(org ?? null, { includeBank: false })
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY_400)

    const legalStartY = PAGE_H - 14 - (legalZeilen.length - 1) * 3
    legalZeilen.forEach((zeile, idx) => {
      doc.text(zeile, PAGE_W / 2, legalStartY + idx * 3, { align: 'center' })
    })

    doc.setFontSize(7)
    doc.text(
      `${firmenname}  ·  ${vertrag.titel}  ·  Seite ${i} / ${pageCount}`,
      PAGE_W / 2,
      PAGE_H - 8,
      { align: 'center' }
    )
  }

  // ── Als Response zurückgeben ──────────────────────────────
  const pdfBytes = doc.output('arraybuffer')
  const safeName  = vertrag.titel.replace(/[^\w\s\-]/g, '_')
  const filename   = `Vertrag_${safeName}.pdf`

  return new Response(pdfBytes, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
