'use server'

/**
 * Server-Actions fuer Produkt-Reklamationen (Migration 100).
 * Reklamation = ein Mangel/Storno/Falschlieferung an einem `raum_produkt`.
 * Hat Threaded-Status-Workflow + Foto-Upload + optionale Gutschrift.
 */

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { auditLog } from '@/lib/audit'
import { syncAufgabeAusQuelle } from '@/app/actions/aufgaben'
import crypto from 'crypto'
import type {
  ProduktReklamation, ReklamationTyp, ReklamationStatus, ReklamationLoesungTyp,
  BestellStatus,
} from '@/lib/supabase/types'

// ── Lesen ─────────────────────────────────────────────────────

/** Alle Reklamationen einer Org (mit optionalem Status-Filter) laden. */
export async function getReklamationen(opts?: {
  status?: ReklamationStatus | 'alle'
  raumProduktId?: string
}): Promise<ProduktReklamation[]> {
  const supabase = await createClient()
  let q = supabase.from('produkt_reklamationen').select('*')
  if (opts?.raumProduktId) q = q.eq('raum_produkte_id', opts.raumProduktId)
  if (opts?.status && opts.status !== 'alle') q = q.eq('status', opts.status)
  const { data } = await q.order('created_at', { ascending: false })
  return (data ?? []) as ProduktReklamation[]
}

