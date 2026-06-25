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

/**
 * Löscht NUR die Kunden-Sammelnotiz eines Auswahl-Blocks (`produkt_gruppen.kunde_notiz`).
 * Block + Produkt-Entscheidungen bleiben unangetastet — für „Notiz auf Wunsch entfernen",
 * unabhängig vom Freigabe-Status. org-scoped. projektId/raumId optional (für die Revalidierung
 * der Raum-Tabelle); aus der Freigaben-Übersicht genügt der Pfad + Client-`router.refresh()`.
 */
export async function produktGruppeKundennotizLoeschen(
  gruppeId: string,
  projektId?: string,
  raumId?: string,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('produkt_gruppen')
    .update({ kunde_notiz: null })
    .eq('id', gruppeId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: error.message }
  revalidatePath('/dashboard/freigaben')
  if (projektId && raumId) revalidatePath(pfad(projektId, raumId))
  return {}
}

/** Produkt einer Gruppe zuordnen (oder mit null entfernen). Gruppenwechsel
 *  setzt die Favoriten-Flags der Zeile zurück. Beim Zuordnen zu einem Block
 *  übernimmt das Produkt den Bereich des Blocks (Single Source of Truth) —
 *  beim Lösen (null) bleibt der bisherige Bereich erhalten. */
export async function raumProduktZuGruppeZuordnen(
  raumProduktId: string,
  gruppeId: string | null,
  raumId: string,
  projektId: string,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  // Bereich des Ziel-Blocks ermitteln → Mitglied erbt ihn (keine Drift).
  const update: { produkt_gruppe_id: string | null; admin_favorit: boolean; kunde_favorit: boolean; bereich_id?: string | null } =
    { produkt_gruppe_id: gruppeId, admin_favorit: false, kunde_favorit: false }
  if (gruppeId) {
    const { data: blk } = await supabase
      .from('produkt_gruppen')
      .select('bereich_id')
      .eq('id', gruppeId)
      .eq('organisation_id', orgId)
      .maybeSingle()
    update.bereich_id = (blk?.bereich_id as string | null) ?? null
  }
  const { error } = await supabase
    .from('raum_produkte')
    .update(update)
    .eq('id', raumProduktId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: error.message }
  revalidatePath(pfad(projektId, raumId))
  return {}
}

// ─────────────────────────────────────────────────────────────
// Produkt-zentrisch: „+ Alternative" — Alternativen direkt zu einem
// Produkt hinzufügen. Bei Neuanlage der Gruppe wird das Hauptprodukt
// automatisch zur Empfehlung (admin_favorit). Datenmodell wie gehabt
// (produkt_gruppen + Favorit), nur die Bedienung ist produkt-zentrisch.
// ─────────────────────────────────────────────────────────────

/** Stellt sicher, dass das Hauptprodukt in einer Auswahl-Gruppe ist.
 *  Legt sonst eine an (Name aus Produktname) und markiert das Hauptprodukt
 *  als Empfehlung. Gibt die Gruppen-ID oder einen Fehler zurück. */
async function ensureGruppeFuerHaupt(
  hauptRaumProduktId: string,
  raumId: string,
): Promise<string | { fehler: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: haupt } = await supabase
    .from('raum_produkte')
    .select('id, produkt_gruppe_id, bereich_id, produkte(name)')
    .eq('id', hauptRaumProduktId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!haupt) return { fehler: 'Hauptprodukt nicht gefunden.' }
  if (haupt.produkt_gruppe_id) return haupt.produkt_gruppe_id as string
  // Das Hauptprodukt ist hier nachweislich lose (sonst früher zurückgekehrt) →
  // sein Bereich = eigener raum_produkte.bereich_id. Der neue Block ERBT diesen
  // Bereich, damit das Produkt + die Alternativen in ihrer Gruppe bleiben und
  // nicht nach „Ohne Gruppe" fallen.
  const hauptBereichId = (haupt.bereich_id as string | null) ?? null

  const produktName = ((haupt.produkte as unknown as { name: string } | null)?.name ?? 'Produkt').slice(0, 90)
  const { data: maxRow } = await supabase
    .from('produkt_gruppen')
    .select('reihenfolge')
    .eq('raum_id', raumId)
    .is('deleted_at', null)
    .order('reihenfolge', { ascending: false })
    .limit(1)
    .maybeSingle()
  const reihenfolge = (maxRow?.reihenfolge ?? -1) + 1

  const { data: grp, error } = await supabase
    .from('produkt_gruppen')
    .insert({ raum_id: raumId, name: `Auswahl: ${produktName}`, reihenfolge, organisation_id: orgId, bereich_id: hauptBereichId })
    .select('id')
    .single()
  if (error || !grp) return { fehler: `Gruppe konnte nicht angelegt werden: ${error?.message ?? 'unbekannt'}` }

  await supabase
    .from('raum_produkte')
    .update({ produkt_gruppe_id: grp.id, admin_favorit: true })
    .eq('id', hauptRaumProduktId)
    .eq('organisation_id', orgId)

  return grp.id as string
}

