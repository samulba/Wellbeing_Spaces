'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SessionInfo {
  id:           string
  istAktuell:   boolean
  user_agent:   string | null
  ip:           string | null
  created_at:   string
  updated_at:   string | null
  refreshed_at: string | null
  not_after:    string | null
}

type SessionRaw = {
  id:           string
  user_id:      string
  created_at:   string
  updated_at:   string | null
  refreshed_at: string | null
  not_after:    string | null
  user_agent:   string | null
  ip:           string | null
}

/** Extrahiert die `session_id` aus einem Supabase-JWT. Tolerant gegenüber Fehlern. */
function sessionIdAusJwt(jwt: string | undefined | null): string | null {
  if (!jwt) return null
  try {
    const teil = jwt.split('.')[1]
    if (!teil) return null
    const padding = '='.repeat((4 - (teil.length % 4)) % 4)
    const b64     = (teil + padding).replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
    return (payload?.session_id as string | undefined) ?? null
  } catch {
    return null
  }
}

export async function getMeineSessions(): Promise<SessionInfo[]> {
  const supabase = await createClient()
  const { data: sessionRes } = await supabase.auth.getSession()
  if (!sessionRes?.session) return []

  const aktuelleSessionId = sessionIdAusJwt(sessionRes.session.access_token)

  const { data, error } = await supabase.rpc('get_meine_sessions')
  if (error || !data) return []

  return ((data as SessionRaw[]) ?? [])
    .map((row) => ({
      id:           row.id,
      istAktuell:   row.id === aktuelleSessionId,
      user_agent:   row.user_agent,
      ip:           row.ip,
      created_at:   row.created_at,
      updated_at:   row.updated_at,
      refreshed_at: row.refreshed_at,
      not_after:    row.not_after,
    }))
    .sort((a, b) => {
      // Aktuelle Session zuerst, dann nach letzter Aktivität absteigend
      if (a.istAktuell !== b.istAktuell) return a.istAktuell ? -1 : 1
      const aTs = new Date(a.refreshed_at ?? a.updated_at ?? a.created_at).getTime()
      const bTs = new Date(b.refreshed_at ?? b.updated_at ?? b.created_at).getTime()
      return bTs - aTs
    })
}

export async function sessionBeenden(sessionId: string): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('session_beenden', { p_session_id: sessionId })
  if (error) return { fehler: 'Fehler beim Abmelden der Session.' }
  if (data !== true) return { fehler: 'Session konnte nicht gefunden werden oder gehört nicht dir.' }
  revalidatePath('/dashboard/einstellungen')
  return { erfolg: true }
}

export async function alleAnderenSessionsBeenden(): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  // Supabase JS v2: scope 'others' meldet alle ausser dieser Session ab
  const { error } = await supabase.auth.signOut({ scope: 'others' })
  if (error) return { fehler: 'Fehler beim Abmelden anderer Geräte.' }
  revalidatePath('/dashboard/einstellungen')
  return { erfolg: true }
}
