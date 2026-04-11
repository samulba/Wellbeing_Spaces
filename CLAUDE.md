# WBC Studio

## Tech Stack
Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Frankfurt) · Vercel (fra1, auto-deploy main)

## Kern
Kunden → Projekte → Räume → Produkte. `raum_id = NULL` = Produktbibliothek.
Admin sieht alles (EP/Marge/Provision). Kunde nur Freigabelink `/freigabe/[token]`.

## DB-Tabellen
`kunden`, `projekte`, `raeume`, `partner`, `produkte`, `produktstatus`, `freigabe_tokens`, `einstellungen`
Letzte Migration: 016 (Logo-Upload Storage-Buckets). Migrations in `/supabase/migrations/`.

## Regeln
- Server Actions in `src/app/actions/`. Supabase admin nur serverseitig (`admin.ts`).
- Interne Felder (`einkaufspreis`, `marge_prozent`, `provision_prozent`, `notizen_intern`) NIE an Kunde.
- Soft Delete (`deleted_at`). UI-Texte Deutsch. Tailwind only, kein inline CSS.
- Kategorien: `einstellungen`-Tabelle, Format `Name|IconName` (z.B. `Möbel|Sofa`).
- Preislogik: EP netto + Marge% → VP netto; VP brutto = VP × 1,19; Provision = VP × Provision%.

## Design
Indigo (#6366F1) aktiv. Sidebar: bg-[#0F1117], Syne-Font. Desktop-first, ruhig/reduziert.

## Offen
- Bibliotheksprodukt → Raum zuweisen (UI fehlt)
- Drag & Drop Räume/Produkte

## Session-Log
- S12: Notizen (Migration 015), Logo-Upload (Migration 016), Projektdetail-Stats, FreigabeLinkKarte.
- S13: Login-Seite Redesign (DepthStack-Icon, Syne, gepunkteter Hintergrund, Icon-Inputs, Loader-Animation).

## Anweisung
Am Ende jeder Session den Session-Log mit einem kurzen Eintrag aktualisieren.
