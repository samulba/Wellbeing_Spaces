'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProduktGruppe } from '@/lib/supabase/types'

/**
 * Produkt-Gruppen (Migration 114) — Auswahl-Sets VON Produkten innerhalb
 * eines Raums (mehrere Alternativen, genau ein Favorit). Org-scoped,
 * Soft-Delete. Ein Gruppenwechsel invalidiert die Favoriten-Flags der Zeile.
 */

function pfad(projektId: string, raumId: string) {
  return `/dashboard/projekte/${projektId}/raeume/${raumId}`
}

export async function produktGruppenAbrufen(raumId: string): Promise<ProduktGruppe[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('produkt_gruppen')
    .select('*')
    .eq('raum_id', raumId)
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')
  return (data ?? []) as ProduktGruppe[]
}

export async function produktGruppeAnlegen(
  raumId: string,
  projektId: string,
  name: string,
  beschreibung: string | null = null,
): Promise<{ id: string } | { fehler: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { fehler: 'Gruppenname darf nicht leer sein.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: maxRow } = await supabase
    .from('produkt_gruppen')
    .select('reihenfolge')
    .eq('raum_id', raumId)
    .is('deleted_at', null)
    .order('reihenfolge', { ascending: false })
    .limit(1)
    .maybeSingle()
  const reihenfolge = (maxRow?.reihenfolge ?? -1) + 1

  const { data, error } = await supabase
    .from('produkt_gruppen')
    .insert({ raum_id: raumId, name: trimmed, beschreibung: beschreibung || null, reihenfolge, organisation_id: orgId })
    .select('id')
    .single()

  if (error || !data) return { fehler: `Fehler beim Speichern: ${error?.message ?? 'unbekannt'}` }
  revalidatePath(pfad(projektId, raumId))
  return { id: data.id }
}

export async function produktGruppeUmbenennen(
  gruppeId: string,
  raumId: string,
  projektId: string,
  daten: { name?: string; beschreibung?: string | null },
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const update: { name?: string; beschreibung?: string | null } = {}
  if (daten.name !== undefined) {
    const t = daten.name.trim()
    if (!t) return { fehler: 'Gruppenname darf nicht leer sein.' }
    update.name = t
  }
  if ('beschreibung' in daten) update.beschreibung = daten.beschreibung || null
  const { error } = await supabase
    .from('produkt_gruppen')
    .update(update)
    .eq('id', gruppeId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: error.message }
  revalidatePath(pfad(projektId, raumId))
  return {}
}

export async function produktGruppeLoeschen(
  gruppeId: string,
  raumId: string,
  projektId: string,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Produkte aus der Gruppe lösen + Favoriten clearen (Soft-Delete löst kein FK aus)
  await supabase
    .from('raum_produkte')
    .update({ produkt_gruppe_id: null, admin_favorit: false, kunde_favorit: false })
    .eq('produkt_gruppe_id', gruppeId)
    .eq('organisation_id', orgId)

  const { error } = await supabase
    .from('produkt_gruppen')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', gruppeId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: error.message }
  revalidatePath(pfad(projektId, raumId))
  return {}
}

/** Produkt einer Gruppe zuordnen (oder mit null entfernen). Gruppenwechsel
 *  setzt die Favoriten-Flags der Zeile zurück. */
export async function raumProduktZuGruppeZuordnen(
  raumProduktId: string,
  gruppeId: string | null,
  raumId: string,
  projektId: string,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('raum_produkte')
    .update({ produkt_gruppe_id: gruppeId, admin_favorit: false, kunde_favorit: false })
    .eq('id', raumProduktId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: error.message }
  revalidatePath(pfad(projektId, raumId))
  return {}
}
