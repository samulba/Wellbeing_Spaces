'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auditLog } from '@/lib/audit'
import { pinCookieSetzen } from '@/lib/freigabe-pin-cookie'
import type { ProjektStatus } from '@/lib/supabase/types'

export type ProjektActionState = { fehler: string } | null

export async function projektAnlegen(
  prevState: ProjektActionState,
  formData: FormData
): Promise<ProjektActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const serviceModell = (formData.get('service_modell') as string) || null

  const { error } = await supabase.from('projekte').insert({
    name: formData.get('name') as string,
    kunde_id: formData.get('kunde_id') as string,
    beschreibung: (formData.get('beschreibung') as string) || null,
    standort: (formData.get('standort') as string) || null,
    projektart: (formData.get('projektart') as string) || null,
    gesamtbudget: formData.get('gesamtbudget') ? Number(formData.get('gesamtbudget')) : null,
    produkt_budget: formData.get('produkt_budget') ? Number(formData.get('produkt_budget')) : null,
    service_modell: serviceModell || null,
    service_pauschale: serviceModell === 'pauschale' && formData.get('service_pauschale')
      ? Number(formData.get('service_pauschale')) : null,
    service_stundensatz: serviceModell === 'stundensatz' && formData.get('service_stundensatz')
      ? Number(formData.get('service_stundensatz')) : null,
    status: 'offen',
    organisation_id: orgId,
  })

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/projekte')
  redirect('/dashboard/projekte')
}

export async function projektAktualisieren(
  id: string,
  prevState: ProjektActionState,
  formData: FormData
): Promise<ProjektActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const serviceModell = (formData.get('service_modell') as string) || null
  const deadline      = (formData.get('deadline') as string) || null
  const projektName   = formData.get('name') as string

  const { error } = await supabase
    .from('projekte')
    .update({
      name: projektName,
      kunde_id: formData.get('kunde_id') as string,
      beschreibung: (formData.get('beschreibung') as string) || null,
      standort: (formData.get('standort') as string) || null,
      projektart: (formData.get('projektart') as string) || null,
      gesamtbudget: formData.get('gesamtbudget') ? Number(formData.get('gesamtbudget')) : null,
      produkt_budget: formData.get('produkt_budget') ? Number(formData.get('produkt_budget')) : null,
      service_modell: serviceModell || null,
      service_pauschale: serviceModell === 'pauschale' && formData.get('service_pauschale')
        ? Number(formData.get('service_pauschale')) : null,
      service_stundensatz: serviceModell === 'stundensatz' && formData.get('service_stundensatz')
        ? Number(formData.get('service_stundensatz')) : null,
      deadline,
      status: formData.get('status') as ProjektStatus,
    })
    .eq('id', id)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  // Timeline-Auto-Sync: Deadline als Meilenstein-Event spiegeln
  try {
    const { syncAutoEvent } = await import('./timeline')
    if (deadline) {
      await syncAutoEvent('deadline', id, id, {
        titel:       `Projektdeadline: ${projektName}`,
        typ:         'meilenstein',
        start_datum: deadline,
      })
    } else {
      await syncAutoEvent('deadline', id, id, null, { loeschen: true })
    }
  } catch (err) {
    console.error('[projektAktualisieren:syncAutoEvent]', err)
  }

  revalidatePath('/dashboard/projekte')
  revalidatePath(`/dashboard/projekte/${id}`)
  redirect(`/dashboard/projekte/${id}`)
}

export async function projektStatusAendern(
  id: string,
  status: ProjektStatus
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: vorher } = await supabase
    .from('projekte').select('name, status').eq('id', id).eq('organisation_id', orgId).maybeSingle()

  await supabase
    .from('projekte')
    .update({ status })
    .eq('id', id)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  if (vorher && vorher.status !== status) {
    await auditLog({
      aktion:        'projekt_status_geaendert',
      entitaet_typ:  'projekt',
      entitaet_id:   id,
      entitaet_name: vorher.name,
      details:       { von: vorher.status, zu: status },
    })
  }

  revalidatePath(`/dashboard/projekte/${id}`)
  revalidatePath('/dashboard/projekte')
}

