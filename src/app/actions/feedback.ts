'use server'

/**
 * Server-Actions fuer Feedback-System (Migration 106).
 *
 * User-Actions: feedbackEinreichen, getMeinFeedback, screenshotHochladen,
 *   screenshotSigniert
 *
 * Super-Admin-Actions: getAlleFeedbacks, feedbackStatusAendern,
 *   feedbackPrioritaetAendern, feedbackInterneNotiz, feedbackAntworten,
 *   feedbackLoeschen
 *
 * Super-Admin-Bereich nutzt Admin-Client + isSuperAdmin()-Check.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { isSuperAdmin } from '@/lib/super-admin'
import { sendMail } from '@/lib/mail'
import crypto from 'crypto'
import type { Feedback, FeedbackTyp, FeedbackStatus, FeedbackPrioritaet, FeedbackMitOrg } from '@/lib/supabase/types'

// ── User-Actions ─────────────────────────────────────────────

export interface FeedbackEinreichenInput {
  typ:           FeedbackTyp
  titel:         string
  beschreibung:  string
  url?:          string | null
  user_agent?:   string | null
  /** Storage-Pfad falls Screenshot hochgeladen */
  screenshot?:   string | null
}

export async function feedbackEinreichen(
  input: FeedbackEinreichenInput,
): Promise<{ id?: string; fehler?: string }> {
  const titel = input.titel.trim()
  const beschreibung = input.beschreibung.trim()
  if (!titel) return { fehler: 'Titel darf nicht leer sein.' }
  if (titel.length > 200) return { fehler: 'Titel zu lang (max 200 Zeichen).' }
  if (!beschreibung) return { fehler: 'Beschreibung darf nicht leer sein.' }
  if (beschreibung.length > 8000) return { fehler: 'Beschreibung zu lang (max 8000).' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { fehler: 'Nicht angemeldet.' }

  // Org-ID + Display-Name aus team_mitglieder holen
  let orgId: string | null = null
  let userName: string | null = null
  try {
    const { data: tm } = await supabase
      .from('team_mitglieder')
      .select('organisation_id, vorname, nachname')
      .eq('user_id', user.id)
      .neq('status', 'deaktiviert')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (tm) {
      orgId = (tm.organisation_id as string | null) ?? null
      userName = [tm.vorname, tm.nachname].filter(Boolean).join(' ').trim() || null
    }
  } catch { /* Org-Zuordnung optional */ }
  if (!userName) {
    userName = (user.user_metadata?.full_name as string | undefined)
            ?? user.email?.split('@')[0]
            ?? null
  }

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      organisation_id: orgId,
      user_id:         user.id,
      user_email:      user.email ?? null,
      user_name:       userName,
      typ:             input.typ,
      titel,
      beschreibung,
      url:             input.url ?? null,
      user_agent:      input.user_agent ?? null,
      screenshot_url:  input.screenshot ?? null,
    })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[feedbackEinreichen]', error?.message)
    return { fehler: 'Feedback konnte nicht gespeichert werden.' }
  }

  revalidatePath('/dashboard/einstellungen')
  return { id: data.id }
}

export async function getMeinFeedback(): Promise<Feedback[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('feedback')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return (data ?? []) as Feedback[]
}

