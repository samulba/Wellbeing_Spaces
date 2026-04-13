'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ProduktStatus, BestellStatus } from '@/lib/supabase/types'

export type ProduktActionState = { fehler: string } | null

function parseOptionalNumber(val: FormDataEntryValue | null): number | null {
  if (!val || val === '') return null
  const n = parseFloat(val as string)
  return isNaN(n) ? null : n
}

function parseJsonArray(val: FormDataEntryValue | null): string[] {
  if (!val || val === '') return []
  try { return JSON.parse(val as string) } catch { return [] }
}

function neueFelder(formData: FormData) {
  return {
    lieferzeit:     (formData.get('lieferzeit')     as string) || null,
    breite_cm:      parseOptionalNumber(formData.get('breite_cm')),
    tiefe_cm:       parseOptionalNumber(formData.get('tiefe_cm')),
    hoehe_cm:       parseOptionalNumber(formData.get('hoehe_cm')),
    material:       (formData.get('material')       as string) || null,
    farbe:          (formData.get('farbe')          as string) || null,
    artikelnummer:  (formData.get('artikelnummer')  as string) || null,
    verfuegbarkeit: (formData.get('verfuegbarkeit') as string) || null,
    tags:           parseJsonArray(formData.get('tags_json')),
    bilder_urls:    parseJsonArray(formData.get('bilder_urls_json')),
  }
}

export async function produktInBibliothekAnlegen(
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: produkt, error } = await supabase
    .from('produkte')
    .insert({
      raum_id: null,
      partner_id: (formData.get('partner_id') as string) || null,
      name: formData.get('name') as string,
      beschreibung: (formData.get('beschreibung') as string) || null,
      kategorie: (formData.get('kategorie') as string) || null,
      menge: parseOptionalNumber(formData.get('menge')) ?? 1,
      einheit: (formData.get('einheit') as string) || 'Stk',
      einkaufspreis: parseOptionalNumber(formData.get('einkaufspreis')),
      marge_prozent: parseOptionalNumber(formData.get('marge_prozent')),
      provision_prozent: parseOptionalNumber(formData.get('provision_prozent')),
      verkaufspreis: parseOptionalNumber(formData.get('verkaufspreis')),
      bild_url: (formData.get('bild_url') as string) || null,
      produkt_url: (formData.get('produkt_url') as string) || null,
      notizen_intern: (formData.get('notizen_intern') as string) || null,
      ...neueFelder(formData),
      organisation_id: orgId,
    })
    .select('id')
    .single()

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  await supabase.from('produktstatus').insert({
    produkt_id: produkt.id,
    status: 'ausstehend',
    organisation_id: orgId,
  })

  revalidatePath('/dashboard/produkte')
  redirect('/dashboard/produkte')
}

