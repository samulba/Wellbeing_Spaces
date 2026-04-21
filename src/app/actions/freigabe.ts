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
