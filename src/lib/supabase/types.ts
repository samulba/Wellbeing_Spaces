// Automatisch aus dem Schema abgeleitet – bei Schemaänderungen aktualisieren

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ProduktStatus = 'ausstehend' | 'freigegeben' | 'abgelehnt' | 'ueberarbeitung'
export type BestellStatus = 'ausstehend' | 'bestellt' | 'geliefert' | 'rechnung_erhalten'
export type ProjektStatus = 'offen' | 'in_bearbeitung' | 'freigegeben' | 'abgeschlossen'

export type KundeStatus = 'aktiv' | 'abgeschlossen' | 'pausiert'

export interface Kunde {
  id: string
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

export interface Projekt {
  id: string
  kunde_id: string
  name: string
  beschreibung: string | null
  standort: string | null
  projektart: string | null
  gesamtbudget: number | null
  status: ProjektStatus
  freigabe_pin: string | null
  archiviert: boolean
  archiviert_am: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type ProjektMitKunde = Projekt & {
  kunden: { id: string; name: string } | null
}

export interface Raum {
  id: string
  projekt_id: string
  name: string
  beschreibung: string | null
  reihenfolge: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type ProvisionsModell = 'Prozent' | 'Fix' | 'Individuell'

export interface Partner {
  id: string
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
  deleted_at: string | null
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
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type ProduktMitDetails = Produkt & {
  partner: { id: string; name: string } | null
  produktstatus: { status: ProduktStatus; kommentar: string | null } | null
}

// Externe Ansicht – nur diese Felder an Kunden übergeben
export type ProduktExtern = Pick<
  Produkt,
  'id' | 'raum_id' | 'name' | 'beschreibung' | 'menge' | 'einheit' | 'verkaufspreis' | 'bild_url' | 'produkt_url' | 'reihenfolge'
>

export interface Produktstatus {
  id: string
  produkt_id: string
  status: ProduktStatus
  kommentar: string | null
  freigegeben_am: string | null
  created_at: string
  updated_at: string
}

export interface FreigabeToken {
  id: string
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

export type OnboardingFrageTyp = 'text' | 'textarea' | 'zahl' | 'auswahl' | 'mehrfachauswahl' | 'datum'

export interface OnboardingFrage {
  id: string
  titel: string
  typ: OnboardingFrageTyp
  optionen?: string[]
  pflichtfeld: boolean
  placeholder?: string
}

export interface OnboardingVorlage {
  id: string
  name: string
  beschreibung: string | null
  fragen: OnboardingFrage[]
  ist_standard: boolean
  created_at: string
  updated_at: string
}

export interface OnboardingAnfrage {
  id: string
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
