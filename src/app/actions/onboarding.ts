'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { OnboardingStatus, OnboardingVorlage, OnboardingFrage, OnboardingSektion } from '@/lib/supabase/types'

export interface OnboardingDaten {
  kunde_name: string | null
  kunde_email: string | null
  kunde_telefon?: string | null
  projekt_name?: string | null
  projekt_adresse?: string | null
  raumtypen?: string[] | null
  budget_min?: number | null
  budget_max?: number | null
  stil_praeferenzen?: string | null
  zeitrahmen?: string | null
  notizen?: string | null
  antworten?: Record<string, unknown> | null
}

/**
 * Erstellt einen neuen Onboarding-Link (optional mit Vorlage + Kunden-Verknüpfung).
 * Bei Projekt-Vorlagen ist kunde_id empfohlen — dann sind Kontaktfragen
 * überflüssig, da der Kunde bereits verknüpft ist.
 */
export async function onboardingLinkErstellen(
  vorlage_id?: string | null,
  kunde_id?: string | null,
  empfaenger?: { label?: string | null; email?: string | null } | null,
): Promise<{ token: string; pfad: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Wenn Kunde verknüpft: Kontaktdaten vorausfüllen, damit der Kunde
  // sie nicht noch einmal eintippen muss.
  let kundePrefill: Record<string, string | null> = {}
  if (kunde_id) {
    const { data: kunde } = await supabase
      .from('kunden')
      .select('name, email, telefon')
      .eq('id', kunde_id)
      .eq('organisation_id', orgId)
      .maybeSingle()
    if (kunde) {
      kundePrefill = {
        kunde_name:    kunde.name,
        kunde_email:   kunde.email,
        kunde_telefon: kunde.telefon,
      }
    }
  }

  const empfaengerLabel = empfaenger?.label?.trim() || null
  const empfaengerEmail = empfaenger?.email?.trim() || null

  // Persistenten Titel ableiten (Migration 108) — wird beim Submit
  // NICHT ueberschrieben, sodass der Kundenname dauerhaft sichtbar bleibt.
  const titel =
    (kundePrefill.kunde_name as string | null | undefined)?.trim()
    || empfaengerLabel
    || 'Onboarding-Link'

  const { data, error } = await supabase
    .from('onboarding_anfragen')
    .insert({
      status: 'offen',
      vorlage_id: vorlage_id ?? null,
      kunde_id:   kunde_id   ?? null,
      empfaenger_label: empfaengerLabel,
      empfaenger_email: empfaengerEmail,
      organisation_id: orgId,
      titel,
      ...kundePrefill,
    })
    .select('token')
    .single()

  if (error || !data) throw new Error('Fehler beim Erstellen des Links')
  revalidatePath('/dashboard/onboarding')
  return { token: data.token, pfad: `/onboarding/${data.token}` }
}

/** Setzt oder aktualisiert das Empfänger-Etikett nachträglich (z. B. wenn
 *  der Admin beim Erstellen vergessen hat anzugeben, für wen der Link war). */
export async function onboardingEmpfaengerAktualisieren(
  id: string,
  empfaenger: { label: string | null; email: string | null },
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase
    .from('onboarding_anfragen')
    .update({
      empfaenger_label: empfaenger.label?.trim() || null,
      empfaenger_email: empfaenger.email?.trim() || null,
    })
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) return { fehler: 'Fehler beim Speichern.' }
  revalidatePath('/dashboard/onboarding')
  return { erfolg: true }
}

/**
 * Formular-Absenden durch den Kunden (kein Login nötig).
 * Nutzt Admin-Client da keine Session vorhanden.
 */
