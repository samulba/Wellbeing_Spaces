'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { KonfiguratorSession, KonfiguratorAuswahl, AuswahlStatus } from '@/lib/supabase/types'
export type { AuswahlStatus }

export interface KonfiguratorOptionen {
  budgetLimit?: number | null
  showPrices?: boolean
  allowAlternatives?: boolean
  expiresAt?: string | null
}

// ── Erstellen (Admin) ─────────────────────────────────────────
export async function konfiguratorErstellen(
  projektId: string,
  optionen: KonfiguratorOptionen = {}
): Promise<{ token: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data, error } = await supabase
    .from('konfigurator_sessions')
    .insert({
      projekt_id:         projektId,
      budget_limit:       optionen.budgetLimit       ?? null,
      show_prices:        optionen.showPrices        ?? true,
      allow_alternatives: optionen.allowAlternatives ?? true,
      expires_at:         optionen.expiresAt         ?? null,
      organisation_id:    orgId,
    })
    .select('token')
    .single()
  if (error || !data) throw new Error('Konfigurator konnte nicht erstellt werden.')
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return { token: data.token }
}

// ── Sessions eines Projekts (Admin) ──────────────────────────
export async function konfiguratorSessionsAbrufen(projektId: string): Promise<KonfiguratorSession[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('konfigurator_sessions')
    .select('*')
    .eq('projekt_id', projektId)
    .order('created_at', { ascending: false })
  return (data ?? []) as KonfiguratorSession[]
}

// ── Session + Produkte laden (öffentlich) ────────────────────
export interface KonfiguratorProdukt {
  id: string
  raum_id: string
  name: string
  beschreibung: string | null
  kategorie: string | null
  menge: number
  einheit: string
  verkaufspreis: number | null
  bild_url: string | null
  produkt_url: string | null
}

export interface KonfiguratorRaum {
  id: string
  name: string
  produkte: KonfiguratorProdukt[]
}

export interface KonfiguratorDaten {
  session: KonfiguratorSession
  projektName: string
  kundeName: string | null
  raeume: KonfiguratorRaum[]
  auswahl: Record<string, KonfiguratorAuswahl>
}

export async function konfiguratorAbrufen(token: string): Promise<KonfiguratorDaten | null> {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('konfigurator_sessions')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!session) return null

  // Abgelaufen prüfen
  if (session.expires_at && new Date(session.expires_at) < new Date()) return null

  const { data: projekt } = await supabase
    .from('projekte')
    .select('name, kunden(name)')
    .eq('id', session.projekt_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!projekt) return null

  const { data: raeumeDaten } = await supabase
    .from('raeume')
    .select('id, name, reihenfolge')
    .eq('projekt_id', session.projekt_id)
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')

  if (!raeumeDaten || raeumeDaten.length === 0) return null

  const { data: produkteDaten } = await supabase
    .from('produkte')
    .select('id, raum_id, name, beschreibung, kategorie, menge, einheit, verkaufspreis, bild_url, produkt_url')
    .in('raum_id', raeumeDaten.map((r) => r.id))
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')

  const { data: auswahlDaten } = await supabase
    .from('konfigurator_auswahl')
    .select('*')
    .eq('session_id', session.id)

  const auswahlMap: Record<string, KonfiguratorAuswahl> = {}
  for (const a of auswahlDaten ?? []) auswahlMap[a.produkt_id] = a as KonfiguratorAuswahl

  const raeume: KonfiguratorRaum[] = raeumeDaten
    .map((raum) => ({
      id:       raum.id,
      name:     raum.name,
      produkte: (produkteDaten ?? [])
        .filter((p) => p.raum_id === raum.id)
        .map((p): KonfiguratorProdukt => ({
          id:            p.id,
          raum_id:       p.raum_id,
          name:          p.name,
          beschreibung:  p.beschreibung,
          kategorie:     p.kategorie,
          menge:         p.menge,
          einheit:       p.einheit,
          verkaufspreis: p.verkaufspreis,
          bild_url:      p.bild_url,
          produkt_url:   p.produkt_url,
        })),
    }))
    .filter((r) => r.produkte.length > 0)

  const kundeRaw = (projekt as unknown as { name: string; kunden: { name: string } | null }).kunden

  return {
    session:     session as KonfiguratorSession,
    projektName: projekt.name,
    kundeName:   kundeRaw?.name ?? null,
    raeume,
    auswahl: auswahlMap,
  }
}

