import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export type PortalRolle = 'inhaber' | 'mitarbeiter' | 'gast'

export interface ClientUser {
  id: string
  kundeId: string
  email: string
  vorname: string
  nachname: string
  preiseAnzeigen: boolean
  rolle: PortalRolle
  avatarUrl: string | null
}

/**
 * Liest den Portal-Session-Cookie und validiert ihn gegen die DB.
 * Gibt null zurück wenn nicht eingeloggt oder Session abgelaufen.
 * Nur in Server Components / Server Actions aufrufen.
 */
export async function getPortalSession(): Promise<ClientUser | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('portal_session')?.value
  if (!token) return null

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('client_users')
    .select('id, kunde_id, email, vorname, nachname, aktiv, session_expires_at, preise_anzeigen, rolle, avatar_url')
    .eq('session_token', token)
    .eq('aktiv', true)
    .maybeSingle()

  if (!data) return null

  if (data.session_expires_at) {
    const expires = new Date(data.session_expires_at)
    if (expires < new Date()) return null
  }

  return {
    id:             data.id,
    kundeId:        data.kunde_id,
    email:          data.email,
    vorname:        data.vorname,
    nachname:       data.nachname,
    preiseAnzeigen: data.preise_anzeigen ?? true,
    rolle:          (data.rolle as PortalRolle | null) ?? 'inhaber',
    avatarUrl:      data.avatar_url ?? null,
  }
}
