# Repository Map

## Kompakte Tree-Ansicht

```
wbc-studio/
├── src/
│   ├── app/                        ← Next.js App Router (Routing + Pages)
│   │   ├── actions/                ← Alle Server Actions (Datenmutationen)
│   │   ├── api/                    ← API Routes (3 Stück)
│   │   │   ├── auth/callback/      ← Supabase OAuth Callback
│   │   │   ├── projekte/[id]/export/ ← CSV-Export
│   │   │   └── scrape-product/     ← Web-Scraping Endpoint
│   │   ├── auth/                   ← Auth-Hilfsseitenbereich
│   │   ├── dashboard/              ← Gesamtes Admin-Dashboard
│   │   │   ├── layout.tsx          ← Dashboard-Layout (Auth-Guard, Sidebar)
│   │   │   ├── page.tsx            ← Dashboard-Startseite mit Charts
│   │   │   ├── einstellungen/      ← App-Einstellungen
│   │   │   ├── freigaben/          ← Freigaben-Übersicht
│   │   │   ├── kategorien/         ← Kategorien-Verwaltung
│   │   │   ├── kunden/             ← Kunden CRUD
│   │   │   ├── partner/            ← Partner CRUD
│   │   │   ├── produkte/           ← Produktbibliothek
│   │   │   └── projekte/           ← Projekte + Räume + Produkte
│   │   ├── freigabe/[token]/       ← Öffentliche Kundenansicht (kein Auth)
│   │   ├── login/                  ← Login-Seite
│   │   ├── page.tsx                ← Landing Page (Root)
│   │   ├── agb/ features/ preise/  ← Marketing-Seiten
│   │   ├── datenschutz/ impressum/ ← Rechtliche Seiten
│   │   ├── fonts/                  ← Lokale Fonts
│   │   ├── globals.css             ← Globales CSS (Tailwind-Imports)
│   │   └── layout.tsx              ← Root Layout
│   ├── components/                 ← Wiederverwendbare UI-Komponenten
│   │   └── landing/                ← Landing-Page-spezifische Komponenten
│   └── lib/
│       └── supabase/               ← Supabase-Client-Initialisierung + Types
│           ├── admin.ts            ← Service-Role-Client (RLS-Bypass)
│           ├── client.ts           ← Browser-Client
│           ├── server.ts           ← Server-Client (mit Cookies)
│           └── types.ts            ← Alle TypeScript-Interfaces
├── supabase/
│   └── migrations/                 ← SQL-Migrations (001–019)
├── public/                         ← Statische Assets
├── chatgpt_project_context/        ← Dieser Dokumentations-Ordner
├── CLAUDE.md                       ← KI-Arbeitsanweisungen (Session-Log)
├── .env.example                    ← Env-Vorlage (ohne Werte)
├── .env.local                      ← Lokale Env-Werte (nicht committen!)
├── next.config.mjs                 ← Next.js Config (aktuell minimal/leer)
├── tailwind.config.ts              ← Tailwind-Konfiguration
├── tsconfig.json                   ← TypeScript-Konfiguration
├── vercel.json                     ← Vercel Deploy-Konfiguration
└── package.json                    ← Dependencies + Scripts
```

## Erläuterung der wichtigsten Ordner

### `src/app/actions/` – **kritisch**
Alle Datenmutationen der App als Next.js Server Actions. Kein Client-Code darf direkt Supabase mutieren. 13 Dateien:

| Datei | Zweck |
|-------|-------|
| `dateien.ts` | Datei-Upload/Delete |
| `einstellungen.ts` | App-Einstellungen lesen/schreiben |
| `freigabe.ts` | Produkt-Status setzen (freigeben/ablehnen/etc.) |
| `freigabe-token.ts` | Freigabe-Token generieren/deaktivieren |
| `kunden.ts` | Kunden CRUD |
| `logo-upload.ts` | Logo-Upload zu Supabase Storage |
| `notizen.ts` | Notizen CRUD |
| `partner.ts` | Partner CRUD |
| `produkte.ts` | Produkte CRUD + Positionen |
| `profil.ts` | Nutzerprofil |
| `projekte.ts` | Projekte CRUD + Status |
| `raeume.ts` | Räume anlegen/löschen/sortieren |
| `team.ts` | Team-Verwaltung (**Unklar / prüfen – keine sichtbare UI**) |

### `src/components/` – **zentral**
29 wiederverwendbare Komponenten. Alle Formulare, Tabellen, Modals, Charts, Drag-&-Drop-Listen hier.

### `src/lib/supabase/` – **kritisch**
Drei Client-Varianten + zentrale Type-Definitionen. Falsche Client-Nutzung (z. B. Browser-Client serverseitig) wäre ein Sicherheitsproblem.

### `supabase/migrations/` – **kritisch**
Manuelle SQL-Migrations, müssen manuell in Supabase Studio ausgeführt werden. Kein automatischer Migration-Runner.

### `src/app/dashboard/projekte/[id]/raeume/[raumId]/` – **tiefstes Routing**
Die komplexeste verschachtelte Route: `projekt → raum → produkt`. Enthält auch `produkte/neu/` und `produkte/[produktId]/bearbeiten/`.

### `src/app/freigabe/[token]/` – **öffentlich**
Einzige öffentlich zugängliche Route ohne Auth (außer Marketing-Seiten). Token-basierter Zugriff.
