'use server'

/**
 * Erweitertes Freigabe-Action-Layer (Migration 081+082).
 *
 * Ergänzt die bestehenden Actions in freigabe.ts + freigabe-token.ts um:
 *   - Scope-Logik (Projekt/Raum/Auswahl) via freigabe_tokens.scope_typ
 *   - Pflicht-Abschluss mit Mail + Timeline-Event
 *   - Audit-Log in freigabe_audit (portal/token/admin/system)
 *   - Auto-Invalidierung bei Produkt-Änderung
 *
 * Die bestehenden Actions bleiben funktional — dieser Layer baut
 * additiv darauf auf. freigabeStatusSetzen() wird von Portal, Token-
 * Frontend und Admin-UI gleichermaßen verwendet.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendMail } from '@/lib/mail'
import { freigabeAbgeschlossenMail } from '@/lib/mail-templates'
import { syncAutoEvent } from './timeline'
import { autoProjektStatusVorwaerts } from './projekte'
import type {
  FreigabeAudit,
  FreigabeKanal,
  FreigabeScopeTyp,
  FreigabeToken,
} from '@/lib/supabase/types'

type AdminClient = ReturnType<typeof createAdminClient>

// ═══════════════════════════════════════════════════════════════
// TOKEN ERSTELLEN MIT SCOPE
// ═══════════════════════════════════════════════════════════════

export async function freigabeTokenErstellen(
  projektId: string,
  scopeTyp: FreigabeScopeTyp = 'projekt',
  scopeIds: string[] = [],
): Promise<{ token: string } | { fehler: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

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
    if (error?.code === '23505') {
      return { fehler: 'Für dieses Projekt gibt es bereits einen offenen Freigabe-Link. Bitte bestehenden verwenden oder zuerst zurückziehen.' }
    }
    // Häufige Ursache: Migration 081 wurde nicht in Supabase ausgeführt
    if (error?.code === '42703' || error?.message?.includes('scope_typ') || error?.message?.includes('scope_ids')) {
      return { fehler: 'Migration 081 scheint zu fehlen (scope_typ-Spalte). Bitte im Supabase SQL-Editor ausführen.' }
    }
    console.error('[freigabeTokenErstellen] Insert fehlgeschlagen:', error)
    return { fehler: `Token konnte nicht erstellt werden${error?.message ? ': ' + error.message : ''}` }
  }

  revalidatePath(`/dashboard/projekte/${projektId}`)

  // Auto-Status: offen/in_bearbeitung → freigegeben (Warten auf Kunde).
  // Fehler hier darf den Haupt-Flow nicht crashen.
  try { await autoProjektStatusVorwaerts(projektId, 'freigegeben') } catch {}

  return { token: data.token }
}

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

// ═══════════════════════════════════════════════════════════════
// SCOPE-OPTIONEN (für Scope-Picker in UI)
// ═══════════════════════════════════════════════════════════════

export interface ScopeOptionenRaum {
  id: string
  name: string
  items: { id: string; name: string; menge: number; einheit: string | null }[]
}

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
// STATUS SETZEN (universell: Portal / Token / Admin / System)
// ═══════════════════════════════════════════════════════════════

export interface FreigabeStatusSetzenInput {
  raumProduktId: string
  status: 'ausstehend' | 'freigegeben' | 'abgelehnt' | 'ueberarbeitung'
  kommentar?: string | null
  kanal: FreigabeKanal
  kontext: {
    tokenId?: string | null
    geaendertVon: string
  }
}

/**
 * Setzt freigabe_status auf einem raum_produkte-Eintrag und schreibt
 * einen Audit-Log. Nutzt Admin-Client damit Portal/Token-Pfade und
 * Admin-Pfade einheitlich funktionieren.
 */
