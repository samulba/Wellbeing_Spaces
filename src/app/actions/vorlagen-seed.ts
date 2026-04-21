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
// Feldnamen müssen exakt zum OnboardingFrage-Interface passen:
//   titel (nicht "bezeichnung"), pflichtfeld (nicht "pflicht"),
//   placeholder (nicht "platzhalter"), sektion_id (nicht "sektion"),
//   typ: 'mehrfachauswahl' (nicht "mehrfach").

type SeedFrage = {
  id: string
  titel: string
  typ: string
  pflichtfeld: boolean
  beschreibung?: string
  placeholder?: string
  optionen?: string[]
  sektion_id?: string
}

// ── 1) Kontakt-Anfrage (Kunden-Onboarding, kurz) ──────────────
const ONBOARDING_KONTAKT_FRAGEN: SeedFrage[] = [
  { id: 'kontakt_name',    titel: 'Ihr vollständiger Name',               typ: 'text',      pflichtfeld: true,  placeholder: 'Vor- und Nachname' },
  { id: 'kontakt_email',   titel: 'E-Mail-Adresse',                        typ: 'email',     pflichtfeld: true,  placeholder: 'sie@beispiel.de' },
  { id: 'kontakt_telefon', titel: 'Telefonnummer',                         typ: 'telefon',   pflichtfeld: false, placeholder: '+49 …' },
  { id: 'kontakt_firma',   titel: 'Firma (optional)',                      typ: 'text',      pflichtfeld: false },
  { id: 'kontakt_adresse', titel: 'Adresse / Wohnort',                     typ: 'textarea',  pflichtfeld: false, placeholder: 'Straße, PLZ, Ort' },
  { id: 'kontakt_kanal',   titel: 'Wie sind Sie auf uns aufmerksam geworden?', typ: 'auswahl', pflichtfeld: false,
    optionen: ['Empfehlung', 'Instagram', 'Google', 'Website', 'Messe / Event', 'Presse', 'Sonstiges'] },
  { id: 'kontakt_interesse', titel: 'Womit können wir Ihnen helfen?',      typ: 'mehrfachauswahl', pflichtfeld: true,
    optionen: ['Erstberatung', 'Kompletteinrichtung', 'Einzelraum gestalten', 'Konzept / Moodboard', 'Produktauswahl', 'Begleitung bei Umbau'] },
  { id: 'kontakt_zeitpunkt', titel: 'Wann möchten Sie starten?',            typ: 'auswahl',   pflichtfeld: false,
    optionen: ['Sofort', 'In 1–3 Monaten', 'In 3–6 Monaten', 'Später', 'Flexibel'] },
  { id: 'kontakt_notiz',   titel: 'Ihre Nachricht an uns',                 typ: 'textarea',  pflichtfeld: false,
    beschreibung: 'Erzählen Sie uns kurz, worum es geht.',
    placeholder: 'Ich interessiere mich für …' },
  { id: 'kontakt_einwilligung', titel: 'Ich bin mit der Kontaktaufnahme per E-Mail oder Telefon einverstanden', typ: 'ja_nein', pflichtfeld: true },
]

