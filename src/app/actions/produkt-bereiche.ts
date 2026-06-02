'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProduktBereich } from '@/lib/supabase/types'

/**
 * Produkt-Bereiche (Migration 116) — organisatorische „Gruppen" (UI-Label)
 * innerhalb eines Raums (z.B. „Lounge-Ecke", „Lichtplanung"). Ein Bereich
 * bündelt mehrere Auswahl-Blöcke (produkt_gruppen) + Einzelprodukte.
 *
 * Reiner Eltern-Container — KEINE Favoriten-Logik. Die „1 von N"-Mechanik
 * (admin_favorit/kunde_favorit) bleibt unverändert auf Block-Ebene.
 * Alle Writes org-scoped (.eq('organisation_id', orgId)), Soft-Delete.
 */

const pfad = (projektId: string, raumId: string) =>
  `/dashboard/projekte/${projektId}/raeume/${raumId}`

export async function produktBereicheAbrufen(raumId: string): Promise<ProduktBereich[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('produkt_bereiche')
    .select('*')
    .eq('raum_id', raumId)
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')
  return (data ?? []) as ProduktBereich[]
}

export async function produktBereichAnlegen(
  raumId: string,
  projektId: string,
  name: string,
  farbe?: string | null,
): Promise<{ id: string } | { fehler: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { fehler: 'Gruppenname darf nicht leer sein.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Neuen Bereich ans Ende einsortieren
  const { data: maxRow } = await supabase
    .from('produkt_bereiche')
    .select('reihenfolge')
    .eq('raum_id', raumId)
    .is('deleted_at', null)
    .order('reihenfolge', { ascending: false })
    .limit(1)
    .maybeSingle()
  const reihenfolge = (maxRow?.reihenfolge ?? -1) + 1

  const { data, error } = await supabase
    .from('produkt_bereiche')
    .insert({ raum_id: raumId, name: trimmed, farbe: farbe || null, reihenfolge, organisation_id: orgId })
    .select('id')
    .single()

  if (error || !data) return { fehler: `Fehler beim Speichern: ${error?.message ?? 'unbekannt'}` }
  revalidatePath(pfad(projektId, raumId))
  return { id: data.id }
}

export async function produktBereichUmbenennen(
  bereichId: string,
  raumId: string,
  projektId: string,
  daten: { name?: string; beschreibung?: string | null; farbe?: string | null },
): Promise<{ fehler?: string }> {
  const update: { name?: string; beschreibung?: string | null; farbe?: string | null } = {}
  if (daten.name !== undefined) {
    const trimmed = daten.name.trim()
    if (!trimmed) return { fehler: 'Gruppenname darf nicht leer sein.' }
    update.name = trimmed
  }
  if (daten.beschreibung !== undefined) update.beschreibung = daten.beschreibung || null
  if (daten.farbe !== undefined) update.farbe = daten.farbe || null
  if (Object.keys(update).length === 0) return {}

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('produkt_bereiche')
    .update(update)
    .eq('id', bereichId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: error.message }
  revalidatePath(pfad(projektId, raumId))
  return {}
}

export async function produktBereichLoeschen(
  bereichId: string,
  raumId: string,
  projektId: string,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Kinder lösen — Soft-Delete löst kein FK ON DELETE SET NULL aus.
  // WICHTIG: Favoriten/produkt_gruppe_id NICHT anfassen — ein Block bleibt
  // funktionsfähig, nur ohne Bereich-Zuordnung ("Ohne Gruppe").
  await supabase
    .from('produkt_gruppen')
    .update({ bereich_id: null })
    .eq('bereich_id', bereichId)
    .eq('organisation_id', orgId)
  await supabase
    .from('raum_produkte')
    .update({ bereich_id: null })
    .eq('bereich_id', bereichId)
    .eq('organisation_id', orgId)

  const { error } = await supabase
    .from('produkt_bereiche')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', bereichId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: error.message }
  revalidatePath(pfad(projektId, raumId))
  return {}
}

export async function produktBereichReihenfolgeSetzen(
  raumId: string,
  projektId: string,
  positionen: { id: string; reihenfolge: number }[],
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const ergebnisse = await Promise.all(
    positionen.map(({ id, reihenfolge }) =>
      supabase.from('produkt_bereiche').update({ reihenfolge }).eq('id', id).eq('organisation_id', orgId),
    ),
  )
  const fehler = ergebnisse.find((r) => r.error)?.error
  if (fehler) return { fehler: fehler.message }
  revalidatePath(pfad(projektId, raumId))
  return {}
}

/** Auswahl-Block (produkt_gruppe) einem Bereich zuordnen (oder lösen).
 *  Single Source of Truth: die Mitglieder des Blocks folgen dem Block-Bereich
 *  (raum_produkte.bereich_id wird mitgezogen) — so kann nichts auseinanderlaufen. */
export async function produktGruppeZuBereichZuordnen(
  gruppeId: string,
  bereichId: string | null,
  raumId: string,
  projektId: string,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('produkt_gruppen')
    .update({ bereich_id: bereichId })
    .eq('id', gruppeId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: error.message }
  // Mitglieder des Blocks an den (neuen) Block-Bereich angleichen.
  await supabase
    .from('raum_produkte')
    .update({ bereich_id: bereichId })
    .eq('produkt_gruppe_id', gruppeId)
    .eq('organisation_id', orgId)
  revalidatePath(pfad(projektId, raumId))
  return {}
}

/** Einzelprodukt (raum_produkte) einem Bereich zuordnen (oder lösen).
 *  Anders als bei der Block-Zuordnung werden hier KEINE Favoriten
 *  zurückgesetzt — ein Bereich ist kein Entscheidungs-Set. */
export async function raumProduktZuBereichZuordnen(
  raumProduktId: string,
  bereichId: string | null,
  raumId: string,
  projektId: string,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('raum_produkte')
    .update({ bereich_id: bereichId })
    .eq('id', raumProduktId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: error.message }
  revalidatePath(pfad(projektId, raumId))
  return {}
}
