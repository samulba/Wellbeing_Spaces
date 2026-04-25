import { NextResponse } from 'next/server'
import { load, type CheerioAPI } from 'cheerio'
import { createClient, getOrganisationIdOrNull } from '@/lib/supabase/server'
import { aiExtractFromHtml } from '@/lib/ai-product-scraper'

export type ScraperErgebnis = {
  title:         string | null
  images:        string[]            // mehrere Produktbilder, dedupliziert
  description:   string | null
  price:         number | null       // brutto
  artikelnummer: string | null
  material:      string | null
  farbe:         string | null
  lieferzeit:    string | null
  breite_cm:     number | null
  tiefe_cm:      number | null
  hoehe_cm:      number | null
  // Meta
  quelle_domain: string | null
  partner_match: { id: string; name: string } | null
  ai_used:       boolean             // true wenn Claude den Extraktor übernommen hat
}

// ── Hilfsfunktionen ──────────────────────────────────────────

function parseDimension(val: string | null | undefined): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(',', '.'))
  return isNaN(n) ? null : n
}

function parsePreis(val: string | null | undefined): number | null {
  if (!val) return null
  // Entferne alle Zeichen außer Ziffern, Punkt, Komma. Behandle "1.234,56" europäisch.
  const trimmed = val.replace(/[^\d.,]/g, '').trim()
  if (!trimmed) return null
  // Heuristik: wenn beide vorhanden, der spätere ist der Dezimaltrenner
  const lastDot   = trimmed.lastIndexOf('.')
  const lastComma = trimmed.lastIndexOf(',')
  let cleaned: string
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) cleaned = trimmed.replace(/\./g, '').replace(',', '.')
    else                     cleaned = trimmed.replace(/,/g, '')
  } else if (lastComma >= 0) {
    cleaned = trimmed.replace(',', '.')
  } else {
    cleaned = trimmed
  }
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

/** Macht relative URLs absolut + entfernt offensichtliche Tracking-/Spacer-/Icon-URLs. */
function normalisiereBildUrl(raw: string | undefined | null, basis: string): string | null {
  if (!raw) return null
  const r = raw.trim()
  if (!r || r.startsWith('data:')) return null
  // Tracking / 1x1 / Spacer
  if (/(1x1|spacer|pixel|tracking|blank)\.(gif|png|jpg)/i.test(r)) return null
  try {
    const abs = new URL(r, basis).toString()
    // Schema beschränken
    if (!abs.startsWith('http')) return null
    return abs
  } catch {
    return null
  }
}

/** Extrahiert Maße aus Strings wie "B 60 × T 40 × H 80 cm" oder "60 x 40 x 80 cm". */
function parseMasseAusText(text: string): { breite_cm: number | null; tiefe_cm: number | null; hoehe_cm: number | null } {
  const t = text.toLowerCase().replace(/\s+/g, ' ')
  // Pattern: 60 x 40 x 80 cm  oder  60×40×80
  const m = t.match(/(\d+[.,]?\d*)\s*[x×]\s*(\d+[.,]?\d*)\s*[x×]\s*(\d+[.,]?\d*)/)
  if (m) {
    return {
      breite_cm: parseDimension(m[1]),
      tiefe_cm:  parseDimension(m[2]),
      hoehe_cm:  parseDimension(m[3]),
    }
  }
  return { breite_cm: null, tiefe_cm: null, hoehe_cm: null }
}

// ── SSRF-Schutz ──────────────────────────────────────────────
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254']
const BLOCKED_PREFIXES = ['10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.']

function isSafeUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    const h = parsed.hostname
    if (BLOCKED_HOSTS.includes(h)) return false
    if (BLOCKED_PREFIXES.some((p) => h.startsWith(p))) return false
    return true
  } catch {
    return false
  }
}

// ── Bild-Sammler ─────────────────────────────────────────────

