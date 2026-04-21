'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TimelineEvent, TimelineEventTyp, TimelineEventStatus } from '@/lib/supabase/types'

export type TimelineEventDaten = {
  titel: string
  beschreibung?: string | null
  typ: TimelineEventTyp
  start_datum: string
  end_datum?: string | null
  status?: TimelineEventStatus
  farbe?: string | null
  verantwortlich?: string | null
  erinnerung_tage?: number | null
  raum_id?: string | null
  abhaengig_von?: string[]
  kunde_sichtbar?: boolean
}

export type AutoEventQuelle = 'produkt' | 'bestellstatus' | 'deadline' | 'angebot' | 'vertrag'

// ── Alle Events eines Projekts ────────────────────────────────
export async function eventsAbrufen(projektId: string): Promise<TimelineEvent[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('projekt_id', projektId)
    .order('start_datum')
    .order('created_at')
  return (data ?? []) as TimelineEvent[]
}

// ── Event erstellen ───────────────────────────────────────────
export async function eventErstellen(
  projektId: string,
  daten: TimelineEventDaten
): Promise<{ id: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data, error } = await supabase
    .from('timeline_events')
    .insert({ projekt_id: projektId, ...daten, organisation_id: orgId })
    .select('id')
    .single()
  if (error || !data) throw new Error('Event konnte nicht erstellt werden.')
  revalidatePath(`/dashboard/projekte/${projektId}/timeline`)
  revalidatePath(`/dashboard/projekte/${projektId}`)
  if (daten.raum_id) {
    revalidatePath(`/dashboard/projekte/${projektId}/raeume/${daten.raum_id}`)
  }
  return { id: data.id }
}

// ── Event aktualisieren ───────────────────────────────────────
export async function eventAktualisieren(
  eventId: string,
  projektId: string,
  daten: Partial<TimelineEventDaten>
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase.from('timeline_events').update(daten).eq('id', eventId).eq('organisation_id', orgId)
  revalidatePath(`/dashboard/projekte/${projektId}/timeline`)
  revalidatePath(`/dashboard/projekte/${projektId}`)
  if (daten.raum_id) {
    revalidatePath(`/dashboard/projekte/${projektId}/raeume/${daten.raum_id}`)
  }
}

// ── Event löschen ─────────────────────────────────────────────
export async function eventLoeschen(
  eventId: string,
  projektId: string,
  raumId?: string | null
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase.from('timeline_events').delete().eq('id', eventId).eq('organisation_id', orgId)
  revalidatePath(`/dashboard/projekte/${projektId}/timeline`)
  revalidatePath(`/dashboard/projekte/${projektId}`)
  if (raumId) {
    revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  }
}

// ── Nächste Events für Mini-Preview ──────────────────────────
export async function naechsteEventsAbrufen(projektId: string, limit = 3): Promise<TimelineEvent[]> {
  const supabase = await createClient()
  const heute = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('projekt_id', projektId)
    .neq('status', 'abgeschlossen')
    .gte('start_datum', heute)
    .order('start_datum')
    .limit(limit)
  return (data ?? []) as TimelineEvent[]
}

// ── Events eines Projekts (alle, mit Raum-Join) ───────────────
export async function projektEventsAbrufen(
  projektId: string
): Promise<(TimelineEvent & { raum: { id: string; name: string } | null })[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('timeline_events')
    .select('*, raum:raeume(id, name)')
    .eq('projekt_id', projektId)
    .order('start_datum')
    .order('created_at')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any
}

// ── Events eines Raums ────────────────────────────────────────
export async function raumEventsAbrufen(
  raumId: string
): Promise<TimelineEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('raum_id', raumId)
    .order('start_datum')
    .order('created_at')
  if (error) {
    console.error('[raumEventsAbrufen]', {
      raumId, code: error.code, message: error.message, hint: error.hint, details: error.details,
    })
    return []
  }
  return (data ?? []) as TimelineEvent[]
}

// ── Auto-Event-Synchronisation ───────────────────────────────
// Jeder Auto-Event ist durch (organisation_id, quelle, quelle_id)
// eindeutig. Upsert via UNIQUE-Index aus Migration 075.
// Aufrufer dürfen Fehler schlucken (await … .catch()) — ein fehl-
// geschlagener Sync darf die Haupt-Action nicht crashen.

export interface SyncAutoEventDaten {
  titel:          string
  typ:            TimelineEventTyp
  start_datum:    string            // ISO YYYY-MM-DD
  end_datum?:     string | null
  status?:        TimelineEventStatus
  raum_id?:       string | null
  beschreibung?:  string | null
  kunde_sichtbar?: boolean          // Default aus Quelle-Map unten
}

