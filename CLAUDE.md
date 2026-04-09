# WBC Studio – Internes Projekt & Freigabe-Tool

## Projekt-Übersicht
Internes Tool für Wellbeing-Concepts zur Verwaltung von Kundenprojekten, Produktlisten, Kalkulation und Kundenfreigaben. Gebaut von Samy für Lisa und Soraya.

## Tech Stack
- Framework: Next.js 14 (App Router)
- Datenbank: Supabase (PostgreSQL) – Frankfurt EU
- Styling: Tailwind CSS
- Sprache: TypeScript
- Deployment: Vercel
- Auth: Supabase Auth

## Kernstruktur
Kunden → Projekte → Räume → Produkte
- Admin: alles sehen/bearbeiten inkl. Einkaufspreise, Margen, Provisionen
- Externer Kunde: nur Freigabelink, reduzierte Ansicht, keine internen Preise

## Datenbankschema (Supabase)
Tabellen: `kunden`, `projekte`, `raeume`, `partner`, `produkte`, `produktstatus`, `freigabe_tokens`
Migrationen in `/supabase/migrations/` – alle ausgeführt:
- 001: `adresse` zu kunden
- 002: `standort`, `projektart`, `gesamtbudget` zu projekte
- 003: `kategorie` zu produkte
- 004: `provisionsmodell`, `provisions_wert`, `einkaufskonditionen` zu partner

## Coding-Konventionen
- Funktionale React Komponenten mit Hooks
- Named exports
- Tailwind für alle Styles, kein inline CSS
- Alle UI-Texte auf Deutsch
- Soft Delete statt hartem Löschen (`deleted_at` Timestamp)
- Server Actions für alle Mutations (in `src/app/actions/`)
- `useFormState` + `useFormStatus` für Formulare
- Supabase Admin-Client (`src/lib/supabase/admin.ts`) nur serverseitig, nie im Browser
- `createClient()` aus `server.ts` für Server Components, aus `client.ts` für Client Components

## Wichtige Sicherheitsregeln
- DSGVO-konform, EU-Hosting (Supabase Frankfurt)
- Interne Preisfelder (`einkaufspreis`, `marge_prozent`, `provision_prozent`, `notizen_intern`) NIE in Kundenansicht übergeben
- Freigabe-Aktionen validieren Token + Produkt-Zugehörigkeit vor jedem Schreibzugriff
- RLS in Supabase für alle Tabellen aktiviert

## Design
- Ruhig, klar, hochwertig, modern, reduziert
- Farbpalette: stone (Grautöne), intern = amber-Markierungen
- Desktop-first, responsiv
- Kein überladenes UI

## Projektstruktur
```
src/
├── app/
│   ├── actions/          → Server Actions (kunden, projekte, raeume, produkte, partner, freigabe, freigabe-token)
│   ├── auth/callback/    → Supabase Auth Callback
│   ├── dashboard/        → Geschützte Admin-Seiten
│   │   ├── kunden/       → CRUD Kunden
│   │   ├── projekte/     → CRUD Projekte + Status-Umschalter
│   │   │   └── [id]/raeume/[raumId]/  → Produktverwaltung pro Raum
│   │   └── partner/      → CRUD Partner
│   ├── freigabe/[token]/ → Öffentliche Kundenfreigabe-Ansicht (kein Login)
│   └── login/            → Login-Seite
├── components/           → Wiederverwendbare Komponenten
│   ├── KundeFormular.tsx
│   ├── ProjektFormular.tsx
│   ├── PartnerFormular.tsx
│   ├── ProduktFormular.tsx  ← Preislogik: EP + Marge → VP netto/brutto, Provision
│   ├── RaumHinzufuegen.tsx
│   └── FreigabeLinkKarte.tsx
└── lib/supabase/
    ├── client.ts         → Browser-Client (Anon-Key)
    ├── server.ts         → Server-Client (Anon-Key + Cookies)
    ├── admin.ts          → Admin-Client (Service-Role, nur serverseitig!)
    └── types.ts          → Alle TypeScript-Typen
```

## Preislogik (ProduktFormular)
- EP netto + Marge % → VP netto (automatisch)
- VP netto direkt → Marge % (Rückrechnung)
- VP brutto = VP netto × 1,19 (19% MwSt.)
- Provision € = VP netto × Provision%
- Alle Gesamtpreise = Einzelpreis × Menge
- Berechnungen reactiv im Browser, Werte als hidden inputs in FormData

## Freigabe-System
- Token generieren: Projektdetailseite → „Freigabelink erstellen"
- Öffentliche URL: `/freigabe/[token]` (kein Login nötig)
- Kunde sieht: Produktname, Kategorie, Menge, VP netto/brutto, Gesamt
- Kunde kann: Freigeben / Ablehnen / Alternative bestimmen (mit Kommentar)
- Sicherheit: jede Aktion validiert Token-Gültigkeit + Produkt-Zugehörigkeit

## Aktueller Stand
- [x] GitHub Repo (samulba/wbc-studio)
- [x] Supabase Projekt (Frankfurt) + Datenbankschema
- [x] Next.js 14 Setup (App Router, TypeScript, Tailwind)
- [x] Supabase Auth + Login-Seite + Middleware
- [x] Dashboard mit Navigation
- [x] Kunden-Verwaltung (CRUD)
- [x] Projekte-Verwaltung (CRUD + Status)
- [x] Räume-Verwaltung (inline in Projekt-Detailseite)
- [x] Produkte-Verwaltung pro Raum (CRUD + Preislogik)
- [x] Partner-Verwaltung (CRUD + Provisionsmodell)
- [x] Kundenfreigabe-Ansicht (öffentlicher Link, interaktiv)
- [x] Build fehlerfrei (0 Errors, 0 Warnings)
- [ ] Deployment auf Vercel
- [ ] CSV-Export
- [ ] PDF-Ansicht (später)
- [ ] Produktbilder hochladen (Supabase Storage)
- [ ] Sortierung/Drag & Drop für Räume und Produkte

## Nächste Schritte
1. Vercel Deployment einrichten + Umgebungsvariablen setzen
2. CSV-Export für Produktliste pro Projekt
3. Produktbilder: Upload über Supabase Storage statt URL-Eingabe
4. Sortierung: Räume und Produkte per Drag & Drop umsortieren

## Wichtige Entscheidungen
- MVP nur Deutsch
- Kein Kunden-Login, nur Freigabelink mit Token
- CSV Export im MVP, PDF später
- Keine Echtzeit-Features
- Videos optional
- MwSt. 19% hardcoded (für spätere Konfigurierbarkeit vorgesehen)

## Session-Log
- Session 1: Setup abgeschlossen – GitHub, Supabase, Claude Code installiert
- Session 2: CLAUDE.md erstellt, Next.js initialisiert, Supabase-Client eingerichtet, Auth + Login + Dashboard gebaut
- Session 3: Vollständige App gebaut – Kunden/Projekte/Räume/Produkte/Partner CRUD, Preiskalkulation, Freigabe-System. Build fehlerfrei. Push auf GitHub.

## Anweisung
Am Ende jeder Session diesen Session-Log mit einem kurzen Eintrag aktualisieren was gemacht wurde und was als nächstes kommt.
