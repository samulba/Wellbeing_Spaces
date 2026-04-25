/**
 * AI-Extraktor für Produktdaten — HTML (Haiku) + Bild (Sonnet Vision).
 *
 * Wird vom Scraper als Fallback aufgerufen, wenn die klassische Selektor-
 * basierte Extraktion zu wenig findet, und vom Screenshot-Endpoint, wenn der
 * User direkt ein Bild hochlädt. In beiden Fällen identische Tool-Schema-
 * Antwort, damit das Frontend nur einen Code-Pfad hat.
 */
import Anthropic from '@anthropic-ai/sdk'
import { load } from 'cheerio'

export type AiScrapeResult = Partial<{
  title:         string
  description:   string
  price:         number
  artikelnummer: string
  material:      string
  farbe:         string
  lieferzeit:    string
  breite_cm:     number
  tiefe_cm:      number
  hoehe_cm:      number
}>

// ── Tool-Schema (strukturierte Ausgabe via tool_choice) ─────────
const EXTRACT_TOOL = {
  name: 'extract_product_data',
  description:
    'Extrahiere strukturierte Produktdaten. Lasse Felder weg, wenn die Information nicht eindeutig im Inhalt vorhanden ist — leere Strings oder geratene Werte sind verboten.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title:         { type: 'string', description: 'Produktname / Bezeichnung.' },
      description:   { type: 'string', description: 'Sachliche Kurzbeschreibung, max. 500 Zeichen, ohne Marketing-Floskeln/Emojis.' },
      price:         { type: 'number', description: 'Brutto-Verkaufspreis in EUR als Zahl (kein Währungssymbol). Wenn nur Netto sichtbar ist: NICHT umrechnen, weglassen.' },
      artikelnummer: { type: 'string', description: 'SKU / Artikel-Nr. / MPN / GTIN.' },
      material:      { type: 'string', description: 'Hauptmaterial (z. B. „Eichenholz, Leinen").' },
      farbe:         { type: 'string', description: 'Farbe (z. B. „Salbeigrün").' },
      lieferzeit:    { type: 'string', description: 'Lieferzeit wie angegeben (z. B. „3–5 Werktage").' },
      breite_cm:     { type: 'number', description: 'Breite in cm. Aus mm/m/inch umrechnen.' },
      tiefe_cm:      { type: 'number', description: 'Tiefe in cm.' },
      hoehe_cm:      { type: 'number', description: 'Höhe in cm.' },
    },
  },
}

const SYSTEM_PROMPT =
  'Du bist ein Produktdaten-Extraktor für ein Interior-Design-Studio. ' +
  'Du erhältst entweder den Inhalt einer Produktseite oder einen Screenshot davon. ' +
  'Extrahiere strukturierte Produktdaten und rufe das Tool extract_product_data auf. ' +
  'Lasse Felder konsequent weg, wenn die Info nicht eindeutig vorhanden ist — keine Halluzinationen, keine Defaults, keine geratenen Werte. ' +
  'Sprache der Werte = Sprache der Quelle (deutsche Seite → deutsche Werte).'

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  return new Anthropic()
}

/** Hostname → kurzer Hinweis für den Kontext (manche Shops haben Domain-spezifische Quirks). */
function bereinigeHtmlZuText(html: string, hostname: string): string {
  const $ = load(html)
  // Rauschen weg
  $('script, style, noscript, iframe, svg, link, meta:not([property]):not([name])').remove()

  const meta = [
    `URL-Domain: ${hostname}`,
    `<title>: ${$('title').first().text().trim()}`,
    `og:title: ${$('meta[property="og:title"]').attr('content') ?? ''}`,
    `og:description: ${$('meta[property="og:description"]').attr('content') ?? ''}`,
    `meta description: ${$('meta[name="description"]').attr('content') ?? ''}`,
    `og:price: ${$('meta[property="og:price:amount"]').attr('content') ?? $('meta[property="product:price:amount"]').attr('content') ?? ''}`,
    `og:image: ${$('meta[property="og:image"]').attr('content') ?? ''}`,
  ].filter((l) => l.split(':').slice(1).join(':').trim().length > 0).join('\n')

  const text = $('body').text().replace(/\s+/g, ' ').trim()
  // 50 KB ist großzügig — Haiku 4.5 hat 200K Context, aber kürzer = günstiger
  const truncated = text.slice(0, 50_000)
  return `${meta}\n\n--- SEITENTEXT ---\n${truncated}`
}

function leseToolInput(content: Anthropic.Messages.ContentBlock[]): AiScrapeResult | null {
  const toolUse = content.find((b) => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') return null
  const raw = toolUse.input as AiScrapeResult
  // Werte mit leerem String / 0-Preis filtern
  const out: AiScrapeResult = {}
  if (raw.title?.trim())          out.title         = raw.title.trim()
  if (raw.description?.trim())    out.description   = raw.description.trim()
  if (typeof raw.price === 'number' && raw.price > 0) out.price = raw.price
  if (raw.artikelnummer?.trim())  out.artikelnummer = raw.artikelnummer.trim()
  if (raw.material?.trim())       out.material      = raw.material.trim()
  if (raw.farbe?.trim())          out.farbe         = raw.farbe.trim()
  if (raw.lieferzeit?.trim())     out.lieferzeit    = raw.lieferzeit.trim()
  if (typeof raw.breite_cm === 'number' && raw.breite_cm > 0) out.breite_cm = raw.breite_cm
  if (typeof raw.tiefe_cm  === 'number' && raw.tiefe_cm  > 0) out.tiefe_cm  = raw.tiefe_cm
  if (typeof raw.hoehe_cm  === 'number' && raw.hoehe_cm  > 0) out.hoehe_cm  = raw.hoehe_cm
  return out
}

export async function aiExtractFromHtml(html: string, hostname: string): Promise<AiScrapeResult | null> {
  const client = getClient()
  if (!client) return null

  const userText = bereinigeHtmlZuText(html, hostname)

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_product_data' },
      messages: [{ role: 'user', content: userText }],
    })
    return leseToolInput(response.content)
  } catch (err) {
    console.error('[aiExtractFromHtml]', err)
    return null
  }
}

export async function aiExtractFromImage(
  base64Data: string,
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
): Promise<AiScrapeResult | null> {
  const client = getClient()
  if (!client) return null

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_product_data' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text',  text: 'Extrahiere die Produktdaten aus diesem Screenshot.' },
          ],
        },
      ],
    })
    return leseToolInput(response.content)
  } catch (err) {
    console.error('[aiExtractFromImage]', err)
    return null
  }
}
