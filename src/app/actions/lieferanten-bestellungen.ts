'use server'

/**
 * Server-Actions fuer Lieferanten-Bestellungen (Migration 100).
 * Eine Bestellung kann Positionen aus mehreren Raeumen verschiedener Projekte
 * enthalten (Sammelbestellung). Workflow: entwurf → bestaetigt → versandt → geliefert.
 */

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { auditLog } from '@/lib/audit'
import { syncAufgabeAusQuelle } from '@/app/actions/aufgaben'
import crypto from 'crypto'
import type {
  LieferantenBestellung, LieferantenBestellungPosition, LieferantenBestellungStatus,
  BestellStatus,
} from '@/lib/supabase/types'

// ── Lesen ─────────────────────────────────────────────────────

export type BestellungMitPartner = LieferantenBestellung & {
  partner_name: string
  positionen_count: number
}

/** Alle Bestellungen einer Org mit optionalem Status-Filter. */
export async function getBestellungen(opts?: {
  status?: LieferantenBestellungStatus | 'alle'
}): Promise<BestellungMitPartner[]> {
  const supabase = await createClient()
  let q = supabase
    .from('lieferanten_bestellungen')
    .select('*, partner(name), lieferanten_bestellung_positionen(id)')
  if (opts?.status && opts.status !== 'alle') q = q.eq('status', opts.status)
  const { data } = await q.order('created_at', { ascending: false })

  type Row = LieferantenBestellung & {
    partner: { name: string } | null
    lieferanten_bestellung_positionen: { id: string }[] | null
  }
  return ((data ?? []) as Row[]).map((b) => ({
    ...b,
    partner_name:    b.partner?.name ?? 'Unbekannt',
    positionen_count: b.lieferanten_bestellung_positionen?.length ?? 0,
  }))
}

export type BestellungMitDetails = LieferantenBestellung & {
  partner: { id: string; name: string; email: string | null; telefon: string | null } | null
  positionen: Array<LieferantenBestellungPosition & {
    raum_produkt: {
      id: string
      menge: number
      raum: { id: string; name: string; projekt_id: string; projekt_name: string | null } | null
      produkt: { id: string; name: string; bild_url: string | null; einheit: string } | null
    } | null
  }>
}

