# Aktueller Status

## Was ist bereits implementiert

### Vollständig ausgebaut (erkennbar fortgeschritten)

- **Auth-Flow**: Login, Supabase-Session, Middleware-Guard, Auth-Callback-Route
- **Kunden-CRUD**: Liste, Neu, Bearbeiten, Soft-Delete, Logo-Upload, Status
- **Projekt-CRUD**: Liste, Neu, Bearbeiten, Soft-Delete, Budget, Status-Steuerung
- **Räume**: Anlegen (mit Raumtypen-Kacheln), Soft-Delete, Drag & Drop Sortierung
- **Produkte (pro Raum)**: Vollformular (EP, Marge, VP, Provision, Kategorie, Partner, Bild, URL, Beschreibung, Zusatzbilder, interne Notizen), Drag & Drop Sortierung
- **Produktbibliothek**: Separate Anlage ohne Raum, Zuweisung zu Räumen per Modal
- **Partner-CRUD**: Liste, Neu, Bearbeiten, Soft-Delete, Logo, Provisions­modell
- **Freigabe-System**: Token-generierung, öffentliche Kundenansicht `/freigabe/[token]`, Status setzen (freigegeben/abgelehnt/überarbeitung), Kommentar
- **PDF-Export**: Client-seitig via jspdf + autotable, A4-Portrait mit Produkttabelle und Gesamtsumme
- **CSV-Export**: API-Route `/api/projekte/[id]/export` mit korrektem MwSt.-Satz
- **Dashboard-Übersicht**: KPI-Karten, recharts-Charts (Budget vs. Ist, Freigabe-Donut, Aktivitäts­liniendiagramm)
- **Kategorien-Verwaltung**: Produktkategorien, Raumtypen, Projektarten mit Icon-Picker
- **Einstellungen**: Allgemein, MwSt., Benachrichtigungen, Freigabe-Optionen
- **Notizen**: Pro Projekt (Migration 015)
- **Logo-Upload**: Kunden und Partner (Supabase Storage, Migration 016)
- **Web-Scraping**: `/api/scrape-product` für automatisches Befüllen von Produkt­name/-bild/-preis
- **Freigaben-Übersicht**: Filter, Tabs (Offen/Freigegeben/Abgelehnt/Überarbeitung/Alle), Balken/Listenansicht, Gruppen/Flachliste

### Vorhanden, aber Reifegrad unklar

- **`src/app/actions/team.ts`** existiert – was genau es tut und ob es genutzt wird: **Unklar / prüfen**
- **`MobileGuard`-Komponente** – blockt offenbar mobile Nutzer vom Dashboard. Genauer Inhalt nicht analysiert
- **`src/app/auth/`** – Ordner vorhanden, genaue Inhalte nicht vollständig geprüft
- **Landing-Page** (`/`, `/features`, `/preise`, `/agb`, `/impressum`, `/datenschutz`) – 14 Landing-Komponenten vorhanden, Vollständigkeit nicht bewertet

## Was wirkt noch unvollständig

- **Kein CI/CD**: Kein GitHub Actions Workflow vorhanden
- **Keine automatisierte Tests**: Kein Test-Runner konfiguriert (`package.json` hat kein `test`-Script)
- **`team.ts` Action**: Existiert, aber keine sichtbare UI dafür – mögliche Baustelle
- **Notifications / Benachrichtigungen**: Einstellungs-UI vorhanden, aber ob tatsächliche Notifications verschickt werden: **Unklar / prüfen**
- **Freigabe PIN-Schutz**: Einstellung vorhanden (`freigabe_pin_schutz`), ob das in `/freigabe/[token]` tatsächlich umgesetzt ist: **Unklar / prüfen**
- **`NeuesProduktModal.tsx`**: Existiert als Komponente – Anbindung unklar

## Bekannte offene TODOs / FIXMEs

Keine `// TODO` oder `// FIXME` Kommentare im Quellcode gefunden. CLAUDE.md zeigt `Offen: (nichts mehr offen)` – stand letzter Session.

## Erkennbare Risiken / Baustellen

- **`einstellungen`-Tabelle ohne Rows**: Wenn Migrations nicht ausgeführt wurden, schlagen `updateListItem` / `addListItem` lautlos fehl (wurde in Session 20 behoben durch Admin-Client + `maybeSingle()`)
- **Kein Typecheck-Script**: TypeScript wird nur beim Build geprüft, kein separates `tsc --noEmit` im `package.json`
- **`next.config.mjs` ist leer**: Keine Image-Domains, keine Security Headers, keine Rewrites konfiguriert
- **`.env.local` liegt im Repo-Root**: Falls versehentlich committed, wären Supabase-Keys exponiert (hoffentlich in `.gitignore`)
