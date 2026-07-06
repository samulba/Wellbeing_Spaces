/**
 * Shared PDF generation helpers + Design-System.
 * NO 'use server' — pure utility file used by API routes.
 *
 * Design-System (einheitlicher Look ALLER PDFs):
 *   pdfKopf()        — Logo links · Marke + Träger-Zeile + Adresse/Kontakt rechts · grüne Linie
 *   pdfTitel()       — 20pt-Keyword in Markengrün + Untertitel/Meta/Auswahl-Zeilen
 *   pdfFusszeilen()  — Rechts-Footer (inkl. Rechtsträger) + Seitenzahlen auf jeder Seite
 *   TABLE_STYLES / TABLE_HEAD_STYLES / ALT_ROW / STATUS_FARBEN / pdfGruppenKopfZeile /
 *   pdfSummenBlock   — einheitliche Tabellen & Summenblöcke
 */

import type { jsPDF } from 'jspdf'
import type { RowInput, Styles } from 'jspdf-autotable'

// ── Formatter ─────────────────────────────────────────────────

export const pdfEur = (n: number): string =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

export const pdfDatum = (iso: string | null): string => {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const pdfHeute = (): string => pdfDatum(new Date().toISOString())

// ── Farben ────────────────────────────────────────────────────

export const WB_GREEN: [number, number, number] = [68, 92, 73]      // #445c49
export const GRAY_900: [number, number, number] = [17, 24, 39]
export const GRAY_600: [number, number, number] = [75, 85, 99]
export const GRAY_400: [number, number, number] = [156, 163, 175]
export const GRAY_100: [number, number, number] = [243, 244, 246]
export const WHITE:    [number, number, number] = [255, 255, 255]

// ── Logo laden ────────────────────────────────────────────────

export async function logoAlsBase64(
  url: string | null
): Promise<{ data: string; format: 'PNG' | 'JPEG' } | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const buf  = await res.arrayBuffer()
    const mime = res.headers.get('content-type') ?? 'image/png'
    const fmt  = mime.includes('jpeg') || mime.includes('jpg') ? 'JPEG' : 'PNG'
    const b64  = Buffer.from(buf).toString('base64')
    return { data: `data:${mime};base64,${b64}`, format: fmt }
  } catch {
    return null
  }
}

// ── HTML → Strukturierter Text ────────────────────────────────

export type TextBlock =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p';  text: string }
  | { type: 'li'; text: string }
  | { type: 'hr' }

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,   '&')
    .replace(/&lt;/g,    '<')
    .replace(/&gt;/g,    '>')
    .replace(/&nbsp;/g,  ' ')
    .replace(/&auml;/g,  'ä')
    .replace(/&ouml;/g,  'ö')
    .replace(/&uuml;/g,  'ü')
    .replace(/&Auml;/g,  'Ä')
    .replace(/&Ouml;/g,  'Ö')
    .replace(/&Uuml;/g,  'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&quot;/g,  '"')
    .trim()
}

export function htmlZuBloecke(html: string): TextBlock[] {
  const blocks: TextBlock[] = []

  // Normalize newlines
  const normalized = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Process tag by tag using regex
  const tagPattern = /<(h1|h2|h3|p|li|ul|ol|hr|div)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi
  let match: RegExpExecArray | null

  // eslint-disable-next-line no-cond-assign
  while ((match = tagPattern.exec(normalized)) !== null) {
    const tag     = (match[1] ?? 'hr').toLowerCase()
    const inner   = match[2] ?? ''
    const text    = stripTags(inner).replace(/\s+/g, ' ').trim()

    if (tag === 'hr') {
      blocks.push({ type: 'hr' })
    } else if (tag === 'h1' && text) {
      blocks.push({ type: 'h1', text })
    } else if (tag === 'h2' && text) {
      blocks.push({ type: 'h2', text })
    } else if (tag === 'h3' && text) {
      blocks.push({ type: 'h3', text })
    } else if (tag === 'li' && text) {
      blocks.push({ type: 'li', text })
    } else if ((tag === 'p' || tag === 'div') && text) {
      // Multi-line paragraphs
      text.split('\n').forEach((line) => {
        const l = line.trim()
        if (l) blocks.push({ type: 'p', text: l })
      })
    }
  }

  // Fallback: if nothing matched, use plain text paragraphs
  if (blocks.length === 0) {
    const plain = stripTags(normalized)
    plain.split('\n').forEach((line) => {
      const l = line.trim()
      if (l) blocks.push({ type: 'p', text: l })
    })
  }

  return blocks
}

