'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ProduktStatus, BestellStatus, VariantenDefinition, Json } from '@/lib/supabase/types'
import { syncAutoEvent } from './timeline'
import { auditLog } from '@/lib/audit'

export type ProduktActionState = { fehler: string } | null

/**
 * Synchronisiert Timeline-Events eines Produkts nach aktuellem DB-Stand.
 * Wird von produktDatumAktualisieren + bestellstatusAendern aufgerufen.
 * Fehler werden geschluckt (ein fehlgeschlagener Sync darf die
 * Haupt-Action nicht abbrechen).
 */
/**
 * Öffentliche Version: synct alle raum_produkte eines Raums auf einmal.
 * Aufruf vom UI-Button "Timeline neu laden" auf der Raum-Detail-Seite.
 * Gibt Detail-Counts zurück, damit der User sieht was wirklich passiert ist.
 */
export async function syncAlleProdukteImRaum(
  raumId: string,
  projektId: string,
): Promise<{
  anzahl: number
  events_erstellt: number
  events_aktualisiert: number
  events_geloescht: number
  events_uebersprungen: number
  events_in_diesem_raum: number
  events_im_projekt: number
  error?: string
  details?: string
}> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: eintraege, error: readErr } = await supabase
    .from('raum_produkte')
    .select('id, produkt_id, bestellstatus, bestellt_am, liefertermin, lieferung_erhalten_am, produkte(name)')
    .eq('raum_id', raumId)
    .eq('organisation_id', orgId)
  if (readErr) return {
    anzahl: 0, events_erstellt: 0, events_aktualisiert: 0,
    events_geloescht: 0, events_uebersprungen: 0,
    events_in_diesem_raum: 0, events_im_projekt: 0,
    error: readErr.message,
  }
  const list = (eintraege ?? []) as unknown as Array<{
    id: string
    produkt_id: string
    bestellstatus: string | null
    bestellt_am: string | null
    liefertermin: string | null
    lieferung_erhalten_am: string | null
    produkte: { name: string } | null
  }>

  const errors: string[] = []
  let erstellt = 0, aktualisiert = 0, geloescht = 0, uebersprungen = 0
  const detailLog: string[] = []

  for (const e of list) {
    const name = e.produkte?.name ?? 'Produkt'
    const info = `${name}: status=${e.bestellstatus ?? '?'}, liefertermin=${e.liefertermin ?? 'null'}, bestellt=${e.bestellt_am ?? 'null'}, geliefert=${e.lieferung_erhalten_am ?? 'null'}`
    detailLog.push(info)
    console.info('[syncAlleProdukteImRaum]', info)
    const res = await syncProduktTimelineMitCounter(e.id, projektId, raumId)
    if (res.error) errors.push(`${name}: ${res.error}`)
    erstellt      += res.created
    aktualisiert  += res.updated
    geloescht     += res.deleted
    uebersprungen += res.noop
  }
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  revalidatePath(`/dashboard/projekte/${projektId}/timeline`)

  // Verifikation: nach dem Sync direkt in DB nachzählen — damit wir sehen,
  // ob die Events auch wirklich mit dem korrekten raum_id landen.
  const { count: countImRaum } = await supabase
    .from('timeline_events')
    .select('id', { count: 'exact', head: true })
    .eq('raum_id', raumId)
    .eq('organisation_id', orgId)
  const { count: countImProjekt } = await supabase
    .from('timeline_events')
    .select('id', { count: 'exact', head: true })
    .eq('projekt_id', projektId)
    .eq('organisation_id', orgId)
    .in('quelle', ['produkt', 'bestellstatus'])

  return {
    anzahl:               list.length,
    events_erstellt:      erstellt,
    events_aktualisiert:  aktualisiert,
    events_geloescht:     geloescht,
    events_uebersprungen: uebersprungen,
    events_in_diesem_raum: countImRaum ?? 0,
    events_im_projekt:     countImProjekt ?? 0,
    error:    errors.length > 0 ? errors.join(' | ') : undefined,
    details:  detailLog.join(' • '),
  }
}

/**
 * Wrapper um syncProduktTimeline, der die Actions der zwei syncAutoEvent-Aufrufe
 * aggregiert. Nötig weil syncProduktTimeline selber nur { error? } zurückgibt.
 */
