'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { auditLog } from '@/lib/audit'
import type { Moodboard, MoodboardVersion } from '@/lib/supabase/types'
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
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const update: Record<string, unknown> = {
    freigabe_aktiv: aktiv,
    freigabe_kommentare_aktiv: kommentareAktiv,
  }
  if (aktiv) update.freigabe_erstellt_am = new Date().toISOString()

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


// ── Oeffentliche Freigabe-Ansicht ──────────────────────────────

/** Laedt ein Moodboard via freigabe_token fuer Kunden (Admin-Client, kein Auth). */
export async function getMoodboardOeffentlich(token: string): Promise<{
  moodboardId:        string
  name:               string
  beschreibung:       string | null
  canvasJson:         Record<string, unknown> | null
  raumName:           string
  projektName:        string
  kommentareAktiv:    boolean
  organisationId:     string | null
} | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('moodboards')
    .select('id, name, beschreibung, canvas_json, freigabe_aktiv, freigabe_kommentare_aktiv, organisation_id, raeume!inner(name, projekte!inner(name))')
    .eq('freigabe_token', token)
    .maybeSingle()
  if (!data || !data.freigabe_aktiv) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raeume = (data.raeume as any)
  const projekt = raeume?.projekte
  return {
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
}

export async function getAlleMoodboards(): Promise<MoodboardListEintrag[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('moodboards')
    .select('*, raeume!inner(id, name, projekt_id, projekte!inner(id, name))')
    .order('updated_at', { ascending: false })

  type Row = Moodboard & {
    raeume: {
      id: string
      name: string
      projekt_id: string
      projekte: { id: string; name: string } | null
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
      } as MoodboardListEintrag
    })
    .filter((x): x is MoodboardListEintrag => !!x)
}
