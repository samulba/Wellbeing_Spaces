/**
 * Formatierung des Freigabe-Stempels (Migration 135): „Freigegeben am {Datum} von {Name}".
 * Geteilt von Raum-Tabelle, Freigaben-Übersicht und Projekt-Freigaben-Tab.
 */

/** Datum + Uhrzeit kompakt auf Deutsch (z. B. „22.06.2026, 14:30"). */
export function stempelDatum(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Bereinigt den gespeicherten „von"-Wert für die Anzeige: der Token-Pfad speichert
 * „{Name} (Freigabe-Link)" — für den Stempel zeigen wir nur den Namen + Quelle separat.
 */
export function stempelVon(von: string | null | undefined): { name: string; quelle: string | null } {
  const v = (von ?? '').trim()
  if (!v) return { name: '', quelle: null }
  const m = v.match(/^(.*?)\s*\((.+)\)\s*$/)
  if (m) return { name: m[1].trim(), quelle: m[2].trim() }
  return { name: v, quelle: null }
}

/** Voller Stempeltext in einer Zeile, z. B. „Freigegeben 22.06.2026, 14:30 · Max Mustermann". */
export function stempelText(am: string | null | undefined, von: string | null | undefined): string {
  const datum = stempelDatum(am)
  const { name } = stempelVon(von)
  if (!datum && !name) return 'Freigegeben'
  return `Freigegeben${datum ? ' ' + datum : ''}${name ? ' · ' + name : ''}`
}