async function syncProduktTimelineMitCounter(
  raumProduktId: string, projektId: string, raumId: string,
): Promise<{ created: number; updated: number; deleted: number; noop: number; error?: string }> {
  const supabase = await createClient()
  const errors: string[] = []
  let created = 0, updated = 0, deleted = 0, noop = 0
  try {
    const { data: rp, error: readErr } = await supabase
      .from('raum_produkte')
      .select('id, bestellstatus, bestellt_am, lieferung_erhalten_am, liefertermin, produkte(name)')
      .eq('id', raumProduktId)
      .maybeSingle()
    if (readErr) return { created, updated, deleted, noop, error: `read: ${readErr.message}` }
    if (!rp)    return { created, updated, deleted, noop, error: `rp nicht gefunden: ${raumProduktId}` }
    const rpTyped = rp as unknown as {
      bestellstatus: string | null
      bestellt_am: string | null
      lieferung_erhalten_am: string | null
      liefertermin: string | null
      produkte: { name: string } | { name: string }[] | null
    }
    const prodRaw = rpTyped.produkte
    const name = Array.isArray(prodRaw) ? (prodRaw[0]?.name ?? 'Produkt') : (prodRaw?.name ?? 'Produkt')

    // Liefertermin-Event
    const r1 = rpTyped.liefertermin
      ? await syncAutoEvent('produkt', raumProduktId, projektId, {
          titel: `Lieferung: ${name}`, typ: 'lieferung',
          start_datum: rpTyped.liefertermin, raum_id: raumId,
        })
      : await syncAutoEvent('produkt', raumProduktId, projektId, null, { loeschen: true })
    if (r1.error) errors.push(r1.error)
    if (r1.action === 'created') created++
    if (r1.action === 'updated') updated++
    if (r1.action === 'deleted') deleted++
    if (r1.action === 'noop')    noop++

    // Bestellstatus-Event
    const r2 =
      rpTyped.bestellstatus === 'geliefert' && rpTyped.lieferung_erhalten_am
        ? await syncAutoEvent('bestellstatus', raumProduktId, projektId, {
            titel: `Geliefert: ${name}`, typ: 'lieferung',
            start_datum: rpTyped.lieferung_erhalten_am, status: 'abgeschlossen',
            raum_id: raumId,
          })
        : (rpTyped.bestellstatus === 'bestellt' || rpTyped.bestellstatus === 'rechnung_erhalten') && rpTyped.bestellt_am
          ? await syncAutoEvent('bestellstatus', raumProduktId, projektId, {
              titel: `Bestellt: ${name}`, typ: 'lieferung',
              start_datum: rpTyped.bestellt_am, status: 'abgeschlossen',
              raum_id: raumId,
            })
          : await syncAutoEvent('bestellstatus', raumProduktId, projektId, null, { loeschen: true })
    if (r2.error) errors.push(r2.error)
    if (r2.action === 'created') created++
    if (r2.action === 'updated') updated++
    if (r2.action === 'deleted') deleted++
    if (r2.action === 'noop')    noop++
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
  }
  return {
    created, updated, deleted, noop,
    error: errors.length ? errors.join(' | ') : undefined,
  }
}

