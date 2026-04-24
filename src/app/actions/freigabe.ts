'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProduktStatus } from '@/lib/supabase/types'

export type FreigabeResult = { fehler: string } | { erfolg: true }

/**
 * Freigabe-Status auf raum_produkte setzen (Migration 076).
 * Nimmt raumProduktId statt produktId, damit jede Raum↔Produkt-
 * Kombination ihren eigenen Freigabe-Status bekommt.
 */
export async function freigabeStatusAendern(
  token: string,
  raumProduktId: string,
  status: ProduktStatus,
  kommentar: string
): Promise<FreigabeResult> {
  const supabase = createAdminClient()

  // 1. Token validieren
  const { data: tokenData } = await supabase
    .from('freigabe_tokens')
    .select('projekt_id, gueltig_bis')
    .eq('token', token)
    .eq('aktiv', true)
    .single()

  if (!tokenData) return { fehler: 'Ungültiger oder inaktiver Freigabe-Link.' }

  if (tokenData.gueltig_bis && new Date(tokenData.gueltig_bis) < new Date()) {
    return { fehler: 'Dieser Freigabe-Link ist abgelaufen.' }
  }

  // 2. raum_produkte-Eintrag gehört zum Projekt des Tokens
  const { data: rpEintrag } = await supabase
    .from('raum_produkte')
    .select('id, raeume!inner(projekt_id)')
    .eq('id', raumProduktId)
    .maybeSingle()

  const projektIdDesEintrags = (rpEintrag?.raeume as unknown as { projekt_id: string } | null)?.projekt_id
  if (!rpEintrag || projektIdDesEintrags !== tokenData.projekt_id) {
    return { fehler: 'Zugriff nicht erlaubt.' }
  }

  // 3. Status auf raum_produkte aktualisieren (per-Raum)
  const { error } = await supabase
    .from('raum_produkte')
    .update({
      freigabe_status:    status,
      freigabe_kommentar: kommentar.trim() || null,
    })
    .eq('id', raumProduktId)

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  return { erfolg: true }
}

/**
 * Admin setzt Freigabe für einen einzelnen raum_produkte-Eintrag zurück.
 * (Nimmt jetzt raumProduktId statt produktId.)
 */
export async function freigabeZuruecksetzenAdmin(raumProduktId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('raum_produkte')
    .update({ freigabe_status: 'ausstehend', freigabe_kommentar: null })
    .eq('id', raumProduktId)
  revalidatePath('/dashboard/freigaben')
}

/**
 * Bulk-Admin-Action: setzt den Freigabe-Status mehrerer raum_produkte gleichzeitig.
 * Wird aus der Freigaben-Dashboard-Auswahl-Toolbar aufgerufen. Schreibt einen
 * Audit-Eintrag pro Item (Kanal 'admin').
 */
export async function freigabeBulkStatusAendernAdmin(
  raumProduktIds: string[],
  neuerStatus: 'ausstehend' | 'freigegeben' | 'abgelehnt' | 'ueberarbeitung',
): Promise<{ erfolg: boolean; anzahl: number; fehler?: string }> {
  if (raumProduktIds.length === 0) return { erfolg: true, anzahl: 0 }

  const supabase = await createClient()

  // Aktuelle Rolle + User-Email des Admins (für Audit)
  const { data: { user } } = await supabase.auth.getUser()
  const akteur = user?.email ?? 'admin'

  // Snapshot für Audit-Log (alter Status + organisation_id)
  const { data: vorher } = await supabase
    .from('raum_produkte')
    .select('id, organisation_id, freigabe_status')
    .in('id', raumProduktIds)

  if (!vorher || vorher.length === 0) {
    return { erfolg: false, anzahl: 0, fehler: 'Keine der ausgewählten Einträge gefunden.' }
  }

  // Bulk-Update
  const { error } = await supabase
    .from('raum_produkte')
    .update({
      freigabe_status:    neuerStatus,
      freigabe_kommentar: neuerStatus === 'ausstehend' ? null : undefined,
    })
    .in('id', raumProduktIds)

  if (error) return { erfolg: false, anzahl: 0, fehler: 'Bulk-Update fehlgeschlagen: ' + error.message }

  // Bulk-Audit-Insert (ein Eintrag pro Item)
  try {
    const auditRows = vorher.map((v) => ({
      organisation_id: v.organisation_id,
      token_id:        null,
      raum_produkt_id: v.id,
      alter_status:    v.freigabe_status,
      neuer_status:    neuerStatus,
      kommentar:       null,
      geaendert_von:   akteur,
      kanal:           'admin' as const,
    }))
    await supabase.from('freigabe_audit').insert(auditRows)
  } catch (err) {
    console.error('[freigabeBulkStatusAendernAdmin] Audit fehlgeschlagen:', err)
    // Nicht fatal — Update war erfolgreich
  }

  revalidatePath('/dashboard/freigaben')
  return { erfolg: true, anzahl: vorher.length }
}
