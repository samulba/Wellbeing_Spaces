/**
 * Vertrags-Template-Bibliothek
 *
 * Vorgefertigte HTML-Strings für die drei Standard-Vertragsvorlagen.
 * Werden sowohl in `vorlagen-seed.ts` (initiales Anlegen) als auch im
 * Quick-Start des Vertragseditors (`VertragsVorlagenVerwaltung`)
 * verwendet — daher in einer eigenen Datei (DRY).
 *
 * Alle Templates nutzen ausschließlich HTML-Tags die der PDF-Export
 * (`htmlZuBloecke` in `pdf-helpers.ts`) versteht: h1, h2, h3, p, ul,
 * ol, li, hr, br. Inline-`<strong>` ist im Web sichtbar fett, im PDF
 * normal — bewusst gewählter Trade-off.
 */

export const INTERIOR_DESIGN_VERTRAG_HTML = `<h1>Interior Design Vertrag</h1>
<p><strong>Datum:</strong> {{datum_heute}}</p>

<h2>Vertragsparteien</h2>
<p><strong>Auftragnehmer:</strong><br>{{firmenname}}</p>
<p><strong>Auftraggeber:</strong><br>{{kunde_name}}<br>{{kunde_adresse}}<br>{{kunde_email}}</p>

<hr>

<h2>§ 1 Vertragsgegenstand</h2>
<p>Der Auftragnehmer ({{firmenname}}) übernimmt die Interior Design Leistungen für das Projekt „{{projekt_name}}" am Standort {{projekt_standort}}.</p>
<p>Projektart: {{projektart}}</p>

<h2>§ 2 Leistungsumfang</h2>
<p>Die vereinbarten Leistungen umfassen:</p>
<ul>
  <li>Konzeptentwicklung und Raumplanung</li>
  <li>Materialauswahl und Produktberatung</li>
  <li>Erstellung von Grundrissen und Visualisierungen</li>
  <li>Koordination mit Lieferanten und Handwerkern</li>
  <li>Projektbegleitung bis zur Fertigstellung</li>
</ul>

<h2>§ 3 Vergütung</h2>
<p>Die Vergütung für die vereinbarten Leistungen beträgt:</p>
<ul>
  <li>Service-Pauschale: {{service_pauschale}}</li>
  <li>Produktbudget (Richtwert): {{produkt_budget}}</li>
  <li>Gesamtbudget (Richtwert): {{gesamtbudget}}</li>
</ul>
<p>Alle Preise verstehen sich zzgl. der gesetzlichen Mehrwertsteuer.</p>

<h2>§ 4 Zahlungsbedingungen</h2>
<p>Die Zahlung erfolgt in folgenden Raten:</p>
<ul>
  <li>30 % bei Vertragsabschluss</li>
  <li>40 % bei Beginn der Ausführungsplanung</li>
  <li>30 % bei Projektabschluss</li>
</ul>
<p>Rechnungen sind innerhalb von 14 Tagen nach Rechnungsstellung fällig.</p>

<h2>§ 5 Projektlaufzeit</h2>
<p>Die Zusammenarbeit beginnt mit Unterzeichnung dieses Vertrages. Der angestrebte Projektabschluss ist der {{deadline}}.</p>
<p>Terminverschiebungen durch den Auftraggeber oder durch Dritte (Lieferanten, Handwerker) liegen außerhalb der Verantwortung des Auftragnehmers.</p>

<h2>§ 6 Mitwirkungspflichten des Auftraggebers</h2>
<p>Der Auftraggeber verpflichtet sich:</p>
<ul>
  <li>Alle für die Planung notwendigen Unterlagen und Informationen rechtzeitig bereitzustellen</li>
  <li>Freigaben und Entscheidungen innerhalb vereinbarter Fristen zu erteilen</li>
  <li>Begehungen und Besprechungstermine nach Möglichkeit wahrzunehmen</li>
</ul>

<h2>§ 7 Urheberrecht</h2>
<p>Alle erstellten Planungsunterlagen, Entwürfe und Konzepte bleiben geistiges Eigentum von {{firmenname}} und dürfen ohne ausdrückliche Zustimmung nicht an Dritte weitergegeben oder für andere Projekte verwendet werden.</p>

<h2>§ 8 Vertraulichkeit</h2>
<p>Beide Parteien verpflichten sich, alle im Rahmen dieses Vertrages ausgetauschten Informationen vertraulich zu behandeln.</p>

<h2>§ 9 Schlussbestimmungen</h2>
<p>Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Mündliche Nebenabreden haben keine Gültigkeit. Es gilt das Recht der Bundesrepublik Deutschland.</p>

<hr>

<p>Ort, Datum: ___________________</p>
<p><strong>{{firmenname}}</strong></p>
<p>___________________<br>Unterschrift Auftragnehmer</p>
<p><strong>{{kunde_name}}</strong></p>
<p>___________________<br>Unterschrift Auftraggeber</p>`

