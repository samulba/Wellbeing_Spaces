'use server'

/**
 * Unified Action-Layer für das Freigabe-System.
 *
 * Ersetzt:
 *   - src/app/actions/freigabe.ts         (Token-Flow, schrieb in produktstatus)
 *   - src/app/actions/freigabe-token.ts   (Token-Lifecycle)
 *   - src/app/actions/portal.ts (Teile)   (portalProduktFreigeben, portalAlleFreigeben)
 *
 * Prinzipien:
 *   - Single Source of Truth: raum_produkte.freigabe_status
 *   - Jede Statusänderung wird in freigabe_audit protokolliert
 *   - Scope: projekt | raum | auswahl (Migration 078)
 *   - Pflicht-Abschluss mit Mail + Timeline + Audit
 *
 * Zugriffs-Muster:
 *   - Admin-Actions:   createClient() + getOrganisationId()  (RLS greift)
 *   - Portal-Actions:  createAdminClient() + portal-session (RLS bypass)
 *   - Token-Actions:   createAdminClient() + token-lookup   (anonym, via token)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendMail } from '@/lib/mail'
import { freigabeAbgeschlossenMail, freigabeLinkMail } from '@/lib/mail-templates'
import { syncAutoEvent } from './timeline'
import type {
  FreigabeAudit,
  FreigabeKanal,
  FreigabeScopeTyp,
  FreigabeStatus,
  FreigabeToken,
} from '@/lib/supabase/types'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TokenFuerKundeDaten {
  token: FreigabeToken
  projektName: string
  projektId: string
  firmenname: string | null
  primaryColor: string | null
  kundeId: string
  items: RaumProduktMitScopeKontext[]
  scopeBeschreibung: string
}

export interface RaumProduktMitScopeKontext {
  raum_produkt_id: string
  produkt_id: string
  raum_id: string
  raum_name: string
  name: string
  beschreibung: string | null
  bild_url: string | null
  menge: number
  einheit: string | null
  verkaufspreis: number | null
  freigabe_status: FreigabeStatus
  freigabe_kommentar: string | null
  reihenfolge: number
}

export interface FreigabeStatusSetzenInput {
  raumProduktId: string
  status: FreigabeStatus
  kommentar?: string | null
  kanal: FreigabeKanal
  kontext: {
    tokenId?: string | null
    geaendertVon: string
  }
}

// ═══════════════════════════════════════════════════════════════
// TOKEN-LIFECYCLE (Admin)
// ═══════════════════════════════════════════════════════════════

/**
 * Erstellt einen neuen Freigabe-Token.
 * scope_typ=projekt:   scopeIds muss [] sein (implizit ganzes Projekt)
 * scope_typ=raum:      scopeIds = [raum_id]
 * scope_typ=auswahl:   scopeIds = [raum_produkte.id, ...]
 *
 * Gibt { token } zurück oder { fehler } wenn bereits ein offener
 * Projekt-Token existiert (Duplikat-Schutz via Partial-Unique-Index).
 */
export async function freigabeTokenErstellen(
  projektId: string,
  scopeTyp: FreigabeScopeTyp = 'projekt',
  scopeIds: string[] = [],
): Promise<{ token: string } | { fehler: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Scope-Validierung
  if (scopeTyp === 'projekt' && scopeIds.length > 0) {
    return { fehler: 'Projekt-Scope darf keine scopeIds haben.' }
  }
  if (scopeTyp === 'raum' && scopeIds.length !== 1) {
    return { fehler: 'Raum-Scope braucht genau eine Raum-ID.' }
  }
  if (scopeTyp === 'auswahl' && scopeIds.length === 0) {
    return { fehler: 'Auswahl-Scope braucht mindestens ein Raum-Produkt.' }
  }

  const { data, error } = await supabase
    .from('freigabe_tokens')
    .insert({
      projekt_id: projektId,
      organisation_id: orgId,
      scope_typ: scopeTyp,
      scope_ids: scopeIds,
    })
    .select('token')
    .single()

  if (error || !data) {
    // Partial-Unique-Index greift bei zweitem offenen Projekt-Token
    if (error?.code === '23505') {
      return { fehler: 'Für dieses Projekt gibt es bereits einen offenen Freigabe-Link. Bitte bestehenden verwenden oder zuerst zurückziehen.' }
    }
    return { fehler: 'Token konnte nicht erstellt werden.' }
  }

  revalidatePath(`/dashboard/projekte/${projektId}`)
  return { token: data.token }
}

