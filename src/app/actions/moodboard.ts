'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { auditLog } from '@/lib/audit'
import type { Moodboard, MoodboardVersion, MoodboardKommentar } from '@/lib/supabase/types'
import crypto from 'crypto'

// ── Moodboard CRUD ─────────────────────────────────────────────

/** Holt das Moodboard fuer einen Raum oder legt eins an wenn noch nicht vorhanden. */
export async function getOrCreateMoodboard(raumId: string): Promise<Moodboard | null> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: existing } = await supabase
    .from('moodboards')
    .select('*')
    .eq('raum_id', raumId)
    .eq('organisation_id', orgId)
    .maybeSingle()

  if (existing) return existing as Moodboard

  // Wir checken vorher ob der Raum zur Org gehoert (RLS macht das auch, aber so
  // bekommen wir saubere Fehlermeldung statt RLS-Permission-Denied).
  const { data: raum } = await supabase
    .from('raeume')
    .select('id, projekt_id')
    .eq('id', raumId)
    .maybeSingle()
  if (!raum) return null

  const { data: angelegt, error } = await supabase
    .from('moodboards')
    .insert({
      organisation_id: orgId,
      raum_id: raumId,
      name: 'Moodboard',
    })
    .select('*')
    .single()
  if (error || !angelegt) return null

  await auditLog({
    aktion:        'moodboard_erstellt' as string,
    entitaet_typ:  'moodboard' as string,
    entitaet_id:   angelegt.id,
    entitaet_name: angelegt.name,
  })

  return angelegt as Moodboard
}

/** Speichert nur den Canvas-State. Wird vom Auto-Save aufgerufen (debounced). */
export async function moodboardSpeichern(
  moodboardId: string,
  canvasJson: Record<string, unknown>,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase
    .from('moodboards')
    .update({ canvas_json: canvasJson })
    .eq('id', moodboardId)
    .eq('organisation_id', orgId)

  if (error) return { fehler: 'Fehler beim Speichern.' }
  return { erfolg: true }
}

