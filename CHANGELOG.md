# Änderungen

Alle wichtigen Änderungen an Wellbeing Spaces, chronologisch rückwärts.
Format: **YYYY-MM-DD** mit Stichpunkten in einfachem Deutsch.

## 2026-04-21

### Änderungs-Log (diese Seite)
- Neuer Tab **Änderungen** unter Einstellungen mit allen Updates chronologisch
- Badge „Neu" neben Einstellungen in der Sidebar, wenn seit deinem letzten Besuch etwas Neues hinzugekommen ist
- Beim Öffnen des Tabs verschwindet das Badge automatisch

### Raumplaner aufgeräumt
- Kurven-Tool entfernt (seltenes Feature, Wand-Tool reicht)
- Notizen-Tool entfernt (gehört in die Kommunikation, nicht auf den Grundriss)
- Formen-Tool (Rechteck/Kreis/Linie/Pfeil) entfernt
- Versionen + Vergleichs-Ansicht entfernt — Auto-Save reicht
- Legende-Autogen entfernt
- Bild-Import entfernt
- Kollisionserkennung entfernt
- Custom-Möbel-Editor entfernt (System-Möbel reichen)
- Tür-Varianten 6 → 3 (Standard L, Standard R, Schiebetür)
- Fenster-Varianten 6 → 2 (Standard, Bodentief)
- Raum-Templates 6 → 3 (Wohnzimmer, Schlafzimmer, Bad)
- Boden-Texturen 12 → 6
- Wandfarben 16 → 8
- Raumplaner-Editor von 5535 auf ~4180 Zeilen geschrumpft

### System
- Migration 071: Datenbank-Tabellen `raumplan_versionen` + `custom_moebel` gelöscht

## 2026-04-20

### Sicherheit
- Kunden-Portal-Tabellen sind jetzt mit Row-Level-Security geschützt (Cross-Tenant-Leak behoben)
- Soft-gelöschte Produkte können nicht mehr per Status/Reihenfolge/Datum bearbeitet werden
- Alle öffentlichen Routen (Freigabe, Einladung, Onboarding, Vertrag) prüfen Token vor Datenabruf

### Workflows & Shortcuts
- **Angebot → Vertrag** mit einem Klick: neuer Button in der Angebots-Liste
- **Konfigurator → Angebot** mit einem Klick: Button bei abgeschlossener Konfigurator-Session
- **Onboarding → Kunde + Projekt** mit einem Klick: legt Kunde, Projekt und Räume automatisch an

### E-Mails
- Automatische Kunden-Mail bei Angebot-Versand (Status = „gesendet")
- Automatische Kunden-Mail bei Vertrag zur Unterschrift
- Einheitliches Mail-Design mit Firmen-Farbe und -Name

### Datenmodell
- Kategorie-Chaos bei Produkten gelöst (Sync-Trigger in der DB hält Text + ID automatisch konsistent)
- Kommunikation kann jetzt raumspezifisch geführt werden (DB-Spalte vorbereitet)
- Vor-/Nachname werden zuverlässig in allen Auth-Hooks gesynct

### Bedienbarkeit
- Alle wichtigen Dialoge (Bestätigung, Produkt-Zuweisen, Produkt-Hinzufügen) sind tastaturfreundlich: ESC schließt, TAB bleibt im Dialog, Screen-Reader-tauglich