function sammleBilder($: CheerioAPI, basis: string): string[] {
  const set = new Set<string>()
  const push = (raw: string | undefined | null) => {
    const u = normalisiereBildUrl(raw, basis)
    if (u) set.add(u)
  }

  // 1. JSON-LD Product images (oft Array)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() ?? '{}'
      const parsed = JSON.parse(raw)
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      for (const node of candidates) {
        const products =
          node['@type'] === 'Product'
            ? [node]
            : Array.isArray(node['@graph'])
              ? node['@graph'].filter((n: { '@type'?: string }) => n['@type'] === 'Product')
              : []
        for (const product of products) {
          const img = product.image
          if (Array.isArray(img))      img.forEach((i: unknown) => push(typeof i === 'string' ? i : (i as { url?: string })?.url))
          else if (typeof img === 'string') push(img)
          else if (img?.url)            push(img.url)
        }
      }
    } catch { /* */ }
  })

  // 2. Meta-Tags (og:image kann mehrfach vorkommen)
  $('meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="og:image"]').each((_, el) => push($(el).attr('content')))
  $('meta[name="twitter:image"], meta[name="twitter:image:src"]').each((_, el) => push($(el).attr('content')))
  $('link[rel="image_src"]').each((_, el) => push($(el).attr('href')))

  // 3. Microdata + RDFa
  $('[itemprop="image"]').each((_, el) => {
    push($(el).attr('content') || $(el).attr('src') || $(el).attr('href'))
  })

  // 4. Shop-Spezifische Galerien / Karussells
  const galerieSelektoren = [
    '.woocommerce-product-gallery img',
    '.product__media img',
    '.product-gallery img',
    '.product-images img',
    '.gallery__image img',
    '[data-product-image] img',
    '[data-zoom-image]',
    '.swiper-slide img',
    'figure.product-media img',
  ]
  for (const sel of galerieSelektoren) {
    $(sel).each((_, el) => {
      const $el = $(el)
      push($el.attr('data-zoom-image'))
      push($el.attr('data-large-image'))
      push($el.attr('data-src'))
      push($el.attr('src'))
      const srcset = $el.attr('srcset')
      if (srcset) {
        // letzte (größte) Variante nehmen
        const last = srcset.split(',').pop()?.trim().split(/\s+/)[0]
        push(last)
      }
    })
  }

  // 5. <picture> Sources
  $('picture source').each((_, el) => {
    const srcset = $(el).attr('srcset')
    if (srcset) {
      const last = srcset.split(',').pop()?.trim().split(/\s+/)[0]
      push(last)
    }
  })

  return Array.from(set).slice(0, 12)
}

// ── Daten-Extraktoren ───────────────────────────────────────

type Erg = ScraperErgebnis

function extrahiereJsonLd($: CheerioAPI, erg: Erg) {
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() ?? '{}'
      const parsed = JSON.parse(raw)
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      for (const node of candidates) {
        const product =
          node['@type'] === 'Product'
            ? node
            : Array.isArray(node['@graph'])
              ? node['@graph'].find((n: { '@type'?: string }) => n['@type'] === 'Product')
              : null
        if (!product) continue

        if (!erg.title         && product.name)        erg.title         = String(product.name).trim()
        if (!erg.description   && product.description) erg.description   = String(product.description).trim()
        if (!erg.artikelnummer && (product.sku || product.mpn || product.gtin))
          erg.artikelnummer = String(product.sku ?? product.mpn ?? product.gtin)
        if (!erg.material      && product.material)    erg.material      = String(product.material)
        if (!erg.farbe         && product.color)       erg.farbe         = String(product.color)

        // Preis aus offers (kann Array sein)
        const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers
        if (offers?.price        && !erg.price) erg.price = parsePreis(String(offers.price))
        if (offers?.priceSpecification?.price && !erg.price)
          erg.price = parsePreis(String(offers.priceSpecification.price))

        // Maße (schema.org)
        if (product.depth?.value  && !erg.tiefe_cm)  erg.tiefe_cm  = parseDimension(String(product.depth.value))
        if (product.height?.value && !erg.hoehe_cm)  erg.hoehe_cm  = parseDimension(String(product.height.value))
        if (product.width?.value  && !erg.breite_cm) erg.breite_cm = parseDimension(String(product.width.value))
        break
      }
    } catch { /* */ }
  })
}