/** Reklamationen zu mehreren raum_produkte gleichzeitig (fuer Listen-Views). */
export async function getReklamationenFuerRaumProdukte(
  raumProduktIds: string[],
): Promise<ProduktReklamation[]> {
  if (raumProduktIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('produkt_reklamationen')
    .select('*')
    .in('raum_produkte_id', raumProduktIds)
    .order('created_at', { ascending: false })
  return (data ?? []) as ProduktReklamation[]
}

// ── Anlegen ───────────────────────────────────────────────────

export async function reklamationAnlegen(input: {
  raumProduktId: string
  typ: ReklamationTyp
  beschreibung: string
  fotoUrls?: string[]
  kundeSichtbar?: boolean
  /** Soll der Bestellstatus auf 'mangel_gemeldet' gesetzt werden? Default: true */
  setzeBestellstatus?: boolean
}): Promise<{ id?: string; fehler?: string }> {
  const text = input.beschreibung.trim()
  if (!text) return { fehler: 'Beschreibung darf nicht leer sein.' }
  if (text.length > 4000) return { fehler: 'Beschreibung zu lang (max 4000 Zeichen).' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()

  // raum_produkte muss zur Org gehoeren
  const { data: rp } = await supabase
    .from('raum_produkte')
    .select('id, raum_id, organisation_id, raeume(projekt_id)')
    .eq('id', input.raumProduktId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!rp) return { fehler: 'Produkt nicht gefunden.' }

  const { data, error } = await supabase
    .from('produkt_reklamationen')
    .insert({
      organisation_id:    orgId,
      raum_produkte_id:   input.raumProduktId,
      typ:                input.typ,
      beschreibung:       text,
      foto_urls:          input.fotoUrls ?? [],
      status:             'offen',
      kunde_sichtbar:     input.kundeSichtbar ?? true,
      erstellt_von:       user?.id ?? null,
    })
    .select('id')
    .single()
  if (error || !data) return { fehler: 'Konnte Reklamation nicht speichern.' }

  // Bestellstatus auf 'mangel_gemeldet' setzen (default true)
  if (input.setzeBestellstatus !== false) {
    await supabase
      .from('raum_produkte')
      .update({
        bestellstatus: 'mangel_gemeldet' as BestellStatus,
        mangel_gemeldet_am: new Date().toISOString(),
      })
      .eq('id', input.raumProduktId)
      .eq('organisation_id', orgId)
  }

  await auditLog({
    aktion:        'reklamation_angelegt' as string,
    entitaet_typ:  'reklamation' as string,
    entitaet_id:   data.id,
    details:       { raum_produkt_id: input.raumProduktId, typ: input.typ },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projektId = (rp.raeume as any)?.projekt_id
  if (projektId) {
    revalidatePath(`/dashboard/projekte/${projektId}/raeume/${rp.raum_id}`)
  }
  revalidatePath('/dashboard/bestellungen')

  // Auto-Sync: passende Aufgabe in Kanban anlegen
  // Produktname fuer Titel laden
  const { data: produkt } = await supabase
    .from('raum_produkte')
    .select('produkte:produkt_id(name), raeume:raum_id(projekt_id, projekte:projekt_id(kunde_id))')
    .eq('id', input.raumProduktId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const produktName = (produkt?.produkte as any)?.name as string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kundeId     = (produkt?.raeume as any)?.projekte?.kunde_id as string | null | undefined
  const titel = produktName ? `Reklamation: ${produktName}` : `Reklamation (${TYP_LABEL[input.typ]})`
  await syncAufgabeAusQuelle('reklamation', data.id, {
    titel,
    beschreibung:       text,
    status:             'in_arbeit',
    prioritaet:         input.typ === 'transportschaden' || input.typ === 'mangel' ? 'hoch' : 'normal',
    kunde_id:           kundeId ?? null,
    projekt_id:         projektId ?? null,
    raum_id:            rp.raum_id ?? null,
    raum_produkte_id:   input.raumProduktId,
    sichtbar_fuer_kunde: input.kundeSichtbar ?? true,
  })

  return { id: data.id }
}

const TYP_LABEL: Record<ReklamationTyp, string> = {
  mangel:               'Mangel',
  falsche_lieferung:    'Falsche Lieferung',
  transportschaden:     'Transportschaden',
  nicht_wie_bestellt:   'Nicht wie bestellt',
  kunde_storno:         'Kunden-Storno',
  sonstiges:            'Sonstiges',
}

// ── Status / Loesung ──────────────────────────────────────────

export async function reklamationStatusAendern(
  id: string,
  neuerStatus: ReklamationStatus,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: aktuell } = await supabase
    .from('produkt_reklamationen')
    .select('status')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!aktuell) return { fehler: 'Reklamation nicht gefunden.' }

  const update: Record<string, unknown> = { status: neuerStatus }
  if (neuerStatus === 'geloest') update.geloest_am = new Date().toISOString()

  const { error } = await supabase
    .from('produkt_reklamationen')
    .update(update)
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Status konnte nicht aktualisiert werden.' }

  await auditLog({
    aktion:        'reklamation_status_geaendert' as string,
    entitaet_typ:  'reklamation' as string,
    entitaet_id:   id,
    details:       { von: aktuell.status, zu: neuerStatus },
  })

  // Auto-Sync: bei 'geloest' wird Aufgabe auf erledigt gesetzt
  if (neuerStatus === 'geloest') {
    try {
      await supabase
        .from('aufgaben')
        .update({ status: 'erledigt', erledigt_am: new Date().toISOString() })
        .eq('organisation_id', orgId)
        .eq('quelle', 'reklamation')
        .eq('quelle_id', id)
    } catch (e) { console.error('[syncAufgabe:reklamation:erledigt]', e) }
  }

  revalidatePath('/dashboard/bestellungen')
  return { erfolg: true }
}

/** Reklamation als geloest markieren mit Loesungs-Typ. */
export async function reklamationLoesen(input: {
  id: string
  loesungTyp: ReklamationLoesungTyp
  loesungNotiz?: string | null
  betragGutschrift?: number | null
  /** Bestellstatus zurueck auf 'geliefert' setzen? Default: true */
  bestellstatusZuruecksetzen?: boolean
}): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: rek } = await supabase
    .from('produkt_reklamationen')
    .select('id, raum_produkte_id')
    .eq('id', input.id)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!rek) return { fehler: 'Reklamation nicht gefunden.' }

  const { error } = await supabase
    .from('produkt_reklamationen')
    .update({
      status:           'geloest',
      loesung_typ:      input.loesungTyp,
      loesung_notiz:    input.loesungNotiz?.trim() || null,
      betrag_gutschrift: input.betragGutschrift ?? null,
      geloest_am:       new Date().toISOString(),
    })
    .eq('id', input.id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Konnte nicht als gelöst markieren.' }

  // Bestellstatus zuruecksetzen
  if (input.bestellstatusZuruecksetzen !== false) {
    const ziel: BestellStatus = input.loesungTyp === 'ersatz' ? 'bestellt' : 'geliefert'
    await supabase
      .from('raum_produkte')
      .update({ bestellstatus: ziel })
      .eq('id', rek.raum_produkte_id)
      .eq('organisation_id', orgId)
  }

  await auditLog({
    aktion:        'reklamation_geloest' as string,
    entitaet_typ:  'reklamation' as string,
    entitaet_id:   input.id,
    details:       { loesung_typ: input.loesungTyp, betrag_gutschrift: input.betragGutschrift ?? null },
  })

  // Auto-Sync: zugehoerige Aufgabe auf erledigt setzen
  try {
    await supabase
      .from('aufgaben')
      .update({ status: 'erledigt', erledigt_am: new Date().toISOString() })
      .eq('organisation_id', orgId)
      .eq('quelle', 'reklamation')
      .eq('quelle_id', input.id)
  } catch (e) { console.error('[syncAufgabe:reklamation:loesen]', e) }

  revalidatePath('/dashboard/bestellungen')
  return { erfolg: true }
}

export async function reklamationLoeschen(
  id: string,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('produkt_reklamationen')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Löschen fehlgeschlagen.' }

  await auditLog({
    aktion:        'reklamation_geloescht' as string,
    entitaet_typ:  'reklamation' as string,
    entitaet_id:   id,
  })

  // Auto-Sync: zugehoerige Aufgabe entfernen
  await syncAufgabeAusQuelle('reklamation', id, null, { loeschen: true })

  revalidatePath('/dashboard/bestellungen')
  return { erfolg: true }
}

// ── Foto-Upload ────────────────────────────────────────────────

/** Laedt ein Reklamations-Foto in den privaten Storage und gibt eine Signed-URL zurueck. */
export async function reklamationFotoHochladen(
  formData: FormData,
): Promise<{ url?: string; fehler?: string }> {
  const file = formData.get('foto') as File | null
  if (!file) return { fehler: 'Kein Bild übermittelt.' }
  if (!file.type.startsWith('image/')) return { fehler: 'Nur Bilder erlaubt.' }
  if (file.size > 25 * 1024 * 1024) return { fehler: 'Bild zu groß (max. 25 MB).' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const admin = createAdminClient()

  const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const name = `${orgId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadErr } = await admin.storage
    .from('reklamation-fotos')
    .upload(name, file, { contentType: file.type, upsert: false })
  if (uploadErr) return { fehler: 'Fehler beim Upload.' }

  const { data: signed } = await admin.storage
    .from('reklamation-fotos')
    .createSignedUrl(name, 60 * 60 * 24 * 365) // 1 Jahr
  if (!signed?.signedUrl) return { fehler: 'Signed URL konnte nicht erstellt werden.' }

  void supabase // silence unused
  return { url: signed.signedUrl }
}