/** Vorhandene Raum-Produkte als Alternativen zum Hauptprodukt hinzufügen. */
export async function alternativenHinzufuegen(
  hauptRaumProduktId: string,
  alternativeRaumProduktIds: string[],
  raumId: string,
  projektId: string,
): Promise<{ fehler?: string }> {
  if (alternativeRaumProduktIds.length === 0) return {}
  const grp = await ensureGruppeFuerHaupt(hauptRaumProduktId, raumId)
  if (typeof grp !== 'string') return grp

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  // Bereich des Blocks → Alternativen erben ihn (Single Source of Truth).
  const { data: blk } = await supabase
    .from('produkt_gruppen').select('bereich_id').eq('id', grp).eq('organisation_id', orgId).maybeSingle()
  const blockBereich = (blk?.bereich_id as string | null) ?? null
  for (const id of alternativeRaumProduktIds) {
    if (id === hauptRaumProduktId) continue
    const { error } = await supabase
      .from('raum_produkte')
      .update({ produkt_gruppe_id: grp, admin_favorit: false, kunde_favorit: false, bereich_id: blockBereich })
      .eq('id', id)
      .eq('organisation_id', orgId)
    if (error) return { fehler: error.message }
  }
  revalidatePath(pfad(projektId, raumId))
  return {}
}

/** Bibliotheks-Produkte als Alternativen hinzufügen: in den Raum aufnehmen
 *  (falls noch nicht vorhanden) und der Gruppe des Hauptprodukts zuordnen. */
export async function bibliotheksProdukteAlsAlternative(
  hauptRaumProduktId: string,
  produktIds: string[],
  raumId: string,
  projektId: string,
): Promise<{ fehler?: string }> {
  if (produktIds.length === 0) return {}
  const grp = await ensureGruppeFuerHaupt(hauptRaumProduktId, raumId)
  if (typeof grp !== 'string') return grp

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  // Bereich des Blocks → neue Alternativen erben ihn (Single Source of Truth).
  const { data: blk } = await supabase
    .from('produkt_gruppen').select('bereich_id').eq('id', grp).eq('organisation_id', orgId).maybeSingle()
  const blockBereich = (blk?.bereich_id as string | null) ?? null
  for (const produktId of produktIds) {
    const { error: insErr } = await supabase
      .from('raum_produkte')
      .insert({ organisation_id: orgId, raum_id: raumId, produkt_id: produktId, menge: 1, reihenfolge: 0, produkt_gruppe_id: grp, bereich_id: blockBereich })
    if (insErr) {
      if (insErr.code === '23505') {
        // Produkt schon im Raum → nur der Gruppe zuordnen (+ Bereich angleichen)
        await supabase
          .from('raum_produkte')
          .update({ produkt_gruppe_id: grp, admin_favorit: false, kunde_favorit: false, bereich_id: blockBereich })
          .eq('raum_id', raumId)
          .eq('produkt_id', produktId)
          .eq('organisation_id', orgId)
      } else {
        return { fehler: insErr.message }
      }
    }
  }
  // Auswahl-Freigabe-Links automatisch um die neuen Produkte erweitern (fail-safe)
  const { freigabeAuswahlScopeFuerRaum } = await import('./freigaben')
  await freigabeAuswahlScopeFuerRaum(supabase, orgId, raumId)
  revalidatePath('/dashboard/produkte')
  revalidatePath(pfad(projektId, raumId))
  return {}
}
