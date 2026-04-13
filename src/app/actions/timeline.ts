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
}

// ── Alle Events eines Projekts ────────────────────────────────
export async function eventsAbrufen(projektId: string): Promise<TimelineEvent[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('projekt_id', projektId)
    .order('start_datum')
    .order('reihenfolge')
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
  return { id: data.id }
}

// ── Event aktualisieren ───────────────────────────────────────
export async function eventAktualisieren(
  eventId: string,
  projektId: string,
  daten: Partial<TimelineEventDaten>
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('timeline_events').update(daten).eq('id', eventId)
  revalidatePath(`/dashboard/projekte/${projektId}/timeline`)
  revalidatePath(`/dashboard/projekte/${projektId}`)
}

// ── Event löschen ─────────────────────────────────────────────
export async function eventLoeschen(eventId: string, projektId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('timeline_events').delete().eq('id', eventId)
  revalidatePath(`/dashboard/projekte/${projektId}/timeline`)
  revalidatePath(`/dashboard/projekte/${projektId}`)
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
