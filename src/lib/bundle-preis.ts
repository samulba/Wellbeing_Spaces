import type { BundlePreisModus } from '@/lib/supabase/types'

const r2 = (n: number) => Math.round(n * 100) / 100

export interface BundlePreisErgebnis {
  /** Summe der Komponenten (verkaufspreis × menge), netto. */
  listenpreis: number
  /** Effektiver Set-Rabatt in % (auch aus Festpreis abgeleitet). */
  rabattProzent: number
  /** Endgültiger Set-Preis netto = listenpreis × (1 − rabatt/100). */
  setPreis: number
}

/**
 * Berechnet den Set-Preis aus den Komponenten + Preis-Modus.
 * Reine Funktion (Server- UND Client-seitig nutzbar → Live-Vorschau im Editor).
 *
 * - 'summe'     → kein Rabatt.
 * - 'rabatt'    → fester Rabatt-Prozentsatz.
 * - 'festpreis' → Rabatt wird so abgeleitet, dass setPreis ≈ festpreis.
 *
 * Rabatt wird auf [0,100] geklemmt: ein Festpreis ÜBER dem Listenpreis ergibt
 * 0 % (kein Aufschlag) statt eines negativen Rabatts — fail-safe.
 */
export function berechneBundlePreis(
  modus: BundlePreisModus | null | undefined,
  rabattProzent: number | null | undefined,
  festpreis: number | null | undefined,
  komponenten: { menge: number; verkaufspreis: number | null }[],
): BundlePreisErgebnis {
  const listenpreis = r2(
    komponenten.reduce((s, k) => s + (k.verkaufspreis ?? 0) * (k.menge ?? 0), 0),
  )
  let rabatt = 0
  if (modus === 'rabatt') {
    rabatt = rabattProzent ?? 0
  } else if (modus === 'festpreis') {
    rabatt = listenpreis > 0 && festpreis != null ? r2((1 - festpreis / listenpreis) * 100) : 0
  }
  rabatt = Math.min(100, Math.max(0, rabatt))
  const setPreis = r2(listenpreis * (1 - rabatt / 100))
  return { listenpreis, rabattProzent: rabatt, setPreis }
}
