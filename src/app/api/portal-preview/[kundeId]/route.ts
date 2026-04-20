import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Portal-Vorschau: Designer öffnet das Kunden-Portal aus der Kunden-Detailseite.
 *
 * Sicherheits-Check:
 *   - Designer ist im Dashboard eingeloggt (User-Client + getOrganisationId)
 *   - Der Kunde gehört zur eigenen Organisation
 *   - Der client_user zum Kunden existiert und ist aktiv
 *
 * Ablauf:
 *   - Neuen session_token (48 Byte hex) + 8h-Gültigkeit auf client_user setzen
 *   - portal_session-Cookie (HttpOnly) in dieser Response schreiben
 *   - Redirect auf /portal/dashboard
 */
export async function GET(
  _req: Request,
  { params }: { params: { kundeId: string } },
) {
  const { kundeId } = params

  // Designer-Auth prüfen
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  let orgId: string
  try { orgId = await getOrganisationId() }
  catch { return NextResponse.json({ error: 'Keine Organisation' }, { status: 403 }) }

  // Kunde gehört zur Org?
  const { data: kunde } = await supabase
    .from('kunden')
    .select('id')
    .eq('id', kundeId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!kunde) return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 })

  // Client-User zu diesem Kunden — muss existieren + aktiv sein
  const admin = createAdminClient()
  const { data: clientUser } = await admin
    .from('client_users')
    .select('id, aktiv')
    .eq('kunde_id', kundeId)
    .maybeSingle()
  if (!clientUser || !clientUser.aktiv) {
    return NextResponse.json(
      { error: 'Portal für diesen Kunden nicht aktiviert.' },
      { status: 404 },
    )
  }

  // Neuen session_token generieren (8h gültig) — überschreibt evtl. aktive
  // Kunden-Session, aber für Vorschau ist das akzeptabel
  const sessionToken = randomBytes(48).toString('hex')
  const expiresAt    = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

  const { error: updErr } = await admin
    .from('client_users')
    .update({
      session_token:      sessionToken,
      session_expires_at: expiresAt,
      letzter_login:      new Date().toISOString(),
    })
    .eq('id', clientUser.id as string)

  if (updErr) {
    console.error('[portal-preview] Session-Token-Update fehlgeschlagen:', updErr)
    return NextResponse.json({ error: 'Session-Token konnte nicht gesetzt werden.' }, { status: 500 })
  }

  // Redirect zum Portal + Cookie in dieser Response setzen
  const res = NextResponse.redirect(new URL('/portal/dashboard', _req.url))
  res.cookies.set('portal_session', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
    path:     '/',
    expires:  new Date(Date.now() + 8 * 60 * 60 * 1000),
  })
  return res
}
