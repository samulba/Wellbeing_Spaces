import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Wichtig: getUser() statt getSession() – validiert gegen Supabase-Server
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Kunden-Portal Auth (eigene Session, unabhängig von Supabase) ──
  const portalSchuetzt = pathname.startsWith('/portal/dashboard') ||
    pathname.startsWith('/portal/projekte') ||
    pathname.startsWith('/portal/profil')

  if (portalSchuetzt) {
    const portalSession = request.cookies.get('portal_session')
    if (!portalSession) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
    return NextResponse.next()
  }

  if (pathname === '/portal/login' || pathname === '/portal') {
    // Vollständige Validierung in der Page selbst – Middleware nur Cookie-Check
    const portalSession = request.cookies.get('portal_session')
    if (portalSession && pathname === '/portal/login') {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // ── Admin-Dashboard Auth (Supabase) ──────────────────────────────
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|freigabe|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
