'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ProduktStatus, BestellStatus, VariantenDefinition, Json } from '@/lib/supabase/types'

export type ProduktActionState = { fehler: string } | null

function parseOptionalNumber(val: FormDataEntryValue | null): number | null {
  if (!val || val === '') return null
  const n = parseFloat(val as string)
  return isNaN(n) ? null : n
}

function parseJsonArray(val: FormDataEntryValue | null): string[] {
  if (!val || val === '') return []
  try { return JSON.parse(val as string) } catch { return [] }
}

const ERLAUBTE_VERFUEGBARKEIT = new Set(['auf_anfrage', 'saisonal', 'lieferzeit_4_6', 'standard'])

function neueFelder(formData: FormData) {
  const verfuegbarkeitRaw = (formData.get('verfuegbarkeit') as string) || ''
  const verfuegbarkeit = ERLAUBTE_VERFUEGBARKEIT.has(verfuegbarkeitRaw) ? verfuegbarkeitRaw : null
  return {
    lieferzeit:     (formData.get('lieferzeit')     as string) || null,
    breite_cm:      parseOptionalNumber(formData.get('breite_cm')),
    tiefe_cm:       parseOptionalNumber(formData.get('tiefe_cm')),
    hoehe_cm:       parseOptionalNumber(formData.get('hoehe_cm')),
    material:       (formData.get('material')       as string) || null,
    farbe:          (formData.get('farbe')          as string) || null,
    artikelnummer:  (formData.get('artikelnummer')  as string) || null,
    verfuegbarkeit,
    tags:           parseJsonArray(formData.get('tags_json')),
    bilder_urls:    parseJsonArray(formData.get('bilder_urls_json')),
    hinweis_extern:          ((formData.get('hinweis_extern') as string) || '').trim() || null,
    hinweis_extern_sichtbar: formData.get('hinweis_extern_sichtbar') === 'on',
  }
}

export async function produktInBibliothekAnlegen(
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: produkt, error } = await supabase
    .from('produkte')
    .insert({
      raum_id: null,
      partner_id: (formData.get('partner_id') as string) || null,
      name: formData.get('name') as string,
      beschreibung: (formData.get('beschreibung') as string) || null,
      kategorie: (formData.get('kategorie') as string) || null,
      menge: parseOptionalNumber(formData.get('menge')) ?? 1,
      einheit: (formData.get('einheit') as string) || 'Stk',
      einkaufspreis: parseOptionalNumber(formData.get('einkaufspreis')),
      marge_prozent: parseOptionalNumber(formData.get('marge_prozent')),
      provision_prozent: parseOptionalNumber(formData.get('provision_prozent')),
      verkaufspreis: parseOptionalNumber(formData.get('verkaufspreis')),
      bild_url: (formData.get('bild_url') as string) || null,
      produkt_url: (formData.get('produkt_url') as string) || null,
      notizen_intern: (formData.get('notizen_intern') as string) || null,
      ...neueFelder(formData),
      organisation_id: orgId,
    })
    .select('id')
    .single()

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  await supabase.from('produktstatus').insert({
    produkt_id: produkt.id,
    status: 'ausstehend',
    organisation_id: orgId,
  })

  revalidatePath('/dashboard/produkte')
  redirect('/dashboard/produkte')
}

