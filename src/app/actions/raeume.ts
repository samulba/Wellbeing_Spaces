'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type RaumActionState = { fehler: string } | null

export async function raumAnlegen(
  projektId: string,
  prevState: RaumActionState,
  formData: FormData
): Promise<RaumActionState> {
  const supabase = await createClient()

  const name = (formData.get('name') as string).trim()
  if (!name) return { fehler: 'Raumname darf nicht leer sein.' }

  const { error } = await supabase.from('raeume').insert({
    projekt_id: projektId,
    name,
    beschreibung: (formData.get('beschreibung') as string) || null,
  })

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  revalidatePath(`/dashboard/projekte/${projektId}`)
  return null
}

export async function raumSoftDelete(
  raumId: string,
  projektId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('raeume')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', raumId)

  revalidatePath(`/dashboard/projekte/${projektId}`)
}