// ── 2) Neukunden-Onboarding (ausführlich, mit Projekt-Ansatz) ──
const ONBOARDING_NEUKUNDE_FRAGEN: SeedFrage[] = [
  { id: 'nk_name',         titel: 'Ihr vollständiger Name',                typ: 'text',      pflichtfeld: true },
  { id: 'nk_email',        titel: 'E-Mail-Adresse',                        typ: 'email',     pflichtfeld: true },
  { id: 'nk_telefon',      titel: 'Telefonnummer',                         typ: 'telefon',   pflichtfeld: false },
  { id: 'nk_projektart',   titel: 'Was planen Sie?',                       typ: 'auswahl',   pflichtfeld: true,
    optionen: ['Kompletteinrichtung', 'Teilrenovierung', 'Einzelraum gestalten', 'Beratung / Konzept'] },
  { id: 'nk_flaeche',      titel: 'Wohnfläche (m²)',                        typ: 'zahl',      pflichtfeld: false },
  { id: 'nk_raumtypen',    titel: 'Welche Räume sollen gestaltet werden?', typ: 'mehrfachauswahl', pflichtfeld: false,
    optionen: ['Wohnzimmer', 'Schlafzimmer', 'Küche', 'Esszimmer', 'Bad', 'Arbeitszimmer', 'Kinderzimmer', 'Flur'] },
  { id: 'nk_budget',       titel: 'Geplantes Budget (€)',                   typ: 'auswahl',   pflichtfeld: false,
    optionen: ['bis 10.000 €', '10.000 – 25.000 €', '25.000 – 50.000 €', '50.000 – 100.000 €', 'über 100.000 €', 'noch unklar'] },
  { id: 'nk_stil',         titel: 'Welche Einrichtungsstile gefallen Ihnen?', typ: 'mehrfachauswahl', pflichtfeld: false,
    optionen: ['Modern', 'Skandinavisch', 'Industrial', 'Klassisch', 'Mediterran', 'Japandi', 'Boho', 'Minimalistisch'] },
  { id: 'nk_farben',       titel: 'Bevorzugte Farben oder Farbwelten',      typ: 'text',      pflichtfeld: false,
    placeholder: 'z.B. Erdtöne, Blau-Grün, Schwarz-Weiß …' },
  { id: 'nk_einzugsdatum', titel: 'Gewünschter Fertigstellungstermin',       typ: 'datum',    pflichtfeld: false },
  { id: 'nk_wie_gefunden', titel: 'Wie sind Sie auf uns aufmerksam geworden?', typ: 'auswahl', pflichtfeld: false,
    optionen: ['Empfehlung', 'Instagram', 'Google', 'Messe', 'Website', 'Sonstiges'] },
  { id: 'nk_notizen',      titel: 'Weitere Anmerkungen oder Wünsche',        typ: 'textarea', pflichtfeld: false,
    placeholder: 'Gibt es etwas Besonderes, das wir wissen sollten?' },
]

// ── 3) Projekt-Briefing bestehender Kunde (keine Kontaktfragen) ──
const ONBOARDING_PROJEKT_BESTEHEND_FRAGEN: SeedFrage[] = [
  { id: 'projekt_name',      titel: 'Projekt-Bezeichnung',            typ: 'text',     pflichtfeld: true,  placeholder: 'z.B. Umbau Wohnzimmer 2026' },
  { id: 'projekt_adresse',   titel: 'Projektadresse',                 typ: 'textarea', pflichtfeld: true,  placeholder: 'Straße, PLZ, Ort' },
  { id: 'projekt_objekttyp', titel: 'Objekttyp',                      typ: 'auswahl',  pflichtfeld: true,
    optionen: ['Einfamilienhaus', 'Doppelhaushälfte', 'Reihenhaus', 'Wohnung (Eigentum)', 'Mietwohnung', 'Ferienhaus', 'Gewerbe-Objekt'] },
  { id: 'projekt_flaeche',   titel: 'Wohn-/Nutzfläche (m²)',           typ: 'zahl',     pflichtfeld: true },
  { id: 'projekt_raeume',    titel: 'Zu gestaltende Räume',           typ: 'mehrfachauswahl', pflichtfeld: true,
    optionen: ['Wohnzimmer', 'Schlafzimmer', 'Kinderzimmer', 'Küche', 'Esszimmer', 'Bad', 'Gäste-WC', 'Arbeitszimmer', 'Flur', 'Terrasse/Balkon'] },
  { id: 'projekt_zustand',   titel: 'Aktueller Zustand',               typ: 'auswahl',  pflichtfeld: false,
    optionen: ['Neubau / Rohbau', 'Renovierungsbedürftig', 'Gepflegt, teilweise erneuert', 'Vollständig renoviert'] },
  { id: 'projekt_bewohnt',   titel: 'Ist die Immobilie während der Arbeiten bewohnt?', typ: 'ja_nein', pflichtfeld: false },
  { id: 'projekt_budget',    titel: 'Gesamtbudget (€)',                typ: 'auswahl',  pflichtfeld: false,
    optionen: ['bis 25.000 €', '25.000 – 50.000 €', '50.000 – 100.000 €', '100.000 – 250.000 €', 'über 250.000 €'] },
  { id: 'projekt_prioritaet', titel: 'Was ist Ihnen am wichtigsten?', typ: 'mehrfachauswahl', pflichtfeld: false,
    optionen: ['Gemütlichkeit', 'Funktionalität', 'Optik / Design', 'Nachhaltigkeit', 'Langlebigkeit', 'Preis-Leistung'] },
  { id: 'projekt_stilgefuehl', titel: 'Wie wichtig ist Ihnen ein bestimmter Stil? (1 = gar nicht, 10 = sehr wichtig)',
    typ: 'skala', pflichtfeld: false },
  { id: 'projekt_deadline',  titel: 'Gewünschter Fertigstellungstermin', typ: 'datum',  pflichtfeld: false },
  { id: 'projekt_anmerk',    titel: 'Besondere Anforderungen oder Anmerkungen', typ: 'textarea', pflichtfeld: false,
    placeholder: 'z.B. Allergien, Barrierefreiheit, Haustiere …' },
]