/**
 * Zieht einen Token zurück (Soft-Delete via deleted_at).
 * Kunde kann den Link ab sofort nicht mehr öffnen.
 */
export async function freigabeTokenZurueckziehen(
  tokenId: string,
  projektId: string,
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('freigabe_tokens')
    .update({ deleted_at: new Date().toISOString(), aktiv: false })
    .eq('id', tokenId)
    .eq('organisation_id', orgId)

  revalidatePath(`/dashboard/projekte/${projektId}`)
}

/**
 * Listet alle Tokens eines Projekts (aktive + abgeschlossene + zurückgezogene).
 * Sortiert: offene zuerst, dann nach created_at DESC.
 */
export async function freigabeTokensAbrufenFuerProjekt(
  projektId: string,
): Promise<FreigabeToken[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('freigabe_tokens')
    .select('*')
    .eq('projekt_id', projektId)
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })
  return (data ?? []) as FreigabeToken[]
}

/**
 * Sendet Freigabe-Link-Mail an den Kunden des Projekts (verwendet
 * bestehenden aktiven Token).
 */
export async function freigabeMailVersenden(
  projektId: string,
): Promise<{ mailGesendet: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: token } = await supabase
    .from('freigabe_tokens')
    .select('token, gueltig_bis')
    .eq('projekt_id', projektId)
    .eq('organisation_id', orgId)
    .eq('aktiv', true)
    .is('deleted_at', null)
    .is('abgeschlossen_am', null)
    .maybeSingle()

  if (!token) return { mailGesendet: false, fehler: 'Kein aktiver Freigabe-Link vorhanden.' }

  const { data: projekt } = await supabase
    .from('projekte')
    .select('name, kunden(name, email)')
    .eq('id', projektId)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)
    .maybeSingle()

  const kundeRaw = projekt?.kunden as unknown as { name: string; email: string | null } | null
  if (!kundeRaw?.email) return { mailGesendet: false, fehler: 'Kunde hat keine E-Mail-Adresse.' }

  const { data: branding } = await supabase
    .from('branding')
    .select('firmenname, primary_color')
    .maybeSingle()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const tpl = freigabeLinkMail({
    empfaengerName: kundeRaw.name,
    projektName:    projekt?.name ?? 'Ihr Projekt',
    linkUrl:        `${baseUrl}/freigabe/${token.token}`,
    gueltigBis:     token.gueltig_bis ?? null,
    branding:       branding ?? undefined,
  })

  const res = await sendMail({ to: kundeRaw.email, subject: tpl.subject, html: tpl.html })
  return { mailGesendet: res.sent }
}

// ═══════════════════════════════════════════════════════════════
// SCOPE-OPTIONEN (für Admin-UI Scope-Picker)
// ═══════════════════════════════════════════════════════════════

export interface ScopeOptionenRaum {
  id: string
  name: string
  items: { id: string; name: string; menge: number; einheit: string | null }[]
}

/**
 * Lädt alle Räume + deren raum_produkte für ein Projekt. Wird im
 * FreigabeLinkKarte-Scope-Picker verwendet um dem Admin die Auswahl
 * (Einzelner Raum / Kuratierte Auswahl) zu ermöglichen.
 */
export async function freigabeScopeOptionenLaden(
  projektId: string,
): Promise<ScopeOptionenRaum[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: raeume } = await supabase
    .from('raeume')
    .select('id, name, reihenfolge')
    .eq('projekt_id', projektId)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('name')

  if (!raeume || raeume.length === 0) return []

  const { data: rps } = await supabase
    .from('raum_produkte')
    .select('id, raum_id, menge, produkte(name, einheit)')
    .in('raum_id', raeume.map((r) => r.id))
    .order('reihenfolge')

  type RpRow = {
    id: string
    raum_id: string
    menge: number
    produkte: { name: string; einheit: string | null } | null
  }

  const rpsByRaum: Record<string, ScopeOptionenRaum['items']> = {}
  for (const rp of ((rps ?? []) as unknown as RpRow[])) {
    if (!rp.produkte) continue
    if (!rpsByRaum[rp.raum_id]) rpsByRaum[rp.raum_id] = []
    rpsByRaum[rp.raum_id].push({
      id:      rp.id,
      name:    rp.produkte.name,
      menge:   rp.menge,
      einheit: rp.produkte.einheit,
    })
  }

  return raeume.map((r) => ({
    id:    r.id,
    name:  r.name,
    items: rpsByRaum[r.id] ?? [],
  }))
}


