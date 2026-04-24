'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Rolle, TeamMitglied } from '@/lib/supabase/types'

export type TeamActionState = { fehler?: string; erfolg?: string; einladungsLink?: string } | null

// ── Rolle abrufen ─────────────────────────────────────────────

/**
 * Aktuelle Rolle des eingeloggten Nutzers.
 * Gibt 'admin' zurück wenn noch keine Mitglieder existieren (Bootstrap-Fall).
 */
export async function meineRolleAbrufen(): Promise<Rolle> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'viewer'

    const admin = createAdminClient()

    // Bootstrap: noch keine Einträge → erster Nutzer ist Admin
    const { count } = await admin
      .from('team_mitglieder')
      .select('*', { count: 'exact', head: true })

    if (!count || count === 0) return 'admin'

    // Aktiven Eintrag via user_id – bei mehreren Orgs deterministisch die
    // älteste Mitgliedschaft (primäre Org) wählen.
    const { data } = await admin
      .from('team_mitglieder')
      .select('rolle')
      .eq('user_id', user.id)
      .eq('status', 'aktiv')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (data) return data.rolle as Rolle

    // WICHTIG: KEINE automatische Einladungs-Aktivierung per E-Mail-Match.
    // Einladungen MÜSSEN explizit über /einladung/[token] angenommen werden –
    // sonst könnten User ungewollt in fremde Organisationen gezogen werden.
    return 'viewer'
  } catch {
    return 'viewer'
  }
}

/** Alle Team-Mitglieder (nur für Admins). */
export async function teamMitgliederAbrufen(): Promise<TeamMitglied[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('team_mitglieder')
    .select('*')
    .order('created_at')
  return (data ?? []) as TeamMitglied[]
}

// ── Einladung senden ──────────────────────────────────────────

export async function mitgliedEinladen(
  prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const rolle = (formData.get('rolle') as Rolle) ?? 'viewer'

  if (!email) return { fehler: 'E-Mail darf nicht leer sein.' }
  if (!['admin', 'editor', 'viewer'].includes(rolle)) return { fehler: 'Ungültige Rolle.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { fehler: 'Nicht angemeldet.' }

  const orgId = await getOrganisationId()
  const admin = createAdminClient()

  // Duplikat verhindern
  const { data: existing } = await admin
    .from('team_mitglieder')
    .select('id, status')
    .eq('email', email)
    .maybeSingle()

  if (existing?.status === 'aktiv')      return { fehler: `${email} ist bereits Teammitglied.` }
  if (existing?.status === 'ausstehend') return { fehler: `Einladung für ${email} ist bereits ausstehend.` }

  // Deaktivierten Eintrag reaktivieren statt neu anlegen
  if (existing?.status === 'deaktiviert') {
    await admin
      .from('team_mitglieder')
      .update({ rolle, status: 'ausstehend', eingeladen_von: user.id,
                 einladungs_token: crypto.randomUUID() })
      .eq('id', existing.id)
    revalidatePath('/dashboard/einstellungen')
    return { erfolg: `${email} wurde erneut eingeladen.` }
  }

  const token = crypto.randomUUID()
  const { error } = await admin.from('team_mitglieder').insert({
    email, rolle, status: 'ausstehend',
    eingeladen_von:   user.id,
    einladungs_token: token,
    organisation_id:  orgId,
  })

  if (error) return { fehler: 'Fehler beim Erstellen der Einladung.' }

  // Supabase E-Mail (optional, klappt nur mit konfiguriertem SMTP)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  await admin.auth.admin.inviteUserByEmail(email, {
    data: { rolle },
    redirectTo: `${appUrl}/einladung/${token}`,
  }).catch(() => { /* kein SMTP konfiguriert */ })

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: `Einladung für ${email} erstellt.`, einladungsLink: `/einladung/${token}` }
}

// ── Rolle ändern ──────────────────────────────────────────────

export async function rolleAendern(mitgliedId: string, neueRolle: Rolle): Promise<void> {
  const admin = createAdminClient()

  if (neueRolle !== 'admin') {
    const { data: target } = await admin
      .from('team_mitglieder').select('rolle').eq('id', mitgliedId).single()
    if (target?.rolle === 'admin') {
      const { count } = await admin
        .from('team_mitglieder').select('*', { count: 'exact', head: true })
        .eq('rolle', 'admin').eq('status', 'aktiv')
      if ((count ?? 0) <= 1) return // letzten Admin schützen
    }
  }

  await admin.from('team_mitglieder').update({ rolle: neueRolle }).eq('id', mitgliedId)
  revalidatePath('/dashboard/einstellungen')
}

// ── Mitglied entfernen / reaktivieren ─────────────────────────

export async function mitgliedEntfernen(mitgliedId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const admin = createAdminClient()
  const { data: target } = await admin
    .from('team_mitglieder').select('user_id, rolle').eq('id', mitgliedId).single()

  if (target?.user_id === user.id) return // nicht sich selbst

  if (target?.rolle === 'admin') {
    const { count } = await admin
      .from('team_mitglieder').select('*', { count: 'exact', head: true })
      .eq('rolle', 'admin').eq('status', 'aktiv')
    if ((count ?? 0) <= 1) return
  }

  await admin.from('team_mitglieder').update({ status: 'deaktiviert' }).eq('id', mitgliedId)
  revalidatePath('/dashboard/einstellungen')
}

export async function mitgliedReaktivieren(mitgliedId: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('team_mitglieder').update({ status: 'aktiv' }).eq('id', mitgliedId)
  revalidatePath('/dashboard/einstellungen')
}

export async function einladungZurueckziehen(mitgliedId: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('team_mitglieder').delete().eq('id', mitgliedId).eq('status', 'ausstehend')
  revalidatePath('/dashboard/einstellungen')
}

// ── Einladung annehmen (Token-Link) ───────────────────────────

export async function einladungAnnehmen(token: string): Promise<{ erfolg: boolean; fehler?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erfolg: false, fehler: 'Bitte zuerst anmelden.' }

  const admin = createAdminClient()
  const { data: einladung } = await admin
    .from('team_mitglieder')
    .select('id, status')
    .eq('einladungs_token', token)
    .maybeSingle()

  if (!einladung) return { erfolg: false, fehler: 'Einladungslink ungültig oder bereits verwendet.' }
  if (einladung.status !== 'ausstehend') return { erfolg: false, fehler: 'Diese Einladung ist nicht mehr gültig.' }

  await admin
    .from('team_mitglieder')
    .update({ user_id: user.id, status: 'aktiv', einladungs_token: null })
    .eq('id', einladung.id)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

// ── Legacy-Stubs (EinstellungenTabs importiert diese noch) ────
export async function inviteUser(
  prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  return mitgliedEinladen(prevState, formData)
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updateUserRolle(id: string, rolle: string): Promise<void> { return }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deactivateUser(id: string): Promise<void> { return }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function reactivateUser(id: string): Promise<void> { return }