export async function onboardingAbsenden(
  token: string,
  daten: OnboardingDaten
): Promise<{ erfolg: boolean; fehler?: string }> {
  const supabase = createAdminClient()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('id, status, antworten, kunde_name, projekt_name')
    .eq('token', token)
    .single()

  if (!anfrage) return { erfolg: false, fehler: 'Dieser Link ist ungültig.' }
  if (anfrage.status !== 'offen' && anfrage.status !== 'in_bearbeitung') {
    return { erfolg: false, fehler: 'Dieses Formular wurde bereits ausgefüllt oder deaktiviert.' }
  }
  // Hinweis: kunde_name darf bereits vorgefüllt sein (bei verknüpftem Kunden).
  // Echter "schon ausgefüllt"-Indikator ist `antworten`.
  if (anfrage.antworten) {
    return { erfolg: false, fehler: 'Dieses Formular wurde bereits ausgefüllt.' }
  }

  const { antworten, kunde_name, projekt_name, ...standardDaten } = daten
  // Bug 1: Vorausgefuellte kunde_name/projekt_name NIE durch leere
  // Submit-Werte ueberschreiben. titel wird ohnehin nie geschrieben.
  const finalKundeName   = (anfrage.kunde_name && anfrage.kunde_name.trim().length > 0)
    ? anfrage.kunde_name
    : (kunde_name?.trim() || null)
  const finalProjektName = (anfrage.projekt_name && anfrage.projekt_name.trim().length > 0)
    ? anfrage.projekt_name
    : (projekt_name?.trim() || null)

  const { error } = await supabase
    .from('onboarding_anfragen')
    .update({
      ...standardDaten,
      kunde_name:   finalKundeName,
      projekt_name: finalProjektName,
      antworten: antworten ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('token', token)

  if (error) return { erfolg: false, fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  // Auto-Sync: Aufgabe „Onboarding pruefen" anlegen
  try {
    const { data: voll } = await supabase
      .from('onboarding_anfragen')
      .select('id, organisation_id, kunde_name, projekt_name, kunde_id, projekt_id')
      .eq('token', token)
      .maybeSingle()
    if (voll?.organisation_id) {
      const titel = voll.kunde_name
        ? `Onboarding pruefen: ${voll.kunde_name}${voll.projekt_name ? ' / ' + voll.projekt_name : ''}`
        : 'Onboarding pruefen'
      const { syncAufgabeAusQuelleAdmin } = await import('@/app/actions/aufgaben')
      await syncAufgabeAusQuelleAdmin(voll.organisation_id, 'onboarding', voll.id, {
        titel,
        status:             'in_arbeit',
        prioritaet:         'normal',
        kunde_id:           (voll.kunde_id as string | null) ?? null,
        projekt_id:         (voll.projekt_id as string | null) ?? null,
        sichtbar_fuer_kunde: false,
      })
    }
  } catch (e) { console.error('[syncAufgabe:onboarding:absenden]', e) }

  return { erfolg: true }
}

/** Alle Anfragen für das Dashboard. */
export async function alleOnboardingAnfragen() {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('onboarding_anfragen')
    .select('*')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })
  return data ?? []
}

/** Status einer Anfrage ändern. */
export async function onboardingStatusAendern(
  id: string,
  status: OnboardingStatus
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('onboarding_anfragen')
    .update({ status })
    .eq('id', id)
    .eq('organisation_id', orgId)
  revalidatePath('/dashboard/onboarding')
}

/** Einen Onboarding-Link löschen. */
export async function onboardingLinkLoeschen(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('onboarding_anfragen')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)
  // Auto-Sync: zugehoerige Aufgabe entfernen
  try {
    const { syncAufgabeAusQuelle } = await import('@/app/actions/aufgaben')
    await syncAufgabeAusQuelle('onboarding', id, null, { loeschen: true })
  } catch (e) { console.error('[syncAufgabe:onboarding:loeschen]', e) }
  revalidatePath('/dashboard/onboarding')
  revalidatePath('/dashboard/aufgaben')
}

/**
 * Kunden (+ optional Projekt) aus Onboarding-Anfrage anlegen.
 * Markiert die Anfrage als abgeschlossen und leitet zum neuen Kunden weiter.
 */
