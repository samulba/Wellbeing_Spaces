'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ProjektStatus } from '@/lib/supabase/types'

export type ProjektActionState = { fehler: string } | null

export async function projektAnlegen(
  prevState: ProjektActionState,
  formData: FormData
): Promise<ProjektActionState> {
  const supabase = await createClient()

  const { error } = await supabase.from('projekte').insert({
    name: formData.get('name') as string,
    kunde_id: formData.get('kunde_id') as string,
    beschreibung: (formData.get('beschreibung') as string) || null,
    standort: (formData.get('standort') as string) || null,
    projektart: (formData.get('projektart') as string) || null,
    gesamtbudget: formData.get('gesamtbudget')
      ? Number(formData.get('gesamtbudget'))
      : null,
    status: 'offen',
  })

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/projekte')
  redirect('/dashboard/projekte')
}

export async function projektAktualisieren(
  id: string,
  prevState: ProjektActionState,
  formData: FormData
): Promise<ProjektActionState> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('projekte')
    .update({
      name: formData.get('name') as string,
      kunde_id: formData.get('kunde_id') as string,
      beschreibung: (formData.get('beschreibung') as string) || null,
      standort: (formData.get('standort') as string) || null,
      projektart: (formData.get('projektart') as string) || null,
      gesamtbudget: formData.get('gesamtbudget')
        ? Number(formData.get('gesamtbudget'))
        : null,
      status: formData.get('status') as ProjektStatus,
    })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/projekte')
  revalidatePath(`/dashboard/projekte/${id}`)
  redirect(`/dashboard/projekte/${id}`)
}

export async function projektStatusAendern(
  id: string,
  status: ProjektStatus
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('projekte')
    .update({ status })
    .eq('id', id)
    .is('deleted_at', null)

  revalidatePath(`/dashboard/projekte/${id}`)
  revalidatePath('/dashboard/projekte')
}

export async function projektSoftDelete(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('projekte')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/dashboard/projekte')
  redirect('/dashboard/projekte')
}
