'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type RaumActionState = { fehler: string } | null

export async function raumAnlegen(
  projektId: string,
  prevState: RaumActionState,
  formData: FormData
): Promise<RaumActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const name = (formData.get('name') as string).trim()
  if (!name) return { fehler: 'Raumname darf nicht leer sein.' }

  const budgetRaw = formData.get('budget') as string
  const budget = budgetRaw ? parseFloat(budgetRaw) : null

  const raumtypId = (formData.get('raumtyp_id') as string) || null

  const { error } = await supabase.from('raeume').insert({
    projekt_id: projektId,
    name,
    beschreibung: (formData.get('beschreibung') as string) || null,
    raumtyp_id: raumtypId,
    budget: budget && !isNaN(budget) ? budget : null,
    organisation_id: orgId,
  })

  if (error) {
    return { fehler: `Fehler beim Speichern: ${error.message}` }
  }

  revalidatePath(`/dashboard/projekte/${projektId}`)
  return null
}

export async function raumSoftDelete(
  raumId: string,
  projektId: string
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('raeume')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', raumId)
    .eq('organisation_id', orgId)

  revalidatePath(`/dashboard/projekte/${projektId}`)
}

export async function updateRaumPositionen(
  projektId: string,
  positionen: { id: string; reihenfolge: number }[]
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await Promise.all(
    positionen.map(({ id, reihenfolge }) =>
      supabase.from('raeume').update({ reihenfolge }).eq('id', id).eq('organisation_id', orgId)
    )
  )
  revalidatePath(`/dashboard/projekte/${projektId}`)
}
