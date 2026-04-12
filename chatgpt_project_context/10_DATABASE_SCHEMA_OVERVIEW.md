# Datenbank Schema Übersicht

Abgeleitet aus `src/lib/supabase/types.ts` und den Migrations `001`–`019`.

## Tabellen-Übersicht

### `kunden`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | uuid PK | |
| `name` | text | Pflichtfeld |
| `ansprechpartner` | text \| null | |
| `email` | text \| null | |
| `telefon` | text \| null | |
| `adresse` | text \| null | Migration 001 |
| `notizen` | text \| null | |
| `status` | enum | `'aktiv' \| 'abgeschlossen' \| 'pausiert'` (Migration 009) |
| `logo_url` | text \| null | Supabase Storage URL (Migration 012) |
| `deleted_at` | timestamptz \| null | Soft Delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `projekte`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | uuid PK | |
| `kunde_id` | uuid FK → kunden | |
| `name` | text | |
| `beschreibung` | text \| null | |
| `standort` | text \| null | Migration 002 |
| `projektart` | text \| null | Aus Kategorien-Einstellung |
| `gesamtbudget` | numeric \| null | |
| `status` | enum | `'offen' \| 'in_bearbeitung' \| 'freigegeben' \| 'abgeschlossen'` |
| `deleted_at` | timestamptz \| null | Soft Delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `raeume`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | uuid PK | |
| `projekt_id` | uuid FK → projekte | |
| `name` | text | |
| `beschreibung` | text \| null | |
| `reihenfolge` | integer | Drag & Drop Sortierung (Migration 017) |
| `deleted_at` | timestamptz \| null | Soft Delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `produkte`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | uuid PK | |
| `raum_id` | uuid FK → raeume **\| null** | null = Produktbibliothek (Migration 011) |
| `partner_id` | uuid FK → partner \| null | |
| `name` | text | |
| `beschreibung` | text \| null | Migration 014 |
| `kategorie` | text \| null | Migration 003 |
| `menge` | numeric | Default: 1 |
| `einheit` | text | Default: 'Stk' |
| `einkaufspreis` | numeric \| null | **Intern – nie an Kunden** |
| `marge_prozent` | numeric \| null | **Intern** |
| `provision_prozent` | numeric \| null | **Intern** |
| `notizen_intern` | text \| null | **Intern** (Migration 015) |
| `verkaufspreis` | numeric \| null | Extern sichtbar |
| `bild_url` | text \| null | Extern sichtbar |
| `produkt_url` | text \| null | Link zum Produkt |
| `reihenfolge` | integer | Drag & Drop (Migration 018) |
| `deleted_at` | timestamptz \| null | Soft Delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `produktstatus`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | uuid PK | |
| `produkt_id` | uuid FK → produkte | |
| `status` | enum | `'ausstehend' \| 'freigegeben' \| 'abgelehnt' \| 'ueberarbeitung'` |
| `kommentar` | text \| null | Kommentar bei Ablehnung/Überarbeitung |
| `freigegeben_am` | timestamptz \| null | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

*Jedes Produkt hat genau einen `produktstatus`-Eintrag (1:1 Relation, obwohl technisch 1:n möglich).*

---

### `partner`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | uuid PK | |
| `name` | text | |
| `ansprechpartner` | text \| null | |
| `email` | text \| null | |
| `telefon` | text \| null | |
| `website` | text \| null | |
| `provisionsmodell` | enum \| null | `'Prozent' \| 'Fix' \| 'Individuell'` |
| `provisions_wert` | numeric \| null | |
| `einkaufskonditionen` | text \| null | |
| `notizen` | text \| null | |
| `logo_url` | text \| null | Migration 013 |
| `deleted_at` | timestamptz \| null | Soft Delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `freigabe_tokens`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | uuid PK | |
| `projekt_id` | uuid FK → projekte | |
| `token` | text UNIQUE | Zufälliger Token für Kunden-URL |
| `gueltig_bis` | timestamptz \| null | Optional: Ablaufdatum |
| `aktiv` | boolean | Nur 1 aktiver Token pro Projekt erwartet |
| `created_at` | timestamptz | |

---

### `einstellungen`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `schluessel` | text PK | Key (z. B. `'mwst_satz'`, `'produktkategorien'`) |
| `wert` | text NOT NULL | Value |
| `updated_at` | timestamptz | Default: `now()` |

Key-Value-Store für App-Konfiguration. Listen werden als komma­separierte Strings gespeichert, Icons als `Name|IconName`-Format.

**Bekannte Schlüssel:**
`app_name`, `mwst_satz`, `produktkategorien`, `raumtypen`, `projektarten`, `standardwaehrung`, `sprache`, `zeitzone`, `datumsformat`, `budget_warnschwelle`, `freigabe_ablaufzeit`, `freigabe_pin_schutz`, `freigabe_pin_laenge`, `freigabe_intro_text`, `freigabe_logo_zeigen`, `benach_neue_freigabe`, `benach_ablehnung`, `benach_taeglich`, `benach_email`

---

### Weitere Tabellen (aus Migrations erkennbar, nicht vollständig dokumentiert)

| Tabelle | Vermutet |
|---------|---------|
| `notizen` | Notizen pro Projekt (Migration 015) |
| `dateien` | Datei-Uploads pro Projekt (Migration 008) |

---

## Domänen-Hierarchie

```
kunden (1)
  └── projekte (n)
        ├── raeume (n)
        │     └── produkte (n)
        │           └── produktstatus (1)
        ├── freigabe_tokens (n, aber max. 1 aktiv)
        ├── notizen (n)
        └── dateien (n)

partner (1) ← produkte (n) [optional]
einstellungen (globaler Key-Value-Store)
```

## Preis-Logik (aus Code ableitbar)

```
VP netto    = EP netto + (EP netto × Marge%)
VP brutto   = VP netto × (1 + MwSt-Satz)    [MwSt aus einstellungen-Tabelle]
Provision   = VP netto × Provision%
Gesamt      = VP netto × Menge
```
