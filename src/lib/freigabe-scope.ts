// Geteilte Scope-Auflösung für Freigabe-Links (Migration 116).
//
// MUSS in der öffentlichen Seite (Anzeige-Filter, freigabe/[token]/page.tsx)
// UND im Write-Guard (freigabe.ts) IDENTISCH genutzt werden — sonst IDOR:
// der Kunde könnte ein Produkt schreiben, das die Seite gar nicht zeigt,
// oder bei einem gezeigten Produkt blockiert werden.

export interface ScopeRaumProdukt {
  id?: string
  produkt_gruppe_id?: string | null
  bereich_id?: string | null
}

/** Bereich eines Produkts: ist es Teil eines Auswahl-Blocks, kommt der Bereich
 *  vom Block; sonst der eigene Bereich des Einzelprodukts. */
export function bereichVonRaumProdukt(
  rp: ScopeRaumProdukt,
  blockBereich: Map<string, string | null>,
): string | null {
  if (rp.produkt_gruppe_id) {
    const ausBlock = blockBereich.get(rp.produkt_gruppe_id) ?? null
    if (ausBlock != null) return ausBlock
    // Block hat keinen/unbekannten Bereich (z. B. Block soft-deleted, das
    // Produkt referenziert ihn aber noch) → NICHT „bereichslos" werden,
    // sondern auf den eigenen Bereich des Produkts zurückfallen. Block-Vorrang
    // bleibt erhalten, wenn der Block einen Bereich hat.
  }
  return rp.bereich_id ?? null
}

/** Ist das Produkt im „auswahl"-Scope? Entweder direkt über scope_ids oder
 *  über seinen Bereich via scope_bereich_ids (Migration 116). */
export function istImAuswahlScope(
  rp: ScopeRaumProdukt,
  scopeIds: string[],
  scopeBereichIds: string[],
  blockBereich: Map<string, string | null>,
): boolean {
  if (rp.id && scopeIds.includes(rp.id)) return true
  if (scopeBereichIds.length > 0) {
    const b = bereichVonRaumProdukt(rp, blockBereich)
    if (b && scopeBereichIds.includes(b)) return true
  }
  return false
}
