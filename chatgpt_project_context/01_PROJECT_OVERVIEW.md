# Projektübersicht

## Projektname

**WBC Studio** – interner Codename aus `package.json`: `wbc-studio-init` (der `-init`-Suffix ist ein historisches Artefakt des Projektstarts, die App heißt schlicht „WBC Studio" bzw. „Studio" laut Einstellungsstandard).

## Was macht die App?

WBC Studio ist ein **B2B-SaaS-Tool für Innenarchitektur- und Design-Studios**. Es ermöglicht Designern und Projektmanagern, ihre gesamte Projektarbeit digital zu verwalten: von der Kundenverwaltung über Projekte und Räume bis hin zur Produktauswahl, Kalkulation und Kundenfreigabe.

## Hauptziel

Innenarchitekten/Designer sollen Produkte für Kundenprojekte strukturiert erfassen, kalkulieren (EP → VP, Marge, Provision, MwSt.) und dem Kunden zur Freigabe vorlegen können – **ohne dass der Kunde interne Kalkulations­felder sieht**.

## Nutzerrollen (soweit erkennbar)

| Rolle | Zugang | Erkennbar aus |
|-------|--------|---------------|
| **Admin / Designer** | Volles Dashboard, alle Felder inkl. EP/Marge/Provision | `middleware.ts`, `DashboardLayout` |
| **Kunde** | Nur `/freigabe/[token]` – öffentliche Ansicht ohne interne Felder | `types.ts` (`FreigabeProdukt`), CLAUDE.md |

Es gibt keine sichtbare Rollenunterteilung zwischen mehreren Admin-Usern (kein Team-Konzept implementiert, `team.ts` Action existiert jedoch – Unklar / prüfen).

## Hauptbereiche der App

| Bereich | Beschreibung |
|---------|--------------|
| **Kunden** | Stammdaten, Status, Logo, Ansprechpartner |
| **Projekte** | Budget, Status, Räume, PDF/CSV-Export, Freigabelink |
| **Räume** | Räume innerhalb eines Projekts, sortierbar per Drag & Drop |
| **Produkte** | Pro Raum: EP, Marge, VP netto/brutto, Provision, Status, Freigabe |
| **Produktbibliothek** | Produkte ohne Raumzuweisung (`raum_id = NULL`), zuweis­bar zu Räumen |
| **Partner** | Lieferanten/Hersteller mit Provisions­modell |
| **Freigaben** | Übersicht aller Produkte mit Freigabe­status |
| **Kategorien** | Verwaltung von Produkt­kategorien, Raumtypen, Projektarten |
| **Einstellungen** | MwSt.-Satz, App-Name, Benachrichtigungen, Freigabe-Config |
| **Freigabe-Link** | Öffentliche, tokengesicherte Kunden­ansicht |

## Was ist gut aufgebaut

- Klare Datenhierarchie: Kunden → Projekte → Räume → Produkte
- Konsequentes Soft-Delete-Pattern über alle Tabellen
- Strikte Trennung interner vs. externer Produktfelder (im TypeScript-Typsystem verankert)
- Server Actions als einziger Mutations­kanal (kein direkter DB-Zugriff vom Client)
- Dynamischer MwSt.-Satz aus der DB (nicht hardcodiert)
- Responsive Kundenfreigabe-Ansicht (mobil optimiert)
- Drag & Drop für Räume und Produkte
