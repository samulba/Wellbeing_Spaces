import { NextResponse } from 'next/server'
import { load } from 'cheerio'
import { createClient } from '@/lib/supabase/server'

export type LinkPreview = {
  url:        string
  title:      string | null
  description: string | null
  image:      string | null
  domain:     string
  favicon:    string | null
}

// ── SSRF-Schutz (analog scrape-product) ──────────────────────
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254']
const BLOCKED_PREFIXES = ['10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.']

function isSafeUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    const h = parsed.hostname.toLowerCase()
    if (BLOCKED_HOSTS.includes(h)) return false
    if (BLOCKED_PREFIXES.some((p) => h.startsWith(p))) return false
    return true
  } catch {
    return false
  }
}

function abs(href: string | undefined | null, base: string): string | null {
  if (!href) return null
  try { return new URL(href, base).href } catch { return null }
}

export async function POST(req: Request): Promise<NextResponse> {
  // Auth-Check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fehler: 'Nicht authentifiziert.' }, { status: 401 })

  let url: string
  try {
    const body = await req.json()
    url = String(body?.url ?? '')
  } catch {
    return NextResponse.json({ fehler: 'Ungültige Anfrage.' }, { status: 400 })
  }
  if (!url) return NextResponse.json({ fehler: 'URL fehlt.' }, { status: 400 })

  // Schemas auto-vervollstaendigen
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  if (!isSafeUrl(url)) {
    return NextResponse.json({ fehler: 'URL nicht erlaubt.' }, { status: 400 })
  }

  let html = ''
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 8000)
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 WellbeingSpaces/1.0 LinkPreview',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: ctrl.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)
    if (!resp.ok) {
      return NextResponse.json({ fehler: `HTTP ${resp.status}` }, { status: 400 })
    }
    const contentType = resp.headers.get('content-type') ?? ''
    if (!contentType.includes('html')) {
      return NextResponse.json({ fehler: 'Kein HTML-Inhalt.' }, { status: 400 })
    }
    html = (await resp.text()).slice(0, 500_000) // max 500 KB
  } catch (e) {
    const msg = e instanceof Error && e.name === 'AbortError' ? 'Timeout.' : 'Konnte URL nicht laden.'
    return NextResponse.json({ fehler: msg }, { status: 400 })
  }

  const $ = load(html)
  const finalUrl = url

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text() ||
    null

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    null

  const imageRaw =
    $('meta[property="og:image:secure_url"]').attr('content') ||
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('link[rel="image_src"]').attr('href') ||
    null

  const faviconRaw =
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    $('link[rel="apple-touch-icon"]').attr('href') ||
    '/favicon.ico'

  const parsedUrl = new URL(finalUrl)
  const domain = parsedUrl.hostname.replace(/^www\./, '')

  const result: LinkPreview = {
    url:         finalUrl,
    title:       title ? title.trim().slice(0, 200) : null,
    description: description ? description.trim().slice(0, 280) : null,
    image:       abs(imageRaw, finalUrl),
    domain,
    favicon:     abs(faviconRaw, finalUrl),
  }

  return NextResponse.json(result)
}