// ── 4) Projekt-Privat (ausführlich) ───────────────────────────
const ONBOARDING_PRIVAT_FRAGEN: SeedFrage[] = [
  { id: 'pv_name',         titel: 'Name des Auftraggebers',              typ: 'text',     pflichtfeld: true },
  { id: 'pv_email',        titel: 'E-Mail-Adresse',                      typ: 'email',    pflichtfeld: true },
  { id: 'pv_telefon',      titel: 'Telefon',                             typ: 'telefon',  pflichtfeld: false },
  { id: 'pv_adresse',      titel: 'Projektadresse',                      typ: 'textarea', pflichtfeld: true,  placeholder: 'Straße, PLZ, Ort' },
  { id: 'pv_eigentuemer',  titel: 'Sind Sie Eigentümer der Immobilie?',  typ: 'ja_nein',  pflichtfeld: true },
  { id: 'pv_objekttyp',    titel: 'Objekttyp',                           typ: 'auswahl',  pflichtfeld: true,
    optionen: ['Einfamilienhaus', 'Doppelhaushälfte', 'Reihenhaus', 'Wohnung (Eigentum)', 'Mietwohnung', 'Ferienhaus'] },
  { id: 'pv_flaeche',      titel: 'Wohnfläche (m²)',                      typ: 'zahl',     pflichtfeld: true },
  { id: 'pv_raeume',       titel: 'Zu gestaltende Räume',                typ: 'mehrfachauswahl', pflichtfeld: true,
    optionen: ['Wohnzimmer', 'Schlafzimmer', 'Kinderzimmer', 'Küche', 'Esszimmer', 'Bad', 'Gäste-WC', 'Arbeitszimmer', 'Flur', 'Terrasse/Balkon'] },
  { id: 'pv_zustand',      titel: 'Aktueller Zustand der Immobilie',      typ: 'auswahl',  pflichtfeld: false,
    optionen: ['Neubau / Rohbau', 'Renovierungsbedürftig', 'Gepflegt, teilweise erneuert', 'Vollständig renoviert'] },
  { id: 'pv_budget',       titel: 'Gesamtbudget Einrichtung',            typ: 'auswahl',  pflichtfeld: false,
    optionen: ['bis 25.000 €', '25.000 – 50.000 €', '50.000 – 100.000 €', '100.000 – 200.000 €', 'über 200.000 €'] },
  { id: 'pv_fotos',        titel: 'Fotos des aktuellen Zustands (optional)', typ: 'upload', pflichtfeld: false,
    beschreibung: 'Sie können uns Fotos per Mail nachreichen — bitte hier kurz beschreiben, welche Räume Sie fotografiert haben.' },
  { id: 'pv_grundriss',    titel: 'Haben Sie einen Grundriss?',           typ: 'ja_nein',  pflichtfeld: false,
    beschreibung: 'Falls ja, senden Sie uns den Plan gern separat zu.' },
  { id: 'pv_wunschtermin', titel: 'Gewünschter Fertigstellungstermin',     typ: 'datum',   pflichtfeld: false },
  { id: 'pv_anmerkungen',  titel: 'Besondere Anforderungen oder Anmerkungen', typ: 'textarea', pflichtfeld: false },
]