export async function produktAnlegen(
  raumId: string,
  projektId: string,
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Produkt immer in die Bibliothek (raum_id = NULL) – Verknüpfung über raum_produkte
  const { data: produkt, error } = await supabase
    .from('produkte')
    .insert({
      raum_id: null,
      partner_id: (formData.get('partner_id') as string) || null,
      name: formData.get('name') as string,
      beschreibung: (formData.get('beschreibung') as string) || null,
      kategorie: (formData.get('kategorie') as string) || null,
      menge: parseOptionalNumber(formData.get('menge')) ?? 1,
      einheit: (formData.get('einheit') as string) || 'Stk',
      einkaufspreis: parseOptionalNumber(formData.get('einkaufspreis')),
      marge_prozent: parseOptionalNumber(formData.get('marge_prozent')),
      provision_prozent: parseOptionalNumber(formData.get('provision_prozent')),
      verkaufspreis: parseOptionalNumber(formData.get('verkaufspreis')),
      bild_url: (formData.get('bild_url') as string) || null,
      produkt_url: (formData.get('produkt_url') as string) || null,
      notizen_intern: (formData.get('notizen_intern') as string) || null,
      ...neueFelder(formData),
      organisation_id: orgId,
    })
    .select('id')
    .single()

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  // Produktstatus + Raum-Verknüpfung parallel anlegen
  await Promise.all([
    supabase.from('produktstatus').insert({
      produkt_id: produkt.id,
      status: 'ausstehend',
      organisation_id: orgId,
    }),
    supabase.from('raum_produkte').insert({
      organisation_id: orgId,
      raum_id: raumId,
      produkt_id: produkt.id,
      menge: parseOptionalNumber(formData.get('menge')) ?? 1,
    }),
  ])

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  redirect(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

export async function produktAktualisieren(
  produktId: string,
  raumId: string,
  projektId: string,
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const [{ error: produktError }] = await Promise.all([
    supabase
      .from('produkte')
      .update({
        partner_id: (formData.get('partner_id') as string) || null,
        name: formData.get('name') as string,
        beschreibung: (formData.get('beschreibung') as string) || null,
        kategorie: (formData.get('kategorie') as string) || null,
        menge: parseOptionalNumber(formData.get('menge')) ?? 1,
        einheit: (formData.get('einheit') as string) || 'Stk',
        einkaufspreis: parseOptionalNumber(formData.get('einkaufspreis')),
        marge_prozent: parseOptionalNumber(formData.get('marge_prozent')),
        provision_prozent: parseOptionalNumber(formData.get('provision_prozent')),
        verkaufspreis: parseOptionalNumber(formData.get('verkaufspreis')),
        bild_url: (formData.get('bild_url') as string) || null,
        produkt_url: (formData.get('produkt_url') as string) || null,
        notizen_intern: (formData.get('notizen_intern') as string) || null,
        ...neueFelder(formData),
      })
      .eq('id', produktId)
      .eq('organisation_id', orgId)
      .is('deleted_at', null),
  ])

  if (produktError) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  // Status upserten
  await supabase
    .from('produktstatus')
    .upsert(
      {
        produkt_id: produktId,
        status: (formData.get('status') as ProduktStatus) || 'ausstehend',
      },
      { onConflict: 'produkt_id' }
    )

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  redirect(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

export async function produktAktualisierenBibliothek(
  produktId: string,
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase
    .from('produkte')
    .update({
      partner_id: (formData.get('partner_id') as string) || null,
      name: formData.get('name') as string,
      beschreibung: (formData.get('beschreibung') as string) || null,
      kategorie: (formData.get('kategorie') as string) || null,
      menge: parseOptionalNumber(formData.get('menge')) ?? 1,
      einheit: (formData.get('einheit') as string) || 'Stk',
      einkaufspreis: parseOptionalNumber(formData.get('einkaufspreis')),
      marge_prozent: parseOptionalNumber(formData.get('marge_prozent')),
      provision_prozent: parseOptionalNumber(formData.get('provision_prozent')),
      verkaufspreis: parseOptionalNumber(formData.get('verkaufspreis')),
      bild_url: (formData.get('bild_url') as string) || null,
      produkt_url: (formData.get('produkt_url') as string) || null,
      notizen_intern: (formData.get('notizen_intern') as string) || null,
      ...neueFelder(formData),
    })
    .eq('id', produktId)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/produkte')
  redirect('/dashboard/produkte')
}

export async function produktSoftDelete(
  produktId: string,
  raumId: string,
  projektId: string
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('produkte')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', produktId)
    .eq('organisation_id', orgId)

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

export async function produktFuerPartnerAnlegen(
  partnerId: string,
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { fehler: 'Produktname ist erforderlich.' }

  const { data: produkt, error } = await supabase
    .from('produkte')
    .insert({
      raum_id: null,
      partner_id: partnerId,
      name,
      kategorie: (formData.get('kategorie') as string) || null,
      menge: 1,
      einheit: 'Stk',
      produkt_url: (formData.get('produkt_url') as string) || null,
      organisation_id: orgId,
    })
    .select('id')
    .single()

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  await supabase.from('produktstatus').insert({
    produkt_id: produkt.id,
    status: 'ausstehend',
    organisation_id: orgId,
  })

  revalidatePath(`/dashboard/partner/${partnerId}`)
  return null
}

/** @deprecated Verwende stattdessen produktZuRaumHinzufuegen aus raum-produkte.ts */
export async function produktZuRaumZuweisen(
  produktId: string,
  raumId: string
): Promise<ProduktActionState> {
  // Delegiert an das neue raum_produkte-System
  const { produktZuRaumHinzufuegen } = await import('./raum-produkte')
  const result = await produktZuRaumHinzufuegen(produktId, raumId)
  if (result.fehler) return { fehler: result.fehler }
  return null
}

export async function updateProduktPositionen(
  raumId: string,
  projektId: string,
  positionen: { id: string; reihenfolge: number }[]
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await Promise.all(
    positionen.map(({ id, reihenfolge }) =>
      supabase.from('produkte').update({ reihenfolge }).eq('id', id).eq('organisation_id', orgId)
    )
  )
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

export async function bestellstatusAendern(
  produktId: string,
  raumId: string,
  projektId: string,
  neuerStatus: BestellStatus
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('produkte')
    .update({ bestellstatus: neuerStatus })
    .eq('id', produktId)
    .eq('organisation_id', orgId)
  if (error) {
    console.error('bestellstatusAendern failed:', error)
    return { fehler: error.message }
  }
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  return {}
}

export type ProduktDatumFeld = 'bestellt_am' | 'liefertermin' | 'lieferung_erhalten_am'

// Bestellstatus-Ranking: nur "nach vorne" bewegen, nie zurück.
const STATUS_RANK: Record<BestellStatus, number> = {
  ausstehend: 0,
  bestellt: 1,
  geliefert: 2,
  rechnung_erhalten: 3,
}

/**
 * Aktualisiert ein einzelnes Datumsfeld auf produkte.
 * Automatischer Status-Upgrade:
 *   - bestellt_am gesetzt      → bestellstatus mindestens 'bestellt'
 *   - lieferung_erhalten_am    → bestellstatus mindestens 'geliefert'
 * Ein bereits höherer Status (z.B. 'rechnung_erhalten') bleibt unberührt.
 * Beim Löschen eines Datums wird der Status NICHT zurückgesetzt.
 */
export async function produktDatumAktualisieren(
  produktId: string,
  raumId: string,
  projektId: string,
  feld: ProduktDatumFeld,
  datum: string | null,
): Promise<{ fehler?: string; bestellstatus?: BestellStatus }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const wert = datum && datum.trim() ? datum : null

  // Update-Objekt zusammenbauen (Datum + ggf. auto-Status-Upgrade)
  const update: Record<string, unknown> = { [feld]: wert }
  let neuerStatus: BestellStatus | undefined

  if (wert != null && (feld === 'bestellt_am' || feld === 'lieferung_erhalten_am')) {
    // Aktuellen Status laden, um kein Downgrade zu machen
    const { data: aktuell } = await supabase
      .from('produkte')
      .select('bestellstatus')
      .eq('id', produktId)
      .eq('organisation_id', orgId)
      .maybeSingle()

    const aktuellStatus = (aktuell?.bestellstatus ?? 'ausstehend') as BestellStatus
    const ziel: BestellStatus = feld === 'bestellt_am' ? 'bestellt' : 'geliefert'
    if (STATUS_RANK[aktuellStatus] < STATUS_RANK[ziel]) {
      update.bestellstatus = ziel
      neuerStatus = ziel
    }
  }

  const { error } = await supabase
    .from('produkte')
    .update(update)
    .eq('id', produktId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Datum konnte nicht gespeichert werden.' }
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  return { bestellstatus: neuerStatus }
}

export async function produktStatusAendern(
  produktId: string,
  raumId: string,
  projektId: string,
  status: ProduktStatus
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('produktstatus')
    .upsert({ produkt_id: produktId, status }, { onConflict: 'produkt_id' })

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

// ── Produkt-Varianten (Migration 041) ─────────────────────────

/**
 * Legt eine neue Variante basierend auf einem Eltern-Produkt an.
 * Kopiert alle Stammdaten und setzt ist_variante=true + varianten_attribute.
 */
export async function varianteAnlegen(
  elternProduktId: string,
  variantenAttribute: Record<string, string>
): Promise<{ id?: string; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Eltern-Produkt laden
  const { data: eltern, error: elternError } = await supabase
    .from('produkte')
    .select('*')
    .eq('id', elternProduktId)
    .is('deleted_at', null)
    .single()

  if (elternError || !eltern) return { fehler: 'Eltern-Produkt nicht gefunden.' }

  // Varianten-Name aus Attributen generieren (z.B. "Eiche / 120x80")
  const attributWerte = Object.values(variantenAttribute).join(' / ')
  const variantenName = `${eltern.name} – ${attributWerte}`

  const { data: variante, error } = await supabase
    .from('produkte')
    .insert({
      organisation_id: orgId,
      raum_id: null,
      partner_id: eltern.partner_id,
      name: variantenName,
      beschreibung: eltern.beschreibung,
      kategorie: eltern.kategorie,
      menge: eltern.menge,
      einheit: eltern.einheit,
      einkaufspreis: eltern.einkaufspreis,
      marge_prozent: eltern.marge_prozent,
      provision_prozent: eltern.provision_prozent,
      verkaufspreis: eltern.verkaufspreis,
      bild_url: eltern.bild_url,
      produkt_url: eltern.produkt_url,
      notizen_intern: eltern.notizen_intern,
      // Neue Variantenfelder
      ist_variante: true,
      eltern_produkt_id: elternProduktId,
      varianten_attribute: variantenAttribute as unknown as Json,
    })
    .select('id')
    .single()

  if (error || !variante) return { fehler: 'Fehler beim Anlegen der Variante.' }

  // Produktstatus für Variante anlegen
  await supabase.from('produktstatus').insert({
    produkt_id: variante.id,
    status: 'ausstehend',
    organisation_id: orgId,
  })

  revalidatePath('/dashboard/produkte')
  return { id: variante.id }
}

/**
 * Speichert (upsert) eine Varianten-Definition für ein Produkt.
 * Definiert, welche Optionen ein bestimmtes Attribut hat.
 */
export async function variantenDefinitionSpeichern(
  produktId: string,
  attributName: string,
  optionen: string[]
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  if (!attributName.trim()) return { fehler: 'Attribut-Name ist erforderlich.' }
  if (optionen.length === 0) return { fehler: 'Mindestens eine Option ist erforderlich.' }

  const { error } = await supabase
    .from('varianten_definitionen')
    .upsert(
      {
        organisation_id: orgId,
        produkt_id: produktId,
        attribut_name: attributName.trim(),
        optionen,
      },
      { onConflict: 'produkt_id,attribut_name' }
    )

  if (error) return { fehler: 'Fehler beim Speichern der Varianten-Definition.' }

  revalidatePath('/dashboard/produkte')
  return {}
}

/**
 * Lädt alle Varianten-Definitionen eines Produkts.
 */
export async function getVariantenDefinitionen(
  produktId: string
): Promise<VariantenDefinition[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('varianten_definitionen')
    .select('*')
    .eq('produkt_id', produktId)
    .order('reihenfolge')

  return (data ?? []) as VariantenDefinition[]
}

/**
 * Lädt alle Varianten eines Eltern-Produkts.
 */
export async function getVarianten(elternProduktId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('produkte')
    .select('id, name, varianten_attribute, verkaufspreis, einkaufspreis, bild_url, bestellstatus')
    .eq('eltern_produkt_id', elternProduktId)
    .is('deleted_at', null)
    .order('created_at')

  return data ?? []
}

/**
 * Löscht eine Varianten-Definition (und optional alle zugehörigen Varianten-Produkte).
 */
export async function variantenDefinitionLoeschen(
  id: string,
  produktId: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()

  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('varianten_definitionen')
    .delete()
    .eq('id', id)
    .eq('produkt_id', produktId)
    .eq('organisation_id', orgId)

  if (error) return { fehler: 'Fehler beim Löschen der Definition.' }

  revalidatePath('/dashboard/produkte')
  return {}
}

// ── Bibliothek für Raum-Zuweisung ────────────────────────────
export interface BibliothekProdukt {
  id: string
  name: string
  artikelnummer: string | null
  bild_url: string | null
  verkaufspreis: number | null
  kategorie_id: string | null
  kategorie: { id: string; name: string; icon: string | null } | null
}

export async function bibliothekProdukteAbrufen(): Promise<BibliothekProdukt[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('produkte')
    .select('id, name, artikelnummer, bild_url, verkaufspreis, kategorie_id, kategorie:kategorien(id, name, icon)')
    .eq('organisation_id', orgId)
    .is('deleted_at', null)
    .eq('ist_variante', false)
    .order('name')
  return (data ?? []) as unknown as BibliothekProdukt[]
}
