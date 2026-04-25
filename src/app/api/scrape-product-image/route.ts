/**
 * Screenshot-basierter Produkt-Auto-Fill via Claude Sonnet Vision.
 *
 * Komplementär zum URL-Scraper: User lädt einen Screenshot der Produktseite
 * hoch (z. B. wenn die Seite hinter Cloudflare/Login steckt oder JavaScript-only
 * gerendert ist) und das Modell extrahiert die gleichen Felder wie der HTML-
 * Pfad.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiExtractFromImage } from '@/lib/ai-product-scraper'
import type { ScraperErgebnis } from '@/app/api/scrape-product/route'

const ERLAUBTE_TYPEN = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
type ErlaubterTyp = (typeof ERLAUBTE_TYPEN)[number]
const MAX_GROESSE = 5 * 1024 * 1024 // 5 MB

export async function POST(req: Request) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // API-Key prüfen
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      error: 'Screenshot-Analyse nicht konfiguriert. ANTHROPIC_API_KEY fehlt in den Server-Umgebungsvariablen.',
    }, { status: 503 })
  }

  // Bild aus FormData lesen
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Anfrage konnte nicht gelesen werden.' }, { status: 400 })
  }

  const file = formData.get('image')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Kein Bild übermittelt.' }, { status: 400 })
  }

  if (!ERLAUBTE_TYPEN.includes(file.type as ErlaubterTyp)) {
    return NextResponse.json({
      error: `Bildformat „${file.type || 'unbekannt'}" nicht unterstützt. Erlaubt: PNG, JPG, WebP, GIF.`,
    }, { status: 400 })
  }

  if (file.size > MAX_GROESSE) {
    return NextResponse.json({
      error: `Bild zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum 5 MB.`,
    }, { status: 413 })
  }

  // Datei → Base64
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  // Vision-Modell aufrufen
  const aiData = await aiExtractFromImage(base64, file.type as ErlaubterTyp)
  if (!aiData) {
    return NextResponse.json({
      error: 'Aus dem Screenshot konnten keine Produktdaten extrahiert werden. Versuche ein klareres Bild oder fülle manuell aus.',
    }, { status: 502 })
  }

  // Ergebnis im gleichen Format wie der URL-Scraper liefern
  const erg: ScraperErgebnis = {
    title:         aiData.title         ?? null,
    images:        [],                  // kein Image-Scrape vom Screenshot
    description:   aiData.description   ?? null,
    price:         aiData.price         ?? null,
    artikelnummer: aiData.artikelnummer ?? null,
    material:      aiData.material      ?? null,
    farbe:         aiData.farbe         ?? null,
    lieferzeit:    aiData.lieferzeit    ?? null,
    breite_cm:     aiData.breite_cm     ?? null,
    tiefe_cm:      aiData.tiefe_cm      ?? null,
    hoehe_cm:      aiData.hoehe_cm      ?? null,
    quelle_domain: null,
    partner_match: null,
    ai_used:       true,
  }
  return NextResponse.json(erg)
}
