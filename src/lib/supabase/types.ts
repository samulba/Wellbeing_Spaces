// Automatisch aus dem Schema abgeleitet – bei Schemaänderungen aktualisieren

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ── Organisation ──────────────────────────────────────────────
export type AboPlan = 'trial' | 'starter' | 'professional' | 'enterprise'

export interface Organisation {
  id: string
  name: string
  slug: string | null
  email: string | null
  telefon: string | null
  website: string | null
  adresse: string | null
  logo_url: string | null
  abo_plan: AboPlan
  abo_aktiv_bis: string | null
  max_projekte: number
  max_mitglieder: number
  created_at: string
  updated_at: string
}

// ── Kategorien ────────────────────────────────────────────────
export type KategorieTyp = 'produktkategorie' | 'raumtyp' | 'projektart'

export interface Kategorie {
  id: string
  organisation_id: string
  typ: KategorieTyp
  name: string
  icon: string
  reihenfolge: number
  created_at: string
  updated_at: string
}

export type ProduktStatus = 'ausstehend' | 'freigegeben' | 'abgelehnt' | 'ueberarbeitung'
export type BestellStatus = 'ausstehend' | 'bestellt' | 'geliefert' | 'rechnung_erhalten'
export type ProjektStatus = 'offen' | 'in_bearbeitung' | 'freigegeben' | 'abgeschlossen'

export interface ProjektAktivitaet {
  id: string
  projekt_id: string
  user_id: string | null
  typ: string
  beschreibung: string | null
  created_at: string
}

export type KundeStatus = 'aktiv' | 'abgeschlossen' | 'pausiert'

