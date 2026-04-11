'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type NotizActionState = { fehler?: string; erfolg?: string } | null

type NotizTyp = 'kunde' | 'projekt' | 'partner' | 'produkt'

async function pfadFuer(typ: NotizTyp, id: string): Promise<string> {
  if (typ === 'kunde')   return `/dashboard/kunden/${id}`
  if (typ === 'projekt') return `/dashboard/projekte/${id}`
  if (typ === 'partner') return `/dashboard/partner/${id}`
  // 'produkt' – Raum + Projekt über DB ermitteln
  const supabase = await createClient()
  const { data } = await supabase
    .from('produkte')
    .select('raum_id, raeume(projekt_id)')
    .eq('id', id)
    .single()
  if (data?.raum_id && data?.raeume) {
    const raeume = data.raeume as unknown as { projekt_id: string }
    return `/dashboard/projekte/${raeume.projekt_id}/raeume/${data.raum_id}/produkte/${id}/bearbeiten`
  }
  return '/dashboard/produkte'
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

  revalidatePath(await pfadFuer(typ, referenzId))
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

  revalidatePath(await pfadFuer(typ, referenzId))
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

  revalidatePath(await pfadFuer(typ, referenzId))
}
