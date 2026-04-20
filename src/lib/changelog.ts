import fs from 'fs'
import path from 'path'

export interface ChangelogEntry {
  datum:     string             // ISO: YYYY-MM-DD
  sektionen: ChangelogSektion[]  // z.B. "Sicherheit", "Workflows"
}

export interface ChangelogSektion {
  titel:   string | null         // null = keine Sektion, nur Stichpunkte
  punkte:  ChangelogPunkt[]
}

export interface ChangelogPunkt {
  text: string
  fett: string | null            // Text zwischen **...** am Zeilenanfang
}

/**
 * Lädt CHANGELOG.md aus dem Repo-Root und parsed ihn in strukturierte Einträge.
 * Wird server-seitig aufgerufen (fs-Zugriff).
 */
export function getChangelog(): ChangelogEntry[] {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md')
  if (!fs.existsSync(filePath)) return []

  const raw = fs.readFileSync(filePath, 'utf8')
  return parseChangelog(raw)
}

export function parseChangelog(raw: string): ChangelogEntry[] {
  const eintraege: ChangelogEntry[] = []
  let aktuellerEintrag: ChangelogEntry | null = null
  let aktuelleSektion:  ChangelogSektion | null = null

  const lines = raw.split('\n')
  for (const line of lines) {
    // ## 2026-04-21
    const datumMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2})\s*$/)
    if (datumMatch) {
      aktuellerEintrag = { datum: datumMatch[1], sektionen: [] }
      aktuelleSektion  = null
      eintraege.push(aktuellerEintrag)
      continue
    }

    // ### Sektionsname
    const sektionMatch = line.match(/^###\s+(.+?)\s*$/)
    if (sektionMatch && aktuellerEintrag) {
      aktuelleSektion = { titel: sektionMatch[1], punkte: [] }
      aktuellerEintrag.sektionen.push(aktuelleSektion)
      continue
    }

    // - Stichpunkt
    const punktMatch = line.match(/^-\s+(.+?)\s*$/)
    if (punktMatch && aktuellerEintrag) {
      if (!aktuelleSektion) {
        aktuelleSektion = { titel: null, punkte: [] }
        aktuellerEintrag.sektionen.push(aktuelleSektion)
      }
      const text = punktMatch[1]
      // Fett-Prefix extrahieren: **Foo**: Rest → fett='Foo', text=': Rest'
      const fettMatch = text.match(/^\*\*(.+?)\*\*(.*)/)
      aktuelleSektion.punkte.push({
        text: fettMatch ? fettMatch[2].trim() : text,
        fett: fettMatch ? fettMatch[1] : null,
      })
    }
  }

  return eintraege
}

/** Zählt Einträge mit Datum > seit (als Date oder ISO-String). */
export function zaehleNeueEintraege(
  eintraege: ChangelogEntry[],
  seit: Date | string | null,
): number {
  if (!seit) return eintraege.length
  const seitDate = typeof seit === 'string' ? new Date(seit) : seit
  return eintraege.filter((e) => new Date(e.datum) > seitDate).length
}
