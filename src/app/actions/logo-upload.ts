'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type LogoUploadState = { fehler?: string; url?: string } | null

export async function kundeLogoHochladen(
  kundeId: string,
  prevState: LogoUploadState,
  formData: FormData
): Promise<LogoUploadState> {
  const file = formData.get('logo') as File | null
  if (!file || file.size === 0) return { fehler: 'Keine Datei ausgewählt.' }
  if (file.size > 2 * 1024 * 1024) return { fehler: 'Datei ist zu groß (max. 2 MB).' }

  const supabase = await createClient()
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${kundeId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('kunden-logos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { fehler: 'Upload fehlgeschlagen.' }

  const { data: urlData } = supabase.storage.from('kunden-logos').getPublicUrl(path)
  const logo_url = `${urlData.publicUrl}?t=${Date.now()}`

  const { error: dbError } = await supabase
    .from('kunden')
    .update({ logo_url })
    .eq('id', kundeId)

  if (dbError) return { fehler: 'URL konnte nicht gespeichert werden.' }

  revalidatePath('/dashboard/kunden')
  revalidatePath(`/dashboard/kunden/${kundeId}`)
  return { url: logo_url }
}

export async function partnerLogoHochladen(
  partnerId: string,
  prevState: LogoUploadState,
  formData: FormData
): Promise<LogoUploadState> {
  const file = formData.get('logo') as File | null
  if (!file || file.size === 0) return { fehler: 'Keine Datei ausgewählt.' }
  if (file.size > 2 * 1024 * 1024) return { fehler: 'Datei ist zu groß (max. 2 MB).' }

  const supabase = await createClient()
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${partnerId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('partner-logos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { fehler: 'Upload fehlgeschlagen.' }

  const { data: urlData } = supabase.storage.from('partner-logos').getPublicUrl(path)
  const logo_url = `${urlData.publicUrl}?t=${Date.now()}`

  const { error: dbError } = await supabase
    .from('partner')
    .update({ logo_url })
    .eq('id', partnerId)

  if (dbError) return { fehler: 'URL konnte nicht gespeichert werden.' }

  revalidatePath('/dashboard/partner')
  revalidatePath(`/dashboard/partner/${partnerId}`)
  return { url: logo_url }
}