// ── Seitenbreite / Margins ────────────────────────────────────

export const PAGE_W  = 210   // A4 mm
export const PAGE_H  = 297   // A4 mm
export const MARGIN  = 15    // mm
export const COL_W   = PAGE_W - MARGIN * 2  // ~180 mm

// ── Legal-Footer (Impressum-Block) ────────────────────────────

export type OrgLegalData = {
  name:               string | null
  rechtsform:         string | null
  handelsregister_nr: string | null
  registergericht:    string | null
  geschaeftsfuehrer:  string | null
  ust_id:             string | null
  steuernummer:       string | null
  bank_name:          string | null
  bank_iban:          string | null
  bank_bic:           string | null
}

/**
 * Baut die Zeilen für den Legal-Footer (Impressum-Block + optional Bank).
 * Leere/null-Felder werden übersprungen. Gibt eine Liste von Zeilen
 * zurück, die die aufrufende Seite unten rendern kann.
 */
export function pdfLegalFooterZeilen(
  org: OrgLegalData | null,
  opts: { includeBank?: boolean } = {},
): string[] {
  if (!org) return []
  const zeilen: string[] = []

  // Zeile 1: Rechtsträger (offizieller Firmenname + Rechtsform) + Register.
  // org.name wurde bisher NIE gedruckt — genau deshalb war unklar, dass die
  // Marke (branding.firmenname) zum rechtlichen Träger gehört.
  const line1: string[] = []
  const traeger = [org.name, org.rechtsform].map((s) => s?.trim()).filter(Boolean).join(' ')
  if (traeger)                line1.push(traeger)
  if (org.handelsregister_nr) line1.push(org.handelsregister_nr)
  if (org.registergericht)    line1.push(org.registergericht)
  if (org.geschaeftsfuehrer)  line1.push(`GF: ${org.geschaeftsfuehrer}`)
  if (line1.length) zeilen.push(line1.join('  ·  '))

  // Zeile 2: Steuer
  const line2: string[] = []
  if (org.ust_id)       line2.push(`USt-IdNr. ${org.ust_id}`)
  if (org.steuernummer) line2.push(`Steuernr. ${org.steuernummer}`)
  if (line2.length) zeilen.push(line2.join('  ·  '))

  // Zeile 3: Bank (optional)
  if (opts.includeBank) {
    const line3: string[] = []
    if (org.bank_name) line3.push(`Bank: ${org.bank_name}`)
    if (org.bank_iban) line3.push(`IBAN: ${org.bank_iban}`)
    if (org.bank_bic)  line3.push(`BIC: ${org.bank_bic}`)
    if (line3.length) zeilen.push(line3.join('  ·  '))
  }

  return zeilen
}

// ═══════════════════════════════════════════════════════════════
// Design-System: Kopf · Titel · Fußzeilen · Tabellen-Theme
// ═══════════════════════════════════════════════════════════════

export type PdfBrandingDaten = {
  firmenname?: string | null
  adresse?: string | null
  telefon?: string | null
  email?: string | null
  website?: string | null
} | null

/** EINZIGE Heimat des Marken-Fallbacks (vorher 7× in den Routen hardcodiert). */
export function pdfFirmenname(branding: PdfBrandingDaten): string {
  return branding?.firmenname?.trim() || 'Wellbeing Spaces'
}

/**
 * Kleine Träger-Zeile unter der Marke: offizieller Firmenname (+ Rechtsform) aus
 * den Firmen-Stammdaten. null wenn leer, identisch zur Marke (case-/trim-insensitiv)
 * oder noch der Registrierungs-Platzhalter — dann wäre die Zeile nur Rauschen.
 */
export function pdfTraegerZeile(
  brand: string,
  org: { name: string | null; rechtsform: string | null } | null,
): string | null {
  const name = org?.name?.trim()
  if (!name) return null
  if (name.toLowerCase() === brand.trim().toLowerCase()) return null
  if (name === 'Meine Organisation') return null
  return [name, org?.rechtsform?.trim()].filter(Boolean).join(' ')
}