// ── 5) Projekt-Gewerbe (ausführlich) ──────────────────────────
const ONBOARDING_GEWERBE_FRAGEN: SeedFrage[] = [
  { id: 'gw_firma',          titel: 'Firmenname',                          typ: 'text',     pflichtfeld: true },
  { id: 'gw_ansprechpartner', titel: 'Ansprechpartner (Name, Funktion)',   typ: 'text',     pflichtfeld: true },
  { id: 'gw_email',          titel: 'Geschäftliche E-Mail',                 typ: 'email',    pflichtfeld: true },
  { id: 'gw_telefon',        titel: 'Telefon / Durchwahl',                  typ: 'telefon',  pflichtfeld: false },
  { id: 'gw_website',        titel: 'Website',                              typ: 'url',      pflichtfeld: false },
  { id: 'gw_branche',        titel: 'Branche / Nutzungsart',                typ: 'auswahl',  pflichtfeld: true,
    optionen: ['Büro / Coworking', 'Hotel / Hospitality', 'Restaurant / Café', 'Einzelhandel / Showroom', 'Praxis / Klinik', 'Bildung / Soziales', 'Industrie / Produktion', 'Sonstiges'] },
  { id: 'gw_flaeche',        titel: 'Nutzfläche gesamt (m²)',               typ: 'zahl',     pflichtfeld: true },
  { id: 'gw_standort',       titel: 'Projektadresse',                      typ: 'textarea', pflichtfeld: true,  placeholder: 'Straße, PLZ, Ort' },
  { id: 'gw_mitarbeiter',    titel: 'Anzahl Mitarbeiter / Nutzer am Standort', typ: 'auswahl', pflichtfeld: false,
    optionen: ['1–5', '6–20', '21–50', '51–100', 'über 100'] },
  { id: 'gw_projektumfang',  titel: 'Was ist Teil des Projekts?',           typ: 'mehrfachauswahl', pflichtfeld: true,
    optionen: ['Gesamtkonzept & Planung', 'Möblierung', 'Beleuchtungsplanung', 'Akustiklösungen', 'Boden- & Wandgestaltung', 'Empfangsbereich', 'Konferenzräume', 'Open Space', 'Sozialräume / Küche'] },
  { id: 'gw_ci',             titel: 'Gibt es Corporate Identity / Branding-Vorgaben?', typ: 'ja_nein', pflichtfeld: false },
  { id: 'gw_gesamtbudget',   titel: 'Gesamtbudget',                        typ: 'auswahl',  pflichtfeld: false,
    optionen: ['bis 50.000 €', '50.000 – 150.000 €', '150.000 – 300.000 €', '300.000 – 750.000 €', 'über 750.000 €'] },
  { id: 'gw_deadline',       titel: 'Gewünschte Fertigstellung / Eröffnung', typ: 'datum', pflichtfeld: false },
  { id: 'gw_betrieb_weiter', titel: 'Muss während der Umbauphase der Betrieb weiterlaufen?', typ: 'ja_nein', pflichtfeld: false },
  { id: 'gw_anmerkungen',    titel: 'Besondere Anforderungen, Normen oder Anmerkungen', typ: 'textarea', pflichtfeld: false,
    placeholder: 'z.B. Brandschutz, Barrierefreiheit, behördliche Auflagen …' },
]

