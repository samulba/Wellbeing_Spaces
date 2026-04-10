// Automatisch aus dem Schema abgeleitet – bei Schemaänderungen aktualisieren

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ProduktStatus = 'ausstehend' | 'freigegeben' | 'abgelehnt' | 'ueberarbeitung'
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
