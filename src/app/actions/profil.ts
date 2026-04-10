'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ProfilActionState = { fehler?: string; erfolg?: string } | null

export async function updateProfil(
  prevState: ProfilActionState,
  formData: FormData
): Promise<ProfilActionState> {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()

  if (!email) return { fehler: 'E-Mail darf nicht leer sein.' }

  const { error } = await supabase.auth.updateUser({
    email,
    data: { full_name: name || null },
  })

  if (error) return { fehler: error.message }

  revalidatePath('/dashboard/profil')
  return { erfolg: 'Profil aktualisiert.' }
}

export async function updatePasswort(
  prevState: ProfilActionState,
  formData: FormData
): Promise<ProfilActionState> {
  const supabase = await createClient()
  const passwort = formData.get('passwort') as string
  const bestaetigung = formData.get('bestaetigung') as string

  if (!passwort || passwort.length < 6)
    return { fehler: 'Passwort muss mindestens 6 Zeichen lang sein.' }
  if (passwort !== bestaetigung)
    return { fehler: 'Passwörter stimmen nicht überein.' }

  const { error } = await supabase.auth.updateUser({ password: passwort })
  if (error) return { fehler: error.message }

  return { erfolg: 'Passwort geändert.' }
}