// ═══════════════════════════════════════════════════════════════
// TOKEN-ABRUF (öffentlich, für /freigabe/[token])
// ═══════════════════════════════════════════════════════════════

/**
 * Lädt alles was eine Freigabe-Seite braucht: Token, Projekt,
 * gefilterte Raum-Produkte nach scope_typ, Branding.
 *
 * Kein Auth — arbeitet mit Admin-Client, weil Kunde anonym ist.
 * Sicherheit via Token-Gültigkeit + scope_ids-Filter.
 */
export async function freigabeTokenAbrufen(
  token: string,
): Promise<TokenFuerKundeDaten | { fehler: string }> {
  const supabase = createAdminClient()

  const { data: tok } = await supabase
    .from('freigabe_tokens')
    .select('*')
    .eq('token', token)
    .eq('aktiv', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!tok) return { fehler: 'Ungültiger oder zurückgezogener Freigabe-Link.' }
  if (tok.gueltig_bis && new Date(tok.gueltig_bis) < new Date()) {
    return { fehler: 'Dieser Freigabe-Link ist abgelaufen.' }
  }

  // Projekt + Kunde
  const { data: projekt } = await supabase
    .from('projekte')
    .select('id, name, kunde_id')
    .eq('id', tok.projekt_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!projekt) return { fehler: 'Projekt nicht gefunden.' }

  // Branding
  const { data: branding } = await supabase
    .from('branding')
    .select('firmenname, primary_color')
    .eq('organisation_id', tok.organisation_id)
    .maybeSingle()

  // Raum-Produkte nach Scope filtern
  const items = await ladeItemsFuerScope(supabase, {
    projektId: projekt.id,
    scopeTyp:  tok.scope_typ,
    scopeIds:  tok.scope_ids ?? [],
  })

  const scopeBeschreibung = await buildScopeBeschreibung(supabase, tok.scope_typ, tok.scope_ids ?? [], items)

  return {
    token:            tok as FreigabeToken,
    projektName:      projekt.name,
    projektId:        projekt.id,
    firmenname:       branding?.firmenname ?? null,
    primaryColor:     branding?.primary_color ?? null,
    kundeId:          projekt.kunde_id,
    items,
    scopeBeschreibung,
  }
}

type AdminClient = ReturnType<typeof createAdminClient>

async function ladeItemsFuerScope(
  supabase: AdminClient,
  opts: { projektId: string; scopeTyp: FreigabeScopeTyp; scopeIds: string[] },
): Promise<RaumProduktMitScopeKontext[]> {
  // Erst alle Räume des Projekts holen (brauchen wir für Raum-Namen)
  const { data: raeume } = await supabase
    .from('raeume')
    .select('id, name')
    .eq('projekt_id', opts.projektId)
    .is('deleted_at', null)

  const raumIds = (raeume ?? []).map((r) => r.id)
  if (raumIds.length === 0) return []

  let query = supabase
    .from('raum_produkte')
    .select(`
      id, raum_id, produkt_id, menge, reihenfolge,
      freigabe_status, freigabe_kommentar,
      verkaufspreis_override,
      produkte(name, beschreibung, bild_url, einheit, verkaufspreis)
    `)
    .in('raum_id', raumIds)
    .order('reihenfolge')

  if (opts.scopeTyp === 'raum' && opts.scopeIds[0]) {
    query = query.eq('raum_id', opts.scopeIds[0])
  }
  if (opts.scopeTyp === 'auswahl' && opts.scopeIds.length > 0) {
    query = query.in('id', opts.scopeIds)
  }

  const { data: rpRows } = await query

  const raumMap = Object.fromEntries((raeume ?? []).map((r) => [r.id, r.name]))

  type RpRow = {
    id: string
    raum_id: string
    produkt_id: string
    menge: number
    reihenfolge: number
    freigabe_status: FreigabeStatus
    freigabe_kommentar: string | null
    verkaufspreis_override: number | null
    produkte: {
      name: string
      beschreibung: string | null
      bild_url: string | null
      einheit: string | null
      verkaufspreis: number | null
    } | null
  }

  return ((rpRows ?? []) as unknown as RpRow[]).map((rp) => ({
    raum_produkt_id: rp.id,
    produkt_id:      rp.produkt_id,
    raum_id:         rp.raum_id,
    raum_name:       raumMap[rp.raum_id] ?? '',
    name:            rp.produkte?.name ?? '',
    beschreibung:    rp.produkte?.beschreibung ?? null,
    bild_url:        rp.produkte?.bild_url ?? null,
    menge:           rp.menge,
    einheit:         rp.produkte?.einheit ?? null,
    verkaufspreis:   rp.verkaufspreis_override ?? rp.produkte?.verkaufspreis ?? null,
    freigabe_status: rp.freigabe_status,
    freigabe_kommentar: rp.freigabe_kommentar,
    reihenfolge:     rp.reihenfolge,
  }))
}

