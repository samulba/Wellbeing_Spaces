'use server'

/**
 * Server-Actions fuer Vertrags-Meilensteine (Migration 053).
 *
 * Meilensteine sind Etappen eines Vertrags (z.B. "Anzahlung 30%",
 * "Konzept-Praesentation", "Schluss-Rechnung"). Bei jedem Meilenstein-
 * Anlegen wird automatisch eine Aufgabe in das Kanban-Board gesynct
 * (Quelle 'meilenstein').
 */

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncAufgabeAusQuelle } from '@/app/actions/aufgaben'
import type { VertragMeilenstein, MeilensteinStatus } from '@/lib/supabase/types'

// Mapping: Meilenstein-Status -> Aufgabe-Status
const STATUS_MAP: Record<MeilensteinStatus, 'backlog' | 'in_arbeit' | 'review' | 'erledigt'> = {
  offen:        'backlog',
  in_arbeit:    'in_arbeit',
  erledigt:     'erledigt',
  abgerechnet:  'erledigt',
}

// ── Lesen ─────────────────────────────────────────────────────

export async function getVertragMeilensteine(vertragId: string): Promise<VertragMeilenstein[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('vertrag_meilensteine')
    .select('*')
    .eq('vertrag_id', vertragId)
    .eq('organisation_id', orgId)
    .order('reihenfolge', { ascending: true })
    .order('created_at', { ascending: true })
  return (data ?? []) as VertragMeilenstein[]
}

// ── Helper: Aufgabe-Daten aus Meilenstein bauen ──────────────

async function ladeVertragKontext(vertragId: string, orgId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('vertraege')
    .select('id, titel, vertragsnummer, projekt_id, kunde_id')
    .eq('id', vertragId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  return data
}

async function syncMeilensteinAufgabe(
  ms: VertragMeilenstein,
  orgId: string,
  optionen?: { loeschen?: boolean },
) {
  if (optionen?.loeschen) {
    await syncAufgabeAusQuelle('meilenstein', ms.id, null, { loeschen: true })
    return
  }
  const vertrag = await ladeVertragKontext(ms.vertrag_id, orgId)
  if (!vertrag) return
  const titel = `Meilenstein: ${ms.titel}` +
                (vertrag.vertragsnummer ? ` (${vertrag.vertragsnummer})` : '')
  const beschreibungParts: string[] = []
  if (ms.beschreibung) beschreibungParts.push(ms.beschreibung)
  if (ms.betrag != null)  beschreibungParts.push(`Betrag: ${ms.betrag} €`)
  if (ms.prozent != null) beschreibungParts.push(`Anteil: ${ms.prozent}%`)
  await syncAufgabeAusQuelle('meilenstein', ms.id, {
    titel,
    beschreibung: beschreibungParts.join(' · ') || null,
    status:       STATUS_MAP[ms.status],
    prioritaet:   'normal',
    faellig_am:   ms.faellig_am,
    projekt_id:   (vertrag.projekt_id as string | null) ?? null,
    kunde_id:     (vertrag.kunde_id as string | null) ?? null,
    sichtbar_fuer_kunde: true,  // Meilensteine interessieren Kunde
  })
}

// ── CRUD ──────────────────────────────────────────────────────

export async function meilensteinAnlegen(input: {
  vertragId: string
  titel: string
  beschreibung?: string | null
  faellig_am?: string | null
  betrag?: number | null
  prozent?: number | null
}): Promise<{ id?: string; fehler?: string }> {
  const titel = input.titel.trim()
  if (!titel) return { fehler: 'Titel darf nicht leer sein.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // naechste reihenfolge ermitteln
  const { data: maxRow } = await supabase
    .from('vertrag_meilensteine')
    .select('reihenfolge')
    .eq('vertrag_id', input.vertragId)
    .eq('organisation_id', orgId)
    .order('reihenfolge', { ascending: false })
    .limit(1)
    .maybeSingle()
  const reihenfolge = (maxRow?.reihenfolge ?? -1) + 1

  const { data, error } = await supabase
    .from('vertrag_meilensteine')
    .insert({
      organisation_id: orgId,
      vertrag_id:      input.vertragId,
      titel,
      beschreibung:    input.beschreibung ?? null,
      faellig_am:      input.faellig_am ?? null,
      betrag:          input.betrag ?? null,
      prozent:         input.prozent ?? null,
      status:          'offen',
      reihenfolge,
    })
    .select('*')
    .single()
  if (error || !data) return { fehler: 'Konnte Meilenstein nicht anlegen.' }

  await syncMeilensteinAufgabe(data as VertragMeilenstein, orgId)

  revalidatePath('/dashboard/aufgaben')
  return { id: data.id }
}

export async function meilensteinAktualisieren(
  id: string,
  patch: Partial<{
    titel: string; beschreibung: string | null; faellig_am: string | null
    betrag: number | null; prozent: number | null
  }>,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const update: Record<string, unknown> = { ...patch }
  if (patch.titel !== undefined) {
    const t = patch.titel.trim()
    if (!t) return { fehler: 'Titel darf nicht leer sein.' }
    update.titel = t
  }

  const { data, error } = await supabase
    .from('vertrag_meilensteine')
    .update(update)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .select('*')
    .single()
  if (error || !data) return { fehler: 'Konnte Meilenstein nicht aktualisieren.' }

  await syncMeilensteinAufgabe(data as VertragMeilenstein, orgId)

  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

export async function meilensteinStatusAendern(
  id: string,
  neuerStatus: MeilensteinStatus,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const update: Record<string, unknown> = { status: neuerStatus }
  if (neuerStatus === 'erledigt' || neuerStatus === 'abgerechnet') {
    update.erledigt_am = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('vertrag_meilensteine')
    .update(update)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .select('*')
    .single()
  if (error || !data) return { fehler: 'Status konnte nicht aktualisiert werden.' }

  await syncMeilensteinAufgabe(data as VertragMeilenstein, orgId)

  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}

export async function meilensteinLoeschen(
  id: string,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Vorher laden — fuer Auto-Sync brauchen wir nur die ID
  const { error } = await supabase
    .from('vertrag_meilensteine')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Loeschen fehlgeschlagen.' }

  await syncAufgabeAusQuelle('meilenstein', id, null, { loeschen: true })

  revalidatePath('/dashboard/aufgaben')
  return { erfolg: true }
}
