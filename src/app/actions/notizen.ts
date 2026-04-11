'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type NotizActionState = { fehler?: string; erfolg?: string } | null

type NotizTyp = 'kunde' | 'projekt' | 'partner'

function pfadFuer(typ: NotizTyp, id: string) {
  if (typ === 'kunde')   return `/dashboard/kunden/${id}`
  if (typ === 'projekt') return `/dashboard/projekte/${id}`
  return `/dashboard/partner/${id}`
}

export async function notizHinzufuegen(
  typ: NotizTyp,
  referenzId: string,
  prevState: NotizActionState,
  formData: FormData
): Promise<NotizActionState> {
  const inhalt = (formData.get('inhalt') as string)?.trim()
  if (!inhalt) return { fehler: 'Notiz darf nicht leer sein.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('notizen').insert({
    typ,
    referenz_id:  referenzId,
    inhalt,
    erstellt_von: user?.email ?? null,
  })

  if (error) return { fehler: 'Fehler beim Speichern.' }

  revalidatePath(pfadFuer(typ, referenzId))
  return { erfolg: 'Notiz gespeichert.' }
}

export async function notizAktualisieren(
  id: string,
  typ: NotizTyp,
  referenzId: string,
  prevState: NotizActionState,
  formData: FormData
): Promise<NotizActionState> {
  const inhalt = (formData.get('inhalt') as string)?.trim()
  if (!inhalt) return { fehler: 'Inhalt darf nicht leer sein.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('notizen')
    .update({ inhalt, bearbeitet_am: new Date().toISOString() })
    .eq('id', id)

  if (error) return { fehler: 'Fehler beim Aktualisieren.' }

  revalidatePath(pfadFuer(typ, referenzId))
  return { erfolg: 'Notiz aktualisiert.' }
}

export async function notizLoeschen(
  id: string,
  typ: NotizTyp,
  referenzId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('notizen')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath(pfadFuer(typ, referenzId))
}