/** Eine Bestellung mit allen Positionen + verknuepften Produkten/Raeumen. */
export async function getBestellung(id: string): Promise<BestellungMitDetails | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('lieferanten_bestellungen')
    .select(`
      *,
      partner(id, name, email, telefon),
      lieferanten_bestellung_positionen(
        *,
        raum_produkte(
          id, menge,
          raeume(id, name, projekt_id, projekte(name)),
          produkte(id, name, bild_url, einheit)
        )
      )
    `)
    .eq('id', id)
    .maybeSingle()
  if (!data) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const positionen = ((data as any).lieferanten_bestellung_positionen ?? []).map((p: any) => {
    const rp = p.raum_produkte
    return {
      ...p,
      raum_produkt: rp ? {
        id:    rp.id,
        menge: rp.menge,
        raum:  rp.raeume ? {
          id:           rp.raeume.id,
          name:         rp.raeume.name,
          projekt_id:   rp.raeume.projekt_id,
          projekt_name: rp.raeume.projekte?.name ?? null,
        } : null,
        produkt: rp.produkte ? {
          id:       rp.produkte.id,
          name:     rp.produkte.name,
          bild_url: rp.produkte.bild_url,
          einheit:  rp.produkte.einheit ?? 'Stk',
        } : null,
      } : null,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = data as any
  return {
    ...result,
    partner:    result.partner ?? null,
    positionen,
  } as BestellungMitDetails
}

// ── Lieferübersicht (wer liefert was wann) ────────────────────

export type LieferuebersichtPosition = {
  bestellung_id:           string
  bestellnummer:           string | null
  partner_id:              string | null
  partner_name:            string
  status:                  LieferantenBestellungStatus
  liefertermin:            string | null
  liefertermin_bestaetigt: boolean
  produkt_name:            string
  menge:                   number
  einheit:                 string
  raum_name:               string | null
  projekt_id:              string | null
  projekt_name:            string | null
}

/**
 * Alle laufenden Bestellungen (ausgelöst/versandt/geliefert/teilretour) flach
 * pro Position, sortiert nach geplantem Liefertermin. Für die Admin-Lieferübersicht.
 * Optional auf ein Projekt gefiltert (Sammelbestellungen → Filter pro Position).
 */
export async function getLieferuebersicht(projektId?: string): Promise<LieferuebersichtPosition[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('lieferanten_bestellungen')
    .select(`
      id, bestellnummer, partner_id, status, liefertermin_geplant, liefertermin_bestaetigt,
      partner(name),
      lieferanten_bestellung_positionen(
        menge,
        raum_produkte(produkte(name, einheit), raeume(name, projekt_id, projekte(name)))
      )
    `)
    .eq('organisation_id', orgId)
    .in('status', ['bestaetigt', 'versandt', 'geliefert', 'teilretour'])
    .order('liefertermin_geplant', { ascending: true, nullsFirst: false })

  const out: LieferuebersichtPosition[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const b of (data ?? []) as any[]) {
    for (const pos of (b.lieferanten_bestellung_positionen ?? [])) {
      const rp   = pos.raum_produkte
      const raum = rp?.raeume
      if (projektId && raum?.projekt_id !== projektId) continue
      out.push({
        bestellung_id:           b.id,
        bestellnummer:           b.bestellnummer ?? null,
        partner_id:              b.partner_id ?? null,
        partner_name:            b.partner?.name ?? 'Unbekannt',
        status:                  b.status,
        liefertermin:            b.liefertermin_geplant ?? null,
        liefertermin_bestaetigt: !!b.liefertermin_bestaetigt,
        produkt_name:            rp?.produkte?.name ?? 'Unbekannt',
        menge:                   pos.menge,
        einheit:                 rp?.produkte?.einheit ?? 'Stk',
        raum_name:               raum?.name ?? null,
        projekt_id:              raum?.projekt_id ?? null,
        projekt_name:            raum?.projekte?.name ?? null,
      })
    }
  }
  return out
}

// ── Anlegen ───────────────────────────────────────────────────

export async function bestellungAnlegen(input: {
  partnerId: string
  projektId?: string | null
  positionen: Array<{ raumProduktId: string; menge: number; einzelpreisNetto: number; notiz?: string | null }>
  liefertermin?: string | null
  notizen?: string | null
}): Promise<{ id?: string; bestellnummer?: string; fehler?: string }> {
  if (input.positionen.length === 0) return { fehler: 'Mindestens eine Position erforderlich.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()

  // Bestellnummer generieren
  const { data: nr } = await supabase.rpc('naechste_bestellnummer', { org_id: orgId })
  const bestellnummer = (typeof nr === 'string' ? nr : null) ?? `BS-${new Date().getFullYear()}-001`

  const gesamtpreis = input.positionen.reduce(
    (s, p) => s + (Number(p.einzelpreisNetto) || 0) * (Number(p.menge) || 0),
    0,
  )

  const { data: bestellung, error } = await supabase
    .from('lieferanten_bestellungen')
    .insert({
      organisation_id:      orgId,
      partner_id:           input.partnerId,
      projekt_id:           input.projektId ?? null,
      bestellnummer,
      status:               'entwurf' as LieferantenBestellungStatus,
      liefertermin_geplant: input.liefertermin ?? null,
      gesamtpreis_netto:    Math.round(gesamtpreis * 100) / 100,
      notizen:              input.notizen?.trim() || null,
      erstellt_von:         user?.id ?? null,
    })
    .select('id, bestellnummer')
    .single()
  if (error || !bestellung) return { fehler: 'Bestellung konnte nicht angelegt werden.' }

  // Positionen anlegen
  const positionenRows = input.positionen.map((p, i) => ({
    organisation_id:    orgId,
    bestellung_id:      bestellung.id,
    raum_produkt_id:    p.raumProduktId,
    menge:              p.menge,
    einzelpreis_netto:  p.einzelpreisNetto,
    notiz:              p.notiz?.trim() || null,
    reihenfolge:        i,
  }))
  const { error: posErr } = await supabase
    .from('lieferanten_bestellung_positionen')
    .insert(positionenRows)
  if (posErr) {
    // Cleanup: Bestellung loeschen wenn Positionen scheitern (org-scoped, defense-in-depth)
    await supabase.from('lieferanten_bestellungen').delete().eq('id', bestellung.id).eq('organisation_id', orgId)
    return { fehler: 'Positionen konnten nicht angelegt werden.' }
  }

  await auditLog({
    aktion:        'bestellung_angelegt' as string,
    entitaet_typ:  'bestellung' as string,
    entitaet_id:   bestellung.id,
    entitaet_name: bestellung.bestellnummer ?? null,
    details:       { positionen: input.positionen.length, partner_id: input.partnerId },
  })

  revalidatePath('/dashboard/bestellungen')
  return { id: bestellung.id, bestellnummer: bestellung.bestellnummer ?? undefined }
}

// ── Aktualisieren ─────────────────────────────────────────────

export async function bestellungAktualisieren(input: {
  id: string
  bestellnummer?: string | null
  bestellt_am?: string | null
  bestaetigt_am?: string | null
  versandt_am?: string | null
  geliefert_am?: string | null
  liefertermin_geplant?: string | null
  liefertermin_bestaetigt?: boolean
  lieferschein_nr?: string | null
  tracking_url?: string | null
  bestellbestaetigung_url?: string | null
  versandkosten?: number | null
  notizen?: string | null
}): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const update: Record<string, unknown> = {}
  for (const k of [
    'bestellnummer', 'bestellt_am', 'bestaetigt_am', 'versandt_am', 'geliefert_am',
    'liefertermin_geplant', 'liefertermin_bestaetigt', 'lieferschein_nr', 'tracking_url',
    'bestellbestaetigung_url', 'versandkosten', 'notizen',
  ] as const) {
    if (k in input && input[k] !== undefined) update[k] = input[k]
  }

  const { error } = await supabase
    .from('lieferanten_bestellungen')
    .update(update)
    .eq('id', input.id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Aktualisierung fehlgeschlagen.' }

  await auditLog({
    aktion:        'bestellung_aktualisiert' as string,
    entitaet_typ:  'bestellung' as string,
    entitaet_id:   input.id,
  })
  revalidatePath('/dashboard/bestellungen')
  revalidatePath(`/dashboard/bestellungen/${input.id}`)
  return { erfolg: true }
}

// ── Status-Transitions ────────────────────────────────────────

/** Bestellung als bestaetigt markieren — synct raum_produkte auf bestellt. */
export async function bestellungBestaetigen(id: string): Promise<{ erfolg?: boolean; fehler?: string }> {
  return statusUebergang(id, 'bestaetigt', 'bestellt')
}

/**
 * Admin löst eine Bestellung aus (= bestätigt sie). Zwei Modi:
 *  - { bestellungId }                 → bestätigt einen bestehenden Entwurf
 *  - { partnerId, positionen, … }     → legt aus der Teilmenge an UND bestätigt sofort
 * Reine Orchestrierung über die bestehenden Actions (statusUebergang unverändert).
 * Die Kunden-Glückwunsch-Benachrichtigung wird in Phase B hier eingehängt.
 */
export async function bestellungAusloesen(
  input:
    | { bestellungId: string }
    | {
        partnerId: string
        projektId?: string | null
        positionen: Array<{ raumProduktId: string; menge: number; einzelpreisNetto: number; notiz?: string | null }>
        liefertermin?: string | null
        notizen?: string | null
      },
): Promise<{ id?: string; bestellnummer?: string; fehler?: string }> {
  let bestellungId: string
  let bestellnummer: string | undefined

  if ('bestellungId' in input) {
    bestellungId = input.bestellungId
  } else {
    const angelegt = await bestellungAnlegen(input)
    if (angelegt.fehler || !angelegt.id) return { fehler: angelegt.fehler ?? 'Anlegen fehlgeschlagen.' }
    bestellungId = angelegt.id
    bestellnummer = angelegt.bestellnummer
  }

  const best = await bestellungBestaetigen(bestellungId)
  if (best.fehler) return { fehler: best.fehler, id: bestellungId, bestellnummer }

  // Kunden-Glückwunsch je betroffenem Projekt (fail-safe). Projekte aus den
  // Positionen ableiten (Sammelbestellung kann mehrere Projekte umfassen).
  try {
    const supabase = await createClient()
    const { data: pos } = await supabase
      .from('lieferanten_bestellung_positionen')
      .select('raum_produkte(raeume(projekt_id))')
      .eq('bestellung_id', bestellungId)
    const projektIds = new Set<string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of (pos ?? []) as any[]) {
      const pid = p.raum_produkte?.raeume?.projekt_id
      if (pid) projektIds.add(pid)
    }
    const { kundeBestellungBenachrichtigen } = await import('./bestellungen-kunde')
    for (const pid of Array.from(projektIds)) {
      await kundeBestellungBenachrichtigen(pid, { bestellungId })
    }
  } catch {
    /* Benachrichtigung darf die Bestellung nie scheitern lassen */
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/bestellungen')
  return { id: bestellungId, bestellnummer }
}

/** Bestellung als versandt markieren. */
export async function bestellungVersandt(
  id: string,
  versandtAm?: string,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('lieferanten_bestellungen')
    .update({ status: 'versandt' as LieferantenBestellungStatus, versandt_am: versandtAm ?? new Date().toISOString().split('T')[0] })
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Aktualisierung fehlgeschlagen.' }

  await auditLog({
    aktion:        'bestellung_versandt' as string,
    entitaet_typ:  'bestellung' as string,
    entitaet_id:   id,
  })
  revalidatePath('/dashboard/bestellungen')
  revalidatePath(`/dashboard/bestellungen/${id}`)
  await benachrichtigeLieferung(id, 'versandt')
  return { erfolg: true }
}

/** Bestellung als geliefert markieren — synct alle Positionen auf 'geliefert'. */
export async function bestellungGeliefert(id: string): Promise<{ erfolg?: boolean; fehler?: string }> {
  const res = await statusUebergang(id, 'geliefert', 'geliefert')
  if (!res.fehler) await benachrichtigeLieferung(id, 'geliefert')
  return res
}

/** Projekt-IDs aus den Positionen einer Bestellung ableiten (Sammelbestellung-fähig). */
async function projektIdsAusBestellung(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  bestellungId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('lieferanten_bestellung_positionen')
    .select('raum_produkte(raeume(projekt_id))')
    .eq('bestellung_id', bestellungId)
  const set = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (data ?? []) as any[]) {
    const pid = p.raum_produkte?.raeume?.projekt_id
    if (pid) set.add(pid)
  }
  return Array.from(set)
}

/** Fail-safe Kunden-Liefer-Benachrichtigung je betroffenem Projekt (nie throw). */
async function benachrichtigeLieferung(
  bestellungId: string,
  milestone: 'versandt' | 'geliefert',
): Promise<void> {
  try {
    const supabase = await createClient()
    const pids = await projektIdsAusBestellung(supabase, bestellungId)
    const { kundeLieferungBenachrichtigen } = await import('./lieferung-kunde')
    for (const pid of pids) await kundeLieferungBenachrichtigen(pid, milestone)
  } catch { /* Benachrichtigung darf die Statusänderung nie scheitern lassen */ }
}

/**
 * Wareneingang einer einzelnen Position (auch Teilmenge) — Migration 131.
 * Synct das raum_produkt auf 'geliefert' (voll) bzw. 'teilgeliefert' (Teilmenge).
 * Sind danach ALLE Positionen voll erhalten, wird die Bestellung automatisch auf
 * 'geliefert' gesetzt (inkl. Kunden-Benachrichtigung). `statusUebergang` bleibt
 * unangetastet — dies ist ein eigener Pro-Positions-Pfad.
 */
export async function positionEmpfangen(
  positionId: string,
  mengeErhalten?: number,
): Promise<{ erfolg?: boolean; fehler?: string; bestellungKomplett?: boolean }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: pos } = await supabase
    .from('lieferanten_bestellung_positionen')
    .select('id, menge, raum_produkt_id, bestellung_id')
    .eq('id', positionId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!pos) return { fehler: 'Position nicht gefunden.' }

  const menge    = Number(pos.menge) || 0
  const erhalten = mengeErhalten == null ? menge : Math.max(0, Math.min(Number(mengeErhalten) || 0, menge))
  const voll     = menge > 0 && erhalten >= menge
  const heute    = new Date().toISOString().split('T')[0]

  const { error: pErr } = await supabase
    .from('lieferanten_bestellung_positionen')
    .update({ menge_erhalten: erhalten, empfangen_am: new Date().toISOString() })
    .eq('id', positionId)
    .eq('organisation_id', orgId)
  if (pErr) return { fehler: 'Wareneingang konnte nicht gespeichert werden.' }

  const rpUpdate: Record<string, unknown> = {
    bestellstatus: (voll ? 'geliefert' : 'teilgeliefert') as BestellStatus,
  }
  if (voll) rpUpdate.lieferung_erhalten_am = heute
  await supabase
    .from('raum_produkte')
    .update(rpUpdate)
    .eq('id', pos.raum_produkt_id)
    .eq('organisation_id', orgId)

  // Alle Positionen voll erhalten? → ganze Bestellung auf geliefert.
  let komplett = false
  const { data: alle } = await supabase
    .from('lieferanten_bestellung_positionen')
    .select('menge, menge_erhalten')
    .eq('bestellung_id', pos.bestellung_id)
    .eq('organisation_id', orgId)
  const alleVoll = (alle ?? []).length > 0 && (alle ?? []).every(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => (Number(p.menge_erhalten) || 0) >= (Number(p.menge) || 0),
  )
  if (alleVoll) {
    const res = await bestellungGeliefert(pos.bestellung_id)
    komplett = !res.fehler
  }

  await auditLog({
    aktion:       'bestellung_aktualisiert' as string,
    entitaet_typ: 'bestellung' as string,
    entitaet_id:  pos.bestellung_id,
    details:      { wareneingang_position: positionId, menge_erhalten: erhalten },
  })
  revalidatePath('/dashboard/bestellungen')
  revalidatePath(`/dashboard/bestellungen/${pos.bestellung_id}`)
  return { erfolg: true, bestellungKomplett: komplett }
}

