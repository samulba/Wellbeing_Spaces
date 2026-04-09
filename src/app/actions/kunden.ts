'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type KundeActionState = { fehler: string } | null

export async function kundeAnlegen(
  prevState: KundeActionState,
  formData: FormData
): Promise<KundeActionState> {
  const supabase = await createClient()

  const { error } = await supabase.from('kunden').insert({
    name: formData.get('name') as string,
    ansprechpartner: (formData.get('ansprechpartner') as string) || null,
    email: (formData.get('email') as string) || null,
    telefon: (formData.get('telefon') as string) || null,
    adresse: (formData.get('adresse') as string) || null,
    notizen: (formData.get('notizen') as string) || null,
  })

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/kunden')
  redirect('/dashboard/kunden')
}

export async function kundeAktualisieren(
  id: string,
  prevState: KundeActionState,
  formData: FormData
): Promise<KundeActionState> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('kunden')
    .update({
      name: formData.get('name') as string,
      ansprechpartner: (formData.get('ansprechpartner') as string) || null,
      email: (formData.get('email') as string) || null,
      telefon: (formData.get('telefon') as string) || null,
      adresse: (formData.get('adresse') as string) || null,
      notizen: (formData.get('notizen') as string) || null,
    })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/kunden')
  revalidatePath(`/dashboard/kunden/${id}`)
  redirect(`/dashboard/kunden/${id}`)
}

export async function kundeSoftDelete(id: string): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('kunden')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/dashboard/kunden')
  redirect('/dashboard/kunden')
}
