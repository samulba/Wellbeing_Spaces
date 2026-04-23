'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RaumProduktMitDetails } from '@/lib/supabase/types'

/** Produkt aus Bibliothek in einen Raum verlinken. */
export async function produktZuRaumHinzufuegen(
  produktId: string,
  raumId: string,
  menge = 1,
  verkaufspreisOverride: number | null = null,
  projektId?: string,
  rabattProzent: number | null = null,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase.from('raum_produkte').insert({
    organisation_id: orgId,
    raum_id: raumId,
    produkt_id: produktId,
    menge,
    verkaufspreis_override: verkaufspreisOverride,
    rabatt_prozent: rabattProzent,
    reihenfolge: 0,
  })

  if (error) {
    if (error.code === '23505') return { fehler: 'Produkt ist bereits in diesem Raum vorhanden.' }
    return { fehler: 'Fehler beim Hinzufügen. Bitte erneut versuchen.' }
  }

  revalidatePath('/dashboard/produkte')
  if (projektId) revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  return {}
}

/** Verknüpfung entfernen – Produkt bleibt in der Bibliothek. */
export async function produktAusRaumEntfernen(
  raumProduktId: string,
  raumId: string,
  projektId: string
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase.from('raum_produkte').delete().eq('id', raumProduktId).eq('organisation_id', orgId)
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

/** Menge, Preis-Override, Rabatt oder Notizen eines Raum-Eintrags aktualisieren. */
export async function raumProdukteAktualisieren(
  raumProduktId: string,
  daten: {
    menge?: number
    verkaufspreisOverride?: number | null
    rabattProzent?: number | null
    notizen?: string | null
  },
  pfad?: { projektId: string; raumId: string },
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Alten Stand für Auto-Invalidierung laden (Mig 081+082)
  const { data: vorher } = await supabase
    .from('raum_produkte')
    .select('produkt_id, menge, verkaufspreis_override, rabatt_prozent')
    .eq('id', raumProduktId)
    .eq('organisation_id', orgId)
    .maybeSingle()

  const update: Record<string, unknown> = {}
  if (daten.menge !== undefined) update.menge = daten.menge
  if ('verkaufspreisOverride' in daten) update.verkaufspreis_override = daten.verkaufspreisOverride
  if ('rabattProzent' in daten) update.rabatt_prozent = daten.rabattProzent
  if ('notizen' in daten) update.notizen = daten.notizen

  const { error } = await supabase.from('raum_produkte').update(update).eq('id', raumProduktId).eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Aktualisieren.' }

  // Auto-Invalidierung NUR dieser einen Raum-Instanz bei Menge/Override/Rabatt
  if (vorher) {
    const geaendert: string[] = []
    if (daten.menge !== undefined && vorher.menge !== daten.menge) geaendert.push('Menge')
    if ('verkaufspreisOverride' in daten && vorher.verkaufspreis_override !== daten.verkaufspreisOverride) geaendert.push('Preis-Override')
    if ('rabattProzent' in daten && vorher.rabatt_prozent !== daten.rabattProzent) geaendert.push('Rabatt')
    if (geaendert.length > 0) {
      try {
        const { freigabeInvalidierenBeiProduktAenderung } = await import('./freigaben')
        await freigabeInvalidierenBeiProduktAenderung({
          produktId:          vorher.produkt_id,
          grund:              `${geaendert.join(', ')} geändert am ${new Date().toLocaleDateString('de-DE')}`,
          nurRaumProdukteIds: [raumProduktId],
        })
      } catch (e) {
        console.error('[raumProdukteAktualisieren:invalidate]', e)
      }
    }
  }

  if (pfad) revalidatePath(`/dashboard/projekte/${pfad.projektId}/raeume/${pfad.raumId}`)
  return {}
}

/** Reihenfolge mehrerer Einträge gleichzeitig aktualisieren. */
export async function updateRaumProduktPositionen(
  raumId: string,
  projektId: string,
  positionen: { id: string; reihenfolge: number }[]
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await Promise.all(
    positionen.map(({ id, reihenfolge }) =>
      supabase.from('raum_produkte').update({ reihenfolge }).eq('id', id).eq('organisation_id', orgId)
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
