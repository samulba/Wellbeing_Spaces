# Änderungen

Alle wichtigen Änderungen an Wellbeing Spaces, chronologisch rückwärts.
Format: **YYYY-MM-DD** mit Stichpunkten in einfachem Deutsch.

## 2026-06-23

### PDFs – Kleinigkeit
- In allen PDF-Tabellen wird der Spaltenkopf **„Pos"** jetzt sauber einzeilig dargestellt (vorher rutschte bei „Pos." der Punkt in eine zweite Zeile).

### Freigaben – interne Kostenübersicht als PDF
- Neuer Button **„Interne Übersicht (PDF)"** im Freigaben-Tab eines Projekts: erstellt eine **interne** PDF aller Produkte, **gruppiert nach Partner** (von wem wird was bestellt) — je Produkt **Einkauf netto · Verkauf brutto · Marge** und eine **Status-Spalte** (Freigegeben/Abgelehnt/Überarbeitung/Ausstehend). Die **Zwischensummen pro Partner** und die **Gesamtkosten in Brutto** zählen nur die **freigegebenen** Produkte (= echter Bestellwert). Nur intern (enthält EK-/Margen­angaben, nicht für den Kunden).

### Freigabe-Link für Kunden – Bedienung verbessert
- **Automatisches Hochscrollen:** Beim Wechsel zu „Nächster Raum" / „Weiter" springt die Ansicht jetzt wieder nach oben — vorher landete man manchmal mitten/unten auf der Seite und hat Produkte übersehen.
- **Klarere Status-Kacheln:** Ein freigegebenes/abgelehntes Einzelprodukt ist jetzt deutlich erkennbar — farbiger Rahmen + ein gut sichtbares Status-Banner („Freigegeben" / „Abgelehnt" / „Überarbeitung") auf dem Produktbild.

### Freigaben-Übersicht – Einträge löschen
- Neuer **„Löschen"-Button** (einzeln per Mülleimer-Symbol, in der Mehrfachauswahl neben „Ablehnen" und im Detail-Fenster): entfernt ein Produkt endgültig aus dem Raum — praktisch zum Aufräumen von Test-/Fehleinträgen, wenn „Zurücksetzen" nicht reicht. Das Produkt bleibt in der Bibliothek erhalten.

### Raum-PDF „Produktübersicht" – übersichtlicher
- **Gruppen als Abschnitts-Überschriften** statt wiederholter „Gruppe"-Spalte → ruhigeres, klareres Layout, mehr Platz für den Produktnamen.
- **Produktnamen sind jetzt anklickbar** und führen direkt zum jeweiligen Produkt-Link (Shop/Quelle) – praktisch für den Lieferanten.
- Neue Übersicht **„Gesamtmenge je Produkt"**: Produkte, die im Raum mehrfach (auch über verschiedene Gruppen) vorkommen, werden mit ihrer **Gesamtstückzahl** und den betroffenen Gruppen zusammengefasst.

