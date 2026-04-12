'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ProduktStatus, BestellStatus } from '@/lib/supabase/types'

export type ProduktActionState = { fehler: string } | null

function parseOptionalNumber(val: FormDataEntryValue | null): number | null {
  if (!val || val === '') return null
  const n = parseFloat(val as string)
  return isNaN(n) ? null : n
}

export async function produktInBibliothekAnlegen(
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()

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
    })
    .select('id')
    .single()

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  await supabase.from('produktstatus').insert({
    produkt_id: produkt.id,
    status: (formData.get('status') as ProduktStatus) || 'ausstehend',
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

  const { data: produkt, error } = await supabase
    .from('produkte')
    .insert({
      raum_id: raumId,
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
    })
    .select('id')
    .single()

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  // Produktstatus automatisch anlegen
  await supabase.from('produktstatus').insert({
    produkt_id: produkt.id,
    status: (formData.get('status') as ProduktStatus) || 'ausstehend',
  })

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
    })
    .select('id')
    .single()

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  await supabase.from('produktstatus').insert({
    produkt_id: produkt.id,
    status: 'ausstehend',
  })

  revalidatePath(`/dashboard/partner/${partnerId}`)
  return null
}

export async function produktZuRaumZuweisen(
  produktId: string,
  raumId: string
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('produkte')
    .update({ raum_id: raumId })
    .eq('id', produktId)
  if (error) return { fehler: 'Fehler beim Zuweisen. Bitte erneut versuchen.' }
  revalidatePath('/dashboard/produkte')
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
