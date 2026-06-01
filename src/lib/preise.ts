/**
 * Zentrale Preis-Berechnung für Raum-Produkte.
 * Single source of truth, damit Tabelle / Stats / PDF / CSV / Freigabe / Konfigurator
 * immer denselben Endpreis ermitteln.
 *
 * Reihenfolge:
 *   1. Basis = verkaufspreis_override ?? produktVp ?? 0  (absoluter Override hat Vorrang)
 *   2. Rabatt (%) wird auf die Basis angewendet: basis * (1 - rabatt/100)
 *   3. Ergebnis auf 2 Nachkommastellen gerundet (€-cents-safe)
 */

import type { ProvisionTyp } from './supabase/types'

export type RabattInput = {
  verkaufspreis_override: number | null
  rabatt_prozent: number | null
}

/** Effektiver VP netto pro Stück (nach Override + Rabatt). */
export function effektiverVpNetto(
  rp: RabattInput,
  produktVp: number | null,
): number {
  const basis = rp.verkaufspreis_override ?? produktVp ?? 0
  const rabatt = rp.rabatt_prozent ?? 0
  return Math.round(basis * (1 - rabatt / 100) * 100) / 100
}

/** Basispreis (ohne Rabatt), z.B. für "durchgestrichen anzeigen"-UI. */
export function basisVpNetto(
  rp: Pick<RabattInput, 'verkaufspreis_override'>,
  produktVp: number | null,
): number {
  return rp.verkaufspreis_override ?? produktVp ?? 0
}

/** Rabattbetrag in €, z.B. für Anzeige "Gespart: 42€". */
export function rabattBetrag(
  rp: RabattInput,
  produktVp: number | null,
): number {
  const basis = basisVpNetto(rp, produktVp)
  const rabatt = rp.rabatt_prozent ?? 0
  return Math.round(basis * (rabatt / 100) * 100) / 100
}

export type ProvisionInput = {
  provision_typ?: ProvisionTyp | null
  provision_prozent: number | null
  provision_fix?: number | null
}

/**
 * Provision € pro Stück. Trade-Provision = Ertrag des Studios, berechnet auf VK netto.
 * - typ 'fix'  → fester Betrag pro Einheit (provision_fix)
 * - sonst (typ 'prozent' oder legacy null/undefined) → vpNetto × provision_prozent%
 * Multiplikation mit der Menge erfolgt beim Aufrufer (analog zu allen anderen €-Summen).
 */
export function provisionBetrag(p: ProvisionInput, vpNettoProStueck: number): number {
  if (p.provision_typ === 'fix') {
    return Math.round((p.provision_fix ?? 0) * 100) / 100
  }
  return Math.round(vpNettoProStueck * ((p.provision_prozent ?? 0) / 100) * 100) / 100
}

/** Einkaufspreis netto nach Einkaufsrabatt (z.B. Listen-EK − Rabatt% = effektiver EK). */
export function einkaufNettoNachRabatt(
  ep: number | null,
  rabattProzent: number | null,
): number {
  const basis = ep ?? 0
  const rabatt = rabattProzent ?? 0
  return Math.round(basis * (1 - rabatt / 100) * 100) / 100
}