async function syncProduktTimeline(
  raumProduktId: string, projektId: string, raumId: string,
): Promise<{ error?: string }> {
  const errors: string[] = []
  try {
    const supabase = await createClient()
    // Lies aus raum_produkte + produkte (für den Namen).
    // raum_produkte hält seit Migration 076 die per-Raum Bestell-/Lieferdaten.
    const { data: rp, error: readErr } = await supabase
      .from('raum_produkte')
      .select('id, bestellstatus, bestellt_am, lieferung_erhalten_am, liefertermin, produkte(name)')
      .eq('id', raumProduktId)
      .maybeSingle<{
        id: string
        bestellstatus: BestellStatus
        bestellt_am: string | null
        lieferung_erhalten_am: string | null
        liefertermin: string | null
        produkte: { name: string } | null
      }>()
    if (readErr) {
      const msg = `[syncProduktTimeline:read] ${readErr.message}`
      console.error(msg, { raumProduktId })
      return { error: msg }
    }
    if (!rp) {
      const msg = `[syncProduktTimeline] Raum-Produkt nicht gefunden (RLS?): ${raumProduktId}`
      console.warn(msg)
      return { error: msg }
    }
    const name = rp.produkte?.name ?? 'Produkt'
    console.info('[syncProduktTimeline]', {
      raumProduktId, projektId, raumId,
      name, status: rp.bestellstatus,
      bestellt_am: rp.bestellt_am, lieferung_erhalten_am: rp.lieferung_erhalten_am,
      liefertermin: rp.liefertermin,
    })

    // Liefertermin-Event (quelle=produkt) — Kunden-sichtbar
    // quelle_id ist ab sofort die raum_produkte.id, nicht mehr produkte.id.
    // Damit kann derselbe Artikel in zwei Räumen zwei separate Events haben.
    let res: { error?: string } = {}
    if (rp.liefertermin) {
      res = await syncAutoEvent('produkt', raumProduktId, projektId, {
        titel:       `Lieferung: ${name}`,
        typ:         'lieferung',
        start_datum: rp.liefertermin,
        raum_id:     raumId,
      })
    } else {
      res = await syncAutoEvent('produkt', raumProduktId, projektId, null, { loeschen: true })
    }
    if (res.error) errors.push(res.error)

    // Bestellstatus-Event (quelle=bestellstatus) — intern, NICHT im Portal
    if (rp.bestellstatus === 'geliefert' && rp.lieferung_erhalten_am) {
      res = await syncAutoEvent('bestellstatus', raumProduktId, projektId, {
        titel:       `Geliefert: ${name}`,
        typ:         'lieferung',
        start_datum: rp.lieferung_erhalten_am,
        status:      'abgeschlossen',
        raum_id:     raumId,
      })
    } else if ((rp.bestellstatus === 'bestellt' || rp.bestellstatus === 'rechnung_erhalten') && rp.bestellt_am) {
      res = await syncAutoEvent('bestellstatus', raumProduktId, projektId, {
        titel:       `Bestellt: ${name}`,
        typ:         'lieferung',
        start_datum: rp.bestellt_am,
        status:      'abgeschlossen',
        raum_id:     raumId,
      })
    } else {
      res = await syncAutoEvent('bestellstatus', raumProduktId, projektId, null, { loeschen: true })
    }
    if (res.error) errors.push(res.error)
  } catch (err) {
    const msg = `[syncProduktTimeline] ${err instanceof Error ? err.message : String(err)}`
    console.error(msg)
    errors.push(msg)
  }
  return errors.length > 0 ? { error: errors.join(' | ') } : {}
}

function parseOptionalNumber(val: FormDataEntryValue | null): number | null {
  if (!val || val === '') return null
  const n = parseFloat(val as string)
  return isNaN(n) ? null : n
}

function parseJsonArray(val: FormDataEntryValue | null): string[] {
  if (!val || val === '') return []
  try { return JSON.parse(val as string) } catch { return [] }
}

const ERLAUBTE_VERFUEGBARKEIT = new Set(['auf_anfrage', 'saisonal', 'lieferzeit_4_6', 'standard'])

function neueFelder(formData: FormData) {
  const verfuegbarkeitRaw = (formData.get('verfuegbarkeit') as string) || ''
  const verfuegbarkeit = ERLAUBTE_VERFUEGBARKEIT.has(verfuegbarkeitRaw) ? verfuegbarkeitRaw : null
  return {
    lieferzeit:     (formData.get('lieferzeit')     as string) || null,
    breite_cm:      parseOptionalNumber(formData.get('breite_cm')),
    tiefe_cm:       parseOptionalNumber(formData.get('tiefe_cm')),
    hoehe_cm:       parseOptionalNumber(formData.get('hoehe_cm')),
    material:       (formData.get('material')       as string) || null,
    farbe:          (formData.get('farbe')          as string) || null,
    artikelnummer:  (formData.get('artikelnummer')  as string) || null,
    verfuegbarkeit,
    tags:           parseJsonArray(formData.get('tags_json')),
    bilder_urls:    parseJsonArray(formData.get('bilder_urls_json')),
    hinweis_extern:          ((formData.get('hinweis_extern') as string) || '').trim() || null,
    hinweis_extern_sichtbar: formData.get('hinweis_extern_sichtbar') === 'on',
    // Provision (Typ/Fix) + Einkaufsrabatt (Migration 120)
    provision_typ:          (formData.get('provision_typ') as string) === 'fix' ? 'fix'
                            : (formData.get('provision_typ') as string) === 'prozent' ? 'prozent' : null,
    provision_fix:          parseOptionalNumber(formData.get('provision_fix')),
    einkaufsrabatt_prozent: parseOptionalNumber(formData.get('einkaufsrabatt_prozent')),
  }
}

