'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { OnboardingStatus } from '@/lib/supabase/types'

export interface OnboardingDaten {
  kunde_name: string
  kunde_email: string
  kunde_telefon?: string | null
  projekt_name?: string | null
  projekt_adresse?: string | null
  raumtypen?: string[] | null
  budget_min?: number | null
  budget_max?: number | null
  stil_praeferenzen?: string | null
  zeitrahmen?: string | null
  notizen?: string | null
}

/** Erstellt einen neuen Onboarding-Link (nur für eingeloggte Nutzer). */
export async function onboardingLinkErstellen(): Promise<{ token: string; pfad: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('onboarding_anfragen')
    .insert({ status: 'offen' })
    .select('token')
    .single()

  if (error || !data) throw new Error('Fehler beim Erstellen des Links')
  revalidatePath('/dashboard/anfragen')
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

  const { error } = await supabase
    .from('onboarding_anfragen')
    .update({ ...daten, updated_at: new Date().toISOString() })
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
  await supabase
    .from('onboarding_anfragen')
    .update({ status })
    .eq('id', id)
  revalidatePath('/dashboard/anfragen')
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

  // Kunden anlegen
  const { data: kunde, error: kundeError } = await supabase
    .from('kunden')
    .insert({
      name: anfrage.kunde_name,
      ansprechpartner: anfrage.kunde_name,
      email: anfrage.kunde_email,
      telefon: anfrage.kunde_telefon,
      adresse: anfrage.projekt_adresse,
      notizen: anfrage.notizen,
      status: 'aktiv',
    })
    .select('id')
    .single()

  if (kundeError || !kunde) throw new Error('Fehler beim Anlegen des Kunden')

  // Projekt anlegen (wenn Name vorhanden)
  if (anfrage.projekt_name) {
    await supabase.from('projekte').insert({
      kunde_id: kunde.id,
      name: anfrage.projekt_name,
      standort: anfrage.projekt_adresse,
      gesamtbudget: anfrage.budget_max,
      status: 'offen',
    })
  }

  // Anfrage abschließen
  await supabase
    .from('onboarding_anfragen')
    .update({ status: 'abgeschlossen' })
    .eq('id', anfrageId)

  revalidatePath('/dashboard/anfragen')
  revalidatePath('/dashboard/kunden')
  redirect(`/dashboard/kunden/${kunde.id}`)
}
