'use server'

/**
 * Server-Actions fuer Aufgaben (Migration 102).
 *
 * Trello-Style Kanban-System mit:
 *  - 4 festen Spalten (backlog/in_arbeit/review/erledigt)
 *  - Drag&Drop via reihenfolge-Spalte
 *  - Auto-Sync aus Reklamation/Bestellung/Meilenstein/Onboarding
 *  - Kunden-Beteiligung (assignee_kunde + sichtbar_fuer_kunde)
 *  - Inline-Checkliste, Anhaenge, Kommentare
 */

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auditLog } from '@/lib/audit'
import { sendMail } from '@/lib/mail'
import { aufgabeZuweisungInternMail, aufgabeZuweisungKundeMail } from '@/lib/mail-templates'
import crypto from 'crypto'
import type {
  Aufgabe, AufgabeMitDetails, AufgabeStatus, AufgabePrioritaet,
  AufgabeQuelle, AufgabeChecklistItem, AufgabeAnhang, AufgabeKommentar,
} from '@/lib/supabase/types'

// ── Helper: App-URL ermitteln ────────────────────────────────
async function appBaseUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  try {
    const h = await headers()
    const host  = h.get('x-forwarded-host') ?? h.get('host')
    const proto = h.get('x-forwarded-proto') ?? 'https'
    if (host && !host.includes('localhost')) return `${proto}://${host}`
  } catch { /* nicht im Request-Kontext */ }
  return 'https://app.wellbeing-spaces.de'
}

// ── Helper: Notification bei Zuweisung verschicken ───────────
async function notifyAufgabeZuweisung(
  aufgabeId: string,
  kontext: 'erstellt' | 'aktualisiert',
): Promise<void> {
  try {
    const supabase = await createClient()
    const orgId = await getOrganisationId()
    const { data: { user } } = await supabase.auth.getUser()

    // Aufgabe + assignee + Projekt/Kunde laden
    const { data: a } = await supabase
      .from('aufgaben')
      .select(`
        id, titel, beschreibung, faellig_am, prioritaet, quelle,
        assignee_user_id, assignee_kunde, kunde_id, projekt_id,
        projekt:projekte(name),
        kunde:kunden(name)
      `)
      .eq('id', aufgabeId)
      .eq('organisation_id', orgId)
      .maybeSingle()
    if (!a) return
    // Auto-Tasks loesen keine Mails aus (zu viele bei Status-Wechseln)
    if (a.quelle !== 'manuell') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projektName = ((a.projekt as any)?.name as string | undefined) ?? null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kundeName   = ((a.kunde   as any)?.name as string | undefined) ?? null

    // Branding fuer Mail-Layout
    const { data: branding } = await supabase
      .from('branding')
      .select('firmenname, primary_color')
      .eq('organisation_id', orgId)
      .maybeSingle()

    const baseUrl = await appBaseUrl()
    const zuweiserName =
      (user?.user_metadata?.full_name as string | undefined)
      ?? (user?.email?.split('@')[0])
      ?? null

    // Team-Mitglied
    if (a.assignee_user_id) {
      // Eigene Zuweisung → keine Mail an sich selbst
      if (user?.id === a.assignee_user_id) return
      const { data: tm } = await supabase
        .from('team_mitglieder')
        .select('vorname, nachname, email')
        .eq('user_id', a.assignee_user_id)
        .eq('organisation_id', orgId)
        .maybeSingle()
      if (!tm?.email) return
      const empfaengerName = [tm.vorname, tm.nachname].filter(Boolean).join(' ').trim()
                           || (tm.email.split('@')[0] ?? 'dort')
      const { subject, html } = aufgabeZuweisungInternMail({
        empfaengerName,
        zuweiserName,
        aufgabeTitel: a.titel,
        beschreibung: a.beschreibung,
        faelligAm:    a.faellig_am,
        prioritaet:   a.prioritaet,
        projektName,
        kundeName,
        linkUrl:      `${baseUrl}/dashboard/aufgaben`,
        branding:     branding ?? undefined,
      })
      await sendMail({ to: tm.email, subject, html })
      void kontext
      return
    }

    // Kunde
    if (a.assignee_kunde && a.kunde_id) {
      const { data: client } = await supabase
        .from('client_users')
        .select('email, vorname')
        .eq('kunde_id', a.kunde_id)
        .eq('rolle', 'inhaber')
        .eq('aktiv', true)
        .limit(1)
        .maybeSingle()
      if (!client?.email) return
      const { subject, html } = aufgabeZuweisungKundeMail({
        empfaengerName: (client.vorname as string | null) ?? 'dort',
        aufgabeTitel:   a.titel,
        beschreibung:   a.beschreibung,
        faelligAm:      a.faellig_am,
        projektName,
        portalUrl:      `${baseUrl}/portal/dashboard`,
        branding:       branding ?? undefined,
      })
      await sendMail({ to: client.email, subject, html })
    }
  } catch (e) {
    console.error('[notifyAufgabeZuweisung]', e)
  }
}

