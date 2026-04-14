'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { MoebelSymbol, CustomMoebel } from '@/lib/supabase/types'
import { getOrganisationIdOrNull } from '@/lib/supabase/server'

/** Canvas-State (Fabric.js JSON) in der DB speichern. */
export async function grundrissSpeichern(
  raumId: string,
  canvasJson: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('raeume')
    .update({ grundriss_json: JSON.parse(canvasJson) })
    .eq('id', raumId)
  if (error) return { fehler: 'Fehler beim Speichern.' }
  return {}
}

/** Canvas-State aus der DB laden. */
export async function grundrissLaden(
  raumId: string
): Promise<{ json: string | null; fehler?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('raeume')
    .select('grundriss_json')
    .eq('id', raumId)
    .single()
  if (error) return { json: null, fehler: 'Fehler beim Laden.' }
  return {
    json: data.grundriss_json ? JSON.stringify(data.grundriss_json) : null,
  }
}

/** Raummaße (Breite, Länge, Höhe) speichern. */
export async function raumMasseAktualisieren(
  raumId: string,
  breiteM: number | null,
  laengeM: number | null,
  hoeheM: number | null,
  projektId: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('raeume')
    .update({ breite_m: breiteM, laenge_m: laengeM, hoehe_m: hoeheM })
    .eq('id', raumId)
  if (error) return { fehler: 'Fehler beim Speichern der Maße.' }
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}/planer`)
  return {}
}

/** Alle verfügbaren Möbelsymbole laden (System + eigene Org). */
export async function getMoebelSymbole(): Promise<MoebelSymbol[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('moebel_symbole')
    .select('*')
    .order('ist_system', { ascending: false })
    .order('name')
  return (data ?? []) as MoebelSymbol[]
}

/** Eigene Custom-Möbel der Organisation laden. */
export async function getCustomMoebel(): Promise<CustomMoebel[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('custom_moebel')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as CustomMoebel[]
}

/** Freigabe-Status eines Raums abrufen (Token + aktiv). */
export async function getRaumFreigabeInfo(
  raumId: string
): Promise<{ token: string | null; aktiv: boolean; fehler?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('raeume')
    .select('freigabe_token, freigabe_aktiv')
    .eq('id', raumId)
    .single()
  if (error || !data) return { token: null, aktiv: false, fehler: 'Fehler beim Laden.' }
  return { token: data.freigabe_token as string | null, aktiv: data.freigabe_aktiv ?? false }
}

/** Freigabe aktivieren oder deaktivieren. */
export async function raumFreigabeAktualisieren(
  raumId: string,
  aktiv: boolean,
  projektId: string
): Promise<{ token?: string; fehler?: string }> {
  const supabase = await createClient()
  const updates: Record<string, unknown> = { freigabe_aktiv: aktiv }
  if (aktiv) updates.freigabe_erstellt_am = new Date().toISOString()
  const { data, error } = await supabase
    .from('raeume')
    .update(updates)
    .eq('id', raumId)
    .select('freigabe_token')
    .single()
  if (error || !data) return { fehler: 'Fehler beim Aktualisieren.' }
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}/planer`)
  return { token: data.freigabe_token as string }
}

/** Boden-Textur und Wandfarbe eines Raums speichern. */
export async function raumTexturenSpeichern(
  raumId: string,
  bodenTextur: string,
  wandfarbe: string,
  projektId: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('raeume')
    .update({ boden_textur: bodenTextur, wandfarbe })
    .eq('id', raumId)
  if (error) return { fehler: 'Fehler beim Speichern.' }
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}/planer`)
  return {}
}

/** Öffentlichen Raumplan via Token laden (Admin-Client, kein Auth erforderlich). */
export async function getRaumplanOeffentlich(token: string): Promise<{
  raumName: string
  projektName: string
  canvasJson: string | null
  breiteM: number | null
  laengeM: number | null
  hoeheM: number | null
  orgId: string | null
} | null> {
  const admin = createAdminClient()
  const { data: raum } = await admin
    .from('raeume')
    .select('id, name, grundriss_json, breite_m, laenge_m, hoehe_m, freigabe_aktiv, projekt_id, projekte(name, organisation_id)')
    .eq('freigabe_token', token)
    .is('deleted_at', null)
    .single()
  if (!raum || !raum.freigabe_aktiv) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projekt = (raum.projekte as any)
  return {
    raumName: raum.name,
    projektName: projekt?.name ?? '',
    canvasJson: raum.grundriss_json ? JSON.stringify(raum.grundriss_json) : null,
    breiteM: raum.breite_m,
    laengeM: raum.laenge_m,
    hoeheM: raum.hoehe_m,
    orgId: projekt?.organisation_id ?? null,
  }
}

/** Neues Custom-Möbel speichern. */
export async function customMoebelErstellen(input: {
  name: string; kategorie: string; breite_cm: number; laenge_cm: number; farbe: string
}): Promise<{ id: string } | { fehler: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { fehler: 'Nicht eingeloggt.' }
  const orgId = await getOrganisationIdOrNull()
  const { data, error } = await supabase
    .from('custom_moebel')
    .insert({
      organisation_id: orgId,
      name: input.name.trim(),
      kategorie: input.kategorie,
      breite_cm: input.breite_cm,
      laenge_cm: input.laenge_cm,
      farbe: input.farbe,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (error || !data) return { fehler: 'Fehler beim Speichern.' }
  return { id: data.id }
}