/** Wareneingang einer Position zurücksetzen (raum_produkt zurück auf 'bestellt'). */
export async function positionEmpfangZuruecksetzen(
  positionId: string,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: pos } = await supabase
    .from('lieferanten_bestellung_positionen')
    .select('raum_produkt_id, bestellung_id')
    .eq('id', positionId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!pos) return { fehler: 'Position nicht gefunden.' }

  await supabase
    .from('lieferanten_bestellung_positionen')
    .update({ menge_erhalten: null, empfangen_am: null })
    .eq('id', positionId)
    .eq('organisation_id', orgId)
  await supabase
    .from('raum_produkte')
    .update({ bestellstatus: 'bestellt' as BestellStatus, lieferung_erhalten_am: null })
    .eq('id', pos.raum_produkt_id)
    .eq('organisation_id', orgId)

  revalidatePath(`/dashboard/bestellungen/${pos.bestellung_id}`)
  return { erfolg: true }
}

/** Bestellung stornieren — synct alle Positionen auf 'storniert'. */
export async function bestellungStornieren(id: string): Promise<{ erfolg?: boolean; fehler?: string }> {
  return statusUebergang(id, 'storniert', 'storniert')
}

async function statusUebergang(
  id: string,
  bestellStatus: LieferantenBestellungStatus,
  raumProduktStatus: BestellStatus,
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const heute = new Date().toISOString().split('T')[0]

  const datumFeld: Record<LieferantenBestellungStatus, string | null> = {
    entwurf:    null,
    bestaetigt: 'bestaetigt_am',
    versandt:   'versandt_am',
    geliefert:  'geliefert_am',
    storniert:  null,
    teilretour: null,
  }

  const update: Record<string, unknown> = { status: bestellStatus }
  const dF = datumFeld[bestellStatus]
  if (dF) update[dF] = heute

  const { error } = await supabase
    .from('lieferanten_bestellungen')
    .update(update)
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Aktualisierung fehlgeschlagen.' }

  // Alle raum_produkte der Positionen auf neuen Status setzen
  const { data: positionen } = await supabase
    .from('lieferanten_bestellung_positionen')
    .select('raum_produkt_id')
    .eq('bestellung_id', id)
  if (positionen && positionen.length > 0) {
    const ids = positionen.map((p) => p.raum_produkt_id)
    const rpUpdate: Record<string, unknown> = { bestellstatus: raumProduktStatus }
    if (raumProduktStatus === 'bestellt')   rpUpdate.bestellt_am           = heute
    if (raumProduktStatus === 'geliefert')  rpUpdate.lieferung_erhalten_am = heute
    if (raumProduktStatus === 'storniert')  rpUpdate.storniert_am          = new Date().toISOString()
    await supabase
      .from('raum_produkte')
      .update(rpUpdate)
      .in('id', ids)
      .eq('organisation_id', orgId)
  }

  await auditLog({
    aktion:        bestellStatus === 'storniert' ? ('bestellung_storniert' as string)
                 : bestellStatus === 'geliefert' ? ('bestellung_geliefert' as string)
                 : ('bestellung_aktualisiert' as string),
    entitaet_typ:  'bestellung' as string,
    entitaet_id:   id,
    details:       { neuer_status: bestellStatus },
  })

  // Auto-Sync: Aufgabe „Lieferung empfangen" bei Bestaetigung/Versand,
  // erledigt bei geliefert, loeschen bei storniert
  try {
    if (bestellStatus === 'storniert') {
      await syncAufgabeAusQuelle('bestellung', id, null, { loeschen: true })
    } else if (bestellStatus === 'geliefert') {
      await supabase
        .from('aufgaben')
        .update({ status: 'erledigt', erledigt_am: new Date().toISOString() })
        .eq('organisation_id', orgId)
        .eq('quelle', 'bestellung')
        .eq('quelle_id', id)
    } else if (bestellStatus === 'bestaetigt' || bestellStatus === 'versandt') {
      // Bestellung-Daten + Partner laden fuer Titel
      const { data: bestellung } = await supabase
        .from('lieferanten_bestellungen')
        .select('bestellnummer, liefertermin_geplant, projekt_id, partner:partner_id(name), projekte:projekt_id(kunde_id)')
        .eq('id', id)
        .maybeSingle()
      if (bestellung) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const partnerName = (bestellung.partner as any)?.name as string | undefined
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kundeId     = (bestellung.projekte as any)?.kunde_id as string | null | undefined
        const titel = bestellung.bestellnummer
          ? `Lieferung empfangen: ${bestellung.bestellnummer}${partnerName ? ' (' + partnerName + ')' : ''}`
          : `Lieferung empfangen${partnerName ? ' von ' + partnerName : ''}`
        await syncAufgabeAusQuelle('bestellung', id, {
          titel,
          status:             'in_arbeit',
          prioritaet:         'normal',
          faellig_am:         (bestellung.liefertermin_geplant as string | null) ?? null,
          projekt_id:         (bestellung.projekt_id as string | null) ?? null,
          kunde_id:           kundeId ?? null,
          bestellung_id:      id,
          sichtbar_fuer_kunde: false,
        })
      }
    }
  } catch (e) { console.error('[syncAufgabe:bestellung]', e) }

  revalidatePath('/dashboard/bestellungen')
  revalidatePath(`/dashboard/bestellungen/${id}`)
  return { erfolg: true }
}