export const ANGEBOT_STANDARD_HTML = `<h1>Angebot</h1>
<p><strong>Angebotsdatum:</strong> {{datum_heute}}</p>

<h2>Anbieter</h2>
<p>{{firmenname}}</p>

<h2>Empfänger</h2>
<p>{{kunde_name}}<br>{{kunde_adresse}}<br>{{kunde_email}}</p>

<hr>

<h2>Projektbezug</h2>
<p><strong>Projekt:</strong> {{projekt_name}}<br>
<strong>Standort:</strong> {{projekt_standort}}<br>
<strong>Projektart:</strong> {{projektart}}</p>

<h2>Angebotspositionen</h2>
<p>Die detaillierten Positionen entnehmen Sie bitte der beigefügten Produktliste bzw. dem generierten Angebot.</p>

<h2>Zusammenfassung</h2>
<p>Produktbudget (Richtwert): {{produkt_budget}}<br>
Service-Pauschale: {{service_pauschale}}<br>
Gesamtbudget (Richtwert): {{gesamtbudget}}</p>
<p>Alle Preise verstehen sich zzgl. der gesetzlichen Mehrwertsteuer (19 %).</p>

<h2>Gültigkeit</h2>
<p>Dieses Angebot ist 30 Tage ab Angebotsdatum gültig.</p>

<h2>Zahlungsbedingungen</h2>
<p>Zahlung innerhalb von 14 Tagen nach Rechnungsstellung ohne Abzug.</p>

<h2>Lieferbedingungen</h2>
<p>Die angegebenen Lieferzeiten sind Richtwerte und können je nach Hersteller und Verfügbarkeit variieren. Wir informieren Sie bei Abweichungen rechtzeitig.</p>

<h2>Annahme des Angebots</h2>
<p>Bitte bestätigen Sie dieses Angebot bis spätestens 30 Tage nach Angebotsdatum schriftlich oder per E-Mail. Mit der Auftragserteilung erkennen Sie unsere Allgemeinen Geschäftsbedingungen an.</p>

<hr>

<p>{{firmenname}}, {{datum_heute}}</p>
<p>___________________<br>Unterschrift / Stempel</p>`

export const AUFTRAGSBESTAETIGUNG_HTML = `<h1>Auftragsbestätigung</h1>
<p><strong>Datum:</strong> {{datum_heute}}</p>

<h2>Auftraggeber</h2>
<p>{{kunde_name}}<br>{{kunde_adresse}}<br>{{kunde_email}}</p>

<h2>Auftragnehmer</h2>
<p>{{firmenname}}</p>

<hr>

<h2>Bezug</h2>
<p>Vielen Dank für Ihr Vertrauen. Wir bestätigen hiermit Ihren Auftrag für das Projekt „{{projekt_name}}" (Standort: {{projekt_standort}}) und die Zusammenarbeit mit {{firmenname}}.</p>

<h2>Bestätigte Leistungen</h2>
<ul>
  <li>Konzeptentwicklung und Raumplanung für {{projektart}}</li>
  <li>Produktauswahl und Beschaffungsbegleitung</li>
  <li>Projektmanagement und Koordination</li>
  <li>Abschlusspräsentation und Übergabe</li>
</ul>

<h2>Budgetrahmen</h2>
<p>Produktbudget: {{produkt_budget}}<br>
Service-Honorar: {{service_pauschale}}<br>
Gesamtbudget: {{gesamtbudget}}</p>

<h2>Zeitplan</h2>
<p>Projektstart: ab sofort nach Vertragsunterzeichnung<br>
Angestrebte Fertigstellung: {{deadline}}</p>

<h2>Nächste Schritte</h2>
<ul>
  <li>Kick-off-Termin zur Detailabstimmung vereinbaren</li>
  <li>Bestandsaufnahme vor Ort durchführen</li>
  <li>Konzeptentwurf erstellen und präsentieren</li>
  <li>Freigabe und Bestellung der Produkte</li>
</ul>

<h2>Zahlungsplan</h2>
<p>Gemäß dem geschlossenen Vertrag erfolgt die Zahlung in vereinbarten Raten. Die erste Rate ist innerhalb von 14 Tagen nach Auftragserteilung fällig.</p>

<h2>Ansprechpartner</h2>
<p>Bei Rückfragen wenden Sie sich jederzeit an uns. Wir freuen uns auf die Zusammenarbeit.</p>

<hr>

<p><strong>{{firmenname}}</strong><br>{{datum_heute}}</p>
<p>___________________<br>Unterschrift / Stempel</p>
<p><strong>{{kunde_name}}</strong></p>
<p>___________________<br>Unterschrift Auftraggeber (Gegenzeichnung)</p>`

/**
 * Liste aller Quick-Start-Vorlagen für die UI.
 * Wird im VertragsEditor als "Mit Vorlage starten"-Button-Reihe angezeigt.
 */
export const QUICK_START_VORLAGEN: {
  key: string
  name: string
  beschreibung: string
  inhalt_html: string
  kategorie: 'projektvertrag' | 'angebot' | 'sonstiges' | 'rahmenvertrag'
}[] = [
  {
    key:         'interior-design',
    name:        'Interior Design Vertrag',
    beschreibung:'Vollständiger Projektvertrag mit Leistungsumfang, Vergütung, Zahlungsbedingungen, Urheberrecht und Vertraulichkeit.',
    inhalt_html: INTERIOR_DESIGN_VERTRAG_HTML,
    kategorie:   'projektvertrag',
  },
  {
    key:         'angebot',
    name:        'Angebot',
    beschreibung:'Standardisiertes Angebotsformular mit Anbieter, Empfänger, Projektbezug, Zusammenfassung und Annahmebedingungen.',
    inhalt_html: ANGEBOT_STANDARD_HTML,
    kategorie:   'angebot',
  },
  {
    key:         'auftragsbestaetigung',
    name:        'Auftragsbestätigung',
    beschreibung:'Bestätigung eines erteilten Auftrags mit Leistungen, Zeitplan, Budget und nächsten Schritten.',
    inhalt_html: AUFTRAGSBESTAETIGUNG_HTML,
    kategorie:   'sonstiges',
  },
]