async function buildScopeBeschreibung(
  supabase: AdminClient,
  scopeTyp: FreigabeScopeTyp,
  scopeIds: string[],
  items: RaumProduktMitScopeKontext[],
): Promise<string> {
  if (scopeTyp === 'projekt') return 'Gesamtes Projekt'
  if (scopeTyp === 'raum') {
    const { data: raum } = await supabase
      .from('raeume')
      .select('name')
      .eq('id', scopeIds[0] ?? '')
      .maybeSingle()
    return raum?.name ? `Raum „${raum.name}"` : 'Einzelner Raum'
  }
  return `${items.length} ausgewählte Produkte`
}

// ═══════════════════════════════════════════════════════════════
// STATUS-ÄNDERUNG (universell)
// ═══════════════════════════════════════════════════════════════

/**
 * Setzt freigabe_status auf einem Raum-Produkt und schreibt einen
 * Audit-Eintrag. Wird von Portal, Token und Admin-UI gleichermaßen
 * aufgerufen — kanal unterscheidet den Ursprung.
 *
 * Nutzt immer Admin-Client (auch bei admin-kanal), weil Portal-
 * und Token-Pfade sonst an RLS scheitern und wir so einheitliches
 * Verhalten haben.
 */
export async function freigabeStatusSetzen(
  input: FreigabeStatusSetzenInput,
): Promise<{ erfolg: true } | { fehler: string }> {
  const supabase = createAdminClient()

  // Alten Status lesen für Audit
  const { data: vorher } = await supabase
    .from('raum_produkte')
    .select('id, organisation_id, freigabe_status')
    .eq('id', input.raumProduktId)
    .maybeSingle()

  if (!vorher) return { fehler: 'Raum-Produkt nicht gefunden.' }

  const patch: Record<string, unknown> = {
    freigabe_status:    input.status,
    freigabe_kommentar: input.kommentar?.trim() || null,
  }
  if (input.status === 'freigegeben') {
    patch.freigegeben_am = new Date().toISOString()
  } else if (input.status === 'ausstehend') {
    patch.freigegeben_am = null
  }

  const { error } = await supabase
    .from('raum_produkte')
    .update(patch)
    .eq('id', input.raumProduktId)

  if (error) return { fehler: 'Status konnte nicht gespeichert werden.' }

  // Audit-Eintrag — Fehler hier dürfen Hauptflow nicht crashen
  await supabase.from('freigabe_audit').insert({
    organisation_id: vorher.organisation_id,
    token_id:        input.kontext.tokenId ?? null,
    raum_produkt_id: input.raumProduktId,
    alter_status:    vorher.freigabe_status,
    neuer_status:    input.status,
    kommentar:       input.kommentar?.trim() || null,
    geaendert_von:   input.kontext.geaendertVon,
    kanal:           input.kanal,
  })

  return { erfolg: true }
}

// ═══════════════════════════════════════════════════════════════
// PFLICHT-ABSCHLUSS
// ═══════════════════════════════════════════════════════════════

/**
 * Schließt einen Freigabe-Token ab. Validiert dass alle relevanten
 * Produkte entschieden sind (nicht mehr 'ausstehend'), setzt
 * abgeschlossen_am/_durch/_kommentar, triggert Mail an Admin und
 * legt Timeline-Event an.
 */