/** Aktualisiert Name + Beschreibung. */
export async function moodboardMetaAktualisieren(
  moodboardId: string,
  name: string,
  beschreibung: string | null,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase
    .from('moodboards')
    .update({ name: name.trim(), beschreibung: beschreibung?.trim() || null })
    .eq('id', moodboardId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Aktualisieren.' }

  revalidatePath('/dashboard/moodboards')
  return { erfolg: true }
}


// ── Versionen (analog Raumplaner) ──────────────────────────────

export async function moodboardVersionSpeichern(
  moodboardId: string,
  name: string,
  beschreibung: string | null,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  if (!name.trim()) return { fehler: 'Name ist erforderlich.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()

  // Aktuellen Canvas-State laden
  const { data: board } = await supabase
    .from('moodboards')
    .select('canvas_json, organisation_id')
    .eq('id', moodboardId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!board) return { fehler: 'Moodboard nicht gefunden.' }

  const { error } = await supabase.from('moodboard_versionen').insert({
    organisation_id: orgId,
    moodboard_id:    moodboardId,
    name:            name.trim(),
    beschreibung:    beschreibung?.trim() || null,
    canvas_json:     board.canvas_json ?? {},
    erstellt_von:    user?.id ?? null,
  })
  if (error) return { fehler: 'Fehler beim Speichern der Version.' }

  return { erfolg: true }
}

export async function getMoodboardVersionen(moodboardId: string): Promise<MoodboardVersion[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('moodboard_versionen')
    .select('*')
    .eq('moodboard_id', moodboardId)
    .order('created_at', { ascending: false })
  return (data ?? []) as MoodboardVersion[]
}

export async function moodboardVersionLoeschen(
  versionId: string,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('moodboard_versionen')
    .delete()
    .eq('id', versionId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Löschen.' }
  return { erfolg: true }
}

/** Laedt eine Version zurueck in den aktuellen Moodboard-State. */
export async function moodboardVersionWiederherstellen(
  moodboardId: string,
  versionId: string,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: ver } = await supabase
    .from('moodboard_versionen')
    .select('canvas_json')
    .eq('id', versionId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!ver) return { fehler: 'Version nicht gefunden.' }

  const { error } = await supabase
    .from('moodboards')
    .update({ canvas_json: ver.canvas_json })
    .eq('id', moodboardId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Wiederherstellen.' }
  return { erfolg: true }
}


// ── Bild-Upload via Storage ────────────────────────────────────

export async function moodboardBildHochladen(
  raumId: string,
  formData: FormData,
): Promise<{ url?: string; fehler?: string }> {
  const file = formData.get('bild') as File | null
  if (!file) return { fehler: 'Kein Bild übermittelt.' }
  if (!file.type.startsWith('image/')) return { fehler: 'Nur Bilder sind erlaubt.' }
  if (file.size > 50 * 1024 * 1024) return { fehler: 'Bild zu groß (max. 50 MB).' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const admin = createAdminClient()

  const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const name = `${orgId}/${raumId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadErr } = await admin.storage
    .from('moodboard-bilder')
    .upload(name, file, { contentType: file.type, upsert: false })
  if (uploadErr) return { fehler: 'Fehler beim Upload.' }

  // Signed URL fuer 1 Jahr (Editor-Anzeige). Im Kunden-Portal koennen wir
  // nochmal frische signed URLs ausgeben.
  const { data: signed } = await admin.storage
    .from('moodboard-bilder')
    .createSignedUrl(name, 60 * 60 * 24 * 365)
  if (!signed?.signedUrl) return { fehler: 'Konnte Signed URL nicht erstellen.' }

  void supabase // silence unused
  return { url: signed.signedUrl }
}


// ── Freigabe-Token ─────────────────────────────────────────────

export async function moodboardFreigabeAktualisieren(
  moodboardId: string,
  aktiv: boolean,
  kommentareAktiv: boolean,
  options?: {
    /** Wenn null → Passwort entfernen. Wenn undefined → unverändert lassen. */
    passwort?: string | null
    /** ISO-Datum oder null. undefined → unverändert. */
    ablauf?: string | null
  },
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const update: Record<string, unknown> = {
    freigabe_aktiv: aktiv,
    freigabe_kommentare_aktiv: kommentareAktiv,
  }
  if (aktiv) update.freigabe_erstellt_am = new Date().toISOString()

  // Passwort-Handling
  if (options && 'passwort' in options) {
    if (options.passwort === null || options.passwort === '') {
      update.freigabe_passwort_hash = null
    } else if (typeof options.passwort === 'string' && options.passwort.length > 0) {
      const bcrypt = await import('bcryptjs')
      update.freigabe_passwort_hash = await bcrypt.hash(options.passwort, 10)
    }
  }

  // Ablaufdatum
  if (options && 'ablauf' in options) {
    update.freigabe_ablauf = options.ablauf ?? null
  }

  const { error } = await supabase
    .from('moodboards')
    .update(update)
    .eq('id', moodboardId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Speichern.' }

  await auditLog({
    aktion:        aktiv ? ('moodboard_freigegeben' as string) : ('moodboard_freigabe_deaktiviert' as string),
    entitaet_typ:  'moodboard' as string,
    entitaet_id:   moodboardId,
  })

  return { erfolg: true }
}

/** Verifiziert ein Passwort fuer einen Freigabe-Token. Wird von der oeffentlichen Seite genutzt. */
export async function moodboardPasswortPruefen(
  token: string,
  passwort: string,
): Promise<{ ok: boolean }> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('moodboards')
    .select('freigabe_passwort_hash, freigabe_aktiv, freigabe_ablauf')
    .eq('freigabe_token', token)
    .maybeSingle()
  if (!data || !data.freigabe_aktiv) return { ok: false }
  if (data.freigabe_ablauf && new Date(data.freigabe_ablauf).getTime() < Date.now()) {
    return { ok: false }
  }
  if (!data.freigabe_passwort_hash) return { ok: true } // Kein Passwort gesetzt
  const bcrypt = await import('bcryptjs')
  const ok = await bcrypt.compare(passwort, data.freigabe_passwort_hash)
  return { ok }
}


// ── Kommentar-Pins ─────────────────────────────────────────────

/** Alle Kommentare eines Moodboards laden (Threaded). */
export async function getMoodboardKommentare(moodboardId: string): Promise<MoodboardKommentar[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('moodboard_kommentare')
    .select('*')
    .eq('moodboard_id', moodboardId)
    .order('created_at', { ascending: true })
  return (data ?? []) as MoodboardKommentar[]
}

/** Top-Level Pin anlegen (Admin). */
export async function moodboardKommentarAnlegen(input: {
  moodboardId: string
  posX: number
  posY: number
  inhalt: string
  bezogenAuf?: string | null
}): Promise<{ id?: string; fehler?: string }> {
  const text = input.inhalt.trim()
  if (!text) return { fehler: 'Kommentar darf nicht leer sein.' }
  if (text.length > 2000) return { fehler: 'Kommentar zu lang (max 2000 Zeichen).' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('moodboard_kommentare')
    .insert({
      organisation_id: orgId,
      moodboard_id:    input.moodboardId,
      parent_id:       null,
      pos_x:           input.posX,
      pos_y:           input.posY,
      bezogen_auf:     input.bezogenAuf ?? null,
      autor_user_id:   user?.id ?? null,
      autor_name:      user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Team',
      autor_email:     user?.email ?? null,
      ist_kunde:       false,
      inhalt:          text,
    })
    .select('id')
    .single()
  if (error || !data) return { fehler: 'Konnte Pin nicht speichern.' }
  return { id: data.id }
}

/** Antwort auf einen Pin (Admin). */
export async function moodboardKommentarAntworten(input: {
  parentId: string
  inhalt: string
}): Promise<{ id?: string; fehler?: string }> {
  const text = input.inhalt.trim()
  if (!text) return { fehler: 'Antwort darf nicht leer sein.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()

  // Parent laden, um moodboard_id zu finden
  const { data: parent } = await supabase
    .from('moodboard_kommentare')
    .select('moodboard_id, organisation_id')
    .eq('id', input.parentId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!parent) return { fehler: 'Pin nicht gefunden.' }

  const { data, error } = await supabase
    .from('moodboard_kommentare')
    .insert({
      organisation_id: orgId,
      moodboard_id:    parent.moodboard_id,
      parent_id:       input.parentId,
      pos_x:           null,
      pos_y:           null,
      autor_user_id:   user?.id ?? null,
      autor_name:      user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Team',
      autor_email:     user?.email ?? null,
      ist_kunde:       false,
      inhalt:          text,
    })
    .select('id')
    .single()
  if (error || !data) return { fehler: 'Konnte Antwort nicht speichern.' }
  return { id: data.id }
}

/** Pin als erledigt markieren / wiederherstellen. */
export async function moodboardKommentarErledigen(
  id: string,
  erledigt: boolean,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('moodboard_kommentare')
    .update({
      erledigt,
      erledigt_am: erledigt ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .is('parent_id', null) // nur Top-Level
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Aktualisierung fehlgeschlagen.' }
  return { erfolg: true }
}

/** Pin loeschen (kaskadiert auf alle Antworten). */
export async function moodboardKommentarLoeschen(
  id: string,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('moodboard_kommentare')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Löschen fehlgeschlagen.' }
  return { erfolg: true }
}

/** Kunde (anonym) legt einen Pin via freigabe_token an. */
export async function moodboardKundenKommentarAnlegen(input: {
  freigabeToken: string
  posX: number
  posY: number
  inhalt: string
  parentId?: string | null
  autorName: string
  autorEmail?: string | null
}): Promise<{ id?: string; fehler?: string }> {
  const text = input.inhalt.trim()
  if (!text) return { fehler: 'Kommentar darf nicht leer sein.' }
  if (text.length > 2000) return { fehler: 'Kommentar zu lang.' }
  const name = input.autorName.trim()
  if (!name) return { fehler: 'Name ist erforderlich.' }

  const admin = createAdminClient()
  // Moodboard via Token finden + Berechtigungen pruefen
  const { data: board } = await admin
    .from('moodboards')
    .select('id, organisation_id, freigabe_aktiv, freigabe_kommentare_aktiv')
    .eq('freigabe_token', input.freigabeToken)
    .maybeSingle()
  if (!board || !board.freigabe_aktiv || !board.freigabe_kommentare_aktiv) {
    return { fehler: 'Kommentare sind aktuell nicht erlaubt.' }
  }

  // Wenn Antwort: parent muss zum gleichen Moodboard gehoeren
  if (input.parentId) {
    const { data: parent } = await admin
      .from('moodboard_kommentare')
      .select('moodboard_id')
      .eq('id', input.parentId)
      .maybeSingle()
    if (!parent || parent.moodboard_id !== board.id) {
      return { fehler: 'Antwort-Ziel nicht gefunden.' }
    }
  }

  const { data, error } = await admin
    .from('moodboard_kommentare')
    .insert({
      organisation_id: board.organisation_id,
      moodboard_id:    board.id,
      parent_id:       input.parentId ?? null,
      pos_x:           input.parentId ? null : input.posX,
      pos_y:           input.parentId ? null : input.posY,
      autor_user_id:   null,
      autor_name:      name.slice(0, 80),
      autor_email:     input.autorEmail?.trim().slice(0, 200) ?? null,
      ist_kunde:       true,
      inhalt:          text,
    })
    .select('id')
    .single()
  if (error || !data) return { fehler: 'Konnte Pin nicht speichern.' }
  return { id: data.id }
}

/** Kommentare via Freigabe-Token laden (Admin-Client, anon). */
export async function getMoodboardKommentareOeffentlich(
  freigabeToken: string,
): Promise<MoodboardKommentar[]> {
  const admin = createAdminClient()
  const { data: board } = await admin
    .from('moodboards')
    .select('id, freigabe_aktiv, freigabe_kommentare_aktiv')
    .eq('freigabe_token', freigabeToken)
    .maybeSingle()
  if (!board || !board.freigabe_aktiv || !board.freigabe_kommentare_aktiv) return []
  const { data } = await admin
    .from('moodboard_kommentare')
    .select('*')
    .eq('moodboard_id', board.id)
    .order('created_at', { ascending: true })
  return (data ?? []) as MoodboardKommentar[]
}


// ── Oeffentliche Freigabe-Ansicht ──────────────────────────────

/** Laedt ein Moodboard via freigabe_token fuer Kunden (Admin-Client, kein Auth). */
export type MoodboardOeffentlichResult =
  | { status: 'ok'
      moodboardId:        string
      name:               string
      beschreibung:       string | null
      canvasJson:         Record<string, unknown> | null
      raumName:           string
      projektName:        string
      kommentareAktiv:    boolean
      organisationId:     string | null
    }
  | { status: 'passwort_erforderlich'; raumName: string; projektName: string }
  | { status: 'abgelaufen' }
  | { status: 'nicht_gefunden' }

export async function getMoodboardOeffentlich(
  token: string,
  passwort?: string,
): Promise<MoodboardOeffentlichResult> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('moodboards')
    .select('id, name, beschreibung, canvas_json, freigabe_aktiv, freigabe_kommentare_aktiv, freigabe_passwort_hash, freigabe_ablauf, organisation_id, raeume!inner(name, projekte!inner(name))')
    .eq('freigabe_token', token)
    .maybeSingle()
  if (!data || !data.freigabe_aktiv) return { status: 'nicht_gefunden' }

  // Ablaufdatum
  if (data.freigabe_ablauf && new Date(data.freigabe_ablauf).getTime() < Date.now()) {
    return { status: 'abgelaufen' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raeume = (data.raeume as any)
  const projekt = raeume?.projekte

  // Passwort-Check
  if (data.freigabe_passwort_hash) {
    if (!passwort) {
      return {
        status: 'passwort_erforderlich',
        raumName: raeume?.name ?? '',
        projektName: projekt?.name ?? '',
      }
    }
    const bcrypt = await import('bcryptjs')
    const ok = await bcrypt.compare(passwort, data.freigabe_passwort_hash)
    if (!ok) {
      return {
        status: 'passwort_erforderlich',
        raumName: raeume?.name ?? '',
        projektName: projekt?.name ?? '',
      }
    }
  }

  return {
    status:          'ok',
    moodboardId:     data.id,
    name:            data.name,
    beschreibung:    data.beschreibung,
    canvasJson:      data.canvas_json,
    raumName:        raeume?.name ?? '',
    projektName:     projekt?.name ?? '',
    kommentareAktiv: data.freigabe_kommentare_aktiv,
    organisationId:  data.organisation_id,
  }
}


// ── Sidebar-Uebersicht (alle Moodboards aller Projekte) ────────

export type MoodboardListEintrag = Moodboard & {
  raum_name:    string
  projekt_id:   string
  projekt_name: string
  kunde_name:   string | null
}

export async function getAlleMoodboards(): Promise<MoodboardListEintrag[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('moodboards')
    .select('*, raeume!inner(id, name, projekt_id, projekte!inner(id, name, kunden(name)))')
    .order('updated_at', { ascending: false })

  type Row = Moodboard & {
    raeume: {
      id: string
      name: string
      projekt_id: string
      projekte: {
        id: string
        name: string
        kunden: { name: string } | null
      } | null
    } | null
  }
  return ((data ?? []) as unknown as Row[])
    .map((r) => {
      if (!r.raeume?.projekte) return null
      return {
        ...r,
        raum_name:    r.raeume.name,
        projekt_id:   r.raeume.projekte.id,
        projekt_name: r.raeume.projekte.name,
        kunde_name:   r.raeume.projekte.kunden?.name ?? null,
      } as MoodboardListEintrag
    })
    .filter((x): x is MoodboardListEintrag => !!x)
}
