'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type {
  OnboardingAnfrage,
  OnboardingVorlage,
  OnboardingFrage,
  OnboardingSektion,
  OnboardingTyp,
  OnboardingInventarItem,
  OnboardingPrioritaet,
  OnboardingDatei,
  InventarZustand,
} from '@/lib/supabase/types'

// ── Hilfsfunktion: Gültigkeitsdatum berechnen ─────────────────
function berechneGueltigBis(deadlineTage: number | null | undefined): string | null {
  if (!deadlineTage) return null
  const d = new Date()
  d.setDate(d.getDate() + deadlineTage)
  return d.toISOString()
}

// ─────────────────────────────────────────────────────────────
// ONBOARDING-LINKS ERSTELLEN
// ─────────────────────────────────────────────────────────────

/**
 * Erstellt einen neuen Onboarding-Link mit Typ, optionaler Vorlage und
 * persistentem Titel (Migration 108). Gibt das Resultat als Objekt
 * zurueck statt zu werfen — verhindert Application-Errors im Modal.
 */
export async function onboardingLinkErstellenV2(
  vorlage_id?: string | null,
  typ: OnboardingTyp = 'neukunde',
  projekt_id?: string | null,
  kunde_id?: string | null,
  titel?: string | null,
): Promise<{ erfolg: boolean; token?: string; pfad?: string; fehler?: string }> {
  try {
    const supabase = await createClient()
    const orgId    = await getOrganisationId()

    // Vorlage laden — fuer Gueltigkeit + Snapshot
    let gueltig_bis: string | null = null
    let snapshot: unknown = null
    if (vorlage_id) {
      const { data: v } = await supabase
        .from('onboarding_vorlagen')
        .select('*')
        .eq('id', vorlage_id)
        .maybeSingle()
      if (v) {
        gueltig_bis = berechneGueltigBis((v as { deadline_tage?: number | null }).deadline_tage ?? null)
        snapshot = v
      }
    }

    // Kunden-Prefill (Stammdaten) bei verknuepftem Kunde — analog V1.
    // Damit der Kunde Name/Email/Telefon nicht erneut eintippen muss.
    let kundePrefill: { kunde_name?: string | null; kunde_email?: string | null; kunde_telefon?: string | null } = {}
    let kundeName: string | null = null
    if (kunde_id) {
      const { data: k } = await supabase
        .from('kunden')
        .select('name, email, telefon')
        .eq('id', kunde_id)
        .eq('organisation_id', orgId)
        .maybeSingle()
      if (k) {
        kundePrefill = {
          kunde_name:    k.name as string | null,
          kunde_email:   k.email as string | null,
          kunde_telefon: k.telefon as string | null,
        }
        kundeName = (k.name as string | null) ?? null
      }
    }

    // Persistenten Titel bestimmen (Bug 1): Eingabe > Kundenname > Fallback
    const resolvedTitel = (titel?.trim() || kundeName || 'Onboarding-Link')

    const { data, error } = await supabase
      .from('onboarding_anfragen')
      .insert({
        status:           'offen',
        typ,
        vorlage_id:       vorlage_id ?? null,
        projekt_id:       projekt_id ?? null,
        kunde_id:         kunde_id   ?? null,
        organisation_id:  orgId,
        gueltig_bis,
        titel:            resolvedTitel,
        vorlage_snapshot: snapshot,
        // kunde_name aus Prefill bevorzugen, sonst aus Titel ableiten
        kunde_name:       kundePrefill.kunde_name ?? (resolvedTitel === 'Onboarding-Link' ? null : resolvedTitel),
        kunde_email:      kundePrefill.kunde_email ?? null,
        kunde_telefon:    kundePrefill.kunde_telefon ?? null,
      })
      .select('token')
      .single()

    if (error || !data) {
      return { erfolg: false, fehler: error?.message ?? 'Fehler beim Erstellen des Links.' }
    }
    revalidatePath('/dashboard/onboarding')
    return { erfolg: true, token: data.token, pfad: `/onboarding/${data.token}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unbekannter Fehler.'
    return { erfolg: false, fehler: msg }
  }
}


/**
 * Sendet einen bestehenden Onboarding-Link per Mail an eine Adresse.
 * Wird manuell von der UI ausgelöst — Designer gibt Empfänger-Email ein.
 */
export async function onboardingLinkVersenden(
  anfrageId: string,
  empfaengerEmail: string,
  empfaengerName?: string,
): Promise<{ mailGesendet: boolean; fehler?: string }> {
  const { sendMail } = await import('@/lib/mail')
  const { onboardingLinkMail } = await import('@/lib/mail-templates')

  const supabase = await createClient()
  const orgId    = await getOrganisationId()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('token, vorlage_id, onboarding_vorlagen(einleitung_text)')
    .eq('id', anfrageId)
    .eq('organisation_id', orgId)
    .maybeSingle()

  if (!anfrage?.token) return { mailGesendet: false, fehler: 'Anfrage nicht gefunden.' }

  const vorlageRaw = anfrage.onboarding_vorlagen as unknown as { einleitung_text: string | null } | null

  const { data: branding } = await supabase
    .from('branding')
    .select('firmenname, primary_color')
    .maybeSingle()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const tpl = onboardingLinkMail({
    empfaengerName: empfaengerName?.trim() || empfaengerEmail,
    linkUrl:        `${baseUrl}/onboarding/${anfrage.token}`,
    einleitung:     vorlageRaw?.einleitung_text ?? null,
    branding:       branding ?? undefined,
  })

  const res = await sendMail({ to: empfaengerEmail, subject: tpl.subject, html: tpl.html })
  return { mailGesendet: res.sent }
}

// ─────────────────────────────────────────────────────────────
// ONBOARDING-ANFRAGEN LESEN (Admin-Dashboard)
// ─────────────────────────────────────────────────────────────

/** Alle Anfragen der Organisation mit Vorlage-Name und Fortschritt. */
export async function getOnboardingAnfragen(filter?: {
  status?: string
  typ?: OnboardingTyp
}): Promise<(OnboardingAnfrage & { vorlage_name?: string })[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  let query = supabase
    .from('onboarding_anfragen')
    .select('*, onboarding_vorlagen(name)')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  if (filter?.status) query = query.eq('status', filter.status)
  if (filter?.typ)    query = query.eq('typ', filter.typ)

  const { data } = await query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    vorlage_name: r.onboarding_vorlagen?.name ?? undefined,
    onboarding_vorlagen: undefined,
  })) as (OnboardingAnfrage & { vorlage_name?: string })[]
}

/** Einzelne Anfrage laden (Admin). */
export async function getOnboardingAnfrage(id: string): Promise<OnboardingAnfrage | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_anfragen')
    .select('*')
    .eq('id', id)
    .single()
  return data as OnboardingAnfrage | null
}

/** Anfrage per Token öffentlich laden (Kunden-Formular). */
export async function getAnfrageByToken(
  token: string
): Promise<{ anfrage: OnboardingAnfrage; vorlage: OnboardingVorlage | null } | null> {
  const supabase = createAdminClient()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('*')
    .eq('token', token)
    .single()

  if (!anfrage) return null

  // Abgelaufen prüfen
  if (anfrage.gueltig_bis && new Date(anfrage.gueltig_bis) < new Date()) {
    await supabase
      .from('onboarding_anfragen')
      .update({ status: 'abgelaufen' })
      .eq('token', token)
    return { anfrage: { ...anfrage, status: 'abgelaufen' }, vorlage: null }
  }

  let vorlage: OnboardingVorlage | null = null
  if (anfrage.vorlage_id) {
    const { data: v } = await supabase
      .from('onboarding_vorlagen')
      .select('*')
      .eq('id', anfrage.vorlage_id)
      .single()
    vorlage = v as OnboardingVorlage | null
  }

  return { anfrage: anfrage as OnboardingAnfrage, vorlage }
}

// ─────────────────────────────────────────────────────────────
// AUTO-SAVE (Kunden tippen – Daten werden zwischengespeichert)
// ─────────────────────────────────────────────────────────────

/** Speichert Antworten als Entwurf. Keine Authentifizierung nötig. */
export async function onboardingAutoSave(
  token: string,
  antworten: Record<string, unknown>,
  fortschritt: number,
  aktuelle_sektion: number,
): Promise<{ ok: boolean }> {
  const supabase = createAdminClient()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('id, status')
    .eq('token', token)
    .single()

  if (!anfrage || !['offen', 'in_bearbeitung'].includes(anfrage.status)) {
    return { ok: false }
  }

  const { error } = await supabase
    .from('onboarding_anfragen')
    .update({
      auto_save:        antworten,
      fortschritt:      Math.min(100, Math.max(0, fortschritt)),
      aktuelle_sektion,
      status:           'in_bearbeitung',
    })
    .eq('token', token)

  return { ok: !error }
}

// ─────────────────────────────────────────────────────────────
// FINALES ABSENDEN
// ─────────────────────────────────────────────────────────────

export interface OnboardingAbsendenDaten {
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
  antworten?: Record<string, unknown> | null
}

/** Finales Absenden des Onboarding-Formulars durch den Kunden. */
export async function onboardingAbsendenV2(
  token: string,
  daten: OnboardingAbsendenDaten,
): Promise<{ erfolg: boolean; fehler?: string }> {
  const supabase = createAdminClient()

  // Vollstaendige Anfrage laden, um vorausgefuellte Felder zu erhalten (Bug 1)
  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('id, status, kunde_name, projekt_name, titel')
    .eq('token', token)
    .single()

  if (!anfrage) return { erfolg: false, fehler: 'Dieser Link ist ungültig.' }
  if (!['offen', 'in_bearbeitung'].includes(anfrage.status)) {
    return { erfolg: false, fehler: 'Dieses Formular wurde bereits abgeschlossen.' }
  }

  const { antworten, kunde_name, projekt_name, ...rest } = daten

  // Bug 1: Vorausgefuellte kunde_name/projekt_name NIE durch leere Submit-
  // Werte ueberschreiben — und wenn DB bereits einen Wert hat, behalten.
  const finalKundeName   = (anfrage.kunde_name && anfrage.kunde_name.trim().length > 0)
    ? anfrage.kunde_name
    : (kunde_name?.trim() || null)
  const finalProjektName = (anfrage.projekt_name && anfrage.projekt_name.trim().length > 0)
    ? anfrage.projekt_name
    : (projekt_name?.trim() || null)

  const { error } = await supabase
    .from('onboarding_anfragen')
    .update({
      ...rest,
      kunde_name:       finalKundeName,
      projekt_name:     finalProjektName,
      antworten:        antworten ?? null,
      auto_save:        null,         // Entwurf löschen
      status:           'abgeschlossen',
      fortschritt:      100,
      abgeschlossen_am: new Date().toISOString(),
      // titel wird bewusst NICHT geschrieben — bleibt aus Erstellungszeitpunkt
    })
    .eq('token', token)

  if (error) return { erfolg: false, fehler: 'Fehler beim Speichern: ' + error.message }

  // Cache invalidieren — damit Admin-Liste + Customer-Page sofort den
  // neuen Status sehen.
  revalidatePath('/dashboard/onboarding')
  revalidatePath(`/onboarding/${token}`)

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
  } catch (e) { console.error('[syncAufgabe:onboardingV2:absenden]', e) }

  return { erfolg: true }
}

// ─────────────────────────────────────────────────────────────
// DATEI-UPLOADS
// ─────────────────────────────────────────────────────────────

/** Datei-Metadaten nach Upload in Storage speichern. */
export async function onboardingDateiSpeichern(
  token: string,
  datei: {
    frage_id?: string | null
    dateiname: string
    dateityp: string
    dateigroesse?: number | null
    storage_pfad: string
    vorschau_url?: string | null
  }
): Promise<{ id: string } | { fehler: string }> {
  const supabase = createAdminClient()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('id, organisation_id')
    .eq('token', token)
    .single()

  if (!anfrage) return { fehler: 'Anfrage nicht gefunden.' }

  const { data, error } = await supabase
    .from('onboarding_dateien')
    .insert({
      anfrage_id:      anfrage.id,
      organisation_id: anfrage.organisation_id,
      ...datei,
    })
    .select('id')
    .single()

  if (error || !data) return { fehler: error?.message ?? 'Unbekannter Fehler' }
  return { id: data.id }
}

/** Alle Dateien einer Anfrage laden. */
export async function getOnboardingDateien(anfrageId: string): Promise<OnboardingDatei[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_dateien')
    .select('*')
    .eq('anfrage_id', anfrageId)
    .order('created_at')
  return (data ?? []) as OnboardingDatei[]
}

/** Datei-Eintrag löschen (Supabase Storage muss separat bereinigt werden). */
export async function onboardingDateiLoeschen(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId    = await getOrganisationId()
  await supabase
    .from('onboarding_dateien')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)
}

// ─────────────────────────────────────────────────────────────
// INVENTAR
// ─────────────────────────────────────────────────────────────

/** Inventar-Item anlegen (öffentlich: Kunden füllen aus). */
export async function inventarItemAnlegen(
  token: string,
  item: {
    bezeichnung: string
    kategorie?: string | null
    raum?: string | null
    zustand?: InventarZustand | null
    behalten?: boolean
    foto_url?: string | null
    notizen?: string | null
  }
): Promise<{ id: string } | { fehler: string }> {
  const supabase = createAdminClient()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('id, organisation_id')
    .eq('token', token)
    .single()

  if (!anfrage) return { fehler: 'Anfrage nicht gefunden.' }

  const { data, error } = await supabase
    .from('onboarding_inventar')
    .insert({
      anfrage_id:      anfrage.id,
      organisation_id: anfrage.organisation_id,
      behalten:        item.behalten ?? true,
      ...item,
    })
    .select('id')
    .single()

  if (error || !data) return { fehler: error?.message ?? 'Fehler' }
  return { id: data.id }
}

/** Inventar-Item aktualisieren (oeffentlich via Token). */
export async function inventarItemAktualisieren(
  token: string,
  id: string,
  updates: Partial<Pick<OnboardingInventarItem, 'bezeichnung' | 'kategorie' | 'raum' | 'zustand' | 'behalten' | 'foto_url' | 'notizen' | 'reihenfolge'>>
): Promise<{ fehler?: string }> {
  const supabase = createAdminClient()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('id')
    .eq('token', token)
    .maybeSingle()
  if (!anfrage) return { fehler: 'Anfrage nicht gefunden.' }

  const { error } = await supabase
    .from('onboarding_inventar')
    .update(updates)
    .eq('id', id)
    .eq('anfrage_id', anfrage.id)
  if (error) return { fehler: error.message }
  return {}
}

/** Inventar-Item loeschen (oeffentlich via Token). */
export async function inventarItemLoeschen(
  token: string,
  id: string,
): Promise<{ fehler?: string }> {
  const supabase = createAdminClient()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('id')
    .eq('token', token)
    .maybeSingle()
  if (!anfrage) return { fehler: 'Anfrage nicht gefunden.' }

  const { error } = await supabase
    .from('onboarding_inventar')
    .delete()
    .eq('id', id)
    .eq('anfrage_id', anfrage.id)
  if (error) return { fehler: error.message }
  return {}
}

/** Alle Inventar-Items einer Anfrage laden. */
export async function getInventar(anfrageId: string): Promise<OnboardingInventarItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_inventar')
    .select('*')
    .eq('anfrage_id', anfrageId)
    .order('reihenfolge')
  return (data ?? []) as OnboardingInventarItem[]
}

/** Inventar-Reihenfolge aktualisieren (oeffentlich via Token). */
export async function inventarReihenfolgeAktualisieren(
  token: string,
  items: { id: string; reihenfolge: number }[]
): Promise<{ fehler?: string }> {
  const supabase = createAdminClient()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('id')
    .eq('token', token)
    .maybeSingle()
  if (!anfrage) return { fehler: 'Anfrage nicht gefunden.' }

  await Promise.all(
    items.map(({ id, reihenfolge }) =>
      supabase
        .from('onboarding_inventar')
        .update({ reihenfolge })
        .eq('id', id)
        .eq('anfrage_id', anfrage.id)
    )
  )
  return {}
}

// ─────────────────────────────────────────────────────────────
// PRIORITÄTEN
// ─────────────────────────────────────────────────────────────

/** Prioritäten für eine Anfrage/Frage komplett setzen (upsert). */
export async function prioritaetenSetzen(
  token: string,
  frage_id: string,
  prioritaeten: { bezeichnung: string; icon?: string | null; reihenfolge: number }[]
): Promise<void> {
  const supabase = createAdminClient()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('id, organisation_id')
    .eq('token', token)
    .single()

  if (!anfrage) return

  // Alte löschen, neue einfügen
  await supabase
    .from('onboarding_prioritaeten')
    .delete()
    .eq('anfrage_id', anfrage.id)
    .eq('frage_id', frage_id)

  if (prioritaeten.length === 0) return

  await supabase.from('onboarding_prioritaeten').insert(
    prioritaeten.map((p) => ({
      anfrage_id:      anfrage.id,
      organisation_id: anfrage.organisation_id,
      frage_id,
      ...p,
    }))
  )
}

/** Prioritäten einer Anfrage laden. */
export async function getPrioritaeten(anfrageId: string): Promise<OnboardingPrioritaet[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_prioritaeten')
    .select('*')
    .eq('anfrage_id', anfrageId)
    .order('reihenfolge')
  return (data ?? []) as OnboardingPrioritaet[]
}

// ─────────────────────────────────────────────────────────────
// VORLAGEN-CRUD (Erweitert)
// ─────────────────────────────────────────────────────────────

/** Vorlage mit allen neuen Feldern erstellen. */
export async function vorlageErstellenV2(params: {
  name: string
  beschreibung?: string | null
  typ?: OnboardingTyp
  fragen?: OnboardingFrage[]
  sektionen?: OnboardingSektion[]
  einleitung_text?: string | null
  abschluss_text?: string | null
  logo_url?: string | null
  akzent_farbe?: string | null
  redirect_url?: string | null
  email_betreff?: string | null
  email_text?: string | null
  deadline_tage?: number | null
  geschaetzte_minuten?: number | null
}): Promise<OnboardingVorlage> {
  const supabase = await createClient()
  const orgId    = await getOrganisationId()

  const { data, error } = await supabase
    .from('onboarding_vorlagen')
    .insert({
      name:            params.name,
      beschreibung:    params.beschreibung ?? null,
      typ:             params.typ ?? 'neukunde',
      fragen:          params.fragen ?? [],
      sektionen:       params.sektionen ?? [],
      ist_standard:    false,
      einleitung_text: params.einleitung_text ?? null,
      abschluss_text:  params.abschluss_text  ?? null,
      logo_url:        params.logo_url         ?? null,
      akzent_farbe:    params.akzent_farbe     ?? null,
      redirect_url:    params.redirect_url     ?? null,
      email_betreff:   params.email_betreff    ?? null,
      email_text:      params.email_text       ?? null,
      deadline_tage:   params.deadline_tage    ?? null,
      geschaetzte_minuten: params.geschaetzte_minuten ?? null,
      organisation_id: orgId,
    })
    .select('*')
    .single()

  if (error || !data) throw new Error('Fehler beim Erstellen: ' + error?.message)
  revalidatePath('/dashboard/onboarding')
  revalidatePath('/dashboard/einstellungen')
  return data as OnboardingVorlage
}

/** Vorlage mit allen Feldern aktualisieren. */
export async function vorlageAktualisierenV2(
  id: string,
  params: Partial<Omit<OnboardingVorlage, 'id' | 'organisation_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const supabase = await createClient()
  const orgId    = await getOrganisationId()
  await supabase
    .from('onboarding_vorlagen')
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)
  revalidatePath('/dashboard/onboarding')
  revalidatePath('/dashboard/einstellungen')
}

/** Alle Vorlagen der Organisation laden. */
export async function getVorlagen(typ?: OnboardingTyp): Promise<OnboardingVorlage[]> {
  const supabase = await createClient()
  let query = supabase
    .from('onboarding_vorlagen')
    .select('*')
    .order('ist_standard', { ascending: false })
    .order('created_at')

  if (typ) query = query.eq('typ', typ)

  const { data } = await query
  return (data ?? []) as OnboardingVorlage[]
}

// ─────────────────────────────────────────────────────────────
// ADMIN-AKTIONEN
// ─────────────────────────────────────────────────────────────

/** Status einer Anfrage ändern. */
export async function onboardingStatusAendernV2(
  id: string,
  status: 'offen' | 'in_bearbeitung' | 'abgeschlossen' | 'abgelehnt' | 'abgelaufen'
): Promise<void> {
  const supabase = await createClient()
  const orgId    = await getOrganisationId()
  await supabase
    .from('onboarding_anfragen')
    .update({ status })
    .eq('id', id)
    .eq('organisation_id', orgId)
  revalidatePath('/dashboard/onboarding')
}

/** Anfrage an ein bestehendes Projekt verknüpfen. */
export async function anfrageZuProjektVerknuepfen(
  anfrageId: string,
  projektId: string
): Promise<void> {
  const supabase = await createClient()
  const orgId    = await getOrganisationId()
  await supabase
    .from('onboarding_anfragen')
    .update({ projekt_id: projektId })
    .eq('id', anfrageId)
    .eq('organisation_id', orgId)
  revalidatePath('/dashboard/onboarding')
}

/** Kunden + Projekt aus Onboarding-Anfrage automatisch anlegen. */
export async function kundeUndProjektAusOnboarding(
  anfrageId: string,
  optionen?: {
    raeume_erstellen?: boolean   // Räume aus raumtypen automatisch anlegen
  }
): Promise<{ kunde_id: string; projekt_id: string | null }> {
  const supabase = await createClient()
  const orgId    = await getOrganisationId()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('*')
    .eq('id', anfrageId)
    .eq('organisation_id', orgId)
    .single()

  if (!anfrage?.kunde_name) throw new Error('Anfrage unvollständig.')

  // Kunden anlegen
  const { data: kunde, error: kErr } = await supabase
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

  if (kErr || !kunde) throw new Error('Fehler beim Anlegen des Kunden: ' + kErr?.message)

  let projektId: string | null = null

  // Projekt anlegen
  if (anfrage.projekt_name) {
    const { data: projekt } = await supabase
      .from('projekte')
      .insert({
        kunde_id:        kunde.id,
        name:            anfrage.projekt_name,
        standort:        anfrage.projekt_adresse,
        gesamtbudget:    anfrage.budget_max,
        status:          'offen',
        organisation_id: orgId,
      })
      .select('id')
      .single()

    projektId = projekt?.id ?? null

    // Optional: Räume aus raumtypen erstellen
    if (projektId && optionen?.raeume_erstellen && anfrage.raumtypen?.length) {
      await Promise.all(
        anfrage.raumtypen.map((raumtyp: string, i: number) =>
          supabase.from('raeume').insert({
            projekt_id:      projektId,
            name:            raumtyp,
            organisation_id: orgId,
            reihenfolge:     i,
          })
        )
      )
    }
  }

  // Anfrage abschließen + verknüpfen
  await supabase
    .from('onboarding_anfragen')
    .update({
      status:          'abgeschlossen',
      kunde_id:        kunde.id,
      projekt_id:      projektId,
      abgeschlossen_am: new Date().toISOString(),
    })
    .eq('id', anfrageId)
    .eq('organisation_id', orgId)

  revalidatePath('/dashboard/onboarding')
  revalidatePath('/dashboard/kunden')
  return { kunde_id: kunde.id, projekt_id: projektId }
}

/** Anfrage löschen. */
export async function onboardingAnfrageLoeschen(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId    = await getOrganisationId()
  await supabase
    .from('onboarding_anfragen')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)
  revalidatePath('/dashboard/onboarding')
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD-STATS
// ─────────────────────────────────────────────────────────────

export interface OnboardingStats {
  gesamt: number
  offen: number
  in_bearbeitung: number
  abgeschlossen: number
  abgelehnt: number
  abgelaufen: number
  neukunde: number
  projekt: number
  universal: number
}

export async function getOnboardingStats(): Promise<OnboardingStats> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_anfragen')
    .select('status, typ')

  const rows = data ?? []
  return {
    gesamt:         rows.length,
    offen:          rows.filter((r: {status:string}) => r.status === 'offen').length,
    in_bearbeitung: rows.filter((r: {status:string}) => r.status === 'in_bearbeitung').length,
    abgeschlossen:  rows.filter((r: {status:string}) => r.status === 'abgeschlossen').length,
    abgelehnt:      rows.filter((r: {status:string}) => r.status === 'abgelehnt').length,
    abgelaufen:     rows.filter((r: {status:string}) => r.status === 'abgelaufen').length,
    neukunde:       rows.filter((r: {typ:string}) => r.typ === 'neukunde').length,
    projekt:        rows.filter((r: {typ:string}) => r.typ === 'projekt').length,
    universal:      rows.filter((r: {typ:string}) => r.typ === 'universal').length,
  }
}