// ── 6) Raum-Bestandsaufnahme (knapp, für Vor-Ort-Termine) ──────
const ONBOARDING_BESTAND_FRAGEN: SeedFrage[] = [
  { id: 'ba_raum',       titel: 'Um welchen Raum geht es?',            typ: 'auswahl',  pflichtfeld: true,
    optionen: ['Wohnzimmer', 'Schlafzimmer', 'Kinderzimmer', 'Küche', 'Esszimmer', 'Bad', 'Arbeitszimmer', 'Flur', 'Sonstiges'] },
  { id: 'ba_masse',      titel: 'Raum-Maße (optional)',                typ: 'text',     pflichtfeld: false,
    placeholder: 'z.B. 4,20 × 3,80 m, Höhe 2,60 m' },
  { id: 'ba_gefaellt',   titel: 'Was gefällt Ihnen aktuell gut im Raum?',  typ: 'textarea', pflichtfeld: false },
  { id: 'ba_stoert',     titel: 'Was stört Sie am aktuellen Zustand?',     typ: 'textarea', pflichtfeld: true },
  { id: 'ba_behalten',   titel: 'Welche Möbel sollen auf jeden Fall bleiben?', typ: 'textarea', pflichtfeld: false },
  { id: 'ba_ersetzen',   titel: 'Welche Möbel sollten ersetzt werden?',    typ: 'textarea', pflichtfeld: false },
  { id: 'ba_funktion',   titel: 'Wofür wird der Raum genutzt?',             typ: 'mehrfachauswahl', pflichtfeld: false,
    optionen: ['Wohnen / Aufenthalt', 'Schlafen', 'Arbeiten / Home-Office', 'Essen', 'Spielen / Kinder', 'Gäste-Empfang', 'Hobby', 'Sonstiges'] },
  { id: 'ba_nutzer',     titel: 'Wer nutzt den Raum?',                      typ: 'text',     pflichtfeld: false,
    placeholder: 'z.B. Familie mit 2 Kindern, Paar, Home-Office …' },
  { id: 'ba_licht',      titel: 'Wie zufrieden sind Sie mit dem Tageslicht?', typ: 'skala', pflichtfeld: false },
  { id: 'ba_wunsch',     titel: 'Ihre wichtigsten drei Wünsche für diesen Raum', typ: 'textarea', pflichtfeld: true,
    placeholder: '1. …\n2. …\n3. …' },
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
        name: 'Kontaktanfrage',
        beschreibung: 'Kurzes Formular für Erstkontakte: Kontaktdaten + grobes Interesse. Ideal für Website-Button oder Instagram.',
        typ: 'neukunde',
        fragen: ONBOARDING_KONTAKT_FRAGEN,
        einleitung_text: 'Hallo! Freut uns, dass Sie Kontakt aufnehmen. Mit wenigen Angaben können wir Ihre Anfrage optimal vorbereiten — das Formular dauert unter 2 Minuten.',
        abschluss_text: 'Vielen Dank! Wir melden uns in den nächsten 1–2 Werktagen bei Ihnen.',
        email_betreff: 'Ihre Anfrage ist bei uns eingegangen',
      },
      {
        organisation_id: orgId,
        name: 'Neukunden-Onboarding – Standard',
        beschreibung: 'Allgemeines Erstgespräch-Formular für neue Interessenten: Kontakt, Projektart, Stil & Budget.',
        typ: 'neukunde',
        fragen: ONBOARDING_NEUKUNDE_FRAGEN,
        ist_standard: true,
        einleitung_text: 'Herzlich willkommen! Damit wir Ihr Projekt optimal begleiten können, bitten wir Sie, die folgenden Fragen zu beantworten. Die Angaben helfen uns, ein passgenaues Konzept für Sie zu entwickeln.',
        abschluss_text: 'Vielen Dank für Ihre Angaben! Wir melden uns in Kürze bei Ihnen, um einen ersten Beratungstermin zu vereinbaren.',
        email_betreff: 'Ihr Onboarding-Fragebogen wurde erfolgreich eingereicht',
      },
      {
        organisation_id: orgId,
        name: 'Projekt-Briefing – bestehender Kunde',
        beschreibung: 'Für bereits bekannte Kunden: nur Projekt-Details, Adresse, Räume, Budget. Keine Kontaktfragen, da der Kunde schon verknüpft ist.',
        typ: 'projekt',
        fragen: ONBOARDING_PROJEKT_BESTEHEND_FRAGEN,
        einleitung_text: 'Schön, dass Sie uns mit einem weiteren Projekt beauftragen! Bitte füllen Sie den folgenden Fragebogen aus, damit wir mit der Planung starten können.',
        abschluss_text: 'Alle Angaben sind gespeichert. Wir starten direkt mit der Konzeption und melden uns bei Ihnen.',
        email_betreff: 'Ihre Projekt-Angaben sind eingegangen',
        deadline_tage: 14,
      },
      {
        organisation_id: orgId,
        name: 'Projekt-Onboarding – Privat',
        beschreibung: 'Detaillierter Aufnahmebogen für private Wohnprojekte (Haus/Wohnung): Bestand, Räume, Budget.',
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
        beschreibung: 'Umfassender Aufnahmebogen für gewerbliche Projekte: Branche, Nutzfläche, CI-Vorgaben, Budget.',
        typ: 'projekt',
        fragen: ONBOARDING_GEWERBE_FRAGEN,
        einleitung_text: 'Vielen Dank für Ihr Interesse an unseren Leistungen. Mit diesem Fragebogen erfassen wir alle wesentlichen Eckdaten Ihres Gewerbeprojekts.',
        abschluss_text: 'Ihre Projektdaten wurden erfolgreich übermittelt. Wir erstellen auf Basis Ihrer Angaben ein maßgeschneidertes Konzeptangebot.',
        email_betreff: 'Ihre Projektdaten für das Gewerbeprojekt wurden erfasst',
        deadline_tage: 21,
      },
      {
        organisation_id: orgId,
        name: 'Raum-Bestandsaufnahme',
        beschreibung: 'Pro Raum: Maße, was bleibt / was stört, Funktionen, Wünsche. Gut vor einem Vor-Ort-Termin.',
        typ: 'projekt',
        fragen: ONBOARDING_BESTAND_FRAGEN,
        einleitung_text: 'Damit wir Ihren Raum so gut wie möglich kennenlernen, bitten wir Sie, diese kurze Bestandsaufnahme auszufüllen — so können wir unseren Vor-Ort-Termin gezielt vorbereiten.',
        abschluss_text: 'Vielen Dank! Ihre Antworten sind bei uns angekommen.',
        email_betreff: 'Ihre Raum-Bestandsaufnahme ist eingegangen',
        deadline_tage: 7,
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


// ============================================================
// Standard-Kategorien für neue Organisationen
// ============================================================

/**
 * Legt sinnvolle Default-Projektarten und Raumtypen für eine neue Organisation
 * an. Wird vom auth/callback bei Erst-Login automatisch aufgerufen. Nutzt
 * ON-CONFLICT via UNIQUE-Index → idempotent, bestehende Werte bleiben.
 *
 * Projektart = Kontext des Kunden (Hotel/Büro/Privat/…)
 * Raumtyp    = einzelner Raum     (Küche/Bad/Wohnzimmer/…)
 */
export async function erstelleStandardKategorien(orgId: string): Promise<void> {
  const admin = createAdminClient()

  const projektarten = [
    { name: 'Privat',       icon: 'Home',        reihenfolge: 1 },
    { name: 'Gewerbe',      icon: 'Store',       reihenfolge: 2 },
    { name: 'Hotel',        icon: 'Hotel',       reihenfolge: 3 },
    { name: 'Büro',         icon: 'Building',    reihenfolge: 4 },
    { name: 'Praxis',       icon: 'Heart',       reihenfolge: 5 },
    { name: 'Gastronomie',  icon: 'Utensils',    reihenfolge: 6 },
    { name: 'Wellness',     icon: 'Waves',       reihenfolge: 7 },
    { name: 'Einzelhandel', icon: 'ShoppingBag', reihenfolge: 8 },
  ]

  const raumtypen = [
    { name: 'Wohnzimmer',        icon: 'Sofa',      reihenfolge: 1 },
    { name: 'Esszimmer',         icon: 'Utensils',  reihenfolge: 2 },
    { name: 'Küche',             icon: 'ChefHat',   reihenfolge: 3 },
    { name: 'Schlafzimmer',      icon: 'BedDouble', reihenfolge: 4 },
    { name: 'Kinderzimmer',      icon: 'Bed',       reihenfolge: 5 },
    { name: 'Bad',               icon: 'Bath',      reihenfolge: 6 },
    { name: 'WC',                icon: 'Droplet',   reihenfolge: 7 },
    { name: 'Flur',              icon: 'DoorOpen',  reihenfolge: 8 },
    { name: 'Büro',              icon: 'Monitor',   reihenfolge: 9 },
    { name: 'Empfang',           icon: 'Star',      reihenfolge: 10 },
    { name: 'Besprechungsraum',  icon: 'Grid',      reihenfolge: 11 },
    { name: 'Lager',             icon: 'Archive',   reihenfolge: 12 },
    { name: 'Balkon / Terrasse', icon: 'Palmtree',  reihenfolge: 13 },
  ]

  const rows = [
    ...projektarten.map((p) => ({ organisation_id: orgId, typ: 'projektart', ...p })),
    ...raumtypen.map((r)    => ({ organisation_id: orgId, typ: 'raumtyp',    ...r })),
  ]

  // onConflict auf (organisation_id, typ, name) → idempotent
  await admin.from('kategorien').upsert(rows, {
    onConflict: 'organisation_id,typ,name',
    ignoreDuplicates: true,
  })
}
