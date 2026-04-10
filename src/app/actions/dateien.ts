'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function dateiEintragen(
  projektId: string,
  dateiName: string,
  dateiUrl: string,
  dateiTyp: string,
  dateiGroesse: number
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('dateien').insert({
    projekt_id: projektId,
    datei_name: dateiName,
    datei_url: dateiUrl,
    datei_typ: dateiTyp,
    dateigroesse: dateiGroesse,
  })
  if (error) return { fehler: 'Fehler beim Speichern.' }
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return {}
}

export async function dateiLoeschen(
  dateiId: string,
  projektId: string,
  storagePfad: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('dateien')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', dateiId)

  // Datei aus Storage löschen
  if (storagePfad) {
    await supabase.storage.from('projekt-dateien').remove([storagePfad])
  }

  revalidatePath(`/dashboard/projekte/${projektId}`)
}
