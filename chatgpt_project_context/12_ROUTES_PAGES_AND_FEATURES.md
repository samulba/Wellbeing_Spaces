# Routen, Seiten & Features

## Öffentliche Routen (kein Auth)

| Route | Datei | Inhalt |
|-------|-------|--------|
| `/` | `src/app/page.tsx` | Landing Page mit 14 Sektionen (Hero, Features, Pricing, etc.) |
| `/login` | `src/app/login/page.tsx` | Login-Formular (Supabase Auth, Syne-Font, Icon-Inputs, Loader) |
| `/features` | `src/app/features/page.tsx` | Marketing-Seite Features |
| `/preise` | `src/app/preise/page.tsx` | Pricing-Seite mit Calculator |
| `/agb` | `src/app/agb/page.tsx` | AGB |
| `/datenschutz` | `src/app/datenschutz/page.tsx` | Datenschutzerklärung |
| `/impressum` | `src/app/impressum/page.tsx` | Impressum |
| `/freigabe/[token]` | `src/app/freigabe/[token]/page.tsx` | **Öffentliche Kunden-Freigabeansicht** (token-gesichert, mobil-optimiert) |

---

## Dashboard (auth-geschützt)

Alle `/dashboard/**`-Routen sind durch Middleware + Layout-Guard geschützt.

### Dashboard-Home

| Route | Datei | Features |
|-------|-------|---------|
| `/dashboard` | `src/app/dashboard/page.tsx` | KPI-Karten, recharts-Charts (Budget vs. Ist, Freigabe-Donut, Aktivitäts-Liniendiagramm) |

---

### Kunden

| Route | Features |
|-------|---------|
| `/dashboard/kunden` | Kunden-Grid mit Status-Badges, Suchfunktion (Unklar / prüfen ob Search implementiert) |
| `/dashboard/kunden/neu` | Kunden-Formular: Name, Ansprechpartner, Email, Telefon, Adresse, Status |
| `/dashboard/kunden/[id]` | Kundendetail: Stammdaten, Logo, verknüpfte Projekte |
| `/dashboard/kunden/[id]/bearbeiten` | Kunden-Formular (Edit-Modus) mit Logo-Upload |

---

### Partner

| Route | Features |
|-------|---------|
| `/dashboard/partner` | Partner-Grid |
| `/dashboard/partner/neu` | Partner-Formular: Name, Provisions­modell, Einkaufskonditionen |
| `/dashboard/partner/[id]` | Partner-Detail mit Logo, Produktliste (Unklar / prüfen) |
| `/dashboard/partner/[id]/bearbeiten` | Partner-Formular (Edit) mit Logo-Upload |

---

### Produkte (Bibliothek)

| Route | Features |
|-------|---------|
| `/dashboard/produkte` | Produktbibliothek: Produkte ohne Raum (`raum_id = NULL`), Grid + Tabellen-View, "Zu Raum zuweisen"-Modal |
| `/dashboard/produkte/neu` | Produkt-Formular für Bibliothek (kein Raum) |
| `/dashboard/produkte/bibliothek/neu` | Alternative Route für Bibliotheks-Produkt-Anlage |

---

### Projekte

| Route | Features |
|-------|---------|
| `/dashboard/projekte` | Projekte-Grid mit Status, Budget-Anzeige |
| `/dashboard/projekte/neu` | Projekt-Formular: Name, Kunde, Budget, Projektart, Standort |
| `/dashboard/projekte/[id]` | **Zentrale Projektseite**: Stats (Kosten, Status-Counts), Räume-Liste (Drag & Drop), Freigabe-Link-Karte, Dateien-Upload, Notizen, PDF-Export, CSV-Export |
| `/dashboard/projekte/[id]/bearbeiten` | Projekt-Formular (Edit) |

---

### Räume & Produkte (tiefste Hierarchie)

| Route | Features |
|-------|---------|
| `/dashboard/projekte/[id]/raeume/[raumId]` | Raumdetail: Produkt-Tabelle mit Drag & Drop, Filter (Kategorie/Status/Sort), Summenzeile (EP/Provision/VP netto/brutto), "Produkt hinzufügen" |
| `/dashboard/projekte/[id]/raeume/[raumId]/produkte/neu` | Produkt-Formular mit Vollfeldern inkl. interner Felder |
| `/dashboard/projekte/[id]/raeume/[raumId]/produkte/[produktId]/bearbeiten` | Produkt bearbeiten |

---

### Weitere Dashboard-Bereiche

| Route | Features |
|-------|---------|
| `/dashboard/freigaben` | Alle Produkte aller Projekte nach Status; Tabs (Offen/Freigegeben/Abgelehnt/Überarbeitung/Alle); Chart-Switcher (Balken/Liste); Gruppen/Flachliste-View; Sticky Header |
| `/dashboard/kategorien` | Produktkategorien, Raumtypen, Projektarten verwalten mit Icon-Picker |
| `/dashboard/einstellungen` | App-Name, MwSt., Währung, Sprache, Zeitzone, Benachrichtigungen, Freigabe-Optionen |
| `/dashboard/profil` | Benutzerprofil bearbeiten |

---

## API-Routen

| Route | Methode | Funktion |
|-------|---------|---------|
| `/api/auth/callback` | GET | Supabase OAuth/PKCE Callback |
| `/api/projekte/[id]/export` | GET | CSV-Export aller Raum-Produkte eines Projekts |
| `/api/scrape-product` | GET | Web-Scraping: Produktname/Bild/Preis aus URL extrahieren |