export async function kundeAusOnboardingAnlegen(anfrageId: string): Promise<void> {
  const supabase = await createClient()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('*')
    .eq('id', anfrageId)
    .single()

  if (!anfrage || !anfrage.kunde_name) throw new Error('Anfrage nicht gefunden oder unvollständig')

  const orgId = await getOrganisationId()

  // Kunden anlegen
  const { data: kunde, error: kundeError } = await supabase
    .from('kunden')
    .insert({
      name:            anfrage.kunde_name,
      ansprechpartner: anfrage.kunde_name,
      email:           anfrage.kunde_email,
      telefon:         anfrage.kunde_telefon,
      adresse:         anfrage.projekt_adresse,
      notizen:         anfrage.notizen,
      status:          'aktiv',
      organisation_id: orgId,
    })
    .select('id')
    .single()

  if (kundeError || !kunde) throw new Error('Fehler beim Anlegen des Kunden')

  // Projekt anlegen (wenn Name vorhanden)
  if (anfrage.projekt_name) {
    await supabase.from('projekte').insert({
      kunde_id:        kunde.id,
      name:            anfrage.projekt_name,
      standort:        anfrage.projekt_adresse,
      gesamtbudget:    anfrage.budget_max,
      status:          'offen',
      organisation_id: orgId,
    })
  }

  // Anfrage abschließen
  await supabase
    .from('onboarding_anfragen')
    .update({ status: 'abgeschlossen' })
    .eq('id', anfrageId)
    .eq('organisation_id', orgId)

  // Auto-Sync: Aufgabe als erledigt markieren
  try {
    await supabase
      .from('aufgaben')
      .update({ status: 'erledigt', erledigt_am: new Date().toISOString() })
      .eq('organisation_id', orgId)
      .eq('quelle', 'onboarding')
      .eq('quelle_id', anfrageId)
  } catch (e) { console.error('[syncAufgabe:onboarding:kundeAnlegen]', e) }

  revalidatePath('/dashboard/onboarding')
  revalidatePath('/dashboard/kunden')
  revalidatePath('/dashboard/aufgaben')
  redirect(`/dashboard/kunden/${kunde.id}`)
}

// ── Vorlagen-CRUD ─────────────────────────────────────────────

/** Alle Onboarding-Vorlagen laden. */
export async function alleVorlagenLaden(): Promise<OnboardingVorlage[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_vorlagen')
    .select('*')
    .order('ist_standard', { ascending: false })
    .order('created_at')
  return (data ?? []) as OnboardingVorlage[]
}

/** Eine Vorlage per ID laden. */
export async function vorlageLaden(id: string): Promise<OnboardingVorlage | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_vorlagen')
    .select('*')
    .eq('id', id)
    .single()
  return data as OnboardingVorlage | null
}

/** Vorlage mit Token öffentlich laden (kein Login). */
export async function vorlageZuTokenLaden(token: string): Promise<OnboardingVorlage | null> {
  const supabase = createAdminClient()
  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('vorlage_id')
    .eq('token', token)
    .single()

  if (!anfrage?.vorlage_id) return null

  const { data: vorlage } = await supabase
    .from('onboarding_vorlagen')
    .select('*')
    .eq('id', anfrage.vorlage_id)
    .single()

  return vorlage as OnboardingVorlage | null
}

/** Neue Vorlage erstellen. */
export async function vorlageErstellen(
  name: string,
  beschreibung: string,
  fragen: OnboardingFrage[],
  sektionen: OnboardingSektion[] = []
): Promise<OnboardingVorlage> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data, error } = await supabase
    .from('onboarding_vorlagen')
    .insert({ name, beschreibung: beschreibung || null, fragen, sektionen, ist_standard: false, organisation_id: orgId })
    .select('*')
    .single()
  if (error || !data) throw new Error('Fehler beim Erstellen der Vorlage')
  revalidatePath('/dashboard/onboarding/vorlagen')
  return data as OnboardingVorlage
}

/** Vorlage aktualisieren. */
export async function vorlageSpeichern(
  id: string,
  name: string,
  beschreibung: string,
  fragen: OnboardingFrage[],
  sektionen: OnboardingSektion[] = []
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('onboarding_vorlagen')
    .update({ name, beschreibung: beschreibung || null, fragen, sektionen, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)
  revalidatePath('/dashboard/onboarding/vorlagen')
}

/** Vorlage löschen (Standard-Vorlage kann nicht gelöscht werden). */
export async function vorlageLoeschen(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  // Sicherheitscheck: Standard-Vorlage nicht löschen
  const { data } = await supabase
    .from('onboarding_vorlagen')
    .select('ist_standard')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()
  if (data?.ist_standard) return
  await supabase.from('onboarding_vorlagen').delete().eq('id', id).eq('organisation_id', orgId)
  revalidatePath('/dashboard/onboarding/vorlagen')
}