export async function freigabeAbschliessen(
  token: string,
  opts: { name: string; kommentar?: string | null },
): Promise<{ erfolg: true } | { fehler: string }> {
  const supabase = createAdminClient()

  if (!opts.name.trim()) return { fehler: 'Bitte deinen Namen eingeben.' }

  const { data: tok } = await supabase
    .from('freigabe_tokens')
    .select('*')
    .eq('token', token)
    .eq('aktiv', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!tok) return { fehler: 'Ungültiger oder zurückgezogener Link.' }
  if (tok.abgeschlossen_am) return { fehler: 'Diese Freigabe ist bereits abgeschlossen.' }

  // Items im Scope laden — alle müssen entschieden sein
  const items = await ladeItemsFuerScope(supabase, {
    projektId: tok.projekt_id,
    scopeTyp:  tok.scope_typ,
    scopeIds:  tok.scope_ids ?? [],
  })

  if (items.length === 0) return { fehler: 'Keine Produkte im Freigabe-Umfang.' }
  const offen = items.filter((i) => i.freigabe_status === 'ausstehend').length
  if (offen > 0) {
    return { fehler: `Noch ${offen} Produkt${offen === 1 ? '' : 'e'} offen — bitte erst alle entscheiden.` }
  }

  // Token abschließen
  const jetzt = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('freigabe_tokens')
    .update({
      abgeschlossen_am:       jetzt,
      abgeschlossen_durch:    opts.name.trim(),
      abgeschlossen_kommentar: opts.kommentar?.trim() || null,
    })
    .eq('id', tok.id)

  if (updErr) return { fehler: 'Abschluss konnte nicht gespeichert werden.' }

  // Projekt + Kunde + Branding für Mail
  const { data: projekt } = await supabase
    .from('projekte')
    .select('id, name, kunde_id, organisation_id, kunden(name, email)')
    .eq('id', tok.projekt_id)
    .maybeSingle()

  const { data: branding } = await supabase
    .from('branding')
    .select('firmenname, primary_color, email, support_email')
    .eq('organisation_id', tok.organisation_id)
    .maybeSingle()

  // Mail an Admin — Empfänger: Branding-Email > Support-Email > RESEND_FROM-Adresse
  try {
    const freigegeben = items.filter((i) => i.freigabe_status === 'freigegeben').length
    const abgelehnt   = items.filter((i) => i.freigabe_status === 'abgelehnt').length
    const scopeText   = await buildScopeBeschreibung(supabase, tok.scope_typ, tok.scope_ids ?? [], items)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const adminEmail = branding?.email
      ?? branding?.support_email
      ?? process.env.RESEND_FROM?.match(/<([^>]+)>/)?.[1]
      ?? null

    if (adminEmail) {
      const tpl = freigabeAbgeschlossenMail({
        empfaengerName:   'Team',
        kundenName:       opts.name.trim(),
        projektName:      projekt?.name ?? 'Projekt',
        scopeBeschreibung: scopeText,
        freigegebenCount: freigegeben,
        abgelehntCount:   abgelehnt,
        kommentar:        opts.kommentar?.trim() || null,
        linkUrl:          `${baseUrl}/dashboard/projekte/${tok.projekt_id}`,
        branding:         branding ?? undefined,
      })
      await sendMail({ to: adminEmail, subject: tpl.subject, html: tpl.html })
    }
  } catch (e) {
    console.error('[freigabeAbschliessen:mail]', e)
  }

  // Timeline-Event (intern, nicht kunde_sichtbar)
  try {
    await syncAutoEvent(
      'freigabe',
      tok.id,
      tok.projekt_id,
      {
        titel:        `Freigabe abgeschlossen von ${opts.name.trim()}`,
        typ:          'meilenstein',
        start_datum:  jetzt.substring(0, 10),
        status:       'abgeschlossen',
        kunde_sichtbar: false,
      },
    )
  } catch (e) {
    console.error('[freigabeAbschliessen:timeline]', e)
  }

  return { erfolg: true }
}

// ═══════════════════════════════════════════════════════════════
// AUDIT (Admin-UI)
// ═══════════════════════════════════════════════════════════════

export async function freigabeAuditFuerToken(tokenId: string): Promise<FreigabeAudit[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('freigabe_audit')
    .select('*')
    .eq('organisation_id', orgId)
    .eq('token_id', tokenId)
    .order('created_at', { ascending: false })
  return (data ?? []) as FreigabeAudit[]
}

export async function freigabeAuditFuerRaumProdukt(raumProduktId: string): Promise<FreigabeAudit[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('freigabe_audit')
    .select('*')
    .eq('organisation_id', orgId)
    .eq('raum_produkt_id', raumProduktId)
    .order('created_at', { ascending: false })
  return (data ?? []) as FreigabeAudit[]
}
