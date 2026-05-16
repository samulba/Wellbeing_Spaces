'use server'

/**
 * Onboarding-Upload-Actions (Migration 108).
 *
 * Oeffentliche Routes (Token-basiert) zum Hochladen + Loeschen von
 * Dateien durch den Kunden im Onboarding-Formular. Storage-Bucket:
 * `onboarding-uploads`, Pfad-Convention: `<anfrage_id>/<random>-<name>`.
 *
 * Aufrufer aus Customer-Form. Schreibt Metadaten nach Storage-Upload
 * in `onboarding_dateien` ueber `onboardingDateiSpeichern`.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { onboardingDateiSpeichern } from './onboarding-erweitert'
import type { OnboardingDatei } from '@/lib/supabase/types'

const BUCKET = 'onboarding-uploads'

/** Standard-Whitelist wenn die Frage keine `upload_typen` definiert. */
const DEFAULT_ERLAUBTE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
])

/**
 * Prueft eine Datei gegen die Vorlage-Konfiguration (Typen + max-MB).
 * Wenn die Frage MIMEs auflistet (z.B. ['image/*', 'application/pdf']),
 * werden Wildcards (image/*) unterstuetzt.
 */
function mimeErlaubt(fileMime: string, erlaubt: string[] | undefined): boolean {
  if (!erlaubt || erlaubt.length === 0) return DEFAULT_ERLAUBTE_MIMES.has(fileMime)
  return erlaubt.some((muster) => {
    if (muster === fileMime) return true
    if (muster.endsWith('/*')) return fileMime.startsWith(muster.slice(0, -1))
    return false
  })
}

export interface OnboardingUploadResult {
  erfolg: boolean
  datei?: OnboardingDatei
  fehler?: string
}

/**
 * Laedt eine einzelne Datei zu Supabase Storage hoch und persistiert die
 * Metadaten. Wird vom Customer-Form aufgerufen — FormData-Pattern fuer
 * zuverlaessige File-Serialisierung ueber Next.js Server-Actions.
 *
 * Erwartete FormData-Felder:
 *  - file:           File (Pflicht)
 *  - token:          string (Pflicht — Onboarding-Token)
 *  - frageId:        string | '' (Frage-ID oder leer)
 *  - erlaubteTypen:  comma-separated MIME-Liste (optional)
 *  - maxMb:          string (optional, default 50)
 */
