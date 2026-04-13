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
  deleted_at: string | null
  created_at: string
  updated_at: string
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
}

export interface FreigabeRaum {
  id: string
  name: string
  produkte: FreigabeProdukt[]
}

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

// ── Raum-Produkt-Verknüpfung (Migration 038) ─────────────────
export interface RaumProdukt {
  id: string
  organisation_id: string
  raum_id: string
  produkt_id: string
  menge: number
  verkaufspreis_override: number | null
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

export type OnboardingStatus = 'offen' | 'abgeschlossen' | 'abgelehnt'

export type OnboardingFrageTyp =
  | 'text' | 'textarea' | 'email' | 'telefon' | 'url'
  | 'zahl' | 'datum' | 'bewertung' | 'skala'
  | 'auswahl' | 'mehrfachauswahl' | 'ja_nein'

export interface OnboardingSektion {
  id: string
  name: string
}

export interface OnboardingFrage {
  id: string
  titel: string
  typ: OnboardingFrageTyp
  optionen?: string[]
  pflichtfeld: boolean
  placeholder?: string
  sektion_id?: string
  bild_url?: string
}

export interface OnboardingVorlage {
  id: string
  organisation_id?: string | null
  name: string
  beschreibung: string | null
  fragen: OnboardingFrage[]
  sektionen?: OnboardingSektion[]
  ist_standard: boolean
  created_at: string
  updated_at: string
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
  created_at: string
  updated_at: string
}

// ── Kommunikationslog (Migration 042) ────────────────────────
export type KommunikationTyp = 'email' | 'anruf' | 'meeting' | 'notiz' | 'sms' | 'sonstiges'
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
  vorlage_id: string | null
  antworten: Record<string, unknown> | null
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
  created_at: string
  updated_at: string
}