export async function bestellungLoeschen(id: string): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('lieferanten_bestellungen')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Löschen fehlgeschlagen.' }

  await auditLog({
    aktion:        'bestellung_geloescht' as string,
    entitaet_typ:  'bestellung' as string,
    entitaet_id:   id,
  })
  // Auto-Sync: zugehoerige Aufgabe entfernen
  await syncAufgabeAusQuelle('bestellung', id, null, { loeschen: true })

  revalidatePath('/dashboard/bestellungen')
  return { erfolg: true }
}

// ── Position hinzufuegen / entfernen ──────────────────────────

export async function positionHinzufuegen(input: {
  bestellungId: string
  raumProduktId: string
  menge: number
  einzelpreisNetto: number
  notiz?: string | null
}): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase.from('lieferanten_bestellung_positionen').insert({
    organisation_id:   orgId,
    bestellung_id:     input.bestellungId,
    raum_produkt_id:   input.raumProduktId,
    menge:             input.menge,
    einzelpreis_netto: input.einzelpreisNetto,
    notiz:             input.notiz?.trim() || null,
    reihenfolge:       0,
  })
  if (error) return { fehler: error.message.includes('duplicate') ? 'Produkt bereits in dieser Bestellung.' : 'Konnte nicht hinzufügen.' }
  await rekalkuliereBestellsumme(input.bestellungId, orgId)
  revalidatePath(`/dashboard/bestellungen/${input.bestellungId}`)
  return { erfolg: true }
}

