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
- [x] Deployment auf Vercel (fra1/Frankfurt, DSGVO-konform)
- [ ] Design-Verbesserungen (nach erstem echten Einsatz)
- [ ] CSV-Export für Produktliste pro Projekt
- [ ] Produktbilder: Upload über Supabase Storage statt URL-Eingabe
- [ ] Testen mit echten Daten (Lisa & Soraya)
- [ ] Sortierung/Drag & Drop für Räume und Produkte
- [ ] PDF-Ansicht (später)

## Nächste Schritte
1. Design verbessern – nach Feedback aus erstem echten Einsatz
2. CSV-Export: Produktliste pro Projekt als Download
3. Produktbilder: Upload-Funktion über Supabase Storage
4. Echte Daten eintragen und testen mit Lisa & Soraya

## Wichtige Entscheidungen
- MVP nur Deutsch
- Kein Kunden-Login, nur Freigabelink mit Token
- CSV Export im MVP, PDF später
- Keine Echtzeit-Features
- Videos optional
- MwSt. 19% hardcoded (für spätere Konfigurierbarkeit vorgesehen)

## Deployment
- Plattform: Vercel (vercel.com)
- Region: fra1 (Frankfurt, DSGVO-konform)
- Auto-Deploy: jeder Push auf `main` löst automatisch ein neues Deployment aus
- Umgebungsvariablen in Vercel Dashboard hinterlegt (Production + Preview + Development)
- Supabase Auth Redirect URL muss auf die Live-URL zeigen: `[domain]/auth/callback`

## Session-Log
- Session 1: Setup abgeschlossen – GitHub, Supabase, Claude Code installiert
- Session 2: CLAUDE.md erstellt, Next.js initialisiert, Supabase-Client eingerichtet, Auth + Login + Dashboard gebaut
- Session 3: Vollständige App gebaut – Kunden/Projekte/Räume/Produkte/Partner CRUD, Preiskalkulation, Freigabe-System. Build fehlerfrei. Push auf GitHub.
- Session 4: Vercel Deployment eingerichtet (vercel.json, fra1, Env-Vars). App ist live. CLAUDE.md aktualisiert. Nächste Schritte: Design, CSV-Export, Bildupload, echte Daten.
- Session 5: Komplettes CI-Redesign – Wellbeing-Concepts Farbpalette (Creme/Dunkelgrün/Mint/Terrakotta/Sand), Google Fonts (Cormorant Garamond + Montserrat), WBC Tailwind Custom Colors. Alle Seiten und Komponenten überarbeitet (Login, Dashboard, Kunden, Projekte, Räume, Produkte, Partner, Freigabe-Ansicht). Build fehlerfrei (0 Errors/Warnings). Nächste Schritte: CSV-Export, Produktbilder-Upload.
- Session 6: Sidebar überarbeitet (Syne-Font, DepthStack-Icon links→rechts, w-72, aktiv=bg-[#6366F1]), Einstellungen 5-Tab-Layout (Allgemein/Kategorien/Team/Sicherheit/Abrechnung), Recharts-Dashboard (BalkenChart/DonutChart/LinienChart, 5-Zeilen-Layout), Favicon WBC-Logo. Bug-Fix ConfirmDeleteButton client-seitig. Profil-Seite, Team-Invite via Supabase Admin. Supabase Migrations 005+006.
- Session 7: 'WBC Studio' Branding (NavSidebar, layout.tsx, Login), DepthStack-Icon korrigiert, Dashboard 100vh flex-Layout (kein Außen-Scroll, Charts mit height='100%'), Kunden-Seite als Karten-Grid (grid-cols-3, 56px Avatar, Echtzeit-Suche, Projekt-Badge), Migration 007 Testdaten (8 Kunden, 13 Projekte, 27 Räume, 35 Produkte). Build fehlerfrei. Push auf GitHub/Vercel. Nächste Schritte: CSV-Export, Produktbilder-Upload, Testdaten in Supabase einspielen.

## Anweisung
Am Ende jeder Session diesen Session-Log mit einem kurzen Eintrag aktualisieren was gemacht wurde und was als nächstes kommt.