### Freigabe – Abschluss klemmte trotz „alles entschieden"
- Eine Freigabe ließ sich nicht abschließen („Noch X Produkte offen"), obwohl die Übersicht **alle Produkte als entschieden** anzeigte. Ursache: Aus der Bibliothek **gelöschte Produkte**, die noch in einem Raum lagen, wurden dem Kunden zwar (richtig) nicht angezeigt, blockierten aber im Hintergrund den Abschluss. Diese unsichtbaren Geister-Positionen werden jetzt auch beim Abschluss ignoriert — die Freigabe lässt sich wieder normal absenden. Der Beleg enthält ebenfalls keine gelöschten Produkte mehr.

## 2026-06-22

### Kundenportal – Produkte werden wieder angezeigt
- Die Produktansicht im Kundenportal war faktisch leer: Sie las Produkte aus einer veralteten Stelle, an der seit Längerem keine Produkte mehr liegen. Jetzt werden die Produkte je Raum **korrekt angezeigt** — mit **Pro-Raum-Menge**, **effektivem Preis** (inkl. Rabatt/Sonderpreis) und dem **richtigen Freigabe-/Lieferstatus**. Auch die „Offene Freigaben"-Zahl im Portal-Dashboard stimmt jetzt.
- Die Produktansicht im Portal ist **reine Anzeige**: Freigaben laufen wie gewohnt über den **Freigabe-Link** (mit Beleg/Stempel). Die alten, wirkungslosen „Freigeben"-Buttons im Portal wurden entfernt.

### Kundenportal – Lieferstatus bei mehrfachen Produkten korrekt
- Liegt ein Produkt jetzt **mehrfach in einem Raum** (neue Funktion), zeigt das Kundenportal den **weitesten Lieferstatus** (z. B. „geliefert", sobald eine der Instanzen geliefert ist) statt eines zufälligen Einzelstatus. *(Folge-Korrektur zur Mehrfach-Produkt-Funktion.)*

### Freigaben – Freigegeben-Stempel (wann & von wem)
- Jedes freigegebene Produkt trägt jetzt einen **Stempel** „Freigegeben {Datum, Uhrzeit} · {Name}" — sichtbar in der **Raum-Produkttabelle** und in der **Freigaben-Übersicht**. So ist jederzeit nachvollziehbar, wann und durch wen eine Freigabe erteilt wurde. *(Benötigt Migration 135; vorhandene Freigaben werden aus dem Protokoll automatisch nachgetragen.)*

### Freigaben – Blöcke & Gruppen im Projekt sichtbar
- Im Projekt-Tab **„Freigaben"** lässt sich jeder Raum jetzt **aufklappen** und zeigt die **Blöcke/Gruppen** (Bereich → Auswahl-Block → Produkt) mit Freigabe-Status und Stempel — genau wie in der Raum-Ansicht. So sieht man die Struktur und den Fortschritt direkt im Projekt, ohne in jeden Raum einzeln springen zu müssen.

### Produkte – Preislogik überarbeitet (EK-Bug behoben)
- **Bug behoben:** Das Eingeben des **Einkaufspreises (EK netto)** hat bisher den **Verkaufspreis** des Kunden überschrieben/„zerschossen". Jetzt ist der **Verkaufspreis der Leitwert**: EK eingeben lässt den Verkaufspreis **unverändert** und berechnet nur die **Marge** neu. Eine **Marge** eingeben berechnet den Verkaufspreis aus dem EK; den **Verkaufspreis** (netto oder brutto) ändern passt die Marge an. Ein kurzer Hinweis im Kalkulations-Bereich erklärt das Verhalten.
- Die interne Kalkulations-Übersicht zeigt jetzt zusätzlich die **Marge in € (= Verkaufspreis − EK)** neben EK, Verkaufspreis netto/brutto und Provision.

### Räume – Produkt-Übersicht als PDF (Proof für Lieferant)
- Auf jeder Raum-Seite gibt es jetzt einen **„PDF"-Button**: er erzeugt eine **Produkt-Übersicht** des Raums (Produkt, Art.-Nr., Hersteller, Gruppe, Menge) — **bewusst ohne Verkaufspreise**, ideal als Proof an den Lieferanten (z. B. Paulmann) zum Gegencheck **vor** der Kundenfreigabe.

### Räume – Gleiches Produkt mehrfach pro Raum
- Ein Produkt kann jetzt **mehrfach in denselben Raum** gelegt werden (z. B. ein Controller je Lichtgruppe). Neuer **„Duplizieren"**-Button (Kopier-Symbol) pro Produktzeile legt eine eigene, unabhängige Position an (Menge/Preis/Notiz übernommen). Status, Freigabe und Zuordnungen sind je Position getrennt; die „In X Räumen"-Anzeige zählt weiterhin nur echte Räume. *(Benötigt Migration 134.)*

### Aufgaben – Verbesserungen
- **Erweiterte Filter:** Das Board lässt sich jetzt zusätzlich nach **Zuständig** (Teammitglied / „Niemand"), **Label** und **Projekt** (inkl. „Ohne Projekt") filtern — die Filter wirken in Board-, Listen- und Kalenderansicht. Die gewählte **Ansicht** (Board/Liste/Kalender) wird jetzt gemerkt.
- **Wiederkehrende Aufgaben:** Eine Aufgabe kann auf **täglich / wöchentlich / monatlich** gestellt werden (Auswahl im Aufgaben-Detail). Beim Erledigen wird automatisch die **nächste Aufgabe** mit vorgerücktem Fälligkeitsdatum erstellt; wiederkehrende Aufgaben tragen ein **🔁**-Symbol. *(Benötigt Migration 133.)*

### Aufgaben – Bug behoben
- **Wieder-Öffnen per Drag&Drop:** Zieht man eine erledigte Aufgabe auf dem Board zurück (z. B. nach „In Arbeit"), wird jetzt ihr Erledigt-Zeitpunkt korrekt entfernt — vorher behielt sie ihren alten Abschluss-Zeitpunkt und wirkte gleichzeitig erledigt und aktiv. Umsortieren innerhalb der Erledigt-Spalte ändert den Zeitpunkt nicht.

### Chats – Suche & Filter
- Die Chat-Übersicht hat jetzt eine **Suche** (nach Projekt oder Kunde), einen **„Ungelesen"**-Filter (mit Gesamtzähler) und die Sortierung **„Ungelesen zuerst"** — so findet man bei vielen Portal-Kunden den richtigen Chat sofort.

### Bestellungen – Bestellung als PDF
- Auf der Bestell-Detailseite gibt es jetzt einen **„PDF"**-Button: er erzeugt ein sauberes **Bestelldokument** (Lieferant + Adresse, Positionen mit Artikel-Nr./Menge/Einkaufspreis, Liefertermin, Netto + Versand + Gesamt) im gewohnten Layout der Angebots-/Vertrags-PDFs — zum Ausdrucken oder Senden an den Lieferanten.

### Bestellungen – Bugs behoben
- **„Alles erhalten" konsistent:** Wird eine ganze Bestellung auf „Geliefert" gesetzt, stimmt jetzt auch die Positions-Anzeige **„X/Y erhalten"** — die einzelnen Positionen werden mit erfasst. Vorher konnte die Bestellung „geliefert" sein, während die Positionszähler noch auf 0 standen.
- **Keine doppelte „angekommen"-Nachricht:** Werden mehrere Positionen einer Bestellung fast gleichzeitig abgehakt, erhält der Kunde die **„📦 angekommen"**-Info jetzt garantiert nur einmal.

### Produkte – Daten-Check / Marge-Warnung
- In der Produktbibliothek werden Produkte jetzt markiert, bei denen etwas nicht stimmt: **„Verlust"** (Verkaufspreis liegt unter dem Einkaufspreis) oder **„Kein Preis"** (kein Verkaufspreis hinterlegt) — als Badge in allen Ansichten. Ein neuer Filter **„⚠ Prüfen (N)"** zeigt auf einen Klick nur diese Produkte. So fallen Verlust-Produkte und unvollständige Einträge sofort auf.

### Produkte – Bugs behoben
- **Gelöschte Produkte verschwinden jetzt aus den Räumen:** Ein aus der Bibliothek gelöschtes Produkt blieb bisher in den Räumen sichtbar, in denen es verwendet wurde — und verfälschte dort die Summen. Solche Produkte werden jetzt überall korrekt ausgeblendet (die Verknüpfung bleibt rückholbar erhalten).
- **Sicherheit (URL-Import):** Der Produkt-Import per URL (AutoFill) blockiert jetzt auch interne **IPv6**-Adressen (vorher nur IPv4) — Schutz gegen Zugriffe auf interne Dienste.

### Partner – Verbesserungen
- **Echte Provision in der Liste:** Die Partnerliste zeigt jetzt die tatsächliche Provision und den EK-Rabatt aus den **Konditionen** (Standard-Kondition) statt des alten, ggf. veralteten Provisionsfeldes.
- **Filter nach Partner-Typ** (Lieferant / Hersteller / Handwerker / Planer / Sonstiges) und neue Sortierung **„Neueste"** in der Partnerliste.
- **„So wird gerechnet"-Vorschau:** Im Konditionen-Tab eines Partners zeigt eine neue Tabelle, welche Provision / EK-Rabatt / Zahlungsziel / Skonto heute tatsächlich greift — als Standard und für abweichende Kategorien.
- **Bestellungen auf der Partnerseite:** Die Partner-Übersicht listet jetzt die **Bestellungen** bei diesem Partner (Nummer, Status, Datum, Liefertermin, Summe) mit Direktlink zur jeweiligen Bestellung.

### Partner – Bugs behoben
- **Konditions-Gültigkeit (Zeitzonen-Bug):** Eine Partner-Kondition, die **heute** endet (oder heute beginnt), wurde nachmittags fälschlich als abgelaufen/noch-nicht-gültig behandelt und floss dann nicht in die Produkt-Kalkulation ein — jetzt korrekt, Start- und Endtag zählen voll mit.
- **Konditionen-Dialog:** „Gültig von" nach „Gültig bis" wird jetzt mit einer Meldung abgefangen (statt eine dauerhaft unwirksame Kondition zu speichern). Fehler beim **Löschen** einer Kondition oder beim Setzen als **Standard** werden jetzt angezeigt, statt stillschweigend verschluckt zu werden.

### Projekte – Über-Budget sichtbar + stabilere Seiten
- **Über-Budget auf einen Blick:** Projekte, deren Produktsumme das Budget übersteigt, tragen jetzt eine rote **„Über Budget"**-Markierung (Karte + Liste). In der Toolbar gibt es einen Filter **„⚠ Über Budget (N)"**, der nur die überzogenen Projekte zeigt (erscheint nur, wenn es welche gibt).
- **Stabilere Projekt-Seiten:** Projekt-Übersicht und Projekt-Detailseite stürzen nicht mehr komplett ab, wenn ein einzelner Datenbereich nicht lädt — der betroffene Block zeigt dann seinen leeren Zustand, der Rest der Seite bleibt nutzbar.

### Projekte – Bugs behoben
- **Projekt duplizieren kopierte keine Produkte:** Beim Duplizieren mit „Produkte kopieren" blieben die Räume **leer**, weil die Produkte am alten Speicherort gesucht wurden. Jetzt werden die Raum-Produkte korrekt in die neuen Räume übernommen. Zusätzlich werden jetzt auch **Produkt-Budget, Service-/Abrechnungseinstellungen** sowie pro Raum **Budget, Maße und Grundriss** mitkopiert.
- **Projekte-Übersicht zeigte veralteten Fortschritt:** Die Balken **Freigabe / Bestellt / Geliefert** auf den Projektkarten (und in der Listenansicht) lasen einen alten Status-Speicherort und zeigten dadurch falsche Werte — jetzt der aktuelle Stand wie auf der Projekt-Detailseite.
- **Duplizieren-Dialog:** Tritt beim Duplizieren ein Fehler auf, erscheint jetzt eine Meldung im Dialog (vorher blieb der Dialog ohne Rückmeldung stehen). Außerdem ist das Duplizieren jetzt strikt auf die eigene Organisation beschränkt.
- **Deadline-Chip:** Eine **heute fällige** Deadline auf den Projektkarten wurde morgens fälschlich als „in 1 Tag" angezeigt (Zeitzonen-Versatz) — jetzt korrekt „Heute fällig".

### Kunden – Dubletten-Warnung beim Anlegen
- Beim Anlegen eines neuen Kunden wird jetzt geprüft, ob es bereits einen Kunden mit **gleichem Namen oder gleicher Firma** gibt. Falls ja, erscheint ein Hinweis mit Links zu den bestehenden Kunden — versehentliche Doppel-Anlagen werden so vermieden. Mit **„Trotzdem anlegen"** kann man den Kunden bei Bedarf bewusst doppelt anlegen.

## 2026-06-21

### Kunden – 2 Bugs behoben
- **Kunden-Detailseite Budget:** Die Projekt-/Budgetsummen in der Kundenübersicht zählten **Rabatte und Set-Preise nicht mit** (zu hoch); jetzt konsistent zur Projektseite (effektiver Verkaufspreis inkl. Rabatt, ohne gelöschte Produkte).
- **Heutige Follow-ups:** Ein Follow-up mit Datum **heute** wurde nachmittags fälschlich als **überfällig** (rot) angezeigt — jetzt erst ab morgen.

### Dashboard – Aktivitäten-Widget + präziserer Monatsumsatz
- **Neu: „Letzte Aktivitäten"** auf dem Dashboard (3. Spalte) — zeigt die jüngsten Änderungen in der Organisation (wer hat was erstellt/geändert/geliefert …), inkl. Name des betroffenen Eintrags. Gut für den Team-Überblick.
- **Monatsumsatz genauer:** zählt jetzt nach **Annahme-Datum** des Angebots statt nach Erstell-Datum — ein letzten Monat erstelltes, diesen Monat angenommenes Angebot zählt korrekt für diesen Monat. (Das Annahme-Datum wird ab jetzt beim Status „angenommen" gespeichert.)

### Dashboard – 3 Bugs behoben
- **Doppelte Deadlines:** Eine Projekt-Deadline erschien im Widget „Anstehende Deadlines" **doppelt** (einmal als Projekt-Deadline, einmal als automatisch erzeugter Timeline-Meilenstein) — jetzt nur noch einmal.
- **Budget-Balken:** Die „Budget-Übersicht" zählte **Rabatte und Set-Preise nicht mit** und war dadurch zu hoch; jetzt rechnet sie wie die Projektseite (effektiver Verkaufspreis inkl. Rabatt, ohne gelöschte Produkte).
- **Heutige Termine:** Deadlines/Termine **von heute** wurden nachmittags fälschlich als „1 Tag überfällig" angezeigt (Zeitzonen-Rundung) — jetzt korrekt „Heute".

### Wareneingang – Feinschliff (nach Code-Audit)
- **Behoben:** Beim erneuten Abhaken einer bereits vollständig gelieferten Bestellung wurde dem Kunden die **„📦 angekommen"-Nachricht ein zweites Mal** geschickt — passiert jetzt nur noch genau einmal.
- **Behoben:** Wird der Wareneingang einer Position **zurückgesetzt**, springt die Bestellung von „Geliefert" sauber zurück auf „Versandt" (vorher konnte „Bestellung geliefert" + „Position bestellt" gleichzeitig stehen).

### Set-Katalog & Empfehlungen
- **Sets kuratieren:** Im Set-Editor lässt sich ein Set jetzt als **„⭐ empfohlen"** markieren und mit einem **Einsatzbereich** beschreiben (z. B. „LED-Strip-Installation") — damit man auch ohne Fachwissen sofort das richtige Set findet.
- **Set-Katalog beim Hinzufügen:** Unter **Produkt hinzufügen → Set/Bundle** gibt es jetzt eine **Suche**, eine **„Empfohlen"-Sektion** ganz oben und eine Gruppierung **nach Kategorie**. Pro Set zeigt **„Was ist enthalten?"** auf einen Klick alle Komponenten mit Mengen und Preisen.
- In der Produktbibliothek tragen empfohlene Sets ein **„Empfohlen"-Sternchen**.
- **Migration 132** muss in Supabase ausgeführt werden. Bis dahin funktioniert alles wie bisher (nur „empfohlen"/Einsatzbereich sind erst danach aktiv).

### Lieferverfolgung & Wareneingang
- **Wareneingang pro Position:** In einer Bestellung lässt sich jede Position einzeln als **„Erhalten"** abhaken — auch **Teilmengen** („Teil"). Das Produkt im Raum springt automatisch auf **teilgeliefert** bzw. **geliefert**; sind alle Positionen da, wird die ganze Bestellung automatisch auf „Geliefert" gesetzt. Oben zeigt ein Zähler **„X / Y erhalten"** + ein **„Alles erhalten"**-Knopf.
- **Überfällige Lieferungen:** Neue Dashboard-Kennzahl **„Überfällig"** und ein eigener Reiter **„Überfällig"** in den Bestellungen — Lieferungen, deren Termin vorbei ist und die noch nicht angekommen sind, fallen sofort rot auf. (Die KPI-Kacheln verlinken jetzt direkt in den passenden Reiter.)
- **Kunde wird informiert:** Beim Versand und bei der Lieferung erhält der Kunde im **Portal** eine Info („unterwegs" / „angekommen 📦") — inkl. einer positiven **„… Produkte sind bereits angekommen ✓"**-Zeile. Weiterhin **ohne Lieferantennamen**.
- **Migration 131** muss in Supabase ausgeführt werden. Bis dahin funktioniert alles wie bisher (nur der Teil-Wareneingang ist erst danach aktiv).

### Kritischer Fehler behoben: Produkte waren aus allen Räumen verschwunden
- **Behoben (dringend):** Nach einer Datenbank-Aktualisierung wurden in **allen** Projekten plötzlich **keine Produkte** mehr in den Räumen angezeigt (auch in Freigaben und Bestellungen). **Es sind keine Daten verloren gegangen** — eine technische Mehrdeutigkeit blockierte nur die Anzeige. Mit einem Datenbank-Hotfix (Migration 130) sind sofort wieder alle Produkte da. Das Set-/Bundle-Feature funktioniert unverändert weiter.

### Bestellungen-Ansichten waren leer — behoben
- **Behoben:** Die Bereiche **„Zu bestellen"** und **„Anstehende Lieferungen"**, die **Kandidatenliste** beim Anlegen einer Partner-Bestellung, die **Dashboard-Kennzahlen** und das **Sidebar-Badge** zeigten fälschlich nichts/0 an, obwohl freigegebene Produkte zum Bestellen vorlagen. Ebenso wurden beim Unterschreiben eines Vertrags **keine Bestell-Entwürfe** automatisch erzeugt. Alle diese Ansichten füllen sich jetzt wieder korrekt.

### Bestellungen: Glückwunsch fürs Kundenportal + Lieferübersicht für den Kunden (Teil 2)
- Wenn der Admin die **erste** Bestellung eines Projekts auslöst, bekommt der Kunde im **Portal** automatisch eine freundliche Nachricht: **„🎉 Glückwunsch, Ihre Bestellung wurde ausgelöst!"** — als Banner auf der Projektseite, als Chat-Nachricht, als Glocken-Hinweis und per **E-Mail**. Die Feier erscheint **genau einmal** pro Projekt; spätere Bestellungen aktualisieren still die Lieferübersicht.
- Der Kunde sieht im Tab **„Lieferungen"** jetzt oben **„Kommende Lieferungen"** — nach **Datum** gruppiert, mit Produkt und Raum, damit klar ist, **was wann** kommt. **Lieferantennamen bleiben für den Kunden verborgen.**
- **Migration 129** muss in Supabase ausgeführt werden. Bis dahin funktioniert alles wie bisher (die einmalige Glückwunsch-Feier bleibt dann nur aus).

### Bestellungen: 1-Klick auslösen pro Lieferant + Lieferübersicht (Teil 1)
- Die **Sidebar-Zahl bei „Bestellungen"** zeigt jetzt, wie viele freigegebene Produkte **zu bestellen** sind — frisch freigegebene Produkte fallen sofort auf.
- Im Tab **„Zu bestellen"** lässt sich pro Lieferant mit einem Klick **„Bestellung auslösen"** — wahlweise die ganze Lieferanten-Gruppe oder nur **angekreuzte Produkte** (Teilbestellung); der Rest bleibt offen. Der bisherige „Als Entwurf"-Weg bleibt erhalten.
- Neuer Tab **„Lieferübersicht"**: zeigt alle ausgelösten Bestellungen gruppiert nach Lieferant mit Produkt, Menge, Raum/Projekt, Liefertermin und Status („wer liefert was wann").
- In der Bestell-Detailseite heißt „Bestätigen" jetzt **„Bestellung auslösen"** (Status-Label „Ausgelöst").

### Produkt-Sets im Kunden-Freigabe-Link (Phase 2)
- Im **Freigabe-Link** erscheint ein Set jetzt als **eine** Karte (Set-Name, Set-Preis, „Was ist enthalten?"-Ausklapper mit allen Komponenten) statt als einzelne Positionen — genau der USP, den der Kunde verstehen soll.
- **Eine** Entscheidung fürs ganze Set: **Set freigeben / Ablehnen / Alternative** (mit Kommentar) setzt automatisch alle Komponenten gemeinsam (all-or-nothing). Der Fortschritt zählt das Set als **eine** Position und gilt erst als freigegeben, wenn das komplette Set freigegeben ist.
- Rein additiv: bestehende Auswahl-Blöcke (1-von-N), lose Produkte, PIN, Beleg/Unterschrift und Protokoll bleiben unverändert. Keine neue Migration.

### Produkt-Sets / Bundles in der Bibliothek (Phase 1)
- **Neu:** In der Produktbibliothek lassen sich jetzt **Sets/Bundles** anlegen — mehrere Produkte mit Mengen als Komplett-Set (z. B. „LED-Strip-Komplettset" = Strips + Profile + Trafo + Verstärker + Fernbedienung). Über **Neues Produkt → „Set / Bundle anlegen"**: Komponenten aus der Bibliothek wählen, Mengen setzen, Live-Preis sehen.
- **Set-Preis:** Summe der Komponenten, optional mit **Set-Rabatt %** oder **Festpreis** (Set günstiger als Einzelteile anbieten).
- **In ein Projekt einfügen:** Im Raum über **Produkt hinzufügen → „Set / Bundle hinzufügen"** wird das Set mit einem Klick in seine Einzelkomponenten „aufgeteilt" (richtige Mengen × Anzahl Sets), sichtbar als **Set gruppiert** mit „Set entfernen". Jede Komponente bleibt einzeln bestell- und nachverfolgbar; der Set-Rabatt wird automatisch auf jede Komponente angewendet, sodass **Summen, Budget und PDF/CSV-Exporte** ohne Weiteres stimmen.
- In der Bibliothek sind Sets mit **„Set"-Badge**, Komponentenzahl und einem **Sets-Filter** erkennbar.
- **Migration 128** muss in Supabase ausgeführt werden. Bis dahin funktioniert alles wie bisher (Sets erscheinen einfach noch nicht).

### Kunden-Übersicht als Kopier-Zentrale (Bestellprozess) + getrennte Adresse
- Die Kontakt-/Firma-Karte in der **Übersicht** ist jetzt aufgeräumt und auf **schnelles Kopieren** ausgelegt: hinter **jedem** Feld (Name, Firma, Ansprechpartner, E-Mail, Telefon, Straße, PLZ, Ort, Website) sitzt ein **Copy-Symbol** — ein Klick kopiert den Wert (kurzes „✓ Kopiert"-Feedback). Oben rechts **„Alles kopieren"** legt Name + Adresse + Telefon + E-Mail als fertigen Block in die Zwischenablage (ideal für Bestellformulare).
- **Adresse jetzt getrennt** in **Straße & Hausnummer / PLZ / Ort** — so lassen sich die Teile einzeln kopieren. Im Bearbeiten-Formular pflegbar; bei Bestandskunden wird die bisher gespeicherte Adresse als Hinweis angezeigt, bis du sie einmal aufteilst (es geht nichts verloren).
- **Migration 127** legt die neuen Adressfelder an (additiv) — **muss in Supabase ausgeführt werden**. Bis dahin funktioniert alles weiter (es wird die bisherige Adresse angezeigt).

### Kunden-Übersicht zeigt jetzt die Onboarding-Angaben
- Auf der Kundenseite (Reiter **Übersicht**) erscheint jetzt der Block **„Onboarding-Angaben"** — alles, was der Kunde beim Onboarding ausgefüllt hat: **Budget, Räume, Stil, Zeitrahmen, Projekt-Adresse** und seine **Wünsche/Anmerkungen** auf einen Blick. Die **vollständigen eingereichten Antworten** (inkl. hochgeladener Dateien) lassen sich pro Onboarding **aufklappen**.
- Die Kontakt-/Firma-Karte zeigt jetzt zusätzlich **Ansprechpartner, E-Mail und Telefon** (vorher nur Website + Adresse) — E-Mail und Telefon sind direkt anklickbar.
- Rein anzeigend, es werden keine Daten verändert; bei Kunden ohne Onboarding bleibt der Block einfach aus.

### Dashboard auf kleineren Laptops/MacBooks nicht mehr gequetscht
- **Behoben:** Auf kleineren MacBooks/Laptops (Bildschirme mit geringer Höhe) wurde das Dashboard in die feste Fensterhöhe gepresst — die Kacheln und Listen wirkten eng zusammengequetscht. Jetzt scrollt das Dashboard auf solchen Geräten ganz normal und alles bekommt wieder Luft.
- Auf großen Bildschirmen (breit **und** hoch genug) bleibt das aufgeräumte, bildschirmfüllende Layout unverändert erhalten.

## 2026-06-02

### Freigabe-Link: Auswahl-Blöcke wurden fälschlich einzeln gezeigt (Bug behoben)
- **Behoben:** Im Freigabe-Link erschienen Produkte eines Auswahl-Blocks (z. B. „Stuhl", „Stuhl-Kissen", „Übertopf") als Einzelprodukte statt als Block. Ursache: die Block-Zeile war intern als gelöscht markiert, obwohl ihre Produkte noch zugeordnet waren → sie fielen aus dem Block. Jetzt richtet sich die Block-Zugehörigkeit konsequent nach dem Produkt selbst — solche Produkte erscheinen wieder korrekt als Block (mit Auswahl/Empfehlung).
- Eine einmalige Reparatur (Migration 126) macht betroffene Blöcke wieder aktiv, damit sie auch im Admin wieder als Block sichtbar sind.

### Sicherheit: Entfernte Freigabe-Links sind sofort überall gesperrt
- **Behoben:** Ein zurückgezogener/deaktivierter Freigabe-Link ließ sich in der **Admin-Vorschau** (und damit in einem alten, offenen Tab mit Vorschau-Parameter) noch öffnen. Jetzt ist ein entfernter Link **sofort überall gesperrt** („ungültig oder zurückgezogen") — auch in der Vorschau. (Für normale Kunden war er bereits gesperrt; nur Ablauf/PIN werden in der Vorschau noch übersprungen.)
- **Deaktivierte Links verschwinden nicht mehr spurlos:** Sie tauchen jetzt unter **„Verlauf & Archiv"** auf und bleiben dort einsehbar/verwaltbar (vorher waren sie aus aktiver Liste *und* Archiv unsichtbar, obwohl der Link noch existierte).

### Freigabe: Kundenentscheidungen werden mit dem Link entfernt
- **Behoben:** Nach dem Löschen/Zurückziehen eines Freigabe-Links blieben Kundenwünsche, gewählte Alternativen („Kundenwahl") und Status auf den Produkten stehen (z. B. von Test-Links). Jetzt werden diese beim Entfernen eines Links **automatisch zurückgesetzt** — der unveränderliche Beleg bleibt als Nachweis erhalten, eure Empfehlungen (Favoriten) bleiben unberührt.
- Neu im Reiter **Freigaben**: Button **„Alle Kundenentscheidungen zurücksetzen"** (mit Sicherheitsabfrage), um projektweit aufzuräumen, falls noch altes Feedback klebt.

### Produkte aus der Bibliothek löschen
- In der **Produktbibliothek** lässt sich ein Produkt jetzt **löschen** — Papierkorb auf der Karte (Raster-Ansicht) bzw. in der Tabellenzeile (erscheint beim Überfahren). Mit **zweistufiger Sicherheitsabfrage**; ist das Produkt in Räumen verwendet, wird vorher gewarnt (es verschwindet dann auch dort). Reversibel auf Datenbankebene (Soft-Delete).

### Freigabe-Belege durchblättern + als PDF (Nachweis)
- Auf der Projektseite (Reiter **Freigaben**) gibt es jetzt den Bereich **„Eingereichte Freigaben"** — alle abgesendeten Freigaben (Freigabe 1, 2, 3 …) zum Durchblättern: mit Unterzeichner, Zeitstempel und allen Entscheidungen (Status, Kommentar, gewählte Alternative, Menge, Preis) in einer **unveränderlichen** Ansicht. Egal was du später in den Räumen änderst — der Beleg bleibt, wie der Kunde ihn abgesendet hat.
- Jeden Beleg gibt es als **PDF-Protokoll** zum Download (Firmen-Header, Positionsliste mit Status, Unterzeichner + Zeitpunkt, Prüfsumme) — als sauberer Nachweis gegenüber dem Kunden.

### Freigabe: Pflicht-Signatur + unveränderlicher Beleg beim Absenden
- Beim Absenden einer Freigabe gibt der Kunde jetzt **Vor- und Nachname** an (Pflicht); **Datum & Uhrzeit** werden automatisch protokolliert.
- Jede abgesendete Freigabe wird als **unveränderlicher Beleg** gespeichert — ein eingefrorener Snapshot aller Entscheidungen (Status, Kommentare, gewählte Alternative, Wunschmenge, Preis) plus Unterzeichner & Zeitstempel. Der Beleg bleibt erhalten, **egal was du später in den Räumen änderst** — so ist jederzeit nachweisbar, was auf Kundenwunsch entschieden/freigegeben wurde. (Die Ansicht zum Durchblättern + der PDF-Download folgen im nächsten Schritt.)

### Freigabe-Links: „nicht verfügbar" dauerhaft behoben (Links werden eingefroren)
- **Behoben:** Ein neu erstellter Auswahl-Freigabe-Link konnte beim Öffnen „nicht verfügbar" zeigen. Ursache war die dynamische Live-Auflösung des Link-Inhalts. Jetzt wird der Link **beim Erstellen eingefroren** — sein Produkt-Inhalt steht fest und ändert sich nicht mehr, egal was du später in den Räumen änderst. **Ein Link kann so nie mehr leer/„nicht verfügbar" werden.**
- Beim Erstellen wird geprüft, dass **mindestens 1 Produkt** enthalten ist — ein leerer Link lässt sich gar nicht mehr anlegen.
- Bestehende Links werden mit der Reparatur (Migration 124) ebenfalls eingefroren.
- Hinweis zum geänderten Verhalten: Produkte, die du **nach** dem Erstellen neu in einen Raum legst, erscheinen nicht mehr automatisch in einem schon bestehenden Link — dafür einfach einen neuen Link erstellen (= nächste Freigabe). Das macht Links verlässlich und später nachweisbar.

### Auswahl-Blöcke & Gruppen: saubere, konsistente Bereich-Zuordnung (Stabilität)
- **Verbessert/behoben:** Produkte in einem Auswahl-Block folgen jetzt **immer** dem Bereich ihres Blocks. Bisher konnten Block und Mitglieder unterschiedliche Bereiche haben → Produkte fielen „Ohne Gruppe", Gruppen wirkten leer und tauchten im Freigabe-Link nicht auf. Beim Zuordnen, „+ Alternative" und Bereich-Wechsel wird der Bereich jetzt durchgängig mitgezogen.
- Eine einmalige Reparatur (Migration 123) heilt bestehende Fälle: verwaiste Blöcke bekommen ihren Bereich zurück, und alle Block-Mitglieder werden an den Block-Bereich angeglichen. (Erster Schritt des größeren Freigabe-Umbaus.)

### Budget, Marge, Provision & Ertrag auf der Projektseite rechnen wieder korrekt (Bug behoben)
- **Behoben:** Auf der Projekt-Detailseite zeigten die **Budget-Auslastung** und der Block **„Projekt-Übersicht"** (Einkauf / Marge / Provision / Ertrag / Gesamtsumme) **0 €**, obwohl die Räume Produkte mit Preisen enthielten.
- Ursache war dieselbe fehlerhafte Datenabfrage wie beim Freigabe-„leer"-Bug (Filter auf eine nicht vorhandene Spalte) — und sie schlug zusätzlich in der Ausweich-Abfrage zu. Jetzt rechnen Ring und Übersicht wieder mit den echten Werten. **Die Einzelpreise in der Produkttabelle waren nie betroffen** (nur die Summen/Auswertung).

### Kundenwunsch / Kundenentscheidung löschen (mit Sicherheitsabfrage)
- In der Raum-Produktliste lässt sich der **Kundenwunsch** eines Produkts jetzt wieder **löschen**: kleiner Papierkorb am Kundenwunsch-Feld, bzw. „Kundenwahl zurücksetzen" beim vom Kunden gewählten Produkt. Es erscheint eine **zweistufige Sicherheitsabfrage** (löschen → bestätigen).
- Danach steht das Produkt wieder auf **„offen"**, der Kundenwunsch-Kommentar ist entfernt und eine vom Kunden gewählte Alternative ist aufgehoben.

### Produktliste: gewählte Alternative des Kunden ist jetzt klar erkennbar
- Hat der Kunde im Freigabe-Link **eine andere Alternative** als die Empfehlung gewählt, stand bei den nicht gewählten Produkten nur „Andere Alternative gewählt" — **ohne** zu sagen, welche. Jetzt steht dort konkret: **„Kunde hat sich für eine andere Alternative entschieden: <Produktname>"**.
- Das vom Kunden gewählte Produkt trägt in der Raum-Produktliste zusätzlich ein deutliches grünes Abzeichen **„Kundenwahl"** — so sieht man auf einen Blick, welche Alternative gewünscht ist.

### Freigabe-Link „Auswahl": Gruppen waren fälschlich „leer" und nicht wählbar (Bug behoben)
- **Behoben:** Beim Erstellen eines „Auswahl"-Links stand hinter **jeder** Gruppe „leer" und die Gruppe ließ sich nicht ankreuzen — auch wenn sie mehrere Auswahl-Blöcke mit Produkten enthielt (z. B. „Lounge-Ecke" mit Kissen- und Gartenset-Block). Dadurch konnte man gar keinen gruppen-basierten Freigabelink mehr erstellen.
- Ursache war eine fehlerhafte Datenabfrage (Filter auf eine nicht vorhandene Spalte). Jetzt zeigt jede Gruppe wieder ihre **tatsächliche Produktanzahl** und ist auswählbar — passend zur Produkttabelle des Raums.

## 2026-06-01

### Freigabe-Link „Auswahl": Gruppen zeigen ihre Produktanzahl (Verwirrung „3 Gruppen, 0 Produkte" behoben)
- Beim Erstellen eines „Auswahl"-Links steht jetzt **hinter jeder Gruppe, wie viele Produkte sie enthält** (z. B. „Ganze Gruppe: Lounge-Ecke · 5 Produkte"). **Leere Gruppen** sind als „leer" markiert und können nicht ausgewählt werden — so entstehen keine Links mehr, die dem Kunden nichts zeigen.
- Der Link-Badge sagt nicht mehr irreführend **„0 Produkte"**, wenn der Link über ganze Gruppen läuft — er zeigt jetzt z. B. **„Auswahl: 3 Gruppen"**.
- Öffnet ein Kunde einen Link, dessen ausgewählte Gruppen/Produkte gerade nichts enthalten, sieht er eine **klare Meldung** („… derzeit nicht verfügbar, bitte aktualisierten Link anfordern") statt einer leeren „0 von 0"-Seite.
- **Hinweis:** Zeigt eine Gruppe „leer", obwohl du dort Produkte erwartest, sind die Produkte (noch) nicht dieser Gruppe zugeordnet — im Raum der Gruppe zuordnen, dann erscheinen sie im Link.

### Freigaben: ältere/große Projekte gruppieren wieder korrekt (Bug behoben)
- **Behoben:** In der Freigaben-Übersicht erschienen bei Kunden mit viel Bestand (ältere, gewachsene Projekte) Produkte plötzlich **„Ohne Gruppe"** statt in ihren Gruppen/Blöcken — neue/kleine Projekte waren nicht betroffen. Ursache: die Gruppen-Zuordnung wurde projektübergreifend über eine zu große Nachlade-Abfrage geholt, die bei viel Bestand scheiterte. Die Zuordnung wird jetzt **direkt mit dem Produkt** geladen (wie schon im Kunden-Link), unabhängig von der Bestandsgröße — Gruppen/Blöcke werden überall korrekt angezeigt.
- Robustheit: leere/neu angelegte Räume führen in keiner Freigabe-Ansicht mehr zu Fehlern.

### Freigaben-Seite komplett überarbeitet (Struktur + Handlungsbedarf)
- Die Seite **Freigaben** (Sidebar) ist jetzt im einheitlichen Dashboard-Stil (sauberer Seitenkopf, Filter-Pills, Toolbar) und zeigt die neue **Gruppen→Block-Struktur**: pro Projekt aufklappbar nach Raum → Gruppe → Auswahl-Block (mit Mitgliedern, Block-Status & Kundennotiz) bzw. Einzelprodukten. Der Fortschritt zählt jetzt **Entscheidungs-Einheiten** wie beim Kunden (ein Block = eine Entscheidung).
- **Neu: „Handlungsbedarf"-Bereich ganz oben** — sammelt projektübergreifend alle Produkte, die der Kunde abgelehnt hat oder überarbeitet haben möchte, samt seinem Kommentar (Kundenwunsch), mit „Im Raum öffnen" und „Zurücksetzen". So sieht man sofort, was zu tun ist.
- Status der Seite ist jetzt immer aktuell (auch nach Kundenentscheidungen via Link/Portal). Suche, Filter, Mehrfachauswahl und die Tabellen-/Balken-Ansicht bleiben erhalten.

### Service-Raten: „Bezahlt"-Button eindeutig beschriftet
- Bei einer offenen Service-Rate hieß der grüne Button rechts nur „Bezahlt" — genau wie der bezahlt-Status, was verwirrend aussah (links „Offen", rechts „Bezahlt"). Der Button heißt jetzt **„Als bezahlt markieren"**, damit klar ist: es ist eine Aktion zum Abhaken, kein Status. (Kein Datenfehler — die Rate war korrekt „Offen".)

### Alternativen werfen Produkte nicht mehr aus ihrer Gruppe (großer Bug behoben)
- **Behoben:** Wurde zu einem Produkt eine **Alternative** hinzugefügt, landete das Produkt samt Alternative bisher in einem neuen Block **„Ohne Gruppe"** — es fiel also aus seiner Gruppe. Im Freigabe-Link führte das dazu, dass das Produkt **lose** erschien und die Alternative ganz **fehlte**. Der neue Auswahl-Block **erbt jetzt die Gruppe** des Produkts; alles bleibt zusammen an seinem Platz.
- **Bestehende Fälle werden geheilt:** Eine einmalige Reparatur ordnet bereits „verwaiste" Alternativ-Blöcke automatisch wieder ihrer ursprünglichen Gruppe zu (Migration 122). Falls einzelne Blöcke nicht eindeutig zuzuordnen sind, lassen sie sich wie gewohnt über das Gruppen-Dropdown im Block-Kopf setzen.

### Kundennotizen & -wünsche schöner und vollständig sichtbar
- Die **Kundennotiz** zu einem Auswahl-Block wird jetzt als ruhige Karte (Sandton, Icon, klare Beschriftung) statt als dünner Streifen dargestellt.
- **Neu:** Der **Kundenwunsch** pro Produkt (Kommentar bei „Ablehnen"/„Alternative") wird jetzt direkt in der Produktzeile angezeigt — vorher war dieser Text im Dashboard gar nicht sichtbar.

### Freigabe-Link: „ganze Gruppen"-Links zeigen im Admin nicht mehr fälschlich „0 Produkte"
- **Behoben:** Ein „Auswahl"-Link, der ganze **Gruppen** freigibt (statt einzelner Produkte), wurde in der Link-Liste fälschlich als „Auswahl: 0 Produkte" mit roter Warnung „zeigt dem Kunden nichts" angezeigt — obwohl der Link beim Kunden korrekt funktioniert. Ursache: die Gruppen-Auswahl wurde beim Laden der Liste nicht mitgelesen. Jetzt steht z. B. „Auswahl: 0 Produkte · 3 Gruppen" und die Warnung erscheint nur noch, wenn wirklich nichts gewählt ist.

### Freigabe-Link „Auswahl": Block-Produkte bleiben im Block & nichts verschwindet (großer Bug behoben)
- **Behoben:** Bei „Auswahl"-Links mit ganzen Gruppen wurden einzelne Produkte, die im Projekt klar in einem Block einer Gruppe liegen, im Link teils **freistehend** angezeigt — oder **fehlten ganz**. Ursache: die Kundenseite hat die Block-/Gruppen-Zuordnung über getrennte Nachlade-Abfragen zusammengesetzt; ging dabei eine Zeile verloren, „vergaß" das Produkt seinen Block. Die Kundenseite lädt diese Zuordnung jetzt **fest mit dem Produkt** (genau wie die interne Projektansicht) — Link und Projekt können nicht mehr auseinanderlaufen.
- Zusätzlich: Produkte, deren Block-Gruppe nicht auflösbar war, fallen jetzt sauber auf ihre eigene Gruppe zurück, statt unsichtbar zu werden.
- Bitte den Link einmal **frisch neu laden** — die Produkte stehen dann an der richtigen Stelle.

### Freigabe-Link: Produkte bleiben in ihrem Auswahl-Block (Bug behoben)
- **Behoben:** Produkte, die einem **Auswahl-Block innerhalb einer Gruppe** zugeordnet sind, wurden im Freigabe-Link teils **freistehend** in der Gruppe angezeigt statt im Block — vor allem, wenn vom Block gerade nur **ein** Produkt sichtbar war (z. B. weil bei einer kuratierten Auswahl nicht alle Block-Produkte mit aufgenommen wurden). Solche Blöcke werden jetzt **als Block** dargestellt, das Produkt bleibt korrekt **drin**. Einzel-Produkt-Blöcke ohne Gruppe verhalten sich unverändert (werden als normales Produkt gezeigt).

### Freigabe „Auswahl"-Links heilen sich beim Öffnen (auch alte Projekte)
- Ein „Kuratierte Auswahl"-Link nimmt jetzt **beim Öffnen automatisch** alle Produkte auf, die seit seiner Erstellung zu seinen Räumen hinzugefügt wurden — **auch bei alten Projekten**, ohne den Link neu anlegen zu müssen. Die ursprüngliche Auswahl bleibt erhalten (bewusst entfernte Produkte kommen nicht zurück). Projekt-/Raum-Links waren ohnehin schon live.

### Freigabe-Links: endgültig löschen + Link aus dem Archiv öffnen
- **Endgültig löschen:** Sowohl bei aktiven Links („Löschen" neben „Deaktivieren") als auch im „Verlauf & Archiv" (Papierkorb-Symbol) kannst du Links jetzt **komplett entfernen** — nicht nur zurückziehen. (Das Entscheidungs-Protokoll bleibt erhalten.)
- **Link aus dem Archiv öffnen:** Im „Verlauf & Archiv" öffnet ein **Klick auf den Titel** jetzt den **echten Link** in einem neuen Tab; das Augen-Symbol bleibt für die Vorschau.

### Freigabe-Links: aufgeräumt (aktiv oben, Archiv unten)
- **Keine Doppelung mehr:** Aktive Links stehen jetzt **nur** oben unter „Kunden-Freigabelinks". Der untere Bereich heißt jetzt **„Verlauf & Archiv"** und zeigt **nur abgeschlossene/zurückgezogene** Links (+ Entscheidungs-Protokoll). Ein Link „wandert" also nach unten ins Archiv, sobald er abgeschlossen oder zurückgezogen wurde — sonst bleibt er oben.
- **Verwirrender „Erneuern/↻"-Knopf entfernt:** Er war nicht mehr nötig (neue Produkte fließen automatisch in passende Auswahl-Links) und löste die Meldung „keine Auswahl hinterlegt" aus.
- **Leere Auswahl-Links** („0 Produkte") werden jetzt klar **markiert** mit dem Hinweis, sie zu deaktivieren (sie zeigen dem Kunden nichts).

### Freigabe-Link: neue Produkte erscheinen jetzt automatisch
- **Behoben (automatisch, ohne Klick):** Produkte, die du nach dem Versenden eines Links zu einem Raum/Block hinzufügst, werden jetzt **selbsttätig** in passende „Kuratierte Auswahl"-Links übernommen — sie tauchen sofort beim Kunden auf (und sind dort entscheidbar). Deine bestehende Auswahl bleibt unverändert.
- **Kein veralteter Stand mehr:** Die Freigabe- (und Portal-)Seiten werden jetzt **nie** vom Browser/CDN zwischengespeichert (`no-store`) — Änderungen sind nach dem Neuladen garantiert sichtbar, auch im selben Tab.

### Freigabe-Link: neue Produkte nachträglich aufnehmen
- **Behoben:** Bei einem Link mit **kuratierter Auswahl** wurden später hinzugefügte Produkte nicht angezeigt (die Auswahl war fix). Im „Freigabe-Verlauf" gibt es jetzt pro solchem Link ein **Aktualisieren-Symbol** (↻) — ein Klick nimmt alle **neu hinzugefügten** Produkte der betroffenen Räume in den Link auf, ohne die bestehende Auswahl zu verändern.
- Projekt- und Raum-Links zeigen neue Produkte weiterhin **automatisch** (live).

### Partner-Auswertung: Grafik überarbeitet
- „Vergleich" ist jetzt ein **Säulen-Diagramm**, „Verteilung" ein **Donut** (Ertrag = Marge + Provision) plus **Umsatz-Zusammensetzung** — füllt die Breite sauber statt mittig zu schwimmen.

### Partner-Auswertung als Grafik + Scrollbalken endgültig weg
- Die Partner-Auswertung ist jetzt **eine schlanke, aufgeräumte Karte** statt zwei Blöcke: Die vielen großen Kacheln sind weg — die **Grafik** zeigt die Zahlen (mit Werten), darunter dezent die operativen Angaben (aktive Bestellungen · offene Lieferungen · Produkte).
- **Umschaltbare Ansicht**: „Vergleich" (schlanke Balken für Umsatz/Einkauf/Marge/Provision/Ertrag) und „Verteilung" (Donut Ertrag = Marge + Provision · Umsatz-Zusammensetzung · Marge-Quote).
- Der **Scrollbalken** ist app-weit ausgeblendet (Scrollen per Mausrad/Trackpad/Touch bleibt) — die vorherige punktuelle Lösung hatte den Balken nicht erwischt.

### Freigabe-Prüfseite: Desktop-Layout (breiter + sticky Sidebar)
- Der Prüf-Schritt („Bitte prüfen Sie Ihre Auswahl") nutzt auf großen Bildschirmen jetzt den vollen Platz: **zweispaltig** mit den Räumen links und einer **mitlaufenden Sidebar** rechts (Zusammenfassung, Kostenübersicht, „Verbindlich absenden"). Auf dem Handy bleibt alles wie gehabt (gestapelt, untere Absende-Leiste).

### Partner-Detail: volle Auswertung + Scrollbalken weg
- Das KPI-Band beim Partner zeigt jetzt eine **richtige Auswertung**: Bestellter Umsatz, **Einkaufsvolumen (EK)**, **Marge**, **Provision** und **Ertrag gesamt** (Marge + Provision) — plus Aktive Bestellungen, Offene Lieferungen und Anzahl Produkte. Alles nur intern sichtbar.
- Der störende **Scrollbalken** auf der Partner-Detailseite ist ausgeblendet (Scrollen per Mausrad/Trackpad bleibt erhalten).

### Freigabe-Link für Kunden: Menge, Bild-Vorschau & Kostenübersicht
- **Geplante Menge sichtbar:** Auf jeder Produktkarte (einzeln und in Auswahl-Blöcken) steht jetzt klar **„Geplant: X Stk"** — also wie viel ihr vorgesehen habt — direkt neben der „Gewünschten Menge" des Kunden.
- **Bild-Vorschau (Lightbox):** Ein Klick auf ein Produktbild (großes Bild oder Block-Thumbnail) öffnet jetzt eine **große Vorschau** (mit „Vergrößern"-Hinweis beim Drüberfahren, schließt per ESC/Klick).
- **Kostenübersicht im Prüf-Schritt:** Die Seite „Bitte prüfen Sie Ihre Auswahl" zeigt nun eine **klare Kosten-Zusammenfassung** der freigegebenen Positionen (Netto, MwSt, Gesamt brutto, mit den Wunschmengen).

### Freigabe-Link: „Zwischenspeicher"-Bug behoben
- **Behoben:** Wenn im Admin-Bereich eine Freigabe geändert/zurückgesetzt wurde, konnte der Kunden-Link auf demselben Gerät die **alte** Entscheidung (z. B. „freigegeben") aus dem lokalen Zwischenspeicher wieder anzeigen. Jetzt gilt: Sobald ihr serverseitig etwas ändert, wird ein veralteter lokaler Entwurf beim Öffnen **verworfen** — der Admin-Stand gewinnt immer.
- Zusätzlich wird die Freigabe-Seite **nie mehr gecacht**, sodass Status-Änderungen sofort sichtbar sind.

### Partner-Kopf: altes Provisions-Badge entfernt
- Das veraltete Provisions-Badge (z. B. „Prozent · 10 %") im Partner-Kopf ist raus — Provision/Konditionen leben jetzt ausschließlich im „Konditionen"-Bereich.

### Detailseiten aufgeräumt (Partner & Kunde)
- Die Tab-Leiste (Übersicht/Kontakte/Konditionen/…) auf den **Partner- und Kunden-Detailseiten** sitzt jetzt dezent auf dem Seiten-Hintergrund statt als weißes Band — das unruhige „weiß → grau → weiß" im Kopfbereich ist weg und die Leiste kollidiert nicht mehr mit dem Scrollbalken am rechten Rand.

### Kalkulation & Partner-Konditionen
- **Partner-Konditionen ins Produkt übernehmen:** Im Produktformular erscheint jetzt — sobald ein Partner gewählt ist — ein Hinweis mit den hinterlegten Konditionen (Provision, Einkaufsrabatt, Zahlungsziel) und ein Button **„Vom Partner übernehmen"**. Abweichungen vom Partner werden markiert. Es wird **nichts** automatisch überschrieben.
- **Provision als Prozent ODER Fixbetrag:** Die Provision kann jetzt wahlweise als Prozentsatz (vom VK netto) oder als **Fixbetrag pro Stück** angegeben werden. Neu außerdem das Feld **Einkaufsrabatt (%)** im Produkt.
- **Konditionen-Editor überarbeitet:** Staffelungen und Kategorie-Sätze werden über komfortable Zeilen-Eingaben gepflegt (statt JSON-Text). Eine Kondition lässt sich als **Standard** markieren (Stern) — sie wird im Produkt bevorzugt übernommen.
- **Wirtschaftlichkeit pro Projekt & Raum (nur intern):** Projekt- und Raum-Übersicht zeigen jetzt **Einkauf, Marge, Provision und Gesamt-Ertrag** (Ertrag = Marge + Provision). Der CSV-Export enthält eine Provisions-Spalte. Für Kunden bleibt all das unsichtbar.
- **Angebot aus Produktliste** übernimmt jetzt **Rabatte** korrekt (identisch zu Produkttabelle, PDF und CSV).
- Die einfache Provisions-Einstellung beim Partner entfällt — Provision/Konditionen laufen vollständig über **„Konditionen"**. Migrationen **120** + **121** in Supabase ausführen; ohne sie läuft alles weiter wie bisher.

### Freigabe: mehr Entscheidungsfreiheit für Kunden (Mehrfachauswahl · Menge · Notiz)
- **Mehrfachauswahl in Auswahl-Blöcken:** Der Kunde kann jetzt **mehrere** Produkte aus einem Block wählen (z. B. zwei verschiedene Kissen) — vorher war es genau eines. Die Optionen sind jetzt Häkchen statt Radio-Buttons.
- **Wunsch-Menge:** Bei jedem Produkt kann der Kunde die **Stückzahl** über −/+ anpassen (z. B. „doch 3 statt 1"). Eure geplante Menge/Kalkulation bleibt unangetastet; in der Produkttabelle erscheint ein **„Kunde: X"**-Hinweis, wenn der Wunsch abweicht.
- **Notiz pro Auswahl-Block:** Unter jedem Block gibt es ein **Notizfeld** („z. B. 2× das graue, 1× das blaue Kissen"). Die Notiz erscheint beim Block in eurer Produkttabelle als **„Kundennotiz"**.
- Der Prüf-Screen vor dem Absenden zeigt jetzt alle gewählten Optionen mit Stückzahl und die Block-Notizen. Alles wird wie gehabt erst beim verbindlichen Absenden übermittelt.
- Migration **119** in Supabase ausführen (erlaubt Mehrfach-Wahl + Spalten `kunde_menge`/`kunde_notiz`). Ohne Migration läuft alles weiter — nur ohne die drei neuen Möglichkeiten.

## 2026-05-31

### Freigabe: Link-Vorschau + schönerer Prüf-Schritt
- **Link nachträglich öffnen/testen:** Im „Freigabe-Verlauf" eines Projekts gibt es jetzt pro Link ein **Augen-Symbol** — damit öffnet ihr den Kunden-Link in einer **Vorschau** (neuer Tab), auch wenn er bereits abgeschlossen, abgelaufen oder zurückgezogen ist bzw. eine PIN hat. In der Vorschau wird **nichts gespeichert oder gesendet** (oben ein deutlicher „Vorschau-Modus"-Hinweis). Sichtbar nur für eingeloggte Team-Mitglieder.
- **„Bitte prüfen"-Seite neu gestaltet:** Der finale Check-up vor dem Absenden sieht jetzt deutlich hochwertiger aus — mit Zusammenfassungs-Zahlen (Freigegeben/Änderung/Abgelehnt), Produktbildern, klaren Status-Pillen, der gewählten Option je Auswahl-Block und einer **festen Absende-Leiste** unten.

### Freigabe: Entwurf + finaler Check-up statt Sofort-Freigabe
- Im Kunden-Freigabe-Link werden Entscheidungen jetzt **nicht mehr sofort** übermittelt. Der Klient wählt/gibt frei/lehnt ab in Ruhe (Entwurf), sieht am Ende eine **Übersicht zum Prüfen** und sendet **erst dann verbindlich ab**. Vorher war ein Klick = sofort live bei euch.
- **Erst nach dem Absenden** erscheinen Auswahl & Freigaben bei euch im Dashboard. Solange der Klient dran ist, zeigt der Link-Status **„In Bearbeitung"**.
- Eingaben werden **lokal im Browser zwischengespeichert** — schließt der Klient den Tab versehentlich, sind sie beim erneuten Öffnen (gleiches Gerät) wieder da.
- Ein Hinweis-Banner macht klar: „noch nicht gesendet". Manipulations-/Scope-Schutz bleibt; unvollständige Freigaben werden serverseitig abgelehnt (kein Teil-Commit).
- Migration **118** (Spalte `bearbeitung_begonnen_am`) in Supabase ausführen — ohne sie funktioniert alles, nur ohne den „In Bearbeitung"-Status.

### Landingpage: rein informativ (kein Verkauf/Demo mehr)
- Die Startseite ist jetzt **neutral & sachlich informativ** statt SaaS-Verkaufsseite. **Entfernt:** „Demo anfragen" (überall + Formular), Preise/Beta-Bereich, Mitbewerber-Vergleiche (Houzz/Mydoma), erfundene Testimonials und unbelegte Zahlen („3× schneller" etc.), „kostenlos/Free-Plan/Tarife".
- Texte überall neutral umgeschrieben (kein „du als Designer / deine Kunden"); nur faktische Aussagen (Produktlisten, automatische Kalkulation, Freigabe per Link ohne Account, DSGVO/EU-Server).
- Unterseiten **/preise, /features, /faq entfernt** (Inhalte als Abschnitte auf der einen Startseite, Nav/Footer verlinken jetzt per Anker). **Team-Login bleibt** erhalten.

### Freigabe-Passwortschutz: echter Datentresor
- Der PIN-Schutz für Freigabe-Links ist jetzt **echter Schutz**: Die Produktdaten werden vom **Server erst nach korrekter PIN** ausgeliefert (vorher waren sie technisch schon im Seitenquelltext einsehbar, bevor die PIN eingegeben war). Verifizierung läuft über ein signiertes, manipulationssicheres Cookie; ändert der Admin die PIN, müssen offene Sitzungen neu eingeben.
- Sperre nach Fehlversuchen vereinheitlicht (5 Versuche → 15 Min) und gegen gleichzeitige Versuche abgesichert.
- Kleinere Robustheits-Härtungen im Kunden-Flow (keine Funktionsänderung). Der restliche Freigabe-Flow (Bereiche-Navigation, Auswahl, Abschluss) wurde geprüft und ist sauber.
- **Optional:** Migration **117** (atomarer Sperr-Zähler) kann in Supabase ausgeführt werden — ohne sie läuft alles unverändert weiter (Fallback).

### Raum-Produkttabelle: Zuordnen-Chip + Mehrfachauswahl
- **Aufgeräumte Zuordnung:** Statt zwei gestapelter Dropdowns erscheint beim Hovern jetzt **ein einziger Chip** mit der aktuellen Zuordnung; ein Klick öffnet ein kompaktes Popover mit **Gruppe** + **Auswahl-Block** (bei Produkten in einem Block: Hinweis „Gruppe folgt dem Block").
- **Mehrfachauswahl wie auf der Freigaben-Seite:** Checkbox je Zeile (grün), Auswahl auch ganzer Blöcke/Gruppen über die Kopf-Checkbox. Bei Auswahl erscheint unten eine **schwebende Leiste** mit „N ausgewählt", den **Summen NUR der ausgewählten** Produkte (EP / Provision / VP netto / VP brutto) und einem **Sammel-Löschen** (mit Rückfrage). Die normale Summenzeile bleibt das Raum-Gesamt.

### Raum-Seite: Timeline eingeklappt
- Die Timeline auf der Raum-Detailseite nimmt keinen Platz mehr weg — sie ist jetzt **standardmäßig eingeklappt** und lässt sich über den Button **„Timeline anzeigen"** bei Bedarf einblenden (und wieder ausblenden).

### Freigabe: neue „Gruppen"-Ebene (mehrere Empfehlungen je Gruppe)
- **Neue Ebene „Gruppe"** über den Auswahl-Blöcken: Eine Gruppe (z. B. „Lounge-Ecke", „Lichtplanung") bündelt jetzt mehrere **Auswahl-Blöcke** (Sessel-Auswahl, Tisch-Auswahl …) + Einzelprodukte. Dadurch sind **mehrere Empfehlungen pro Gruppe** möglich — pro Block eine. Die bisherige „1 von N"-Mechanik der Blöcke bleibt unverändert.
- **Raum-Produkttabelle:** Über „+ Gruppe" legst du Gruppen an; Blöcke und Einzelprodukte ordnest du ihnen per Dropdown zu. (Die frühere „Auswahl-Gruppe" heißt jetzt „Auswahl-Block".)
- **Freigabe-Link erstellen:** Beim Umfang „Auswahl" kannst du jetzt auch **ganze Gruppen** ankreuzen (nicht nur einzelne Produkte). Später hinzugefügte Produkte einer Gruppe sind automatisch dabei.
- **Kunden-Link:** geführte Navigation — oben der Raum, darin **pro Gruppe eine eigene Seite** mit „Weiter/Zurück" und Gesamt-Fortschritt. Übersichtlicher und klarer getrennt.
- Migration **116** (`produkt_bereiche` + Bereich-Zuordnungen + Scope-Erweiterung) muss in Supabase ausgeführt werden. Ohne Migration bleibt alles wie bisher (kein Fehler).
- **Optional:** Migration **116b** wandelt bestehende „Gruppen" automatisch in die neue Ebene um — ⚠️ dabei gehen gesetzte Favoriten verloren und Blöcke werden aufgelöst (danach per „+ Alternative" neu bauen). Nur ausführen, wenn gewünscht.

### Produktbilder per Drag & Drop
- Beim Anlegen/Bearbeiten eines Produkts kannst du Bilder jetzt **direkt vom Finder/Explorer/Desktop in den Bild-Bereich ziehen** (Drag & Drop) — kein Umweg mehr über den Datei-Dialog. **Mehrere Bilder gleichzeitig** möglich (bis 5). Der Bereich hebt sich beim Drüberziehen grün hervor; Klicken zum Auswählen funktioniert weiterhin. Nicht-Bilder/zu große Dateien (>10 MB) werden mit Hinweis abgewiesen.

### Alternativen pro Produkt hinzufügen (einfacher)
- **Neuer Weg, Alternativen anzulegen**: In der Raum-Produkttabelle erscheint beim Hovern über eine Zeile ein **Ebenen-Icon „Alternative(n) hinzufügen"**. Damit wird genau dieses Produkt automatisch zur ⭐-Empfehlung, und du wählst weitere Produkte als Alternativen dazu — entweder **schon im Raum vorhandene** oder direkt **aus der Bibliothek** (werden dann automatisch in den Raum aufgenommen). Die „Auswahl-Gruppe" entsteht unsichtbar im Hintergrund — das frühere „erst Gruppe anlegen, dann zuordnen" entfällt (funktioniert aber weiterhin).

### Freigabe-Modul: Härtung & Bugfixes vor Launch
- **Abschluss mit Auswahl-Gruppen funktioniert jetzt korrekt**: Wählt der Kunde in einer Gruppe seine Variante, zählt die Gruppe als EINE erledigte Entscheidung — nicht gewählte Alternativen blockieren den Abschluss nicht mehr (vorher hing es bei „Noch X offen" fest). Auch die Fortschrittsanzeige zählt jetzt pro Entscheidung statt pro Einzelprodukt.
- **Manipulationsschutz**: Nach dem Absenden einer Freigabe lassen sich Status & Auswahl nicht mehr nachträglich ändern; abgelaufene/zurückgezogene Links werden überall sauber abgewiesen.
- **Sicherheit**: Ein auf einen Raum/eine Auswahl begrenzter Freigabe-Link kann nur noch Produkte innerhalb seines Bereichs freigeben. Die PIN-Eingabe ist jetzt server-seitig gegen Brute-Force geschützt (15 Min. Sperre nach 5 Fehlversuchen). Das Freigabe-Protokoll (Audit) ist unveränderlich.
- **Übersichtlicher**: 1-Produkt-„Gruppen" werden im Kunden-Link als normales Einzelprodukt angezeigt; auf der Freigaben-Übersicht ist alles wie zuvor erkennbar.
- **Klick auf den Produktnamen** in der Raum-Produkttabelle öffnet jetzt den hinterlegten Produktlink in einem neuen Tab (sofern ein Link hinterlegt ist).
- Migration **115** (Audit append-only + PIN-Lockout-Spalten) muss in Supabase ausgeführt werden.

## 2026-05-30

### Freigabe-Modul: Räume in Gruppen unterteilen
- **Räume eines Projekts lassen sich jetzt in Gruppen bündeln** (z. B. „Erdgeschoss", „Obergeschoss") — für eine kompaktere Übersicht im Tab „Räume". Gruppen anlegen, umbenennen und löschen direkt über der Raum-Liste; jeder Raum wird per Auswahlfeld einer Gruppe zugeordnet. Gruppen sind ein- und ausklappbar. Beim Löschen einer Gruppe bleiben die Räume erhalten und wandern nach „Ohne Gruppe".

### Freigabe-Modul: Auswahl-Gruppen + Favorit/Alternative (Admin)
- **Produkte in einem Raum lassen sich zu „Auswahl-Gruppen" bündeln** (z. B. „Sofa-Auswahl" mit mehreren Alternativen). In der Produkttabelle eines Raums: Button „+ Auswahl-Gruppe" anlegen, Produkte per Auswahlfeld (beim Hovern sichtbar) zuordnen oder per Drag&Drop in eine andere Gruppe ziehen.
- **Favorit/Empfehlung markieren**: In einer Gruppe kann genau ein Produkt per ⭐-Stern als euer Favorit markiert werden, die übrigen gelten als Alternativen (Badge „Favorit" / „Alternative"). Diese Empfehlung wird dem Kunden später im Freigabe-Link angezeigt.

### Freigabe-Link: Kunde wählt Favorit (= Freigabe)
- **Auswahl-Gruppen erscheinen im Kunden-Freigabe-Link als Auswahl-Karte**: Der Kunde sieht alle Alternativen einer Gruppe nebeneinander, inkl. eurer **„Empfehlung"-Markierung**, und wählt per Klick seine bevorzugte Option.
- **Die Kundenwahl gilt automatisch als Freigabe**: Das gewählte Produkt wird „freigegeben", die anderen Alternativen der Gruppe bleiben offen (nicht abgelehnt). Solange in einer Gruppe noch nichts gewählt wurde, bleibt der Abschluss gesperrt. Einzel-Produkte (ohne Gruppe) funktionieren unverändert mit Freigeben/Ablehnen/Alternative.

### Freigabe-Übersicht: pro Raum statt eine lange Liste
- **Kunden-Freigabe-Link zeigt jetzt einen Raum nach dem anderen**: Oben eine Raum-Leiste (mit Anzahl offener Produkte bzw. ✓ wenn fertig) und „Vorheriger/Nächster Raum"-Navigation — statt einer einzigen langen Liste. Der Gesamt-Fortschritt oben bleibt projektweit.
- **Projekt-Detail, Tab „Freigaben": neue Raum-Übersicht** mit Fortschrittsbalken „X/Y freigegeben" pro Raum (nach Räume-Gruppen geclustert) und direktem Link in jeden Raum.
- Globale Freigaben-Seite: View „Gruppen" heißt jetzt „Nach Projekt" (klarere Abgrenzung zu den neuen Auswahl-Gruppen).
- **Globale Freigaben-Übersicht zeigt jetzt Auswahl-Gruppen mit an**: Produkte aus einer Auswahl-Gruppe bekommen den Gruppennamen (in der Raum·Projekt-Zeile) sowie ein Badge — ⭐ „Empfehlung" (euer Favorit), „Kundenwahl" (vom Kunden gewählt) oder „Alternative". So ist erkennbar, dass eine „ausstehende" Alternative kein offenes To-do ist, sondern nur eine nicht gewählte Option.

### Konfigurator abgelöst
- **Der separate „Konfigurator"-Link wird nicht mehr weiterentwickelt** — seine Funktion (Kunde wählt zwischen Alternativen) steckt jetzt im Freigabe-Link mit Auswahl-Gruppen. Im Handbuch weist ein Hinweis darauf hin; bestehende Konfigurator-Links funktionieren weiterhin.

## 2026-05-20

### Onboarding-Datei-Upload
- **Bilder-Upload funktioniert wieder**, auch wenn Migration 111 noch nicht in Supabase eingespielt wurde. Bei einem Foreign-Key-Fehler auf `organisation_id` wird der Datei-Eintrag jetzt als Fallback ohne `organisation_id` gespeichert — der Upload geht durch, statt mit einer roten Fehlermeldung abzubrechen.
- **Limit erhöht: jetzt bis zu 10 Dateien** pro Upload-Feld (vorher 5). Pro-Vorlage kann das Limit weiterhin im Editor überschrieben werden.
- **Migration 111 repariert**: Alte Version benutzte `information_schema` und sah den kaputten FK auf `auth.users` nicht (anderes Schema) — Migration brach mit `42710 constraint already exists` ab. Neue Version nutzt `pg_catalog`, dropt den kaputten FK zuverlässig und legt den korrekten FK auf `organisationen(id)` an. Idempotent — kann gefahrlos erneut ausgeführt werden.

### Onboarding-Status-Flow überarbeitet
- **Neuer Status „Eingereicht"** zwischen „Offen/In Bearbeitung" und „Abgeschlossen". Wenn der Kunde das Formular abschickt, landet die Anfrage auf **Eingereicht** — der Admin muss erst „Als Kunde anlegen" klicken, damit sie auf **Abgeschlossen** wechselt. Damit ergibt der Filter „Offen" wieder Sinn (= noch nichts vom Kunden zurückgekommen).
- **Bug behoben**: Frisch erstellte Links wurden sofort als „Eingereicht" angezeigt, obwohl noch nichts ausgefüllt war. Ursache: Beim Anlegen ohne verknüpften Kunden wurde der Titel fälschlich als `kunde_name` gespeichert, was die Status-Heuristik getriggert hat. Jetzt bleibt `kunde_name` leer, bis der Kunde wirklich tippt.
- **Backfill**: Alte Anfragen mit Status „Abgeschlossen", aber ohne verknüpften Kunden werden von Migration 113 automatisch auf „Eingereicht" zurückgesetzt — sie waren ja nie wirklich verarbeitet.
- Migration **113** (`onboarding_anfragen.status` CHECK + RLS-Policy + Backfill) muss manuell in Supabase ausgeführt werden — komplett additiv, keine bestehenden Daten gehen verloren.

### Onboarding-Doppel-Review (Kunde + Admin)
- **Kunde sieht vor dem Absenden alle seine Angaben in einem Popup** — Stammdaten, alle Frage-Antworten und hochgeladene Dateien. Buttons: „Zurück bearbeiten" (Modal schließt, Formular scrollt nach oben) oder „Verbindlich absenden" (sendet die Anfrage ab). Funktioniert sowohl im Standard- als auch im dynamischen Vorlagen-Formular.
- **Admin kann eingereichte Anfragen vor dem Anlegen prüfen und korrigieren**: Neuer Button „Daten prüfen & bearbeiten" öffnet ein Modal mit drei Tabs:
  - **Stammdaten**: Name, Email, Telefon, Projektname, Adresse, Budget, Zeitrahmen, Räume, Stil, Notizen.
  - **Antworten**: Jede vom Kunden ausgefüllte Frage kann hier direkt editiert werden (Upload-Felder verweisen auf den Dateien-Tab).
  - **Dateien**: Liste aller Uploads mit Download und Löschen.
  - Footer-Buttons: „Speichern" (nur sichern, Status bleibt „Eingereicht") oder „Speichern + Kunde anlegen" (sichert die Änderungen UND legt Kunde+Projekt mit den korrigierten Werten an).
- Tippfehler in Email/Name landen so nicht mehr ungefiltert in der Kunden-Datenbank.

### Onboarding-Stammdaten Auto-Fill + Umlaut-Cleanup
- **Stammdaten füllen sich jetzt automatisch aus den Antworten**: Bisher waren die Felder im Bearbeiten-Modal leer, wenn die Vorlage andere Frage-IDs als `kontakt_*` nutzte (z. B. `nk_name`, `pv_email`, `projekt_name`). Ein neuer Extraktor erkennt Name, E-Mail, Telefon, Projektname, Adresse, Budget-Range, Räume, Stil, Notizen und Zeitrahmen anhand von Frage-Typ und Pattern auf ID/Titel — egal welche Konvention die Vorlage benutzt.
- **Umlaute korrigiert**: Mehrere UI-Texte standen mit ASCII-Ersatz (`Raeume`, `Wuensche`, `pruefen`, `Loeschen`, `Schliessen`, `Hinzufuegen`, `Bestands-Moebel`, `Strasse`, …) drin und sind jetzt überall mit korrektem `ä/ö/ü/ß` geschrieben.

### Datei-Quick-View (Bilder + PDFs inline ansehen)
- **Endlich kein Download-Klick mehr für jeden Blick auf eine Datei**: Neuer Vollbild-Vorschau-Modus für Bilder (Lightbox) und PDFs (Browser-Viewer im iframe). Funktioniert an vier Stellen:
  - **Onboarding-Bearbeiten-Modal** → Tab „Dateien": Eye-Icon oder Klick auf den Dateinamen öffnet die Vorschau direkt.
  - **Projekt-Dateien** (Projekt-Detailseite, Card „Dateien"): gleiches Verhalten.
  - **Partner-Verträge**: Klick auf Icon-Box oder Vertragstitel öffnet die PDF inline; Eye-Icon zusätzlich im Hover-Aktions-Cluster.
  - **Chat-Anhänge**: PDF-Karten zeigen jetzt das Eye-Icon und öffnen die PDF im selben Modal-Stil wie die schon vorhandene Bild-Lightbox.
- Download-Button bleibt überall als Fallback erhalten (für „in neuem Tab öffnen" oder echtes Herunterladen). Für nicht-vorschaufähige Dateien (Word, Excel, Zip, …) zeigt der Modal stattdessen Datei-Metadaten + „Im neuen Tab öffnen / Herunterladen"-Buttons.

### Projekte überarbeitet — Phase 3 (Brutto-Default, Räume-Übersicht, PDF, Formular)
- **Brutto als Default im Budget-Ring**: Die große Summe oben in der Projekt-Übersicht zeigt jetzt den Bruttowert, der Netto-Wert erscheint im Tooltip beim Hover.
- **Projekt-Übersichts-Card im Räume-Tab**: Ausklappbare Card oben auf dem Räume-Tab — Produkt-Summen, Zusatzkosten, Service-Pauschale, Gesamt, Aufteilung pro Raum und Freigabe-Status. Werte stimmen mit PDF und Detail-Seite überein.
- **PDF-Export erweitert**: Pro Raum erscheinen Zusatzkosten als Aufzählung vor der Raum-Summe. Die Gesamtsumme enthält jetzt Produkte + Zusatzkosten + Service-Pauschale und schließt mit dem Zahlungsplan ab (alle Raten mit Status und Fälligkeitsdatum).
- **Projektformular vereinfacht**: Produkt-Budget rückt nach oben mit klarem „netto"-Label und Brutto-Hint darunter. Gesamtprojekt-Wert (Produkt + Service) wird live darunter berechnet — kein widersprüchliches manuelles Feld mehr. Das alte Gesamtbudget bleibt als ausklappbares „Legacy"-Feld erhalten, damit bestehende Projekte unverändert funktionieren.

### Projekte überarbeitet — Phase 1+2 (Bug-Fixes, Zusatzkosten, Service-Raten)
- **9000→9-Bug behoben**: Eingabefelder für Budgets/Beträge erkennen deutsche Tausenderpunkte jetzt korrekt — „9.000" wird als 9000 verstanden statt fälschlich als 9. Neuer zentraler `parseGeldwert()`-Helper in `src/lib/geld.ts`, sicher gegen alle Locale-Varianten.
- **„Erstes Produkt hinzufügen" öffnet jetzt das Modal** mit Auswahl „Aus Bibliothek" vs „Neues Produkt erstellen", statt direkt auf die Anlage-Maske zu springen.
- **Marge + Provision als eigene Tabellen-Spalte** in der Raum-Produkttabelle (intern sichtbar, kompakt formatiert).
- **Raum-Zusatzkosten**: Neue Pflege-Section pro Raum für Lieferung, Handwerker, Malerarbeiten, Montage und Sonstiges. Mit Kategorie, Netto-Betrag, Notiz. Fließen in die Budget-Auslastung mit ein, separat von der Servicepauschale.
- **Service-Pauschale-Raten**: Bei Service-Modell „Pauschale" kann jetzt ein Zahlungsplan mit Raten geführt werden — Betrag, Fälligkeitsdatum, Rechnungsdatum, Status (offen/gestellt/bezahlt). Mit Fortschritts-Balken „1 von 3 Raten bezahlt".
- **Zentrale Projekt-Kalkulation** (`src/lib/projekt-kalkulation.ts`) — eine Single-Source-of-Truth für alle Aggregationen. UI, Stats, PDF und CSV nutzen jetzt dieselbe Logik, damit die Summen überall identisch sind.
- Migration **112** (`raum_zusatzkosten` + `service_raten`) muss manuell in Supabase ausgeführt werden — komplett additiv, keine bestehenden Daten betroffen.

### Onboarding-Bugfixes (Round 3)
- **Datei-Upload funktioniert wieder**: Migration 111 repariert den Foreign-Key auf `onboarding_dateien` (und 9 weiteren Tabellen aus Mig 054/055), der fälschlich auf `auth.users` statt `organisationen` zeigte. Dadurch verursachte jeder Upload einen FK-Constraint-Fehler.
- **„Bereits eingereicht" wird nicht mehr sofort nach Submit gezeigt**: Der Customer-Pfad wird nach dem Absenden nicht mehr revalidiert — der Client-State mit dem Erfolgs-Screen bleibt. Bei einem erneuten Aufruf des Links sieht der Kunde dann zu Recht "Bereits eingereicht".
- **Sektion-Header im Customer-Formular**: Wenn die Vorlage in Sektionen unterteilt ist, werden die Section-Headings („Wohnort", „Rechnungsadresse", etc.) jetzt auch im Live-Link angezeigt — vorher waren alle Fragen flach untereinander, was bei wiederkehrenden Feldern wie Adressen verwirrend war.
- **„Wohnort übernehmen"-Button**: Wenn der Kunde in einer zweiten Adress-Sektion landet (z.B. abweichende Rechnungsadresse), erscheint ein Übernehmen-Button, der Straße/PLZ/Ort aus der ersten Adress-Sektion vorausfüllt.
- **Auto-Save-Indikator**: Oben im Formular zeigt jetzt ein kleines „Speichert…" / „✓ Gespeichert"-Label, dass die Eingaben zwischengespeichert werden.
- **Pflichtfeld-Counter pro Sektion**: Sektion-Header zeigt „3/5 ausgefüllt" — gibt Orientierung in langen Formularen.
- **Vorlage-Editor: White-Label und E-Mail-Tab entfernt**: Es bleiben nur die zwei Tabs „Felder" und „Einstellungen". Bestehende DB-Werte (Akzentfarbe, Logo-URL, E-Mail-Texte) bleiben unverändert erhalten — keine destruktive Migration.
- **„Als Kunde anlegen"-Button bleibt sichtbar**, bis der Kunde wirklich angelegt wurde. Vorher verschwand er nach Submit, weil die Anfrage nicht mehr „offen" war.
- **Conditional-Logic im Editor** sauberer Card-Style mit klarem Abstand und Schließen-Button rechts oben — kein Überlappen mehr mit benachbarten Fragen.
- **Vorschau-Modus für Admin**: Mit `?vorschau=1` an der Onboarding-URL kann ein eingereichtes Formular trotzdem zur Anschauung geöffnet werden.
- Migration **111** muss manuell in Supabase ausgeführt werden.

### Kunden-Bereich überarbeitet
- **Privatkunde / Firma / Beides** beim Anlegen: neuer Typ-Selektor im Kundenformular, getrennte Felder „Kundenname" und „Firmenname". Mindestens eines der Felder ist erforderlich. Bestehende Kunden bleiben unverändert sichtbar (Backfill: alle alten Einträge gelten als Firma, Firmenname aus dem bisherigen Namensfeld).
- **Kundenübersicht** zeigt Kunde und Firma getrennt — bei „Beides" mit Personen- + Firmen-Zeile, in der Listenansicht eigene Spalten. Suche umfasst jetzt auch den Firmennamen.
- **Notizen** sind jetzt direkt auf der Kundenübersicht statt im eigenen Tab. Alte Freitext-Notizen bleiben sichtbar.
- **Kontakt-Formular** vereinfacht: nur noch E-Mail und Mobil. Vorhandene Telefonnummern bleiben erhalten und sind weiterhin im „Telefon (alt)"-Feld einsehbar, nur bei neuen Kontakten ist das Feld weg.
- **Kommunikations-Einträge** ohne Richtungs-Dropdown (eingehend/ausgehend). Alte Werte bleiben in der DB, werden aber nicht mehr angezeigt.
- Migration **110** (`firmenname`, `kunden_typ` mit Backfill) muss manuell in Supabase ausgeführt werden.

### Features entfernt
- **Raumplaner**, **Moodboards** und **Feedback** sind aus der App entfernt. Drei Navigations-Einträge in der Sidebar verschwinden, kein Floating-Feedback-Button mehr, keine zugehörigen Routen, Komponenten oder Server-Actions im Code. Alte Direktlinks liefern jetzt eine saubere 404-Seite. Datenbank-Tabellen + Storage-Buckets bleiben unverändert im Hintergrund — falls ein Feature später wieder gebraucht wird, sind die Daten noch da.

### Einstellungen archivieren
- **Branding** und **Abrechnung** sind in den Einstellungen vorerst deaktiviert — die Tabs verschwinden aus der Settings-Sidebar. Direktaufruf der Branding-URL leitet sauber zur Profil-Seite weiter. Datenmodelle, Komponenten und gespeicherte Werte bleiben unverändert; Reaktivierung durch einen einzigen Flag-Wechsel in `src/lib/feature-flags.ts`.

### Onboarding Round 2 Bug-Fixes
- **Re-Open eingereichter Formulare blockt sofort**: Bisher konnte der Kunde nach einer Einreichung den Link nochmal öffnen und das Formular nochmal ausfüllen — erst beim Submit kam ein Fehler. Jetzt blockt die Seite sofort und zeigt direkt „Bereits eingereicht". Status wird ab jetzt zuverlässig auf `abgeschlossen` gesetzt (V1 hat das vorher vergessen). Auch Cache wird invalidiert, damit veraltete Seiten nicht zurückgeliefert werden.
- **Admin sieht jetzt ALLE Antworten**: Vorher zeigte die Detail-Ansicht oft nur den Namen, weil die dynamischen Antworten an einen Vorlage-Treffer geknüpft waren. Jetzt: auch ohne passende Vorlage werden alle gespeicherten Antworten als Key/Value-Liste gerendert — Uploads, mehrere Links und komplexe Werte werden mit dem passenden Renderer angezeigt.
- **Datei-Upload funktioniert zuverlässig**: Umstellung auf FormData-Pattern für stabile Datei-Übertragung über Server-Actions. Limit von 25 MB auf **50 MB** pro Datei erhöht. Default Multi-File-Limit bleibt 5.
- **Ausfüllzeit-Anzeige für Kunden**: Neues Feld „Geschätzte Ausfüllzeit (Min.)" pro Vorlage. Erscheint dem Kunden oben im Formular als „Dauert ca. 10 Minuten".
- Migration **109** (`geschaetzte_minuten` auf onboarding_vorlagen) muss manuell in Supabase ausgeführt werden.

### Migrations-Organisation
- **Migrationen 1-108 ins `applied/`-Unterverzeichnis verschoben** — alle sind in Production eingespielt und liegen jetzt unter `supabase/migrations/applied/`. Neue Migrationen kommen direkt in `supabase/migrations/`. Workflow ist in `supabase/migrations/README.md` dokumentiert: nach erfolgreichem Ausführen in Supabase per `git mv` ins applied-Verzeichnis. So sieht man in GitHub auf einen Blick, welche Migrationen noch offen sind.

### Onboarding-Komplettüberarbeitung
- **Kundenname bleibt sichtbar**: Beim Erstellen eines Onboarding-Links wird jetzt ein dauerhafter Titel (z.B. „Frau Müller") gesetzt, der nach Einreichung NICHT mehr überschrieben wird. Vorher verschwand der Name aus der Übersicht.
- **E-Mail-Versand entfernt**: Das Erstellen-Modal hat keine Empfänger-Email-Felder mehr. Statt automatischem Versand: nach Klick auf „Anlegen" erscheint ein Erfolgs-Screen mit dem Link, großem „Link kopieren"-Button und „Vorschau"-Link.
- **Kein Application-Error mehr**: Das Erstellen einer Anfrage zeigt Fehler jetzt im Modal als Toast (kein weißer Crash mehr) und der Link erscheint sofort in der Übersicht.
- **Datei-Upload funktioniert**: Upload-Felder im Kundenformular sind jetzt echte Drag&Drop-Felder. Mehrere Dateien (Bilder + PDF, max. 25 MB pro Datei, max. 5 standardmäßig) — mit Live-Liste, Entfernen-Button und Fehler-Anzeige. Im Admin-Bereich werden Uploads als anklickbare Download-Links angezeigt.
- **Mehrere Links erfassen**: Neuer Frage-Typ „Mehrere Links" — Kunde kann beliebig viele URLs mit optionalem Titel angeben, jeweils mit „Hinzufügen"- und „Entfernen"-Button. Im Admin als klickbare Liste.
- **Conditional Logic aktiv**: Felder mit Bedingung („nur anzeigen wenn X = Y") werden im Kundenformular jetzt korrekt ein-/ausgeblendet. Beispiel: Checkbox „abweichende Rechnungsadresse" zeigt das zusätzliche Adressfeld nur bei Bedarf. Versteckte Felder werden auch NICHT gespeichert.
- **Slider-Konfiguration respektiert**: Slider-Felder nutzen jetzt die im Editor eingestellten Min/Max/Einheit-Werte (vorher hardcoded 1–10).
- **Mehrfachauswahl-Limit**: `max_auswahl` wird im Kundenformular durchgesetzt mit Live-Anzeige „3/5".
- **Echte Renderer für Spezial-Typen**: Inventar, Prioritäten, Budget-Verteilung, Checkliste, Datums-Rechner — alle haben jetzt eigene Renderer statt Textarea-Fallback.
- **Admin-Detail zeigt alle Antworten**: Eingereichte dynamische Antworten werden gruppiert nach Sektion mit korrektem Renderer pro Frage-Typ (Upload → Download-Link, Links → klickbar, Budget → Tabelle, leere Felder → „—").
- Migration **108** (`titel`/`vorlage_snapshot` auf onboarding_anfragen, Storage-Bucket `onboarding-uploads`) muss manuell in Supabase ausgeführt werden.

### Bug-Fixes (Audit-Runde)
- **Produkt-Tabelle**: Wenn beim Löschen oder Sortieren ein Server-Fehler auftrat, blieb die UI im falschen Zustand stehen (Produkt schien entfernt, war aber noch in der DB). Jetzt erscheint bei Fehlern ein rotes Toast und die Liste setzt sich automatisch in den vorherigen Zustand zurück.
- **Räume-Sortierung**: Gleiches Problem behoben — Drag&Drop-Reihenfolge wird bei Fehler zurückgerollt mit Toast-Hinweis.
- **Chat-Anhänge**: Datei-Upload akzeptiert jetzt nur noch Bilder, Audio, PDFs und Office-Dokumente. Ausführbare Formate (HTML, SVG mit Script, EXE etc.) werden mit einer Fehlermeldung abgewiesen.
- **Sicherheit Inventar**: Inventar-Items konnten theoretisch von eingeloggten Usern in fremden Workspaces geändert werden (Multi-Tenancy-Lücke). Jetzt nur noch über den jeweiligen Onboarding-Token zugänglich.

## 2026-04-27

### Einstellungen Bug-Fixes
- **Aktivitätslog**: Header + Filter-Leiste bleiben jetzt beim Scrollen oben fixiert — Suchfeld und Aktion-/Entitäts-Filter sind so bei langen Logs immer erreichbar.
- **Branding Live-Vorschau**: rutschte beim Scrollen unter den Page-Header und war oben abgeschnitten. Position um 60 px nach unten angepasst, sodass die Vorschau bündig unter dem Page-Header andockt.

### Feedback-System (Sub-Commits 20a-h)
- **Floating Feedback-Button** unten rechts auf jeder Dashboard-Seite (rund, wellbeing-green, MessageSquare-Icon). Im Raumplaner-/Moodboard-Editor ausgeblendet, weil dort viel Overlay-UI ist.
- **Submit-Modal** mit Typ-Auswahl als Karten-Grid (🐛 Bug · 💡 Feature · ❓ Frage · ❤️ Lob · ✏️ Sonstiges), Titel + Beschreibung, optionaler Screenshot-Upload (Drag&Drop oder Klick, max. 10 MB). Aktuelle URL + Browser werden automatisch mitgeschickt — sichtbar als ausklappbarer „Was wird mitgeschickt?"-Block für Transparenz.
- **„Mein Feedback"-Tab** in den Einstellungen (unter „Persönlich") — User sehen ihre Einreichungen mit Status, eigenem Screenshot und Antwort vom Team.
- **Super-Admin-Bereich** unter `/super-admin/feedback` — geschützt durch ENV-Variable `SUPER_ADMIN_EMAILS` (Whitelist). Eigenes dunkles Backstage-Layout mit Master-Detail-Ansicht: Liste links mit Filter-Pills (Status/Typ) + Suche, Detail rechts mit Status- und Prioritäts-Toggle, internem Notiz-Feld, Antwort-Textarea und „E-Mail an User"-Toggle (sendet Antwort automatisch).
- **„Als Aufgabe übernehmen"-Hook**: Bug oder Feature direkt in mein eigenes Kanban-Board ziehen — Titel mit `[Bug]`/`[Feature]`-Präfix, User-Kontext + URL als Beschreibung, Priorität wird übernommen. Feedback bekommt Status „in_arbeit" und einen Link zurück zum Aufgaben-Board.
- Migration **106** (`feedback`-Tabelle + Storage-Bucket `feedback-screenshots`) muss manuell im Supabase SQL-Editor ausgeführt werden.
- Vor dem Live-Gehen `SUPER_ADMIN_EMAILS=samuel@…` als ENV-Variable in Vercel setzen.

### Freigaben: Checkboxen + Bulk-Action-Bar im Wellbeing-Style
- **Checkboxen** in der Freigaben-Übersicht waren native Browser-Inputs — nahmen die OS-/Browser-Akzentfarbe an (bei vielen Usern rot statt grün). Jetzt eigene `Checkbox`-Komponente in Wellbeing-Green mit weißem Häkchen, sauber im App-Style. Indeterminate-State (teilweise Auswahl in Gruppen) wird als „—" angezeigt.
- **Bulk-Action-Bar** unten beim Auswählen war schwarz mit bunten Pillen — passte nicht ins App-Design. Jetzt weiße Card mit dezentem Border und farbigen Tönungen statt Volltöne (emerald-50, red-50 etc.).
- **Position-Glitch behoben**: die Action-Bar sprang beim Erscheinen kurz nach rechts unten, dann erst mittig — gleicher Bug wie bei den Modals (CSS-Animation überschrieb das Tailwind-Zentrieren). Jetzt sauberes Flexbox-Center-Layout, kein Springen mehr.

### Aufgaben-Board: Filter kombinierbar + Crash-Schutz
- **Filter-Pills sind jetzt zwei unabhängige Gruppen** — Zeit-/Owner-Filter (Alle/Mir/Heute/Diese Woche/Überfällig) und Kontext-Filter (Alle/Mit Projekt/Intern) lassen sich gleichzeitig setzen. Beispiel: „Mir" + „Intern" zeigt alle internen Aufgaben die mir zugewiesen sind. Beide Gruppen visuell getrennt durch einen kleinen Trenner.
- **White-Screen-Crash beim Bearbeiten von Aufgaben behoben**: ErrorBoundary um Board, View und Detail-Modal — bei Render-Fehlern erscheint jetzt eine Recovery-Card mit „Neu laden"-Button statt einer leeren Seite. Plus: das Detail-Modal lud bei jedem Server-Refresh seinen State neu (auch während aktivem Inline-Edit), was Race-Conditions und Crashes verursachen konnte. Behoben — State wird jetzt nur bei Aufgaben-Wechsel reinitialisiert.

### Aufgaben-Board: Trennung Intern / Mit Projekt
- Zwei neue **Filter-Pills**: „Mit Projekt" (nur Aufgaben mit Projekt-/Kunden-Verknüpfung) und „Intern" (nur Aufgaben ohne) — visuell getrennt von den Zeit-Filtern durch einen kleinen Trenner.
- Cards ohne Verknüpfung zeigen jetzt einen dezenten **„Intern"-Indikator** mit grauem Punkt — vorher waren sie kontextlos.

### Aufgaben-System massiv erweitert (Sub-Commits 11-19h)

**Manuelle Verknüpfung & Zuweisung**
- **„Neue Aufgabe"-Buttons mit vollem Formular** im Kanban-Board (oben rechts) und im Dashboard-Widget (Plus-Icon). Im Detail-Modal lassen sich Projekt · Kunde · Raum jederzeit nachträglich auswählen oder ändern — Projekt-Wahl filtert die Raum-Liste automatisch und übernimmt den Kunden des Projekts, sofern noch keiner gesetzt war. Inline-Quick-Add per Spalte (+) bleibt für ultraschnelles Anlegen ohne Verknüpfungen.
- **„Backlog"-Spalte umbenannt** zu „Offen" — verständlicher für Nicht-Tech-User. Filter „Offen" im Projekt-Tab heißt jetzt „Aktiv" (= alles nicht-erledigt).
- **Assignee-Picker**: jede Aufgabe lässt sich einem Team-Mitglied (oder dem Kunden) zuweisen — mit „Mir zuweisen"-Quick-Action, Avataren und Suche. Karten im Board zeigen den Avatar des Verantwortlichen rechts unten.
- **„Mir"-Filter im Kanban-Board funktioniert jetzt** — vorher Stub.
- **Suchfeld im Kanban-Board** sucht clientseitig in Titel, Beschreibung, Tags, Projekt-/Kunden-/Raumnamen. Kombinierbar mit Filter-Pills.
- **Vertrags-Meilensteine**: pro Vertrag öffnet ein Flag-Icon-Button ein Modal mit Meilenstein-Liste (Anzahlung 30%, Abnahme, Schluss-Rechnung etc.). Pro Meilenstein wird automatisch eine Aufgabe ins Kanban-Board übernommen — Status-Wechsel syncen sich beidseitig. **4. Auto-Sync-Quelle** komplett.
- **E-Mail-Notification bei Zuweisung**: wer eine Aufgabe an Team-Mitglied oder Kunde zuweist, löst automatisch eine E-Mail an den Empfänger aus mit Titel, Beschreibung, Fälligkeit, Priorität, Projekt/Kunde und CTA-Link. Eigene Selbst-Zuweisungen + Auto-Tasks lösen keine Mail aus. Setzt `RESEND_API_KEY` voraus.

**UX-Polish & Bug-Fixes**
- **Drag&Drop in leere Spalten**: vorher konnten Karten nur in Spalten gedroppt werden, die schon Karten enthielten. Jetzt sind alle 4 Spalten gleichermaßen Drop-Targets, mit visuellem Feedback (grüner Schimmer + Ring) während des Drags. Empty-State-Text geändert von „Keine Aufgaben" → **„Hierher ziehen"**.
- **Modal-Position-Glitch behoben**: Aufgaben-Modals sprangen beim Öffnen kurz nach rechts unten und dann erst in die Mitte. Lag an einer CSS-Animation die das Tailwind-Zentrieren überschrieben hat. Jetzt sauberes Flexbox-Layout — kein Springen mehr.
- **Anhänge entfernen**: Anhänge konnten zwar hochgeladen aber nicht wieder entfernt werden. Jetzt zeigt jede Anhang-Zeile beim Hover einen X-Button.
- **Kommentare bearbeiten + löschen**: eigene Kommentare können jetzt nachträglich bearbeitet (Inline-Textarea mit Cmd+Enter speichern) oder gelöscht werden. Hover-Aktionen nur bei eigenen Kommentaren — Kunden-Kommentare bleiben unveränderbar.
- **Kanban-Cards designtechnisch aufgepeppt**: linker Akzent-Streifen in Prio-Farbe, Tags als bunte Pills, Auto-Quelle als ⚡-Badge, Checkliste mit Progress-Bar + Prozent-Anzeige, Hover-Effekt mit subtle Lift, Footer mit Trennlinie. Erledigte Karten mit Strikethrough + dezent.
- **Keine Browser-Popups mehr**: alle nativen `confirm()`-Dialoge (Aufgabe löschen, Anhang entfernen, Kommentar löschen, Meilenstein löschen) durch das App-eigene `ConfirmModal` ersetzt — konsistent zum Rest der App, mit ESC-Schließen und Loading-State.

**Trello-Parity-Pack**
- **Labels mit Farbe** (Migration 103): pro Org definierbare Labels mit Name + Farbe (11 Presets oder Custom-HEX). Im Aufgaben-Modal Multi-Select-Picker mit Inline-Anlegen/Bearbeiten/Löschen. Auf den Kanban-Cards prominent oben als bunte Pills (max 4 sichtbar + „+N"-Indikator). Ersetzt das alte Free-Tag-System.
- **Aufgaben archivieren** (Migration 104): statt direkt löschen kann man Aufgaben jetzt archivieren — verschwinden aus dem Board, sind aber wiederherstellbar. Im Header-Detail-Modal der Standard-Action ist Archivieren (grün), Löschen (rot, „endgültig") als sekundär. Eigene Archiv-Ansicht via `?archiviert=1` mit Toggle-Button.
- **Activity-Log pro Aufgabe**: im Detail-Modal ausklappbarer Block „Aktivitäten" mit chronologischer Liste (User + lesbare Aktion wie „Status: Offen → In Arbeit" + Zeitstempel).
- **Listen-Ansicht**: View-Toggle oben rechts mit Board / Liste / Kalender. Listen-Ansicht zeigt alle Aufgaben in sortierbarer Tabelle.
- **Kalender-Ansicht**: Monatsansicht mit Aufgaben pro Tag als farbige Pills. Heute hervorgehoben, Wochenende dezent, Navigation per Vor/Zurück + „Heute"-Button.
- **Aufgaben duplizieren + Vorlagen** (Migration 105): Copy-Button im Detail-Header dupliziert eine Aufgabe (mit „(Kopie)"-Suffix). Bookmark-Button speichert sie als wiederverwendbare Vorlage. Im „Neue Aufgabe"-Modal oben Quick-Picker „Aus Vorlage starten".
- **@-Mentions in Kommentaren**: tipp `@` im Kommentar-Feld → Autocomplete-Dropdown mit Team-Mitgliedern (Suche + Pfeiltasten + Enter). Beim Speichern automatische E-Mail an die genannten User.
- **Mobile-Optimierung**: Touch-Sensor für Drag&Drop (Long-Press 200ms) — funktioniert jetzt auf Tablet/Phone. Aufgaben-Modals werden auf mobile zu Bottom-Sheets (von unten, fast volle Höhe, top-rounded), kompakteres Padding, Sidebar landet unter dem Body statt rechts.
- Migrationen **103/104/105** müssen manuell im Supabase SQL-Editor ausgeführt werden.

## 2026-04-26

### Aufgaben-/ToDo-System (Trello-Style Kanban) — Foundation (10 Sub-Commits)
- **Neuer Sidebar-Eintrag „Aufgaben"** (ListChecks-Icon) mit Badge für überfällige offene Aufgaben des aktuellen Users.
- **Globales Kanban-Board** unter `/dashboard/aufgaben`: 4 feste Spalten (Backlog · In Arbeit · Review · Erledigt) mit Drag&Drop zwischen und innerhalb der Spalten, optimistisches UI, Quick-Add je Spalte (Enter zum Speichern), Filter-Pills (Alle · Mir · Heute · Diese Woche · Überfällig). Cards zeigen Prioritäts-Punkt, Fälligkeits-Datum (rot wenn überfällig), Projekt/Kunden-Verknüpfung, Checklisten-Counter und Auto-Quelle-Indikator.
- **Detail-Modal** beim Klick auf eine Card: 2-Spalten-Layout mit Inline-editierbarem Titel/Beschreibung (Auto-Save), Status-Dropdown, Prioritäts-Picker, Fälligkeits-Datepicker, Kunden-Beteiligungs-Toggles, Inline-Checkliste, Datei-Anhänge (Upload + signierte Vorschau), Live-Kommentare per Realtime.
- **Auto-Sync aus 3 Quellen**: Reklamationen erzeugen automatisch Tasks in „In Arbeit", werden bei Lösung erledigt; Lieferanten-Bestellungen werden bei Bestätigung/Versand zu Lieferungs-Tasks (mit Liefertermin als Fälligkeit), bei Lieferung erledigt; Onboarding-Submissionen erzeugen „Onboarding prüfen"-Task. Alle Hooks failsafe — Sync-Fehler crashen nie die Haupt-Action.
- **Dashboard-Widget „Meine Aufgaben"** mit Quick-Erledigt-Button und Fälligkeits-Anzeige; ROW 2 nun 3-spaltig (Deadlines · Follow-ups · Aufgaben).
- **Projekt-Detail-Tab „Aufgaben"** mit Filter (Offen/Erledigt/Alle), Inline-Quick-Add mit auto-verknüpften kunde_id/projekt_id, kompakter Listenansicht und Modal-Detailansicht.
- **Portal „Was du tun sollst"**: Kunden sehen ihnen zugewiesene Aufgaben (assignee_kunde) und sichtbar markierte Aufgaben (sichtbar_fuer_kunde) im Portal-Dashboard; können erledigen mit Toggle-Button und Kommentare schreiben (`ist_kunde=true`).
- **Realtime**: Board updated live wenn andere Team-Mitglieder Aufgaben verschieben/anlegen; Modal-Kommentare erscheinen ohne Refresh.
- Migration **102** (`aufgaben` + `aufgaben_kommentare` Tabellen, Indizes, RLS, Storage-Bucket „aufgaben-anhaenge", Realtime) muss manuell im Supabase SQL-Editor ausgeführt werden.

### Bestell-Workflow KOMPLETT überarbeitet (11 Sub-Commits)
- **Foundation** (Migration 100): Bestellstatus-Enum erweitert um Storniert · Teilgeliefert · Mangel · Retoure unterwegs · Retoure erhalten. Neue Tabellen `produkt_reklamationen` (mit Foto-Upload, 6 Typen, 5 Status, Lösungs-Tracking, Gutschrift-Betrag) und `lieferanten_bestellungen` + Junction für **Sammelbestellungen** über mehrere Räume hinweg. Neue Storage-Buckets, Bestellnummer-Generator `BS-YYYY-NNN`, Realtime, Audit-Log-Aktionen.
- **Reklamations-UI im Raum-Detail**: Drei-Punkte-Menü pro Produkt mit Reklamations-Button (orange) → Modal mit Typ-Auswahl, Beschreibung, Multi-Foto-Upload, Optionen für Bestellstatus + Kunden-Sichtbarkeit.
- **/dashboard/bestellungen Übersicht** (neu in Sidebar): 5 Tabs — Zu bestellen (gruppiert nach Lieferant) · Unterwegs · Diese Woche · Reklamationen (mit Dringlichkeits-Marker bei >7 Tagen offen) · Archiv. Suchfeld, Filter-Pills, Status-Badges, Sammelbestellungs-Vorschlag pro Lieferanten-Gruppe.
- **Bestellungs-Detail-Seite** + Erstell-Workflow: Bestelldaten editierbar (Bestellnummer, Liefertermin, Tracking-URL, Lieferschein-Nr., Versandkosten), PDF-Upload für Bestellbestätigung, Positions-Liste mit Mengen+Preisen+Zwischensummen, Status-Transitions (Bestätigen/Versandt/Geliefert/Stornieren) synchronisieren raum_produkte automatisch.
- **Sammelbestellungs-Erstellen**: pro Lieferant aus allen offenen freigegebenen Produkten auswählen, Mengen+Preise editierbar, Vorschlag „Zu existierender Bestellung anhängen" wenn der Lieferant schon einen Entwurf hat.
- **Dashboard-Widgets**: 4 neue KPI-Karten (Zu bestellen · Unterwegs · Diese Woche · Reklamationen) direkt unter den Haupt-KPIs, mit Direktlinks zu den entsprechenden Tabs.
- **Kunden-Portal**: neuer Tab „Lieferungen" (Truck-Icon, Badge mit offenen Reklamationen) — Kunde sieht pro Produkt Bestellstatus + Daten (Bestellt/Liefertermin/Erhalten) + verschachtelte Reklamations-Anzeige mit Status + Lösung wenn gelöst. Banner oben bei offenen Reklamationen.
- **Lieferanten-E-Mail**: Ein-Klick „E-Mail an Lieferant"-Button auf Bestellungs-Detail-Seite — generiert komplette Plain-Text-Vorlage mit nummerierten Produkten + Mengen + Preisen + Gesamtsumme + Liefertermin-Wunsch, öffnet System-Mail-App via mailto.
- **Re-Order-Indikator** in Produkt-Bibliothek: bewährte Produkte (mind. 1× erfolgreich geliefert) bekommen einen grünen Badge `✓ N× geliefert` als Hinweis fürs schnelle Wieder-Zuweisen.
- **Garantie-Tracking** (Migration 101): neue Spalten `gewaehrleistung_bis` + `gewaehrleistung_monate` (default 24) auf `raum_produkte` mit auto-Trigger der bei Lieferung das Gewährleistungs-Datum berechnet. Backfill bestehender Datensätze. Index für Cleanup-Jobs.
- **Kommunikation pro Produkt** (Migration 101): `raum_produkte_id` (optional) auf `kommunikation` — Spalte da, UI-Integration kann später folgen.
- **Vertrag-Auto-Hook**: wenn Kunde + Firma einen Vertrag unterschrieben haben, werden automatisch pro Lieferant Bestellungs-Entwürfe mit allen freigegebenen+ausstehenden Produkten des Projekts angelegt — Designer findet sie sofort in der Bestellungen-Übersicht „Zu bestellen / Entwürfe".
- Migrationen **100** + **101** müssen manuell im Supabase SQL-Editor ausgeführt werden.

### Bestell-Workflow überarbeitet — Foundation (Sub-Commit 1/11)
- Migration **100** legt das Datenmodell für den vollständigen Bestell-Lifecycle: erweitert das `bestellstatus_enum` um **5 neue Zustände** (Storniert · Teilgeliefert · Mangel gemeldet · Retoure unterwegs · Retoure erhalten), neue Tabellen `produkt_reklamationen` (mit Foto-Upload, Lösungs-Status, Gutschrift-Betrag) und `lieferanten_bestellungen` + Junction `lieferanten_bestellung_positionen` (für Sammelbestellungen über mehrere Räume), Storage-Buckets `reklamation-fotos` und `bestellung-dokumente` (je 25 MB), Bestellnummer-Generator `BS-YYYY-NNN`.
- Status-Badges in der Produkt-Tabelle erkennen die neuen Zustände visuell (Mangel = orange/Warning, Retoure = indigo/slate, Storno = rot).
- Backend-Aktionen, UIs für Reklamationen + Bestellungen-Übersicht folgen in den nächsten Commits.
- Migration **100** muss manuell im Supabase SQL-Editor ausgeführt werden.

### Moodboard Polish — Raum-Detail & rechtes Properties-Panel modernisiert
- **Raum-Detailseite** zeigt jetzt **Grundriss + Moodboard nebeneinander** im linken Bereich (3/5), beide mit gleichem Card-Style — Header mit Icon + Status, Vorschau, „Öffnen →"-Button. Falls noch kein Moodboard existiert: gestrichelte Card als Empty-State (analog zum Grundriss-Empty-State).
- **Properties-Panel** komplett neu gestaltet im Figma-Stil:
  - **Slim-Slider** statt klobige Browser-Slider — schmaler Track (4 px) + weißer 14-px-Knopf mit Schatten + Hover-Scale, Wert-Anzeige inline rechts neben dem Label.
  - **Kompakte Inline-Inputs** für Position/Größe (X / Y / W / H) — Label im Feld links integriert statt separate Reihe.
  - **Markierungen als Emoji-Bar**: 5 große Emojis nebeneinander, Active-State mit weißem Ring + Scale, Label nur unten als Inline-Text.
  - **Layer-Aktionen kompakt**: Lock-Toggle als Full-Width-Button + 4 Icon-Buttons (Vor/Zurück/Duplizieren/Löschen) als Strip statt Text-Buttons.
  - Sektionen jetzt mit Trennlinien + einheitlichem Label-Stil (10 px UPPERCASE letterspacing).
  - Aktive Markierung wird als kleines Eck-Badge im Panel-Header angezeigt.

### Moodboard UX-Fixes — Pan mit Maus & sichtbares Raster
- **Pan auf leerem Canvas**: Linksklick + Drag auf einer leeren Stelle pannt jetzt das Board (wie in Miro / Figma / Apple Freeform). Space halten ist nicht mehr nötig — Cursor zeigt Hand-Symbol auf leerem Bereich, Move-Symbol über Objekten.
- **Sichtbares Raster**: neuer Grid-Button in der Toolbar mit Dropdown — Aus / Klein (20 px) / Mittel (40 px) / Groß (80 px). Punktraster fliegt mit Pan + Zoom mit, blendet sich bei zu starkem Auszoomen automatisch aus (Moiré-Schutz).

### Moodboard-Sync mit Raumplaner & Workflow-Status
- **Raumplaner-Übersicht**: pro Raum-Card zeigt jetzt auch den Moodboard-Status — zwei gleichberechtigte Buttons unten (Planer + Moodboard) jeweils mit grünem Status-Dot wenn vorhanden, grau wenn leer. List-View entsprechend mit kleinem Moodboard-Icon-Button vor dem Planer.
- **Moodboard-Übersicht**: neue Sektion „Räume ohne Moodboard" am Ende — listet alle Räume aller Projekte ohne Board als gestrichelte Cards. Klick öffnet den Editor und legt automatisch ein leeres Board an.
- **Voting-Markierungen pro Element**: 5 Markierungen (⭐ Favorit · 👍 Gefällt mir · 👎 Passt nicht · ✅ Final · ❓ Unsicher) als Picker im Eigenschaften-Panel. Markierte Elemente bekommen ein farbiges Eck-Badge mit Emoji (mitfliegend mit Zoom + Pan).
- **Moodboard-Status (Workflow)**: Migration **099** ergänzt eine `status`-Spalte mit 4 Phasen (Entwurf · In Abstimmung · Freigegeben · Archiviert). Status-Dropdown im Editor-Header (oben rechts), Status-Filter-Tabs auf der Übersicht, Status-Badge zusätzlich zur Freigabe-Badge auf jeder Card.
- Migration **099** muss manuell im Supabase SQL-Editor ausgeführt werden.

### Moodboard Step 8 — Erweiterte Freigabe (Passwort + Ablaufdatum)
- Migration **098**: zwei neue Spalten auf `moodboards` — `freigabe_passwort_hash` (bcrypt) und `freigabe_ablauf` (Timestamp).
- Im Freigabe-Modal des Editors zwei neue Sektionen:
  - **Passwort-Schutz**: Input + „Setzen"-Button → bcrypt-Hash auf Server. Wenn aktiv: grünes „Passwort ist aktiv"-Banner mit „Entfernen"-Link.
  - **Ablaufdatum**: Date-Picker (Ende des Tages, ISO), „Entfernen"-Link, Hinweis „Link läuft am … ab".
- Öffentliche Seite `/moodboard/[token]`:
  - Wenn Passwort gesetzt → **Passwort-Gate** mit eigenem UI (Logo + Lock-Icon + Input + Fehler-Anzeige bei falschem Passwort, Passwort wird via `?pw=` URL-Parameter weitergegeben).
  - Wenn Ablauf erreicht → eigene **„Freigabe-Link abgelaufen"-Seite** mit Hinweis Designer zu kontaktieren.
- Migration **098** muss manuell im Supabase SQL-Editor ausgeführt werden.

### Moodboard Step 7 — PDF-Export & Präsentations-Modus
- **PDF-Export-Button** in der Toolbar (FileText-Icon): rendert das Board mit Auto-Bounding-Box und 2×-Auflösung als A4-PDF (auto landscape/portrait je nach Aspect), grüner Header mit Boardname + Raum, mittiges Bild, Footer mit Datum + Branding.
- **Präsentations-Modus** (Presentation-Icon): blendet Top-Bar, beide Sidebars und Status-Bar aus — nur Canvas + ein „Präsentation beenden (ESC)"-Floating-Button bleibt sichtbar. ESC oder Klick auf den Button verlässt den Modus.

### Moodboard Step 6c — Kunden-Pins auf Freigabe-Seite
- Auf der öffentlichen `/moodboard/[token]`-Seite erscheint bei aktiven Kommentaren ein **„Kommentar hinzufügen"-Button** (oben rechts) + amber Badge im Header (`Kommentare aktiv`).
- Pin-Modus: Cursor wechselt auf Crosshair, Klick aufs Board öffnet einen Eingabe-Dialog mit Name (Pflichtfeld, wird in localStorage gespeichert), optionale Email, Kommentar-Textarea + ⌘/Ctrl+Enter zum Absenden.
- Kunden-Pins werden amber angezeigt, mit „Kunde"-Badge im Thread-Header. Kunden können auch auf bestehende Pins antworten (selber Name/Email-Flow).
- Backend-Schutz: Anon-Insert nur erlaubt wenn `freigabe_aktiv=true` UND `freigabe_kommentare_aktiv=true` (RLS-Policy).

### Moodboard Step 6 — Kommentar-Pins (intern + Kunden-Freigabe)
- Migration **097**: neue Tabelle `moodboard_kommentare` mit threaded structure (parent_id self-referencing), World-Koordinaten, Erledigt-Flag, Realtime-Publication. RLS org-scoped + Anon-Select/Insert wenn Moodboard freigegeben + Kommentare erlaubt.
- **Pin-Tool** in der Toolbar (MessageSquare-Icon) — Klick auf Canvas öffnet Pin-Entwurf mit Textarea + ⌘/Ctrl+Enter zum Speichern.
- **Pin-Bubbles** (kleiner Kreis mit Nummer) erscheinen über dem Canvas, wandern mit Zoom + Pan mit. Farben: grün (Team-Pin), amber (Kunde-Pin), grün-Check (erledigt).
- **Klick auf Pin** öffnet einen Thread: Kommentar + alle Antworten + Antwort-Box. Header-Aktionen: Erledigen-Toggle, Löschen, Schließen.
- Server-Actions: `getMoodboardKommentare`, `moodboardKommentarAnlegen`, `moodboardKommentarAntworten`, `moodboardKommentarErledigen`, `moodboardKommentarLoeschen` + Anon-Variante `moodboardKundenKommentarAnlegen` für die Kunden-Freigabe-Seite.
- Migration **097** muss manuell im Supabase SQL-Editor ausgeführt werden.

### Moodboard Step 5b — Layer-Panel (Ebenen-Liste)
- Neuer Layer-Toggle-Button (Layers-Icon) öffnet rechts ein **Ebenen-Panel** mit allen Top-Level-Elementen, sortiert von der vordersten zur hintersten Ebene.
- Pro Eintrag: Typ-Icon + Name (Bilder zeigen den Produktnamen falls verknüpft, Links die Domain, Notizen zeigen „Notiz", Sektionen den editierten Titel), Hover-Buttons für **Eine Ebene vor/zurück**, **Sperren/Entsperren** (Lock-Icon wechselt Farbe), **Sichtbarkeit ein/aus** (Eye-Icon).
- Klick auf Eintrag selektiert das Element auf dem Canvas. Aktives Element wird grün hervorgehoben.
- Live-Update bei add/remove/modify. Smart-Guides werden im Panel ausgeblendet.

### Moodboard Step 5a — Sektionen & Element-Sperren
- **Sektion einfügen**: neuer Toolbar-Button (BoxSelect-Icon) erzeugt eine beschriftete Bereichs-Box mit Header-Streifen (wellbeing-green) + Titel-Label „SEKTION" — landet automatisch im Hintergrund, sodass User Inhalte rein-/raus-ziehen können. Titel ist editierbar.
- **Element sperren**: Lock-Toggle im Eigenschaften-Panel — gesperrte Elemente lassen sich nicht mehr verschieben, skalieren oder rotieren (lockMovement/lockScaling/lockRotation), Cursor zeigt „not-allowed" an. Button wechselt zu „Gesperrt — Klick zum Entsperren" mit amber-Akzent.

### Moodboard Step 4 — Smart-Guides, Snap-to-Grid & Auto-Distribute
- **Smart-Guides** beim Drag: rote gestrichelte Linien erscheinen wenn das Element auf 6 px genau mit Kante/Mitte eines anderen Elements ausgerichtet ist — und es rastet automatisch ein. Toggle-Button (Magnet-Icon) in der Toolbar.
- **Snap-to-Grid**: zweiter Toggle (⌗-Icon) — Objekte rasten beim Verschieben auf 20-px-Raster ein.
- **Auto-Align bei Mehrfach-Selektion**: das Eigenschaften-Panel zeigt bei 2+ markierten Objekten 6 Ausrichtungs-Buttons (Links/Mittig/Rechts horizontal · Oben/Mittig/Unten vertikal). Bei 3+ Objekten zusätzlich „Horizontal/Vertikal verteilen" für gleichmäßigen Abstand.
- Smart-Guides werden mit `excludeFromExport` markiert — landen also nicht in DB/Versionen/PNG-Export.

### Moodboard Step 3 — Link-Preview-Cards & Sticky-Notes
- **Link-Tool** in der Toolbar: Modal mit URL-Eingabe → Server zieht OG-Tags (Titel, Beschreibung, Hero-Bild, Domain, Favicon) → eine fertige weiße **Karte** wird aufs Board platziert (Vorschaubild oben, Titel + Beschreibung mittig, Domain als Footer). Sicherheit: Auth-Check + SSRF-Schutz, max 500 KB HTML, 8 s Timeout.
- **Sticky-Note-Tool**: Kleines Farbpicker-Popover (5 Pastelltöne — Gelb, Rosa, Grün, Blau, Cream) → Klick erzeugt eine schiefe Notiz mit Schatten + Eckabriss-Effekt, direkt editierbar.
- Beide Elemente schließen das Welcome-Modal automatisch und lösen Auto-Save aus.

### Moodboard Step 2 — Schnelles Sammeln (Drag&Drop · Multi-Upload · Paste)
- **Drag & Drop**: Bilder aus dem Datei-Explorer können jetzt direkt aufs Canvas gezogen werden — wenn ein File ge-draggt wird, erscheint ein grüner Drop-Overlay mit „Bilder hier ablegen"-Hinweis. Bilder landen exakt an der Drop-Position.
- **Multi-Upload**: Upload-Button + File-Input akzeptieren mehrere Dateien gleichzeitig — sie werden nacheinander hochgeladen und versetzt aufs Board gestapelt.
- **Paste aus Zwischenablage**: Cmd/Ctrl + V mit kopiertem Bild fügt es direkt ein (z. B. Screenshot oder Bild aus Browser).
- **Toast-System** für Fehler/Erfolg (oberhalb Canvas, blendet nach 3,5 s aus); Status-Bar zeigt jetzt alle Sammel-Shortcuts.

### Moodboard Step 1 — Welcome-Modal & Templates
- Beim Öffnen eines leeren Moodboards erscheint jetzt ein **Welcome-Modal** mit 4 Schnellstart-Optionen (**Leer starten / Bild hochladen / Link einfügen / Aus Projekt** — die letzten beiden für spätere Steps vorbereitet) und 6 vordefinierten **Templates** zur Wahl.
- Templates: **Skandinavisch · Boho/Ethno · Modern Hotel · Bürospace · Wohnen warm · Industrial/Loft**. Jedes liefert eine vorbereitete Farbpalette (5 Swatches), Stichwort-Liste, Material-/Akzent-Box und einen Stil-Header — User kann sofort weiterarbeiten statt auf einer leeren Fläche zu sitzen.
- Template-Cards zeigen Mini-Streifen mit den 5 Hauptfarben + Emoji + Beschreibung, klickbar → Canvas wird sofort geladen, Hinweis verschwindet.

### Moodboards-Übersicht: Design-Konsistenz mit Projekte-Seite
- Übersicht komplett ans Projekte-Dashboard-Pattern angepasst — kein eigenes Hero-Band mit grünem Gradient mehr, sondern derselbe weiße `StickyPageHeader` mit Titel + Count + Subtitle wie auf allen anderen Listen-Seiten.
- Filter-Pills im Projekte-Toggle-Stil (Alle / Freigegeben / Entwurf) mit Count-Badges, Suchleiste mit 340 px Breite + Eintrags-Counter, Grid/List-Toggle rechts — alles 1:1 wie bei Projekte/Kunden.
- Cards komplett überarbeitet: Avatar-Tile links (farbig pro Projekt, Initialen), Titel + Projekt-Name mittig, Zeitabstand oben rechts, Footer-Zeile mit Raum + Kunde — gleicher visueller Aufbau wie Projekte-Cards.
- **CLAUDE.md** um Design-Konsistenz-Regel ergänzt: alle Dashboard-Listenseiten MÜSSEN das `StickyPageHeader`-Pattern, gleiche Filter-Pills, weiße Cards verwenden — kein eigenes Hero-Band oder Sonderdesign mehr.

### Moodboards Polish — Übersicht & Editor auf Premium-Niveau
- **Übersichtsseite komplett neu**: Hero-Band mit grünem Gradient + 3 Stats-Pills (Gesamt / Freigegeben / Mit Inhalt), Sticky-Toolbar mit Volltextsuche (Name/Raum/Projekt/Kunde) + Projekt-Filter + Status-Filter (Alle/Freigegeben/Entwurf) + Sort + Grid-/List-Toggle. Cards zeigen jetzt eine **echte Mini-Vorschau** des Boards (Auto-Fit Canvas-Render statt Palette-Placeholder), Freigabe-Badge, formatierte Zeitangabe.
- **Editor-Top-Bar im Figma-Stil**: alles auf eine Reihe (56 px), Tools in 3 Gruppen mit dezenten Trennern, Save-Status als animiertes Pill-Badge (idle/speichere/gespeichert/Fehler), Zoom als Mini-Cluster, separater **Speichern**-Button und prominenter **Teilen**-Button (grün wenn aktiv, sonst neutral).
- **Linke Sidebar neu**: schickerer Underline-Tab-Indicator, **Produkt-Bibliothek als 2-spaltiges Grid** mit Aspect-Ratio-Thumbnails + Hover-Zoom statt karger Listenzeilen. Produkte ohne Bild zeigen jetzt einen **Farb-Gradient mit Initialen** (kein billiges Cream-Rect mehr) — sowohl in der Sidebar als auch beim Platzieren auf dem Board (moderne weiße Karte mit Initialen-Tile, Schatten, Label „PRODUKT").
- **Empty-State im Editor**: leeres Board zeigt jetzt einen freundlichen Hint mit 3 Quick-Action-Buttons (Bild hochladen / Produkt hinzufügen / Farbe wählen) und „Hinweis ausblenden"-Option.
- **Status-Bar dezenter** mit Großbuchstaben-Tool-Indikator und feiner Tipp-Zeile.

### Moodboards (Phase 1 · Schritt 1+2: Datenmodell + Editor-Grundgerüst)
- Grundlage für das neue **Moodboard-Feature** — pro Raum genau ein Moodboard, mit Versionen-Historie und Freigabe-Link für Kunden.
- Migration **096** legt die Tabellen `moodboards` (UNIQUE-Constraint auf `raum_id`) und `moodboard_versionen` an, dazu einen privaten Storage-Bucket `moodboard-bilder` (50 MB Upload-Limit) und Realtime-Publication für Live-Co-Editing.
- Server-Actions sind komplett: Auto-Save, Versionen speichern/wiederherstellen/löschen, Bild-Upload mit Signed URL, Freigabe-Toggle (read-only oder mit Kommentar-Pins), Sidebar-Übersicht aller Moodboards aller Projekte.
- **Editor (Schritt 2)**: Fabric.js Canvas mit unbegrenztem Workspace, Zoom (Mausrad/Pinch) + Pan (Mittlere Maustaste oder Space+Drag), Toolbar mit Auswahl/Text/Rechteck/Kreis/Bild-Upload/Löschen/Undo+Redo/Speichern, Keyboard-Shortcuts (Entf, Ctrl+Z/Y), Auto-Save alle 3 Sek mit Status-Anzeige, dunkles Wellbeing-Green-UI (analog Raumplaner).
- **Linke Sidebar (Schritt 3)**: 3 Tabs — **Produkte** (Volltextsuche über Name/Kategorie, Klick auf Produkt platziert das Bild auf dem Board mit Verknüpfung zur Produkt-ID, Fallback Text-Karte wenn kein Bild vorhanden), **Farben** (30 vordefinierte Wellbeing-/Designer-Swatches plus eigener Color-Picker, Klick → Swatch wird als abgerundetes Rechteck mit Schatten platziert), **Bilder** (Upload-Dropzone — JPG/PNG bis 50 MB).
- **Rechte Sidebar — Eigenschaften-Panel (Schritt 4)**: erscheint sobald ein Objekt selektiert ist. Zeigt: Position (X/Y), Größe (B/H), Rotation-Slider (-180 bis 180°), Deckkraft-Slider, Füllfarbe (12 Schnell-Swatches + Color-Picker, für Shapes + Text), Schriftgröße + B/I/U-Stil-Buttons (für Text), Konturbreite (für Shapes), Layer-Operationen (Eine Ebene vor/zurück, Duplizieren, Löschen). Verknüpfte Produkte werden mit Produkt-Name angezeigt.
- **Versionen + PNG-Export (Schritt 5)**: neuer Versionen-Button in der Toolbar öffnet ein Modal mit Liste aller gespeicherten Versionen (Name, optionale Beschreibung, Zeitstempel) und Inline-Formular zum Anlegen einer neuen Version. Pro Version: Wiederherstellen + Löschen mit Bestätigung. PNG-Export-Button rendert das Board mit automatischer Bounding-Box-Berechnung und 2×-Auflösung als Download.
- **Kunden-Freigabe (Schritt 6)**: Share-Button in der Toolbar (grün hinterlegt wenn Freigabe aktiv) öffnet Modal mit zwei Toggles — Freigabe aktiv (read-only Link für Kunden) und Kommentare erlauben (für Kommentar-Pins). Wenn aktiv: Freigabe-Link mit Kopieren-Button (Check-Icon nach erfolgreichem Kopieren) + 140×140-px-QR-Code für Mobile + „Vorschau in neuem Tab"-Link.
- **Sidebar-Eintrag + Übersichtsseite (Schritt 7)**: neuer Eintrag „Moodboards" in der Haupt-Sidebar (Palette-Icon, zwischen Raumplaner und Chats). Übersichtsseite `/dashboard/moodboards` listet alle Moodboards aller Projekte gruppiert nach Projekt — als Cards mit Vorschau-Block (Cream-Gradient + Palette-Icon-Placeholder oder Vorschau-Bild), Freigabe-Badge wenn aktiv, Raum-Name + letzter Update.
- **Öffentliche Freigabe-Seite (Schritt 8)**: neue öffentliche Route `/moodboard/[token]` (kein Login erforderlich) — zeigt das Moodboard read-only mit Logo-Header (Projekt + Raum), optionaler Beschreibung, Footer. Read-only-Canvas mit Auto-Fit beim Laden, Zoom (Mausrad/Pinch + Buttons), Pan (Drag), „Einpassen"-Button und PNG-Download für den Kunden. Alle Objekte sind nicht selektierbar/editierbar.
- **Portal-Integration (Schritt 9)**: Eingeloggte Portal-Kunden sehen freigegebene Moodboards ihres Projekts in einem neuen Moodboards-Tab (Palette-Icon, nur sichtbar wenn mind. ein Board freigegeben ist). Cards mit Vorschau, Raum-Name, letzter Update — Klick öffnet die Freigabe-Seite in einem neuen Tab.
- **Verlinkung**: neuer „Moodboard"-Button auf der Raum-Detailseite (zwei Stellen: Grundriss-Card-Header und Empty-State-Card).
- Migration **096** muss manuell im Supabase SQL-Editor ausgeführt werden.

## 2026-04-25

### Aktivitätslog: Backfill + modernere Dropdowns
- Beim ersten Aufruf war das Log leer, weil noch keine Aktion seit dem Deploy ausgelöst war. Migration **095** legt jetzt für jeden bestehenden Kunden / Projekt / Partner / Angebot / Vertrag einen synthetischen „angelegt"-Audit-Eintrag mit dem ursprünglichen `created_at` an — sofort sichtbare History.
- **Dropdowns neu gemacht**: ersetzt die nativen `<select>`-Boxen (sahen OS-Default-altmodern aus, Chevron-Icon überlappte mit Text bei langen Optionen) durch eine eigene Komponente `Dropdown.tsx` — mit ESC-Close, Click-Outside, Häkchen bei aktiver Option, Hover-Highlight. Wird ab jetzt überall im Admin nutzbar.
- Zusätzliche Instrumentierung: **Partner gelöscht** wird jetzt auch ins Log geschrieben.

### Aktivitätslog (Audit-Log) mit UI
- Neuer Admin-Tab **Einstellungen → Aktivität**: chronologische Liste aller wichtigen Vorgänge in deiner Org — wer hat was wann gemacht.
- **Geloggt werden** aktuell:
  - Kunde / Projekt / Partner: anlegen, archivieren, löschen
  - Projekt-Status-Wechsel (mit „von → zu"-Detail)
  - Team: Mitglied einladen, Rolle ändern, deaktivieren
- **Live-Updates**: das Log aktualisiert sich automatisch wenn andere Team-Mitglieder Aktionen ausführen (gleicher Realtime-Hook, debounced).
- **Filter**: Volltextsuche (User-E-Mail / Entitätsname), Aktion-Filter, Entitäts-Filter, server-seitige Pagination (25 pro Seite). RLS sorgt dafür, dass nur Events deiner eigenen Org sichtbar sind.
- Pro Eintrag: farbiges Aktion-Icon, Entitäts-Typ-Label, betroffener Datensatz-Name, User-E-Mail, relativer Zeitpunkt + exaktes Datum.
- Migration **094** nötig (Realtime-Publication für `audit_log`).

### Live-Updates auf allen wichtigen Bereichen (mit Performance-Schutz)
- Auf den weiteren Pflicht-Bereichen läuft jetzt **Realtime** ohne Performance-Verlust:
  - **Portal-Chat** — Nachrichten erscheinen sofort, kein Polling-Lag mehr (10-Sek-Polling bleibt als Backup falls die WebSocket droppt)
  - **Kommunikationslog** auf Kunden-Detail — Team-Kollegen-Einträge live sichtbar
  - **Timeline** auf Projekt-Detail — Auto-Sync und manuelle Events von anderen erscheinen direkt
  - **Bestell-/Freigabe-Status auf Raum-Detail** (`raum_produkte`) — wenn Kunde im Freigabe-Link reagiert, sieht der Admin den neuen Status sofort
  - **Konfigurator-Sessions** — Admin sieht live wenn Kunde Auswahl trifft / ablehnt
  - **Onboarding** (war schon da, jetzt auch über den gemeinsamen Hook)
- **Performance-Schutz** im neuen `useRealtimeRefresh`-Hook:
  - **Debouncing** (Default 500 ms, Chat 300 ms, Bulk-betroffene Tabellen 600 ms) verhindert Refresh-Storm bei Auto-Save-Floods oder Bulk-Aktionen.
  - **Pro-Komponente eindeutige Channel-Namen** — keine Subscribe-Collisions
  - **Server-seitiger Filter** wo möglich (`projekt_id=eq.X`, `kunde_id=eq.Y`, `raum_id=eq.Z`) — reduziert Server→Client-Traffic auf das Nötigste
  - **Cleanup garantiert** — `removeChannel` beim Unmount, kein WebSocket-Leak
- Migration **093** nötig (`ALTER PUBLICATION supabase_realtime ADD TABLE …` für 5 Tabellen, idempotent).

### Onboarding: Live-Updates (kein Refresh mehr nötig)
- Sobald ein Kunde ein Onboarding-Formular ausfüllt, abschickt oder mit dem Auto-Save den Fortschritt aktualisiert, **erscheint die Änderung sofort in deiner Übersicht** — kein manuelles Reload mehr.
- Realisiert via **Supabase Realtime**: der Browser subscribed beim Öffnen der Onboarding-Seite einen WebSocket-Channel auf die `onboarding_anfragen`-Tabelle. Bei jedem INSERT/UPDATE/DELETE wird die Page-Daten neu geholt.
- RLS bleibt aktiv — du siehst nur Events deiner eigenen Organisation.
- Migration **092** nötig (`ALTER PUBLICATION supabase_realtime ADD TABLE onboarding_anfragen`).

### Detail-Seiten: einheitliche Tab-Navigation
- **Partner-Detail** — Tab-Style von Pill-Buttons in Card auf Underline-Tabs umgestellt, identisch zum Projekt-Detail.
- **Kunden-Detail** war bisher eine endlose Single-Page mit allem auf einmal. Jetzt **6 Tabs**: Übersicht / Kontakte / Projekte / Timeline / Kommunikation / Notizen — gleicher Underline-Style. Tab-State in der URL (`?tab=…`) für Deep-Links. Übersicht zeigt Stats-Band + Firma-Karte + Portal-Block; alle anderen Tabs den jeweils fokussierten Inhalt mit Counter-Badge.
- Damit haben alle drei Top-Level-Detailseiten (Projekt / Partner / Kunde) jetzt das gleiche Tab-Pattern.

### Einstellungen → Team: Avatar + letzte Aktivität für alle Mitglieder
- Bisher zeigten andere Teammitglieder einen farbigen Initialen-Kreis und „Zuletzt aktiv: –", egal ob sie ein Profilbild hatten oder nicht.
- Jetzt: **echte Profilbilder** werden geladen (aus `team_mitglieder.avatar_url`), Initialen-Avatar nur als Fallback.
- **Letzte Anmeldung** wird für alle Mitglieder angezeigt — `last_sign_in_at` aus Supabase Auth wird via Admin-API für alle Team-User dazugejoint.
- Falls Vor-/Nachname gesetzt: wird groß angezeigt, E-Mail darunter klein. Sonst nur E-Mail.

### Handbuch: Komplett aktualisiert + Wide-Screen-Layout (Teil 2 fertig)
- Inhalte für **alle 21 Kapitel** auf den aktuellen Stand:
  - **Räume** (NEU): anlegen, Budget, Produkt-Zuweisung, Grundriss-Vorschau, Drag-and-Drop
  - **Produkte**: Auto-Fill mit URL + AI-Fallback, Screenshot-Upload via Claude Vision, mehrere Bilder, Status pro Raum-Einsatz, Varianten, Preisberechnung
  - **Freigaben**: Bulk-Aktionen, Floating Action-Bar, neue Filter / Ansichten
  - **Kundenfreigabe**: Link-Scopes (gesamt / Raum / Auswahl), PIN-Schutz, mobile Ansicht, Audit-Log
  - **Kunden-Portal** (NEU): eigener Login, Welcome-Tour, Projektansicht, Chat, Dokumente, Team
  - **Onboarding**: Empfänger-Etikett, Vorlagen-Editor mit 12+ Feldtypen, Status-Flow inkl. „In Bearbeitung", Übernehmen-Workflow
  - **Konfigurator**: 4 Aktionen, Budget-Tracking, „Aus Auswahl Angebot erstellen"
  - **Timeline**: Auto-Sync (Liefertermine, Deadlines, Angebote, Verträge), Gantt mit Bézier-Pfeilen + Kaskaden-Verschieben, Raum-Filter, Kunde-Sichtbar-Toggle
  - **Angebote** (NEU): Auto-Nummer AG-YYYY-NNN, aus Raum-Produkten generieren, Status-Flow, PDF-Export, → Vertrag
  - **Verträge** (NEU): Vorlagen mit 12 Platzhaltern, digitale Signatur (Token + Canvas), Anhänge, Meilensteine
  - **Raumplaner** (NEU): Werkzeuge mit Tastatur-Shortcuts, 60+ Möbel + Custom, Boden-Texturen + Wandfarbe, Etagen, Versionen mit Vergleich, Stückliste, PDF/PNG-Export, Kunden-Freigabe-Link mit QR-Code
  - **Partner**: Sub-Tabs, Sortiment vs. Einsatz, Mehrere Kontakte, Konditionen, Vertragsdokumente, Bewertungs-Filter, Auto-Favicon
  - **Branding**: ausführliche Live-Vorschau (sticky), Layout-Stil, Akzent-Gradient, Hero-Bild, Custom CSS
  - **Einstellungen**: Aktive Sessions verwalten, Workspace, Profil, Vorlagen, Team
  - **FAQ**: aktualisiert mit aktuellen Themen (Auto-Fill, Empfänger-Etikett, Sessions, AI-Key)

### Handbuch: Wide-Screen-Layout + neue Struktur (Teil 1)
- **Größere, ruhigere Typo** im Hauptbereich — `text-[15px]` statt `text-sm`, größere Überschriften, mehr Abstand. Liest sich auf 4K-Monitoren ordentlich statt verquetscht in 600px.
- **Breitere Spalten**: Inhalt `max-w-3xl` (statt 2xl), auf 2XL-Screens `max-w-4xl`, mit großzügigem Padding (`px-12 / px-16`). Linke Sidebar +4px, rechte Sidebar (Auf dieser Seite) +8px und sticky.
- **Komplette Neustrukturierung der Kapitel-Navigation**: 16 → 21 Kapitel, neue Kapitel kommen in den nächsten Updates (Räume, Kunden-Portal, Angebote, Verträge, Raumplaner — momentan als „folgt"-Stub). Bestehende Kapitel bekommen neue Abschnitte für die ganzen Features die seitdem dazukamen.
- **Dashboard- und Kunden-Kapitel** komplett neu geschrieben mit aktuellem Inhalt (KPIs, Stats-Band, Mehrere Ansprechpartner, Auto-Favicon, Kommunikationslog, Archiv-Impact). **Projekte-Kapitel** dito (Status-Flow, Service-Modell, Zeiterfassung, Duplizieren).
- **Sticky-Vorschau**: Die rechte Spalte „Live-Vorschau" auf der Branding-Seite scrollt jetzt mit — wenn du runterscrollst, bleibt die Vorschau im Blick.
- **Detailliertere Vorschau**: zeigt jetzt einen kompletten Mini-Portal-Layout (Header mit Logo + User-Avatar + Tab-Badge, Hero mit Slogan/Welcome-Text + CTA-Button, Karten-Sektion mit KPI-Stats, Produkt-Karte mit Freigeben/Ablehnen-Buttons, Farb-Pillen für Primär/Sekundär/Akzent, Footer mit Support-E-Mail). Du siehst sofort wie sich Farben, Schrift, Ecken-Style, Hero-Bild und Gradient zusammenspielen.

### Kunden: mehrere Ansprechpartner pro Firma (analog Partner)
- **Neuer „Ansprechpartner"-Block** auf der Kunden-Detailseite. Statt eines einzigen Ansprechpartner-Strings legst du jetzt beliebig viele Kontakte mit eigenen Daten an: Name, Rolle (Geschäftsführung / Inhaber:in / Buchhaltung / …), E-Mail, Telefon, Mobil, persönliche Notizen.
- **Hauptkontakt-Markierung** mit Stern-Badge — pro Kunde gibt es genau einen, er wird in Listen und PDFs verwendet.
- **Kunden-Formular aufgeräumt**: alte Felder „Ansprechpartner", „E-Mail", „Telefon" sind aus dem Formular verschwunden, kleiner grüner Hinweis weist auf den Kontakte-Block hin. „Firma"-Karte auf der Detailseite zeigt jetzt nur noch Website + Adresse.
- **Backwards-kompatibel**: Listen, PDF-Exports und alle anderen Stellen, die `kunden.ansprechpartner`/`email`/`telefon` lesen, funktionieren weiter — diese Felder werden automatisch mit dem aktuellen Hauptkontakt synchronisiert.
- Migration **091** nötig (`kunden_kontakte` + RLS + Backfill bestehender Daten).

### Partner-Detailseite: einheitliches Look & Feel mit Kunden / Projekten / Räumen
- Header **deutlich kleiner und ruhiger**: kein font-syne text-2xl-bold mehr, sondern `text-xl semibold` analog zu Kunde- und Raum-Detailseiten.
- **Breadcrumb mit `›`-Chevron** statt simplem „← Partner"-Link — selbe Navigation wie auf der Raum-Seite.
- **Sterne-Bewertung kleiner** und in den Title-Zeile integriert, statt prominenter Block.
- Website + Provisionsmodell wandern in eine **dezente Meta-Zeile unter dem Titel** — wie die Standort/Budget/Projektart-Zeile auf Projekten.
- **KPI-Band kompakt im Kunde-Style**: Icon links, Label/Wert/Sublabel rechts, weniger Padding (`px-4 py-3` statt `p-5`), Hover-Highlight wie bei Kunden — passend statt aufgeblasen.

### Projekt-Budget-Felder mit Tausenderpunkt
- **Eingabe `25000`** → Anzeige sofort `25.000`. Gilt für **Gesamtbudget**, **Produkt-Budget**, **Service-Pauschale** und **Stundensatz** im Projekt-Formular.
- Cents bewusst weggelassen — Projekt-Budgets sind in der Praxis runde Beträge, und ein Live-Format mit Komma + Punkt zusammen ist fehleranfällig (Cursor-Sprünge, halbe Eingaben). Wer wirklich Cents will, hat die Einzelpreis-Felder bei Produkten.
- Eingabe nimmt nur Ziffern — Tippfehler wie Komma oder Buchstabe werden ignoriert. Mobile bekommt das numerische Keypad (`inputMode="numeric"`).

### Kunden: Website-Feld + Auto-Favicon
- **Neues Website-Feld** im Kunden-Formular — gleicher Platz wie bei Partnern, Hinweis darunter erklärt das Auto-Logo-Verhalten.
- **Auto-Favicon**: Sobald du beim Kunden eine Website hinterlegst und (noch) kein eigenes Logo hochgeladen ist, wird das Favicon der Domain automatisch als Logo gesetzt — funktioniert beim Anlegen UND beim späteren Bearbeiten. Eigene Logo-Uploads werden niemals überschrieben.
- Geteilte Logik: gleiche Helper-Funktionen (`ableitenFaviconUrl`, `applyFaviconIfNeeded`) wie bei Partnern, jetzt in `src/lib/favicon.ts` zentralisiert.
- Migration **090** nötig (`ALTER TABLE kunden ADD COLUMN website TEXT`).

### Produkt-Auto-Fill: AI-Fallback + Screenshot-Upload (Phase B)
- **Universeller AI-Fallback**: Wenn der klassische Scraper auf einer Seite zu wenig findet (weniger als 3 von Titel/Beschreibung/Preis/Art-Nr./Bilder/Maße), eskaliert das System automatisch zu **Claude Haiku 4.5**. Das Modell liest den bereinigten Seitentext und extrahiert die fehlenden Felder strukturiert. Funktioniert auf praktisch jeder Seite — auch bei custom-HTML ohne JSON-LD/Microdata.
- **Screenshot-Upload als Alternative**: Neuer Knopf „Screenshot" neben „Auto-Fill" im Produktformular. Drag-and-Drop oder Klick → Bild hochladen (PNG/JPG/WebP/GIF, max. 5 MB) → **Claude Sonnet 4.6 Vision** liest die sichtbaren Daten aus. Ideal für Seiten hinter Cloudflare/Login oder JavaScript-only-Shops, die der Server-Scraper nicht erreicht.
- **AI-Sichtbarkeit**: Im Übernahme-Modal kennzeichnet ein kleines violettes „✨ AI"-Badge, wenn das Modell beteiligt war — keine versteckten AI-Magie, du siehst sofort wo's herkam.
- **Konservatives Verhalten**: Das Modell darf Felder NUR setzen wenn die Info eindeutig auf der Seite ist — keine Halluzinationen, keine geratenen Werte, keine Marketing-Floskeln. Bei Unsicherheit → Feld bleibt leer.
- Server-Voraussetzung: `ANTHROPIC_API_KEY` als Env-Variable in Vercel + lokal in `.env.local`. Ohne Key funktioniert weiter alles wie in Phase A — nur der AI-Pfad ist deaktiviert.
- Cost-Realität: ~0,001 € pro HTML-Fallback (Haiku) und ~0,005 € pro Screenshot (Sonnet). Bei 100 Scrapes/Monat unter 1 €.
- Keine Migration nötig.

### Produkt-Auto-Fill: deutlich mehr Shops + mehrere Bilder + Auto-Partner (Phase A)
- **Mehrere Bilder** statt nur ein og:image: Scraper sammelt Produktbilder aus JSON-LD-Arrays, Shopify-/WooCommerce-Galerien, Microdata, `<picture>`-Sources und Karussell-Containern. Im AutoFill-Modal kannst du sie als **Grid** mit Klick auswählen (max. 5 werden übernommen, „Alle / Keine"-Buttons).
- **Bessere Erfolgsquote bei Nicht-IKEA-Shops**: zusätzlicher Microdata-Layer (`itemprop="…"`), RDFa, MPN/GTIN als Artikelnummer-Fallback, Shop-spezifische Selektoren für Shopify, WooCommerce und Magento (Titel, Preis, SKU). Bessere Preis-Parsung für europäische Formate (1.234,56 €).
- **Auto-Partner-Zuordnung**: erkennt der Scraper, dass die Domain einem deiner Partner gehört (Match auf `partner.website`-Hostname), wird der Partner direkt im Formular gesetzt. Im Modal-Header siehst du das Match.
- **URL-History**: zuletzt gescraped Domains als Schnellauswahl-Chips unter dem URL-Feld (localStorage, top 5 sichtbar von 10 gespeichert). Ein Klick → Scrape startet automatisch.
- Maße werden zusätzlich aus Beschreibungstexten extrahiert („60 × 40 × 80 cm").
- Keine Migration nötig.

### Onboarding: Empfänger-Etikett bei Neukunden-Links
- Bei Neukunden-Links gibt's per Definition keinen verknüpften Kunden — die Übersicht zeigte deshalb nur „Neuer Onboarding-Link" und man wusste nicht mehr, an wen man die URL geschickt hatte.
- **Beim Erstellen eines Links** kannst du jetzt optional ein **Empfänger-Etikett** + **E-Mail** hinterlegen (z. B. „Frau Müller (Instagram-Anfrage)"). Das Etikett ist rein für deine Übersicht — der Kunde sieht es im Formular nicht.
- **In der Übersicht** taucht das Etikett als Titel der Zeile auf (Priorität: eingereichter Name → Empfänger-Etikett → verknüpfter Kunde → Fallback). E-Mail steht im Untertitel.
- **Im Detail-Panel** kannst du das Etikett **nachträglich ergänzen oder bearbeiten** (Pencil-Button neben „Adressat") — falls du beim Erstellen vergessen hast, wer der Empfänger war.
- Bonus-Fix: Das Formular-Absenden war bei verknüpften Kunden unmöglich (der Check `if (kunde_name)` blockierte den Submit, weil bei Verknüpfung schon vorausgefüllt war). Wir prüfen jetzt zuverlässig auf `antworten`.
- Migration **089** nötig (`empfaenger_label TEXT`, `empfaenger_email TEXT` auf `onboarding_anfragen`).

### Einstellungen → Profil: aktive Sessions tatsächlich verwalten
- Der bisherige Platzhalter „Aktive Sessions" zeigte nur die aktuelle Sitzung mit dem Hinweis „weitere Session-Verwaltung folgt". Jetzt voll funktional:
- Liste **aller eingeloggten Geräte / Browser** für den eigenen Account — pro Eintrag erkennbarer Browser + OS (Chrome auf macOS, Safari auf iPhone …), letzte Aktivität (relativ, z. B. „vor 12 Min."), Anmeldedatum, IP.
- Aktuelle Sitzung wird mit grünem Rand, grünem Icon und „Diese Sitzung"-Badge oben prominent markiert — du läufst nicht Gefahr, dich versehentlich selbst rauszuwerfen.
- **Pro Session abmelden**: roter „Abmelden"-Button rechts an jeder fremden Session, mit Bestätigungs-Modal.
- **„Alle anderen Geräte abmelden"**: ein Klick + Bestätigung → alle Sitzungen außer dieser werden invalidiert. Praktisch, falls man auf einem fremden Gerät vergessen hat sich abzumelden oder einen unbefugten Zugriff vermutet.
- Migration **088** nötig (RPC-Funktionen `get_meine_sessions` + `session_beenden`, beide SECURITY DEFINER, lesen/löschen nur Sessions des aktuellen Users).

### Partner: Auto-Favicon + Bewertungs-Filter (Phase C)
- **Auto-Favicon als Logo**: Sobald du beim Partner eine **Website** hinterlegst und (noch) kein eigenes Logo hochgeladen ist, ziehen wir das **Favicon der Domain** automatisch über Google's Favicon-Service als Logo-Bild ein. Funktioniert beim Anlegen UND beim späteren Bearbeiten der Website. Eigene Logo-Uploads werden niemals überschrieben.
- **Bewertungs-Filter** in der Partner-Liste: Toggle-Leiste „Alle / 3+ / 4+ / 5+ Sterne" oben rechts. Findest sofort die Top-Partner, mit denen du arbeiten willst.
- **Sortierung**: zusätzlich zur alphabetischen Sortierung gibt's jetzt „Bewertung ↓" und „Bewertung ↑" — die besten zuerst.
- **Sterne sichtbar**: Bewertung wird in Karten- und Listen-Ansicht direkt angezeigt (Liste hat statt der inhaltlich überholten Spalte „Ansprechpartner" eine Spalte „Bewertung" — der Hauptkontakt steht jetzt im Detail-Tab).
- Keine Migration nötig.

### Partner: mehrere Kontaktpersonen pro Firma (Phase B)
- **Neuer Tab „Kontakte"** auf der Partner-Detailseite. Statt eines einzigen „Ansprechpartner"-Strings legst du jetzt beliebig viele Kontaktpersonen mit eigenen Daten an: Name, Rolle (Vertrieb / Innendienst / Geschäftsführung …), E-Mail, Telefon, Mobil und persönliche Notizen.
- **Hauptkontakt-Markierung** mit Stern-Badge — pro Partner gibt es genau einen, er wird in der Übersicht prominent angezeigt und in Listen/PDFs verwendet.
- **Übersicht-Tab umgebaut**: links eine kompakte Hauptkontakt-Karte mit Avatar + Klick-zu-Mail/Telefon-Links plus eine separate „Firma"-Karte (Website / USt / IBAN / Adresse / Zahlungsziel). Klare Trennung zwischen Person und Firma.
- **Partner-Formular aufgeräumt**: die alten Felder „Ansprechpartner", „E-Mail" und „Telefon" sind aus dem Formular verschwunden — Kontaktdaten gehören jetzt zur Person, nicht zum Datensatz „Firma". Kleiner grüner Hinweis im Formular weist darauf hin.
- **Backwards-kompatibel**: bestehende Partner-Listen, PDF-Exports und alle anderen Stellen, die `partner.ansprechpartner`/`email`/`telefon` lesen, funktionieren weiter — diese Felder werden automatisch mit dem aktuellen Hauptkontakt synchronisiert.
- **Migration 087 nötig** (`partner_kontakte` + RLS + Backfill bestehender Daten als Hauptkontakt). Idempotent — sicher mehrfach ausführbar.

### Partner-Bereich aufgeräumt (Phase A)
- **Sub-Tabs auf der Partner-Detailseite**: Übersicht · Konditionen · Verträge · Produkte. URL merkt sich den aktiven Tab (`?tab=konditionen` o. ä.). Damit ist die Seite nicht mehr eine endlose Spaltenwand — jeder Bereich bekommt seinen eigenen Platz.
- **Produkte komplett neu — zwei Ansichten:**
  - **Sortiment**: 1 Zeile pro Produkt, aggregiert. Zeigt „In 3 Räumen verbaut · 8 Stk. · 2 bestellt (1 geliefert)". Status / Raum / Menge sind hier weg, weil sie pro Einsatz unterschiedlich sind.
  - **Einsatz**: 1 Zeile pro tatsächlicher Raum-Zuweisung mit eigenem Bestellstatus + Freigabestatus, Projekt + Raum direkt verlinkt, Menge, effektivem VP. Filter nach Projekt + Bestell-Status, Volltextsuche, Summen-Footer.
- **KPI-Kacheln neu**: Bestellter Umsatz · Aktive Bestellungen · Offene Lieferungen — viel nützlicher fürs tägliche Reporting als das vorher dreifach gespiegelte Provisions-Modell.
- **„Notizen (alt)"-Feld**: aus dem Partner-Formular entfernt. Wenn ein Partner noch Inhalt im alten Freitext-Feld hat, erscheint auf der Übersicht ein gelber Banner mit der bisherigen Notiz und einem Knopf „In Notizen-Block übernehmen" — ein Klick und der Inhalt wandert in den modernen Notizen-Block, der Banner verschwindet. **Keine Migration nötig**, kein Datenverlust.

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