// ═══════════════════════════════════════════════════════════════
// Auto-Status-Progression (nur Vorwärts, nur von Event-Aktionen)
// ═══════════════════════════════════════════════════════════════

/**
 * Setzt den Projekt-Status automatisch eine Stufe weiter, aber NUR
 * wenn der aktuelle Status dem erwarteten Ausgangs-Status der Regel
 * entspricht. Dadurch überschreibt die Automatik keine manuell
 * gesetzten Stati (z.B. wenn User „Abgeschlossen" gedrückt hat,
 * springt sie nicht zurück auf „Warten auf Kunde").
 *
 * Rules:
 *   - 'offen' | 'in_bearbeitung' → 'freigegeben' (Warten auf Kunde)
 *   - 'freigegeben' → 'abgeschlossen'
 *
 * Nutzt Admin-Client, weil die auslösende Aktion meist einen
 * eigenen Auth-Kontext hat und Auto-Status nur Nebeneffekt ist.
 * Fehler hier crashen nie den aufrufenden Flow.
 */
export async function autoProjektStatusVorwaerts(
  projektId: string,
  neuerStatus: 'freigegeben' | 'abgeschlossen',
): Promise<{ geaendert: boolean; alter?: ProjektStatus }> {
  try {
    const admin = createAdminClient()
    const { data: p } = await admin
      .from('projekte')
      .select('status, organisation_id')
      .eq('id', projektId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!p) return { geaendert: false }

    const aktueller = p.status as ProjektStatus

    // Regel 1: → freigegeben nur wenn aktuell offen oder in_bearbeitung
    if (neuerStatus === 'freigegeben' && aktueller !== 'offen' && aktueller !== 'in_bearbeitung') {
      return { geaendert: false, alter: aktueller }
    }
    // Regel 2: → abgeschlossen nur wenn aktuell freigegeben
    if (neuerStatus === 'abgeschlossen' && aktueller !== 'freigegeben') {
      return { geaendert: false, alter: aktueller }
    }

    const { error } = await admin
      .from('projekte')
      .update({ status: neuerStatus })
      .eq('id', projektId)
      .eq('organisation_id', p.organisation_id)
      .is('deleted_at', null)

    if (error) return { geaendert: false, alter: aktueller }

    revalidatePath(`/dashboard/projekte/${projektId}`)
    revalidatePath('/dashboard/projekte')
    return { geaendert: true, alter: aktueller }
  } catch {
    return { geaendert: false }
  }
}

export async function projektSoftDelete(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: vorher } = await supabase
    .from('projekte').select('name').eq('id', id).eq('organisation_id', orgId).maybeSingle()

  await supabase
    .from('projekte')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)

  await auditLog({
    aktion:        'projekt_geloescht',
    entitaet_typ:  'projekt',
    entitaet_id:   id,
    entitaet_name: vorher?.name ?? null,
  })

  revalidatePath('/dashboard/projekte')
  redirect('/dashboard/projekte')
}

// ── Archivierung ──────────────────────────────────────────────

export async function projektArchivieren(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: vorher } = await supabase
    .from('projekte').select('name').eq('id', id).eq('organisation_id', orgId).maybeSingle()

  await supabase
    .from('projekte')
    .update({ archiviert: true, archiviert_am: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  await auditLog({
    aktion:        'projekt_archiviert',
    entitaet_typ:  'projekt',
    entitaet_id:   id,
    entitaet_name: vorher?.name ?? null,
  })

  revalidatePath('/dashboard/projekte')
  revalidatePath(`/dashboard/projekte/${id}`)
}

export async function projektWiederherstellen(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('projekte')
    .update({ archiviert: false, archiviert_am: null })
    .eq('id', id)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)
  revalidatePath('/dashboard/projekte')
  revalidatePath(`/dashboard/projekte/${id}`)
}

// ── Duplikation ───────────────────────────────────────────────

export interface DuplikationsOptionen {
  neuerName: string
  kundeId: string
  kopiereRaeume: boolean
  kopiereProdukte: boolean
}

