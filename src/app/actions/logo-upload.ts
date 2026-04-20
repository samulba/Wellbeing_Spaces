'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type LogoUploadState = { fehler?: string; url?: string } | null

// Sichere Dateinamen: nur Buchstaben/Zahlen, sonst kippen manche Storage-Backends
// beim Decoden der Keys aus.
function safeExt(original: string): string {
  const match = original.toLowerCase().match(/\.([a-z0-9]{2,5})$/)
  const ext = match?.[1] ?? 'jpg'
  const whitelist = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
  return whitelist.includes(ext) ? ext : 'jpg'
}

export async function kundeLogoHochladen(
  kundeId: string,
  prevState: LogoUploadState,
  formData: FormData
): Promise<LogoUploadState> {
  const file = formData.get('logo') as File | null
  if (!file || file.size === 0) return { fehler: 'Keine Datei ausgewählt.' }
  if (file.size > 50 * 1024 * 1024) return { fehler: 'Datei ist zu groß (max. 50 MB).' }

  // Auth + Org-Ownership zuerst prüfen (user-client)
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { fehler: 'Nicht angemeldet.' }
  let orgId: string
  try { orgId = await getOrganisationId() }
  catch { return { fehler: 'Keine Organisation gefunden.' } }

  // Kunde gehört zur Org?
  const { data: kunde, error: kundeErr } = await userClient
    .from('kunden')
    .select('id')
    .eq('id', kundeId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (kundeErr || !kunde) return { fehler: 'Kunde nicht gefunden.' }

  // Upload über Admin-Client (umgeht Storage-RLS; Ownership haben wir schon geprüft)
  const admin = createAdminClient()
  const path  = `${kundeId}.${safeExt(file.name)}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('kunden-logos')
    .upload(path, bytes, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    })

  if (uploadError) {
    console.error('[kundeLogoHochladen] Storage-Upload fehlgeschlagen:', uploadError)
    return { fehler: `Upload fehlgeschlagen: ${uploadError.message}` }
  }

  const { data: urlData } = admin.storage.from('kunden-logos').getPublicUrl(path)
  const logo_url = `${urlData.publicUrl}?t=${Date.now()}`

  const { error: dbError } = await admin
    .from('kunden')
    .update({ logo_url })
    .eq('id', kundeId)
    .eq('organisation_id', orgId)

  if (dbError) {
    console.error('[kundeLogoHochladen] DB-Update fehlgeschlagen:', dbError)
    return { fehler: 'URL konnte nicht gespeichert werden.' }
  }

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
  if (file.size > 50 * 1024 * 1024) return { fehler: 'Datei ist zu groß (max. 50 MB).' }

  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { fehler: 'Nicht angemeldet.' }
  let orgId: string
  try { orgId = await getOrganisationId() }
  catch { return { fehler: 'Keine Organisation gefunden.' } }

  const { data: partner, error: partnerErr } = await userClient
    .from('partner')
    .select('id')
    .eq('id', partnerId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (partnerErr || !partner) return { fehler: 'Partner nicht gefunden.' }

  const admin = createAdminClient()
  const path  = `${partnerId}.${safeExt(file.name)}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('partner-logos')
    .upload(path, bytes, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    })

  if (uploadError) {
    console.error('[partnerLogoHochladen] Storage-Upload fehlgeschlagen:', uploadError)
    return { fehler: `Upload fehlgeschlagen: ${uploadError.message}` }
  }

  const { data: urlData } = admin.storage.from('partner-logos').getPublicUrl(path)
  const logo_url = `${urlData.publicUrl}?t=${Date.now()}`

  const { error: dbError } = await admin
    .from('partner')
    .update({ logo_url })
    .eq('id', partnerId)
    .eq('organisation_id', orgId)

  if (dbError) {
    console.error('[partnerLogoHochladen] DB-Update fehlgeschlagen:', dbError)
    return { fehler: 'URL konnte nicht gespeichert werden.' }
  }

  revalidatePath('/dashboard/partner')
  revalidatePath(`/dashboard/partner/${partnerId}`)
  return { url: logo_url }
}
