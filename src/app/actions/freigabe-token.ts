'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function tokenGenerieren(
  projektId: string
): Promise<{ token: string } | { fehler: string }> {
  const supabase = await createClient()

  // Bestehenden aktiven Token zurückgeben falls vorhanden
  const { data: existing } = await supabase
    .from('freigabe_tokens')
    .select('token')
    .eq('projekt_id', projektId)
    .eq('aktiv', true)
    .maybeSingle()

  if (existing) return { token: existing.token }

  // Neuen Token anlegen (token wird von DB generiert via DEFAULT)
  const { data, error } = await supabase
    .from('freigabe_tokens')
    .insert({ projekt_id: projektId })
    .select('token')
    .single()

  if (error || !data) return { fehler: 'Token konnte nicht erstellt werden.' }

  revalidatePath(`/dashboard/projekte/${projektId}`)
  return { token: data.token }
}

export async function tokenDeaktivieren(
  tokenId: string,
  projektId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('freigabe_tokens')
    .update({ aktiv: false })
    .eq('id', tokenId)

  revalidatePath(`/dashboard/projekte/${projektId}`)
}

export async function tokenErneuern(
  projektId: string,
  alterTokenId: string
): Promise<{ token: string } | { fehler: string }> {
  const supabase = await createClient()

  // Alten Token deaktivieren
  await supabase
    .from('freigabe_tokens')
    .update({ aktiv: false })
    .eq('id', alterTokenId)

  // Neuen Token anlegen
  const { data, error } = await supabase
    .from('freigabe_tokens')
    .insert({ projekt_id: projektId })
    .select('token')
    .single()

  if (error || !data) return { fehler: 'Token konnte nicht erneuert werden.' }

  revalidatePath(`/dashboard/projekte/${projektId}`)
  return { token: data.token }
}