function extrahiereMicrodata($: CheerioAPI, erg: Erg) {
  if (!erg.title) {
    const v = $('[itemprop="name"]').first().text().trim()
    if (v) erg.title = v
  }
  if (!erg.description) {
    const v = $('[itemprop="description"]').first().text().trim()
    if (v) erg.description = v
  }
  if (!erg.price) {
    const v = $('[itemprop="price"]').first().attr('content') || $('[itemprop="price"]').first().text().trim()
    if (v) erg.price = parsePreis(v)
  }
  if (!erg.artikelnummer) {
    const v = $('[itemprop="sku"]').first().text().trim() || $('[itemprop="mpn"]').first().text().trim()
    if (v) erg.artikelnummer = v
  }
  if (!erg.farbe) {
    const v = $('[itemprop="color"]').first().text().trim()
    if (v) erg.farbe = v
  }
  if (!erg.material) {
    const v = $('[itemprop="material"]').first().text().trim()
    if (v) erg.material = v
  }
}

function extrahiereOpenGraph($: CheerioAPI, erg: Erg) {
  if (!erg.title) {
    erg.title =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('meta[name="twitter:title"]').attr('content')?.trim() ||
      $('h1').first().text().trim() ||
      $('title').text().trim() ||
      null
  }
  if (!erg.description) {
    erg.description =
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('meta[name="description"]').attr('content')?.trim() ||
      null
  }
  if (!erg.price) {
    const v =
      $('meta[property="product:price:amount"]').attr('content') ||
      $('meta[property="og:price:amount"]').attr('content') ||
      $('meta[property="product:price"]').attr('content') ||
      null
    erg.price = parsePreis(v)
  }
}

/** Selektoren für Shopify / WooCommerce / Magento. */
function extrahiereShopSpezifisch($: CheerioAPI, erg: Erg) {
  const fallbackTitel = [
    '.product-meta__title',
    '.product__title h1',
    'h1.product_title',
    '.product-info-main .page-title span.base',
    '.product-name h1',
    '[data-testid="product-title"]',
  ]
  if (!erg.title) {
    for (const s of fallbackTitel) {
      const v = $(s).first().text().trim()
      if (v) { erg.title = v; break }
    }
  }

  const fallbackPreis = [
    '.product__price .money',
    '.price-item--regular .money',
    '[data-product-price]',
    '.woocommerce-Price-amount',
    '.product-info-main .price',
    'span.price',
    '.product-price',
    '[data-testid*="price"]',
  ]
  if (!erg.price) {
    for (const s of fallbackPreis) {
      const v = $(s).first().attr('content') || $(s).first().text().trim()
      const p = parsePreis(v)
      if (p) { erg.price = p; break }
    }
  }

  const fallbackSku = [
    '.product-meta__sku-number',
    '.product__sku',
    '.product_meta .sku',
    '.product-info-main .product-attribute.sku .value',
    '[data-product-sku]',
  ]
  if (!erg.artikelnummer) {
    for (const s of fallbackSku) {
      const v = $(s).first().text().trim()
      if (v) { erg.artikelnummer = v; break }
    }
  }

  // Maße aus Beschreibung / Detailtext extrahieren wenn JSON-LD nichts hat
  if (erg.breite_cm == null && erg.tiefe_cm == null && erg.hoehe_cm == null) {
    const detailText = [
      $('.product-description').text(),
      $('.product__description').text(),
      $('.woocommerce-product-details__short-description').text(),
      $('[itemprop="description"]').text(),
      erg.description ?? '',
    ].join(' ')
    const masse = parseMasseAusText(detailText)
    if (masse.breite_cm != null) {
      erg.breite_cm = masse.breite_cm
      erg.tiefe_cm  = masse.tiefe_cm
      erg.hoehe_cm  = masse.hoehe_cm
    }
  }
}