export async function onboardingDateiHochladen(
  formData: FormData,
): Promise<OnboardingUploadResult> {
  const file    = formData.get('file') as File | null
  const token   = formData.get('token') as string | null
  const frageId = (formData.get('frageId') as string | null) || null
  const erlaubteTypenRaw = (formData.get('erlaubteTypen') as string | null) || ''
  const erlaubteTypen = erlaubteTypenRaw ? erlaubteTypenRaw.split(',').map(s => s.trim()).filter(Boolean) : undefined
  const maxMb = Math.max(1, Number(formData.get('maxMb')) || 50)

  if (!token) return { erfolg: false, fehler: 'Token fehlt.' }
  if (!file || file.size === 0) return { erfolg: false, fehler: 'Datei ist leer.' }
  if (file.size > maxMb * 1024 * 1024) {
    return { erfolg: false, fehler: `Datei zu groß (max. ${maxMb} MB).` }
  }
  if (!mimeErlaubt(file.type, erlaubteTypen)) {
    return { erfolg: false, fehler: `Dateityp ${file.type || 'unbekannt'} nicht erlaubt.` }
  }

  try {
    const supabase = createAdminClient()

    // Anfrage-Status pruefen
    const { data: anfrage } = await supabase
      .from('onboarding_anfragen')
      .select('id, status, gueltig_bis')
      .eq('token', token)
      .maybeSingle()
    if (!anfrage) return { erfolg: false, fehler: 'Onboarding-Link nicht gefunden.' }
    if (!['offen', 'in_bearbeitung'].includes(anfrage.status)) {
      return { erfolg: false, fehler: 'Dieses Onboarding ist bereits abgeschlossen.' }
    }
    if (anfrage.gueltig_bis && new Date(anfrage.gueltig_bis) < new Date()) {
      return { erfolg: false, fehler: 'Dieser Onboarding-Link ist abgelaufen.' }
    }

    // Storage-Pfad bauen — Anfrage-ID als Folder fuer Org-Scope-Policy
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const random = crypto.randomUUID().slice(0, 8)
    const pfad = `${anfrage.id}/${Date.now()}-${random}-${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(pfad, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })
    if (uploadErr) {
      console.error('[onboardingDateiHochladen:storage]', uploadErr)
      return { erfolg: false, fehler: 'Upload fehlgeschlagen: ' + uploadErr.message }
    }

    // Metadaten persistieren via bestehende Action
    const meta = await onboardingDateiSpeichern(token, {
      frage_id:     frageId,
      dateiname:    file.name,
      dateityp:     file.type || 'application/octet-stream',
      dateigroesse: file.size,
      storage_pfad: pfad,
    })

    if ('fehler' in meta) {
      // Cleanup: Storage-Objekt wieder loeschen
      await supabase.storage.from(BUCKET).remove([pfad])
      return { erfolg: false, fehler: meta.fehler }
    }

    return {
      erfolg: true,
      datei: {
        id:           meta.id,
        organisation_id: null,
        anfrage_id:   anfrage.id,
        frage_id:     frageId,
        dateiname:    file.name,
        dateityp:     file.type || 'application/octet-stream',
        dateigroesse: file.size,
        storage_pfad: pfad,
        vorschau_url: null,
        created_at:   new Date().toISOString(),
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload-Fehler.'
    console.error('[onboardingDateiHochladen]', e)
    return { erfolg: false, fehler: msg }
  }
}

/**
 * Datei wieder entfernen (Kunden-seitig vor dem Submit moeglich).
 * Token-validiert.
 */
export async function onboardingDateiEntfernen(
  token: string,
  dateiId: string,
): Promise<{ erfolg: boolean; fehler?: string }> {
  try {
    const supabase = createAdminClient()

    const { data: anfrage } = await supabase
      .from('onboarding_anfragen')
      .select('id, status')
      .eq('token', token)
      .maybeSingle()
    if (!anfrage) return { erfolg: false, fehler: 'Anfrage nicht gefunden.' }
    if (!['offen', 'in_bearbeitung'].includes(anfrage.status)) {
      return { erfolg: false, fehler: 'Onboarding bereits abgeschlossen.' }
    }

    const { data: datei } = await supabase
      .from('onboarding_dateien')
      .select('id, storage_pfad, anfrage_id')
      .eq('id', dateiId)
      .eq('anfrage_id', anfrage.id)
      .maybeSingle()
    if (!datei) return { erfolg: false, fehler: 'Datei nicht gefunden.' }

    await supabase.storage.from(BUCKET).remove([datei.storage_pfad])
    await supabase.from('onboarding_dateien').delete().eq('id', dateiId).eq('anfrage_id', anfrage.id)

    return { erfolg: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Fehler beim Entfernen.'
    return { erfolg: false, fehler: msg }
  }
}

/**
 * Erstellt eine signierte URL (1 Stunde gueltig) fuer eine Datei.
 * Admin-Side, in der Detail-Ansicht aufgerufen — keine Token-Pflicht,
 * aber org-scope wird durch RLS auf onboarding_dateien erzwungen
 * (RLS in Mig. 054 ist org-scoped). Trotzdem doppelte Pruefung im
 * Code, damit die Action nicht ueber andere Pfade ausgenutzt wird.
 */
export async function onboardingDateiSignierteUrl(
  dateiId: string,
): Promise<{ url?: string; fehler?: string }> {
  try {
    const { createClient, getOrganisationId } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const orgId = await getOrganisationId()

    const { data: datei } = await supabase
      .from('onboarding_dateien')
      .select('storage_pfad')
      .eq('id', dateiId)
      .eq('organisation_id', orgId)
      .maybeSingle()
    if (!datei) return { fehler: 'Datei nicht gefunden.' }

    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(datei.storage_pfad, 3600)
    if (error || !data) return { fehler: 'Signierte URL konnte nicht erzeugt werden.' }

    return { url: data.signedUrl }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Fehler.'
    return { fehler: msg }
  }
}

/** Alle Dateien einer Anfrage laden (Admin). */
export async function getAnfrageDateien(anfrageId: string): Promise<OnboardingDatei[]> {
  const { createClient, getOrganisationId } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data } = await supabase
    .from('onboarding_dateien')
    .select('*')
    .eq('anfrage_id', anfrageId)
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })
  return (data ?? []) as OnboardingDatei[]
}