export async function produktAnlegen(
  raumId: string,
  projektId: string,
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Produkt immer in die Bibliothek (raum_id = NULL) – Verknüpfung über raum_produkte
  const { data: produkt, error } = await supabase
    .from('produkte')
    .insert({
      raum_id: null,
      partner_id: (formData.get('partner_id') as string) || null,
      name: formData.get('name') as string,
      beschreibung: (formData.get('beschreibung') as string) || null,
      kategorie: (formData.get('kategorie') as string) || null,
      menge: parseOptionalNumber(formData.get('menge')) ?? 1,
      einheit: (formData.get('einheit') as string) || 'Stk',
      einkaufspreis: parseOptionalNumber(formData.get('einkaufspreis')),
      marge_prozent: parseOptionalNumber(formData.get('marge_prozent')),
      provision_prozent: parseOptionalNumber(formData.get('provision_prozent')),
      verkaufspreis: parseOptionalNumber(formData.get('verkaufspreis')),
      bild_url: (formData.get('bild_url') as string) || null,
      produkt_url: (formData.get('produkt_url') as string) || null,
      notizen_intern: (formData.get('notizen_intern') as string) || null,
      ...neueFelder(formData),
      organisation_id: orgId,
    })
    .select('id')
    .single()

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  // Produktstatus + Raum-Verknüpfung parallel anlegen
  await Promise.all([
    supabase.from('produktstatus').insert({
      produkt_id: produkt.id,
      status: 'ausstehend',
      organisation_id: orgId,
    }),
    supabase.from('raum_produkte').insert({
      organisation_id: orgId,
      raum_id: raumId,
      produkt_id: produkt.id,
      menge: parseOptionalNumber(formData.get('menge')) ?? 1,
    }),
  ])

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  redirect(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

export async function produktAktualisieren(
  produktId: string,
  raumId: string,
  projektId: string,
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()

  const [{ error: produktError }] = await Promise.all([
    supabase
      .from('produkte')
      .update({
        partner_id: (formData.get('partner_id') as string) || null,
        name: formData.get('name') as string,
        beschreibung: (formData.get('beschreibung') as string) || null,
        kategorie: (formData.get('kategorie') as string) || null,
        menge: parseOptionalNumber(formData.get('menge')) ?? 1,
        einheit: (formData.get('einheit') as string) || 'Stk',
        einkaufspreis: parseOptionalNumber(formData.get('einkaufspreis')),
        marge_prozent: parseOptionalNumber(formData.get('marge_prozent')),
        provision_prozent: parseOptionalNumber(formData.get('provision_prozent')),
        verkaufspreis: parseOptionalNumber(formData.get('verkaufspreis')),
        bild_url: (formData.get('bild_url') as string) || null,
        produkt_url: (formData.get('produkt_url') as string) || null,
        notizen_intern: (formData.get('notizen_intern') as string) || null,
        ...neueFelder(formData),
      })
      .eq('id', produktId)
      .is('deleted_at', null),
  ])

  if (produktError) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  // Status upserten
  await supabase
    .from('produktstatus')
    .upsert(
      {
        produkt_id: produktId,
        status: (formData.get('status') as ProduktStatus) || 'ausstehend',
      },
      { onConflict: 'produkt_id' }
    )

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  redirect(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

export async function produktAktualisierenBibliothek(
  produktId: string,
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('produkte')
    .update({
      partner_id: (formData.get('partner_id') as string) || null,
      name: formData.get('name') as string,
      beschreibung: (formData.get('beschreibung') as string) || null,
      kategorie: (formData.get('kategorie') as string) || null,
      menge: parseOptionalNumber(formData.get('menge')) ?? 1,
      einheit: (formData.get('einheit') as string) || 'Stk',
      einkaufspreis: parseOptionalNumber(formData.get('einkaufspreis')),
      marge_prozent: parseOptionalNumber(formData.get('marge_prozent')),
      provision_prozent: parseOptionalNumber(formData.get('provision_prozent')),
      verkaufspreis: parseOptionalNumber(formData.get('verkaufspreis')),
      bild_url: (formData.get('bild_url') as string) || null,
      produkt_url: (formData.get('produkt_url') as string) || null,
      notizen_intern: (formData.get('notizen_intern') as string) || null,
      ...neueFelder(formData),
    })
    .eq('id', produktId)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/produkte')
  redirect('/dashboard/produkte')
}

export async function produktSoftDelete(
  produktId: string,
  raumId: string,
  projektId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('produkte')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', produktId)

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

export async function produktFuerPartnerAnlegen(
  partnerId: string,
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { fehler: 'Produktname ist erforderlich.' }

  const { data: produkt, error } = await supabase
    .from('produkte')
    .insert({
      raum_id: null,
      partner_id: partnerId,
      name,
      kategorie: (formData.get('kategorie') as string) || null,
      menge: 1,
      einheit: 'Stk',
      produkt_url: (formData.get('produkt_url') as string) || null,
      organisation_id: orgId,
    })
    .select('id')
    .single()

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  await supabase.from('produktstatus').insert({
    produkt_id: produkt.id,
    status: 'ausstehend',
    organisation_id: orgId,
  })

  revalidatePath(`/dashboard/partner/${partnerId}`)
  return null
}

/** @deprecated Verwende stattdessen produktZuRaumHinzufuegen aus raum-produkte.ts */
export async function produktZuRaumZuweisen(
  produktId: string,
  raumId: string
): Promise<ProduktActionState> {
  // Delegiert an das neue raum_produkte-System
  const { produktZuRaumHinzufuegen } = await import('./raum-produkte')
  const result = await produktZuRaumHinzufuegen(produktId, raumId)
  if (result.fehler) return { fehler: result.fehler }
  return null
}

export async function updateProduktPositionen(
  raumId: string,
  projektId: string,
  positionen: { id: string; reihenfolge: number }[]
): Promise<void> {
  const supabase = await createClient()
  await Promise.all(
    positionen.map(({ id, reihenfolge }) =>
      supabase.from('produkte').update({ reihenfolge }).eq('id', id)
    )
  )
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

export async function bestellstatusAendern(
  produktId: string,
  raumId: string,
  projektId: string,
  neuerStatus: BestellStatus
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('produkte')
    .update({ bestellstatus: neuerStatus })
    .eq('id', produktId)
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

export async function produktStatusAendern(
  produktId: string,
  raumId: string,
  projektId: string,
  status: ProduktStatus
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('produktstatus')
    .upsert({ produkt_id: produktId, status }, { onConflict: 'produkt_id' })

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}
