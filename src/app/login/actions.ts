'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ACTIVE_ORG_COOKIE = 'active_org_id'
const COOKIE_MAX_AGE    = 60 * 60 * 24 * 30 // 30 Tage

export type LoginResult       = { ok?: true; fehler?: string }
export type SlugPruefResult   = {
  exists: boolean
  orgId?:    string
  orgName?:  string
  fehler?:   string
}

/**
 * Prüft, ob ein Firmen-Slug existiert. Gibt Org-Name zurück, damit
 * die Login-Stage 2 die Firma korrekt brandet.
 */
export async function pruefeFirmaSlug(rawSlug: string): Promise<SlugPruefResult> {
  const slug = (rawSlug ?? '').trim().toLowerCase()
  if (!slug) return { exists: false, fehler: 'Bitte den Firmen-Slug eingeben.' }

  // Sehr einfache Format-Validierung — verhindert komische Eingaben
  if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(slug)) {
    return { exists: false, fehler: 'Ungültiges Slug-Format.' }
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('organisationen')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle()

  if (!data) {
    return {
      exists: false,
      fehler: 'Diese Firma existiert nicht. Prüfe den Slug oder frage deinen Admin.',
    }
  }

  return {
    exists:  true,
    orgId:   data.id   as string,
    orgName: data.name as string,
  }
}

/**
 * Login mit Slug-Scope. Validiert in dieser Reihenfolge:
 *   1. Slug existiert?
 *   2. E-Mail/Passwort korrekt?
 *   3. User ist aktives Mitglied DIESER Firma?
 * Bei Fehlschlag in (3) wird die gerade entstandene Session sofort
 * wieder beendet (signOut), damit der User nicht still in einer
 * fremden Firma landet.
 *
 * Setzt bei Erfolg den HTTP-only Cookie `active_org_id` (30 Tage).
 */
export async function loginAction(formData: FormData): Promise<LoginResult> {
  const slug     = (formData.get('firma')    ?? '').toString().trim().toLowerCase()
  const email    = (formData.get('email')    ?? '').toString().trim()
  const passwort = (formData.get('passwort') ?? '').toString()

  if (!slug)              return { fehler: 'Firmen-Slug fehlt.' }
  if (!email || !passwort) return { fehler: 'E-Mail und Passwort sind erforderlich.' }

  const admin = createAdminClient()
  const { data: org } = await admin
    .from('organisationen')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle()

  if (!org) return { fehler: 'Diese Firma existiert nicht.' }

  const supabase = await createClient()
  const { data: auth, error: authError } =
    await supabase.auth.signInWithPassword({ email, password: passwort })

  if (authError || !auth.user) {
    return { fehler: 'E-Mail oder Passwort ungültig.' }
  }

  // Gehört die E-Mail zu dieser Firma?
  const { data: mitglied } = await admin
    .from('team_mitglieder')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('organisation_id', org.id)
    .eq('status', 'aktiv')
    .maybeSingle()

  if (!mitglied) {
    // Sofort wieder ausloggen — wir wollen keinen Org-Crossover
    await supabase.auth.signOut()
    return { fehler: `Diese E-Mail gehört nicht zu ${org.name}.` }
  }

  // Session-scope setzen
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORG_COOKIE, org.id as string, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   COOKIE_MAX_AGE,
  })

  return { ok: true }
}

/**
 * Beendet die Supabase-Session UND löscht den active_org_id-Cookie.
 * Wird vom Logout-Button aufgerufen.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete(ACTIVE_ORG_COOKIE)
}
