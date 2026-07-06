// Zerlegt eine Freitext-Adresse (Legacy-Feld `kunden.adresse`) in ihre Komponenten,
// damit sie einzeln kopierbar sind (Straße & Hausnummer zusammen, PLZ und Ort einzeln).
//
// Reiner Helper ohne Imports → unit-testbar (siehe adresse.test.ts). Bewusst konservativ:
// wird kein eindeutiges „PLZ Ort"-Muster gefunden, gibt er null zurück und die Anzeige
// fällt auf die bisherige Komplett-Zeile zurück (nichts wird falsch zerschnitten).

export interface AdresseTeile {
  /** Straße inkl. Hausnummer (zusammen, wie im Formular gepflegt). */
  strasse: string | null
  plz: string
  ort: string
}

/**
 * Erkennt gängige deutschsprachige Formate (DE 5-stellig, AT/CH 4-stellig):
 *   "Musterstraße 12, 12345 Berlin"
 *   "Musterstraße 12, 12345 Berlin, Deutschland"  (Land wird für die Teile ignoriert)
 *   "Musterstraße 12\n12345 Berlin"
 *   "Musterstraße 12 12345 Berlin"                (ohne Komma)
 *   "12345 Berlin"                                (nur PLZ + Ort)
 * Kein PLZ-Muster gefunden → null (Fallback auf die Komplett-Anzeige).
 */
export function parseAdresse(text: string | null | undefined): AdresseTeile | null {
  const roh = (text ?? '').trim()
  if (!roh) return null

  // In Segmente teilen (Kommas + Zeilenumbrüche), leere raus.
  const segmente = roh.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)

  // Das Segment finden, das mit einer PLZ beginnt („12345 Berlin").
  const plzOrt = /^(\d{4,5})\s+(\S.*)$/
  const idx = segmente.findIndex((s) => plzOrt.test(s))
  if (idx >= 0) {
    const m = segmente[idx].match(plzOrt)!
    const strasse = segmente.slice(0, idx).join(', ').trim() || null
    // Segmente NACH „PLZ Ort" (z. B. „Deutschland") gehören nicht in die Teile.
    return { strasse, plz: m[1], ort: m[2].trim() }
  }

  // Ohne Komma/Umbruch: „Musterstraße 12 12345 Berlin" — die LETZTE 4-5-stellige
  // Zahlengruppe vor dem Ortsnamen trennt Straße und PLZ (greedy → auch 4-stellige
  // Hausnummern wie „Hauptstr. 1234 80331 München" werden korrekt der Straße zugeschlagen).
  const einZeiler = roh.match(/^(.*\S)\s+(\d{4,5})\s+(\D\S*.*)$/)
  if (einZeiler) {
    const strasse = einZeiler[1].trim().replace(/,$/, '').trim() || null
    return { strasse, plz: einZeiler[2], ort: einZeiler[3].trim() }
  }

  return null
}