export async function feedbackScreenshotHochladen(
  formData: FormData,
): Promise<{ pfad?: string; fehler?: string }> {
  const file = formData.get('datei') as File | null
  if (!file) return { fehler: 'Keine Datei.' }
  if (!file.type.startsWith('image/')) return { fehler: 'Nur Bilder erlaubt.' }
  if (file.size > 10 * 1024 * 1024) return { fehler: 'Bild zu gross (max 10 MB).' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { fehler: 'Nicht angemeldet.' }

  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
  const pfad = `${user.id}/${crypto.randomBytes(8).toString('hex')}.${ext}`

  const { error } = await supabase.storage
    .from('feedback-screenshots')
    .upload(pfad, file, { contentType: file.type, upsert: false })
  if (error) {
    console.error('[feedbackScreenshot]', error.message)
    return { fehler: 'Upload fehlgeschlagen.' }
  }
  return { pfad }
}

export async function feedbackScreenshotSigniert(
  pfad: string,
): Promise<{ url?: string; fehler?: string }> {
  // Super-Admin darf alle, normaler User nur eigene
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const eigener = pfad.startsWith((user?.id ?? '') + '/')
  const istAdmin = await isSuperAdmin()
  if (!eigener && !istAdmin) return { fehler: 'Keine Berechtigung.' }

  const client = istAdmin ? createAdminClient() : supabase
  const { data, error } = await client.storage
    .from('feedback-screenshots')
    .createSignedUrl(pfad, 3600)
  if (error || !data) return { fehler: 'Signierte URL fehlgeschlagen.' }
  return { url: data.signedUrl }
}

// ── Super-Admin-Actions ──────────────────────────────────────

export interface FeedbackFilter {
  status?:     FeedbackStatus | 'alle'
  typ?:        FeedbackTyp | 'alle'
  prioritaet?: FeedbackPrioritaet | 'alle'
  orgId?:      string
  suche?:      string
}

export async function getAlleFeedbacks(filter: FeedbackFilter = {}): Promise<FeedbackMitOrg[]> {
  if (!await isSuperAdmin()) return []
  const admin = createAdminClient()
  let q = admin
    .from('feedback')
    .select('*, organisation:organisationen(id, name)')
    .order('created_at', { ascending: false })
  if (filter.status     && filter.status     !== 'alle') q = q.eq('status', filter.status)
  if (filter.typ        && filter.typ        !== 'alle') q = q.eq('typ', filter.typ)
  if (filter.prioritaet && filter.prioritaet !== 'alle') q = q.eq('prioritaet', filter.prioritaet)
  if (filter.orgId) q = q.eq('organisation_id', filter.orgId)
  if (filter.suche?.trim()) {
    const t = filter.suche.trim().replace(/[%_]/g, '')
    q = q.or(`titel.ilike.%${t}%,beschreibung.ilike.%${t}%,user_email.ilike.%${t}%`)
  }
  const { data } = await q
  return (data ?? []) as unknown as FeedbackMitOrg[]
}

export async function getFeedbackById(id: string): Promise<FeedbackMitOrg | null> {
  if (!await isSuperAdmin()) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('feedback')
    .select('*, organisation:organisationen(id, name)')
    .eq('id', id)
    .maybeSingle()
  return (data ?? null) as unknown as FeedbackMitOrg | null
}

export async function feedbackStatusAendern(
  id: string, status: FeedbackStatus,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  if (!await isSuperAdmin()) return { fehler: 'Keine Berechtigung.' }
  const admin = createAdminClient()
  const { error } = await admin.from('feedback').update({ status }).eq('id', id)
  if (error) return { fehler: 'Status konnte nicht aktualisiert werden.' }
  revalidatePath('/super-admin/feedback')
  return { erfolg: true }
}

export async function feedbackPrioritaetAendern(
  id: string, prioritaet: FeedbackPrioritaet,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  if (!await isSuperAdmin()) return { fehler: 'Keine Berechtigung.' }
  const admin = createAdminClient()
  const { error } = await admin.from('feedback').update({ prioritaet }).eq('id', id)
  if (error) return { fehler: 'Prioritaet konnte nicht aktualisiert werden.' }
  revalidatePath('/super-admin/feedback')
  return { erfolg: true }
}

export async function feedbackInterneNotiz(
  id: string, notiz: string | null,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  if (!await isSuperAdmin()) return { fehler: 'Keine Berechtigung.' }
  const admin = createAdminClient()
  const { error } = await admin.from('feedback').update({ interne_notiz: notiz }).eq('id', id)
  if (error) return { fehler: 'Notiz konnte nicht gespeichert werden.' }
  revalidatePath('/super-admin/feedback')
  return { erfolg: true }
}

export async function feedbackAntworten(
  id: string,
  antwort: string,
  optionen?: { sendeMail?: boolean },
): Promise<{ erfolg?: boolean; fehler?: string }> {
  if (!await isSuperAdmin()) return { fehler: 'Keine Berechtigung.' }
  const text = antwort.trim()
  if (!text) return { fehler: 'Antwort darf nicht leer sein.' }
  if (text.length > 8000) return { fehler: 'Antwort zu lang.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  // Feedback laden fuer Mail
  const { data: fb } = await admin
    .from('feedback')
    .select('user_email, user_name, titel, typ')
    .eq('id', id)
    .maybeSingle()

  const { error } = await admin.from('feedback').update({
    antwort: text,
    beantwortet_am: new Date().toISOString(),
    beantwortet_von: user?.id ?? null,
  }).eq('id', id)
  if (error) return { fehler: 'Antwort konnte nicht gespeichert werden.' }

  // Mail an User
  if (optionen?.sendeMail !== false && fb?.user_email) {
    try {
      const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6ede2; margin: 0; padding: 32px;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 10px rgba(0,0,0,0.04);">
    <h1 style="font-size: 18px; color: #2d3e31; margin: 0 0 12px;">Hallo ${escapeHtml(fb.user_name ?? '')},</h1>
    <p style="font-size: 14px; color: #4b5563; line-height: 1.55; margin: 0 0 14px;">
      wir haben auf dein Feedback geantwortet:
    </p>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
      <p style="font-size: 13px; color: #6b7280; margin: 0 0 6px;">
        Dein ${typLabel(fb.typ as FeedbackTyp)}: <strong style="color: #111827;">${escapeHtml(fb.titel ?? '')}</strong>
      </p>
      <p style="font-size: 14px; color: #374151; margin: 8px 0 0; white-space: pre-wrap;">${escapeHtml(text)}</p>
    </div>
    <p style="font-size: 12px; color: #9ca3af;">— Wellbeing Spaces Team</p>
  </div>
</body></html>`.trim()
      await sendMail({
        to: fb.user_email,
        subject: `Antwort zu deinem Feedback: ${fb.titel}`,
        html,
      })
    } catch (e) { console.error('[feedbackMail]', e) }
  }

  revalidatePath('/super-admin/feedback')
  return { erfolg: true }
}

export async function feedbackLoeschen(id: string): Promise<{ erfolg?: boolean; fehler?: string }> {
  if (!await isSuperAdmin()) return { fehler: 'Keine Berechtigung.' }
  const admin = createAdminClient()
  const { error } = await admin.from('feedback').delete().eq('id', id)
  if (error) return { fehler: 'Loeschen fehlgeschlagen.' }
  revalidatePath('/super-admin/feedback')
  return { erfolg: true }
}

export async function feedbackAufgabeVerknuepfen(
  id: string, aufgabeId: string | null,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  if (!await isSuperAdmin()) return { fehler: 'Keine Berechtigung.' }
  const admin = createAdminClient()
  const { error } = await admin.from('feedback').update({ aufgabe_id: aufgabeId }).eq('id', id)
  if (error) return { fehler: 'Verknuepfung konnte nicht gespeichert werden.' }
  revalidatePath('/super-admin/feedback')
  return { erfolg: true }
}

/**
 * Erstellt aus einem Feedback eine Aufgabe in Samuels persoenlichem
 * Kanban-Board (= Org des Super-Admins) und verknuepft beide.
 * Prioritaet wird vom Feedback uebernommen, Titel mit Typ-Praefix.
 */
export async function feedbackAlsAufgabeUebernehmen(
  id: string,
): Promise<{ aufgabeId?: string; fehler?: string }> {
  if (!await isSuperAdmin()) return { fehler: 'Keine Berechtigung.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { fehler: 'Nicht angemeldet.' }

  const admin = createAdminClient()
  const { data: fb } = await admin
    .from('feedback')
    .select('*, organisation:organisationen(name)')
    .eq('id', id)
    .maybeSingle()
  if (!fb) return { fehler: 'Feedback nicht gefunden.' }
  if (fb.aufgabe_id) return { fehler: 'Bereits als Aufgabe uebernommen.' }

  // Org-ID des Super-Admins ermitteln (sein eigenes Kanban-Board)
  const { data: tm } = await admin
    .from('team_mitglieder')
    .select('organisation_id')
    .eq('user_id', user.id)
    .neq('status', 'deaktiviert')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  const ownOrgId = tm?.organisation_id as string | null
  if (!ownOrgId) return { fehler: 'Eigene Organisation nicht gefunden.' }

  // Naechste Reihenfolge in Backlog
  const { data: maxRow } = await admin
    .from('aufgaben')
    .select('reihenfolge')
    .eq('organisation_id', ownOrgId)
    .eq('status', 'backlog')
    .order('reihenfolge', { ascending: false })
    .limit(1)
    .maybeSingle()
  const reihenfolge = (maxRow?.reihenfolge ?? -1) + 1

  // Typ-Praefix
  const praefix =
    fb.typ === 'bug' ? '[Bug]'
    : fb.typ === 'feature' ? '[Feature]'
    : fb.typ === 'frage' ? '[Frage]'
    : '[Feedback]'

  // Prio-Mapping: Feedback prio -> Aufgaben prio (selbe Skala)
  const prio = fb.prioritaet === 'kritisch' ? 'dringend'
             : fb.prioritaet === 'hoch'      ? 'hoch'
             : fb.prioritaet === 'normal'    ? 'normal'
             : 'niedrig'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgName = (fb.organisation as any)?.name as string | undefined

  const beschreibung = [
    fb.beschreibung,
    '',
    '— Eingereicht von:',
    `${fb.user_name ?? fb.user_email ?? 'Anonym'}${orgName ? ' · ' + orgName : ''}`,
    fb.url ? `URL: ${fb.url}` : null,
  ].filter((x) => x !== null).join('\n')

  const { data: aufgabe, error: insErr } = await admin
    .from('aufgaben')
    .insert({
      organisation_id: ownOrgId,
      titel:           `${praefix} ${fb.titel}`,
      beschreibung,
      status:          'backlog',
      reihenfolge,
      prioritaet:      prio,
      quelle:          'manuell',
      erstellt_von:    user.id,
    })
    .select('id')
    .single()
  if (insErr || !aufgabe) {
    console.error('[feedbackAlsAufgabe]', insErr?.message)
    return { fehler: 'Aufgabe konnte nicht angelegt werden.' }
  }

  // Verknuepfung speichern
  await admin
    .from('feedback')
    .update({ aufgabe_id: aufgabe.id, status: 'in_arbeit' })
    .eq('id', id)

  revalidatePath('/super-admin/feedback')
  revalidatePath('/dashboard/aufgaben')
  return { aufgabeId: aufgabe.id }
}

// ── Helper ───────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;'  :
    c === '>' ? '&gt;'  :
    c === '"' ? '&quot;': '&#39;'
  ))
}

function typLabel(t: FeedbackTyp): string {
  return t === 'bug' ? 'Bug-Report'
    : t === 'feature' ? 'Feature-Wunsch'
    : t === 'frage' ? 'Frage'
    : t === 'lob' ? 'Lob'
    : 'Feedback'
}
