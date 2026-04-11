# WBC Studio – Internes Projekt & Freigabe-Tool

## Projekt-Übersicht
Internes Tool für Wellbeing-Concepts zur Verwaltung von Kundenprojekten, Produktlisten, Kalkulation und Kundenfreigaben. Gebaut von Samy für Lisa und Soraya.

## Tech Stack
- Framework: Next.js 14 (App Router)
- Datenbank: Supabase (PostgreSQL) – Frankfurt EU
- Styling: Tailwind CSS
- Sprache: TypeScript
- Deployment: Vercel (fra1, Auto-Deploy auf push main)
- Auth: Supabase Auth

## Kernstruktur
Kunden → Projekte → Räume → Produkte
- Produkte können auch ohne Raum existieren (Produktbibliothek, `raum_id = NULL`)
- Admin: alles sehen/bearbeiten inkl. Einkaufspreise, Margen, Provisionen
- Externer Kunde: nur Freigabelink, reduzierte Ansicht, keine internen Preise

## Datenbankschema (Supabase)
Tabellen: `kunden`, `projekte`, `raeume`, `partner`, `produkte`, `produktstatus`, `freigabe_tokens`, `einstellungen`

Migrationen in `/supabase/migrations/` – lokal erstellt, in Supabase auszuführen:
- 001: `adresse` zu kunden
- 002: `standort`, `projektart`, `gesamtbudget` zu projekte
- 003: `kategorie` zu produkte
- 004: `provisionsmodell`, `provisions_wert`, `einkaufskonditionen` zu partner
- 005: `einstellungen`-Tabelle (Key-Value Store)
- 006: RLS-Policies für `einstellungen`
- 007: Testdaten (8 Kunden, 13 Projekte, 27 Räume, 35 Produkte)
- 008: `status`-Spalte zu `kunden` (aktiv/pausiert/abgeschlossen)
- 009: (siehe 008 – kunden status)
- 010: RLS-Fix für `einstellungen` INSERT (WITH CHECK)
- 011: `raum_id` in `produkte` nullable (Produktbibliothek)

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
- localStorage für UI-Präferenzen (Grid/Liste-Toggle)

## Wichtige Sicherheitsregeln
- DSGVO-konform, EU-Hosting (Supabase Frankfurt)
- Interne Preisfelder (`einkaufspreis`, `marge_prozent`, `provision_prozent`, `notizen_intern`) NIE in Kundenansicht übergeben
- Freigabe-Aktionen validieren Token + Produkt-Zugehörigkeit vor jedem Schreibzugriff
- RLS in Supabase für alle Tabellen aktiviert