export async function freigabeStatusSetzen(
  input: FreigabeStatusSetzenInput,
): Promise<{ erfolg: true } | { fehler: string }> {
  const supabase = createAdminClient()

  const { data: vorher } = await supabase
    .from('raum_produkte')
    .select('id, organisation_id, freigabe_status')
    .eq('id', input.raumProduktId)
    .maybeSingle()

  if (!vorher) return { fehler: 'Raum-Produkt nicht gefunden.' }

  const { error } = await supabase
    .from('raum_produkte')
    .update({
      freigabe_status:    input.status,
      freigabe_kommentar: input.kommentar?.trim() || null,
    })
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
// SCOPE-FILTER LADEN (für /freigabe/[token] Page)
// ═══════════════════════════════════════════════════════════════

/**
 * Ermittelt die raum_produkte-IDs, die unter den Scope eines Tokens
 * fallen. `page.tsx` kann darauf filtern bevor es Items lädt.
 */
export async function freigabeScopeFilterRaumProduktIds(
  supabase: AdminClient,
  projektId: string,
  scopeTyp: FreigabeScopeTyp,
  scopeIds: string[],
): Promise<{ raumIds?: string[]; raumProduktIds?: string[] } | null> {
  if (scopeTyp === 'projekt') return {} // kein Filter — alle Räume des Projekts

  if (scopeTyp === 'raum' && scopeIds[0]) {
    return { raumIds: [scopeIds[0]] }
  }

  if (scopeTyp === 'auswahl' && scopeIds.length > 0) {
    return { raumProduktIds: scopeIds }
  }

  return null
}

// ═══════════════════════════════════════════════════════════════
// PFLICHT-ABSCHLUSS (öffentlich, via Token)
// ═══════════════════════════════════════════════════════════════

async function ladeItemsImScope(
  supabase: AdminClient,
  projektId: string,
  scopeTyp: FreigabeScopeTyp,
  scopeIds: string[],
): Promise<Array<{ id: string; freigabe_status: string; produktName: string }>> {
  const { data: raeume } = await supabase
    .from('raeume')
    .select('id')
    .eq('projekt_id', projektId)
    .is('deleted_at', null)

  const raumIds = (raeume ?? []).map((r) => r.id)
  if (raumIds.length === 0) return []

  let query = supabase
    .from('raum_produkte')
    .select('id, freigabe_status, produkte(name)')
    .in('raum_id', raumIds)

  if (scopeTyp === 'raum' && scopeIds[0]) query = query.eq('raum_id', scopeIds[0])
  if (scopeTyp === 'auswahl' && scopeIds.length > 0) query = query.in('id', scopeIds)

  const { data } = await query
  return ((data ?? []) as unknown as Array<{
    id: string
    freigabe_status: string
    produkte: { name: string } | null
  }>).map((rp) => ({
    id:           rp.id,
    freigabe_status: rp.freigabe_status,
    produktName:  rp.produkte?.name ?? '',
  }))
}

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

  const scopeTyp: FreigabeScopeTyp = (tok.scope_typ as FreigabeScopeTyp) ?? 'projekt'
  const scopeIds: string[] = (tok.scope_ids as string[]) ?? []

  const items = await ladeItemsImScope(supabase, tok.projekt_id, scopeTyp, scopeIds)

  if (items.length === 0) return { fehler: 'Keine Produkte im Freigabe-Umfang.' }
  const offen = items.filter((i) => i.freigabe_status === 'ausstehend').length
  if (offen > 0) {
    return { fehler: `Noch ${offen} Produkt${offen === 1 ? '' : 'e'} offen — bitte erst alle entscheiden.` }
  }

  const jetzt = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('freigabe_tokens')
    .update({
      abgeschlossen_am:        jetzt,
      abgeschlossen_durch:     opts.name.trim(),
      abgeschlossen_kommentar: opts.kommentar?.trim() || null,
    })
    .eq('id', tok.id)

  if (updErr) return { fehler: 'Abschluss konnte nicht gespeichert werden.' }

  // Projekt + Branding für Mail
  const { data: projekt } = await supabase
    .from('projekte')
    .select('id, name, organisation_id')
    .eq('id', tok.projekt_id)
    .maybeSingle()

  const { data: branding } = await supabase
    .from('branding')
    .select('firmenname, primary_color, email, support_email')
    .eq('organisation_id', tok.organisation_id)
    .maybeSingle()

  // Mail an Admin
  try {
    const freigegeben = items.filter((i) => i.freigabe_status === 'freigegeben').length
    const abgelehnt   = items.filter((i) => i.freigabe_status === 'abgelehnt' || i.freigabe_status === 'ueberarbeitung').length
    const scopeText   =
      scopeTyp === 'projekt' ? 'Gesamtes Projekt' :
      scopeTyp === 'raum'    ? 'Einzelner Raum' :
                                `${items.length} ausgewählte Produkte`

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const adminEmail = branding?.email
      ?? branding?.support_email
      ?? process.env.RESEND_FROM?.match(/<([^>]+)>/)?.[1]
      ?? null

    if (adminEmail) {
      const tpl = freigabeAbgeschlossenMail({
        empfaengerName:    'Team',
        kundenName:        opts.name.trim(),
        projektName:       projekt?.name ?? 'Projekt',
        scopeBeschreibung: scopeText,
        freigegebenCount:  freigegeben,
        abgelehntCount:    abgelehnt,
        kommentar:         opts.kommentar?.trim() || null,
        linkUrl:           `${baseUrl}/dashboard/projekte/${tok.projekt_id}`,
        branding:          branding ?? undefined,
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

  // Auto-Status: prüfen ob ALLE raum_produkte des Projekts jetzt
  // freigegeben sind — wenn ja, Projekt auf 'abgeschlossen' setzen.
  // Nur wenn aktueller Status 'freigegeben' ist (siehe autoProjekt…).
  // Fehler hier darf den Haupt-Flow nicht crashen.
  try {
    const { data: alleItems } = await supabase
      .from('raum_produkte')
      .select('freigabe_status, raeume!inner(projekt_id)')
      .eq('raeume.projekt_id', tok.projekt_id)

    if (alleItems && alleItems.length > 0) {
      const alleFreigegeben = alleItems.every((i) => i.freigabe_status === 'freigegeben')
      if (alleFreigegeben) {
        await autoProjektStatusVorwaerts(tok.projekt_id, 'abgeschlossen')
      }
    }
  } catch (e) {
    console.error('[freigabeAbschliessen:autoStatus]', e)
  }

  return { erfolg: true }
}

// ═══════════════════════════════════════════════════════════════
// AUTO-INVALIDIERUNG bei Produkt-Änderung
// ═══════════════════════════════════════════════════════════════

/**
 * Setzt alle freigegebenen raum_produkte eines Produkts (optional
 * gefiltert) zurück auf 'ausstehend' und legt Audit-Einträge mit
 * kanal='system' an. Aufrufer fangen eigene Fehler ab.
 */
export async function freigabeInvalidierenBeiProduktAenderung(opts: {
  produktId: string
  grund: string
  nurRaumProdukteIds?: string[]
}): Promise<void> {
  const supabase = createAdminClient()

  let query = supabase
    .from('raum_produkte')
    .select('id, organisation_id, freigabe_status')
    .eq('produkt_id', opts.produktId)
    .eq('freigabe_status', 'freigegeben')

  if (opts.nurRaumProdukteIds && opts.nurRaumProdukteIds.length > 0) {
    query = query.in('id', opts.nurRaumProdukteIds)
  }

  const { data: betroffen } = await query
  if (!betroffen || betroffen.length === 0) return

  const kommentar = `Automatisch zurückgesetzt: ${opts.grund}`

  for (const rp of betroffen) {
    await freigabeStatusSetzen({
      raumProduktId: rp.id,
      status:        'ausstehend',
      kommentar,
      kanal:         'system',
      kontext:       { geaendertVon: 'system' },
    })
  }
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
