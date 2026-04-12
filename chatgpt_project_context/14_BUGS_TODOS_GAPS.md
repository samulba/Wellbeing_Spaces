# Bugs, TODOs & Lücken

## Formale Code-Kommentare (TODO/FIXME/HACK)

**Keine** `// TODO`, `// FIXME`, `// HACK`, `// XXX` Kommentare im Quellcode gefunden.

---

## Bekannte Bugs (aus Session-History ableitbar)

### Kategorien-Listen (`einstellungen`-Tabelle) – behoben in aktueller Session
- **Bug 1**: "Fehler beim Speichern" beim Hinzufügen neuer Kategorien-Einträge
- **Bug 2**: "Liste nicht gefunden" beim Bearbeiten
- **Ursache**: `addListItem`/`updateListItem` nutzten `createClient()` (RLS-abhängig) statt Admin-Client, und `.single()` statt `.maybeSingle()` (warf Fehler bei fehlendem Row)
- **Status**: Behoben (`019_einstellungen_listen_seed.sql` + Admin-Client in `einstellungen.ts`)
- **Offen**: Migration 019 muss noch manuell in Supabase Studio ausgeführt werden

---

## Halb angebundene / unklare Bereiche

### `src/app/actions/team.ts`
- Datei existiert mit 13 anderen Action-Dateien
- Keine UI-Komponente oder Seite gefunden, die diese Action aufruft
- Mögliche Baustelle für Multi-User / Team-Feature
- **Empfehlung**: Datei öffnen und Inhalt prüfen

### `freigabe_pin_schutz` Einstellung
- `einstellungen`-Key `freigabe_pin_schutz` existiert (Migration 006, default `'false'`)
- `freigabe_pin_laenge` ebenfalls vorhanden
- Ob `/freigabe/[token]/page.tsx` diesen Wert tatsächlich liest und einen PIN-Check implementiert: **Nicht analysiert**
- Wenn nur Einstellungs-UI ohne Enforcement → Feature-Lücke

### Benachrichtigungen (`benach_*` Settings)
- Einstellungs-UI für Email-Benachrichtigungen vorhanden
- Ob tatsächlich Emails verschickt werden (Supabase Edge Function? externer Service?): **Nicht sichtbar im Code**
- Könnte eine reine UI-Attrappe sein

### `NeuesProduktModal.tsx`
- Komponente existiert (`src/components/NeuesProduktModal.tsx`)
- Wo genau sie eingebunden ist, wurde nicht vollständig analysiert

### Zusatzbilder bei Produkten
- Migration 014 erwähnt `produkte_beschreibung_zusatzbilder` – ob vollständig implementiert ist unklar

---

## Fehlende Funktionalität (erkennbar aus Struktur)

| Was fehlt | Warum erkennbar |
|-----------|----------------|
| **Kein automatischer Migrations-Runner** | Migrations müssen manuell in Supabase Studio ausgeführt werden |
| **Keine Tests** | Kein Test-Runner in `package.json`, kein `/tests`-Ordner |
| **Kein CI/CD** | Kein `.github/workflows/` Ordner |
| **Kein TypeScript-Standalone-Check** | Kein `tsc --noEmit` Script |
| **Kein `next/image` für Produktbilder** | `SortableProduktTabelle.tsx` verwendet `<img>` Tag mit ESLint-Suppression |
| **Keine Error Boundaries** | Kein `error.tsx` in kritischen Routen |
| **Kein 404-Handling** | Kein globales `not-found.tsx` auf Root-Level sichtbar |

---

## Potenzielle Inkonsistenzen

| Bereich | Beschreibung |
|---------|-------------|
| **`produktstatus` 1:n** | Technisch können mehrere Status-Einträge pro Produkt existieren, aber die App behandelt es als 1:1. Ältere Status-Einträge bleiben in der DB |
| **`freigabe_tokens` mehrere aktiv** | DB erlaubt mehrere aktive Tokens pro Projekt gleichzeitig, App zeigt nur einen an. Alte deaktivierte Tokens bleiben |
| **Soft Delete + Filter** | Alle Queries müssen `.is('deleted_at', null)` haben – ob das überall konsequent ist: Unklar |