## Design
- Ruhig, klar, hochwertig, modern, reduziert
- Primärfarbe: Indigo (#6366F1) – aktive Nav-Links, Buttons, Badges
- Sidebar: bg-[#0F1117] (dark), Syne-Font, DepthStack-Icon
- Desktop-first, responsiv
- Kein überladenes UI

## Projektstruktur
```
src/
├── app/
│   ├── actions/                → Server Actions
│   │   ├── kunden.ts
│   │   ├── projekte.ts
│   │   ├── raeume.ts
│   │   ├── produkte.ts         ← inkl. produktInBibliothekAnlegen
│   │   ├── partner.ts
│   │   ├── freigabe.ts
│   │   ├── freigabe-token.ts
│   │   └── einstellungen.ts    ← addListItem mit Icon-Support (Name|IconName)
│   ├── api/
│   │   ├── scrape-product/     ← cheerio URL-Scraping (Titel + Bild)
│   │   └── projekte/[id]/export/ ← CSV-Export
│   ├── auth/callback/
│   ├── dashboard/
│   │   ├── layout.tsx          ← fetchst offene Freigaben-Count → NavSidebar
│   │   ├── page.tsx            ← Recharts-Dashboard
│   │   ├── kunden/             ← Grid/Liste, Status-Filter, Avatar
│   │   ├── projekte/           ← Grid/Liste, Budget-Bar, Freigaben-Badge
│   │   │   └── [id]/raeume/[raumId]/produkte/ ← CRUD pro Raum
│   │   ├── produkte/           ← Alle Produkte mit Stats, Grid/Liste, Bibliothek
│   │   │   ├── page.tsx
│   │   │   ├── neu/            ← 2-Schritt Wizard (Projekt → Raum)
│   │   │   └── bibliothek/neu/ ← Direktformular ohne Projekt
│   │   ├── partner/            ← Grid/Liste, Detail mit Umsatz-Tiles
│   │   ├── freigaben/          ← Gruppiert nach Projekt, Tab offen/erledigt
│   │   ├── kategorien/         ← Icon-Picker, Produktkategorien/Raumtypen/Projektarten
│   │   ├── einstellungen/      ← 5 Tabs (Allgemein/Listen/Team/Benachrichtigungen/Freigabe)
│   │   └── profil/
│   ├── freigabe/[token]/       ← Öffentliche Kundenfreigabe (kein Login), Footer mit Impressum/Datenschutz
│   ├── login/
│   └── (landing)/             ← /, /features, /preise, /datenschutz, /impressum
├── components/
│   ├── NavSidebar.tsx          ← Reihenfolge: Dashboard/Kunden/Projekte/Partner/Produkte/Freigaben/Kategorien
│   │                              Roter Badge neben Freigaben (offene Anzahl)
│   ├── KundenGrid.tsx          ← Grid/Liste Toggle, Suche, Status-Filter
│   ├── ProjekteGrid.tsx        ← Grid/Liste, Budget-Bar, Stats
│   ├── PartnerGrid.tsx         ← Grid/Liste, Suche
│   ├── ProdukteTabelle.tsx     ← Stats-Leiste, Grid/Liste, Filter, Bibliothek-Badge
│   ├── NeuesProduktModal.tsx   ← Modal: "Zu Projekt" vs "Zur Bibliothek"
│   ├── FreigabenTabelle.tsx    ← Gruppiert nach Projekt, Thumbnails
│   ├── KategorienVerwaltung.tsx ← Icon-Picker (40 Icons, 8 Gruppen), Format Name|IconName
│   ├── EinstellungenTabs.tsx
│   ├── ProduktFormular.tsx     ← URL-Feld oben + Zap Auto-Fill, Live-Kalkulation, inpPreis-Styling
│   ├── KundeFormular.tsx
│   ├── ProjektFormular.tsx
│   ├── PartnerFormular.tsx
│   ├── RaumHinzufuegen.tsx
│   └── FreigabeLinkKarte.tsx
└── lib/supabase/
    ├── client.ts
    ├── server.ts
    ├── admin.ts               ← Service-Role, nur serverseitig!
    └── types.ts               ← raum_id: string | null in Produkt
```

## Preislogik (ProduktFormular)
- Produktlink-URL ganz oben + Zap-Button → Auto-Fill via `/api/scrape-product`
- EP netto + Marge % → VP netto (live, kein Submit)
- VP netto direkt → Marge % (Rückrechnung, live)
- VP brutto = VP netto × 1,19 (19% MwSt., live angezeigt)
- Provision € = VP netto × Provision% (live)
- Preisfelder visuell hervorgehoben (indigo-50 Hintergrund)
- Alle Gesamtpreise = Einzelpreis × Menge
- Werte als hidden inputs in FormData

## Kategorien-System
- Gespeichert in `einstellungen`-Tabelle als Komma-Liste
- Format: `Name|IconName` (z.B. `Möbel|Sofa`) für neue Einträge
- Legacy-Einträge ohne `|` → Package-Icon als Fallback
- Icon-Picker: 40 Lucide-Icons in 8 Gruppen beim Hinzufügen
- Drei Listen: produktkategorien, raumtypen, projektarten

## Freigabe-System
- Token generieren: Projektdetailseite → „Freigabelink erstellen"
- Öffentliche URL: `/freigabe/[token]` (kein Login nötig)
- Kunde sieht: Produktname, Kategorie, Menge, VP netto/brutto, Gesamt
- Kunde kann: Freigeben / Ablehnen / Alternative bestimmen (mit Kommentar)
- Footer: Links zu Impressum + Datenschutz
- Sicherheit: jede Aktion validiert Token-Gültigkeit + Produkt-Zugehörigkeit
- Offene Freigaben-Count im DashboardLayout → roter Badge in NavSidebar

## Produktbibliothek
- Produkte mit `raum_id = NULL` sind freie Bibliotheksprodukte
- Anlegen über: Produkte → „Neues Produkt" Modal → „Zur Bibliothek"
- In Tabelle/Grid als graues „Bibliothek"-Badge dargestellt
- Können später einem Raum zugewiesen werden (noch nicht implementiert)

## Aktueller Stand
- [x] GitHub Repo (samulba/wbc-studio)
- [x] Supabase Projekt (Frankfurt) + Datenbankschema (Migrations 001–011)
- [x] Next.js 14 Setup (App Router, TypeScript, Tailwind)
- [x] Supabase Auth + Login-Seite + Middleware
- [x] Dashboard mit Recharts (Balken/Donut/Linien)
- [x] Kunden-Verwaltung (CRUD, Grid/Liste, Status, Suche)
- [x] Projekte-Verwaltung (CRUD, Grid/Liste, Budget-Bar, Status)
- [x] Räume-Verwaltung (inline in Projekt-Detailseite)
- [x] Produkte-Verwaltung pro Raum (CRUD, Preislogik, URL-Scraping)
- [x] Produkte-Übersichtsseite (Stats, Grid/Liste, Filter, Sortierung)
- [x] Produktbibliothek (raum_id nullable, eigene Anlege-Route)
- [x] Partner-Verwaltung (CRUD, Grid/Liste, Detail mit Umsatz-Tiles)
- [x] Kundenfreigabe-Ansicht (öffentlicher Link, interaktiv, Footer-Links)
- [x] Freigaben-Übersicht (gruppiert nach Projekt, Tab offen/erledigt)
- [x] Kategorien mit Icon-Picker (40 Icons, Format Name|IconName)
- [x] Einstellungen (5 Tabs: Allgemein, Listen, Team, Benachrichtigungen, Freigabe)
- [x] CSV-Export pro Projekt (13 Spalten, UTF-8 BOM, Dateiname mit Datum)
- [x] Produktbilder: Upload via Supabase Storage (produktbilder Bucket)
- [x] Landing Page + /features + /preise + /datenschutz + /impressum
- [x] Sidebar: Produkte-Nav + roter Freigaben-Badge
- [x] Build fehlerfrei (0 Errors, 0 Warnings)
- [x] Deployment auf Vercel (fra1/Frankfurt, DSGVO-konform)
- [ ] Produkt aus Bibliothek einem Raum zuweisen (UI fehlt noch)
- [ ] Sortierung/Drag & Drop für Räume und Produkte
- [ ] Testen mit echten Daten (Lisa & Soraya)
- [ ] PDF-Ansicht (später)

## Nächste Schritte
1. Echte Daten eintragen und testen mit Lisa & Soraya
2. Bibliotheksprodukt → Raum zuweisen (Dropdown im Bearbeiten-Formular)
3. Drag & Drop Sortierung für Räume und Produkte
4. Feedback aus erstem echten Einsatz einarbeiten

## Wichtige Entscheidungen
- MVP nur Deutsch
- Kein Kunden-Login, nur Freigabelink mit Token
- CSV Export im MVP, PDF später
- Keine Echtzeit-Features
- MwSt. 19% hardcoded (Einstellungen-Tab vorbereitet für spätere Konfiguration)
- Produktbibliothek: raum_id nullable statt separater Tabelle

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
- Session 4: Vercel Deployment eingerichtet (vercel.json, fra1, Env-Vars). App ist live. CLAUDE.md aktualisiert.
- Session 5: Komplettes CI-Redesign – Wellbeing-Concepts Farbpalette, Google Fonts, WBC Tailwind Custom Colors. Alle Seiten überarbeitet. Build fehlerfrei.
- Session 6: Sidebar (Syne-Font, DepthStack-Icon, w-72, Indigo-Aktiv), Einstellungen 5-Tab-Layout, Recharts-Dashboard, Favicon. Bug-Fix ConfirmDeleteButton. Profil-Seite, Team-Invite. Migrations 005+006.
- Session 7: WBC Studio Branding, Dashboard 100vh flex-Layout, Kunden als Karten-Grid, Migration 007 Testdaten. Build fehlerfrei. Push auf GitHub/Vercel.
- Session 8: Landing Page Redesign – Hero/AnimatedBG, PricingCalculator, AnimateOnScroll. Neue Seiten: /features, /preise, /datenschutz, /impressum. Footer dark. Build fehlerfrei.
- Session 9: Sprint 2 – Sidebar (Freigaben+Kategorien), KundenGrid Grid/Liste+Status-Filter, Freigaben-Seite (Tabs), Kategorien-Seite, CSV-Export-Upgrade. Sprint 3 – Kunden-Status, Projekte-Seite neu, Partner-Detail, URL-Scraping (cheerio), Freigaben gruppiert, Kategorien Icons, Einstellungen Tabs. Migrations 008–010. Build fehlerfrei. Push.
- Session 10: Sprint 4 – Produkte-Seite (Stats/Grid/Liste/Filter), Produktbibliothek (raum_id nullable, Bibliothek-Route), NeuesProduktModal (2 Wege), ProduktFormular (URL oben, Zap, Preisfelder highlighted), NavSidebar Produkte+Badge, Kategorien Icon-Picker (40 Icons, Name|IconName), Migration 011. Build fehlerfrei. Push auf GitHub/Vercel.
- Session 11: Sprint 5 UX-Feedback – select padding-right fix (global), MobileGuard (<1024px Sperre), NavSidebar vereinfacht (Avatar→Einstellungen?tab=profil, Abmelden nur Icon), Dashboard Überschrift Syne/28px+Buttons, Donut-Chart responsiv, Balken-Tooltip voller Name, ProjekteGrid Status-Tabs (funktionieren), PartnerGrid ganze Karte klickbar, ProdukteTabelle Stats-Kacheln entfernt, KategorienVerwaltung 60 Icons in 10 Gruppen+X-Button 32px+Picker als Modal, FreigabenTabelle Initialen-Avatar. Migrations 012–014 (kunden logo/felder, partner logo, produkte beschreibung/zusatzbilder). Build fehlerfrei. Push.

## Anweisung
Am Ende jeder Session diesen Session-Log mit einem kurzen Eintrag aktualisieren was gemacht wurde und was als nächstes kommt.