export async function positionEntfernen(positionId: string): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: pos } = await supabase
    .from('lieferanten_bestellung_positionen')
    .select('bestellung_id')
    .eq('id', positionId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!pos) return { fehler: 'Position nicht gefunden.' }
  const { error } = await supabase
    .from('lieferanten_bestellung_positionen')
    .delete()
    .eq('id', positionId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Löschen fehlgeschlagen.' }
  await rekalkuliereBestellsumme(pos.bestellung_id, orgId)
  revalidatePath(`/dashboard/bestellungen/${pos.bestellung_id}`)
  return { erfolg: true }
}

async function rekalkuliereBestellsumme(bestellungId: string, orgId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('lieferanten_bestellung_positionen')
    .select('menge, einzelpreis_netto')
    .eq('bestellung_id', bestellungId)
    .eq('organisation_id', orgId)
  const summe = (data ?? []).reduce(
    (s, p) => s + (Number(p.menge) || 0) * (Number(p.einzelpreis_netto) || 0),
    0,
  )
  await supabase
    .from('lieferanten_bestellungen')
    .update({ gesamtpreis_netto: Math.round(summe * 100) / 100 })
    .eq('id', bestellungId)
    .eq('organisation_id', orgId)
}

// ── Bestellbestaetigung-PDF Upload ────────────────────────────

