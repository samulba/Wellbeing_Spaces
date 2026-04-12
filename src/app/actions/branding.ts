'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Branding } from '@/lib/supabase/types'

// ── Branding laden (Admin-Seite) ──────────────────────────────
export async function brandingAbrufen(): Promise<Branding | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('branding')
    .select('*')
    .order('created_at')
    .limit(1)
    .single()
  return data as Branding | null
}

// ── Branding laden (öffentlich, für Token-Seiten) ─────────────
export async function brandingFuerToken(): Promise<Branding | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('branding')
    .select('*')
    .order('created_at')
    .limit(1)
    .single()
  return data as Branding | null
}

// ── Branding speichern ────────────────────────────────────────
export type BrandingDaten = Omit<Branding, 'id' | 'logo_url' | 'favicon_url' | 'created_at' | 'updated_at'>

export async function brandingAktualisieren(daten: BrandingDaten): Promise<{ fehler?: string }> {
  const supabase = await createClient()

  // Erst den bestehenden Datensatz holen (single-tenant: immer erster Eintrag)
  const { data: existing } = await supabase
    .from('branding')
    .select('id')
    .order('created_at')
    .limit(1)
    .single()

  if (!existing) return { fehler: 'Kein Branding-Datensatz gefunden.' }

  const { error } = await supabase
    .from('branding')
    .update(daten)
    .eq('id', existing.id)

  if (error) return { fehler: 'Speichern fehlgeschlagen.' }

  revalidatePath('/dashboard/einstellungen')
  revalidatePath('/dashboard/einstellungen/branding')
  return {}
}

// ── Logo hochladen ────────────────────────────────────────────
export async function brandingLogoHochladen(
  prevState: { fehler?: string; url?: string } | null,
  formData: FormData
): Promise<{ fehler?: string; url?: string }> {
  const file = formData.get('logo') as File | null
  if (!file || file.size === 0) return { fehler: 'Keine Datei ausgewählt.' }
  if (file.size > 3 * 1024 * 1024) return { fehler: 'Datei zu groß (max. 3 MB).' }

  const supabase = await createClient()
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `branding-logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('branding')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { fehler: 'Upload fehlgeschlagen.' }

  const { data: urlData } = supabase.storage.from('branding').getPublicUrl(path)
  const logo_url = `${urlData.publicUrl}?t=${Date.now()}`

  const { data: existing } = await supabase
    .from('branding')
    .select('id')
    .order('created_at')
    .limit(1)
    .single()

  if (!existing) return { fehler: 'Kein Branding-Datensatz gefunden.' }

  const { error: dbError } = await supabase
    .from('branding')
    .update({ logo_url })
    .eq('id', existing.id)

  if (dbError) return { fehler: 'URL konnte nicht gespeichert werden.' }

  revalidatePath('/dashboard/einstellungen/branding')
  return { url: logo_url }
}
