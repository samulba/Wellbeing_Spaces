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
  kunde_id?: string | null
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

  const { data, error } = await supabase
    .from('onboarding_anfragen')
    .insert({
      status: 'offen',
      vorlage_id: vorlage_id ?? null,
      kunde_id:   kunde_id   ?? null,
      organisation_id: orgId,
      ...kundePrefill,
    })
    .select('token')
    .single()

  if (error || !data) throw new Error('Fehler beim Erstellen des Links')
  revalidatePath('/dashboard/onboarding')
  return { token: data.token, pfad: `/onboarding/${data.token}` }
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
    .select('id, status, kunde_name')
    .eq('token', token)
    .single()

  if (!anfrage) return { erfolg: false, fehler: 'Dieser Link ist ungültig.' }
  if (anfrage.status !== 'offen') {
    return { erfolg: false, fehler: 'Dieses Formular wurde bereits ausgefüllt oder deaktiviert.' }
  }
  if (anfrage.kunde_name) {
    return { erfolg: false, fehler: 'Dieses Formular wurde bereits ausgefüllt.' }
  }

  const { antworten, ...standardDaten } = daten
  const { error } = await supabase
    .from('onboarding_anfragen')
    .update({
      ...standardDaten,
      antworten: antworten ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('token', token)

  if (error) return { erfolg: false, fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }
  return { erfolg: true }
}

/** Alle Anfragen für das Dashboard. */
export async function alleOnboardingAnfragen() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_anfragen')
    .select('*')
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
  revalidatePath('/dashboard/onboarding')
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

  revalidatePath('/dashboard/onboarding')
  revalidatePath('/dashboard/kunden')
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
