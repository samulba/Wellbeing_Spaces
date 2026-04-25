# Änderungen

Alle wichtigen Änderungen an Wellbeing Spaces, chronologisch rückwärts.
Format: **YYYY-MM-DD** mit Stichpunkten in einfachem Deutsch.

## 2026-04-25

### Dashboard: „Laufende Projekte"-Zähler korrekt
- KPI-Kachel **„Laufende Projekte"** zählt jetzt auch Projekte mit Status „Warten auf Kunde" — ein Projekt das auf eine Kundenfreigabe wartet ist immer noch ein laufendes Projekt, nicht abgeschlossen.
- Gleiche Logik bei „Nächste Deadlines" und „Budget-Übersicht": alles außer „Abgeschlossen" und Archiviert wird angezeigt.

### Onboarding-Übersicht: klar erkennen, auf wen man wartet
- Bei **noch nicht eingereichten Links** stand bisher nur „Noch nicht ausgefüllt" — jetzt zeigt jede Zeile:
  - den **verknüpften Kunden** (falls einer angegeben wurde) statt anonym, plus Badge „Wartet auf Antwort"
  - die **Vorlage**, mit der der Link erstellt wurde
  - **wie lange er schon offen ist** („vor 3 Tg." statt nur Erstellungsdatum)
- Neuer Status **„In Bearbeitung"** mit Fortschritts-Anzeige (z. B. „Begonnen · 45 %"), wenn der Kunde das Formular angefangen, aber noch nicht abgeschickt hat.
- Status-Badges erweitert: „Eingereicht" / „In Bearbeitung" / „Wartet auf Kunde" / „Wartet auf Eintrag" / „Abgeschlossen" / „Abgelehnt" — eindeutig welche Aktion als nächstes nötig ist.
- Detail-Panel zeigt im Wartemodus eine kompakte Status-Karte mit Adressat, Vorlage, Erstellungs-Zeitpunkt und Fortschritt — plus Tipp, dass man den Link unten kopieren und versenden kann.
- Logik-Fix: Wenn ein Onboarding-Link mit verknüpftem Kunden erstellt wurde, wurden die Kontaktdaten vorausgefüllt — die Übersicht zeigte den Eintrag dadurch fälschlich als „ausgefüllt". Wir prüfen jetzt zuverlässig auf tatsächlich eingereichte Antworten.

### Partner: Umsatz nur noch aus tatsächlichen Bestellungen + Adress-Feld
- **Partner-Detailseite** zeigt jetzt **„Bestellter Umsatz"** statt „Gesamtumsatz" — gezählt werden nur Produkte, die einem Raum/Projekt zugeordnet **und** auf Status „bestellt" / „geliefert" / „Rechnung erhalten" gesetzt wurden. Reine Bibliotheks-Produkte (ohne Bestellung) zählen nicht mehr mit.
- **Adress-Feld** für Partner: einfaches mehrzeiliges Textfeld im Partner-Formular, wird in der Kontakt-Karte mit Pin-Icon angezeigt.
- Migration 086 nötig (`ALTER TABLE partner ADD COLUMN adresse TEXT`).

## 2026-04-24

### Kunden-Portal: Willkommens-Tour beim ersten Login
- **Drei-Schritt-Intro** erscheint einmalig beim ersten Besuch des Portal-Dashboards: „Willkommen bei {Firma}" → „Produkte freigeben" → „Direkter Chat statt E-Mail-Ping-Pong".
- Nutzt die Firmen-**Akzentfarbe** aus dem Branding, optional wird der Welcome-Text aus den Branding-Einstellungen übernommen.
- Fortschritts-Dots, Vor/Zurück-Navigation, „Los geht's!"-CTA am Ende.
- **LocalStorage-Flag** (`portal-welcome-seen-v1`) verhindert erneute Anzeige — Kunde muss nicht mehr weg-klicken bei jedem Login.
- Kann jederzeit mit dem X-Button oder durch Klick auf den Hintergrund geschlossen werden.