export async function produktInBibliothekAnlegen(
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: produkt, error } = await supabase
    .from('produkte')
    .insert({
      raum_id: null,
      partner_id: (formData.get('partner_id') as string) || null,
      name: formData.get('name') as string,
      beschreibung: (formData.get('beschreibung') as string) || null,
      kategorie: (formData.get('kategorie') as string) || null,
      menge: parseOptionalNumber(formData.get('menge')) ?? 1,
      einheit: (formData.get('einheit') as string) || 'Stk',
      einkaufspreis: parseOptionalNumber(formData.get('einkaufspreis')),
      marge_prozent: parseOptionalNumber(formData.get('marge_prozent')),
      provision_prozent: parseOptionalNumber(formData.get('provision_prozent')),
      verkaufspreis: parseOptionalNumber(formData.get('verkaufspreis')),
      bild_url: (formData.get('bild_url') as string) || null,
      produkt_url: (formData.get('produkt_url') as string) || null,
      notizen_intern: (formData.get('notizen_intern') as string) || null,
      ...neueFelder(formData),
      organisation_id: orgId,
    })
    .select('id')
    .single()

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  await supabase.from('produktstatus').insert({
    produkt_id: produkt.id,
    status: 'ausstehend',
    organisation_id: orgId,
  })

  revalidatePath('/dashboard/produkte')
  redirect('/dashboard/produkte')
}

