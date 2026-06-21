'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { berechneBundlePreis } from '@/lib/bundle-preis'
import type { BundleMitKomponenten, BundlePreisModus, Produkt } from '@/lib/supabase/types'

const SET_SELECT =
  '*, komponenten:bundle_komponenten!bundle_id(id, organisation_id, bundle_id, komponente_produkt_id, menge, reihenfolge, created_at, ' +
  'komponente:produkte!komponente_produkt_id(id, name, verkaufspreis, einkaufspreis, bild_url, einheit, kategorie, deleted_at))'

type RawKomponente = {
  id: string
  organisation_id: string
  bundle_id: string
  komponente_produkt_id: string
  menge: number
  reihenfolge: number
  created_at: string
  komponente: {
    id: string; name: string; verkaufspreis: number | null; einkaufspreis: number | null
    bild_url: string | null; einheit: string; kategorie: string | null; deleted_at: string | null
  } | null
}

function mapBundle(row: Produkt & { komponenten?: RawKomponente[] | null }): BundleMitKomponenten {
  const komponenten = (row.komponenten ?? [])
    .filter((k) => k.komponente && k.komponente.deleted_at == null)
    .slice()
    .sort((a, b) => a.reihenfolge - b.reihenfolge)
  const preis = berechneBundlePreis(
    row.bundle_preis_modus,
    row.bundle_rabatt_prozent,
    row.bundle_festpreis,
    komponenten.map((k) => ({ menge: k.menge, verkaufspreis: k.komponente?.verkaufspreis ?? 0 })),
  )
  return {
    ...(row as Produkt),
    komponenten: komponenten.map((k) => ({
      id: k.id,
      organisation_id: k.organisation_id,
      bundle_id: k.bundle_id,
      komponente_produkt_id: k.komponente_produkt_id,
      menge: k.menge,
      reihenfolge: k.reihenfolge,
      created_at: k.created_at,
      komponente: k.komponente
        ? {
            id: k.komponente.id,
            name: k.komponente.name,
            verkaufspreis: k.komponente.verkaufspreis,
            einkaufspreis: k.komponente.einkaufspreis,
            bild_url: k.komponente.bild_url,
            einheit: k.komponente.einheit,
            kategorie: k.komponente.kategorie,
          }
        : null,
    })),
    listenpreis_netto: preis.listenpreis,
    effektiver_rabatt_prozent: preis.rabattProzent,
    set_preis_netto: preis.setPreis,
  }
}

/** Lädt Bundles (alle oder eines). Fail-safe: bei fehlender Mig 128 → []. */
async function ladeBundles(bundleId?: string): Promise<BundleMitKomponenten[]> {
  try {
    const supabase = await createClient()
    const orgId = await getOrganisationId()
    let q = supabase
      .from('produkte')
      .select(SET_SELECT)
      .eq('organisation_id', orgId)
      .eq('ist_bundle', true)
      .is('deleted_at', null)
    if (bundleId) q = q.eq('id', bundleId)
    const { data, error } = await q.order('name')
    if (error || !data) return []
    return (data as unknown as (Produkt & { komponenten?: RawKomponente[] | null })[]).map(mapBundle)
  } catch {
    return []
  }
}

export async function getBundlesMitKomponenten(): Promise<BundleMitKomponenten[]> {
  return ladeBundles()
}

export async function getBundleMitKomponenten(bundleId: string): Promise<BundleMitKomponenten | null> {
  const list = await ladeBundles(bundleId)
  return list[0] ?? null
}

/** Namen der Bundle-Köpfe (für die Set-Header in der Raumtabelle). Fail-safe → {}. */
export async function getBundleNamen(bundleIds: string[]): Promise<Record<string, string>> {
  if (bundleIds.length === 0) return {}
  try {
    const supabase = await createClient()
    const orgId = await getOrganisationId()
    const { data } = await supabase
      .from('produkte')
      .select('id, name')
      .in('id', bundleIds)
      .eq('organisation_id', orgId)
    const out: Record<string, string> = {}
    for (const p of (data ?? []) as { id: string; name: string }[]) out[p.id] = p.name
    return out
  } catch {
    return {}
  }
}

// ── CRUD: Bundle-Kopf ─────────────────────────────────────────

