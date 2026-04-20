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
