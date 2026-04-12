# Risiken & Fragen für den nächsten Assistenten

Dieses Dokument ist ein professionelles Handover. Es fasst zusammen, was ein zweiter KI-Assistent wissen muss, bevor er mit dem Projekt arbeitet.

---

## Architekturelle Kernregeln (unbedingt beachten)

1. **Server Actions only für Mutationen** – Nie direkt vom Client in Supabase schreiben
2. **Admin-Client nur serverseitig** – `createAdminClient()` nie in `'use client'`-Komponenten
3. **Interne Felder nie zum Kunden** – `einkaufspreis`, `marge_prozent`, `provision_prozent`, `notizen_intern` dürfen nie in Freigabe-Ansicht oder API-Responses erscheinen
4. **Tailwind only** – Kein inline CSS, kein CSS-in-JS
5. **Soft Delete überall** – Niemals `DELETE` auf Kernentitäten, immer `deleted_at` setzen
6. **UI-Texte Deutsch** – Alle User-facing Texte auf Deutsch

---

## Offene Architekturfragen

### 1. Team / Multi-User
`src/app/actions/team.ts` existiert ohne erkennbare UI-Anbindung. Ist ein Multi-User-System geplant? Falls ja: Wie sollen Berechtigungen pro User funktionieren? RLS-Policies wären dann deutlich komplexer.

### 2. RLS-Coverage
Nur die `einstellungen`-Tabelle hat dokumentierte RLS-Policies in den Migrations. Ob `kunden`, `projekte`, `raeume`, `produkte`, `partner`, `freigabe_tokens` ebenfalls RLS haben, muss im Supabase Dashboard geprüft werden. Fehlende RLS wäre ein ernstes Sicherheitsproblem.

### 3. PIN-Schutz Freigabe-Link
`freigabe_pin_schutz`-Einstellung existiert in der UI, aber ob `/freigabe/[token]/page.tsx` diesen Wert tatsächlich enforced – unbekannt. Prüfen: `src/app/freigabe/[token]/page.tsx` lesen.

### 4. Benachrichtigungen
Gibt es einen Email-Delivery-Service? Supabase kann Emails versenden, aber für Custom-Benachrichtigungen wäre ein separater Service (Resend, Postmark, etc.) nötig. Aktuell nicht erkennbar.

---

## Technische Risiken

| Risiko | Schwere | Details |
|--------|---------|---------|
| **Keine Tests** | Mittel | Jede Änderung kann silent Regressions einführen |
| **Manuelle Migrations** | Mittel | Vergessene Migrations führen zu Runtime-Fehlern (war bereits der Bug-Auslöser) |
| **`next.config.mjs` leer** | Niedrig | Keine Image-Domains, keine Security Headers konfiguriert |
| **`/api/scrape-product` ohne Auth** | Mittel | Kann als Open Proxy missbraucht werden |
| **TypeScript-Typen manuell** | Niedrig | `types.ts` ist nicht auto-generiert – kann veralten wenn DB-Schema sich ändert |
| **`<img>` statt `next/image`** | Niedrig | Keine automatische Bildoptimierung, ESLint-Rule suppressed |

---

## Was vor der nächsten Session manuell geprüft werden sollte

1. **Supabase Dashboard → Table Editor**: RLS für alle Tabellen aktiviert?
2. **Migration 019 ausgeführt?**: `SELECT * FROM einstellungen WHERE schluessel IN ('produktkategorien', 'raumtypen', 'projektarten')` prüfen
3. **`src/app/actions/team.ts` lesen**: Was macht diese Datei?
4. **`src/app/freigabe/[token]/page.tsx` lesen**: PIN-Schutz implementiert?
5. **Storage Buckets**: Sind die Buckets in Supabase public oder private?

---

## Wichtigste Dateien für künftige Arbeit

| Datei | Warum kritisch |
|-------|---------------|
| `src/lib/supabase/types.ts` | Zentrale Typdefinitionen – bei DB-Änderungen immer updaten |
| `src/app/actions/*.ts` | Jede Datenmutation geht hier durch |
| `src/middleware.ts` | Route-Protection – Änderungen hier betreffen die gesamte App |
| `src/app/dashboard/layout.tsx` | Double-Auth-Check, Sidebar-Init, offene Freigaben-Count |
| `src/app/dashboard/projekte/[id]/page.tsx` | Komplexeste Seite (Stats, Räume, DnD, Export, Notizen) |
| `src/components/SortableProduktTabelle.tsx` | Kernkomponente für Produktlisten |
| `src/app/freigabe/[token]/page.tsx` | Öffentliche Kundenansicht – sicherheitskritisch |
| `supabase/migrations/` | Schema-Wahrheit – Ordner lesen bevor DB-Änderungen |
| `CLAUDE.md` | Session-Log + Projektregeln – immer aktuell halten |

---

## Vorgeschlagene nächste Schritte (basierend auf Codeanalyse)

Diese Liste ist eine Einschätzung – keine Verpflichtung:

1. Migration 019 in Supabase ausführen (behebt Kategorien-Bugs)
2. `team.ts` analysieren und entscheiden ob feature oder dead code
3. RLS-Status aller Tabellen im Supabase Dashboard prüfen
4. `/api/scrape-product` mit Auth absichern oder Rate-Limiting hinzufügen
5. `next/image` statt `<img>` für Produktbilder (Performance)
6. Security Headers in `next.config.mjs` konfigurieren