export async function projektDuplizieren(
  quellId: string,
  optionen: DuplikationsOptionen
): Promise<{ id: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Quellprojekt laden
  const { data: quelle } = await supabase
    .from('projekte')
    .select('*')
    .eq('id', quellId)
    .is('deleted_at', null)
    .single()
  if (!quelle) throw new Error('Quellprojekt nicht gefunden')

  // Neues Projekt anlegen
  const { data: neuesProjekt, error: pErr } = await supabase
    .from('projekte')
    .insert({
      name:            optionen.neuerName,
      kunde_id:        optionen.kundeId,
      beschreibung:    quelle.beschreibung,
      standort:        quelle.standort,
      projektart:      quelle.projektart,
      gesamtbudget:    quelle.gesamtbudget,
      status:          'in_bearbeitung',
      organisation_id: orgId,
    })
    .select('id')
    .single()

  if (pErr || !neuesProjekt) throw new Error('Fehler beim Anlegen des Projekts')

  if (!optionen.kopiereRaeume) {
    revalidatePath('/dashboard/projekte')
    return { id: neuesProjekt.id }
  }

  // Räume laden + kopieren
  const { data: quellenRaeume } = await supabase
    .from('raeume')
    .select('*')
    .eq('projekt_id', quellId)
    .is('deleted_at', null)
    .order('reihenfolge')

  if (!quellenRaeume || quellenRaeume.length === 0) {
    revalidatePath('/dashboard/projekte')
    return { id: neuesProjekt.id }
  }

  // Räume einfügen + Mapping alte ID → neue ID
  const raumIdMap: Record<string, string> = {}
  for (const raum of quellenRaeume) {
    const { data: neuerRaum } = await supabase
      .from('raeume')
      .insert({
        projekt_id:      neuesProjekt.id,
        name:            raum.name,
        beschreibung:    raum.beschreibung,
        reihenfolge:     raum.reihenfolge,
        organisation_id: orgId,
      })
      .select('id')
      .single()
    if (neuerRaum) raumIdMap[raum.id] = neuerRaum.id
  }

  if (!optionen.kopiereProdukte) {
    revalidatePath('/dashboard/projekte')
    return { id: neuesProjekt.id }
  }

  // Produkte für alle Quell-Räume laden
  const quellenRaumIds = quellenRaeume.map((r) => r.id)
  const { data: quellenProdukte } = await supabase
    .from('produkte')
    .select('*')
    .in('raum_id', quellenRaumIds)
    .is('deleted_at', null)
    .order('reihenfolge')

  if (quellenProdukte && quellenProdukte.length > 0) {
    const neueProdukte = quellenProdukte
      .filter((p) => raumIdMap[p.raum_id])
      .map((p) => ({
        raum_id:           raumIdMap[p.raum_id],
        partner_id:        p.partner_id,
        name:              p.name,
        beschreibung:      p.beschreibung,
        kategorie:         p.kategorie,
        menge:             p.menge,
        einheit:           p.einheit,
        einkaufspreis:     p.einkaufspreis,
        marge_prozent:     p.marge_prozent,
        provision_prozent: p.provision_prozent,
        notizen_intern:    p.notizen_intern,
        verkaufspreis:     p.verkaufspreis,
        bild_url:          p.bild_url,
        produkt_url:       p.produkt_url,
        reihenfolge:       p.reihenfolge,
        bestellstatus:     'ausstehend' as const,
        organisation_id:   orgId,
      }))
    await supabase.from('produkte').insert(neueProdukte)
  }

  revalidatePath('/dashboard/projekte')
  return { id: neuesProjekt.id }
}

// ── PIN-Schutz ────────────────────────────────────────────────

/** PIN setzen (4-6 Ziffern) oder entfernen (null). */
export async function pinSetzen(
  projektId: string,
  pin: string | null,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  // Normalize: leerer String wird zu null (kein PIN), sonst trim.
  const normalisiert = pin == null ? null : pin.trim() || null
  const { error } = await supabase
    .from('projekte')
    .update({ freigabe_pin: normalisiert })
    .eq('id', projektId)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)
  if (error) {
    console.error('[pinSetzen]', { projektId, code: error.code, message: error.message })
    return { fehler: error.message }
  }
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return {}
}

