'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Zeiterfassung } from '@/lib/supabase/types'

export async function getZeiterfassung(projektId: string): Promise<Zeiterfassung[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('zeiterfassung')
    .select('*')
    .eq('projekt_id', projektId)
    .order('datum', { ascending: false })
    .order('created_at', { ascending: false })
  return (data ?? []) as Zeiterfassung[]
}

export async function getZeitSumme(
  projektId: string
): Promise<{ stunden: number; abrechenbarStunden: number }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('zeiterfassung')
    .select('stunden, abrechenbar')
    .eq('projekt_id', projektId)

  let stunden = 0
  let abrechenbarStunden = 0
  for (const e of data ?? []) {
    stunden += Number(e.stunden)
    if (e.abrechenbar) abrechenbarStunden += Number(e.stunden)
  }
  return { stunden, abrechenbarStunden }
}

export async function zeitEintragen(
  projektId: string,
  stunden: number,
  beschreibung: string | null,
  datum?: string,
  abrechenbar = true
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('zeiterfassung').insert({
    organisation_id: orgId,
    projekt_id:      projektId,
    user_id:         user?.id ?? null,
    datum:           datum ?? new Date().toISOString().split('T')[0],
    stunden,
    beschreibung:    beschreibung || null,
    abrechenbar,
  })

  if (error) return { fehler: 'Fehler beim Eintragen der Zeit.' }
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return {}
}

export async function zeitAktualisieren(
  id: string,
  projektId: string,
  daten: {
    stunden?: number
    beschreibung?: string | null
    datum?: string
    abrechenbar?: boolean
  }
): Promise<{ fehler?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('zeiterfassung')
    .update(daten)
    .eq('id', id)

  if (error) return { fehler: 'Fehler beim Aktualisieren.' }
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return {}
}

export async function zeitLoeschen(
  id: string,
  projektId: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('zeiterfassung')
    .delete()
    .eq('id', id)

  if (error) return { fehler: 'Fehler beim Löschen.' }
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return {}
}
