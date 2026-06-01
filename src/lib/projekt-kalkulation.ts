/**
 * Zentrale Projekt-Kalkulation — Single Source of Truth fuer alle Aggregationen.
 *
 * Wird verwendet von:
 *  - getProjektStats() in projekte/[id]/page.tsx (Budget-Ring + Status-Counts)
 *  - api/projekte/[id]/pdf/route.ts (PDF-Summen)
 *  - api/projekte/[id]/export/route.ts (CSV — nutzt aktuell effektiverVpNetto direkt, OK)
 *
 * Damit UI, PDF und Server-Stats garantiert dieselben Summen anzeigen.
 *
 * Architektur:
 *   - Eine Query: raum_produkte JOIN produkte (alle aktiven pro Projekt)
 *   - Eine Query: raum_zusatzkosten (Mig 112)
 *   - Eine Query: service_raten (Mig 112)
 *   - Aggregation pro Raum + Projekt
 *
 * Defaults / Fallbacks fuer alte Daten:
 *   - menge null → 1
 *   - rabatt_prozent null → 0
 *   - verkaufspreis_override null → produkt.verkaufspreis
 *
 * MwSt-Quelle: getMwstSatz() — pro Org einstellbar, default 19%.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { effektiverVpNetto, provisionBetrag } from './preise'

export interface RaumKalkulation {
  raumId: string
  raumName: string
  produkteAnzahl: number              // Anzahl raum_produkte-Eintraege (Positionen)
  produkteMengeGesamt: number          // Summe aller mengen (Stueckzahl)
  produkteSummeNetto: number
  produkteSummeBrutto: number
  // Wirtschaftlichkeit (intern, admin-only) — Migration 120
  ekSummeNetto: number          // Σ einkaufspreis × menge
  margeSummeNetto: number       // produkteSummeNetto − ekSummeNetto
  provisionSummeNetto: number   // Σ provisionBetrag × menge (Trade-Provision = Ertrag)
  ertragSummeNetto: number      // margeSummeNetto + provisionSummeNetto
  zusatzkostenSummeNetto: number
  zusatzkostenSummeBrutto: number
  /** Summe aller Positionen netto = produkte + zusatzkosten */
  raumSummeNetto: number
  raumSummeBrutto: number
  /** Status-Counts der raum_produkte (Freigabe). */
  statusCounts: { ausstehend: number; freigegeben: number; abgelehnt: number; ueberarbeitung: number }
}

export interface ServiceRatenKalkulation {
  ratenAnzahl: number
  ratenSummeGeplant: number             // Summe aller offen+gestellt+bezahlt
  ratenSummeBezahlt: number             // nur status='bezahlt'
  ratenSummeOffen: number               // status='offen' oder 'gestellt'
  zahlungsfortschrittPct: number        // 0-100, basiert auf bezahlt / geplant
}

export interface ProjektKalkulation {
  projektId: string
  mwstSatz: number                       // 0.19 = 19%
  /** Pro Raum */
  raeume: RaumKalkulation[]
  /** Projekt-Total (aufsummiert ueber alle Raeume) */
  produkteSummeNetto: number
  produkteSummeBrutto: number
  // Wirtschaftlichkeit (intern, admin-only) — Migration 120
  ekSummeNetto: number
  margeSummeNetto: number
  provisionSummeNetto: number
  ertragSummeNetto: number
  zusatzkostenSummeNetto: number
  zusatzkostenSummeBrutto: number
  /** Budget-relevant: Produkte + Zusatzkosten (KEINE Servicepauschale!) */
  budgetVerbrauchtNetto: number
  budgetVerbrauchtBrutto: number
  /** Servicepauschale (separat von Budget — wird NICHT in budgetVerbraucht eingerechnet) */
  servicePauschale: number | null        // aus projekte.service_pauschale
  service: ServiceRatenKalkulation
  /** Gesamtkosten = budget + service (nur informativ, fuer Anzeige 'Gesamtwert Projekt') */
  gesamtProjektNetto: number
  gesamtProjektBrutto: number
  /** Status-Counts ueber alle Raeume */
  statusCounts: { ausstehend: number; freigegeben: number; abgelehnt: number; ueberarbeitung: number }
  produkteAnzahl: number
  produkteMengeGesamt: number
}

