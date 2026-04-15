'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ── HTML-Vorlagen ─────────────────────────────────────────────

const INTERIOR_DESIGN_VERTRAG_HTML = `<h1>Interior Design Vertrag</h1>
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
<p style="margin-top:2em;"><strong>{{kunde_name}}</strong></p>
<p>___________________<br>Unterschrift Auftraggeber</p>`

const ANGEBOT_STANDARD_HTML = `<h1>Angebot</h1>
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
<p><em>Die detaillierten Positionen entnehmen Sie bitte der beigefügten Produktliste bzw. dem generierten Angebot.</em></p>

<h2>Zusammenfassung</h2>
<p>Produktbudget (Richtwert): {{produkt_budget}}<br>
Service-Pauschale: {{service_pauschale}}<br>
Gesamtbudget (Richtwert): {{gesamtbudget}}</p>
<p><em>Alle Preise verstehen sich zzgl. der gesetzlichen Mehrwertsteuer (19 %).</em></p>

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

const AUFTRAGSBESTAETIGUNG_HTML = `<h1>Auftragsbestätigung</h1>
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
<p style="margin-top:2em;"><strong>{{kunde_name}}</strong></p>
<p>___________________<br>Unterschrift Auftraggeber (Gegenzeichnung)</p>`

// ── Seed-Funktion ─────────────────────────────────────────────

export async function erstelleStandardVorlagen(orgId: string): Promise<{ erstellt: number; fehler?: string }> {
  try {
    const admin = createAdminClient()

    // Prüfen ob bereits Vorlagen existieren
    const { data: bestehende } = await admin
      .from('vertrags_vorlagen')
      .select('id')
      .eq('organisation_id', orgId)
      .limit(1)

    if (bestehende && bestehende.length > 0) {
      return { erstellt: 0 }
    }

    const vorlagen = [
      {
        organisation_id: orgId,
        name: 'Interior Design Vertrag – Standard',
        beschreibung: 'Vollständiger Projektvertrag für Interior Design Aufträge mit allen wesentlichen Klauseln.',
        inhalt_html: INTERIOR_DESIGN_VERTRAG_HTML,
        kategorie: 'projektvertrag' as const,
        ist_standard: true,
        version: 1,
      },
      {
        organisation_id: orgId,
        name: 'Angebot – Standard',
        beschreibung: 'Angebots-Vorlage mit Produktpositionen, Preisübersicht und Gültigkeitsdatum.',
        inhalt_html: ANGEBOT_STANDARD_HTML,
        kategorie: 'angebot' as const,
        ist_standard: false,
        version: 1,
      },
      {
        organisation_id: orgId,
        name: 'Auftragsbestätigung – Standard',
        beschreibung: 'Formelle Auftragsbestätigung nach Annahme eines Angebots mit Zeitplan und Zahlungsplan.',
        inhalt_html: AUFTRAGSBESTAETIGUNG_HTML,
        kategorie: 'sonstiges' as const,
        ist_standard: false,
        version: 1,
      },
    ]

    const { error } = await admin.from('vertrags_vorlagen').insert(vorlagen)
    if (error) return { erstellt: 0, fehler: error.message }

    revalidatePath('/dashboard/einstellungen')
    return { erstellt: vorlagen.length }
  } catch (err) {
    return { erstellt: 0, fehler: String(err) }
  }
}

// ── Onboarding-Vorlagen Seed ──────────────────────────────────

const ONBOARDING_NEUKUNDE_FRAGEN = [
  // Sektion 1: Kontakt
  {
    id: 'nk_name', typ: 'text', bezeichnung: 'Ihr vollständiger Name', pflicht: true,
    sektion: 'Persönliche Daten', reihenfolge: 1,
  },
  {
    id: 'nk_email', typ: 'email', bezeichnung: 'E-Mail-Adresse', pflicht: true,
    sektion: 'Persönliche Daten', reihenfolge: 2,
  },
  {
    id: 'nk_telefon', typ: 'telefon', bezeichnung: 'Telefonnummer', pflicht: false,
    sektion: 'Persönliche Daten', reihenfolge: 3,
  },
  // Sektion 2: Projekt
  {
    id: 'nk_projektart', typ: 'auswahl', bezeichnung: 'Was planen Sie?', pflicht: true,
    optionen: ['Kompletteinrichtung', 'Teilrenovierung', 'Einzelraum gestalten', 'Beratung / Konzept'],
    sektion: 'Ihr Projekt', reihenfolge: 4,
  },
  {
    id: 'nk_flaeche', typ: 'zahl', bezeichnung: 'Wohnfläche (m²)', pflicht: false,
    sektion: 'Ihr Projekt', reihenfolge: 5,
  },
  {
    id: 'nk_raumtypen', typ: 'mehrfach', bezeichnung: 'Welche Räume sollen gestaltet werden?', pflicht: false,
    optionen: ['Wohnzimmer', 'Schlafzimmer', 'Küche', 'Esszimmer', 'Bad', 'Arbeitszimmer', 'Kinderzimmer', 'Flur'],
    sektion: 'Ihr Projekt', reihenfolge: 6,
  },
  // Sektion 3: Budget & Stil
  {
    id: 'nk_budget', typ: 'skala', bezeichnung: 'Geplantes Budget (€)', pflicht: false,
    min: 5000, max: 100000, schritt: 5000, einheit: '€',
    sektion: 'Budget & Stil', reihenfolge: 7,
  },
  {
    id: 'nk_stil', typ: 'mehrfach', bezeichnung: 'Welche Einrichtungsstile gefallen Ihnen?', pflicht: false,
    optionen: ['Modern', 'Skandinavisch', 'Industrial', 'Klassisch', 'Mediterran', 'Japanisch / Zen', 'Boho', 'Minimalistisch'],
    sektion: 'Budget & Stil', reihenfolge: 8,
  },
  {
    id: 'nk_farben', typ: 'text', bezeichnung: 'Bevorzugte Farben oder Farbwelten', pflicht: false,
    platzhalter: 'z.B. Erdtöne, Blau-Grün, Schwarz-Weiß …',
    sektion: 'Budget & Stil', reihenfolge: 9,
  },
  // Sektion 4: Sonstiges
  {
    id: 'nk_einzugsdatum', typ: 'datum', bezeichnung: 'Gewünschter Fertigstellungstermin', pflicht: false,
    sektion: 'Zeitplan & Sonstiges', reihenfolge: 10,
  },
  {
    id: 'nk_wie_gefunden', typ: 'auswahl', bezeichnung: 'Wie sind Sie auf uns aufmerksam geworden?', pflicht: false,
    optionen: ['Empfehlung', 'Instagram', 'Google', 'Messe', 'Website', 'Sonstiges'],
    sektion: 'Zeitplan & Sonstiges', reihenfolge: 11,
  },
  {
    id: 'nk_notizen', typ: 'textarea', bezeichnung: 'Weitere Anmerkungen oder Wünsche', pflicht: false,
    platzhalter: 'Gibt es etwas Besonderes, das wir wissen sollten?',
    sektion: 'Zeitplan & Sonstiges', reihenfolge: 12,
  },
]

const ONBOARDING_PRIVAT_FRAGEN = [
  {
    id: 'pv_name', typ: 'text', bezeichnung: 'Name des Auftraggebers', pflicht: true,
    sektion: 'Kontaktdaten', reihenfolge: 1,
  },
  {
    id: 'pv_email', typ: 'email', bezeichnung: 'E-Mail-Adresse', pflicht: true,
    sektion: 'Kontaktdaten', reihenfolge: 2,
  },
  {
    id: 'pv_telefon', typ: 'telefon', bezeichnung: 'Telefon', pflicht: false,
    sektion: 'Kontaktdaten', reihenfolge: 3,
  },
  {
    id: 'pv_adresse', typ: 'textarea', bezeichnung: 'Projektadresse', pflicht: true,
    platzhalter: 'Straße, PLZ, Ort',
    sektion: 'Kontaktdaten', reihenfolge: 4,
  },
  {
    id: 'pv_eigentuemer', typ: 'ja_nein', bezeichnung: 'Sind Sie Eigentümer der Immobilie?', pflicht: true,
    sektion: 'Projektdetails', reihenfolge: 5,
  },
  {
    id: 'pv_objekttyp', typ: 'auswahl', bezeichnung: 'Objekttyp', pflicht: true,
    optionen: ['Einfamilienhaus', 'Doppelhaushälfte', 'Reihenhaus', 'Wohnung (Eigentum)', 'Mietwohnung', 'Ferienhaus'],
    sektion: 'Projektdetails', reihenfolge: 6,
  },
  {
    id: 'pv_flaeche', typ: 'zahl', bezeichnung: 'Wohnfläche (m²)', pflicht: true,
    sektion: 'Projektdetails', reihenfolge: 7,
  },
  {
    id: 'pv_raeume', typ: 'mehrfach', bezeichnung: 'Zu gestaltende Räume', pflicht: true,
    optionen: ['Wohnzimmer', 'Schlafzimmer', 'Kinderzimmer', 'Küche', 'Esszimmer', 'Bad', 'Gäste-WC', 'Arbeitszimmer', 'Flur', 'Terrasse/Balkon'],
    sektion: 'Projektdetails', reihenfolge: 8,
  },
  {
    id: 'pv_zustand', typ: 'auswahl', bezeichnung: 'Aktueller Zustand der Immobilie', pflicht: false,
    optionen: ['Neubau / Rohbau', 'Renovierungsbedürftig', 'Gepflegt, teilweise erneuert', 'Vollständig renoviert'],
    sektion: 'Projektdetails', reihenfolge: 9,
  },
  {
    id: 'pv_budget_slider', typ: 'skala', bezeichnung: 'Gesamtbudget Einrichtung (€)', pflicht: false,
    min: 10000, max: 200000, schritt: 10000, einheit: '€',
    sektion: 'Budget & Prioritäten', reihenfolge: 10,
  },
  {
    id: 'pv_prioritaeten', typ: 'prioritaeten', bezeichnung: 'Was ist Ihnen am wichtigsten? (Reihenfolge durch Ziehen)', pflicht: false,
    optionen: ['Gemütlichkeit', 'Funktionalität', 'Optik / Design', 'Nachhaltigkeit', 'Langlebigkeit', 'Preis-Leistung'],
    sektion: 'Budget & Prioritäten', reihenfolge: 11,
  },
  {
    id: 'pv_fotos', typ: 'upload', bezeichnung: 'Fotos des aktuellen Zustands (optional)', pflicht: false,
    upload_typen: ['image/jpeg', 'image/png', 'image/webp'], max_mb: 10,
    sektion: 'Unterlagen', reihenfolge: 12,
  },
  {
    id: 'pv_grundriss', typ: 'upload', bezeichnung: 'Grundriss (PDF oder Bild)', pflicht: false,
    upload_typen: ['application/pdf', 'image/jpeg', 'image/png'], max_mb: 20,
    sektion: 'Unterlagen', reihenfolge: 13,
  },
  {
    id: 'pv_wunschtermin', typ: 'datum', bezeichnung: 'Gewünschter Fertigstellungstermin', pflicht: false,
    sektion: 'Zeitplan', reihenfolge: 14,
  },
  {
    id: 'pv_anmerkungen', typ: 'textarea', bezeichnung: 'Besondere Anforderungen oder Anmerkungen', pflicht: false,
    sektion: 'Zeitplan', reihenfolge: 15,
  },
]

const ONBOARDING_GEWERBE_FRAGEN = [
  {
    id: 'gw_firma', typ: 'text', bezeichnung: 'Firmenname', pflicht: true,
    sektion: 'Unternehmensdaten', reihenfolge: 1,
  },
  {
    id: 'gw_ansprechpartner', typ: 'text', bezeichnung: 'Ansprechpartner (Name, Funktion)', pflicht: true,
    sektion: 'Unternehmensdaten', reihenfolge: 2,
  },
  {
    id: 'gw_email', typ: 'email', bezeichnung: 'Geschäftliche E-Mail', pflicht: true,
    sektion: 'Unternehmensdaten', reihenfolge: 3,
  },
  {
    id: 'gw_telefon', typ: 'telefon', bezeichnung: 'Telefon / Durchwahl', pflicht: false,
    sektion: 'Unternehmensdaten', reihenfolge: 4,
  },
  {
    id: 'gw_website', typ: 'url', bezeichnung: 'Website', pflicht: false,
    sektion: 'Unternehmensdaten', reihenfolge: 5,
  },
  {
    id: 'gw_branche', typ: 'auswahl', bezeichnung: 'Branche / Nutzungsart', pflicht: true,
    optionen: ['Büro / Coworking', 'Hotel / Hospitality', 'Restaurant / Café', 'Einzelhandel / Showroom', 'Praxis / Klinik', 'Bildung / Soziales', 'Industrie / Produktion', 'Sonstiges'],
    sektion: 'Projektdetails', reihenfolge: 6,
  },
  {
    id: 'gw_flaeche', typ: 'zahl', bezeichnung: 'Nutzfläche gesamt (m²)', pflicht: true,
    sektion: 'Projektdetails', reihenfolge: 7,
  },
  {
    id: 'gw_standort', typ: 'textarea', bezeichnung: 'Projektadresse', pflicht: true,
    platzhalter: 'Straße, PLZ, Ort',
    sektion: 'Projektdetails', reihenfolge: 8,
  },
  {
    id: 'gw_mitarbeiter', typ: 'auswahl', bezeichnung: 'Anzahl Mitarbeiter / Nutzer am Standort', pflicht: false,
    optionen: ['1–5', '6–20', '21–50', '51–100', 'über 100'],
    sektion: 'Projektdetails', reihenfolge: 9,
  },
  {
    id: 'gw_projektumfang', typ: 'mehrfach', bezeichnung: 'Was ist Teil des Projekts?', pflicht: true,
    optionen: ['Gesamtkonzept & Planung', 'Möblierung', 'Beleuchtungsplanung', 'Akustiklösungen', 'Boden- & Wandgestaltung', 'Empfangsbereich', 'Konferenzräume', 'Open Space / Arbeitsbereiche', 'Sozialräume / Küche'],
    sektion: 'Projektdetails', reihenfolge: 10,
  },
  {
    id: 'gw_ci', typ: 'ja_nein', bezeichnung: 'Gibt es Corporate Identity / Branding-Vorgaben?', pflicht: false,
    sektion: 'Branding & Stil', reihenfolge: 11,
  },
  {
    id: 'gw_ci_dokumente', typ: 'upload', bezeichnung: 'CI-Dokumente / Logofiles hochladen', pflicht: false,
    upload_typen: ['application/pdf', 'image/png', 'image/svg+xml', 'application/zip'], max_mb: 50,
    sektion: 'Branding & Stil', reihenfolge: 12,
  },
  {
    id: 'gw_budget_verteilung', typ: 'budget_verteilung', bezeichnung: 'Wie soll das Budget aufgeteilt werden?', pflicht: false,
    budget_kategorien: ['Möbel & Einrichtung', 'Beleuchtung', 'Bodenbelag', 'Wandgestaltung', 'Akustik', 'Technische Ausstattung', 'Sonstiges'],
    sektion: 'Budget & Zeitplan', reihenfolge: 13,
  },
  {
    id: 'gw_gesamtbudget', typ: 'skala', bezeichnung: 'Gesamtbudget (€)', pflicht: false,
    min: 20000, max: 500000, schritt: 20000, einheit: '€',
    sektion: 'Budget & Zeitplan', reihenfolge: 14,
  },
  {
    id: 'gw_deadline', typ: 'datum', bezeichnung: 'Gewünschte Fertigstellung / Eröffnung', pflicht: false,
    sektion: 'Budget & Zeitplan', reihenfolge: 15,
  },
  {
    id: 'gw_betrieb_weiter', typ: 'ja_nein', bezeichnung: 'Muss während der Umbauphase der Betrieb weiterlaufen?', pflicht: false,
    sektion: 'Rahmenbedingungen', reihenfolge: 16,
  },
  {
    id: 'gw_grundriss', typ: 'upload', bezeichnung: 'Grundrisse / Bestandspläne', pflicht: false,
    upload_typen: ['application/pdf', 'image/jpeg', 'image/png', '.dwg'], max_mb: 50,
    sektion: 'Rahmenbedingungen', reihenfolge: 17,
  },
  {
    id: 'gw_anmerkungen', typ: 'textarea', bezeichnung: 'Besondere Anforderungen, Normen oder Anmerkungen', pflicht: false,
    platzhalter: 'z.B. Brandschutz, Barrierefreiheit, behördliche Auflagen …',
    sektion: 'Rahmenbedingungen', reihenfolge: 18,
  },
]

export async function erstelleStandardOnboardingVorlagen(orgId: string): Promise<{ erstellt: number; fehler?: string }> {
  try {
    const admin = createAdminClient()

    // Prüfen ob bereits Onboarding-Vorlagen existieren
    const { data: bestehende } = await admin
      .from('onboarding_vorlagen')
      .select('id')
      .eq('organisation_id', orgId)
      .limit(1)

    if (bestehende && bestehende.length > 0) {
      return { erstellt: 0 }
    }

    const vorlagen = [
      {
        organisation_id: orgId,
        name: 'Neukunden-Onboarding – Standard',
        beschreibung: 'Allgemeines Erstgespräch-Formular für neue Interessenten: Kontakt, Projektart, Stil & Budget.',
        typ: 'neukunde',
        fragen: ONBOARDING_NEUKUNDE_FRAGEN,
        einleitung_text: 'Herzlich willkommen! Damit wir Ihr Projekt optimal begleiten können, bitten wir Sie, die folgenden Fragen zu beantworten. Die Angaben helfen uns, ein passgenaues Konzept für Sie zu entwickeln.',
        abschluss_text: 'Vielen Dank für Ihre Angaben! Wir melden uns in Kürze bei Ihnen, um einen ersten Beratungstermin zu vereinbaren.',
        email_betreff: 'Ihr Onboarding-Fragebogen wurde erfolgreich eingereicht',
      },
      {
        organisation_id: orgId,
        name: 'Projekt-Onboarding – Privat',
        beschreibung: 'Detaillierter Aufnahmebogen für private Wohnprojekte (Haus/Wohnung): Bestand, Räume, Budget, Prioritäten.',
        typ: 'projekt',
        fragen: ONBOARDING_PRIVAT_FRAGEN,
        einleitung_text: 'Um Ihr Wohnprojekt so persönlich und präzise wie möglich planen zu können, benötigen wir einige Informationen von Ihnen. Der Fragebogen dauert ca. 5–10 Minuten.',
        abschluss_text: 'Ausgezeichnet – alle Angaben wurden gespeichert. Unser Team wertet Ihre Antworten aus und erstellt auf dieser Basis ein erstes Konzept. Wir freuen uns auf die Zusammenarbeit!',
        email_betreff: 'Ihre Projektangaben für das private Wohnprojekt sind eingegangen',
        deadline_tage: 14,
      },
      {
        organisation_id: orgId,
        name: 'Projekt-Onboarding – Gewerbe',
        beschreibung: 'Umfassender Aufnahmebogen für gewerbliche Projekte: Branche, Nutzfläche, CI-Vorgaben, Budget-Verteilung.',
        typ: 'projekt',
        fragen: ONBOARDING_GEWERBE_FRAGEN,
        einleitung_text: 'Vielen Dank für Ihr Interesse an unseren Leistungen. Mit diesem Fragebogen erfassen wir alle wesentlichen Eckdaten Ihres Gewerbeprojekts. Die Angaben ermöglichen uns eine gezielte Vorbereitung auf Ihr Erstgespräch.',
        abschluss_text: 'Ihre Projektdaten wurden erfolgreich übermittelt. Wir erstellen auf Basis Ihrer Angaben ein maßgeschneidertes Konzeptangebot und melden uns schnellstmöglich bei Ihnen.',
        email_betreff: 'Ihre Projektdaten für das Gewerbeprojekt wurden erfasst',
        deadline_tage: 21,
      },
    ]

    const { error } = await admin.from('onboarding_vorlagen').insert(vorlagen)
    if (error) return { erstellt: 0, fehler: error.message }

    revalidatePath('/dashboard/onboarding')
    return { erstellt: vorlagen.length }
  } catch (err) {
    return { erstellt: 0, fehler: String(err) }
  }
}

// ── Server Action für manuelle Auslösung aus der UI ──────────

export async function standardVorlagenErstellenAction(): Promise<{ erstellt: number; fehler?: string }> {
  const { createClient, getOrganisationId } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erstellt: 0, fehler: 'Nicht angemeldet.' }

  const orgId = await getOrganisationId()
  if (!orgId) return { erstellt: 0, fehler: 'Keine Organisation gefunden.' }

  // Prüfen ob bereits Vorlagen existieren (ohne Override)
  const admin = createAdminClient()
  const { data: bestehende } = await admin
    .from('vertrags_vorlagen')
    .select('id')
    .eq('organisation_id', orgId)
    .limit(1)

  if (bestehende && bestehende.length > 0) {
    return { erstellt: 0, fehler: 'Es sind bereits Vorlagen vorhanden. Bitte löschen Sie bestehende Vorlagen zuerst, falls Sie einen Neustart wünschen.' }
  }

  return erstelleStandardVorlagen(orgId)
}