// ── Auswahl speichern (öffentlich) ───────────────────────────
export async function produktAuswahlSpeichern(
  token: string,
  produktId: string,
  status: AuswahlStatus,
  kommentar = ''
): Promise<{ erfolg: boolean }> {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('konfigurator_sessions')
    .select('id, status')
    .eq('token', token)
    .maybeSingle()

  if (!session || session.status !== 'aktiv') return { erfolg: false }

  const { error } = await supabase
    .from('konfigurator_auswahl')
    .upsert({
      session_id:       session.id,
      produkt_id:       produktId,
      status,
      kunde_kommentar:  kommentar || null,
    }, { onConflict: 'session_id,produkt_id' })

  return { erfolg: !error }
}

// ── Abschließen (öffentlich) ──────────────────────────────────
export async function konfiguratorAbschliessen(
  token: string,
  gesamtNotizen: string
): Promise<{ erfolg: boolean }> {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('konfigurator_sessions')
    .select('id')
    .eq('token', token)
    .maybeSingle()

  if (!session) return { erfolg: false }

  const { error } = await supabase
    .from('konfigurator_sessions')
    .update({
      status:        'abgeschlossen',
      kunde_notizen: gesamtNotizen || null,
      completed_at:  new Date().toISOString(),
    })
    .eq('id', session.id)

  return { erfolg: !error }
}

// ── Ergebnis einer Session laden (Admin) ─────────────────────
export interface KonfiguratorErgebnisEintrag {
  produktId:   string
  produktName: string
  raumName:    string
  menge:       number
  einheit:     string
  vp:          number | null
  status:      AuswahlStatus
  kommentar:   string | null
}

export async function konfiguratorErgebnisAbrufen(sessionId: string): Promise<{
  session: KonfiguratorSession
  eintraege: KonfiguratorErgebnisEintrag[]
} | null> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('konfigurator_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) return null

  const { data: auswahl } = await supabase
    .from('konfigurator_auswahl')
    .select('*')
    .eq('session_id', sessionId)

  if (!auswahl || auswahl.length === 0) return { session: session as KonfiguratorSession, eintraege: [] }

  const produktIds = auswahl.map((a) => a.produkt_id)
  const { data: produkte } = await supabase
    .from('produkte')
    .select('id, name, raum_id, menge, einheit, verkaufspreis')
    .in('id', produktIds)

  const raumIds = Array.from(new Set((produkte ?? []).map((p) => p.raum_id).filter(Boolean)))
  const { data: raeume } = await supabase
    .from('raeume')
    .select('id, name')
    .in('id', raumIds)

  const raumMap: Record<string, string> = {}
  for (const r of raeume ?? []) raumMap[r.id] = r.name

  type ProduktRow = { id: string; name: string; raum_id: string; menge: number; einheit: string; verkaufspreis: number | null }
  const produktMap: Record<string, ProduktRow> = {}
  for (const p of (produkte ?? []) as ProduktRow[]) produktMap[p.id] = p

  const eintraege: KonfiguratorErgebnisEintrag[] = auswahl.map((a) => {
    const p = produktMap[a.produkt_id]
    return {
      produktId:   a.produkt_id,
      produktName: p?.name ?? '–',
      raumName:    raumMap[p?.raum_id ?? ''] ?? '–',
      menge:       p?.menge ?? 1,
      einheit:     p?.einheit ?? 'Stk.',
      vp:          p?.verkaufspreis ?? null,
      status:      a.status as AuswahlStatus,
      kommentar:   a.kunde_kommentar,
    }
  })

  return { session: session as KonfiguratorSession, eintraege }
}

// ── Auswahl zu Angebot (Admin) ───────────────────────────────
/**
 * Übernimmt alle als "ausgewählt" markierten Produkte einer abgeschlossenen
 * Konfigurator-Session in ein neues Angebot (Status: entwurf).
 * Voraussetzungen: Projekt hat einen Kunden; Session-Status darf beliebig sein
 * (in der UI nur bei "abgeschlossen" angeboten).
 */