interface ProduktSlim {
  verkaufspreis: number | null
  einkaufspreis: number | null
  provision_prozent: number | null
  provision_typ?: 'prozent' | 'fix' | null
  provision_fix?: number | null
}

interface RaumProduktSlim {
  raum_id: string
  menge: number | null
  verkaufspreis_override: number | null
  rabatt_prozent: number | null
  freigabe_status: string | null
  produkte: ProduktSlim | null
}

interface RaumZusatzkostenSlim {
  raum_id: string
  betrag_netto: number
}

interface ServiceRateSlim {
  betrag: number
  status: string
}

interface RaumMeta {
  id: string
  name: string
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Haupteinstiegspunkt — berechnet alle relevanten Projekt-Summen.
 * Erwartet einen Supabase-Client (server- oder admin-side, je nach Aufrufer).
 */
export async function berechneProjektKalkulation(
  supabase: SupabaseClient,
  projektId: string,
  mwstSatz: number,
): Promise<ProjektKalkulation> {
  // 1. Alle Raeume des Projekts (aktiv)
  const { data: raeumeRaw } = await supabase
    .from('raeume')
    .select('id, name')
    .eq('projekt_id', projektId)
    .is('deleted_at', null)
    .order('reihenfolge', { ascending: true })

  const raeume: RaumMeta[] = (raeumeRaw ?? []) as RaumMeta[]
  const raumIds = raeume.map((r) => r.id)

  if (raumIds.length === 0) {
    return leereKalkulation(projektId, mwstSatz)
  }

  // 2. Raum-Produkte mit Produkt-Details.
  // Fail-safe: provision_typ/provision_fix (Migration 120) sind ggf. noch nicht vorhanden
  // → bei Fehler ohne diese Spalten erneut laden (EK/Provision% existieren seit Mig 038).
  const rpFelder = 'raum_id, menge, verkaufspreis_override, rabatt_prozent, freigabe_status'
  const rich = await supabase
    .from('raum_produkte')
    .select(`${rpFelder}, produkte(verkaufspreis, einkaufspreis, provision_prozent, provision_typ, provision_fix)`)
    .in('raum_id', raumIds)
    .is('deleted_at', null)

  let rpRaw: unknown[] | null = rich.data
  if (rich.error) {
    const safe = await supabase
      .from('raum_produkte')
      .select(`${rpFelder}, produkte(verkaufspreis, einkaufspreis, provision_prozent)`)
      .in('raum_id', raumIds)
      .is('deleted_at', null)
    rpRaw = safe.data
  }

  const raumProdukte = (rpRaw ?? []) as unknown as RaumProduktSlim[]

  // 3. Raum-Zusatzkosten (Lieferung, Handwerker, ...)
  const { data: zkRaw } = await supabase
    .from('raum_zusatzkosten')
    .select('raum_id, betrag_netto')
    .in('raum_id', raumIds)

  const zusatzkosten = (zkRaw ?? []) as RaumZusatzkostenSlim[]

  // 4. Service-Raten (auf Projekt-Ebene)
  const { data: srRaw } = await supabase
    .from('service_raten')
    .select('betrag, status')
    .eq('projekt_id', projektId)

  const serviceRaten = (srRaw ?? []) as ServiceRateSlim[]

  // 5. Projekt-Stammdaten (fuer servicePauschale)
  const { data: projekt } = await supabase
    .from('projekte')
    .select('service_pauschale')
    .eq('id', projektId)
    .maybeSingle()

  // ── Pro-Raum-Aggregation ────────────────────────────────────
  const raumMap = new Map<string, RaumKalkulation>()
  for (const r of raeume) {
    raumMap.set(r.id, {
      raumId: r.id,
      raumName: r.name,
      produkteAnzahl: 0,
      produkteMengeGesamt: 0,
      produkteSummeNetto: 0,
      produkteSummeBrutto: 0,
      ekSummeNetto: 0,
      margeSummeNetto: 0,
      provisionSummeNetto: 0,
      ertragSummeNetto: 0,
      zusatzkostenSummeNetto: 0,
      zusatzkostenSummeBrutto: 0,
      raumSummeNetto: 0,
      raumSummeBrutto: 0,
      statusCounts: { ausstehend: 0, freigegeben: 0, abgelehnt: 0, ueberarbeitung: 0 },
    })
  }

  // Raum-Produkte aufsummieren
  for (const rp of raumProdukte) {
    const slot = raumMap.get(rp.raum_id)
    if (!slot) continue
    const menge = rp.menge ?? 1   // Fallback fuer alte Daten
    const vpNetto = effektiverVpNetto(
      {
        verkaufspreis_override: rp.verkaufspreis_override,
        rabatt_prozent:         rp.rabatt_prozent,
      },
      rp.produkte?.verkaufspreis ?? null,
    )
    slot.produkteAnzahl += 1
    slot.produkteMengeGesamt += menge
    slot.produkteSummeNetto += vpNetto * menge
    slot.ekSummeNetto += (rp.produkte?.einkaufspreis ?? 0) * menge
    slot.provisionSummeNetto += provisionBetrag(
      {
        provision_typ:     rp.produkte?.provision_typ ?? null,
        provision_prozent: rp.produkte?.provision_prozent ?? null,
        provision_fix:     rp.produkte?.provision_fix ?? null,
      },
      vpNetto,
    ) * menge
    const s = (rp.freigabe_status as keyof RaumKalkulation['statusCounts']) ?? 'ausstehend'
    if (s === 'freigegeben' || s === 'abgelehnt' || s === 'ueberarbeitung' || s === 'ausstehend') {
      slot.statusCounts[s] += 1
    } else {
      slot.statusCounts.ausstehend += 1
    }
  }

  // Zusatzkosten aufsummieren
  for (const zk of zusatzkosten) {
    const slot = raumMap.get(zk.raum_id)
    if (!slot) continue
    slot.zusatzkostenSummeNetto += zk.betrag_netto
  }

  // Pro-Raum Brutto + Gesamt finalisieren + runden
  raumMap.forEach((slot) => {
    slot.produkteSummeNetto = r2(slot.produkteSummeNetto)
    slot.zusatzkostenSummeNetto = r2(slot.zusatzkostenSummeNetto)
    slot.produkteSummeBrutto = r2(slot.produkteSummeNetto * (1 + mwstSatz))
    slot.zusatzkostenSummeBrutto = r2(slot.zusatzkostenSummeNetto * (1 + mwstSatz))
    slot.raumSummeNetto = r2(slot.produkteSummeNetto + slot.zusatzkostenSummeNetto)
    slot.raumSummeBrutto = r2(slot.raumSummeNetto * (1 + mwstSatz))
    // Wirtschaftlichkeit (intern)
    slot.ekSummeNetto = r2(slot.ekSummeNetto)
    slot.provisionSummeNetto = r2(slot.provisionSummeNetto)
    slot.margeSummeNetto = r2(slot.produkteSummeNetto - slot.ekSummeNetto)
    slot.ertragSummeNetto = r2(slot.margeSummeNetto + slot.provisionSummeNetto)
  })

  // ── Projekt-Totals ──────────────────────────────────────────
  const raumeListe = raeume.map((r) => raumMap.get(r.id)!).filter(Boolean)

  const produkteSummeNetto = r2(raumeListe.reduce((s, r) => s + r.produkteSummeNetto, 0))
  const zusatzkostenSummeNetto = r2(raumeListe.reduce((s, r) => s + r.zusatzkostenSummeNetto, 0))
  const ekSummeNetto = r2(raumeListe.reduce((s, r) => s + r.ekSummeNetto, 0))
  const provisionSummeNetto = r2(raumeListe.reduce((s, r) => s + r.provisionSummeNetto, 0))
  const margeSummeNetto = r2(produkteSummeNetto - ekSummeNetto)
  const ertragSummeNetto = r2(margeSummeNetto + provisionSummeNetto)
  const budgetVerbrauchtNetto = r2(produkteSummeNetto + zusatzkostenSummeNetto)
  const produkteAnzahl = raumeListe.reduce((s, r) => s + r.produkteAnzahl, 0)
  const produkteMengeGesamt = raumeListe.reduce((s, r) => s + r.produkteMengeGesamt, 0)
  const statusCounts = {
    ausstehend:    raumeListe.reduce((s, r) => s + r.statusCounts.ausstehend, 0),
    freigegeben:   raumeListe.reduce((s, r) => s + r.statusCounts.freigegeben, 0),
    abgelehnt:     raumeListe.reduce((s, r) => s + r.statusCounts.abgelehnt, 0),
    ueberarbeitung: raumeListe.reduce((s, r) => s + r.statusCounts.ueberarbeitung, 0),
  }

  // ── Service-Raten-Aggregation ────────────────────────────────
  const ratenSummeGeplant = r2(serviceRaten.reduce((s, r) => s + (r.status === 'storniert' ? 0 : r.betrag), 0))
  const ratenSummeBezahlt = r2(serviceRaten.filter((r) => r.status === 'bezahlt').reduce((s, r) => s + r.betrag, 0))
  const ratenSummeOffen   = r2(serviceRaten.filter((r) => r.status === 'offen' || r.status === 'gestellt').reduce((s, r) => s + r.betrag, 0))
  const service: ServiceRatenKalkulation = {
    ratenAnzahl: serviceRaten.filter((r) => r.status !== 'storniert').length,
    ratenSummeGeplant,
    ratenSummeBezahlt,
    ratenSummeOffen,
    zahlungsfortschrittPct: ratenSummeGeplant > 0
      ? Math.round((ratenSummeBezahlt / ratenSummeGeplant) * 100)
      : 0,
  }

  const servicePauschale = (projekt?.service_pauschale as number | null) ?? null
  const serviceAnteilNetto = servicePauschale ?? 0
  const gesamtProjektNetto = r2(budgetVerbrauchtNetto + serviceAnteilNetto)

  return {
    projektId,
    mwstSatz,
    raeume: raumeListe,
    produkteSummeNetto,
    produkteSummeBrutto: r2(produkteSummeNetto * (1 + mwstSatz)),
    ekSummeNetto,
    margeSummeNetto,
    provisionSummeNetto,
    ertragSummeNetto,
    zusatzkostenSummeNetto,
    zusatzkostenSummeBrutto: r2(zusatzkostenSummeNetto * (1 + mwstSatz)),
    budgetVerbrauchtNetto,
    budgetVerbrauchtBrutto: r2(budgetVerbrauchtNetto * (1 + mwstSatz)),
    servicePauschale,
    service,
    gesamtProjektNetto,
    gesamtProjektBrutto: r2(gesamtProjektNetto * (1 + mwstSatz)),
    statusCounts,
    produkteAnzahl,
    produkteMengeGesamt,
  }
}

function leereKalkulation(projektId: string, mwstSatz: number): ProjektKalkulation {
  return {
    projektId,
    mwstSatz,
    raeume: [],
    produkteSummeNetto: 0,
    produkteSummeBrutto: 0,
    ekSummeNetto: 0,
    margeSummeNetto: 0,
    provisionSummeNetto: 0,
    ertragSummeNetto: 0,
    zusatzkostenSummeNetto: 0,
    zusatzkostenSummeBrutto: 0,
    budgetVerbrauchtNetto: 0,
    budgetVerbrauchtBrutto: 0,
    servicePauschale: null,
    service: {
      ratenAnzahl: 0,
      ratenSummeGeplant: 0,
      ratenSummeBezahlt: 0,
      ratenSummeOffen: 0,
      zahlungsfortschrittPct: 0,
    },
    gesamtProjektNetto: 0,
    gesamtProjektBrutto: 0,
    statusCounts: { ausstehend: 0, freigegeben: 0, abgelehnt: 0, ueberarbeitung: 0 },
    produkteAnzahl: 0,
    produkteMengeGesamt: 0,
  }
}
