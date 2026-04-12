# API Routes, Server Actions & Integrationen

## API Routes (`src/app/api/`)

### `/api/auth/callback` – GET
**Datei:** `src/app/api/auth/callback/route.ts`  
**Zweck:** Verarbeitet den Supabase OAuth/PKCE-Redirect nach erfolgreichem Login. Tauscht den Auth-Code gegen eine Session aus und leitet dann auf `/dashboard` weiter.

---

### `/api/projekte/[id]/export` – GET
**Datei:** `src/app/api/projekte/[id]/export/route.ts`  
**Zweck:** CSV-Export aller Produkte eines Projekts.  
**Details:**
- Liest MwSt.-Satz dynamisch aus `einstellungen`-Tabelle
- Exportiert: Raumname, Produktname, Kategorie, Menge, Einheit, VP netto, VP brutto
- Korrekte CSV-Escaping-Logik
- Response Header: `Content-Type: text/csv`, `Content-Disposition: attachment`
- Auth: Nutzt Server-Client (Auth via Cookie)

---

### `/api/scrape-product` – GET
**Datei:** `src/app/api/scrape-product/route.ts`  
**Zweck:** Scrapet eine Produkt-URL und extrahiert Produktname, Bild-URL und Preis.  
**Details:**
- Query-Parameter: `url=<produktseite>`
- Nutzt `cheerio` für HTML-Parsing
- Extrahiert: `og:title`, `og:image`, Preis-Meta-Tags
- Wird im Produkt-Formular genutzt, um Felder automatisch zu befüllen
- Kein Auth-Check erkennbar auf dieser Route – **Unklar / prüfen ob Missbrauch möglich**

---

## Server Actions (`src/app/actions/`)

Alle Mutations laufen ausschließlich über Server Actions (Next.js `'use server'`).

| Action-Datei | Hauptfunktionen |
|--------------|----------------|
| `kunden.ts` | `kundeAnlegen`, `kundeAktualisieren`, `kundeSoftDelete`, `kundeStatusAendern` |
| `projekte.ts` | `projektAnlegen`, `projektAktualisieren`, `projektSoftDelete`, `projektStatusAendern` |
| `raeume.ts` | `raumAnlegen`, `raumSoftDelete`, `updateRaumPositionen` |
| `produkte.ts` | `produktAnlegen`, `produktAktualisieren`, `produktSoftDelete`, `updateProduktPositionen`, `produktZuRaumZuweisen`, `produktInBibliothekAnlegen` |
| `freigabe.ts` | `produktStatusSetzen` (freigeben/ablehnen/überarbeitung), `kommentarSetzen` |
| `freigabe-token.ts` | `tokenGenerieren`, `tokenDeaktivieren` |
| `einstellungen.ts` | `getEinstellungen`, `getMwstSatz`, `saveAllgemein`, `addListItem`, `updateListItem`, `deleteListItem`, `checkKategorieUsage`, `saveBenachrichtigungen`, `saveFreigabeLinks` |
| `partner.ts` | `partnerAnlegen`, `partnerAktualisieren`, `partnerSoftDelete` |
| `notizen.ts` | `notizAnlegen`, `notizLoeschen`, `notizAktualisieren` |
| `dateien.ts` | `dateiLoeschen` (Upload läuft direkt in Storage, Delete über Action) |
| `logo-upload.ts` | `logoHochladen`, `logoLoeschen` für Kunden + Partner |
| `profil.ts` | `profilAktualisieren` |
| `team.ts` | **Unklar / prüfen** – keine UI gefunden |

### Gemeinsames Pattern der Actions

```typescript
'use server'
// 1. createClient() oder createAdminClient() initialisieren
// 2. Input validieren
// 3. Supabase-Operation ausführen
// 4. revalidatePath() für Cache-Invalidierung
// 5. State zurückgeben: { fehler: string } | null | { erfolg: string }
```

---

## Externe Integrationen

| Integration | Wie | Wo |
|-------------|-----|----|
| **Supabase** | `@supabase/ssr` + `@supabase/supabase-js` | Auth, DB, Storage |
| **Web-Scraping** | `cheerio` + fetch (serverseitig) | `/api/scrape-product` |
| **jspdf** | Client-seitig | PDF-Export in `PdfExportButton.tsx` |
| **@dnd-kit** | Client-seitig | Drag & Drop in `SortableRaumListe.tsx` + `SortableProduktTabelle.tsx` |
| **recharts** | Client-seitig | Charts in `DashboardCharts.tsx` |

---

## Datenfluss (typisches Beispiel: Produkt hinzufügen)

```
User → Formular (Client Component)
     → form action → Server Action `produktAnlegen()`
     → createClient() mit Cookie-Auth
     → supabase.from('produkte').insert(...)
     → supabase.from('produktstatus').insert(...)
     → revalidatePath('/dashboard/projekte/[id]/raeume/[raumId]')
     → Next.js invalidiert Cache → Seite neu gerendert
```

Kein direkter Client→Supabase-Schreibzugriff – alles über Server Actions.