/**
 * PIN validieren – wird von der öffentlichen Freigabe-Seite aufgerufen.
 * Nutzt Admin-Client (kein Auth-Cookie nötig).
 * Gibt true zurück wenn PIN korrekt, false sonst.
 */
const PIN_MAX_VERSUCHE = 5
const PIN_SPERRE_MS = 15 * 60 * 1000

type PinProjekt = {
  freigabe_pin: string | null
  freigabe_pin_versuche?: number | null
  freigabe_pin_gesperrt_bis?: string | null
}

export async function pinPruefen(token: string, pin: string): Promise<boolean> {
  const supabase = createAdminClient()

  // Token → Projekt-ID
  const { data: tokenData } = await supabase
    .from('freigabe_tokens')
    .select('projekt_id')
    .eq('token', token)
    .eq('aktiv', true)
    .maybeSingle()

  if (!tokenData) return false

  // Projekt + Lockout-Spalten (Migration 115). Fail-safe: fehlen die Spalten
  // (Migration noch nicht eingespielt), läuft der PIN-Check ohne Lockout weiter.
  let proj: PinProjekt | null = null
  let lockoutVerfuegbar = true
  const voll = await supabase
    .from('projekte')
    .select('freigabe_pin, freigabe_pin_versuche, freigabe_pin_gesperrt_bis')
    .eq('id', tokenData.projekt_id)
    .is('deleted_at', null)
    .maybeSingle()
  if (voll.error) {
    lockoutVerfuegbar = false
    const basis = await supabase
      .from('projekte')
      .select('freigabe_pin')
      .eq('id', tokenData.projekt_id)
      .is('deleted_at', null)
      .maybeSingle()
    proj = (basis.data as PinProjekt | null)
  } else {
    proj = (voll.data as PinProjekt | null)
  }

  if (!proj) return false

  // Gesperrt? (zu viele Fehlversuche)
  if (lockoutVerfuegbar && proj.freigabe_pin_gesperrt_bis && new Date(proj.freigabe_pin_gesperrt_bis) > new Date()) {
    return false
  }

  // Beidseitig trimmen + als String normalisieren (Legacy-PINs mit Whitespace).
  const gespeichert = (proj.freigabe_pin ?? '').toString().trim()
  if (!gespeichert) return false
  const eingabe = (pin ?? '').toString().trim()
  const ok = gespeichert === eingabe

  // Server-seitiger Brute-Force-Schutz: Versuche zählen / sperren.
  if (lockoutVerfuegbar) {
    if (ok) {
      if ((proj.freigabe_pin_versuche ?? 0) > 0 || proj.freigabe_pin_gesperrt_bis) {
        await supabase
          .from('projekte')
          .update({ freigabe_pin_versuche: 0, freigabe_pin_gesperrt_bis: null })
          .eq('id', tokenData.projekt_id)
      }
    } else {
      // Atomarer Fehlversuch-Zähler (Migration 117). Fail-safe: fehlt die
      // RPC-Funktion, nicht-atomarer Fallback (bisheriges Verhalten).
      const rpc = await supabase.rpc('freigabe_pin_fehlversuch', { p_projekt_id: tokenData.projekt_id })
      if (rpc.error) {
        const versuche = (proj.freigabe_pin_versuche ?? 0) + 1
        const update: { freigabe_pin_versuche: number; freigabe_pin_gesperrt_bis?: string } = { freigabe_pin_versuche: versuche }
        if (versuche >= PIN_MAX_VERSUCHE) {
          update.freigabe_pin_gesperrt_bis = new Date(Date.now() + PIN_SPERRE_MS).toISOString()
        }
        await supabase.from('projekte').update(update).eq('id', tokenData.projekt_id)
      }
    }
  }

  // Datentresor: bei korrekter PIN signiertes httpOnly-Cookie setzen, damit der
  // Server die Produktdaten freigibt (page.tsx lädt sie erst dann).
  if (ok) pinCookieSetzen(token, gespeichert)

  return ok
}
