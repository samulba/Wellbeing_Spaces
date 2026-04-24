'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import {
  INTERIOR_DESIGN_VERTRAG_HTML,
  ANGEBOT_STANDARD_HTML,
  AUFTRAGSBESTAETIGUNG_HTML,
} from '@/lib/vertrags-template-bibliothek'

// ── HTML-Vorlagen — verlagert nach src/lib/vertrags-template-bibliothek.ts ──
// (Werden auch vom WYSIWYG-Editor als Quick-Start-Vorlagen importiert,
// daher zentral abgelegt um Drift zu vermeiden.)

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
        ist_standard: false,
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
        ist_standard: false,
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
        ist_standard: false,
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
        ist_standard: false,
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
        ist_standard: false,
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

/**
 * Server-Action zum manuellen Auslösen der Standard-Onboarding-Vorlagen.
 * Wird aus dem Empty-State der Onboarding-Vorlagen-Seite aufgerufen.
 */
export async function standardOnboardingVorlagenErstellenAction(): Promise<{ erstellt: number; fehler?: string }> {
  const { createClient, getOrganisationId } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erstellt: 0, fehler: 'Nicht angemeldet.' }

  const orgId = await getOrganisationId()
  if (!orgId) return { erstellt: 0, fehler: 'Keine Organisation gefunden.' }

  // Prüfen ob bereits Vorlagen existieren
  const admin = createAdminClient()
  const { data: bestehende } = await admin
    .from('onboarding_vorlagen')
    .select('id')
    .eq('organisation_id', orgId)
    .limit(1)

  if (bestehende && bestehende.length > 0) {
    return { erstellt: 0, fehler: 'Es sind bereits Onboarding-Vorlagen vorhanden. Bitte lösche bestehende Vorlagen zuerst, falls du einen Neustart wünschst.' }
  }

  return erstelleStandardOnboardingVorlagen(orgId)
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

  const produktkategorien = [
    { name: 'Möbel',        icon: 'Sofa',       reihenfolge: 1 },
    { name: 'Leuchten',     icon: 'Lightbulb',  reihenfolge: 2 },
    { name: 'Textilien',    icon: 'Shirt',      reihenfolge: 3 },
    { name: 'Accessoires',  icon: 'Sparkles',   reihenfolge: 4 },
    { name: 'Teppiche',     icon: 'Square',     reihenfolge: 5 },
    { name: 'Sanitär',      icon: 'Bath',       reihenfolge: 6 },
    { name: 'Küche',        icon: 'ChefHat',    reihenfolge: 7 },
    { name: 'Boden',        icon: 'Grid',       reihenfolge: 8 },
    { name: 'Wand',         icon: 'Paintbrush', reihenfolge: 9 },
    { name: 'Pflanzen',     icon: 'Leaf',       reihenfolge: 10 },
    { name: 'Kunst',        icon: 'Palette',    reihenfolge: 11 },
    { name: 'Sonstiges',    icon: 'Package',    reihenfolge: 12 },
  ]

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
    ...produktkategorien.map((p) => ({ organisation_id: orgId, typ: 'produktkategorie', ...p })),
    ...projektarten.map((p)      => ({ organisation_id: orgId, typ: 'projektart',       ...p })),
    ...raumtypen.map((r)         => ({ organisation_id: orgId, typ: 'raumtyp',          ...r })),
  ]

  // onConflict auf (organisation_id, typ, name) → idempotent
  await admin.from('kategorien').upsert(rows, {
    onConflict: 'organisation_id,typ,name',
    ignoreDuplicates: true,
  })
}


// ============================================================
// Kombinierter Seed für die UI: Kategorien + Vertragsvorlagen + Onboarding
// ============================================================

/**
 * Führt alle drei Standard-Seeds für die aktuelle Organisation aus.
 * Wird vom Kategorien-Banner aufgerufen, damit Admins neuer Orgs
 * (z.B. per SQL-Insert ohne Auth-Callback angelegt) die Default-Daten
 * nachladen können. Alle Teil-Seeds sind idempotent.
 */
export async function alleStandardDatenLadenAction(): Promise<{
  kategorien: number
  vertragsvorlagen: number
  onboardingvorlagen: number
  fehler?: string
}> {
  const { createClient, getOrganisationId } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { kategorien: 0, vertragsvorlagen: 0, onboardingvorlagen: 0, fehler: 'Nicht angemeldet.' }

  const orgId = await getOrganisationId()
  if (!orgId) return { kategorien: 0, vertragsvorlagen: 0, onboardingvorlagen: 0, fehler: 'Keine Organisation gefunden.' }

  const admin = createAdminClient()

  const { count: kategorienVorher } = await admin
    .from('kategorien')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', orgId)

  await erstelleStandardKategorien(orgId)

  const { count: kategorienNachher } = await admin
    .from('kategorien')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', orgId)

  const deltaKategorien = (kategorienNachher ?? 0) - (kategorienVorher ?? 0)

  // Vertragsvorlagen (nur wenn noch keine existieren)
  const { data: bestehendeVV } = await admin
    .from('vertrags_vorlagen')
    .select('id')
    .eq('organisation_id', orgId)
    .limit(1)
  let vvErstellt = 0
  if (!bestehendeVV || bestehendeVV.length === 0) {
    const r = await erstelleStandardVorlagen(orgId)
    vvErstellt = r.erstellt
  }

  // Onboarding-Vorlagen (prüft selbst auf Bestehendes)
  const ov = await erstelleStandardOnboardingVorlagen(orgId)

  return {
    kategorien:         deltaKategorien,
    vertragsvorlagen:   vvErstellt,
    onboardingvorlagen: ov.erstellt,
  }
}