export async function konfiguratorAuswahlZuAngebot(
  sessionId: string,
  mwstSatz = 19,
): Promise<{ angebotId?: string; fehler?: string }> {
  const supabase = await createClient()

  // Session + Projekt-/Kunden-Kontext laden
  const { data: session } = await supabase
    .from('konfigurator_sessions')
    .select('id, projekt_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) return { fehler: 'Konfigurator-Session nicht gefunden.' }

  const { data: projekt } = await supabase
    .from('projekte')
    .select('name, kunde_id')
    .eq('id', session.projekt_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!projekt?.kunde_id) return { fehler: 'Projekt hat keinen Kunden zugewiesen.' }

  // Ausgewählte Auswahl-Einträge laden
  const { data: auswahl } = await supabase
    .from('konfigurator_auswahl')
    .select('produkt_id')
    .eq('session_id', sessionId)
    .eq('status', 'ausgewaehlt')

  if (!auswahl || auswahl.length === 0) {
    return { fehler: 'Keine ausgewählten Produkte in dieser Session.' }
  }

  // Produkt-Details laden
  const produktIds = auswahl.map((a) => a.produkt_id)
  const { data: produkte } = await supabase
    .from('produkte')
    .select('id, name, einheit, menge, verkaufspreis')
    .in('id', produktIds)
    .is('deleted_at', null)

  const positionen = (produkte ?? []).map((p, i) => {
    const menge = p.menge ?? 1
    const ep    = p.verkaufspreis ?? 0
    return {
      id:           `pos-${i + 1}`,
      name:         p.name,
      beschreibung: null,
      menge,
      einheit:      p.einheit ?? 'Stk',
      einzelpreis:  ep,
      gesamtpreis:  Math.round(ep * menge * 100) / 100,
    }
  })

  if (positionen.length === 0) return { fehler: 'Keine gültigen Produkte gefunden.' }

  // Angebot erstellen (delegiert an angebote.ts)
  const { angebotErstellen } = await import('./angebote')
  const result = await angebotErstellen({
    projekt_id:     session.projekt_id,
    kunde_id:       projekt.kunde_id,
    titel:          `Angebot – Konfigurator ${projekt.name}`,
    einleitung:     'Dieses Angebot basiert auf der Auswahl aus dem Kunden-Konfigurator.',
    positionen,
    mwst_satz:      mwstSatz,
    rabatt_prozent: null,
    gueltig_bis:    null,
    anmerkungen:    null,
    agb_text:       null,
  })

  if (result.fehler) return { fehler: result.fehler }

  revalidatePath(`/dashboard/projekte/${session.projekt_id}/angebote`)
  return { angebotId: result.id }
}


// ── Auswahl als Freigabe-Status übernehmen (Admin) ────────────
// Seit Migration 076: schreibt auf raum_produkte.freigabe_status pro Raum
// (nicht mehr global auf produktstatus). Nur raum_produkte im Projekt der Session.
export async function auswahlAlsFreigabeUebernehmen(sessionId: string): Promise<{ fehler?: string }> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('konfigurator_sessions')
    .select('projekt_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session?.projekt_id) return { fehler: 'Session nicht gefunden.' }

  const { data: auswahl } = await supabase
    .from('konfigurator_auswahl')
    .select('produkt_id, status')
    .eq('session_id', sessionId)
  if (!auswahl) return { fehler: 'Keine Auswahl gefunden.' }

  // Räume des Projekts laden — brauchen wir für den raum_produkte-Filter
  const { data: raeume } = await supabase
    .from('raeume')
    .select('id')
    .eq('projekt_id', session.projekt_id)
  const raumIds = (raeume ?? []).map((r) => r.id)
  if (raumIds.length === 0) return {}

  for (const a of auswahl) {
    const freigabeStatus =
      a.status === 'ausgewaehlt'              ? 'freigegeben'   :
      a.status === 'abgelehnt'                ? 'abgelehnt'     :
      a.status === 'alternative_gewuenscht'   ? 'ueberarbeitung' :
      null
    if (!freigabeStatus) continue

    await supabase
      .from('raum_produkte')
      .update({ freigabe_status: freigabeStatus })
      .eq('produkt_id', a.produkt_id)
      .in('raum_id', raumIds)
  }

  return {}
}