// ── Route ────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url).searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL fehlt' }, { status: 400 })

  if (!isSafeUrl(url)) {
    return NextResponse.json({ error: 'URL nicht erlaubt' }, { status: 403 })
  }

  let parsedUrl: URL
  try { parsedUrl = new URL(url) } catch { return NextResponse.json({ error: 'Ungültige URL' }, { status: 400 }) }
  const hostname = parsedUrl.hostname

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Seite nicht erreichbar (HTTP ${response.status})` }, { status: 502 })
    }

    const html = await response.text()
    const $ = load(html)

    const erg: ScraperErgebnis = {
      title:         null,
      images:        [],
      description:   null,
      price:         null,
      artikelnummer: null,
      material:      null,
      farbe:         null,
      lieferzeit:    null,
      breite_cm:     null,
      tiefe_cm:      null,
      hoehe_cm:      null,
      quelle_domain: hostname,
      partner_match: null,
      ai_used:       false,
    }

    // Extraktoren in Prioritäts-Reihenfolge
    extrahiereJsonLd($, erg)
    extrahiereMicrodata($, erg)
    extrahiereOpenGraph($, erg)
    extrahiereShopSpezifisch($, erg)

    erg.images = sammleBilder($, url)

    // ── AI-Fallback: wenn klassische Extraktion zu wenig findet ──
    // Schwelle: < 3 sinnvolle Felder. Bilder zählen als 1 Feld.
    const fuellGrad =
      (erg.title ? 1 : 0) +
      (erg.description ? 1 : 0) +
      (erg.price != null ? 1 : 0) +
      (erg.artikelnummer ? 1 : 0) +
      (erg.images.length > 0 ? 1 : 0) +
      ((erg.breite_cm != null || erg.tiefe_cm != null || erg.hoehe_cm != null) ? 1 : 0)
    if (fuellGrad < 3) {
      const aiData = await aiExtractFromHtml(html, hostname)
      if (aiData) {
        erg.ai_used = true
        if (!erg.title         && aiData.title)         erg.title         = aiData.title
        if (!erg.description   && aiData.description)   erg.description   = aiData.description
        if (erg.price == null  && aiData.price != null) erg.price         = aiData.price
        if (!erg.artikelnummer && aiData.artikelnummer) erg.artikelnummer = aiData.artikelnummer
        if (!erg.material      && aiData.material)      erg.material      = aiData.material
        if (!erg.farbe         && aiData.farbe)         erg.farbe         = aiData.farbe
        if (!erg.lieferzeit    && aiData.lieferzeit)    erg.lieferzeit    = aiData.lieferzeit
        if (erg.breite_cm == null && aiData.breite_cm != null) erg.breite_cm = aiData.breite_cm
        if (erg.tiefe_cm  == null && aiData.tiefe_cm  != null) erg.tiefe_cm  = aiData.tiefe_cm
        if (erg.hoehe_cm  == null && aiData.hoehe_cm  != null) erg.hoehe_cm  = aiData.hoehe_cm
      }
    }

    // Partner-Match per Domain
    const orgId = await getOrganisationIdOrNull()
    if (orgId) {
      const apex = hostname.replace(/^www\./, '')
      const { data: kandidaten } = await supabase
        .from('partner')
        .select('id, name, website')
        .eq('organisation_id', orgId)
        .is('deleted_at', null)
        .not('website', 'is', null)
      type PartnerRow = { id: string; name: string; website: string | null }
      const match = ((kandidaten ?? []) as PartnerRow[]).find((p) => {
        if (!p.website) return false
        try {
          const phost = new URL(p.website.startsWith('http') ? p.website : `https://${p.website}`).hostname.replace(/^www\./, '')
          return phost === apex
        } catch { return false }
      })
      if (match) erg.partner_match = { id: match.id, name: match.name }
    }

    return NextResponse.json(erg)
  } catch {
    return NextResponse.json({ error: 'Scraping fehlgeschlagen' }, { status: 500 })
  }
}