export async function produktAnlegen(
  raumId: string,
  projektId: string,
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Produkt immer in die Bibliothek (raum_id = NULL) – Verknüpfung über raum_produkte
  const { data: produkt, error } = await supabase
    .from('produkte')
    .insert({
      raum_id: null,
      partner_id: (formData.get('partner_id') as string) || null,
      name: formData.get('name') as string,
      beschreibung: (formData.get('beschreibung') as string) || null,
      kategorie: (formData.get('kategorie') as string) || null,
      menge: parseOptionalNumber(formData.get('menge')) ?? 1,
      einheit: (formData.get('einheit') as string) || 'Stk',
      einkaufspreis: parseOptionalNumber(formData.get('einkaufspreis')),
      marge_prozent: parseOptionalNumber(formData.get('marge_prozent')),
      provision_prozent: parseOptionalNumber(formData.get('provision_prozent')),
      verkaufspreis: parseOptionalNumber(formData.get('verkaufspreis')),
      bild_url: (formData.get('bild_url') as string) || null,
      produkt_url: (formData.get('produkt_url') as string) || null,
      notizen_intern: (formData.get('notizen_intern') as string) || null,
      ...neueFelder(formData),
      organisation_id: orgId,
    })
    .select('id')
    .single()

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  // Produktstatus + Raum-Verknüpfung parallel anlegen
  await Promise.all([
    supabase.from('produktstatus').insert({
      produkt_id: produkt.id,
      status: 'ausstehend',
      organisation_id: orgId,
    }),
    supabase.from('raum_produkte').insert({
      organisation_id: orgId,
      raum_id: raumId,
      produkt_id: produkt.id,
      menge: parseOptionalNumber(formData.get('menge')) ?? 1,
    }),
  ])

  // Auswahl-Freigabe-Links automatisch um das neue Produkt erweitern (fail-safe)
  const { freigabeAuswahlScopeFuerRaum } = await import('./freigaben')
  await freigabeAuswahlScopeFuerRaum(supabase, orgId, raumId)

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  redirect(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

export async function produktAktualisieren(
  produktId: string,
  raumId: string,
  projektId: string,
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Alten Stand laden für Auto-Invalidierung der Freigabe (Mig 081+082)
  const { data: vorher } = await supabase
    .from('produkte')
    .select('verkaufspreis, menge, beschreibung, bild_url')
    .eq('id', produktId)
    .eq('organisation_id', orgId)
    .maybeSingle()

  const neuerVerkaufspreis = parseOptionalNumber(formData.get('verkaufspreis'))
  const neueMenge          = parseOptionalNumber(formData.get('menge')) ?? 1
  const neueBeschreibung   = (formData.get('beschreibung') as string) || null
  const neuesBildUrl       = (formData.get('bild_url') as string) || null

  const [{ error: produktError }] = await Promise.all([
    supabase
      .from('produkte')
      .update({
        partner_id: (formData.get('partner_id') as string) || null,
        name: formData.get('name') as string,
        beschreibung: neueBeschreibung,
        kategorie: (formData.get('kategorie') as string) || null,
        menge: neueMenge,
        einheit: (formData.get('einheit') as string) || 'Stk',
        einkaufspreis: parseOptionalNumber(formData.get('einkaufspreis')),
        marge_prozent: parseOptionalNumber(formData.get('marge_prozent')),
        provision_prozent: parseOptionalNumber(formData.get('provision_prozent')),
        verkaufspreis: neuerVerkaufspreis,
        bild_url: neuesBildUrl,
        produkt_url: (formData.get('produkt_url') as string) || null,
        notizen_intern: (formData.get('notizen_intern') as string) || null,
        ...neueFelder(formData),
      })
      .eq('id', produktId)
      .eq('organisation_id', orgId)
      .is('deleted_at', null),
  ])

  if (produktError) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  // Auto-Invalidierung: freigegebene raum_produkte zurücksetzen
  // wenn preisrelevante Felder geändert wurden
  if (vorher) {
    const geaendert: string[] = []
    if (vorher.verkaufspreis !== neuerVerkaufspreis) geaendert.push('Preis')
    if (vorher.menge !== neueMenge)                   geaendert.push('Menge')
    if (vorher.beschreibung !== neueBeschreibung)     geaendert.push('Beschreibung')
    if (vorher.bild_url !== neuesBildUrl)             geaendert.push('Bild')
    if (geaendert.length > 0) {
      try {
        const { freigabeInvalidierenBeiProduktAenderung } = await import('./freigaben')
        await freigabeInvalidierenBeiProduktAenderung({
          produktId,
          grund: `${geaendert.join(', ')} geändert am ${new Date().toLocaleDateString('de-DE')}`,
        })
      } catch (e) {
        console.error('[produktAktualisieren:invalidate]', e)
      }
    }
  }

  // Status upserten
  await supabase
    .from('produktstatus')
    .upsert(
      {
        produkt_id: produktId,
        status: (formData.get('status') as ProduktStatus) || 'ausstehend',
      },
      { onConflict: 'produkt_id' }
    )

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  redirect(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

export async function produktAktualisierenBibliothek(
  produktId: string,
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: vorher } = await supabase
    .from('produkte')
    .select('verkaufspreis, menge, beschreibung, bild_url')
    .eq('id', produktId)
    .eq('organisation_id', orgId)
    .maybeSingle()

  const neuerVerkaufspreis = parseOptionalNumber(formData.get('verkaufspreis'))
  const neueMenge          = parseOptionalNumber(formData.get('menge')) ?? 1
  const neueBeschreibung   = (formData.get('beschreibung') as string) || null
  const neuesBildUrl       = (formData.get('bild_url') as string) || null

  const { error } = await supabase
    .from('produkte')
    .update({
      partner_id: (formData.get('partner_id') as string) || null,
      name: formData.get('name') as string,
      beschreibung: neueBeschreibung,
      kategorie: (formData.get('kategorie') as string) || null,
      menge: neueMenge,
      einheit: (formData.get('einheit') as string) || 'Stk',
      einkaufspreis: parseOptionalNumber(formData.get('einkaufspreis')),
      marge_prozent: parseOptionalNumber(formData.get('marge_prozent')),
      provision_prozent: parseOptionalNumber(formData.get('provision_prozent')),
      verkaufspreis: neuerVerkaufspreis,
      bild_url: neuesBildUrl,
      produkt_url: (formData.get('produkt_url') as string) || null,
      notizen_intern: (formData.get('notizen_intern') as string) || null,
      ...neueFelder(formData),
    })
    .eq('id', produktId)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  if (vorher) {
    const geaendert: string[] = []
    if (vorher.verkaufspreis !== neuerVerkaufspreis) geaendert.push('Preis')
    if (vorher.menge !== neueMenge)                   geaendert.push('Menge')
    if (vorher.beschreibung !== neueBeschreibung)     geaendert.push('Beschreibung')
    if (vorher.bild_url !== neuesBildUrl)             geaendert.push('Bild')
    if (geaendert.length > 0) {
      try {
        const { freigabeInvalidierenBeiProduktAenderung } = await import('./freigaben')
        await freigabeInvalidierenBeiProduktAenderung({
          produktId,
          grund: `${geaendert.join(', ')} geändert am ${new Date().toLocaleDateString('de-DE')}`,
        })
      } catch (e) {
        console.error('[produktAktualisierenBibliothek:invalidate]', e)
      }
    }
  }

  revalidatePath('/dashboard/produkte')
  redirect('/dashboard/produkte')
}

export async function produktSoftDelete(
  produktId: string,
  raumId: string,
  projektId: string
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('produkte')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', produktId)
    .eq('organisation_id', orgId)

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

export async function produktFuerPartnerAnlegen(
  partnerId: string,
  prevState: ProduktActionState,
  formData: FormData
): Promise<ProduktActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { fehler: 'Produktname ist erforderlich.' }

  const { data: produkt, error } = await supabase
    .from('produkte')
    .insert({
      raum_id: null,
      partner_id: partnerId,
      name,
      kategorie: (formData.get('kategorie') as string) || null,
      menge: 1,
      einheit: 'Stk',
      produkt_url: (formData.get('produkt_url') as string) || null,
      organisation_id: orgId,
    })
    .select('id')
    .single()

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  await supabase.from('produktstatus').insert({
    produkt_id: produkt.id,
    status: 'ausstehend',
    organisation_id: orgId,
  })

  revalidatePath(`/dashboard/partner/${partnerId}`)
  return null
}

/** @deprecated Verwende stattdessen produktZuRaumHinzufuegen aus raum-produkte.ts */
export async function produktZuRaumZuweisen(
  produktId: string,
  raumId: string
): Promise<ProduktActionState> {
  // Delegiert an das neue raum_produkte-System
  const { produktZuRaumHinzufuegen } = await import('./raum-produkte')
  const result = await produktZuRaumHinzufuegen(produktId, raumId)
  if (result.fehler) return { fehler: result.fehler }
  return null
}

export async function updateProduktPositionen(
  raumId: string,
  projektId: string,
  positionen: { id: string; reihenfolge: number }[]
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await Promise.all(
    positionen.map(({ id, reihenfolge }) =>
      supabase
        .from('produkte')
        .update({ reihenfolge })
        .eq('id', id)
        .eq('organisation_id', orgId)
        .is('deleted_at', null)
    )
  )
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

/**
 * Bestellstatus auf raum_produkte setzen (Migration 076).
 * Nimmt raum_produkte.id (nicht produkte.id) als ersten Parameter,
 * damit derselbe Artikel in verschiedenen Räumen eigenen Status hat.
 */
export async function bestellstatusAendern(
  raumProduktId: string,
  raumId: string,
  projektId: string,
  neuerStatus: BestellStatus
): Promise<{ fehler?: string; sync_fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Aktuelle Status + Datums-Werte aus raum_produkte laden (Auto-Füll-Logik + Audit).
  const { data: aktuell } = await supabase
    .from('raum_produkte')
    .select('bestellstatus, bestellt_am, lieferung_erhalten_am')
    .eq('id', raumProduktId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  const alterStatus = (aktuell?.bestellstatus ?? 'ausstehend') as BestellStatus

  const heute = new Date().toISOString().split('T')[0]
  const jetzt = new Date().toISOString()
  const update: Record<string, unknown> = { bestellstatus: neuerStatus }

  if ((neuerStatus === 'bestellt' || neuerStatus === 'rechnung_erhalten') && !aktuell?.bestellt_am) {
    update.bestellt_am = heute
  }
  if (neuerStatus === 'geliefert' && !aktuell?.lieferung_erhalten_am) {
    update.lieferung_erhalten_am = heute
    if (!aktuell?.bestellt_am) update.bestellt_am = heute
  }
  // Migration 100 — neue Lifecycle-Status: Datums-Felder
  if (neuerStatus === 'storniert')         update.storniert_am       = jetzt
  if (neuerStatus === 'mangel_gemeldet')   update.mangel_gemeldet_am = jetzt
  if (neuerStatus === 'retoure_unterwegs') update.retoure_am         = jetzt

  const { error } = await supabase
    .from('raum_produkte')
    .update(update)
    .eq('id', raumProduktId)
    .eq('organisation_id', orgId)
  if (error) {
    console.error('bestellstatusAendern failed:', error)
    return { fehler: error.message }
  }

  const syncRes = await syncProduktTimeline(raumProduktId, projektId, raumId)

  // Audit-Log (failsafe)
  await auditLog({
    aktion:        'produkt_bestellstatus_geaendert' as string,
    entitaet_typ:  'produkt' as string,
    entitaet_id:   raumProduktId,
    details:       { von: alterStatus, zu: neuerStatus, projekt_id: projektId, raum_id: raumId },
  })

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  return syncRes.error ? { sync_fehler: syncRes.error } : {}
}

export type ProduktDatumFeld = 'bestellt_am' | 'liefertermin' | 'lieferung_erhalten_am'

// Bestellstatus-Ranking: alte Werte bleiben "nach-vorne-locked",
// neue Lifecycle-Werte (Migration 100) werden in Sub-Commit 2 sauber
// integriert — fuer jetzt rangieren sie hoeher als rechnung_erhalten,
// damit Compile passt aber alte Logik unveraendert bleibt.
const STATUS_RANK: Record<BestellStatus, number> = {
  ausstehend: 0,
  bestellt: 1,
  teilgeliefert: 2,
  geliefert: 3,
  mangel_gemeldet: 4,
  retoure_unterwegs: 5,
  retoure_erhalten: 6,
  rechnung_erhalten: 7,
  storniert: 99,
}

/**
 * Aktualisiert ein einzelnes Datumsfeld auf raum_produkte (Migration 076).
 * Parameter raumProduktId (nicht produktId), damit jeder Raum eigene
 * Bestell-/Liefer-Daten hat.
 * Automatischer Status-Upgrade:
 *   - bestellt_am gesetzt      → bestellstatus mindestens 'bestellt'
 *   - lieferung_erhalten_am    → bestellstatus mindestens 'geliefert'
 * Ein bereits höherer Status bleibt unberührt.
 * Beim Löschen eines Datums wird der Status NICHT zurückgesetzt.
 */
export async function produktDatumAktualisieren(
  raumProduktId: string,
  raumId: string,
  projektId: string,
  feld: ProduktDatumFeld,
  datum: string | null,
): Promise<{ fehler?: string; bestellstatus?: BestellStatus; sync_fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const wert = datum && datum.trim() ? datum : null

  const update: Record<string, unknown> = { [feld]: wert }
  let neuerStatus: BestellStatus | undefined

  if (wert != null && (feld === 'bestellt_am' || feld === 'lieferung_erhalten_am')) {
    const { data: aktuell } = await supabase
      .from('raum_produkte')
      .select('bestellstatus')
      .eq('id', raumProduktId)
      .eq('organisation_id', orgId)
      .maybeSingle()

    const aktuellStatus = (aktuell?.bestellstatus ?? 'ausstehend') as BestellStatus
    const ziel: BestellStatus = feld === 'bestellt_am' ? 'bestellt' : 'geliefert'
    if (STATUS_RANK[aktuellStatus] < STATUS_RANK[ziel]) {
      update.bestellstatus = ziel
      neuerStatus = ziel
    }
  }

  const { error } = await supabase
    .from('raum_produkte')
    .update(update)
    .eq('id', raumProduktId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Datum konnte nicht gespeichert werden.' }

  const syncRes = await syncProduktTimeline(raumProduktId, projektId, raumId)

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  return { bestellstatus: neuerStatus, sync_fehler: syncRes.error }
}

export async function produktStatusAendern(
  produktId: string,
  raumId: string,
  projektId: string,
  status: ProduktStatus
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('produktstatus')
    .upsert({ produkt_id: produktId, status }, { onConflict: 'produkt_id' })

  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
}

// ── Produkt-Varianten (Migration 041) ─────────────────────────

/**
 * Legt eine neue Variante basierend auf einem Eltern-Produkt an.
 * Kopiert alle Stammdaten und setzt ist_variante=true + varianten_attribute.
 */
export async function varianteAnlegen(
  elternProduktId: string,
  variantenAttribute: Record<string, string>
): Promise<{ id?: string; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Eltern-Produkt laden
  const { data: eltern, error: elternError } = await supabase
    .from('produkte')
    .select('*')
    .eq('id', elternProduktId)
    .is('deleted_at', null)
    .single()

  if (elternError || !eltern) return { fehler: 'Eltern-Produkt nicht gefunden.' }

  // Varianten-Name aus Attributen generieren (z.B. "Eiche / 120x80")
  const attributWerte = Object.values(variantenAttribute).join(' / ')
  const variantenName = `${eltern.name} – ${attributWerte}`

  const { data: variante, error } = await supabase
    .from('produkte')
    .insert({
      organisation_id: orgId,
      raum_id: null,
      partner_id: eltern.partner_id,
      name: variantenName,
      beschreibung: eltern.beschreibung,
      kategorie: eltern.kategorie,
      menge: eltern.menge,
      einheit: eltern.einheit,
      einkaufspreis: eltern.einkaufspreis,
      marge_prozent: eltern.marge_prozent,
      provision_prozent: eltern.provision_prozent,
      provision_typ: eltern.provision_typ ?? null,
      provision_fix: eltern.provision_fix ?? null,
      einkaufsrabatt_prozent: eltern.einkaufsrabatt_prozent ?? null,
      verkaufspreis: eltern.verkaufspreis,
      bild_url: eltern.bild_url,
      produkt_url: eltern.produkt_url,
      notizen_intern: eltern.notizen_intern,
      // Neue Variantenfelder
      ist_variante: true,
      eltern_produkt_id: elternProduktId,
      varianten_attribute: variantenAttribute as unknown as Json,
    })
    .select('id')
    .single()

  if (error || !variante) return { fehler: 'Fehler beim Anlegen der Variante.' }

  // Produktstatus für Variante anlegen
  await supabase.from('produktstatus').insert({
    produkt_id: variante.id,
    status: 'ausstehend',
    organisation_id: orgId,
  })

  revalidatePath('/dashboard/produkte')
  return { id: variante.id }
}

/**
 * Speichert (upsert) eine Varianten-Definition für ein Produkt.
 * Definiert, welche Optionen ein bestimmtes Attribut hat.
 */
export async function variantenDefinitionSpeichern(
  produktId: string,
  attributName: string,
  optionen: string[]
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  if (!attributName.trim()) return { fehler: 'Attribut-Name ist erforderlich.' }
  if (optionen.length === 0) return { fehler: 'Mindestens eine Option ist erforderlich.' }

  const { error } = await supabase
    .from('varianten_definitionen')
    .upsert(
      {
        organisation_id: orgId,
        produkt_id: produktId,
        attribut_name: attributName.trim(),
        optionen,
      },
      { onConflict: 'produkt_id,attribut_name' }
    )

  if (error) return { fehler: 'Fehler beim Speichern der Varianten-Definition.' }

  revalidatePath('/dashboard/produkte')
  return {}
}

/**
 * Lädt alle Varianten-Definitionen eines Produkts.
 */
export async function getVariantenDefinitionen(
  produktId: string
): Promise<VariantenDefinition[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('varianten_definitionen')
    .select('*')
    .eq('produkt_id', produktId)
    .order('reihenfolge')

  return (data ?? []) as VariantenDefinition[]
}

/**
 * Lädt alle Varianten eines Eltern-Produkts.
 */
export async function getVarianten(elternProduktId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('produkte')
    .select('id, name, varianten_attribute, verkaufspreis, einkaufspreis, bild_url, bestellstatus')
    .eq('eltern_produkt_id', elternProduktId)
    .is('deleted_at', null)
    .order('created_at')

  return data ?? []
}

/**
 * Löscht eine Varianten-Definition (und optional alle zugehörigen Varianten-Produkte).
 */
export async function variantenDefinitionLoeschen(
  id: string,
  produktId: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()

  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('varianten_definitionen')
    .delete()
    .eq('id', id)
    .eq('produkt_id', produktId)
    .eq('organisation_id', orgId)

  if (error) return { fehler: 'Fehler beim Löschen der Definition.' }

  revalidatePath('/dashboard/produkte')
  return {}
}

// ── Bibliothek für Raum-Zuweisung ────────────────────────────
export interface BibliothekProdukt {
  id: string
  name: string
  artikelnummer: string | null
  bild_url: string | null
  verkaufspreis: number | null
  kategorie_id: string | null
  kategorie: { id: string; name: string; icon: string | null } | null
}

export async function bibliothekProdukteAbrufen(): Promise<BibliothekProdukt[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('produkte')
    .select('id, name, artikelnummer, bild_url, verkaufspreis, kategorie_id, kategorie:kategorien(id, name, icon)')
    .eq('organisation_id', orgId)
    .is('deleted_at', null)
    .eq('ist_variante', false)
    .order('name')
  return (data ?? []) as unknown as BibliothekProdukt[]
}
