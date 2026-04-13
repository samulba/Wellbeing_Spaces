'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ProjektStatus } from '@/lib/supabase/types'

export type ProjektActionState = { fehler: string } | null

export async function projektAnlegen(
  prevState: ProjektActionState,
  formData: FormData
): Promise<ProjektActionState> {
  const supabase = await createClient()

  const { error } = await supabase.from('projekte').insert({
    name: formData.get('name') as string,
    kunde_id: formData.get('kunde_id') as string,
    beschreibung: (formData.get('beschreibung') as string) || null,
    standort: (formData.get('standort') as string) || null,
    projektart: (formData.get('projektart') as string) || null,
    gesamtbudget: formData.get('gesamtbudget')
      ? Number(formData.get('gesamtbudget'))
      : null,
    status: 'offen',
  })

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/projekte')
  redirect('/dashboard/projekte')
}

export async function projektAktualisieren(
  id: string,
  prevState: ProjektActionState,
  formData: FormData
): Promise<ProjektActionState> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('projekte')
    .update({
      name: formData.get('name') as string,
      kunde_id: formData.get('kunde_id') as string,
      beschreibung: (formData.get('beschreibung') as string) || null,
      standort: (formData.get('standort') as string) || null,
      projektart: (formData.get('projektart') as string) || null,
      gesamtbudget: formData.get('gesamtbudget')
        ? Number(formData.get('gesamtbudget'))
        : null,
      deadline: (formData.get('deadline') as string) || null,
      status: formData.get('status') as ProjektStatus,
    })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/projekte')
  revalidatePath(`/dashboard/projekte/${id}`)
  redirect(`/dashboard/projekte/${id}`)
}

export async function projektStatusAendern(
  id: string,
  status: ProjektStatus
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('projekte')
    .update({ status })
    .eq('id', id)
    .is('deleted_at', null)

  revalidatePath(`/dashboard/projekte/${id}`)
  revalidatePath('/dashboard/projekte')
}

export async function projektSoftDelete(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('projekte')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/dashboard/projekte')
  redirect('/dashboard/projekte')
}

// ── Archivierung ──────────────────────────────────────────────

export async function projektArchivieren(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('projekte')
    .update({ archiviert: true, archiviert_am: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
  revalidatePath('/dashboard/projekte')
  revalidatePath(`/dashboard/projekte/${id}`)
}

export async function projektWiederherstellen(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('projekte')
    .update({ archiviert: false, archiviert_am: null })
    .eq('id', id)
    .is('deleted_at', null)
  revalidatePath('/dashboard/projekte')
  revalidatePath(`/dashboard/projekte/${id}`)
}

// ── Duplikation ───────────────────────────────────────────────

export interface DuplikationsOptionen {
  neuerName: string
  kundeId: string
  kopiereRaeume: boolean
  kopiereProdukte: boolean
}

export async function projektDuplizieren(
  quellId: string,
  optionen: DuplikationsOptionen
): Promise<{ id: string }> {
  const supabase = await createClient()

  // Quellprojekt laden
  const { data: quelle } = await supabase
    .from('projekte')
    .select('*')
    .eq('id', quellId)
    .is('deleted_at', null)
    .single()
  if (!quelle) throw new Error('Quellprojekt nicht gefunden')

  // Neues Projekt anlegen
  const { data: neuesProjekt, error: pErr } = await supabase
    .from('projekte')
    .insert({
      name:         optionen.neuerName,
      kunde_id:     optionen.kundeId,
      beschreibung: quelle.beschreibung,
      standort:     quelle.standort,
      projektart:   quelle.projektart,
      gesamtbudget: quelle.gesamtbudget,
      status:       'in_bearbeitung',
    })
    .select('id')
    .single()

  if (pErr || !neuesProjekt) throw new Error('Fehler beim Anlegen des Projekts')

  if (!optionen.kopiereRaeume) {
    revalidatePath('/dashboard/projekte')
    return { id: neuesProjekt.id }
  }

  // Räume laden + kopieren
  const { data: quellenRaeume } = await supabase
    .from('raeume')
    .select('*')
    .eq('projekt_id', quellId)
    .is('deleted_at', null)
    .order('reihenfolge')

  if (!quellenRaeume || quellenRaeume.length === 0) {
    revalidatePath('/dashboard/projekte')
    return { id: neuesProjekt.id }
  }

  // Räume einfügen + Mapping alte ID → neue ID
  const raumIdMap: Record<string, string> = {}
  for (const raum of quellenRaeume) {
    const { data: neuerRaum } = await supabase
      .from('raeume')
      .insert({
        projekt_id:  neuesProjekt.id,
        name:        raum.name,
        beschreibung: raum.beschreibung,
        reihenfolge: raum.reihenfolge,
      })
      .select('id')
      .single()
    if (neuerRaum) raumIdMap[raum.id] = neuerRaum.id
  }

  if (!optionen.kopiereProdukte) {
    revalidatePath('/dashboard/projekte')
    return { id: neuesProjekt.id }
  }

  // Produkte für alle Quell-Räume laden
  const quellenRaumIds = quellenRaeume.map((r) => r.id)
  const { data: quellenProdukte } = await supabase
    .from('produkte')
    .select('*')
    .in('raum_id', quellenRaumIds)
    .is('deleted_at', null)
    .order('reihenfolge')

  if (quellenProdukte && quellenProdukte.length > 0) {
    const neueProdukte = quellenProdukte
      .filter((p) => raumIdMap[p.raum_id])
      .map((p) => ({
        raum_id:          raumIdMap[p.raum_id],
        partner_id:       p.partner_id,
        name:             p.name,
        beschreibung:     p.beschreibung,
        kategorie:        p.kategorie,
        menge:            p.menge,
        einheit:          p.einheit,
        einkaufspreis:    p.einkaufspreis,
        marge_prozent:    p.marge_prozent,
        provision_prozent: p.provision_prozent,
        notizen_intern:   p.notizen_intern,
        verkaufspreis:    p.verkaufspreis,
        bild_url:         p.bild_url,
        produkt_url:      p.produkt_url,
        reihenfolge:      p.reihenfolge,
        bestellstatus:    'ausstehend' as const,
      }))
    await supabase.from('produkte').insert(neueProdukte)
  }

  revalidatePath('/dashboard/projekte')
  return { id: neuesProjekt.id }
}

// ── PIN-Schutz ────────────────────────────────────────────────

/** PIN setzen (4-6 Ziffern) oder entfernen (null). */
export async function pinSetzen(projektId: string, pin: string | null): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('projekte')
    .update({ freigabe_pin: pin })
    .eq('id', projektId)
    .is('deleted_at', null)
  revalidatePath(`/dashboard/projekte/${projektId}`)
}

/**
 * PIN validieren – wird von der öffentlichen Freigabe-Seite aufgerufen.
 * Nutzt Admin-Client (kein Auth-Cookie nötig).
 * Gibt true zurück wenn PIN korrekt, false sonst.
 */
export async function pinPruefen(token: string, pin: string): Promise<boolean> {
  const supabase = createAdminClient()

  // Token → Projekt-ID
  const { data: tokenData } = await supabase
    .from('freigabe_tokens')
    .select('projekt_id')
    .eq('token', token)
    .eq('aktiv', true)
    .single()

  if (!tokenData) return false

  // PIN vergleichen
  const { data: projekt } = await supabase
    .from('projekte')
    .select('freigabe_pin')
    .eq('id', tokenData.projekt_id)
    .is('deleted_at', null)
    .single()

  if (!projekt) return false
  return projekt.freigabe_pin === pin
}