// Default-Kunden-Sichtbarkeit pro Auto-Quelle
const QUELLE_KUNDE_SICHTBAR_DEFAULT: Record<AutoEventQuelle, boolean> = {
  produkt:       true,   // Liefertermin interessiert Kunden
  bestellstatus: false,  // interne Bestellabwicklung
  deadline:      true,   // Projekt-Ende
  angebot:       false,  // intern
  vertrag:       true,   // Signatur-Termin
}

/**
 * Legt einen Auto-Event an oder aktualisiert ihn. Bei optionen.loeschen=true
 * wird er stattdessen entfernt. Idempotent.
 * Gibt { error } zurück wenn etwas schiefgeht (z.B. Migration 075 nicht
 * ausgeführt) — Aufrufer können das in die UI durchreichen.
 */
export async function syncAutoEvent(
  quelle:   AutoEventQuelle,
  quelleId: string,
  projektId: string,
  daten: SyncAutoEventDaten | null,
  optionen?: { loeschen?: boolean },
): Promise<{ error?: string; action?: 'created' | 'updated' | 'deleted' | 'noop' }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const formatErr = (phase: string, err: { message?: string; code?: string; hint?: string; details?: string }) => {
    const hint =
      err.code === '42703' || (err.message?.includes('column') && err.message?.includes('does not exist'))
        ? ' (Migration 075 fehlt?)'
        : ''
    return `[${phase}] ${err.message ?? 'Unbekannter Fehler'}${hint}`
  }

  // Löschung
  if (optionen?.loeschen) {
    const { error } = await supabase
      .from('timeline_events')
      .delete()
      .eq('organisation_id', orgId)
      .eq('quelle', quelle)
      .eq('quelle_id', quelleId)
    if (error) {
      const msg = formatErr(`syncAutoEvent:delete:${quelle}`, error)
      console.error(msg, { quelleId, projektId })
      return { error: msg, action: 'noop' }
    }
    revalidatePath(`/dashboard/projekte/${projektId}/timeline`)
    revalidatePath(`/dashboard/projekte/${projektId}`)
    return { action: 'deleted' }
  }

  if (!daten) return { action: 'noop' }

  const kundeSichtbar = daten.kunde_sichtbar ?? QUELLE_KUNDE_SICHTBAR_DEFAULT[quelle]

  // Manuelles SELECT + INSERT/UPDATE statt supabase.upsert(),
  // weil PostgREST bei partial unique indexes keine WHERE-Prädikate
  // durchreicht.
  const { data: existing, error: selectErr } = await supabase
    .from('timeline_events')
    .select('id')
    .eq('organisation_id', orgId)
    .eq('quelle', quelle)
    .eq('quelle_id', quelleId)
    .maybeSingle()

  if (selectErr) {
    const msg = formatErr(`syncAutoEvent:select:${quelle}`, selectErr)
    console.error(msg, { quelleId, projektId })
    return { error: msg }
  }

  const payload = {
    projekt_id:      projektId,
    titel:           daten.titel,
    beschreibung:    daten.beschreibung ?? null,
    typ:             daten.typ,
    start_datum:     daten.start_datum,
    end_datum:       daten.end_datum ?? null,
    status:          daten.status ?? 'geplant',
    raum_id:         daten.raum_id ?? null,
    kunde_sichtbar:  kundeSichtbar,
  }

  let action: 'created' | 'updated' = 'created'
  if (existing) {
    action = 'updated'
    const { error } = await supabase
      .from('timeline_events')
      .update(payload)
      .eq('id', existing.id)
      .eq('organisation_id', orgId)
    if (error) {
      const msg = formatErr(`syncAutoEvent:update:${quelle}`, error)
      console.error(msg, { quelleId, projektId })
      return { error: msg, action: 'noop' }
    }
  } else {
    const { error } = await supabase
      .from('timeline_events')
      .insert({
        ...payload,
        organisation_id: orgId,
        quelle,
        quelle_id:       quelleId,
      })
    if (error) {
      const msg = formatErr(`syncAutoEvent:insert:${quelle}`, error)
      console.error(msg, { quelleId, projektId })
      return { error: msg, action: 'noop' }
    }
  }

  revalidatePath(`/dashboard/projekte/${projektId}/timeline`)
  revalidatePath(`/dashboard/projekte/${projektId}`)
  if (daten.raum_id) {
    revalidatePath(`/dashboard/projekte/${projektId}/raeume/${daten.raum_id}`)
  }
  return { action }
}


// ── Liefertermin auf Produkt setzen ──────────────────────────
export async function lieferterminSetzen(
  produktId: string,
  projektId: string,
  datum: string | null,
  bestaetigt = false
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('produkte').update({
    liefertermin:             datum,
    liefertermin_bestaetigt:  bestaetigt,
  }).eq('id', produktId)
  revalidatePath(`/dashboard/projekte/${projektId}/timeline`)
}
