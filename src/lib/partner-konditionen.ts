/**
 * Reiner Resolver für Partner-Konditionen.
 *
 * Single source of truth: `partner_konditionen` bestimmen Provision, Einkaufsrabatt,
 * Zahlungsziel/Skonto und Mindestbestellwert. Für ein konkretes Produkt (mit seiner
 * Kategorie) und ein Datum wird der anwendbare Satz aufgelöst.
 *
 * WICHTIG: `kategorie_werte` ist nach Kategorie-NAME gekeyt (so wie `produkte.kategorie`
 * gespeichert wird) — NICHT nach `kategorie_id`. Der Kommentar in Migration 039 ist überholt.
 *
 * Gestaffelte (volumenabhängige) Sätze können auf Produktebene nicht final aufgelöst werden
 * → Basisstufe (kleinstes `ab_umsatz`) + `staffelHinweis`; der finale Satz ist ein Bestell-/
 * Projekt-Thema.
 *
 * Rein berechnend, kein Supabase-Import → unit-testbar.
 */
import type {
  PartnerKondition,
  PartnerKonditionTyp,
  ProvisionTyp,
  ResolvedPartnerKonditionen,
} from './supabase/types'

const LEER: ResolvedPartnerKonditionen = {
  provisionTyp: null,
  provisionProzent: null,
  provisionFix: null,
  einkaufsrabattProzent: null,
  zahlungszielTage: null,
  skontoProzent: null,
  skontoTage: null,
  mindestbestellwert: null,
  staffelHinweis: null,
  quelleKonditionId: null,
}

function asObject(j: unknown): Record<string, unknown> | null {
  if (!j) return null
  if (typeof j === 'string') {
    try { const p = JSON.parse(j); return p && typeof p === 'object' && !Array.isArray(p) ? p : null } catch { return null }
  }
  if (typeof j === 'object' && !Array.isArray(j)) return j as Record<string, unknown>
  return null
}

