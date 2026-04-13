'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { VertragsVorlage, Vertrag, VertragStatus, VertragsVorlageKategorie } from '@/lib/supabase/types'


function formatEur(n: number | null): string {
  if (n == null) return '–'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function formatDatum(iso: string | null): string {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Platzhalter ersetzen ──────────────────────────────────────
async function platzhalterErsetzen(
  html: string,
  projektId: string | null,
  kundeId: string
): Promise<string> {
  const supabase = await createClient()

  // Kunde laden
  const { data: kunde } = await supabase
    .from('kunden').select('name, email, adresse').eq('id', kundeId).single()

  // Projekt laden (falls vorhanden)
  const { data: projekt } = projektId
    ? await supabase.from('projekte').select('name, standort, projektart, produkt_budget, service_pauschale, gesamtbudget, deadline').eq('id', projektId).single()
    : { data: null }

  // Branding laden
  const { data: branding } = await supabase.from('branding').select('firmenname').maybeSingle()

  const heute = formatDatum(new Date().toISOString())

  return html
    .replace(/\{\{firmenname\}\}/g,       branding?.firmenname ?? '')
    .replace(/\{\{kunde_name\}\}/g,       kunde?.name ?? '')
    .replace(/\{\{kunde_email\}\}/g,      kunde?.email ?? '')
    .replace(/\{\{kunde_adresse\}\}/g,    kunde?.adresse ?? '')
    .replace(/\{\{projekt_name\}\}/g,     projekt?.name ?? '')
    .replace(/\{\{projekt_standort\}\}/g, projekt?.standort ?? '')
    .replace(/\{\{projektart\}\}/g,       projekt?.projektart ?? '')
    .replace(/\{\{produkt_budget\}\}/g,   formatEur(projekt?.produkt_budget ?? null))
    .replace(/\{\{service_pauschale\}\}/g,formatEur(projekt?.service_pauschale ?? null))
    .replace(/\{\{gesamtbudget\}\}/g,     formatEur(projekt?.gesamtbudget ?? null))
    .replace(/\{\{datum_heute\}\}/g,      heute)
    .replace(/\{\{deadline\}\}/g,         formatDatum(projekt?.deadline ?? null))
}


// ── Vorlagen ──────────────────────────────────────────────────

export async function getVorlagen(): Promise<VertragsVorlage[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('vertrags_vorlagen')
    .select('*')
    .order('ist_standard', { ascending: false })
    .order('name')
  return (data ?? []) as VertragsVorlage[]
}

export interface VorlageDaten {
  name: string
  beschreibung: string | null
  inhalt_html: string
  kategorie: VertragsVorlageKategorie | null
  ist_standard: boolean
}

export async function vorlageAnlegen(daten: VorlageDaten): Promise<{ id?: string; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data, error } = await supabase
    .from('vertrags_vorlagen')
    .insert({ ...daten, organisation_id: orgId })
    .select('id')
    .single()

  if (error || !data) return { fehler: 'Fehler beim Speichern.' }
  revalidatePath('/dashboard/einstellungen')
  return { id: data.id }
}

export async function vorlageAktualisieren(
  id: string,
  daten: Partial<VorlageDaten>
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('vertrags_vorlagen').update(daten).eq('id', id)
  if (error) return { fehler: 'Fehler beim Aktualisieren.' }
  revalidatePath('/dashboard/einstellungen')
  return {}
}

export async function vorlageLoeschen(id: string): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('vertrags_vorlagen').delete().eq('id', id)
  if (error) return { fehler: 'Fehler beim Löschen.' }
  revalidatePath('/dashboard/einstellungen')
  return {}
}


// ── Verträge ──────────────────────────────────────────────────

export async function getVertraege(projektId?: string): Promise<Vertrag[]> {
  const supabase = await createClient()
  let q = supabase.from('vertraege').select('*').order('created_at', { ascending: false })
  if (projektId) q = q.eq('projekt_id', projektId)
  const { data } = await q
  return (data ?? []) as Vertrag[]
}

export async function getVertrag(id: string): Promise<Vertrag | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('vertraege').select('*').eq('id', id).single()
  return data as Vertrag | null
}

export async function vertragErstellen(
  vorlageId: string,
  projektId: string | null,
  kundeId: string
): Promise<{ id?: string; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: vorlage } = await supabase
    .from('vertrags_vorlagen').select('*').eq('id', vorlageId).single()
  if (!vorlage) return { fehler: 'Vorlage nicht gefunden.' }

  const inhaltMitDaten = await platzhalterErsetzen(vorlage.inhalt_html, projektId, kundeId)

  const { data, error } = await supabase
    .from('vertraege')
    .insert({
      organisation_id: orgId,
      vorlage_id: vorlageId,
      projekt_id: projektId,
      kunde_id: kundeId,
      titel: vorlage.name,
      inhalt_html: inhaltMitDaten,
      status: 'entwurf',
    })
    .select('id')
    .single()

  if (error || !data) return { fehler: 'Fehler beim Erstellen des Vertrags.' }

  if (projektId) revalidatePath(`/dashboard/projekte/${projektId}/vertraege`)
  return { id: data.id }
}

export async function vertragAktualisieren(
  id: string,
  daten: { titel?: string; inhalt_html?: string; gesamtwert?: number | null; gueltig_bis?: string | null }
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('vertraege').update(daten).eq('id', id)
  if (error) return { fehler: 'Fehler beim Aktualisieren.' }
  revalidatePath('/dashboard/projekte')
  return {}
}

export async function vertragStatusAendern(
  id: string,
  status: VertragStatus,
  projektId?: string | null
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('vertraege').update({ status }).eq('id', id)
  if (error) return { fehler: 'Fehler beim Aktualisieren.' }
  if (projektId) revalidatePath(`/dashboard/projekte/${projektId}/vertraege`)
  return {}
}

export async function vertragLoeschen(id: string, projektId?: string | null): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('vertraege').delete().eq('id', id)
  if (error) return { fehler: 'Fehler beim Löschen.' }
  if (projektId) revalidatePath(`/dashboard/projekte/${projektId}/vertraege`)
  return {}
}
