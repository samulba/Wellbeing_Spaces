// Paginierte Supabase-Lesehilfen — verhindern den stillen Row-Cap.
//
// PostgREST/Supabase liefert pro Request standardmäßig nur bis zu ~1000 Zeilen. Ohne
// Pagination werden bei großen Räumen/Projekten Produktzeilen STILL abgeschnitten — im
// Freigabelink fehlen dann zuletzt hinzugefügte Produkte/Blöcke (sie liegen am Ende der
// Sortierung). Diese Helfer laden vollständig, in Blöcken.
//
// Reiner Helper (kein Supabase-Import) → unit-testbar mit Mock-Fetchern (siehe Test).

export interface SeitenErgebnis<T> {
  data: T[] | null
  error: { message: string } | null
}

/**
 * Lädt ALLE Zeilen einer Query: ruft `seite(von, bis)` (eine `.range(von, bis)`-Abfrage)
 * in Blöcken von `chunk` Zeilen auf, bis ein Block weniger als `chunk` liefert. Bricht
 * beim ersten Fehler ab und reicht ihn durch (damit eine Fallback-Logik greifen kann).
 *
 * WICHTIG: Die zugrunde liegende Query MUSS eine EINDEUTIGE Gesamtordnung haben
 * (z. B. `.order('reihenfolge').order('id')`), sonst können an Blockgrenzen Zeilen
 * doppelt erscheinen oder ausgelassen werden.
 */
export async function ladeAlleSeiten<T>(
  seite: (von: number, bis: number) => PromiseLike<SeitenErgebnis<T>>,
  chunk = 1000,
): Promise<SeitenErgebnis<T>> {
  const alle: T[] = []
  for (let von = 0; ; von += chunk) {
    const { data, error } = await seite(von, von + chunk - 1)
    if (error) return { data: null, error }
    const batch = data ?? []
    alle.push(...batch)
    if (batch.length < chunk) break
  }
  return { data: alle, error: null }
}

/**
 * Lädt Zeilen für eine große ID-Liste: splittet `ids` in Gruppen von `chunk` und ruft
 * `seite(idChunk)` (eine `.in('id', idChunk)`-Abfrage) je Gruppe auf — PostgREST cappt
 * auch die Antwort großer `.in()`-Abfragen. Akkumuliert alle Treffer; erster Fehler wird
 * durchgereicht. Leere ID-Liste → kein Aufruf, leeres Ergebnis.
 */
export async function ladeNachIds<T>(
  ids: string[],
  seite: (idChunk: string[]) => PromiseLike<SeitenErgebnis<T>>,
  chunk = 1000,
): Promise<SeitenErgebnis<T>> {
  const alle: T[] = []
  for (let i = 0; i < ids.length; i += chunk) {
    const { data, error } = await seite(ids.slice(i, i + chunk))
    if (error) return { data: null, error }
    alle.push(...(data ?? []))
  }
  return { data: alle, error: null }
}
