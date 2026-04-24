import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
 * Gibt die organisation_id des aktuell eingeloggten Users zurück.
 * Gibt null zurück wenn kein User eingeloggt ist oder keine Org gefunden wird.
 * Wirft NIEMALS — sicher für SSR-Kontext.
 */
export async function getOrganisationIdOrNull(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Bei mehreren aktiven Mitgliedschaften deterministisch die älteste
    // (primäre) Organisation wählen – verhindert unvorhersagbares Wechseln
    // zwischen Orgs.
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
 */
export async function getOrganisationId(): Promise<string> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Nicht angemeldet.')

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