### Freigaben-Dashboard: Bulk-Aktionen + Mobile-Card-Zeilen
- **Checkboxen pro Produkt-Zeile** — mit einem Klick mehrere Produkte markieren.
- **Gruppen-Header** hat eine Indeterminate-Checkbox, die alle Produkte des Projekts gleichzeitig markiert oder demarkiert.
- **Floating Action-Bar** unten erscheint sobald mindestens ein Produkt markiert ist: „N ausgewählt · Freigeben · Ablehnen · Überarbeiten · Zurücksetzen · Alle sichtbaren · X". Sammel-Aktion betrifft alle markierten Produkte gleichzeitig.
- Alle Bulk-Änderungen werden ins Audit-Log geschrieben (Kanal „admin").
- **Neue Server-Action** `freigabeBulkStatusAendernAdmin(ids, status)` macht ein einziges Batch-Update statt N Einzel-Requests.
- **Produkt-Zeilen mobil-freundlich**: auf schmalen Screens sind Name/Datum/Raum/Status/VP/Actions sauber in Zeilen gestapelt statt in einer überladenen Horizontal-Zeile. Hover-Actions sind auf Mobile immer sichtbar (nicht mehr nur on-hover).
- Keine Migration nötig.

### Freigaben-Dashboard: kompletter Rework
- **Kompakter Hero** mit einer einzigen farbigen Progress-Bar, die die Verteilung aller Produkte über alle Projekte zeigt (grün/amber/rot/violett). Ein Blick genügt.
- **Status-Chips als Filter**: vier farbige Chips oben (• 4 Freigegeben, • 34 Ausstehend …), klickbar zum Umschalten. Ein zusätzlicher „Alle"-Chip rechts.
- **Action-Bar** mit Volltext-Suche (Produkt, Raum, Projekt, Kategorie) + Projekt-Filter-Dropdown + View-Toggle rechts (Gruppen / Tabelle / Balken).
- **Gruppen-View komplett neu**: aufklappbare Projekt-Karten mit Mini-Progress-Bar pro Projekt, VP-Summe, offen-Badge, Zum-Projekt-Link. Klick auf den Header klappt die Liste ein/aus.
- **Produkt-Zeilen dichter** (32px-Thumbnails statt 40px), neue Status-Pill mit Farb-Dot, VP-Preis in der Zeile, **Inline-Hover-Actions**: Zurücksetzen + Zum Projekt ohne Modal öffnen zu müssen.
- **Tabelle-View**: reine Flachliste mit Projekt-Info in jeder Zeile — ideal für CSV-ähnliche Übersicht.
- **Balken-View**: horizontales gestapeltes Balken-Diagramm pro Projekt mit Statistik-Tooltip.
- Wenn alle offenen Freigaben erledigt sind: Empty-State mit grünem Check und „Alle Freigaben erledigt!".
- Keine Migration nötig.

### PDFs: Firmenangaben aus Einstellungen nutzen
- **Angebots- und Vertrags-PDFs** rendern jetzt automatisch die Firmen-Stammdaten aus den Einstellungen → Rechtliches: Rechtsform, Handelsregister-Nr., Registergericht, Geschäftsführer, USt-IdNr., Steuernummer. Erscheinen als kleiner Legal-Footer am Seitenende.
- **Angebots-PDFs** zeigen zusätzlich **Bankdaten** (Bank-Name, IBAN, BIC) im Footer — sofort rechnungsfähige Angebots-PDFs.
- **USt-IdNr.** erscheint zusätzlich im Header rechts unter den Kontaktdaten (Pflicht auf Rechnungen).
- Fehlende Felder werden sauber ausgelassen — kein „null"-Text im PDF.
- Keine Migration nötig, Daten kommen aus den Einstellungen → Firma/Rechtliches, die du bereits pflegen kannst.

### Projekt-Status: automatischer Vorwärts-Fortschritt
- **Der Projekt-Status (Aktiv / Warten auf Kunde / Abgeschlossen) aktualisiert sich jetzt von selbst**, wenn entsprechende Events eintreten:
  - Beim ersten erstellten **Freigabe-Link** springt ein Projekt automatisch von „Aktiv" auf „Warten auf Kunde".
  - Wenn der Kunde die Freigabe abschließt und dadurch **alle Produkte des Projekts** freigegeben sind, springt „Warten auf Kunde" automatisch auf „Abgeschlossen".
- **Manuelle Override-Regel**: Der Automatismus greift nur vorwärts und nur vom erwarteten Ausgangs-Status. Wenn du den Status manuell setzt (z. B. „Abgeschlossen" bevor alle Freigaben da sind), springt das System nicht mehr zurück.
- Die 3 Status-Buttons im Projekt-Header bleiben — du kannst sie jederzeit manuell setzen. Bei normalem Workflow musst du sie aber kaum noch anfassen.
- Keine Migration nötig.

### Projekt-Detail: Header-Refresh + Übersicht-Dashboard + Audit-Timeline
- **Neuer Hero-Header**: Titel, Status-Toggle (Aktiv/Warten/Abgeschlossen) und Deadline-Countdown in einer Zeile. Darunter eine kompakte Meta-Leiste mit Icons (👤 Kunde · 📍 Standort · 💰 Budget · 🏷 Projektart · 📅 Angelegt) statt der alten Pill-Karten. Toolbar rechts: Verträge + Angebote als Text-Buttons, dahinter kleine Icon-Buttons für Timeline/CSV/PDF/Bearbeiten + ⋮-Menü. Kein graustufiger Strip mehr — alles in einem sauberen weißen Header.
- **Übersicht neu: Dashboard-Karte** mit Ring, Progress-Bars (Produkt-Kosten, Service-Kosten, Gesamt) inkl. 80%-Warn-Marker und Überschreitungs-Anzeige in Euro. Status-Kacheln (Freigegeben/Ausstehend/Räume/Produkte) sind jetzt als 4-Feld-Strip direkt an der Budget-Karte dran — keine fetten leeren Flächen mehr.
- **Übersicht bekommt Budget-pro-Raum-Widget** mit Kategorie-Breakdown — das lebt jetzt hier statt doppelt im Räume-Tab.
- **Räume-Tab entschlackt**: nur noch die sortierbare Raum-Liste (mit Budget-Progressbar pro Raum). Das Budget-pro-Raum-Grid ist aus dem Tab raus und liegt nur noch einmal auf der Übersicht — kein doppeltes Budget-Anzeigen mehr.
- **Freigabe-Verlauf**: der Audit-Drawer zeigt jetzt nicht mehr nur Produkt-Entscheidungen, sondern auch **Lifecycle-Events**: Link erstellt, abgeschlossen, zurückgezogen, abgelaufen — chronologisch gemerged. Dadurch ist der Verlauf auch VOR der ersten Kunden-Entscheidung befüllt.

### Projekt-Detail: Tab-Navigation statt 2-Spalten-Chaos
- Die Projekt-Detailseite war sehr dicht gepackt — links Räume/Budget/Freigabe untereinander, rechts Budget-Ring/Status/Timeline/Dateien/Chat/Notizen in einem einzigen Scroll-Strang. Jetzt klar strukturiert über **7 Tabs** mit Icons und Badge-Counts: **Übersicht** (Default), **Räume**, **Freigaben**, **Timeline**, **Dateien**, **Chat** (nur wenn Portal aktiv), **Notizen**.
- **Übersicht** zeigt die wichtigsten Kennzahlen kompakt: Budget-Ring + 4 Status-Kacheln (Freigegeben/Ausstehend/Räume/Produkte), darunter Räume-Kurzliste und Mini-Timeline nebeneinander. Zeiterfassung erscheint bei Stundensatz-Projekten direkt darunter.
- **Räume** bekommt jetzt die volle Breite für SortableRaumListe + Budget-pro-Raum-Grid.
- **Freigaben** konzentriert FreigabeLinkKarte + FreigabeUebersicht auf einer Seite, ohne Ablenkung.
- **Timeline** zeigt alle Events in voller Breite mit direktem Sprung zum Gantt-Editor.
- Alle Funktionen, Actions und Daten bleiben 1:1 erhalten — nur Layout geändert. URL `?tab=raeume` usw. ist bookmarkbar.

### Onboarding: Standard-Vorlagen laden
- **6 vorgefertigte Onboarding-Vorlagen** können jetzt auf Knopfdruck geladen werden, wenn die Liste noch leer ist — analog zum Vertrags-Vorlagen-System. Im Empty-State erscheint ein großer Sparkles-Button „Standard-Vorlagen laden".
- Die Vorlagen decken die typischen Szenarien ab: **Kontaktanfrage** (kurzes Formular für Erstkontakte), **Neukunden-Onboarding Standard** (Erstgespräch für neue Kunden), **Projekt-Briefing bestehender Kunde** (schnelles Briefing ohne Kontaktfragen), **Projekt-Privat** (detailliertes Wohnprojekt), **Projekt-Gewerbe** (umfassend für Gewerbe) und **Raum-Bestandsaufnahme** (pro Raum, vor Vor-Ort-Termin).
- Nach dem Laden können alle Vorlagen beliebig angepasst, dupliziert oder gelöscht werden. „Leere Vorlage erstellen" bleibt als Alternative daneben.

### Dashboard: 100vh-Layout + Budget & Projekte nebeneinander
- **Auf Laptop/PC (≥ 1280px) füllt das Dashboard jetzt exakt die volle Viewport-Höhe** — kein Scrollen mehr zum Ende. Header oben bleibt fix, die vier Widget-Bereiche (KPIs, Deadlines/Follow-ups, Budget, Projekte) teilen den verfügbaren Platz auf. Lange Listen scrollen nur noch innerhalb ihrer Karte.
- **Budget-Übersicht + Letzte Projekte** stehen jetzt nebeneinander statt untereinander — nutzt die breite Bildschirmfläche und halbiert die Scroll-Distanz. Auf kleineren Bildschirmen (< 1024px) fällt das Layout automatisch auf Stack zurück.

### Einstellungen: Sidebar-Nav + 2-Spalten-Layout
- **Neue Seiten-Sidebar statt horizontaler Tabs**: Links in den Einstellungen findest du jetzt eine Navigation mit 5 Gruppen (Persönlich · Firma · Workspace · Team & Zugriff · System), jedes Item mit Icon und hover. Aktives Tab grün hinterlegt. Viel übersichtlicher als die 12-Tab-Zeile oben drüber.
- **2-Spalten-Layout im Content**: Profil, Firma, Workspace und Rechtliches nutzen jetzt den rechten weißen Platz auf großen Bildschirmen — Cards stehen nebeneinander statt untereinander. Weniger scrollen, alles im Blick. Auf kleineren Bildschirmen (< 1280px) fällt das Layout automatisch auf eine Spalte zurück.
- **Content-Breite** auf `max-w-6xl` erhöht (vorher `max-w-2xl`) — füllt größere Screens spürbar besser.

### Einstellungen: Team-Dropdown-Fix + Firmenlogo-Upload
- **Team-Tab Dropdown-Bug gefixt**: Das ⋮-Menü beim Bearbeiten von Mitgliedern wurde durch `overflow-hidden` der Card-Container abgeschnitten und lief an Viewport-Rändern ins Off-Screen. Jetzt rendert es `position: fixed` mit JS-berechneten Koordinaten — bleibt immer vollständig sichtbar, egal wo die Zeile steht. Klick außerhalb schließt.
- **Firmenlogo direkt hochladen**: Der Firma-Tab hat jetzt einen richtigen Datei-Upload (Camera-Overlay, Drag-Preview, Auto-Save) statt eines URL-Feldes. PNG/JPG/WebP/SVG bis 50 MB. Speichern geht in den neuen Storage-Bucket `org-logos`, der Firmenname bleibt mit `organisationen.logo_url` verknüpft. Migration 085 muss manuell in Supabase ausgeführt werden.

### Einstellungen: Firma + Rechtliches + Firmen-Defaults
- **Neuer Tab „Firma"** (zwischen Profil und Workspace) zum Bearbeiten der Firmen-Identität: Firmenname, Kontakt-E-Mail, Telefon, Website, Adresse, Logo-URL. Alles was auf Freigabelinks, Mails und im Kunden-Portal erscheint.
- **Login-Slug ändern** direkt im Firma-Tab, mit Bestätigungs-Modal und deutlicher Warnung: „Alle Teammitglieder müssen sich mit dem neuen Slug neu einloggen". Uniqueness wird serverseitig geprüft — doppelte Slugs sind ausgeschlossen.
- **Rechtliches-Tab komplett überarbeitet**: oben gibt es jetzt „Deine Firmenangaben" mit Rechtsform-Dropdown (9 Optionen inkl. GbR/GmbH/UG/AG), Handelsregister-Nr., Registergericht, Geschäftsführer, USt-IdNr., Steuernummer, Bank-Daten (Name/IBAN/BIC) sowie freien Texten für Impressum, Datenschutz-URL und Standard-AGB. Alles landet später automatisch auf Rechnungen, Angeboten und Verträgen.
- **Workspace-Tab** erweitert um Firmen-Defaults: Standard-Zahlungsziel (Tage) + Standard-Angebotsgültigkeit (Tage) — werden bei neuen Angeboten und Rechnungen als Startwert vorbelegt.
- **Rollenschutz**: Nur Admins können Firmendaten ändern. Andere Team-Rollen sehen die Felder nur readonly.
- **Header-Fix**: Zwischen Titel „Einstellungen" und Tab-Leiste klaffte eine Lücke, in der der graue Hintergrund durchblitzte — jetzt komplett weißer Hintergrund, sauberer Übergang.
- Migration 084 muss manuell in Supabase ausgeführt werden.

### Slug-first Login (Firmen-Slug vor E-Mail/Passwort)
- **Neuer Login-Ablauf in zwei Schritten**: Beim Aufruf von `/login` fragt Wellbeing Spaces zuerst nach dem **Firmen-Slug** (z. B. `wellbeing-concepts`). Erst danach erscheint das gewohnte E-Mail/Passwort-Formular — mit Firmenname als Header („Anmeldung bei Wellbeing Concepts GbR"). Über „Andere Firma" oben rechts kann man jederzeit zurück.
- **Strikte Mitgliedschafts-Prüfung beim Login**: Auch wenn E-Mail und Passwort stimmen, lässt das System dich nur in die Firma rein, in der du tatsächlich aktives Teammitglied bist. Falsche Firma → sofortige Fehlermeldung „Diese E-Mail gehört nicht zu {Firma}", Session wird sofort wieder beendet. Kein stilles Landen in einer fremden Firma mehr möglich.
- **Bookmarkbare Firma-URL**: Direkter Login-Link `app.wellbeing-spaces.de/login?firma=wellbeing-concepts` springt sofort zum Branded-Login der Firma.
- **Org-scoped Session**: Nach erfolgreichem Login speichert das System die aktive Firma in einem HTTP-only Cookie (30 Tage). Alle Server-Aktionen verwenden konsequent diese Firma — auch wenn ein User irgendwann in mehrere Orgs gehört.

### Sicherheit: Multi-Tenancy-Leak beim Login geschlossen
- **Kritischer Fix**: Wenn ein User (z. B. `wbc@…`) eine ausstehende Team-Einladung einer anderen Firma hatte, wurde er beim nächsten Login **still und automatisch** in diese Firma gezogen — ohne je den Einladungs-Link anzuklicken. Dadurch konnte z. B. wbc@ plötzlich in Sorays „Wellbeing Concepts" landen, obwohl er eigentlich in einer Test-Firma war. Diese automatische E-Mail-Aktivierung wurde entfernt. Einladungen müssen jetzt **immer** explizit über den Token-Link `/einladung/…` angenommen werden.
- **Determinismus bei Mehrfach-Mitgliedschaft**: Wenn ein User in mehreren Orgs Mitglied ist, wählt das System jetzt deterministisch die **älteste** Mitgliedschaft (primäre Org) — kein zufälliges Hin- und Her-Springen zwischen Firmen mehr.

## 2026-04-23

### Freigabe-System erweitert: Scope + Pflicht-Abschluss + Audit
- **Granularere Freigabe-Links**: Beim Erstellen wählst du den Umfang — „Gesamtes Projekt", „Einzelner Raum" oder „Kuratierte Auswahl" (handverlesene Produkte). Der Kunde sieht nur genau diese Auswahl.
- **Pflicht-Abschluss**: Sobald der Kunde alle Positionen entschieden hat, erscheint unten ein prominenter „Freigabe abschließen"-Button mit Dialog (Name + optionaler Kommentar + Bestätigungs-Haken). Erst dann gilt die Freigabe als final — Token wird read-only.
- **Admin-Mail bei Abschluss**: Nach Klick auf „Abschließen" landet automatisch eine Mail bei dir mit Kundennamen, Zusammenfassung (X freigegeben, Y abgelehnt) und optionalem Feedback-Kommentar. Außerdem Timeline-Event im Projekt.
- **Freigabe-Verlauf pro Projekt**: Neuer Block unter dem Freigabe-Link zeigt alle jemals erstellten Links (Offen / Abgeschlossen / Zurückgezogen / Abgelaufen) mit Scope-Icon. Per „Verlauf →"-Klick öffnet sich ein Seitenpanel mit der kompletten History — wer hat wann was freigegeben (Portal / Link / Admin / System).
- **Auto-Invalidierung bei Produkt-Änderungen**: Wenn du Preis, Menge, Beschreibung oder Bild eines bereits freigegebenen Produkts änderst, wird die Freigabe automatisch auf „Ausstehend" zurückgesetzt mit Kommentar „Automatisch zurückgesetzt: X geändert am TT.MM.JJJJ". Fair & transparent gegenüber dem Kunden.
- **Duplikat-Schutz**: Pro Projekt kann es nur einen offenen Projekt-weiten Link geben. Zweiter Versuch bekommt „Bestehenden Link verwenden oder zuerst zurückziehen".
- **Read-Only-Bestätigung**: Nach Abschluss zeigt der Freigabe-Link nur noch eine Bestätigungsseite — kein versehentliches Weiter-Klicken mehr.
- Migrationen 081/082/083 manuell in Supabase ausführen.

## 2026-04-22

### Chat — Stabilität und Bug-Fixes
- Doppelt-Senden verhindert: Enter-Spam und schnelles Klicken erzeugt keine Duplikate mehr, solange die vorherige Nachricht noch unterwegs ist
- Dieselbe Datei kann direkt nochmal angehängt werden (der File-Dialog triggert jetzt auch bei identischer Auswahl)
- 50-MB-Limit wird jetzt sofort beim Auswählen geprüft (nicht mehr erst nach dem Upload)
- Nur ein Sprachmemo spielt gleichzeitig — startet man ein zweites, wird das erste automatisch pausiert (wie bei WhatsApp)
- Auto-Scroll ist höflicher: wenn du nach oben gescrollt hast, unterbricht eine neue Nachricht dein Lesen nicht mehr
- Abgelaufene Vorschau-URLs (Bilder, Audio) werden automatisch neu geholt, wenn sie stocken
- Mikrofon-Button ist ausgegraut, wenn das Gerät/der Browser keine Aufnahme unterstützt (z.B. alte iOS, http)
- Polling holt sich keine Nachrichten mehr doppelt parallel ab — das spart Netzwerk und stabilisiert den Chat
- Nach dem Senden springt der Cursor automatisch zurück in das Textfeld — schnelle Folge-Nachrichten ohne Klicken
- Im Kunden-Portal wird ein Anhang jetzt sofort optimistisch mit „wird hochgeladen…" angezeigt (vorher war nur der Text zu sehen)
- Sprachaufnahme: Race-Condition zwischen „Senden" und „Abbrechen" behoben — es kommt keine leere Aufnahme mehr an

### Chat wie WhatsApp — Fotos, Dateien, Sprachmemos
- Im Chat (Admin-Seite und Kunden-Portal) gibt es jetzt ein Büroklammer-Icon für Foto- oder Datei-Anhang und ein Mikrofon-Icon für Sprachmemos
- Sprachmemos werden direkt im Browser aufgenommen (rote Aufnahme-Leiste mit Timer, Abbrechen oder Senden) und im Chat als kleiner Player abgespielt
- Bilder erscheinen als Thumbnail in der Nachricht, per Klick geht ein Fullscreen-Viewer auf
- Dateien (PDFs etc.) werden als Karte mit Dateiname, Größe und Download-Pfeil angezeigt
- Text und Anhang können kombiniert werden (Foto mit Bildunterschrift)
- Eigene Nachrichten rechts mit Brand-Farbe, Team/Gegenüber links grau — wie bei WhatsApp
- Migration 080 muss manuell in Supabase SQL-Editor ausgeführt werden (fügt Anhang-Spalten hinzu und erstellt den privaten Storage-Bucket `chat-attachments`, 50 MB pro Datei)

### Kunden-Detailseite ist jetzt ein 360°-Cockpit
- KPI-Band unter dem Kunde-Header mit vier Kennzahlen: Projekte total (mit aktiv/fertig-Split), Angebote offen (mit offener Summe), Verträge aktiv (mit abgelaufenen), letzter Kontakt (mit Zeitabstand + Typ + Betreff)
- Projekte-Liste zeigt jetzt pro Zeile den Status-Punkt, Räume-/Produktanzahl, Freigabe-Fortschrittsbalken (x/y freigegeben), Budget-Summe und Deadline-Countdown (z.B. „in 3 Tg." oder „5 Tg. überfällig")
- Neue Multi-Projekt-Timeline: zeigt alle Events über alle Projekte des Kunden mit Projekt-Badge, oben rechts ein Filter-Dropdown um auf einzelne Projekte umzuschalten — inklusive der drei Views (Liste · Nach Produkt · Kalender)
- Archivierte Kunden funktionieren vollständig (kein 404 mehr), mit Hinweis-Banner oben

### Raum-Detailseite neues Layout
- Grundriss und Raum-Timeline jetzt nebeneinander oben (auf großen Screens 60/40-Split). Produkte-Tabelle rutscht darunter in voller Breite
- Timeline ist intern scrollbar (max. 460px) — egal wie viele Events, die Seite bleibt kompakt. Man muss nicht mehr ewig scrollen, wenn Produkt-Einträge aufgeklappt sind

### Timeline — deutlich besser und neue Ansichten
- **Projekt-Timeline**: drei Views jetzt verfügbar: Gantt (wie bisher), Kanban (neu, nach Status: Überfällig · Geplant · In Arbeit · Abgeschlossen), Liste (mit Stats-Header pro Monat und vertikaler Zeitleiste)
- **Gantt-Ansicht** komplett aufgeräumt: linke Sidebar mit Event-Titel/Status/Icon pro Zeile (Sticky), rechts nur noch die Zeitleiste mit Balken — keine abgeschnittenen „B…"-Namen mehr
- **Raum-Timeline**: drei Views (Liste · Nach Produkt · Kalender) — „Nach Produkt" gruppiert Bestellt/Geliefert-Events pro Artikel
- Klick auf ein Event öffnet ein Detail-Popup mit allen wichtigen Infos (Titel, Typ, Status, Datum, Beschreibung, Raum, Quelle bei Auto-Events, Portal-Sichtbarkeit)
- Phasen werden im Kalender jetzt als durchgezogener Balken von Start bis Ende angezeigt (nicht mehr nur am ersten Tag)
- Meilenstein hat nur noch ein Datum, kein Enddatum (ergibt Sinn, weil's ein Punkt in der Zeit ist)

### Event anlegen/bearbeiten
- Event-Modal crasht nicht mehr ins Whitescreen bei Fehlern — zeigt jetzt die echte Fehlermeldung im Formular
- Beim Raum-Event hinzufügen erscheint jetzt das gleiche umfangreiche Modal wie bei Timeline-Events (Beschreibung, Status, Farbe, Verantwortlich, Erinnerung, Kunde-Sichtbarkeit)

### Kunden-Freigabelink: PIN komplett überarbeitet
- Bug gefixt: bei „kein PIN" wurde trotzdem nach einem gefragt → weg
- Bug gefixt: korrekter PIN wurde abgelehnt (Whitespace-Problem in der DB) → weg
- PIN-Eingabe-Seite komplett neu designt: dynamische Ziffern-Boxen (4-6 Stellen, wachsen beim Tippen), Auto-Submit bei 6 Ziffern, Shake-Animation bei Fehler, Dot-Grid-Hintergrund in Brand-Farbe mit feinem Accent-Strip oben

### Einstellungen — Branding + Navigation
- Globaler Reset-Button „Auf Wellbeing Spaces Standard zurücksetzen" unter Einstellungen > Branding
- Tab-Leiste (Profil / Workspace / Branding / Team / …) bleibt beim Scrollen sichtbar

### Dashboard — Info-Tooltips
- Bei „Anstehende Deadlines" und „Offene Follow-ups" jetzt ein ℹ-Icon — Hover zeigt was das Widget genau macht und wo man Einträge anlegt

### Bugfixes
- Archivierter Kunde → Breadcrumb-Link führt nicht mehr in 404
- Timeline Auto-Sync Status-Events werden korrekt erzeugt
- Bei fehlender SUPABASE-ENV-Var crasht der Build nicht mehr (Fallback auf Platzhalter)

### Einstellungen > Änderungen: jetzt kompakt + filterbar
- Hero-Band schlank und in einer Zeile (statt groß mit separaten Stat-Karten)
- **Kategorie-Filter als Chip-Row** (Alle · Features · Fixes · Design · Timeline · Partner · Kunde · Editor · Security) mit Anzahl der Änderungen je Kategorie — nur Chips mit Content sichtbar
- Filter- und Suchleiste bleibt beim Scrollen sticky oben
- Jeder Datum-Eintrag ist jetzt eine kompakte klickbare Zeile (Datum · relatives Label · Icon-Vorschau der Kategorien · Anzahl Änderungen)
- Die zwei neuesten Einträge sind per Default offen, ältere geschlossen — Klick öffnet/schließt sie
- Bei aktivem Filter oder Suche werden passende Treffer automatisch aufgeklappt

### Einstellungen > Änderungen: neues Design
- Hero-Band oben mit Brand-Gradient + drei Stats (Gesamt-Updates, Letzte 30 Tage, Änderungen total, relatives Datum der letzten Aktualisierung)
- **Zeitstrahl-Layout** mit vertikaler Linie + Datum-Bubbles statt einklappbarer Akkordeon-Karten — alle Änderungen auf einen Blick sichtbar
- **Such-Feld** über der Timeline — filtert Einträge in Echtzeit nach Keywords
- **Neu-Badge** (grün) bei Einträgen, die seit deinem letzten Besuch dazugekommen sind
- **Sektions-Icons** mit passenden Farben je nach Thema (Bugfixes rot, Design lila, Partner/Verträge grün, Timeline indigo, Performance amber, Security blau, …) — macht den Changelog scanbar
- Jeder Sektion zeigt Anzahl der enthaltenen Änderungen

### Vertragsvorlagen — kein HTML-Code mehr nötig
- Bisher musste man HTML-Tags (`<h1>`, `<p>`, `<ul>` …) in eine Textarea tippen — unzumutbar
- Jetzt: WYSIWYG-Editor wie in Word/Notion mit Toolbar (Überschrift 1/2/3, Fett, Liste, nummerierte Liste, Trennlinie)
- **Platzhalter-Picker** als Dropdown rechts in der Toolbar — klick auf einen Eintrag und der Platzhalter (z.B. `{{kunde_name}}`) wird an der Cursor-Position eingefügt
- **3 Quick-Start-Vorlagen** beim Erstellen einer neuen Vorlage: Interior Design Vertrag, Angebot, Auftragsbestätigung — klick und der Editor ist befüllt, du kannst direkt anpassen
- **Live-Vorschau-Toggle** (Editor / Geteilt / Vorschau) — Vorschau zeigt den Vertrag mit Beispieldaten in den Platzhaltern
- Bestehende Vorlagen (mit altem HTML-Inhalt) werden weiter geladen und können im neuen Editor bearbeitet werden — keine Migration nötig

### Partner-Verträge: Dokumente hochladen
- Auf der Partner-Detailseite gibt's jetzt einen neuen Block „Verträge & Dokumente"
- Du kannst PDFs, Word-/Excel-Dateien und Bilder vom Partner per Drag & Drop oder Klick hochladen (max. 50 MB)
- Pro Datei optional: Titel, Typ (Rahmenvertrag, Einzelauftrag, NDA, Konditionsvereinbarung, Lieferantenvertrag, Sonstiges), Gültigkeitszeitraum, Notizen
- In der Liste siehst du Datei-Icon, Titel, Typ-Badge, Größe, Hochladedatum
- Bald ablaufende Verträge bekommen einen amber „Läuft bald aus"-Badge, abgelaufene einen roten „Abgelaufen"-Badge
- Download via Hover-Button (Signed URL, kurzlebig — Datei bleibt privat im Storage)
- Lösch-Button mit Bestätigung

### App-Chrome fühlt sich jetzt wie eine echte App an (statt einer Webseite)
- Sidebar-Nav, Buttons, Badges, Card-Header und Labels können nicht mehr versehentlich mit der Maus markiert werden
- Echter Content wie Kunden-Kontaktdaten, Notizen, Kommunikations-Einträge, Beschreibungen, Eingabefelder bleiben markierbar (zum Kopieren)

## 2026-04-21

### Bestell-/Liefer-/Freigabe-Status pro Raum
- Bisher hat derselbe Artikel (z.B. dieselbe IKEA-Leuchte) in zwei verschiedenen Räumen oder Projekten zwingend denselben Bestellstatus, Liefertermin und Freigabe-Status geteilt — wurde er in Raum A bestellt, stand er in Raum B ebenfalls auf „Bestellt". Das war ein Bug.
- Ab jetzt hat jede Raum↔Produkt-Verknüpfung ihre eigenen Daten: Bestellt/Geplante Lieferung/Geliefert-Datumsfelder, Bestellstatus und Freigabe-Status mit Kommentar.
- Timeline-Auto-Events (Lieferung, Bestellt, Geliefert) sind jetzt pro Raum eindeutig — derselbe Artikel in zwei Räumen kann zwei unabhängige Events haben, die sich nicht mehr gegenseitig überschreiben.
- Migration 076 kopiert die bisherigen globalen Werte einmalig in alle betroffenen Raum-Produkt-Zeilen, sodass keine Daten verloren gehen. Migration 077 räumt alte Auto-Events auf, die noch den alten Schlüssel hatten.

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
