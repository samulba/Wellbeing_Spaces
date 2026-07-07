'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const BUCKET = 'projekt-dateien'

// Erlaubte Typen + Größe (identisch zum bisherigen Client-Verhalten).
const ERLAUBTE_TYPEN = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024

/**
 * Leitet den Storage-Pfad aus dem gespeicherten Wert ab.
 * Neue Einträge speichern direkt den Pfad; Alt-Einträge (vor der Signed-URL-
 * Umstellung) haben eine volle Public-URL `…/projekt-dateien/<pfad>` — daraus
 * wird der Pfad extrahiert, damit Bestandsdateien weiter funktionieren.
 */
function pfadAusWert(wert: string): string {
  if (wert.includes('/projekt-dateien/')) {
    return wert.split('/projekt-dateien/').pop() ?? wert
  }
  return wert
}

export interface DateiUploadResult {
  fehler?: string
  id?: string
  storage_pfad?: string
}

/**
 * Lädt eine Projekt-Datei serverseitig in den (privaten) Bucket `projekt-dateien`
 * hoch und persistiert die Metadaten. Analog zu onboarding-uploads.ts:
 *  - Auth + Org werden geprüft
 *  - das Zielprojekt muss zur Org des Users gehören (Ownership)
 *  - Pfad-Convention: <orgId>/<projektId>/<random>-<name>
 *  - in `dateien` wird der Storage-PFAD gespeichert (nicht mehr die Public-URL)
 *
 * FormData-Felder:  file: File (Pflicht) · projektId: string (Pflicht)
 */
export async function dateiHochladen(formData: FormData): Promise<DateiUploadResult> {
  const file      = formData.get('file') as File | null
  const projektId = (formData.get('projektId') as string | null) || ''

  if (!projektId) return { fehler: 'Projekt fehlt.' }
  if (!file || file.size === 0) return { fehler: 'Datei ist leer.' }
  if (!ERLAUBTE_TYPEN.includes(file.type)) {
    return { fehler: 'Nur JPG, PNG, WebP und PDF sind erlaubt.' }
  }
  if (file.size > MAX_BYTES) {
    return { fehler: 'Datei darf maximal 10 MB groß sein.' }
  }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Ownership: Projekt gehört zur Org des Users
  const { data: projekt } = await supabase
    .from('projekte')
    .select('id')
    .eq('id', projektId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!projekt) return { fehler: 'Projekt nicht gefunden.' }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const random = crypto.randomUUID().slice(0, 8)
  const pfad = `${orgId}/${projektId}/${Date.now()}-${random}-${safeName}`

  const admin = createAdminClient()
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(pfad, arrayBuffer, { contentType: file.type, upsert: false })
  if (uploadErr) {
    console.error('[dateiHochladen:storage]', uploadErr)
    return { fehler: 'Upload fehlgeschlagen. Bitte erneut versuchen.' }
  }

  const { data: eintrag, error } = await supabase
    .from('dateien')
    .insert({
      projekt_id:      projektId,
      organisation_id: orgId,
      datei_name:      file.name,
      datei_url:       pfad, // Storage-Pfad, keine Public-URL
      datei_typ:       file.type,
      dateigroesse:    file.size,
    })
    .select('id')
    .single()

  if (error || !eintrag) {
    // Cleanup: verwaistes Storage-Objekt entfernen
    await admin.storage.from(BUCKET).remove([pfad])
    return { fehler: 'Fehler beim Speichern.' }
  }

  revalidatePath(`/dashboard/projekte/${projektId}`)
  return { id: eintrag.id as string, storage_pfad: pfad }
}

/**
 * Signierte URL (1 Stunde gültig) für eine Projekt-Datei.
 * Ownership: der Eintrag muss zu einem Projekt der Org des Users gehören.
 * Löst sowohl neue Pfad-Einträge als auch alte Public-URL-Einträge auf.
 */
export async function dateiSignierteUrl(dateiId: string): Promise<{ url?: string; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: datei } = await supabase
    .from('dateien')
    .select('datei_url, projekte!inner(organisation_id)')
    .eq('id', dateiId)
    .maybeSingle()

  const besitzerOrg = (datei?.projekte as unknown as { organisation_id: string | null } | null)?.organisation_id
  if (!datei || besitzerOrg !== orgId) return { fehler: 'Datei nicht gefunden.' }

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(pfadAusWert(datei.datei_url as string), 3600)
  if (error || !data) return { fehler: 'Signierte URL konnte nicht erzeugt werden.' }

  return { url: data.signedUrl }
}

/**
 * Soft-Delete einer Projekt-Datei + Entfernen aus dem Storage.
 * Ownership wird serverseitig geprüft (Projekt → Org des Users); der Storage-Pfad
 * wird aus dem DB-Eintrag abgeleitet (kein Vertrauen auf Client-Input).
 */
export async function dateiLoeschen(dateiId: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: datei } = await supabase
    .from('dateien')
    .select('datei_url, projekt_id, projekte!inner(organisation_id)')
    .eq('id', dateiId)
    .maybeSingle()

  const besitzerOrg = (datei?.projekte as unknown as { organisation_id: string | null } | null)?.organisation_id
  if (!datei || besitzerOrg !== orgId) return

  await supabase
    .from('dateien')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', dateiId)

  const pfad = pfadAusWert(datei.datei_url as string)
  if (pfad) {
    const admin = createAdminClient()
    await admin.storage.from(BUCKET).remove([pfad])
  }

  revalidatePath(`/dashboard/projekte/${datei.projekt_id as string}`)
}