function asArray(j: unknown): unknown[] {
  if (!j) return []
  if (typeof j === 'string') {
    try { const p = JSON.parse(j); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return Array.isArray(j) ? j : []
}

/** kategorie_werte → { Kategorie-Name: prozent }. Defensiv (Json kann string oder object sein). */
export function parseKategorieWerte(j: unknown): Record<string, number> {
  const obj = asObject(j)
  if (!obj) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(obj)) {
    const n = typeof v === 'number' ? v : parseFloat(String(v))
    if (Number.isFinite(n)) out[k] = n
  }
  return out
}

/** staffelung → sortierte Stufen [{ ab_umsatz, prozent }] (aufsteigend nach ab_umsatz). */
export function parseStaffelung(j: unknown): { ab_umsatz: number; prozent: number }[] {
  return asArray(j)
    .map((row) => {
      const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
      const ab = Number(o.ab_umsatz ?? o.abUmsatz ?? 0)
      const pr = Number(o.prozent ?? o.wert ?? 0)
      return { ab_umsatz: Number.isFinite(ab) ? ab : 0, prozent: Number.isFinite(pr) ? pr : 0 }
    })
    .sort((a, b) => a.ab_umsatz - b.ab_umsatz)
}

function matchKategorie(map: Record<string, number>, kategorieName: string): number | null {
  if (kategorieName in map) return map[kategorieName]
  const lower = kategorieName.trim().toLowerCase()
  for (const [k, v] of Object.entries(map)) {
    if (k.trim().toLowerCase() === lower) return v
  }
  return null
}

function istGueltig(k: PartnerKondition, am: Date): boolean {
  if (k.aktiv === false) return false
  if (k.gueltig_von) { const d = new Date(k.gueltig_von); if (!isNaN(d.getTime()) && d > am) return false }
  if (k.gueltig_bis) { const d = new Date(k.gueltig_bis); if (!isNaN(d.getTime()) && d < am) return false }
  return true
}

function neuesteZuerst(a: PartnerKondition, b: PartnerKondition): number {
  return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
}

// Provisions-Typen, die einen Produkt-Provisionswert liefern (Priorität in dieser Reihenfolge).
const PROVISION_PRIO: PartnerKonditionTyp[] = ['prozent_fix', 'prozent_gestaffelt', 'fix_pro_produkt']

function provisionAusKondition(
  k: PartnerKondition,
): { typ: ProvisionTyp; prozent: number | null; fix: number | null; hinweis: string | null } | null {
  switch (k.typ) {
    case 'prozent_fix':
      return { typ: 'prozent', prozent: k.wert ?? 0, fix: null, hinweis: null }
    case 'fix_pro_produkt':
      return { typ: 'fix', prozent: null, fix: k.wert ?? 0, hinweis: null }
    case 'prozent_gestaffelt': {
      const stufen = parseStaffelung(k.staffelung)
      const basis = stufen[0]?.prozent ?? k.wert ?? 0
      const hinweis =
        stufen.length > 0
          ? `Gestaffelt: Basis ${basis}% (ab ${stufen[0]?.ab_umsatz ?? 0} €). Finaler Satz auf Bestell-/Projektebene.`
          : null
      return { typ: 'prozent', prozent: basis, fix: null, hinweis }
    }
    default:
      return null
  }
}

/**
 * Löst die anwendbaren Konditionen für ein Produkt auf.
 * @param konditionen alle Konditionen des Partners (typischerweise aktive)
 * @param kategorieName Produkt-Kategorie als NAME (produkte.kategorie)
 * @param am Stichtag (default: heute)
 */
export function resolvePartnerKonditionen(
  konditionen: PartnerKondition[],
  kategorieName: string | null,
  am: Date = new Date(),
): ResolvedPartnerKonditionen {
  if (!Array.isArray(konditionen) || konditionen.length === 0) return { ...LEER }
  const aktive = konditionen.filter((k) => istGueltig(k, am))
  if (aktive.length === 0) return { ...LEER }

  let provTyp: ProvisionTyp | null = null
  let provProzent: number | null = null
  let provFix: number | null = null
  let staffelHinweis: string | null = null
  let provQuelle: PartnerKondition | null = null

  // 1. Kategorie-basiert (höchste Spezifität), wenn die Produkt-Kategorie matcht.
  if (kategorieName) {
    for (const k of aktive.filter((x) => x.typ === 'kategorie_basiert').sort(neuesteZuerst)) {
      const v = matchKategorie(parseKategorieWerte(k.kategorie_werte), kategorieName)
      if (v != null) {
        provTyp = 'prozent'
        provProzent = v
        provQuelle = k
        break
      }
    }
  }

  // 2. Standard-Kondition (falls noch nichts und Standard ein Provisions-Typ ist).
  if (provTyp == null) {
    const std = aktive.find((k) => k.ist_standard && provisionAusKondition(k) != null)
    if (std) {
      const r = provisionAusKondition(std)!
      provTyp = r.typ; provProzent = r.prozent; provFix = r.fix; staffelHinweis = r.hinweis; provQuelle = std
    }
  }

  // 3. Typ-Priorität, neueste zuerst.
  if (provTyp == null) {
    for (const t of PROVISION_PRIO) {
      const k = aktive.filter((x) => x.typ === t).sort(neuesteZuerst)[0]
      if (k) {
        const r = provisionAusKondition(k)!
        provTyp = r.typ; provProzent = r.prozent; provFix = r.fix; staffelHinweis = r.hinweis; provQuelle = k
        break
      }
    }
  }

  // Einkaufsrabatt: erste aktive rabatt_einkauf-Kondition.
  const rabattK = aktive.filter((k) => k.typ === 'rabatt_einkauf').sort(neuesteZuerst)[0]
  const einkaufsrabattProzent = rabattK ? rabattK.wert ?? null : null

  // Mindestbestellwert.
  const mindK = aktive.filter((k) => k.typ === 'mindestbestellwert').sort(neuesteZuerst)[0]
  const mindestbestellwert = mindK ? mindK.wert ?? null : null

  // Fixbetrag pro Bestellung → nur Hinweis (kein Produkt-Provisionswert).
  const fixBestellung = aktive.find((k) => k.typ === 'fix_pro_bestellung')
  if (fixBestellung) {
    const note = `Zusätzlich ${fixBestellung.wert ?? 0} € Fixbetrag pro Bestellung (auf Bestellebene).`
    staffelHinweis = staffelHinweis ? `${staffelHinweis} ${note}` : note
  }

  // Zahlungsziel/Skonto: aus der Provisions-Quelle, sonst aus irgendeiner aktiven Kondition.
  const zahlungszielQuelle =
    provQuelle?.zahlungsziel_tage != null ? provQuelle : aktive.find((k) => k.zahlungsziel_tage != null) ?? null
  const skontoQuelle =
    provQuelle?.skonto_prozent != null ? provQuelle : aktive.find((k) => k.skonto_prozent != null) ?? null

  return {
    provisionTyp: provTyp,
    provisionProzent: provProzent,
    provisionFix: provFix,
    einkaufsrabattProzent,
    zahlungszielTage: zahlungszielQuelle?.zahlungsziel_tage ?? null,
    skontoProzent: skontoQuelle?.skonto_prozent ?? null,
    skontoTage: skontoQuelle?.skonto_tage ?? null,
    mindestbestellwert,
    staffelHinweis,
    quelleKonditionId: provQuelle?.id ?? null,
  }
}