export interface BundleStammdaten {
  name: string
  beschreibung?: string | null
  kategorie?: string | null
  bild_url?: string | null
  partner_id?: string | null
  preisModus: BundlePreisModus
  rabattProzent?: number | null
  festpreis?: number | null
}

export async function bundleAnlegen(daten: BundleStammdaten): Promise<{ id?: string; fehler?: string }> {
  if (!daten.name?.trim()) return { fehler: 'Name ist erforderlich.' }
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data, error } = await supabase
    .from('produkte')
    .insert({
      raum_id: null,
      ist_bundle: true,
      ist_variante: false,
      name: daten.name.trim(),
      beschreibung: daten.beschreibung?.trim() || null,
      kategorie: daten.kategorie?.trim() || null,
      bild_url: daten.bild_url || null,
      partner_id: daten.partner_id || null,
      menge: 1,
      einheit: 'Set',
      bundle_preis_modus: daten.preisModus,
      bundle_rabatt_prozent: daten.preisModus === 'rabatt' ? (daten.rabattProzent ?? null) : null,
      bundle_festpreis: daten.preisModus === 'festpreis' ? (daten.festpreis ?? null) : null,
      organisation_id: orgId,
    })
    .select('id')
    .single()

  if (error || !data) {
    if (error?.message?.includes('ist_bundle') || error?.message?.includes('bundle_preis_modus')) {
      return { fehler: 'Migration 128 ist noch nicht eingespielt. Bitte in Supabase ausführen.' }
    }
    return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }
  }

  await supabase.from('produktstatus').insert({
    produkt_id: data.id,
    status: 'ausstehend',
    organisation_id: orgId,
  })

  revalidatePath('/dashboard/produkte')
  return { id: data.id as string }
}

export async function bundleAktualisieren(
  bundleId: string,
  daten: Partial<BundleStammdaten>,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const felder: Record<string, unknown> = {}
  if (daten.name !== undefined) {
    if (!daten.name.trim()) return { fehler: 'Name ist erforderlich.' }
    felder.name = daten.name.trim()
  }
  if (daten.beschreibung !== undefined) felder.beschreibung = daten.beschreibung?.trim() || null
  if (daten.kategorie !== undefined) felder.kategorie = daten.kategorie?.trim() || null
  if (daten.bild_url !== undefined) felder.bild_url = daten.bild_url || null
  if (daten.partner_id !== undefined) felder.partner_id = daten.partner_id || null
  if (daten.preisModus !== undefined) {
    felder.bundle_preis_modus = daten.preisModus
    felder.bundle_rabatt_prozent = daten.preisModus === 'rabatt' ? (daten.rabattProzent ?? null) : null
    felder.bundle_festpreis = daten.preisModus === 'festpreis' ? (daten.festpreis ?? null) : null
  }

  const { error } = await supabase
    .from('produkte')
    .update(felder)
    .eq('id', bundleId)
    .eq('organisation_id', orgId)
    .eq('ist_bundle', true)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Aktualisieren.' }
  revalidatePath('/dashboard/produkte')
  revalidatePath(`/dashboard/produkte/bundles/${bundleId}/bearbeiten`)
  return {}
}

export async function bundleAusBibliothekLoeschen(bundleId: string): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('produkte')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', bundleId)
    .eq('organisation_id', orgId)
    .eq('ist_bundle', true)
    .is('deleted_at', null)
  if (error) return { fehler: 'Fehler beim Löschen.' }
  revalidatePath('/dashboard/produkte')
  return {}
}

// ── CRUD: Komponenten ─────────────────────────────────────────

