import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Domain-Klassifizierung ─────────────────────────────────────

const APP_DOMAIN  = 'app.wellbeing-spaces.de'
const MAIN_DOMAINS = ['wellbeing-spaces.de', 'www.wellbeing-spaces.de']

type HostTyp = 'app' | 'main' | 'dev'

function hostTyp(hostname: string): HostTyp {
  if (hostname === APP_DOMAIN) return 'app'
  if (MAIN_DOMAINS.includes(hostname)) return 'main'
  return 'dev' // localhost, *.vercel.app Previews
}

// ── Routen-Klassifizierung ────────────────────────────────────

function istGeschuetzt(pathname: string): boolean {
  if (pathname.startsWith('/dashboard')) return true
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/public/')) return true
  return false
}

// ── Supabase Client für Middleware ────────────────────────────

function createSupabaseMiddleware(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}

// ── Haupt-Middleware ──────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const { pathname } = request.nextUrl
  const hostname  = request.headers.get('host') ?? ''
  const typ = hostTyp(hostname)

  // ── Portal Auth (eigenes Cookie-System) ─────────────────────
  const portalGeschuetzt =
    pathname.startsWith('/portal/dashboard') ||
    pathname.startsWith('/portal/projekte') ||
    pathname.startsWith('/portal/profil')

  if (portalGeschuetzt) {
    if (!request.cookies.get('portal_session')) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
    return NextResponse.next()
  }

  if (pathname === '/portal' || pathname === '/portal/login') {
    const portalSession = request.cookies.get('portal_session')
    if (portalSession && pathname === '/portal/login') {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // ── Hauptdomain: wellbeing-spaces.de ─────────────────────────
  if (typ === 'main') {
    // Dashboard-Zugriff auf Hauptdomain → App-Subdomain
    if (pathname.startsWith('/dashboard')) {
      const supabase = createSupabaseMiddleware(request, response)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.redirect(
          new URL(`https://${APP_DOMAIN}/login?redirect=${encodeURIComponent(pathname)}`, request.url)
        )
      }
      const appUrl = new URL(pathname + request.nextUrl.search, `https://${APP_DOMAIN}`)
      return NextResponse.redirect(appUrl)
    }

    // Login auf Hauptdomain: eingeloggter User → App-Subdomain
    if (pathname === '/login') {
      const supabase = createSupabaseMiddleware(request, response)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        return NextResponse.redirect(new URL(`https://${APP_DOMAIN}/dashboard`, request.url))
      }
    }

    return response
  }

  // ── App-Subdomain: app.wellbeing-spaces.de ───────────────────
  if (typ === 'app') {
    // Root → Login oder Dashboard
    if (pathname === '/') {
      const supabase = createSupabaseMiddleware(request, response)
      const { data: { user } } = await supabase.auth.getUser()
      return NextResponse.redirect(
        new URL(user ? '/dashboard' : '/login', request.url)
      )
    }

    // Geschützte Routen: Auth erforderlich
    if (istGeschuetzt(pathname)) {
      const supabase = createSupabaseMiddleware(request, response)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // API-Routen → 401 JSON
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Nicht autorisiert', message: 'Anmeldung erforderlich' },
            { status: 401 }
          )
        }
        // Dashboard → Login mit Redirect-Param
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    // Login auf App-Subdomain: eingeloggter User → Dashboard
    if (pathname === '/login') {
      const supabase = createSupabaseMiddleware(request, response)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const redirectTo = request.nextUrl.searchParams.get('redirect') ?? '/dashboard'
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }
    }

    return response
  }

  // ── Dev / Vercel Preview (localhost, *.vercel.app) ────────────

  // Geschützte Routen: Auth erforderlich
  if (istGeschuetzt(pathname)) {
    const supabase = createSupabaseMiddleware(request, response)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Nicht autorisiert', message: 'Anmeldung erforderlich' },
          { status: 401 }
        )
      }
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Login: eingeloggter User → Dashboard
  if (pathname === '/login') {
    const supabase = createSupabaseMiddleware(request, response)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const redirectTo = request.nextUrl.searchParams.get('redirect') ?? '/dashboard'
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
