'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getEinstellungen(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase.from('einstellungen').select('schluessel, wert')
  if (!data) return {}
  return Object.fromEntries(data.map((r) => [r.schluessel, r.wert]))
}

export type EinstellungActionState = { fehler?: string; erfolg?: string } | null

async function upsertEinstellung(schluessel: string, wert: string) {
  const supabase = await createClient()
  return supabase.from('einstellungen').upsert(
    { schluessel, wert, updated_at: new Date().toISOString() },
    { onConflict: 'schluessel' }
  )
}

export async function saveAllgemein(
  prevState: EinstellungActionState,
  formData: FormData
): Promise<EinstellungActionState> {
  const appName = (formData.get('app_name') as string)?.trim()
  const mwst = (formData.get('mwst_satz') as string)?.trim()

  if (!appName) return { fehler: 'App-Name darf nicht leer sein.' }
  const mwstNum = parseFloat(mwst)
  if (isNaN(mwstNum) || mwstNum < 0 || mwstNum > 100)
    return { fehler: 'MwSt. muss eine Zahl zwischen 0 und 100 sein.' }

  const [r1, r2] = await Promise.all([
    upsertEinstellung('app_name', appName),
    upsertEinstellung('mwst_satz', String(mwstNum)),
  ])
  if (r1.error || r2.error) return { fehler: 'Fehler beim Speichern.' }

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: 'Einstellungen gespeichert.' }
}

export async function addKategorie(
  prevState: EinstellungActionState,
  formData: FormData
): Promise<EinstellungActionState> {
  const name = (formData.get('kategorie') as string)?.trim()
  if (!name) return { fehler: 'Name darf nicht leer sein.' }

  const supabase = await createClient()
  const { data } = await supabase
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'produktkategorien')
    .single()

  const liste = data?.wert ? data.wert.split(',').map((s: string) => s.trim()) : []
  if (liste.includes(name)) return { fehler: 'Kategorie existiert bereits.' }
  liste.push(name)

  const { error } = await upsertEinstellung('produktkategorien', liste.join(','))
  if (error) return { fehler: 'Fehler beim Speichern.' }

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: `Kategorie „${name}" hinzugefügt.` }
}

export async function deleteKategorie(name: string): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'produktkategorien')
    .single()

  if (!data?.wert) return
  const liste = data.wert
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s !== name)

  await upsertEinstellung('produktkategorien', liste.join(','))
  revalidatePath('/dashboard/einstellungen')
}
