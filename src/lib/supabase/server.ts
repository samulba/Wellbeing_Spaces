import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

const ACTIVE_ORG_COOKIE = 'active_org_id'

export async function createClient() {
  const cookieStore = await cookies()

  // Fallbacks für SSR-Builds, bei denen ENV-Vars fehlen. Alle DB-Operationen
  // schlagen dann als error-Objekt fehl (nicht als Exception) – Seiten handhaben
  // das graceful, Build crasht nicht.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'supabase-anon-key-not-configured'

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component – Cookies können nicht gesetzt werden
          }
        },
      },
    }
  )
}

/**
 * Liest active_org_id aus dem Cookie und prüft, ob der User dort aktives
 * Mitglied ist. Nutzt admin-Client für die Verifikation, damit RLS-Edge-Cases
 * nicht zu falschen Negativergebnissen führen.
 */
async function aufgesetzteOrgVerifizieren(userId: string): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const aktiv       = cookieStore.get(ACTIVE_ORG_COOKIE)?.value
    if (!aktiv) return null

    const admin = createAdminClient()
    const { data } = await admin
      .from('team_mitglieder')
      .select('organisation_id')
      .eq('user_id', userId)
      .eq('organisation_id', aktiv)
      .eq('status', 'aktiv')
      .maybeSingle()

    return (data?.organisation_id as string | null) ?? null
  } catch {
    return null
  }
}

/**
 * Gibt die organisation_id des aktuell eingeloggten Users zurück.
 * Gibt null zurück wenn kein User eingeloggt ist oder keine Org gefunden wird.
 * Wirft NIEMALS — sicher für SSR-Kontext.
 *
 * Auflösungs-Reihenfolge:
 *   1. active_org_id-Cookie (vom Login gesetzt) — wenn der User dort
 *      aktives Mitglied ist
 *   2. Fallback: älteste aktive Mitgliedschaft (deterministisch)
 */
export async function getOrganisationIdOrNull(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const ausCookie = await aufgesetzteOrgVerifizieren(user.id)
    if (ausCookie) return ausCookie

    const { data } = await supabase
      .from('team_mitglieder')
      .select('organisation_id')
      .eq('user_id', user.id)
      .eq('status', 'aktiv')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    return (data?.organisation_id as string | null) ?? null
  } catch {
    return null
  }
}

/**
 * Gibt die organisation_id des aktuell eingeloggten Users zurück.
 * Wirft einen Error wenn kein User eingeloggt ist oder keine Org gefunden wird.
 * Nur in Mutations verwenden (nicht in SSR-Reads).
 *
 * Auflösungs-Reihenfolge wie getOrganisationIdOrNull.
 */
export async function getOrganisationId(): Promise<string> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Nicht angemeldet.')

  const ausCookie = await aufgesetzteOrgVerifizieren(user.id)
  if (ausCookie) return ausCookie

  const { data, error } = await supabase
    .from('team_mitglieder')
    .select('organisation_id')
    .eq('user_id', user.id)
    .eq('status', 'aktiv')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data?.organisation_id) {
    throw new Error('Keine Organisation gefunden. Bitte wenden Sie sich an einen Administrator.')
  }

  return data.organisation_id as string
}