/**
 * Einheitlicher Briefkopf: Logo links (36×14 mm), rechts Marke (bold) mit
 * Träger-Zeile darunter, dann Adresse + Kontakt (Tel · E-Mail · Website),
 * abgeschlossen mit der grünen Linie. Gibt das Content-Start-Y zurück
 * (Titel-Baseline, kanonisch lineY + 10).
 * KEINE USt-IdNr im Kopf — sie steht einheitlich in der Rechts-Fußzeile.
 * Tolerant gegen branding/org/logo = null (fail-safe Degradation).
 */
export function pdfKopf(
  doc: jsPDF,
  opts: {
    logo: { data: string; format: 'PNG' | 'JPEG' } | null
    branding: PdfBrandingDaten
    org: { name: string | null; rechtsform: string | null } | null
  },
): number {
  const brand = pdfFirmenname(opts.branding)
  const logoH = 14
  const logoY = MARGIN - 4
  if (opts.logo) doc.addImage(opts.logo.data, opts.logo.format, MARGIN, logoY, 36, logoH)

  const colRight = PAGE_W - MARGIN
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...GRAY_900)
  doc.text(brand, colRight, MARGIN, { align: 'right' })

  let zeile = 0
  const zeileY = () => MARGIN + 5 + zeile * 4.2

  const traeger = pdfTraegerZeile(brand, opts.org)
  if (traeger) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRAY_400)
    doc.text(traeger, colRight, zeileY(), { align: 'right' })
    zeile++
  }

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY_600)
  if (opts.branding?.adresse) {
    doc.text(opts.branding.adresse, colRight, zeileY(), { align: 'right' })
    zeile++
  }
  const kontakt: string[] = []
  if (opts.branding?.telefon) kontakt.push(`Tel: ${opts.branding.telefon}`)
  if (opts.branding?.email)   kontakt.push(opts.branding.email)
  if (opts.branding?.website) kontakt.push(opts.branding.website)
  if (kontakt.length) {
    doc.text(kontakt.join('  ·  '), colRight, zeileY(), { align: 'right' })
    zeile++
  }

  const lineY = Math.max(logoY + logoH, MARGIN + 5 + zeile * 4.2) + 3
  doc.setFillColor(...WB_GREEN)
  doc.rect(MARGIN, lineY, PAGE_W - MARGIN * 2, 0.6, 'F')
  return lineY + 10
}

/**
 * Einheitlicher Titelblock: 20pt-Keyword in Markengrün ('ANGEBOT', 'BESTELLUNG', …),
 * optional Untertitel (10pt), Meta-Zeile (8.5pt grau) und Auswahl-Zeile (8.5pt,
 * etwas dunkler — zeigt aktive Export-Filter). Gibt das nächste Content-Y zurück.
 */
export function pdfTitel(
  doc: jsPDF,
  y: number,
  opts: { keyword: string; untertitel?: string | null; meta?: string | null; auswahl?: string | null },
): number {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...WB_GREEN)
  doc.text(opts.keyword, MARGIN, y)

  let offset = 7
  if (opts.untertitel) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRAY_900)
    doc.text(opts.untertitel, MARGIN, y + offset)
    offset += 5
  }
  if (opts.meta) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY_400)
    doc.text(opts.meta, MARGIN, y + offset)
    offset += 4.5
  }
  let extra = 0
  if (opts.auswahl) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY_600)
    doc.text(opts.auswahl, MARGIN, y + offset)
    extra = 4.5
  }
  return y + 18 + extra
}

/**
 * Einheitlicher Seitenfuß auf ALLEN Seiten: Rechts-Zeilen (Impressum inkl.
 * Rechtsträger, 6.5pt zentriert) + Seitenzeile `Marke [· zusatz] · Seite i / n`.
 * org = null → nur Seitenzahlen (saubere Degradation).
 */
