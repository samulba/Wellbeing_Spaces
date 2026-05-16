import type { OnboardingBedingtVon, OnboardingFrage } from '@/lib/supabase/types'

/**
 * Prueft, ob eine Conditional-Logic-Bedingung gegen die aktuellen
 * Antworten erfuellt ist. Wird sowohl im Customer-Form (Visibility)
 * als auch beim Filtern der Submit-Payload verwendet.
 *
 * Operatoren:
 *  - `gleich`         — Antwort === wert (Strings) bzw. enthaelt wert (Arrays)
 *  - `nicht_gleich`   — Antwort !== wert bzw. enthaelt wert nicht
 *  - `enthaelt`       — Antwort-String enthaelt wert (case-insensitive)
 *  - `nicht_leer`     — Antwort hat einen sinnvollen Wert
 *  - `ist_leer`       — Antwort ist leer/null/undefined/leeres Array
 */
export function bedingungErfuellt(
  bedingung: OnboardingBedingtVon | null | undefined,
  antworten: Record<string, unknown>,
): boolean {
  if (!bedingung) return true
  const wert = antworten[bedingung.frage_id]
  const vergleich = bedingung.wert ?? ''

  switch (bedingung.operator) {
    case 'gleich':
      if (Array.isArray(wert)) return wert.map(String).includes(vergleich)
      return String(wert ?? '') === vergleich
    case 'nicht_gleich':
      if (Array.isArray(wert)) return !wert.map(String).includes(vergleich)
      return String(wert ?? '') !== vergleich
    case 'enthaelt':
      if (Array.isArray(wert)) return wert.some((v) => String(v).toLowerCase().includes(vergleich.toLowerCase()))
      return String(wert ?? '').toLowerCase().includes(vergleich.toLowerCase())
    case 'nicht_leer':
      if (wert == null) return false
      if (Array.isArray(wert)) return wert.length > 0
      return String(wert).trim().length > 0
    case 'ist_leer':
      if (wert == null) return true
      if (Array.isArray(wert)) return wert.length === 0
      return String(wert).trim().length === 0
    default:
      return true
  }
}

/**
 * Filtert eine Fragen-Liste auf die durch Conditional Logic
 * sichtbaren Eintraege. Wird beim Render und beim Submit verwendet,
 * damit Werte versteckter Felder nicht persistiert werden.
 */
export function sichtbareFragen(
  fragen: OnboardingFrage[],
  antworten: Record<string, unknown>,
): OnboardingFrage[] {
  return fragen.filter((f) => bedingungErfuellt(f.bedingt_von, antworten))
}

/**
 * Entfernt Antworten von Fragen, die durch Conditional Logic
 * ausgeblendet sind. Wird beim Submit aufgerufen.
 */
export function antwortenFiltern(
  fragen: OnboardingFrage[],
  antworten: Record<string, unknown>,
): Record<string, unknown> {
  const sichtbar = new Set(sichtbareFragen(fragen, antworten).map((f) => f.id))
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(antworten)) {
    if (sichtbar.has(key)) result[key] = antworten[key]
  }
  return result
}