export async function bestellungDokumentHochladen(
  bestellungId: string,
  formData: FormData,
): Promise<{ url?: string; fehler?: string }> {
  const file = formData.get('datei') as File | null
  if (!file) return { fehler: 'Keine Datei übermittelt.' }
  if (file.size > 25 * 1024 * 1024) return { fehler: 'Datei zu groß (max. 25 MB).' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const admin = createAdminClient()

  const ext  = (file.name.split('.').pop() || 'pdf').toLowerCase()
  const name = `${orgId}/${bestellungId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadErr } = await admin.storage
    .from('bestellung-dokumente')
    .upload(name, file, { contentType: file.type, upsert: false })
  if (uploadErr) return { fehler: 'Fehler beim Upload.' }

  const { data: signed } = await admin.storage
    .from('bestellung-dokumente')
    .createSignedUrl(name, 60 * 60 * 24 * 365)
  if (!signed?.signedUrl) return { fehler: 'Signed URL konnte nicht erstellt werden.' }

  // Auf Bestellung speichern
  await supabase
    .from('lieferanten_bestellungen')
    .update({ bestellbestaetigung_url: signed.signedUrl })
    .eq('id', bestellungId)
    .eq('organisation_id', orgId)

  void supabase
  return { url: signed.signedUrl }
}

// ── Sammelbestellungs-Vorschlag ───────────────────────────────

/** Findet offene Bestellungen (entwurf/bestaetigt) bei einem Partner —
 *  fuer "zu existierender Bestellung hinzufuegen"-Vorschlag. */
export async function offeneBestellungenBeiPartner(partnerId: string): Promise<BestellungMitPartner[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('lieferanten_bestellungen')
    .select('*, partner(name), lieferanten_bestellung_positionen(id)')
    .eq('partner_id', partnerId)
    .in('status', ['entwurf', 'bestaetigt'])
    .order('created_at', { ascending: false })

  type Row = LieferantenBestellung & {
    partner: { name: string } | null
    lieferanten_bestellung_positionen: { id: string }[] | null
  }
  return ((data ?? []) as Row[]).map((b) => ({
    ...b,
    partner_name:    b.partner?.name ?? '',
    positionen_count: b.lieferanten_bestellung_positionen?.length ?? 0,
  }))
}