// ── Filter & Read ─────────────────────────────────────────────

export interface AufgabenFilter {
  status?:        AufgabeStatus | 'alle'
  assignee?:      string | 'mir' | 'kunde' | 'alle'
  faellig?:       'heute' | 'woche' | 'ueberfaellig' | 'alle'
  projektId?:     string
  kundeId?:       string
  raumId?:        string
  tag?:           string
  suche?:         string
  nurKundenSichtbar?: boolean
  /** true = NUR archivierte; false/undefined = NUR aktive */
  archiviert?:    boolean
}

/** Alle Aufgaben einer Org mit optionalen Filtern. */
export async function getAufgaben(filter: AufgabenFilter = {}): Promise<AufgabeMitDetails[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()

  let q = supabase
    .from('aufgaben')
    .select(`
      *,
      projekt:projekte(id, name),
      kunde:kunden(id, name),
      raum:raeume(id, name)
    `)
    .eq('organisation_id', orgId)
    .order('reihenfolge', { ascending: true })
    .order('created_at', { ascending: false })

  if (filter.status && filter.status !== 'alle') q = q.eq('status', filter.status)
  if (filter.projektId) q = q.eq('projekt_id', filter.projektId)
  if (filter.kundeId)   q = q.eq('kunde_id', filter.kundeId)
  if (filter.raumId)    q = q.eq('raum_id', filter.raumId)
  if (filter.tag)       q = q.contains('tags', [filter.tag])
  if (filter.nurKundenSichtbar) {
    q = q.or('assignee_kunde.eq.true,sichtbar_fuer_kunde.eq.true')
  }
  // Archiv-Filter: standardmaessig nur aktive Aufgaben (archiviert_am IS NULL)
  if (filter.archiviert === true) {
    q = q.not('archiviert_am', 'is', null)
  } else {
    q = q.is('archiviert_am', null)
  }

  if (filter.assignee === 'mir' && user) q = q.eq('assignee_user_id', user.id)
  else if (filter.assignee === 'kunde')   q = q.eq('assignee_kunde', true)
  else if (filter.assignee && filter.assignee !== 'alle') q = q.eq('assignee_user_id', filter.assignee)

  const heute = new Date().toISOString().slice(0, 10)
  if (filter.faellig === 'heute') {
    q = q.eq('faellig_am', heute).neq('status', 'erledigt')
  } else if (filter.faellig === 'woche') {
    const inEinerWoche = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    q = q.gte('faellig_am', heute).lte('faellig_am', inEinerWoche).neq('status', 'erledigt')
  } else if (filter.faellig === 'ueberfaellig') {
    q = q.lt('faellig_am', heute).neq('status', 'erledigt')
  }

  if (filter.suche?.trim()) {
    const t = filter.suche.trim().replace(/[%_]/g, '')
    q = q.or(`titel.ilike.%${t}%,beschreibung.ilike.%${t}%`)
  }

  const { data, error } = await q
  if (error) {
    console.error('[getAufgaben]', error.message)
    return []
  }
  return (data ?? []) as unknown as AufgabeMitDetails[]
}

/** Eine Aufgabe (mit Details) per ID laden. */
export async function getAufgabe(id: string): Promise<AufgabeMitDetails | null> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('aufgaben')
    .select(`
      *,
      projekt:projekte(id, name),
      kunde:kunden(id, name),
      raum:raeume(id, name)
    `)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .maybeSingle()
  return (data ?? null) as unknown as AufgabeMitDetails | null
}

/** Anzahl ueberfaelliger offener Aufgaben (fuer Sidebar-Badge). */
export async function getAufgabenUeberfaelligCount(): Promise<number> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const heute = new Date().toISOString().slice(0, 10)
  const { count } = await supabase
    .from('aufgaben')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', orgId)
    .is('archiviert_am', null)
    .neq('status', 'erledigt')
    .lt('faellig_am', heute)
  return count ?? 0
}

// ── Activity-Log ─────────────────────────────────────────────

export interface AufgabeAktivitaet {
  id:           string
  user_email:   string | null
  aktion:       string
  details:      Record<string, unknown> | null
  created_at:   string
}