export async function bundleKomponenteHinzufuegen(
  bundleId: string,
  komponenteProduktId: string,
  menge = 1,
): Promise<{ fehler?: string }> {
  if (bundleId === komponenteProduktId) return { fehler: 'Ein Set kann sich nicht selbst enthalten.' }
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Keine verschachtelten Sets: Kandidat darf kein Bundle sein.
  const { data: kand } = await supabase
    .from('produkte')
    .select('ist_bundle')
    .eq('id', komponenteProduktId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (kand?.ist_bundle) return { fehler: 'Ein Set kann kein anderes Set als Komponente enthalten.' }

  const { count } = await supabase
    .from('bundle_komponenten')
    .select('id', { count: 'exact', head: true })
    .eq('bundle_id', bundleId)
    .eq('organisation_id', orgId)

  const { error } = await supabase.from('bundle_komponenten').insert({
    organisation_id: orgId,
    bundle_id: bundleId,
    komponente_produkt_id: komponenteProduktId,
    menge: menge > 0 ? menge : 1,
    reihenfolge: count ?? 0,
  })
  if (error) {
    if (error.code === '23505') return { fehler: 'Komponente ist bereits im Set.' }
    return { fehler: 'Fehler beim Hinzufügen.' }
  }
  revalidatePath(`/dashboard/produkte/bundles/${bundleId}/bearbeiten`)
  return {}
}

export async function bundleKomponenteMengeAendern(
  komponenteId: string,
  menge: number,
  bundleId?: string,
): Promise<{ fehler?: string }> {
  if (!(menge > 0)) return { fehler: 'Menge muss größer als 0 sein.' }
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('bundle_komponenten')
    .update({ menge })
    .eq('id', komponenteId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Aktualisieren.' }
  if (bundleId) revalidatePath(`/dashboard/produkte/bundles/${bundleId}/bearbeiten`)
  return {}
}

export async function bundleKomponenteEntfernen(
  komponenteId: string,
  bundleId?: string,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('bundle_komponenten')
    .delete()
    .eq('id', komponenteId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Entfernen.' }
  if (bundleId) revalidatePath(`/dashboard/produkte/bundles/${bundleId}/bearbeiten`)
  return {}
}

// ── Set in einen Raum hinzufügen (explodieren) ────────────────

export async function bundleZuRaumHinzufuegen(
  bundleId: string,
  raumId: string,
  setAnzahl = 1,
  projektId?: string,
): Promise<{ fehler?: string; hinzugefuegt: number; uebersprungen: string[] }> {
  const bundle = await getBundleMitKomponenten(bundleId)
  if (!bundle || bundle.komponenten.length === 0) {
    return { fehler: 'Set nicht gefunden oder ohne Komponenten.', hinzugefuegt: 0, uebersprungen: [] }
  }
  const anzahl = setAnzahl > 0 ? Math.floor(setAnzahl) : 1

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Set-Rabatt einmalig (gilt pro Komponente über die bestehende rabatt_prozent-Spalte)
  const rabattGerundet = Math.round(bundle.effektiver_rabatt_prozent)
  const rabattWert = rabattGerundet > 0 ? rabattGerundet : null

  let hinzugefuegt = 0
  const uebersprungen: string[] = []

  // Per-Komponente einfügen, damit eine Kollision (UNIQUE raum_id,produkt_id)
  // nicht das ganze Set abbricht.
  for (const k of bundle.komponenten) {
    if (!k.komponente) continue
    const { error } = await supabase.from('raum_produkte').insert({
      organisation_id: orgId,
      raum_id: raumId,
      produkt_id: k.komponente_produkt_id,
      menge: (k.menge ?? 1) * anzahl,
      verkaufspreis_override: null,
      rabatt_prozent: rabattWert,
      reihenfolge: 0,
      bundle_id: bundleId,
    })
    if (error) {
      uebersprungen.push(k.komponente.name)
    } else {
      hinzugefuegt++
    }
  }

  // Konsistenz mit produktZuRaumHinzufuegen (No-Op seit Mig 124, fail-safe).
  try {
    const { freigabeAuswahlScopeFuerRaum } = await import('./freigaben')
    await freigabeAuswahlScopeFuerRaum(supabase, orgId, raumId)
  } catch {
    /* ignore */
  }

  revalidatePath('/dashboard/produkte')
  if (projektId) revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  return { hinzugefuegt, uebersprungen }
}

export async function bundleAusRaumEntfernen(
  raumId: string,
  bundleId: string,
  projektId?: string,
): Promise<{ fehler?: string; anzahl?: number }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error, count } = await supabase
    .from('raum_produkte')
    .delete({ count: 'exact' })
    .eq('raum_id', raumId)
    .eq('bundle_id', bundleId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Entfernen des Sets.' }
  if (projektId) revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  return { anzahl: count ?? 0 }
}