export interface Kunde {
  id: string
  organisation_id?: string | null
  name: string
  ansprechpartner: string | null
  email: string | null
  telefon: string | null
  adresse: string | null
  notizen: string | null
  status: KundeStatus
  logo_url: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type ServiceModell = 'pauschale' | 'stundensatz'

export interface Projekt {
  id: string
  organisation_id?: string | null
  kunde_id: string
  name: string
  beschreibung: string | null
  standort: string | null
  projektart: string | null
  gesamtbudget: number | null
  // Service-Abrechnung (Migration 040)
  service_modell: ServiceModell | null
  service_pauschale: number | null
  service_stundensatz: number | null
  produkt_budget: number | null
  status: ProjektStatus
  freigabe_pin: string | null
  archiviert: boolean
  archiviert_am: string | null
  deadline: string | null
  verantwortlicher_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// ── Zeiterfassung (Migration 040) ─────────────────────────────
export interface Zeiterfassung {
  id: string
  organisation_id: string
  projekt_id: string
  user_id: string | null
  datum: string
  stunden: number
  beschreibung: string | null
  abrechenbar: boolean
  created_at: string
}

export type ProjektMitKunde = Projekt & {
  kunden: { id: string; name: string; email: string | null; telefon: string | null; ansprechpartner: string | null } | null
}

export interface Raum {
  id: string
  organisation_id?: string | null
  projekt_id: string
  name: string
  beschreibung: string | null
  icon: string | null
  reihenfolge: number
  budget: number | null
  // Raumplaner (Migration 045)
  grundriss_json: Json | null
  breite_m: number | null
  laenge_m: number | null
  hoehe_m: number | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// ── Möbel-Symbole (Migration 045) ─────────────────────────────
export interface MoebelSymbol {
  id: string
  organisation_id: string | null
  name: string
  kategorie_id: string | null
  svg_path: string
  breite_cm: number
  tiefe_cm: number
  farbe: string
  ist_system: boolean
  created_at: string
}

// ── Custom Möbel (Migration 046) ──────────────────────────────
export interface CustomMoebel {
  id: string
  organisation_id: string | null
  name: string
  kategorie: string
  breite_cm: number
  laenge_cm: number
  farbe: string
  ist_favorit: boolean
  created_by: string | null
  created_at: string
}

export type ProvisionsModell = 'Prozent' | 'Fix' | 'Individuell'
export type PartnerTyp = 'lieferant' | 'hersteller' | 'handwerker' | 'planer' | 'sonstiges'

export interface Partner {
  id: string
  organisation_id?: string | null
  name: string
  ansprechpartner: string | null
  email: string | null
  telefon: string | null
  website: string | null
  provisionsmodell: ProvisionsModell | null
  provisions_wert: number | null
  einkaufskonditionen: string | null
  notizen: string | null
  logo_url: string | null
  // Neue Felder (Migration 039)
  partner_typ: PartnerTyp | null
  zahlungsziel_tage: number | null
  iban: string | null
  ust_id: string | null
  bewertung: number | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// ── Partner-Konditionen (Migration 039) ───────────────────────
export type PartnerKonditionTyp =
  | 'prozent_fix'
  | 'prozent_gestaffelt'
  | 'fix_pro_produkt'
  | 'fix_pro_bestellung'
  | 'kategorie_basiert'
  | 'rabatt_einkauf'
  | 'mindestbestellwert'

export interface PartnerKondition {
  id: string
  organisation_id: string
  partner_id: string
  name: string
  typ: PartnerKonditionTyp
  wert: number | null
  staffelung: Json | null
  kategorie_werte: Json | null
  gueltig_von: string | null
  gueltig_bis: string | null
  zahlungsziel_tage: number | null
  skonto_prozent: number | null
  skonto_tage: number | null
  notizen: string | null
  aktiv: boolean
  created_at: string
  updated_at: string
}

// Öffentliche Produkt-Felder für Freigabe-Ansicht – KEINE internen Felder
export interface FreigabeProdukt {
  id: string
  name: string
  beschreibung: string | null
  kategorie: string | null
  menge: number
  einheit: string
  verkaufspreis: number | null
  bild_url: string | null
  produkt_url: string | null
  status: ProduktStatus
  kommentar: string | null
  // Vermerk (Migration 058) — NUR gesetzt wenn hinweis_extern_sichtbar=true
  hinweis?: string | null
  // Rabatt pro Raum-Produkt (Migration 058) — prozentual, bereits in verkaufspreis berücksichtigt
  rabatt_prozent?: number | null
}

export interface FreigabeRaum {
  id: string
  name: string
  produkte: FreigabeProdukt[]
}

// ── Statische Verfügbarkeit (Migration 058) ──────────────────
// Bewusst statisch — keine täglich zu pflegenden Status.
export type ProduktVerfuegbarkeit =
  | 'auf_anfrage'
  | 'saisonal'
  | 'lieferzeit_4_6'
  | 'standard'

export interface Produkt {
  id: string
  organisation_id?: string | null
  raum_id: string | null  // null = Produktbibliothek (kein Projekt/Raum)
  partner_id: string | null
  name: string
  beschreibung: string | null
  kategorie: string | null
  menge: number
  einheit: string
  // Interne Felder – NIE in externe Kundenansicht übergeben
  einkaufspreis: number | null
  marge_prozent: number | null
  provision_prozent: number | null
  notizen_intern: string | null
  // Externe Felder
  verkaufspreis: number | null
  bild_url: string | null
  produkt_url: string | null
  reihenfolge: number
  bestellstatus: BestellStatus
  // Bestell- & Liefer-Tracking (liefertermin via Migration 029, bestellt_am/lieferung_erhalten_am via 057)
  liefertermin?: string | null
  bestellt_am?: string | null
  lieferung_erhalten_am?: string | null
  // Statische Eigenschaften (Migration 031 Feld, Wert-Refactor Migration 058)
  verfuegbarkeit?: ProduktVerfuegbarkeit | null
  // Vermerk / Hinweis (Migration 058)
  hinweis_extern?: string | null
  hinweis_extern_sichtbar?: boolean
  // Varianten (Migration 041)
  ist_variante: boolean
  eltern_produkt_id: string | null
  varianten_attribute: Json | null  // z.B. {"farbe": "Eiche", "groesse": "120x80"}
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// ── Varianten-Definitionen (Migration 041) ────────────────────
export interface VariantenDefinition {
  id: string
  organisation_id: string
  produkt_id: string
  attribut_name: string
  optionen: string[]
  reihenfolge: number
}

export type ProduktMitDetails = Produkt & {
  partner: { id: string; name: string } | null
  produktstatus: { status: ProduktStatus; kommentar: string | null } | null
}

// ── Raum-Produkt-Verknüpfung (Migration 038 + 058 Rabatt) ────
export interface RaumProdukt {
  id: string
  organisation_id: string
  raum_id: string
  produkt_id: string
  menge: number
  verkaufspreis_override: number | null
  rabatt_prozent: number | null
  reihenfolge: number
  notizen: string | null
  created_at: string
}

export type RaumProduktMitDetails = RaumProdukt & {
  produkte: ProduktMitDetails
}

// Externe Ansicht – nur diese Felder an Kunden übergeben
export type ProduktExtern = Pick<
  Produkt,
  'id' | 'raum_id' | 'name' | 'beschreibung' | 'menge' | 'einheit' | 'verkaufspreis' | 'bild_url' | 'produkt_url' | 'reihenfolge'
>

export interface Produktstatus {
  id: string
  organisation_id?: string | null
  produkt_id: string
  status: ProduktStatus
  kommentar: string | null
  freigegeben_am: string | null
  created_at: string
  updated_at: string
}

export interface FreigabeToken {
  id: string
  organisation_id?: string | null
  projekt_id: string
  token: string
  gueltig_bis: string | null
  aktiv: boolean
  created_at: string
}

// ── Team ──────────────────────────────────────────────────────
export type Rolle = 'admin' | 'editor' | 'viewer'
export type TeamStatus = 'ausstehend' | 'aktiv' | 'deaktiviert'

export interface TeamMitglied {
  id: string
  organisation_id?: string | null
  user_id: string | null
  eingeladen_von: string | null
  email: string
  rolle: Rolle
  status: TeamStatus
  einladungs_token: string | null
  created_at: string
  updated_at: string
}

export type OnboardingStatus = 'offen' | 'in_bearbeitung' | 'abgeschlossen' | 'abgelehnt' | 'abgelaufen'
export type OnboardingTyp    = 'neukunde' | 'projekt' | 'universal'

export type OnboardingFrageTyp =
  | 'text' | 'textarea' | 'email' | 'telefon' | 'url'
  | 'zahl' | 'datum' | 'bewertung' | 'skala'
  | 'auswahl' | 'mehrfachauswahl' | 'ja_nein'
  // Neue Typen (Migration 054)
  | 'slider'             // Einzelner Bereichs-Schieberegler
  | 'budget_verteilung'  // Budget auf Räume/Kategorien aufteilen
  | 'upload'             // Datei- / Foto-Upload
  | 'inventar'           // Bestandserfassung (Fotos + behalten/weg)
  | 'prioritaeten'       // Drag-&-Drop Rangfolge
  | 'datum_rechner'      // Deadline-Kalkulator
  | 'entscheider_matrix' // Wer entscheidet was? (Rollen-Matrix)
  | 'checkliste'         // Smart-Checkliste mit Häkchen
  | 'rangfolge'          // Explizite Sortierung / Ranking

export interface OnboardingBedingtVon {
  frage_id: string
  operator: 'gleich' | 'nicht_gleich' | 'enthaelt' | 'nicht_leer' | 'ist_leer'
  wert: string
}

export interface OnboardingSektion {
  id: string
  name: string
  beschreibung?: string
}

export interface OnboardingFrage {
  id: string
  titel: string
  beschreibung?: string        // Hilfetext unter dem Label
  typ: OnboardingFrageTyp
  optionen?: string[]
  pflichtfeld: boolean
  placeholder?: string
  sektion_id?: string
  bild_url?: string
  // Conditional Logic
  bedingt_von?: OnboardingBedingtVon
  // Slider
  slider_min?: number
  slider_max?: number
  slider_schritt?: number
  slider_einheit?: string      // z. B. '€', '%', 'm²'
  // Upload
  upload_typen?: string[]      // z. B. ['image/*']
  upload_max_mb?: number
  // Mehrfachauswahl-Limit
  max_auswahl?: number
  // Budget-Verteilung
  budget_kategorien?: string[]
}

export interface OnboardingVorlage {
  id: string
  organisation_id?: string | null
  name: string
  beschreibung: string | null
  typ: OnboardingTyp
  fragen: OnboardingFrage[]
  sektionen?: OnboardingSektion[]
  ist_standard: boolean
  // White-Label
  einleitung_text?: string | null
  abschluss_text?: string | null
  logo_url?: string | null
  akzent_farbe?: string | null
  redirect_url?: string | null
  // E-Mail
  email_betreff?: string | null
  email_text?: string | null
  // Gültigkeit
  deadline_tage?: number | null
  created_at: string
  updated_at: string
}

// ── Onboarding-Datei-Uploads (Migration 054) ─────────────────
export interface OnboardingDatei {
  id: string
  organisation_id?: string | null
  anfrage_id: string
  frage_id?: string | null
  dateiname: string
  dateityp: string
  dateigroesse?: number | null
  storage_pfad: string
  vorschau_url?: string | null
  created_at: string
}

// ── Onboarding-Inventar (Migration 054) ──────────────────────
export type InventarZustand = 'sehr_gut' | 'gut' | 'mittel' | 'schlecht'

export interface OnboardingInventarItem {
  id: string
  organisation_id?: string | null
  anfrage_id: string
  bezeichnung: string
  kategorie?: string | null
  raum?: string | null
  zustand?: InventarZustand | null
  behalten: boolean
  foto_url?: string | null
  notizen?: string | null
  reihenfolge: number
  created_at: string
  updated_at: string
}

// ── Onboarding-Prioritäten (Migration 054) ───────────────────
export interface OnboardingPrioritaet {
  id: string
  organisation_id?: string | null
  anfrage_id: string
  frage_id?: string | null
  bezeichnung: string
  icon?: string | null
  reihenfolge: number
  created_at: string
}

// ── Onboarding-Sektionen relational (Migration 055) ──────────
export interface OnboardingSektion055 {
  id: string
  organisation_id?: string | null
  vorlage_id: string
  name: string
  beschreibung?: string | null
  icon?: string | null
  reihenfolge: number
  ist_optional: boolean
  bedingung?: OnboardingBedingtVon | null
  erstellt_am: string
}

// ── Onboarding-Budget-Verteilung (Migration 055) ─────────────
export interface OnboardingBudgetVerteilung {
  id: string
  organisation_id?: string | null
  anfrage_id: string
  frage_id?: string | null
  kategorie: string
  prozent?: number | null
  betrag?: number | null
  erstellt_am: string
  aktualisiert_am: string
}

// ── Onboarding-Entscheider (Migration 055) ───────────────────
export type EntscheiderRolle = 'person_a' | 'person_b' | 'beide' | 'offen'

export interface OnboardingEntscheider {
  id: string
  organisation_id?: string | null
  anfrage_id: string
  frage_id?: string | null
  bereich: string
  entscheider?: EntscheiderRolle | null
  person_name?: string | null
  erstellt_am: string
}

// ── Onboarding-Branding pro Org (Migration 055) ──────────────
export interface OnboardingBranding {
  id: string
  organisation_id?: string | null
  logo_url?: string | null
  favicon_url?: string | null
  primaerfarbe: string
  sekundaerfarbe: string
  akzentfarbe: string
  hintergrundfarbe: string
  schriftart: string
  custom_css?: string | null
  willkommens_text?: string | null
  abschluss_text?: string | null
  footer_text?: string | null
  custom_domain?: string | null
  erstellt_am: string
  aktualisiert_am: string
}

// ── Onboarding-Checkliste (Migration 055) ────────────────────
export interface OnboardingChecklistePunkt {
  id: string
  organisation_id?: string | null
  anfrage_id: string
  titel: string
  beschreibung?: string | null
  ist_erledigt: boolean
  ist_automatisch: boolean
  erledigt_am?: string | null
  erledigt_von?: string | null
  reihenfolge: number
  erstellt_am: string
}

// ── Zugangsinformationen (JSONB auf onboarding_anfragen) ──────
export interface ZugangsInfos {
  schluessel_typ?: string           // 'physisch' | 'code' | 'app' | 'pfoertner'
  schluessel_anzahl?: number
  parkplatz?: string                // Freitext oder 'vorhanden' | 'nicht_vorhanden'
  aufzug?: boolean
  etage?: string
  lieferzeiten_einschraenkung?: string
  sonstige_zugangsinfos?: string
}

// ── Vertrags-Basis (JSONB auf onboarding_anfragen) ────────────
export interface VertragsBasis {
  preismodell?: 'festpreis' | 'aufwand' | 'hybrid'
  anzahlung_prozent?: number
  anzahlung_betrag?: number
  elektr_unterschrift_gewuenscht?: boolean
  sonstige_vertragsinfos?: string
}

// ── Kunden-Konfigurator ───────────────────────────────────────
export type KonfiguratorStatus = 'aktiv' | 'abgeschlossen' | 'abgelaufen'
export type AuswahlStatus = 'ausgewaehlt' | 'abgelehnt' | 'alternative_gewuenscht' | 'unentschieden'

export interface KonfiguratorSession {
  id: string
  organisation_id?: string | null
  projekt_id: string
  token: string
  status: KonfiguratorStatus
  kunde_notizen: string | null
  budget_limit: number | null
  show_prices: boolean
  allow_alternatives: boolean
  expires_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface KonfiguratorAuswahl {
  id: string
  organisation_id?: string | null
  session_id: string
  produkt_id: string
  status: AuswahlStatus
  kunde_kommentar: string | null
  created_at: string
  updated_at: string
}

// ── Projekt-Timeline ──────────────────────────────────────────
export type TimelineEventTyp    = 'meilenstein' | 'lieferung' | 'termin' | 'phase'
export type TimelineEventStatus = 'geplant' | 'in_arbeit' | 'abgeschlossen' | 'verspaetet'

export interface TimelineEvent {
  id: string
  organisation_id?: string | null
  projekt_id: string
  titel: string
  beschreibung: string | null
  typ: TimelineEventTyp
  start_datum: string
  end_datum: string | null
  status: TimelineEventStatus
  farbe: string | null
  abhaengig_von: string[]
  verantwortlich: string | null
  erinnerung_tage: number | null
  reihenfolge: number
  created_at: string
  updated_at: string
}

export interface Branding {
  id: string
  organisation_id?: string | null
  firmenname: string
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string
  font_family: string
  email: string | null
  telefon: string | null
  website: string | null
  adresse: string | null
  impressum_text: string | null
  datenschutz_url: string | null
  show_powered_by: boolean
  custom_css: string | null
  // Migration 064 — erweiterte Portal-Branding-Felder
  welcome_text: string | null
  slogan: string | null
  button_text_color: string
  created_at: string
  updated_at: string
}

// ── Angebotsmodul (Migration 044 + 053) ──────────────────────
export type AngebotStatus =
  | 'entwurf' | 'gesendet' | 'angesehen'
  | 'angenommen' | 'abgelehnt' | 'abgelaufen' | 'ueberarbeitung'

/** JSONB-Positionsformat (Legacy, in angebote.positionen) */
export interface AngebotPosition {
  id: string
  name: string
  beschreibung: string | null
  menge: number
  einheit: string
  einzelpreis: number
  gesamtpreis: number
}

export interface Angebot {
  id: string
  organisation_id: string
  projekt_id: string | null
  kunde_id: string
  nummer: string
  titel: string
  einleitung: string | null
  positionen: AngebotPosition[]
  netto_summe: number | null
  mwst_satz: number
  mwst_betrag: number | null
  brutto_summe: number | null
  rabatt_prozent: number | null
  rabatt_betrag: number | null
  status: AngebotStatus
  gueltig_bis: string | null
  pdf_url: string | null
  anmerkungen: string | null
  agb_text: string | null
  // Neue Felder (Migration 053)
  version: number
  vorgaenger_id: string | null
  zahlungsbedingungen: string | null
  interne_notizen: string | null
  erstellt_von: string | null
  gesendet_am: string | null
  angesehen_am: string | null
  beantwortet_am: string | null
  antwort_notiz: string | null
  token: string | null
  created_at: string
  updated_at: string
}

export type AngebotPositionTyp = 'standard' | 'optional' | 'alternativ'

/** Relationale Angebot-Position (Tabelle angebot_positionen, Migration 053) */
export interface AngebotPositionRow {
  id: string
  organisation_id: string
  angebot_id: string
  raum_id: string | null
  raum_produkt_id: string | null
  position: number
  typ: AngebotPositionTyp
  gruppe: string | null
  bezeichnung: string
  beschreibung: string | null
  menge: number
  einheit: string
  ep_netto: number | null       // intern – NIE an Kunde
  vp_netto: number | null
  rabatt_prozent: number
  gesamt_netto: number | null
  vom_kunden_gewaehlt: boolean
  created_at: string
}

// ── Vertragssystem (Migration 043 + 053) ─────────────────────
export type VertragsVorlageKategorie = 'projektvertrag' | 'rahmenvertrag' | 'angebot' | 'sonstiges'
export type VertragStatus =
  | 'entwurf' | 'gesendet' | 'zur_unterschrift'
  | 'unterschrieben_kunde' | 'kunde_unterschrieben'
  | 'unterschrieben_beide' | 'aktiv'
  | 'abgeschlossen' | 'abgelaufen' | 'storniert' | 'gekuendigt'
export type Vertragstyp =
  | 'planungsvertrag' | 'ausfuehrungsvertrag'
  | 'rahmenvertrag' | 'einzelauftrag' | 'wartungsvertrag'

export interface VertragsVorlage {
  id: string
  organisation_id: string
  name: string
  beschreibung: string | null
  inhalt_html: string
  platzhalter: Json | null
  kategorie: VertragsVorlageKategorie | null
  ist_standard: boolean
  version: number
  created_at: string
  updated_at: string
}

export interface Vertrag {
  id: string
  organisation_id: string
  vorlage_id: string | null
  projekt_id: string | null
  kunde_id: string
  titel: string
  inhalt_html: string
  pdf_url: string | null
  status: VertragStatus
  signatur_kunde_url: string | null
  signatur_kunde_datum: string | null
  signatur_firma_url: string | null
  signatur_firma_datum: string | null
  signatur_token: string | null
  signatur_token_gueltig: string | null
  gesamtwert: number | null
  gueltig_bis: string | null
  // Neue Felder (Migration 053)
  angebot_id: string | null
  vertragsnummer: string | null
  vertragstyp: Vertragstyp
  version: number
  startdatum: string | null
  enddatum: string | null
  kuendigungsfrist: string | null
  gewaehrleistung_monate: number
  interne_notizen: string | null
  erstellt_von: string | null
  gesendet_am: string | null
  kunde_unterschrift_ip: string | null
  kunde_unterschrift_name: string | null
  firma_unterschrift_von: string | null
  created_at: string
  updated_at: string
}

export type MeilensteinStatus = 'offen' | 'in_arbeit' | 'erledigt' | 'abgerechnet'

export interface VertragMeilenstein {
  id: string
  organisation_id: string
  vertrag_id: string
  titel: string
  beschreibung: string | null
  reihenfolge: number
  faellig_am: string | null
  betrag: number | null
  prozent: number | null
  status: MeilensteinStatus
  erledigt_am: string | null
  created_at: string
  updated_at: string
}

export interface VertragAnhang {
  id: string
  organisation_id: string
  vertrag_id: string | null
  angebot_id: string | null
  name: string
  dateityp: string | null
  datei_url: string | null
  groesse: number | null
  hochgeladen_von: string | null
  hochgeladen_am: string
}

export type DokumentTyp = 'angebot' | 'vertrag'

export interface DokumentAktivitaet {
  id: string
  organisation_id: string
  dokument_typ: DokumentTyp
  dokument_id: string
  aktion: string
  details: string | null
  alter_status: string | null
  neuer_status: string | null
  user_id: string | null
  kunde_name: string | null
  ip_adresse: string | null
  user_agent: string | null
  created_at: string
}

// ── Kommunikationslog (Migration 042 + 056) ──────────────────
export type KommunikationTyp = 'email' | 'anruf' | 'meeting' | 'notiz' | 'chat' | 'vor_ort' | 'sonstiges'
export type KommunikationRichtung = 'eingehend' | 'ausgehend'

export interface Kommunikation {
  id: string
  organisation_id: string
  kunde_id: string
  projekt_id: string | null
  typ: KommunikationTyp
  richtung: KommunikationRichtung | null
  betreff: string | null
  inhalt: string | null
  kontaktperson: string | null
  user_id: string | null
  datum: string
  dauer_minuten: number | null
  follow_up_datum: string | null
  erledigt: boolean
  created_at: string
}

export interface OnboardingAnfrage {
  id: string
  organisation_id?: string | null
  token: string
  status: OnboardingStatus
  typ: OnboardingTyp
  vorlage_id: string | null
  projekt_id?: string | null
  kunde_id?: string | null
  antworten: Record<string, unknown> | null
  auto_save?: Record<string, unknown> | null  // Zwischengespeicherte Antworten
  fortschritt: number                          // 0–100 %
  aktuelle_sektion: number
  // Stammdaten (ausgefüllt durch Kunden)
  kunde_name: string | null
  kunde_email: string | null
  kunde_telefon: string | null
  projekt_name: string | null
  projekt_adresse: string | null
  raumtypen: string[] | null
  budget_min: number | null
  budget_max: number | null
  stil_praeferenzen: string | null
  zeitrahmen: string | null
  notizen: string | null
  // Strukturierte Sonderfelder (Migration 055)
  zugangs_infos?: ZugangsInfos | null
  vertrags_basis?: VertragsBasis | null
  // Timestamps
  abgeschlossen_am?: string | null
  gueltig_bis?: string | null
  letzte_aktivitaet?: string | null
  created_at: string
  updated_at: string
}
