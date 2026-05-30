'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RaumGruppe } from '@/lib/supabase/types'

/**
 * Raum-Gruppen (Migration 114) — benannte Gruppen VON Räumen je Projekt,
 * rein für eine kompaktere Übersicht/Navigation (z.B. „EG", „OG").
 * Alle Writes org-scoped (.eq('organisation_id', orgId)), Soft-Delete.
 */

export async function raumGruppenAbrufen(projektId: string): Promise<RaumGruppe[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('raum_gruppen')
    .select('*')
    .eq('projekt_id', projektId)
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')
  return (data ?? []) as RaumGruppe[]
}

export async function raumGruppeAnlegen(
  projektId: string,
  name: string,
  farbe?: string | null,
): Promise<{ id: string } | { fehler: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { fehler: 'Gruppenname darf nicht leer sein.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Neue Gruppe ans Ende einsortieren
  const { data: maxRow } = await supabase
    .from('raum_gruppen')
    .select('reihenfolge')
    .eq('projekt_id', projektId)
    .is('deleted_at', null)
    .order('reihenfolge', { ascending: false })
    .limit(1)
    .maybeSingle()
  const reihenfolge = (maxRow?.reihenfolge ?? -1) + 1

  const { data, error } = await supabase
    .from('raum_gruppen')
    .insert({ projekt_id: projektId, name: trimmed, farbe: farbe || null, reihenfolge, organisation_id: orgId })
    .select('id')
    .single()

  if (error || !data) return { fehler: `Fehler beim Speichern: ${error?.message ?? 'unbekannt'}` }
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return { id: data.id }
}

export async function raumGruppeUmbenennen(
  gruppeId: string,
  projektId: string,
  name: string,
  farbe?: string | null,
): Promise<{ fehler?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { fehler: 'Gruppenname darf nicht leer sein.' }
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const update: { name: string; farbe?: string | null } = { name: trimmed }
  if (farbe !== undefined) update.farbe = farbe || null
  const { error } = await supabase
    .from('raum_gruppen')
    .update(update)
    .eq('id', gruppeId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: error.message }
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return {}
}

export async function raumGruppeLoeschen(
  gruppeId: string,
  projektId: string,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Räume aus der Gruppe lösen — Soft-Delete löst kein FK ON DELETE SET NULL aus
  await supabase
    .from('raeume')
    .update({ raum_gruppe_id: null })
    .eq('raum_gruppe_id', gruppeId)
    .eq('organisation_id', orgId)

  const { error } = await supabase
    .from('raum_gruppen')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', gruppeId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: error.message }
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return {}
}

export async function raumGruppeReihenfolgeSetzen(
  projektId: string,
  positionen: { id: string; reihenfolge: number }[],
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const ergebnisse = await Promise.all(
    positionen.map(({ id, reihenfolge }) =>
      supabase.from('raum_gruppen').update({ reihenfolge }).eq('id', id).eq('organisation_id', orgId),
    ),
  )
  const fehler = ergebnisse.find((r) => r.error)?.error
  if (fehler) return { fehler: fehler.message }
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return {}
}

export async function raumZuGruppeZuordnen(
  raumId: string,
  gruppeId: string | null,
  projektId: string,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('raeume')
    .update({ raum_gruppe_id: gruppeId })
    .eq('id', raumId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: error.message }
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return {}
}
