'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Angebot, AngebotStatus, AngebotPosition } from '@/lib/supabase/types'
import { berechneAngebotSummen } from '@/lib/angebot-utils'

// ── Daten-Interface ───────────────────────────────────────────

export interface AngebotDaten {
  projekt_id: string | null
  kunde_id: string
  titel: string
  einleitung: string | null
  positionen: AngebotPosition[]
  mwst_satz: number
  rabatt_prozent: number | null
  status?: AngebotStatus
  gueltig_bis: string | null
  anmerkungen: string | null
  agb_text: string | null
}

// ── Queries ───────────────────────────────────────────────────

export async function getAngebote(projektId?: string): Promise<Angebot[]> {
  const supabase = await createClient()
  let q = supabase.from('angebote').select('*').order('created_at', { ascending: false })
  if (projektId) q = q.eq('projekt_id', projektId)
  const { data } = await q
  return (data ?? []).map(row => ({ ...row, positionen: (row.positionen ?? []) as AngebotPosition[] })) as Angebot[]
}

export async function getAngebot(id: string): Promise<Angebot | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('angebote').select('*').eq('id', id).single()
  if (!data) return null
  return { ...data, positionen: (data.positionen ?? []) as AngebotPosition[] } as Angebot
}

// ── Mutations ─────────────────────────────────────────────────

export async function angebotErstellen(
  daten: AngebotDaten
): Promise<{ id?: string; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Angebotsnummer über DB-Funktion generieren
  const { data: nummerData } = await supabase.rpc('naechste_angebotsnummer', { org_id: orgId })
  const nummer = (nummerData as string | null) ?? `AG-${new Date().getFullYear()}-001`

  const { nettoSumme, rabattBetrag, mwstBetrag, bruttoSumme } = berechneAngebotSummen(
    daten.positionen, daten.mwst_satz, daten.rabatt_prozent
  )

  const { data, error } = await supabase
    .from('angebote')
    .insert({
      organisation_id: orgId,
      projekt_id: daten.projekt_id,
      kunde_id: daten.kunde_id,
      nummer,
      titel: daten.titel,
      einleitung: daten.einleitung,
      positionen: daten.positionen,
      mwst_satz: daten.mwst_satz,
      rabatt_prozent: daten.rabatt_prozent,
      rabatt_betrag: rabattBetrag || null,
      netto_summe: nettoSumme,
      mwst_betrag: mwstBetrag,
      brutto_summe: bruttoSumme,
      status: daten.status ?? 'entwurf',
      gueltig_bis: daten.gueltig_bis,
      anmerkungen: daten.anmerkungen,
      agb_text: daten.agb_text,
    })
    .select('id')
    .single()

  if (error || !data) return { fehler: 'Fehler beim Erstellen des Angebots.' }

  if (daten.projekt_id) revalidatePath(`/dashboard/projekte/${daten.projekt_id}/angebote`)
  return { id: data.id }
}

export async function angebotAusProduktliste(
  projektId: string,
  kundeId: string,
  mwstSatz = 19
): Promise<{ id?: string; fehler?: string }> {
  const supabase = await createClient()

  // Alle Produkte des Projekts über raum_produkte laden
  const { data: raeume } = await supabase
    .from('raeume').select('id, name').eq('projekt_id', projektId).is('deleted_at', null).order('reihenfolge')

  const raumIds = (raeume ?? []).map((r) => r.id)
  if (raumIds.length === 0) return { fehler: 'Keine Räume oder Produkte im Projekt gefunden.' }

  const { data: eintraege } = await supabase
    .from('raum_produkte')
    .select('menge, verkaufspreis_override, reihenfolge, produkte(name, einheit, verkaufspreis, deleted_at)')
    .in('raum_id', raumIds)
    .order('reihenfolge')

  const positionen: AngebotPosition[] = (eintraege ?? [])
    .filter((e) => {
      const p = (e.produkte as unknown) as { deleted_at: string | null } | null
      return p?.deleted_at == null
    })
    .map((e, i) => {
      const p = (e.produkte as unknown) as { name: string; einheit: string; verkaufspreis: number | null }
      const ep = e.verkaufspreis_override ?? p?.verkaufspreis ?? 0
      return {
        id: `pos-${i + 1}`,
        name: p?.name ?? '–',
        beschreibung: null,
        menge: e.menge,
        einheit: p?.einheit ?? 'Stk',
        einzelpreis: ep,
        gesamtpreis: Math.round(ep * e.menge * 100) / 100,
      }
    })

  if (positionen.length === 0) return { fehler: 'Keine Produkte im Projekt gefunden.' }

  // Projekt-Name als Titel
  const { data: projekt } = await supabase.from('projekte').select('name').eq('id', projektId).single()

  return angebotErstellen({
    projekt_id: projektId,
    kunde_id: kundeId,
    titel: `Angebot – ${projekt?.name ?? 'Projekt'}`,
    einleitung: null,
    positionen,
    mwst_satz: mwstSatz,
    rabatt_prozent: null,
    gueltig_bis: null,
    anmerkungen: null,
    agb_text: null,
  })
}

export async function angebotAktualisieren(
  id: string,
  daten: Partial<AngebotDaten>
): Promise<{ fehler?: string }> {
  const supabase = await createClient()

  const update: Record<string, unknown> = {}
  if (daten.titel        !== undefined) update.titel        = daten.titel
  if (daten.einleitung   !== undefined) update.einleitung   = daten.einleitung
  if (daten.positionen   !== undefined) {
    const { nettoSumme, rabattBetrag, mwstBetrag, bruttoSumme } = berechneAngebotSummen(
      daten.positionen, daten.mwst_satz ?? 19, daten.rabatt_prozent ?? null
    )
    update.positionen    = daten.positionen
    update.netto_summe   = nettoSumme
    update.rabatt_betrag = rabattBetrag || null
    update.mwst_betrag   = mwstBetrag
    update.brutto_summe  = bruttoSumme
  }
  if (daten.mwst_satz      !== undefined) update.mwst_satz      = daten.mwst_satz
  if (daten.rabatt_prozent !== undefined) update.rabatt_prozent = daten.rabatt_prozent
  if (daten.gueltig_bis    !== undefined) update.gueltig_bis    = daten.gueltig_bis
  if (daten.anmerkungen    !== undefined) update.anmerkungen    = daten.anmerkungen
  if (daten.agb_text       !== undefined) update.agb_text       = daten.agb_text

  const { error } = await supabase.from('angebote').update(update).eq('id', id)
  if (error) return { fehler: 'Fehler beim Aktualisieren.' }

  revalidatePath('/dashboard/projekte')
  return {}
}

export async function angebotStatusAendern(
  id: string,
  status: AngebotStatus,
  projektId?: string | null
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('angebote').update({ status }).eq('id', id)
  if (error) return { fehler: 'Fehler beim Aktualisieren.' }
  if (projektId) revalidatePath(`/dashboard/projekte/${projektId}/angebote`)
  return {}
}

export async function angebotLoeschen(
  id: string,
  projektId?: string | null
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('angebote').delete().eq('id', id)
  if (error) return { fehler: 'Fehler beim Löschen.' }
  if (projektId) revalidatePath(`/dashboard/projekte/${projektId}/angebote`)
  return {}
}
