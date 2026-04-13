'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Kommunikation, KommunikationTyp, KommunikationRichtung } from '@/lib/supabase/types'

export interface KommunikationDaten {
  typ: KommunikationTyp
  richtung: KommunikationRichtung | null
  betreff: string | null
  inhalt: string | null
  kontaktperson: string | null
  datum: string
  dauer_minuten: number | null
  follow_up_datum: string | null
  erledigt: boolean
  projekt_id: string | null
}

export async function kommunikationAnlegen(
  kundeId: string,
  daten: KommunikationDaten
): Promise<{ id?: string; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('kommunikation')
    .insert({
      organisation_id: orgId,
      kunde_id: kundeId,
      projekt_id: daten.projekt_id || null,
      typ: daten.typ,
      richtung: daten.richtung || null,
      betreff: daten.betreff || null,
      inhalt: daten.inhalt || null,
      kontaktperson: daten.kontaktperson || null,
      user_id: user?.id ?? null,
      datum: daten.datum,
      dauer_minuten: daten.dauer_minuten,
      follow_up_datum: daten.follow_up_datum || null,
      erledigt: daten.erledigt,
    })
    .select('id')
    .single()

  if (error || !data) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  revalidatePath(`/dashboard/kunden/${kundeId}`)
  return { id: data.id }
}

export async function kommunikationAktualisieren(
  id: string,
  kundeId: string,
  daten: Partial<KommunikationDaten>
): Promise<{ fehler?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('kommunikation')
    .update({
      ...(daten.typ            !== undefined && { typ: daten.typ }),
      ...(daten.richtung       !== undefined && { richtung: daten.richtung }),
      ...(daten.betreff        !== undefined && { betreff: daten.betreff || null }),
      ...(daten.inhalt         !== undefined && { inhalt: daten.inhalt || null }),
      ...(daten.kontaktperson  !== undefined && { kontaktperson: daten.kontaktperson || null }),
      ...(daten.datum          !== undefined && { datum: daten.datum }),
      ...(daten.dauer_minuten  !== undefined && { dauer_minuten: daten.dauer_minuten }),
      ...(daten.follow_up_datum !== undefined && { follow_up_datum: daten.follow_up_datum || null }),
      ...(daten.erledigt       !== undefined && { erledigt: daten.erledigt }),
      ...(daten.projekt_id     !== undefined && { projekt_id: daten.projekt_id || null }),
    })
    .eq('id', id)

  if (error) return { fehler: 'Fehler beim Aktualisieren.' }

  revalidatePath(`/dashboard/kunden/${kundeId}`)
  return {}
}

export async function kommunikationLoeschen(
  id: string,
  kundeId: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('kommunikation')
    .delete()
    .eq('id', id)

  if (error) return { fehler: 'Fehler beim Löschen.' }

  revalidatePath(`/dashboard/kunden/${kundeId}`)
  return {}
}

export async function getKommunikation(
  kundeId: string,
  limit = 50
): Promise<Kommunikation[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('kommunikation')
    .select('*')
    .eq('kunde_id', kundeId)
    .order('datum', { ascending: false })
    .limit(limit)

  return (data ?? []) as Kommunikation[]
}

export async function getOffeneFollowUps(): Promise<(Kommunikation & { kunden: { id: string; name: string } | null })[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('kommunikation')
    .select('*, kunden(id, name)')
    .eq('erledigt', false)
    .not('follow_up_datum', 'is', null)
    .order('follow_up_datum', { ascending: true })

  return (data ?? []) as unknown as (Kommunikation & { kunden: { id: string; name: string } | null })[]
}

export async function followUpErledigen(
  id: string,
  kundeId: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('kommunikation')
    .update({ erledigt: true })
    .eq('id', id)

  if (error) return { fehler: 'Fehler beim Aktualisieren.' }

  revalidatePath(`/dashboard/kunden/${kundeId}`)
  return {}
}
