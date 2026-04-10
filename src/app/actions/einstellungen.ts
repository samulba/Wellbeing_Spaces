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

// ── Allgemein ─────────────────────────────────────────────────

export async function saveAllgemein(
  prevState: EinstellungActionState,
  formData: FormData
): Promise<EinstellungActionState> {
  const appName = (formData.get('app_name') as string)?.trim()
  const mwst    = (formData.get('mwst_satz') as string)?.trim()

  if (!appName) return { fehler: 'App-Name darf nicht leer sein.' }

  const mwstNum = parseFloat(mwst)
  if (isNaN(mwstNum) || mwstNum < 0 || mwstNum > 100)
    return { fehler: 'MwSt. muss eine Zahl zwischen 0 und 100 sein.' }

  const felder: [string, string][] = [
    ['app_name',             appName],
    ['mwst_satz',            String(mwstNum)],
    ['standardwaehrung',     (formData.get('standardwaehrung') as string) || 'EUR'],
    ['sprache',              (formData.get('sprache')          as string) || 'Deutsch'],
    ['zeitzone',             (formData.get('zeitzone')         as string) || 'Europe/Berlin'],
    ['datumsformat',         (formData.get('datumsformat')     as string) || 'DD.MM.YYYY'],
    ['budget_warnschwelle',  (formData.get('budget_warnschwelle') as string) || '80'],
  ]

  const ergebnisse = await Promise.all(felder.map(([k, v]) => upsertEinstellung(k, v)))
  if (ergebnisse.some((r) => r.error))
    return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: 'Einstellungen gespeichert.' }
}

// ── Listen (Kategorien / Raumtypen / Projektarten) ────────────

export async function addListItem(
  schluessel: string,
  prevState: EinstellungActionState,
  formData: FormData
): Promise<EinstellungActionState> {
  const name = (formData.get('name') as string)?.trim()
  if (!name) return { fehler: 'Name darf nicht leer sein.' }

  const supabase = await createClient()
  const { data } = await supabase
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', schluessel)
    .single()

  const liste = data?.wert
    ? data.wert.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []
  if (liste.includes(name)) return { fehler: `„${name}" existiert bereits.` }
  liste.push(name)

  const { error } = await upsertEinstellung(schluessel, liste.join(','))
  if (error) return { fehler: 'Fehler beim Speichern.' }

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: `„${name}" hinzugefügt.` }
}

export async function deleteListItem(schluessel: string, name: string): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', schluessel)
    .single()

  if (!data?.wert) return

  const liste = data.wert
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s !== name)

  await upsertEinstellung(schluessel, liste.join(','))
  revalidatePath('/dashboard/einstellungen')
}

// ── Freigabe-Einstellungen ────────────────────────────────────

export async function saveFreigabe(
  prevState: EinstellungActionState,
  formData: FormData
): Promise<EinstellungActionState> {
  const ablaufzeit  = (formData.get('freigabe_ablaufzeit')  as string)?.trim()
  const pinSchutz   = formData.get('freigabe_pin_schutz') === 'true' ? 'true' : 'false'

  const tage = parseInt(ablaufzeit, 10)
  if (isNaN(tage) || tage < 1 || tage > 365)
    return { fehler: 'Ablaufzeit muss zwischen 1 und 365 Tagen liegen.' }

  const ergebnisse = await Promise.all([
    upsertEinstellung('freigabe_ablaufzeit', String(tage)),
    upsertEinstellung('freigabe_pin_schutz', pinSchutz),
  ])
  if (ergebnisse.some((r) => r.error))
    return { fehler: 'Fehler beim Speichern.' }

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: 'Freigabe-Einstellungen gespeichert.' }
}