export function pdfFusszeilen(
  doc: jsPDF,
  opts: { firmenname: string; org: OrgLegalData | null; includeBank?: boolean; zusatz?: string | null },
): void {
  const legalZeilen = pdfLegalFooterZeilen(opts.org, { includeBank: opts.includeBank })
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRAY_400)
    const legalStartY = PAGE_H - 14 - (legalZeilen.length - 1) * 3
    legalZeilen.forEach((zeile, idx) => doc.text(zeile, PAGE_W / 2, legalStartY + idx * 3, { align: 'center' }))
    doc.setFontSize(7)
    doc.text(
      `${opts.firmenname}${opts.zusatz ? `  ·  ${opts.zusatz}` : ''}  ·  Seite ${i} / ${pageCount}`,
      PAGE_W / 2, PAGE_H - 8, { align: 'center' },
    )
  }
}

// ── Tabellen-Theme ────────────────────────────────────────────

/** Zebra-Streifen (leicht grünstichig) — einheitlich für alle PDF-Tabellen. */
export const ALT_ROW: [number, number, number] = [250, 251, 250]
/** Creme-Ton der Marke (KPI-Boxen Projekt-Cover). */
export const CREAM: [number, number, number] = [246, 237, 226]
/** Warn-/Überbudget-Rot (Budget-Balken). */
export const PDF_ROT: [number, number, number] = [239, 68, 68]
/** Status-Farben (Freigabe-Dokumente) — vorher je Route hardcodiert. */
export const STATUS_FARBEN: Record<'freigegeben' | 'abgelehnt' | 'ueberarbeitung' | 'ausstehend', [number, number, number]> = {
  freigegeben:    [5, 150, 105],
  abgelehnt:      [220, 38, 38],
  ueberarbeitung: [217, 119, 6],
  ausstehend:     GRAY_400,
}

/** Einheitliche Body-Styles für autoTable (8.5pt, Padding 3, kein Rahmen). */
export const TABLE_STYLES: Partial<Styles> = {
  font: 'helvetica', fontSize: 8.5, cellPadding: 3, overflow: 'linebreak',
  textColor: GRAY_900, valign: 'middle', lineWidth: 0,
}
/** Einheitlicher Tabellenkopf (Markengrün, weiß, bold, 8pt). */
export const TABLE_HEAD_STYLES: Partial<Styles> = {
  fillColor: WB_GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8,
  halign: 'left', cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
}
/** Zwischensummen-Zeile (z. B. je Partner in der internen Übersicht). */
export const SUBTOTAL_STYLE: Partial<Styles> = {
  fillColor: [245, 247, 245], fontStyle: 'bold', textColor: GRAY_900,
}

/** Abschnitts-Kopfzeile innerhalb einer Tabelle (colSpan über alle Spalten). */
export function pdfGruppenKopfZeile(text: string, colSpan: number): RowInput {
  return [{
    content: text,
    colSpan,
    styles: {
      fillColor: GRAY_100, textColor: WB_GREEN, fontStyle: 'bold', fontSize: 8.5,
      cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 },
    },
  }]
}

export type PdfSummenZeile = { label: string; wert: string; bold?: boolean; gross?: boolean }

/**
 * Einheitlicher rechtsbündiger Summenblock (Metrik = Angebots-PDF, kanonisch):
 * 8.5pt-Zeilen, `gross` = 9.5pt in Markengrün mit Trennlinie darüber.
 * Gibt das nächste Content-Y zurück.
 */
export function pdfSummenBlock(
  doc: jsPDF,
  y: number,
  zeilen: PdfSummenZeile[],
  opts: { breite?: number } = {},
): number {
  const sumW = opts.breite ?? 85
  const sumX = PAGE_W - MARGIN - sumW
  const lineH = 5.5
  for (const s of zeilen) {
    if (s.gross) {
      doc.setDrawColor(...GRAY_100)
      doc.setLineWidth(0.3)
      doc.line(sumX, y - 1, PAGE_W - MARGIN, y - 1)
    }
    doc.setFont('helvetica', s.bold ? 'bold' : 'normal')
    doc.setFontSize(s.gross ? 9.5 : 8.5)
    doc.setTextColor(...(s.gross ? WB_GREEN : GRAY_600))
    doc.text(s.label, sumX, y)
    doc.text(s.wert, PAGE_W - MARGIN, y, { align: 'right' })
    y += lineH
  }
  return y
}
