# Änderungen

Alle wichtigen Änderungen an Wellbeing Spaces, chronologisch rückwärts.
Format: **YYYY-MM-DD** mit Stichpunkten in einfachem Deutsch.

## 2026-04-23

### Standard-Daten auf Knopfdruck für neue Firmen
- Neu angelegte Firmen haben einen Banner auf der Kategorien-Seite mit „Standard-Daten jetzt laden" — ein Klick legt die Standard-Kategorien (12 Produktkategorien, 8 Projektarten, 13 Raumtypen), 3 Vertragsvorlagen und 6 Onboarding-Vorlagen an. Behebt das Problem, dass Firmen, die per SQL im Supabase-Dashboard angelegt werden, keine Standard-Daten mitbekommen.
- Dashboard-Block „Letzte Projekte": Leer-Zustand sieht nicht mehr zusammengequetscht aus — Icon + größere Textfläche + CTA „Projekt anlegen →".

### Freigabe-System komplett neu gebaut
- **Granularere Freigabe-Links**: Beim Erstellen wählst du jetzt den Umfang — „Gesamtes Projekt", „Einzelner Raum" oder „Kuratierte Auswahl" (handverlesene Produkte). Der Kunde sieht dann auch nur genau diese Auswahl, keine anderen Räume.
- **Pflicht-Abschluss**: Sobald der Kunde alle Positionen entschieden hat (freigegeben / abgelehnt / Alternative), erscheint unten ein prominenter „Freigabe abschließen"-Button. Dialog fragt nach Name + optionalem Kommentar + Bestätigungs-Haken. Erst nach Abschluss gilt die Freigabe als final.
- **Automatische Admin-Benachrichtigung**: Nach Abschluss landet eine Mail in deinem Postfach mit Kundennamen, Zusammenfassung (X freigegeben, Y abgelehnt) und optionalem Kommentar des Kunden. Außerdem wird ein Timeline-Event im Projekt angelegt.
- **Freigabe-Verlauf pro Projekt**: Neuer Block auf der Projektdetailseite zeigt alle jemals erstellten Links (Offen / Abgeschlossen / Zurückgezogen / Abgelaufen) mit Scope-Icon und Abschluss-Info. Per „Verlauf →"-Klick öffnet sich ein Seitenpanel mit der kompletten History (wer hat wann was freigegeben, inklusive Portal-vs-Link-Unterscheidung).
- **Auto-Invalidierung bei Produkt-Änderungen**: Wenn du Preis, Menge, Beschreibung oder Bild eines bereits freigegebenen Produkts änderst, wird die Freigabe automatisch auf „Ausstehend" zurückgesetzt — mit Kommentar „Automatisch zurückgesetzt: X geändert am TT.MM.JJJJ". Fair & transparent gegenüber dem Kunden.
- **Duplikat-Schutz**: Pro Projekt kann es nur einen offenen Projekt-weiten Freigabe-Link gleichzeitig geben. Wenn du versuchst, einen zweiten zu erstellen, bekommst du den Hinweis „Bestehenden Link verwenden oder zuerst zurückziehen".
- **Einheitliche Datenquelle**: Portal-Freigaben und Token-Freigaben schreiben ab sofort alle auf dieselbe Tabelle (`raum_produkte`). Kein Auseinanderdriften mehr zwischen „Portal sagt freigegeben, Link sagt offen".
- **Read-Only-Bestätigung**: Nach Abschluss zeigt der Freigabe-Link nur noch eine Bestätigungsseite („Danke, deine Freigabe ist bei uns eingegangen"). Kein versehentliches Weiter-Klicken mehr möglich.
- Migrationen 078/079/080/081 manuell in Supabase ausführen.

## 2026-04-21

### Onboarding-Dashboard komplett neu gestaltet
- Oben ein Hero-Band in Wellbeing-Grün mit 4 Kennzahl-Kacheln (Gesamt · Offen · Ausgefüllt · Abgeschlossen) — auf einen Blick sichtbar, wie viele Anfragen in welchem Zustand sind
- Filter-Tabs direkt darunter (Alle · Offen · Ausgefüllt · Abgeschlossen · Abgelehnt) mit Zähler-Badges
- Jede Anfrage in der Liste bekommt ein farbiges Typ-Icon (Neukunde amber · Projekt blau · Universal grau), den Vorlagen-Namen als Badge und den Status-Badge rechts — klarere Hierarchie statt nüchterner Zeilen
- Beim „Neuer Link"-Modal sieht man jetzt pro Vorlage Icon + Typ-Badge; wenn eine Projekt-Vorlage gewählt wird, erscheint ein optionales Kunden-Dropdown. Wird ein Kunde verknüpft, füllt sich das Formular mit seinen Kontaktdaten — der Kunde muss sie nicht nochmal eintippen
- 3 neue Standard-Vorlagen kommen automatisch mit (Kontaktanfrage / Projekt-Briefing bestehender Kunde / Raum-Bestandsaufnahme), 6 insgesamt

### Onboarding-Formular: „Anfrage absenden" funktioniert wieder
- Unterstützt jetzt alle Fragen-Typen, die in der Vorlagen-Verwaltung angelegt werden können: E-Mail, Telefon, URL, Ja/Nein, Bewertung (1–5 Sterne), Skala/Slider (1–10), Datum, Text, Zahl, Auswahl, Mehrfachauswahl
- Komplexere Typen (Upload, Inventar, Prioritäten, Budget-Verteilung …) bekommen einen Freitext-Fallback mit Hilfetext, damit der Kunde antworten kann
- Fehlende Pflichtfelder scrollen jetzt automatisch ins Bild, mit Fehlermeldung oben — vorher hat der Absenden-Button unsichtbar stumm abgebrochen, wenn ein nicht gerenderter Pflichtfeld-Typ leer war
- Hilfetexte (`beschreibung`) werden unter dem Label angezeigt

### Timeline-Redesign — Auto-Sync, Gantt-Upgrade, Raum-Integration (Phase 3–7)
- **Event-Modal neu**: Mehrfach-Checkboxen „Hängt ab von" (Abhängigkeiten zu anderen Events), Toggle „Für Kunde im Portal sichtbar", Auto-Event-Badge mit Hinweis „Wird aus Quelle synchronisiert"
- **Gantt mit Abhängigkeits-Pfeilen**: Bézier-Kurven zwischen verknüpften Events; bei Konflikt (Kind startet vor Parent-Ende) rot gestrichelt mit Warn-Pfeilspitze
- **Drag & Drop**: Balken lassen sich per Maus verschieben — Dauer bleibt erhalten, Tages-Snapping; Auto-Events sind drag-gesperrt (mit ⚡-Icon & gestrichelter Kontur)
- **„Abhängige mitverschieben"**-Toggle: bei aktivem Kaskaden-Mode folgen alle (auch transitiv) abhängigen Events um denselben Offset
- **Raum-Filter** oben in der Timeline (Chip-Row): „Alle · Projekt-Ebene · {Räume}", per URL (`?raum=…`) tief verlinkbar
- **Event hinzufügen direkt vom Raum**: neuer Button auf der Raum-Detailseite, Event wird automatisch dem Raum zugeordnet und erscheint in beiden Timelines
- **Dashboard-Widget „Anstehende Deadlines"** zeigt jetzt nicht nur Projekt-Deadlines, sondern auch Timeline-Events innerhalb ihrer individuellen Erinnerungsfrist (`erinnerung_tage` pro Event, Default 7 Tage) — Icon je Event-Typ
- **Portal-Filter**: Events mit `kunde_sichtbar=false` werden dem Kunden im Portal nicht mehr angezeigt (interne Bestell-/Angebot-Events bleiben intern)

### Bug-Fix: Landingpage — Icon-Bubble bei Features zentriert
- Auf Desktop saß der rosa Glow-Kreis unter/neben dem Icon statt dahinter — sah aus wie ein Anzeigefehler
- Ursache: die Scale-Animation von Framer Motion hat die Zentrier-Verschiebung überschrieben
- Jetzt liegt der Glow perfekt hinter dem Icon — beide über einen statischen Positionier-Wrapper zentriert

### Bug-Fix: Kunden-Nachrichten kamen nicht im Admin an
- Nachrichten aus dem Kundenportal waren für den Admin unsichtbar, weil der Datensatz keine Organisation-ID bekommen hat (seit RLS-Umstellung in Migration 068)
- Neue Nachrichten werden ab sofort mit der richtigen Organisation verknüpft
- Migration 074 trägt die Organisation für alle bestehenden Portal-Nachrichten nach

### Portal-Design etwas kompakter
- Hero-Bänder auf allen Portal-Seiten kleiner (ca. 60% der vorherigen Höhe)
- Headlines kleiner (clamp 22–38px statt 32–56/64px)
- Projekt-Cards mit schlankerem Farb-Header (h-16 statt h-24)
- Stats-Zahlen 28px statt 36px — Fokus auf Inhalt statt Ornament

### Portal-Team & Einstellungen im neuen Stil
- Beide Seiten bekommen den gleichen **Hero-Band-Look** wie Dashboard und Projektdetail
- Großes Icon-Badge rechts im Hero, konsistente Typografie
- Breites Desktop-Layout (max-w-1400)

### Portal-Projektseite radikal neu
- **Hero-Band oben** mit Gradient-Fill in deiner Brand-Farbe — darin Titel, Standort und rechts ein **großer Progress-Ring mit Prozent + Produkt- und Freigabe-Zahlen**
- **Breadcrumb als Pill-Button** („Zurück zur Übersicht")
- **Tab-Leiste moderner**: Border-bottom-Linie, aktiver Tab mit farbigem Indicator darunter statt grauer Kasten
- Freigabe-Banner als eigene Brand-farbene Card mit „Alle freigeben"-Button rechts
- **Bessere Empty-States** überall (Freigaben/Dokumente/Timeline) — mit Brand-Icon, Titel und Erklär-Text statt grauem Icon-Stub

### Portal-Dashboard radikal neu
- Kompletter Neu-Aufbau mit **Bento-Grid-Layout** statt klassischer Vertical-Stack
- **Großer Farb-Hero** mit Gradient in deiner Brand-Farbe (oder Hero-Bild), darunter kleine Badge mit heutigem Datum
- Stats rechts als **vertikale Kompakt-Kacheln** mit Icon-Badge, klickbar, Sub-Text zeigt nächste Aktion
- Projekte jetzt als **farbige Karten mit Gradient-Header und großem Progress-Ring** (statt flacher Liste)
- Aktivität als echte **Timeline** mit Punkten und Linie statt simpler Liste
- Quick-Actions mit Hover-Glow
- Breites Desktop-Layout bis 1400px

### Kundenportal aufgefrischt & 2 Bugs gefixt
- **Bug**: Im Portal konnte der Kunde keine Nachricht senden — das Textfeld wurde vor dem Absenden geleert. Behoben.
- **Bug**: Die „Neue Nachrichten"-Kachel auf dem Portal-Dashboard war nicht klickbar. Jetzt führt sie direkt zum Chat des relevanten Projekts.
- **Dashboard-Politur**: größerer Hero mit Mesh-Gradient, Stats-Kacheln jetzt klickbar und farblich akzentuiert, Projekt-Cards mit **Mini-Progress-Ring** und klarerer Meta-Info, breiteres Desktop-Layout (max-w-6xl).
- **Chat im Projekt**: Größeres Chat-Fenster (480px hoch statt 384px), Auto-Scroll zum Ende bei neuer Nachricht, überarbeiteter Leer-Zustand mit Brand-Farbe und freundlichem Hinweistext.

### Admin-Chat mit Portal-Kunden
- Neuer Menüpunkt **„Chats"** in der Sidebar mit **Badge** für ungelesene Nachrichten
- **Chat-Block direkt auf der Projekt-Detailseite** — solange der Kunde Portal-Zugang hat
- Beide Ansichten rendern denselben Chat — Nachrichten aktualisieren sich automatisch alle 10 Sekunden (Polling pausiert wenn der Tab nicht aktiv ist)
- Admin-Nachrichten rechts (wellbeing-green), Kunden-Nachrichten links — Auto-Scroll zum Ende, Enter = senden, Shift+Enter = Zeilenumbruch
- Öffnen des Chats markiert Kunden-Nachrichten automatisch als gelesen → Badge verschwindet
- **Chats-Übersichtsseite** sortiert Projekte nach letzter Aktivität mit Preview der letzten Nachricht

### Kategorien: Altlasten raus
- Alte Default-Einträge die nicht mehr ins neue Schema passen werden entfernt:
  - **Raumtypen**: Studio, Wellness, Hotel, Privat, Wohnung, Sonstiges (das sind Projektarten, keine Räume)
  - **Projektarten**: Neubau, Renovation, Konzept, Beratung, Umbau, Sonstiges (das sind Projekt-Phasen, keine Kundentypen)
- Nur exakte Namenstreffer werden gelöscht — selbst angelegte oder umbenannte Kategorien bleiben
- Verknüpfte Projekte/Räume bleiben erhalten, nur die Kategorie-Zuordnung wird leer

### Landingpage-Politur
- Features-Bug gefixt: Icon-Bubble war optisch versetzt (asymmetrischer Blob) → jetzt **weicher radialer Glow**, Icon perfekt zentriert
- Hero deutlich moderner: größerer **Mesh-Gradient-Background**, Headline „Deine Kunden" mit **animiertem Gradient + Highlight**
- Neue **Stats-Zeile unter den CTAs**: „3× schneller planen · 100% Freigaben online · 0 Excel-Tabellen"
- **Scroll-Cue** unten mittig (dezent, mit Pfeil-Animation)
- CTA-Button bekommt bei Hover einen subtilen Lichteffekt

### Kategorien neu strukturiert
- **Projektarten** sind jetzt **Kontext des Kunden** (Hotel, Büro, Privat, Praxis, Gastronomie, Wellness, Gewerbe, Einzelhandel)
- **Raumtypen** sind jetzt **einzelne Räume** (Küche, Bad, Wohnzimmer, Schlafzimmer, WC, Flur, Büro, Empfang etc.)
- Reihenfolge auf der Kategorien-Seite getauscht: Projektarten stehen jetzt vor Raumtypen
- Neue Default-Werte werden automatisch in deine Organisation eingefügt — deine bereits angelegten Einträge bleiben erhalten
- Beschreibungen + Platzhalter in der Kategorien-Verwaltung überarbeitet

### Bug gefixt: Tippen im Kunde-Löschen-Dialog
- Beim Eintippen des Bestätigungs-Namens sprang der Fokus nach dem ersten Buchstaben auf das X weg → Eingabe abgebrochen
- Ursache lag im Modal-Hook (Auto-Focus lief bei jedem Re-Render neu)
- Jetzt landet der Cursor direkt im Textfeld und bleibt dort beim Tippen

### Änderungen-Tab aufgeräumt
- Pro Datum jetzt **einklappbare Blöcke** — nur neuester ist automatisch offen
- Pro Block steht dahinter wie viele Einträge drin sind
- Fehlende Leerzeichen nach fett-Texten gefixt (z.B. „Nur Admins sehen…")
- **Fett-Text** funktioniert jetzt auch mittendrin im Satz, nicht nur am Zeilenanfang

### Produktanlegen: Bibliothek zuerst
- „Neues Produkt"-Popup zeigt jetzt **„Zur Produktbibliothek"** an erster Stelle (grün hervorgehoben)
- „Zu einem Projekt hinzufügen" rutscht auf Platz 2

### Kunde löschen jetzt sicher
- Beim Löschen siehst du auf einen Blick **was alles dranhängt** (Projekte, Räume, Produkte, Angebote, Verträge, Notizen, Nachrichten, Portal-Zugänge)
- Warnung wenn aktive Angebote/Verträge existieren
- **Kunden-Name muss exakt eingetippt werden** — schützt vor versehentlichen Klicks
- **Nur Admins** sehen den Löschen-Button überhaupt
- Neuer **„Archiv"**-Link (nur für Admins): zeigt gelöschte Kunden, Wiederherstellen mit 1 Klick — 30 Tage lang möglich

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