export async function getAufgabeAktivitaet(aufgabeId: string): Promise<AufgabeAktivitaet[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('audit_log')
    .select('id, user_email, aktion, details, created_at')
    .eq('organisation_id', orgId)
    .eq('entitaet_typ', 'aufgabe')
    .eq('entitaet_id', aufgabeId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as AufgabeAktivitaet[]
}

// ── Archivieren ──────────────────────────────────────────────

export async function aufgabeArchivieren(id: string): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('aufgaben')
    .update({ archiviert_am: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Konnte Aufgabe nicht archivieren.' }
  await auditLog({
    aktion:        'aufgabe_aktualisiert',
    entitaet_typ:  'aufgabe',
    entitaet_id:   id,
    details:       { archiviert: true },
  })
  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

export async function aufgabeWiederherstellen(id: string): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('aufgaben')
    .update({ archiviert_am: null })
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Konnte Aufgabe nicht wiederherstellen.' }
  await auditLog({
    aktion:        'aufgabe_aktualisiert',
    entitaet_typ:  'aufgabe',
    entitaet_id:   id,
    details:       { wiederhergestellt: true },
  })
  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

// ── Anlegen / Aktualisieren ──────────────────────────────────

export interface AufgabeInput {
  titel:               string
  beschreibung?:       string | null
  status?:             AufgabeStatus
  prioritaet?:         AufgabePrioritaet
  faellig_am?:         string | null
  assignee_user_id?:   string | null
  assignee_kunde?:     boolean
  sichtbar_fuer_kunde?: boolean
  tags?:               string[]
  label_ids?:          string[]
  kunde_id?:           string | null
  projekt_id?:         string | null
  raum_id?:            string | null
  raum_produkte_id?:   string | null
  bestellung_id?:      string | null
  checklist?:          AufgabeChecklistItem[]
}

/** Neue Aufgabe anlegen. */
export async function aufgabeAnlegen(input: AufgabeInput): Promise<{ id?: string; fehler?: string }> {
  const titel = input.titel.trim()
  if (!titel) return { fehler: 'Titel darf nicht leer sein.' }
  if (titel.length > 200) return { fehler: 'Titel zu lang (max 200 Zeichen).' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()

  // Hoechste Reihenfolge in Ziel-Spalte ermitteln, +1
  const status = input.status ?? 'backlog'
  const { data: maxRow } = await supabase
    .from('aufgaben')
    .select('reihenfolge')
    .eq('organisation_id', orgId)
    .eq('status', status)
    .order('reihenfolge', { ascending: false })
    .limit(1)
    .maybeSingle()
  const naechsteReihenfolge = (maxRow?.reihenfolge ?? -1) + 1

  const { data, error } = await supabase
    .from('aufgaben')
    .insert({
      organisation_id:     orgId,
      titel,
      beschreibung:        input.beschreibung ?? null,
      status,
      reihenfolge:         naechsteReihenfolge,
      prioritaet:          input.prioritaet ?? 'normal',
      faellig_am:          input.faellig_am ?? null,
      assignee_user_id:    input.assignee_user_id ?? null,
      assignee_kunde:      input.assignee_kunde ?? false,
      sichtbar_fuer_kunde: input.sichtbar_fuer_kunde ?? false,
      tags:                input.tags ?? [],
      kunde_id:            input.kunde_id ?? null,
      projekt_id:          input.projekt_id ?? null,
      raum_id:             input.raum_id ?? null,
      raum_produkte_id:    input.raum_produkte_id ?? null,
      bestellung_id:       input.bestellung_id ?? null,
      checklist:           input.checklist ?? [],
      label_ids:           input.label_ids ?? [],
      quelle:              'manuell',
      erstellt_von:        user?.id ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[aufgabeAnlegen]', error?.message)
    return { fehler: 'Konnte Aufgabe nicht speichern.' }
  }

  await auditLog({
    aktion:        'aufgabe_angelegt',
    entitaet_typ:  'aufgabe',
    entitaet_id:   data.id,
    entitaet_name: titel,
    details:       { status, projekt_id: input.projekt_id, kunde_id: input.kunde_id },
  })

  // Notification an assignee bei manueller Anlage
  if (input.assignee_user_id || input.assignee_kunde) {
    void notifyAufgabeZuweisung(data.id, 'erstellt')
  }

  revalidatePath('/dashboard/aufgaben')
  if (input.projekt_id) revalidatePath(`/dashboard/projekte/${input.projekt_id}`)
  return { id: data.id }
}

/** Vorhandene Aufgabe aktualisieren (partial). */
export async function aufgabeAktualisieren(
  id: string,
  patch: Partial<AufgabeInput>,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  if (patch.titel !== undefined) {
    const titel = patch.titel.trim()
    if (!titel) return { fehler: 'Titel darf nicht leer sein.' }
    if (titel.length > 200) return { fehler: 'Titel zu lang.' }
    patch.titel = titel
  }

  // Vor-Werte fuer Assignee-Aenderungs-Check laden
  const { data: vorher } = await supabase
    .from('aufgaben')
    .select('assignee_user_id, assignee_kunde')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .maybeSingle()

  const update: Record<string, unknown> = { ...patch }
  const { error } = await supabase
    .from('aufgaben')
    .update(update)
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Konnte Aufgabe nicht aktualisieren.' }

  await auditLog({
    aktion:        'aufgabe_aktualisiert',
    entitaet_typ:  'aufgabe',
    entitaet_id:   id,
    details:       { felder: Object.keys(patch) },
  })

  // Notification: hat sich Assignee geaendert (auf einen NEUEN Wert)?
  const neuerUser  = patch.assignee_user_id !== undefined
                  && patch.assignee_user_id !== vorher?.assignee_user_id
                  && patch.assignee_user_id != null
  const neuerKunde = patch.assignee_kunde === true && vorher?.assignee_kunde !== true
  if (neuerUser || neuerKunde) {
    void notifyAufgabeZuweisung(id, 'aktualisiert')
  }

  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

/** Status (Spalte) aendern und optional auch sortieren. */
export async function aufgabeStatusAendern(
  id: string,
  neuerStatus: AufgabeStatus,
  neueReihenfolge?: number,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: aktuell } = await supabase
    .from('aufgaben')
    .select('status')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!aktuell) return { fehler: 'Aufgabe nicht gefunden.' }

  const update: Record<string, unknown> = { status: neuerStatus }
  if (typeof neueReihenfolge === 'number') update.reihenfolge = neueReihenfolge
  if (neuerStatus === 'erledigt') update.erledigt_am = new Date().toISOString()
  else if (aktuell.status === 'erledigt') update.erledigt_am = null

  const { error } = await supabase
    .from('aufgaben')
    .update(update)
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Status konnte nicht aktualisiert werden.' }

  await auditLog({
    aktion:        'aufgabe_status_geaendert',
    entitaet_typ:  'aufgabe',
    entitaet_id:   id,
    details:       { von: aktuell.status, zu: neuerStatus },
  })

  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

/**
 * Bulk-Update fuer Drag&Drop:
 *  - alle uebergebenen Tupel werden in einer Transaktion auf
 *    {status, reihenfolge} gesetzt.
 */
export async function aufgabeReihenfolgeAendern(
  updates: { id: string; status: AufgabeStatus; reihenfolge: number }[],
): Promise<{ erfolg?: boolean; fehler?: string }> {
  if (updates.length === 0) return { erfolg: true }
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Sequentielle Updates — Supabase JS hat keine Bulk-Update-API
  for (const u of updates) {
    const update: Record<string, unknown> = {
      status:      u.status,
      reihenfolge: u.reihenfolge,
    }
    if (u.status === 'erledigt') update.erledigt_am = new Date().toISOString()
    const { error } = await supabase
      .from('aufgaben')
      .update(update)
      .eq('id', u.id)
      .eq('organisation_id', orgId)
    if (error) {
      console.error('[aufgabeReihenfolgeAendern]', error.message)
      return { fehler: 'Konnte Reihenfolge nicht speichern.' }
    }
  }

  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

/** Aufgabe loeschen. */
export async function aufgabeLoeschen(id: string): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: aufgabe } = await supabase
    .from('aufgaben')
    .select('titel')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!aufgabe) return { fehler: 'Aufgabe nicht gefunden.' }

  const { error } = await supabase
    .from('aufgaben')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Konnte Aufgabe nicht loeschen.' }

  await auditLog({
    aktion:        'aufgabe_geloescht',
    entitaet_typ:  'aufgabe',
    entitaet_id:   id,
    entitaet_name: aufgabe.titel,
  })

  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

// ── Checkliste ────────────────────────────────────────────────

export async function aufgabeChecklistAktualisieren(
  id: string,
  items: AufgabeChecklistItem[],
): Promise<{ erfolg?: boolean; fehler?: string }> {
  if (items.length > 50) return { fehler: 'Maximal 50 Checklist-Items.' }
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('aufgaben')
    .update({ checklist: items })
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Konnte Checkliste nicht speichern.' }
  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

// ── Anhang-Upload ─────────────────────────────────────────────

export async function aufgabeAnhangHochladen(
  id: string,
  formData: FormData,
): Promise<{ url?: string; fehler?: string }> {
  const file = formData.get('datei') as File | null
  if (!file) return { fehler: 'Keine Datei.' }
  if (file.size > 50 * 1024 * 1024) return { fehler: 'Datei zu gross (max 50 MB).' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Aufgabe muss zur Org gehoeren
  const { data: aufgabe } = await supabase
    .from('aufgaben')
    .select('anhang_urls')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!aufgabe) return { fehler: 'Aufgabe nicht gefunden.' }

  // Pfad-Convention: <org_id>/<aufgabe_id>/<random>-<filename>
  const ext = file.name.split('.').pop() ?? 'bin'
  const sicherer_name = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  const pfad = `${orgId}/${id}/${crypto.randomBytes(6).toString('hex')}-${sicherer_name}`

  const { error: uploadErr } = await supabase.storage
    .from('aufgaben-anhaenge')
    .upload(pfad, file, { contentType: file.type, upsert: false })
  if (uploadErr) {
    console.error('[aufgabeAnhangHochladen]', uploadErr.message)
    return { fehler: 'Upload fehlgeschlagen.' }
  }

  // Wir geben den Storage-Pfad zurueck — Frontend laedt via signierten URLs
  const neuerAnhang: AufgabeAnhang = {
    name:        sicherer_name,
    url:         pfad,
    uploaded_at: new Date().toISOString(),
    mime:        file.type ?? null,
    size:        file.size,
  }
  // ext nur als Fallback fuer Display
  void ext
  const aktuell = (aufgabe.anhang_urls as AufgabeAnhang[] | null) ?? []
  const { error } = await supabase
    .from('aufgaben')
    .update({ anhang_urls: [...aktuell, neuerAnhang] })
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Datei hochgeladen, aber Verknuepfung fehlgeschlagen.' }

  revalidatePath('/dashboard/aufgaben')
  return { url: pfad }
}

/** Signierte URL fuer einen Anhang (60 min gueltig). */
export async function aufgabeAnhangSigniert(
  pfad: string,
): Promise<{ url?: string; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  if (!pfad.startsWith(orgId + '/')) return { fehler: 'Ungueltiger Pfad.' }

  const { data, error } = await supabase.storage
    .from('aufgaben-anhaenge')
    .createSignedUrl(pfad, 3600)
  if (error || !data) return { fehler: 'Signierte URL fehlgeschlagen.' }
  return { url: data.signedUrl }
}

/** Anhang aus Storage + aufgabe.anhang_urls entfernen. */
export async function aufgabeAnhangEntfernen(
  aufgabeId: string,
  pfad: string,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  if (!pfad.startsWith(orgId + '/')) return { fehler: 'Ungueltiger Pfad.' }

  const { data: aufgabe } = await supabase
    .from('aufgaben')
    .select('anhang_urls')
    .eq('id', aufgabeId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!aufgabe) return { fehler: 'Aufgabe nicht gefunden.' }

  // Aus Storage loeschen — Fehler hier sind nicht kritisch
  await supabase.storage.from('aufgaben-anhaenge').remove([pfad]).catch(() => null)

  const aktuell = (aufgabe.anhang_urls as AufgabeAnhang[] | null) ?? []
  const neu = aktuell.filter((a) => a.url !== pfad)
  const { error } = await supabase
    .from('aufgaben')
    .update({ anhang_urls: neu })
    .eq('id', aufgabeId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Konnte Anhang nicht entfernen.' }

  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

// ── Kommentare ────────────────────────────────────────────────

export async function aufgabenKommentareAbrufen(
  aufgabeId: string,
): Promise<AufgabeKommentar[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('aufgaben_kommentare')
    .select('*')
    .eq('aufgabe_id', aufgabeId)
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: true })
  return (data ?? []) as AufgabeKommentar[]
}

export async function aufgabenKommentarAnlegen(
  aufgabeId: string,
  inhalt: string,
): Promise<{ id?: string; fehler?: string }> {
  const text = inhalt.trim()
  if (!text) return { fehler: 'Kommentar darf nicht leer sein.' }
  if (text.length > 4000) return { fehler: 'Kommentar zu lang.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()

  // Nutzer-Name aus team_mitglieder/auth.users metadata holen
  const autorName =
    user?.user_metadata?.full_name as string | undefined
    ?? (user?.email?.split('@')[0] ?? null)

  const { data, error } = await supabase
    .from('aufgaben_kommentare')
    .insert({
      organisation_id: orgId,
      aufgabe_id:      aufgabeId,
      autor_user_id:   user?.id ?? null,
      autor_name:      autorName ?? null,
      ist_kunde:       false,
      inhalt:          text,
    })
    .select('id')
    .single()
  if (error || !data) return { fehler: 'Kommentar konnte nicht gespeichert werden.' }

  revalidatePath('/dashboard/aufgaben')
  return { id: data.id }
}

export async function aufgabenKommentarAktualisieren(
  kommentarId: string,
  inhalt: string,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const text = inhalt.trim()
  if (!text) return { fehler: 'Kommentar darf nicht leer sein.' }
  if (text.length > 4000) return { fehler: 'Kommentar zu lang.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { fehler: 'Nicht angemeldet.' }

  // Nur eigene Kommentare bearbeiten
  const { data: k } = await supabase
    .from('aufgaben_kommentare')
    .select('autor_user_id')
    .eq('id', kommentarId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!k) return { fehler: 'Kommentar nicht gefunden.' }
  if (k.autor_user_id !== user.id) return { fehler: 'Nur eigene Kommentare koennen bearbeitet werden.' }

  const { error } = await supabase
    .from('aufgaben_kommentare')
    .update({ inhalt: text })
    .eq('id', kommentarId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Kommentar konnte nicht aktualisiert werden.' }
  return { erfolg: true }
}

export async function aufgabenKommentarLoeschen(
  kommentarId: string,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { fehler: 'Nicht angemeldet.' }

  // Nur eigene Kommentare loeschen
  const { data: k } = await supabase
    .from('aufgaben_kommentare')
    .select('autor_user_id')
    .eq('id', kommentarId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!k) return { fehler: 'Kommentar nicht gefunden.' }
  if (k.autor_user_id !== user.id) return { fehler: 'Nur eigene Kommentare koennen geloescht werden.' }

  const { error } = await supabase
    .from('aufgaben_kommentare')
    .delete()
    .eq('id', kommentarId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Kommentar konnte nicht geloescht werden.' }
  return { erfolg: true }
}

// ── Auto-Sync ─────────────────────────────────────────────────

export type AufgabeAutoQuelle = Exclude<AufgabeQuelle, 'manuell' | 'kunde_anfrage'>

export interface SyncAufgabeDaten {
  titel:               string
  beschreibung?:       string | null
  status?:             AufgabeStatus
  prioritaet?:         AufgabePrioritaet
  faellig_am?:         string | null
  kunde_id?:           string | null
  projekt_id?:         string | null
  raum_id?:            string | null
  raum_produkte_id?:   string | null
  bestellung_id?:      string | null
  sichtbar_fuer_kunde?: boolean
  assignee_user_id?:   string | null
}

/**
 * Idempotenter Auto-Sync — analog zu syncAutoEvent in timeline.ts.
 * Quelle/quelleId muessen eindeutig sein (Unique-Partial-Index).
 * Mit optionen.loeschen=true wird der Eintrag entfernt; mit
 * optionen.erledigt=true wird Status auf 'erledigt' gesetzt.
 *
 * Failsafe: Fehler werden geloggt aber nie geworfen — Aufrufer-Action
 * laeuft weiter.
 */
export async function syncAufgabeAusQuelle(
  quelle:   AufgabeAutoQuelle,
  quelleId: string,
  daten:    SyncAufgabeDaten | null,
  optionen?: { loeschen?: boolean; erledigt?: boolean },
): Promise<{ error?: string; action?: 'created' | 'updated' | 'deleted' | 'noop' }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrganisationId()

    if (optionen?.loeschen) {
      const { error } = await supabase
        .from('aufgaben')
        .delete()
        .eq('organisation_id', orgId)
        .eq('quelle', quelle)
        .eq('quelle_id', quelleId)
      if (error) {
        console.error(`[syncAufgabe:delete:${quelle}]`, error.message)
        return { error: error.message, action: 'noop' }
      }
      revalidatePath('/dashboard/aufgaben')
      return { action: 'deleted' }
    }

    if (!daten) return { action: 'noop' }

    // Existiert bereits?
    const { data: existing } = await supabase
      .from('aufgaben')
      .select('id, status')
      .eq('organisation_id', orgId)
      .eq('quelle', quelle)
      .eq('quelle_id', quelleId)
      .maybeSingle()

    const status: AufgabeStatus =
      optionen?.erledigt
        ? 'erledigt'
        : (daten.status ?? (existing?.status as AufgabeStatus | undefined) ?? 'backlog')

    const payload: Record<string, unknown> = {
      titel:                daten.titel,
      beschreibung:         daten.beschreibung ?? null,
      status,
      prioritaet:           daten.prioritaet ?? 'normal',
      faellig_am:           daten.faellig_am ?? null,
      kunde_id:             daten.kunde_id ?? null,
      projekt_id:           daten.projekt_id ?? null,
      raum_id:              daten.raum_id ?? null,
      raum_produkte_id:     daten.raum_produkte_id ?? null,
      bestellung_id:        daten.bestellung_id ?? null,
      sichtbar_fuer_kunde:  daten.sichtbar_fuer_kunde ?? false,
      assignee_user_id:     daten.assignee_user_id ?? null,
    }
    if (status === 'erledigt' && existing?.status !== 'erledigt') {
      payload.erledigt_am = new Date().toISOString()
    } else if (status !== 'erledigt' && existing?.status === 'erledigt') {
      payload.erledigt_am = null
    }

    if (existing) {
      const { error } = await supabase
        .from('aufgaben')
        .update(payload)
        .eq('id', existing.id)
        .eq('organisation_id', orgId)
      if (error) {
        console.error(`[syncAufgabe:update:${quelle}]`, error.message)
        return { error: error.message }
      }
      revalidatePath('/dashboard/aufgaben')
      return { action: 'updated' }
    } else {
      // Neue Auto-Aufgabe — naechste Reihenfolge in Ziel-Spalte ermitteln
      const { data: maxRow } = await supabase
        .from('aufgaben')
        .select('reihenfolge')
        .eq('organisation_id', orgId)
        .eq('status', status)
        .order('reihenfolge', { ascending: false })
        .limit(1)
        .maybeSingle()
      const reihenfolge = (maxRow?.reihenfolge ?? -1) + 1

      const { error } = await supabase
        .from('aufgaben')
        .insert({
          organisation_id: orgId,
          quelle,
          quelle_id:       quelleId,
          reihenfolge,
          ...payload,
        })
      if (error) {
        console.error(`[syncAufgabe:insert:${quelle}]`, error.message)
        return { error: error.message }
      }
      revalidatePath('/dashboard/aufgaben')
      return { action: 'created' }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unbekannter Sync-Fehler'
    console.error(`[syncAufgabe:catch:${quelle}]`, msg)
    return { error: msg }
  }
}

// Re-Export Aufgabe-Typ fuer Konsumenten (vermeidet zusaetzliche Imports im Frontend)
export type { Aufgabe }

// ── Picker-Optionen ───────────────────────────────────────────

export interface AufgabePickerProjekt { id: string; name: string; kunde_id: string | null }
export interface AufgabePickerKunde   { id: string; name: string }
export interface AufgabePickerRaum    { id: string; name: string; projekt_id: string }
export interface AufgabePickerTeamMitglied {
  user_id:  string
  name:     string
  email:    string | null
  avatarUrl: string | null
}
export interface AufgabePickerLabel { id: string; name: string; farbe: string }

export interface AufgabePickerOptionen {
  projekte: AufgabePickerProjekt[]
  kunden:   AufgabePickerKunde[]
  raeume:   AufgabePickerRaum[]
  team:     AufgabePickerTeamMitglied[]
  labels:   AufgabePickerLabel[]
  /** Aktueller User — fuer 'Mir zuweisen'-Button + Mir-Filter */
  currentUserId: string | null
}

/** Listen fuer Projekt-/Kunde-/Raum-/Team-Picker im Aufgaben-Formular. */
export async function getAufgabePickerOptionen(): Promise<AufgabePickerOptionen> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()

  const [projekteRes, kundenRes, raeumeRes, teamRes, labelsRes] = await Promise.all([
    supabase
      .from('projekte')
      .select('id, name, kunde_id')
      .eq('organisation_id', orgId)
      .is('deleted_at', null)
      .eq('archiviert', false)
      .neq('status', 'abgeschlossen')
      .order('name', { ascending: true }),
    supabase
      .from('kunden')
      .select('id, name')
      .eq('organisation_id', orgId)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    supabase
      .from('raeume')
      .select('id, name, projekt_id')
      .eq('organisation_id', orgId)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    supabase
      .from('team_mitglieder')
      .select('user_id, vorname, nachname, email, avatar_url, status')
      .eq('organisation_id', orgId)
      .neq('status', 'deaktiviert')
      .order('vorname', { ascending: true, nullsFirst: false }),
    supabase
      .from('aufgaben_labels')
      .select('id, name, farbe')
      .eq('organisation_id', orgId)
      .order('reihenfolge', { ascending: true })
      .order('name', { ascending: true }),
  ])

  type TeamRow = {
    user_id: string | null
    vorname: string | null
    nachname: string | null
    email: string | null
    avatar_url: string | null
  }
  const team: AufgabePickerTeamMitglied[] = ((teamRes.data ?? []) as TeamRow[])
    .filter((t) => !!t.user_id)
    .map((t) => ({
      user_id:   t.user_id as string,
      name:      [t.vorname, t.nachname].filter(Boolean).join(' ').trim()
                  || (t.email?.split('@')[0] ?? 'Unbenannt'),
      email:     t.email ?? null,
      avatarUrl: t.avatar_url ?? null,
    }))

  return {
    projekte: (projekteRes.data ?? []) as AufgabePickerProjekt[],
    kunden:   (kundenRes.data   ?? []) as AufgabePickerKunde[],
    raeume:   (raeumeRes.data   ?? []) as AufgabePickerRaum[],
    team,
    labels:   (labelsRes.data   ?? []) as AufgabePickerLabel[],
    currentUserId: user?.id ?? null,
  }
}

// ── Label-CRUD ───────────────────────────────────────────────

export async function getLabels(): Promise<import('@/lib/supabase/types').AufgabeLabel[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('aufgaben_labels')
    .select('*')
    .eq('organisation_id', orgId)
    .order('reihenfolge', { ascending: true })
    .order('name', { ascending: true })
  return (data ?? []) as import('@/lib/supabase/types').AufgabeLabel[]
}

export async function labelAnlegen(input: {
  name: string
  farbe?: string
}): Promise<{ id?: string; fehler?: string }> {
  const name = input.name.trim()
  if (!name) return { fehler: 'Name darf nicht leer sein.' }
  if (name.length > 40) return { fehler: 'Name zu lang (max 40 Zeichen).' }
  const farbe = (input.farbe ?? '#94c1a4').toLowerCase()
  if (!/^#[0-9a-f]{6}$/.test(farbe)) return { fehler: 'Ungueltige Farbe (HEX erwartet).' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: maxRow } = await supabase
    .from('aufgaben_labels')
    .select('reihenfolge')
    .eq('organisation_id', orgId)
    .order('reihenfolge', { ascending: false })
    .limit(1)
    .maybeSingle()
  const reihenfolge = (maxRow?.reihenfolge ?? -1) + 1

  const { data, error } = await supabase
    .from('aufgaben_labels')
    .insert({ organisation_id: orgId, name, farbe, reihenfolge })
    .select('id')
    .single()
  if (error || !data) {
    if (error?.code === '23505') return { fehler: 'Label-Name existiert bereits.' }
    return { fehler: 'Konnte Label nicht anlegen.' }
  }
  revalidatePath('/dashboard/aufgaben')
  return { id: data.id }
}

export async function labelAktualisieren(
  id: string,
  patch: { name?: string; farbe?: string },
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) return { fehler: 'Name darf nicht leer sein.' }
    if (name.length > 40) return { fehler: 'Name zu lang.' }
    update.name = name
  }
  if (patch.farbe !== undefined) {
    const farbe = patch.farbe.toLowerCase()
    if (!/^#[0-9a-f]{6}$/.test(farbe)) return { fehler: 'Ungueltige Farbe.' }
    update.farbe = farbe
  }

  const { error } = await supabase
    .from('aufgaben_labels')
    .update(update)
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) {
    if (error.code === '23505') return { fehler: 'Label-Name existiert bereits.' }
    return { fehler: 'Konnte Label nicht aktualisieren.' }
  }
  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

export async function labelLoeschen(id: string): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Aus allen aufgaben.label_ids entfernen (nur Aufgaben die diesen Label tragen)
  // Effizient via array_remove auf SQL-Ebene — aber Supabase-JS hat das nicht,
  // also: lade alle betroffenen, update einzeln. Bei wenigen Labels ok.
  const { data: betroffen } = await supabase
    .from('aufgaben')
    .select('id, label_ids')
    .eq('organisation_id', orgId)
    .contains('label_ids', [id])
  for (const a of betroffen ?? []) {
    const neu = (a.label_ids as string[]).filter((x) => x !== id)
    await supabase
      .from('aufgaben')
      .update({ label_ids: neu })
      .eq('id', a.id)
      .eq('organisation_id', orgId)
  }

  const { error } = await supabase
    .from('aufgaben_labels')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Konnte Label nicht loeschen.' }
  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

/** Label-IDs einer Aufgabe ersetzen. */
export async function aufgabeLabelsSetzen(
  aufgabeId: string,
  labelIds: string[],
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('aufgaben')
    .update({ label_ids: labelIds })
    .eq('id', aufgabeId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Konnte Labels nicht speichern.' }
  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

// ── Admin-Variante (fuer anon-Kontexte wie Onboarding-Submission) ─

/**
 * Wie syncAufgabeAusQuelle, aber mit explizitem orgId und createAdminClient.
 * Wird aus anonymen/Token-basierten Actions aufgerufen, die keinen
 * Auth-Kontext haben (z.B. Onboarding-Absenden via Public-Token).
 *
 * Failsafe — Fehler werden nur geloggt und nie geworfen.
 */
export async function syncAufgabeAusQuelleAdmin(
  orgId: string,
  quelle:   AufgabeAutoQuelle,
  quelleId: string,
  daten:    SyncAufgabeDaten | null,
  optionen?: { loeschen?: boolean; erledigt?: boolean },
): Promise<void> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    if (optionen?.loeschen) {
      await admin
        .from('aufgaben')
        .delete()
        .eq('organisation_id', orgId)
        .eq('quelle', quelle)
        .eq('quelle_id', quelleId)
      return
    }

    if (!daten) return

    const { data: existing } = await admin
      .from('aufgaben')
      .select('id, status')
      .eq('organisation_id', orgId)
      .eq('quelle', quelle)
      .eq('quelle_id', quelleId)
      .maybeSingle()

    const status: AufgabeStatus =
      optionen?.erledigt
        ? 'erledigt'
        : (daten.status ?? (existing?.status as AufgabeStatus | undefined) ?? 'backlog')

    const payload: Record<string, unknown> = {
      titel:                daten.titel,
      beschreibung:         daten.beschreibung ?? null,
      status,
      prioritaet:           daten.prioritaet ?? 'normal',
      faellig_am:           daten.faellig_am ?? null,
      kunde_id:             daten.kunde_id ?? null,
      projekt_id:           daten.projekt_id ?? null,
      raum_id:              daten.raum_id ?? null,
      raum_produkte_id:     daten.raum_produkte_id ?? null,
      bestellung_id:        daten.bestellung_id ?? null,
      sichtbar_fuer_kunde:  daten.sichtbar_fuer_kunde ?? false,
      assignee_user_id:     daten.assignee_user_id ?? null,
    }
    if (status === 'erledigt' && existing?.status !== 'erledigt') {
      payload.erledigt_am = new Date().toISOString()
    } else if (status !== 'erledigt' && existing?.status === 'erledigt') {
      payload.erledigt_am = null
    }

    if (existing) {
      await admin
        .from('aufgaben')
        .update(payload)
        .eq('id', existing.id)
        .eq('organisation_id', orgId)
    } else {
      const { data: maxRow } = await admin
        .from('aufgaben')
        .select('reihenfolge')
        .eq('organisation_id', orgId)
        .eq('status', status)
        .order('reihenfolge', { ascending: false })
        .limit(1)
        .maybeSingle()
      const reihenfolge = (maxRow?.reihenfolge ?? -1) + 1
      await admin.from('aufgaben').insert({
        organisation_id: orgId,
        quelle,
        quelle_id:       quelleId,
        reihenfolge,
        ...payload,
      })
    }
  } catch (e) {
    console.error(`[syncAufgabeAdmin:${quelle}]`, e)
  }
}
