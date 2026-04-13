'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RaumProduktMitDetails } from '@/lib/supabase/types'

/** Produkt aus Bibliothek in einen Raum verlinken. */
export async function produktZuRaumHinzufuegen(
  produktId: string,
  raumId: string,
  menge = 1,
  verkaufspreisOverride: number | null = null
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase.from('raum_produkte').insert({
    organisation_id: orgId,
    raum_id: raumId,
    produkt_id: produktId,
    menge,
    verkaufspreis_override: verkaufspreisOverride,
  })

  if (error) {
    if (error.code === '23505') return { fehler: 'Produkt ist bereits in diesem Raum vorhanden.' }
    return { fehler: 'Fehler beim Hinzufügen. Bitte erneut versuchen.' }
  }

  revalidatePath('/dashboard/produkte')
  return {}
}

/** Verknüpfung entfernen – Produkt bleibt in der Bibliothek. */
export async function produktAusRaumEntfernen(
  raumProduktId: string,
  raumId: string,
  projektId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('raum_produkte').delete().eq('id', raumProduktId)
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

/** Menge, Preis-Override oder Notizen eines Raum-Eintrags aktualisieren. */
export async function raumProdukteAktualisieren(
  raumProduktId: string,
  daten: {
    menge?: number
    verkaufspreisOverride?: number | null
    notizen?: string | null
  }
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const update: Record<string, unknown> = {}
  if (daten.menge !== undefined) update.menge = daten.menge
  if ('verkaufspreisOverride' in daten) update.verkaufspreis_override = daten.verkaufspreisOverride
  if ('notizen' in daten) update.notizen = daten.notizen

  const { error } = await supabase.from('raum_produkte').update(update).eq('id', raumProduktId)
  if (error) return { fehler: 'Fehler beim Aktualisieren.' }
  return {}
}

/** Reihenfolge mehrerer Einträge gleichzeitig aktualisieren. */
export async function updateRaumProduktPositionen(
  raumId: string,
  projektId: string,
  positionen: { id: string; reihenfolge: number }[]
): Promise<void> {
  const supabase = await createClient()
  await Promise.all(
    positionen.map(({ id, reihenfolge }) =>
      supabase.from('raum_produkte').update({ reihenfolge }).eq('id', id)
    )
  )
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

/** Alle Produkte eines Raums mit vollständigen Produkt-Daten laden. */
export async function getRaumProdukte(raumId: string): Promise<RaumProduktMitDetails[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('raum_produkte')
    .select('*, produkte(*, partner(id, name), produktstatus(status, kommentar))')
    .eq('raum_id', raumId)
    .order('reihenfolge')
    .order('created_at')
  return (data ?? []) as RaumProduktMitDetails[]
}
