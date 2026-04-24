'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Organisation } from '@/lib/supabase/types'

// ── Hilfsfunktion: Slug aus Name generieren ───────────────────
function nameZuSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c] ?? c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

// ── Nur Admins dürfen Firmendaten bearbeiten ──────────────────
async function adminPruefen(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet.')

  const orgId = await getOrganisationId()
  const admin = createAdminClient()
  const { data } = await admin
    .from('team_mitglieder')
    .select('rolle')
    .eq('user_id', user.id)
    .eq('organisation_id', orgId)
    .eq('status', 'aktiv')
    .maybeSingle()

  if (data?.rolle !== 'admin') {
    throw new Error('Nur Admins dürfen Firmendaten bearbeiten.')
  }
}

// ── Organisation erstellen ────────────────────────────────────
/**
 * Erstellt eine neue Organisation.
 * Nutzt Admin-Client – kein Auth-Context erforderlich.
 */
export async function organisationErstellen(name: string): Promise<string> {
  const admin = createAdminClient()
  const slug = nameZuSlug(name)

  const { data, error } = await admin
    .from('organisationen')
    .insert({ name, slug })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Organisation konnte nicht erstellt werden: ${error?.message}`)
  }

  return data.id as string
}

// ── User mit Org verknüpfen ───────────────────────────────────
/**
 * Trägt den User als Admin in team_mitglieder ein.
 * Nutzt Admin-Client – läuft im Auth-Callback ohne User-Session.
 */
export async function userMitOrgVerknuepfen(
  userId: string,
  email: string,
  orgId: string
): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin.from('team_mitglieder').insert({
    user_id:         userId,
    email,
    rolle:           'admin',
    status:          'aktiv',
    organisation_id: orgId,
  })

  if (error) {
    throw new Error(`User konnte nicht mit Organisation verknüpft werden: ${error.message}`)
  }
}

// ── Aktuelle Organisation laden ───────────────────────────────
/**
 * Lädt die komplette Organisation des eingeloggten Users.
 */
export async function getAktuelleOrganisation(): Promise<Organisation | null> {
  const admin = createAdminClient()

  let orgId: string
  try {
    orgId = await getOrganisationId()
  } catch {
    return null
  }

  const { data } = await admin
    .from('organisationen')
    .select('*')
    .eq('id', orgId)
    .single()

  return (data as Organisation) ?? null
}

// ── Einmalige Datenmigration ──────────────────────────────────
/**
 * Einmalig manuell aufrufen nach Ausführung von Migration 036.
 * Erstellt eine Default-Org "Wellbeing Concepts", verknüpft alle
 * bestehenden team_mitglieder und setzt organisation_id auf allen
 * Datensätzen die noch NULL haben.
 */
export async function migriereBestehendeDaten(): Promise<{
  erfolg: boolean
  orgId?: string
  fehler?: string
}> {
  const admin = createAdminClient()

  // 1. Prüfen ob bereits Organisationen existieren
  const { count } = await admin
    .from('organisationen')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) {
    return { erfolg: false, fehler: 'Es existieren bereits Organisationen – Migration übersprungen.' }
  }

  // 2. Default-Organisation anlegen
  let orgId: string
  try {
    orgId = await organisationErstellen('Wellbeing Concepts')
  } catch (e) {
    return { erfolg: false, fehler: String(e) }
  }

  // 3. Alle bestehenden team_mitglieder mit Org verknüpfen
  await admin
    .from('team_mitglieder')
    .update({ organisation_id: orgId })
    .is('organisation_id', null)

  // 4. Alle Datentabellen aktualisieren
  const tabellen = [
    'kunden',
    'projekte',
    'raeume',
    'partner',
    'produkte',
    'produktstatus',
    'einstellungen',
    'branding',
    'notizen',
    'dateien',
    'freigabe_tokens',
    'onboarding_anfragen',
    'onboarding_vorlagen',
    'konfigurator_sessions',
    'konfigurator_auswahl',
    'timeline_events',
    'projekt_aktivitaeten',
    'client_users',
    'client_nachrichten',
    'client_dokumente',
    'client_aktivitaeten',
    'client_benachrichtigungen',
    'demo_anfragen',
  ] as const

  for (const tabelle of tabellen) {
    await admin
      .from(tabelle)
      .update({ organisation_id: orgId })
      .is('organisation_id', null)
  }

  return { erfolg: true, orgId }
}

// ═════════════════════════════════════════════════════════════
// FIRMEN-STAMMDATEN (Migration 084)
// ═════════════════════════════════════════════════════════════

export type FirmaActionState = { fehler?: string; erfolg?: string } | null

// ── Firma-Basisdaten aktualisieren ────────────────────────────
/**
 * Aktualisiert Name, Kontakt, Adresse, Logo der Firma.
 * Slug wird NICHT hier geändert (eigene Action mit Warnung).
 * Nur Admins.
 */
export async function firmaAktualisieren(
  _prevState: FirmaActionState,
  formData: FormData,
): Promise<FirmaActionState> {
  try {
    await adminPruefen()
  } catch (e) {
    return { fehler: (e as Error).message }
  }

  const orgId = await getOrganisationId()
  const admin = createAdminClient()

  const name     = (formData.get('name')     ?? '').toString().trim()
  const email    = (formData.get('email')    ?? '').toString().trim()
  const telefon  = (formData.get('telefon')  ?? '').toString().trim()
  const website  = (formData.get('website')  ?? '').toString().trim()
  const adresse  = (formData.get('adresse')  ?? '').toString().trim()
  const logo_url = (formData.get('logo_url') ?? '').toString().trim()

  if (!name) return { fehler: 'Firmenname darf nicht leer sein.' }

  const { error } = await admin
    .from('organisationen')
    .update({
      name,
      email:    email    || null,
      telefon:  telefon  || null,
      website:  website  || null,
      adresse:  adresse  || null,
      logo_url: logo_url || null,
    })
    .eq('id', orgId)

  if (error) return { fehler: 'Fehler beim Speichern: ' + error.message }

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: 'Firmendaten gespeichert.' }
}

// ── Slug ändern (mit Uniqueness-Check + Session-Logout-Hinweis) ──
/**
 * Ändert den Login-Slug der Firma. Validiert Format + Einzigartigkeit.
 * Wichtig: nach Änderung müssen alle Team-Mitglieder sich neu einloggen,
 * weil der alte Login-Link nicht mehr existiert.
 */
export async function slugAendern(
  _prevState: FirmaActionState,
  formData: FormData,
): Promise<FirmaActionState> {
  try {
    await adminPruefen()
  } catch (e) {
    return { fehler: (e as Error).message }
  }

  const orgId = await getOrganisationId()
  const admin = createAdminClient()

  const neuerSlug = (formData.get('slug') ?? '').toString().trim().toLowerCase()

  if (!neuerSlug) return { fehler: 'Slug darf nicht leer sein.' }
  if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(neuerSlug)) {
    return { fehler: 'Ungültiges Format. Erlaubt: Kleinbuchstaben, Ziffern, Bindestriche (2–60 Zeichen, Start alphanumerisch).' }
  }

  // Uniqueness prüfen
  const { data: existing } = await admin
    .from('organisationen')
    .select('id')
    .eq('slug', neuerSlug)
    .maybeSingle()

  if (existing && existing.id !== orgId) {
    return { fehler: `Slug "${neuerSlug}" ist bereits vergeben. Bitte wähle einen anderen.` }
  }

  const { error } = await admin
    .from('organisationen')
    .update({ slug: neuerSlug })
    .eq('id', orgId)

  if (error) return { fehler: 'Fehler beim Speichern: ' + error.message }

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: `Slug geändert auf "${neuerSlug}". Alle Teammitglieder müssen sich mit dem neuen Slug neu einloggen.` }
}

// ── Rechtsangaben aktualisieren ───────────────────────────────
/**
 * Aktualisiert die Handelsregister/USt-ID/Bank/Rechtstexte der Firma.
 * Nur Admins. Erscheint auf Rechnungen/Angeboten/Verträgen.
 */
export async function rechtsangabenAktualisieren(
  _prevState: FirmaActionState,
  formData: FormData,
): Promise<FirmaActionState> {
  try {
    await adminPruefen()
  } catch (e) {
    return { fehler: (e as Error).message }
  }

  const orgId = await getOrganisationId()
  const admin = createAdminClient()

  const leerZuNull = (k: string) => {
    const v = (formData.get(k) ?? '').toString().trim()
    return v === '' ? null : v
  }

  const { error } = await admin
    .from('organisationen')
    .update({
      rechtsform:         leerZuNull('rechtsform'),
      handelsregister_nr: leerZuNull('handelsregister_nr'),
      registergericht:    leerZuNull('registergericht'),
      geschaeftsfuehrer:  leerZuNull('geschaeftsfuehrer'),
      ust_id:             leerZuNull('ust_id'),
      steuernummer:       leerZuNull('steuernummer'),
      bank_name:          leerZuNull('bank_name'),
      bank_iban:          leerZuNull('bank_iban'),
      bank_bic:           leerZuNull('bank_bic'),
      impressum_text:     leerZuNull('impressum_text'),
      datenschutz_url:    leerZuNull('datenschutz_url'),
      standard_agb_text:  leerZuNull('standard_agb_text'),
    })
    .eq('id', orgId)

  if (error) return { fehler: 'Fehler beim Speichern: ' + error.message }

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: 'Rechtsangaben gespeichert.' }
}

// ── Operative Defaults aktualisieren ──────────────────────────
/**
 * Speichert Zahlungsziel + Angebots-Gültigkeit als Org-Default.
 * Diese Werte werden beim Anlegen neuer Angebote/Verträge/Rechnungen
 * als Start-Wert verwendet.
 */
export async function firmenDefaultsAktualisieren(
  _prevState: FirmaActionState,
  formData: FormData,
): Promise<FirmaActionState> {
  try {
    await adminPruefen()
  } catch (e) {
    return { fehler: (e as Error).message }
  }

  const orgId = await getOrganisationId()
  const admin = createAdminClient()

  const zahlung   = parseInt((formData.get('standard_zahlungsziel_tage')        ?? '14').toString(), 10)
  const gueltig   = parseInt((formData.get('standard_angebot_gueltigkeit_tage') ?? '30').toString(), 10)

  if (isNaN(zahlung) || zahlung < 0 || zahlung > 365) return { fehler: 'Zahlungsziel ungültig (0–365 Tage).' }
  if (isNaN(gueltig) || gueltig < 0 || gueltig > 365) return { fehler: 'Angebotsgültigkeit ungültig (0–365 Tage).' }

  const { error } = await admin
    .from('organisationen')
    .update({
      standard_zahlungsziel_tage:        zahlung,
      standard_angebot_gueltigkeit_tage: gueltig,
    })
    .eq('id', orgId)

  if (error) return { fehler: 'Fehler beim Speichern: ' + error.message }

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: 'Standard-Werte gespeichert.' }
}


