# Wellbeing Spaces

## Tech Stack
Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Frankfurt) · Vercel (fra1, auto-deploy main)

## Kern
Kunden → Projekte → Räume → Produkte. `raum_id = NULL` = Produktbibliothek.
Admin sieht alles (EP/Marge/Provision). Kunde nur Freigabelink `/freigabe/[token]`.

## DB-Tabellen
`kunden`, `projekte`, `raeume`, `partner`, `produkte`, `produktstatus`, `freigabe_tokens`, `einstellungen`
Letzte Migration: 021 (produkte bestellstatus). Migrations in `/supabase/migrations/`.
**einstellungen-Schema (echte DB):** `id` (uuid), `key` (text, unique), `value` (text), `created_at`, `updated_at` — NICHT `schluessel`/`wert`!

## Regeln
- Server Actions in `src/app/actions/`. Supabase admin nur serverseitig (`admin.ts`).
- Interne Felder (`einkaufspreis`, `marge_prozent`, `provision_prozent`, `notizen_intern`) NIE an Kunde.
- Soft Delete (`deleted_at`). UI-Texte Deutsch. Tailwind only, kein inline CSS.
- Kategorien: `einstellungen`-Tabelle, Format `Name|IconName` (z.B. `Möbel|Sofa`).
- Preislogik: EP netto + Marge% → VP netto; VP brutto = VP × 1,19; Provision = VP × Provision%.

## Design
Wellbeing Green (#445c49) aktiv. Sidebar: bg-[#445c49] (forest green), Syne-Font. Desktop-first, ruhig/reduziert.
Farbpalette: wellbeing-green (#445c49), wellbeing-green-light (#94c1a4), wellbeing-green-dark (#2d3e31), wellbeing-cream (#f6ede2), wellbeing-terracotta (#823509), wellbeing-sand (#cba178).

## Offen
- (nichts mehr offen)

## Session-Log
- S12: Notizen (Migration 015), Logo-Upload (Migration 016), Projektdetail-Stats, FreigabeLinkKarte.
- S13: Login-Seite Redesign (DepthStack-Icon, Syne, gepunkteter Hintergrund, Icon-Inputs, Loader-Animation).
- S14: Kundenfreigabe mobil – großes Produktbild, Touch-Buttons (py-3.5, flex-col→row), Mini-Donut im Header, einklappbare Beschreibung, Preis-Grid.
- S15: Bibliotheksprodukt zuweisen – ProduktZuweisenModal (Projekt+Raum-Dropdown), Button in Grid+Tabelle, Action produktZuRaumZuweisen.
- S16: MwSt. dynamisch – getMwstSatz() aus einstellungen-Tabelle, alle Produkt-Berechnungen (Formular, Tabelle, Freigabe, CSV-Export) lesen Wert aus DB statt hardcoded 19%.
- S17: PDF-Export – PdfExportButton (jspdf + jspdf-autotable, client-seitig), Button auf Projektdetailseite neben CSV, A4-Portrait mit Indigo-Header, Produkttabelle, Status-Farben, Gesamtsumme, Seitenzahl.
- S18: Drag & Drop Räume – SortableRaumListe (@dnd-kit), GripVertical Handle, optimistisches UI, updateRaumPositionen Action, Migration 017.
- S19: Drag & Drop Produkte – SortableProduktTabelle (@dnd-kit), GripVertical Handle links pro Zeile, updateProduktPositionen Action, Migration 018. Fix 2 (ProduktZuweisenModal in Bibliothek) war bereits fertig (S15).
- S20: Kategorien-Bugs gefixt (Admin-Client + maybeSingle(), Migration 019 Seed). RaumHinzufügen mit Raumtypen-Kacheln (Icons, aufklappbares Panel). ChatGPT-Kontext-Paket in chatgpt_project_context/ erstellt (17 Doku-Dateien, keine bestehenden Dateien verändert).
- S21: Bestellstatus-Flow (Migration 021, bestellstatus_enum, SortableProduktTabelle mit Select-Dropdown + optimistischem UI). Vollständiges Rebranding WBC Studio → Wellbeing Spaces: tailwind.config.ts wellbeing-Farbpalette, alle indigo-* Klassen → wellbeing-green/light/dark/cream, Hex-Farben ersetzt, Sidebar #0F1117 → #445c49, DepthStackIcon weiße Fills, package.json, CLAUDE.md.
- S22: Fix einstellungen-Spaltennamen: echte DB hat `key`/`value` statt `schluessel`/`wert` (Migrations-Drift). Alle Supabase-Queries in einstellungen.ts korrigiert.

## Anweisung
Am Ende jeder Session den Session-Log mit einem kurzen Eintrag aktualisieren.
