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
import { bereichVonRaumProdukt, istImAuswahlScope } from '@/lib/freigabe-scope'
import { effektiverVpNetto } from '@/lib/preise'
import { createHash } from 'crypto'
import type {
  FreigabeAudit,
  FreigabeKanal,
  FreigabeScopeTyp,
  FreigabeToken,
  FreigabeBaumBereich,
  FreigabeBaumBlock,
  FreigabeBaumProdukt,
  ProduktStatus,
} from '@/lib/supabase/types'

type AdminClient = ReturnType<typeof createAdminClient>
type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Löst eine „Auswahl" (einzelne Produkte + ganze Gruppen/Bereiche) zu einer
 * konkreten, deduplizierten Liste von raum_produkte-IDs auf — block-first,
 * exakt wie Picker/Anzeige. Wird beim Erstellen genutzt, um den Link
 * EINZUFRIEREN (feste scope_ids → nie „nicht verfügbar").
 * raum_produkte hat KEIN deleted_at → niemals darauf filtern.
 */
async function aufgeloesteAuswahlProduktIds(
  supabase: ServerClient,
  orgId: string,
  projektId: string,
  produktIds: string[],
  bereichIds: string[],
): Promise<string[]> {
  const ergebnis = new Set<string>(produktIds) // explizit gewählte Einzelprodukte immer rein
  if (bereichIds.length === 0) return Array.from(ergebnis)

  const { data: raeume } = await supabase
    .from('raeume').select('id').eq('projekt_id', projektId).eq('organisation_id', orgId).is('deleted_at', null)
  const raumIds = (raeume ?? []).map((r) => r.id as string)
  if (raumIds.length === 0) return Array.from(ergebnis)

  // Block→Bereich-Map (für block-first-Auflösung), fail-safe.
  const blockBereich = new Map<string, string | null>()
  {
    const { data: g } = await supabase
      .from('produkt_gruppen').select('id, bereich_id').in('raum_id', raumIds).is('deleted_at', null)
    for (const row of (g ?? []) as { id: string; bereich_id: string | null }[]) blockBereich.set(row.id, row.bereich_id ?? null)
  }
  const { data: rps } = await supabase
    .from('raum_produkte').select('id, produkt_gruppe_id, bereich_id').in('raum_id', raumIds)
  const bset = new Set(bereichIds)
  for (const rp of (rps ?? []) as { id: string; produkt_gruppe_id: string | null; bereich_id: string | null }[]) {
    const b = bereichVonRaumProdukt({ produkt_gruppe_id: rp.produkt_gruppe_id, bereich_id: rp.bereich_id }, blockBereich)
    if (b && bset.has(b)) ergebnis.add(rp.id)
  }
  return Array.from(ergebnis)
}

// ═══════════════════════════════════════════════════════════════
// TOKEN ERSTELLEN MIT SCOPE
// ═══════════════════════════════════════════════════════════════

export async function freigabeTokenErstellen(
  projektId: string,
  scopeTyp: FreigabeScopeTyp = 'projekt',
  scopeIds: string[] = [],
  bereichIds: string[] = [],
): Promise<{ token: string } | { fehler: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  if (scopeTyp === 'projekt' && scopeIds.length > 0) {
    return { fehler: 'Projekt-Scope darf keine scopeIds haben.' }
  }
  if (scopeTyp === 'raum' && scopeIds.length !== 1) {
    return { fehler: 'Raum-Scope braucht genau eine Raum-ID.' }
  }
  if (scopeTyp === 'auswahl' && scopeIds.length === 0 && bereichIds.length === 0) {
    return { fehler: 'Auswahl-Scope braucht mindestens ein Produkt oder eine Gruppe.' }
  }

  // Auswahl-Links beim Erstellen EINFRIEREN: Auswahl (Einzelprodukte + ganze
  // Gruppen/Bereiche) sofort zu festen raum_produkte-IDs auflösen. Der Link ist
  // damit selbsttragend und kann nie „nicht verfügbar" werden (keine dynamische
  // Live-Auflösung mehr). Mind. 1 Produkt ist Pflicht — sonst kein leerer Link.
  let finaleScopeIds = scopeIds
  if (scopeTyp === 'auswahl') {
    finaleScopeIds = await aufgeloesteAuswahlProduktIds(supabase, orgId, projektId, scopeIds, bereichIds)
    if (finaleScopeIds.length === 0) {
      return { fehler: 'Diese Auswahl enthält aktuell keine Produkte. Bitte mindestens ein Produkt (oder eine Gruppe mit Produkten) auswählen.' }
    }
  }

  // scope_bereich_ids nur als Anzeige-Metadaten (welche Gruppen gewählt waren).
  // Der tatsächliche Inhalt steckt eingefroren in scope_ids.
  const insertData: Record<string, unknown> = {
    projekt_id: projektId,
    organisation_id: orgId,
    scope_typ: scopeTyp,
    scope_ids: finaleScopeIds,
  }
  if (bereichIds.length > 0) insertData.scope_bereich_ids = bereichIds

  const { data, error } = await supabase
    .from('freigabe_tokens')
    .insert(insertData)
    .select('token')
    .single()

  if (error || !data) {
    if (error?.code === '23505') {
      return { fehler: 'Für dieses Projekt gibt es bereits einen offenen Freigabe-Link. Bitte bestehenden verwenden oder zuerst zurückziehen.' }
    }
    // Gruppen-Scope, aber Migration 116 fehlt
    if (bereichIds.length > 0 && (error?.code === '42703' || error?.message?.includes('scope_bereich_ids'))) {
      return { fehler: 'Migration 116 scheint zu fehlen (scope_bereich_ids-Spalte). Bitte im Supabase SQL-Editor ausführen.' }
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

/**
 * Setzt die KUNDEN-Entscheidungen (Freigabe-Status → „offen", Kommentar,
 * gewählte Alternative, Wunschmenge) für den Scope eines Tokens zurück.
 * Wird beim Zurückziehen/Löschen eines Links aufgerufen → kein verwaistes
 * (Test-)Feedback bleibt auf den live raum_produkte stehen. Verbindlich
 * abgesendete Belege (freigabe_einreichungen) bleiben als Nachweis erhalten.
 * `admin_favorit` (eure Empfehlung) wird NICHT angetastet. Fail-safe.
 */
async function entscheidungenFuerTokenScopeZuruecksetzen(
  supabase: ServerClient,
  orgId: string,
  projektId: string,
  scopeTyp: FreigabeScopeTyp,
  scopeIds: string[],
): Promise<void> {
  const reset = { freigabe_status: 'ausstehend', freigabe_kommentar: null, kunde_favorit: false, kunde_menge: null }
  if (scopeTyp === 'auswahl') {
    if (scopeIds.length === 0) return
    await supabase.from('raum_produkte').update(reset).in('id', scopeIds).eq('organisation_id', orgId)
  } else if (scopeTyp === 'raum') {
    if (!scopeIds[0]) return
    await supabase.from('raum_produkte').update(reset).eq('raum_id', scopeIds[0]).eq('organisation_id', orgId)
  } else {
    const { data: raeume } = await supabase
      .from('raeume').select('id').eq('projekt_id', projektId).eq('organisation_id', orgId).is('deleted_at', null)
    const raumIds = (raeume ?? []).map((r) => r.id as string)
    if (raumIds.length > 0) await supabase.from('raum_produkte').update(reset).in('raum_id', raumIds).eq('organisation_id', orgId)
  }
}

export async function freigabeTokenZurueckziehen(
  tokenId: string,
  projektId: string,
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: tok } = await supabase
    .from('freigabe_tokens').select('scope_typ, scope_ids').eq('id', tokenId).eq('organisation_id', orgId).maybeSingle()
  await supabase
    .from('freigabe_tokens')
    .update({ deleted_at: new Date().toISOString(), aktiv: false })
    .eq('id', tokenId)
    .eq('organisation_id', orgId)
  // Kunden-Feedback des Scopes neutralisieren (Beleg bleibt als Nachweis).
  if (tok) await entscheidungenFuerTokenScopeZuruecksetzen(
    supabase, orgId, projektId, (tok.scope_typ as FreigabeScopeTyp) ?? 'projekt', (tok.scope_ids as string[] | null) ?? [],
  )
  revalidatePath(`/dashboard/projekte/${projektId}`)
}

/**
 * Endgültiges Löschen eines Freigabe-Links (Hard-Delete). Setzt zugleich die
 * Kunden-Entscheidungen des Scopes zurück (Test-Feedback verschwindet mit dem
 * Link). Verbindliche Belege (freigabe_einreichungen) bleiben erhalten. org-scoped.
 */
export async function freigabeTokenLoeschen(
  tokenId: string,
  projektId: string,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: tok } = await supabase
    .from('freigabe_tokens').select('scope_typ, scope_ids').eq('id', tokenId).eq('organisation_id', orgId).maybeSingle()
  const { error } = await supabase
    .from('freigabe_tokens')
    .delete()
    .eq('id', tokenId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Löschen fehlgeschlagen. Bitte erneut versuchen.' }
  if (tok) await entscheidungenFuerTokenScopeZuruecksetzen(
    supabase, orgId, projektId, (tok.scope_typ as FreigabeScopeTyp) ?? 'projekt', (tok.scope_ids as string[] | null) ?? [],
  )
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return {}
}

/**
 * Setzt ALLE Kunden-Entscheidungen eines Projekts zurück (Freigabe-Status → „offen",
 * Kommentar, gewählte Alternative, Wunschmenge). Für Test-Aufräumen / Neustart, wenn
 * z. B. alle Links gelöscht wurden, aber noch Feedback auf den Produkten klebt.
 * Verbindliche Belege (freigabe_einreichungen) bleiben als Nachweis erhalten.
 * `admin_favorit` (Empfehlung) bleibt unangetastet. org-scoped.
 */
export async function projektKundenEntscheidungenZuruecksetzen(
  projektId: string,
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: raeume } = await supabase
    .from('raeume').select('id').eq('projekt_id', projektId).eq('organisation_id', orgId).is('deleted_at', null)
  const raumIds = (raeume ?? []).map((r) => r.id as string)
  if (raumIds.length === 0) return {}
  const { error } = await supabase
    .from('raum_produkte')
    .update({ freigabe_status: 'ausstehend', freigabe_kommentar: null, kunde_favorit: false, kunde_menge: null })
    .in('raum_id', raumIds)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Zurücksetzen fehlgeschlagen. Bitte erneut versuchen.' }
  revalidatePath(`/dashboard/projekte/${projektId}`)
  return {}
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
  // Gruppen/Bereiche des Raums (Migration 116) — für „Auswahl"-Picker.
  // `anzahl` = wie viele Produkte effektiv in dieser Gruppe liegen (block-first),
  // damit man im Picker sieht, welche Gruppe Produkte enthält (keine leeren wählen).
  bereiche: { id: string; name: string; anzahl: number }[]
}

/**
 * No-Op (Kompatibilität): Freigabe-Links werden seit „Teil 1" beim Erstellen
 * EINGEFROREN (feste scope_ids) und wachsen nicht mehr automatisch mit neuen
 * Produkten. Diese Aktion hat keine Aufrufer mehr und ist bewusst wirkungslos.
 */
export async function freigabeScopeAktualisieren(
  tokenId: string,
  projektId: string,
): Promise<{ erfolg?: boolean; hinzugefuegt?: number; live?: boolean; fehler?: string }> {
  void tokenId
  void projektId
  return { erfolg: true, hinzugefuegt: 0, live: true }
}

/**
 * No-Op (Kompatibilität): Auswahl-Links werden seit „Teil 1" beim Erstellen
 * eingefroren (feste scope_ids) und wachsen NICHT mehr automatisch mit neu zum
 * Raum hinzugefügten Produkten. Die frühere Implementierung filterte zudem
 * `raum_produkte.deleted_at` (Spalte existiert nicht). Signatur bleibt erhalten,
 * damit die bestehenden Aufrufer (Produkt-/Raum-/Block-Aktionen) unverändert bleiben.
 */
export async function freigabeAuswahlScopeFuerRaum(
  supabase: ServerClient,
  orgId: string,
  raumId: string,
): Promise<void> {
  void supabase
  void orgId
  void raumId
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

  // Effektiven Bereich je raum_produkt bestimmen (block-first, identisch zur Kunden-Seite),
  // um pro Gruppe die Produktanzahl zu zählen. Alles fail-safe (fehlende Mig 114/116 → 0).
  const raumIds = raeume.map((r) => r.id)
  const ownBereich = new Map<string, string | null>()   // rpId -> eigener bereich_id
  const blockOf    = new Map<string, string | null>()    // rpId -> produkt_gruppe_id
  {
    // raum_produkte hat KEINE deleted_at-Spalte (Einträge werden hart gelöscht,
    // siehe Migration 101). Ein .is('deleted_at', null) hier liefert einen
    // PostgREST-Fehler → die Maps blieben leer → jede Gruppe wurde fälschlich als
    // „leer" angezeigt. Ohne den Filter (wie getRaumProdukte/Kunden-View) korrekt.
    const { data: rg, error } = await supabase
      .from('raum_produkte')
      .select('id, produkt_gruppe_id, bereich_id')
      .in('raum_id', raumIds)
    if (!error) for (const r of (rg ?? []) as { id: string; produkt_gruppe_id: string | null; bereich_id: string | null }[]) {
      ownBereich.set(r.id, r.bereich_id ?? null)
      blockOf.set(r.id, r.produkt_gruppe_id ?? null)
    }
  }
  const blockBereich = new Map<string, string | null>() // produkt_gruppe_id -> bereich_id
  {
    const { data: g, error } = await supabase
      .from('produkt_gruppen')
      .select('id, bereich_id')
      .in('raum_id', raumIds)
      .is('deleted_at', null)
    if (!error) for (const row of (g ?? []) as { id: string; bereich_id: string | null }[]) blockBereich.set(row.id, row.bereich_id ?? null)
  }
  // Pro Bereich zählen, wie viele (nicht gelöschte) raum_produkte effektiv darin liegen.
  const anzahlProBereich = new Map<string, number>()
  for (const rp of ((rps ?? []) as unknown as RpRow[])) {
    if (!rp.produkte) continue
    const block = blockOf.get(rp.id) ?? null
    const ausBlock = block ? (blockBereich.get(block) ?? null) : null
    const eff = ausBlock ?? ownBereich.get(rp.id) ?? null
    if (eff) anzahlProBereich.set(eff, (anzahlProBereich.get(eff) ?? 0) + 1)
  }

  // Bereiche/"Gruppen" je Raum (Migration 116) — fail-safe (Tabelle könnte fehlen).
  const bereicheByRaum: Record<string, { id: string; name: string; anzahl: number }[]> = {}
  {
    const { data: ber } = await supabase
      .from('produkt_bereiche')
      .select('id, raum_id, name, reihenfolge')
      .in('raum_id', raumIds)
      .is('deleted_at', null)
      .order('reihenfolge')
      .order('name')
    for (const b of ((ber ?? []) as { id: string; raum_id: string; name: string }[])) {
      if (!bereicheByRaum[b.raum_id]) bereicheByRaum[b.raum_id] = []
      bereicheByRaum[b.raum_id].push({ id: b.id, name: b.name, anzahl: anzahlProBereich.get(b.id) ?? 0 })
    }
  }

  return raeume.map((r) => ({
    id:    r.id,
    name:  r.name,
    items: rpsByRaum[r.id] ?? [],
    bereiche: bereicheByRaum[r.id] ?? [],
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

  // Freigabe-Stempel (Migration 135) — best-effort, separate Update, damit eine
  // fehlende Spalte (vor der Migration) den Freigabe-Flow NIE bricht.
  await stempleFreigabe(supabase, input.raumProduktId, input.status, input.kontext.geaendertVon)

  return { erfolg: true }
}

/**
 * Setzt/löscht den Freigabe-Stempel (freigegeben_am/von, Migration 135) auf einem
 * raum_produkte-Eintrag. Best-effort: fehlt die Spalte (vor der Migration), wird der
 * Fehler verschluckt — der eigentliche Freigabe-Status ist bereits gespeichert.
 */
async function stempleFreigabe(
  supabase: AdminClient,
  raumProduktId: string,
  status: 'ausstehend' | 'freigegeben' | 'abgelehnt' | 'ueberarbeitung',
  geaendertVon: string,
): Promise<void> {
  try {
    const patch = status === 'freigegeben'
      ? { freigegeben_am: new Date().toISOString(), freigegeben_von: geaendertVon }
      : { freigegeben_am: null, freigegeben_von: null }
    await supabase.from('raum_produkte').update(patch).eq('id', raumProduktId)
  } catch { /* Spalten fehlen (Mig 135) → Stempel überspringen */ }
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
  scopeBereichIds: string[] = [],
): Promise<Array<{ id: string; freigabe_status: string; produkt_gruppe_id: string | null; produktName: string }>> {
  const { data: raeume } = await supabase
    .from('raeume')
    .select('id')
    .eq('projekt_id', projektId)
    .is('deleted_at', null)

  const raumIds = (raeume ?? []).map((r) => r.id)
  if (raumIds.length === 0) return []

  // „auswahl" + ganze Gruppen → dynamisch auflösen (analog page.tsx): kein
  // .in()-Vorfilter, sondern alle Raum-Produkte laden + via Resolver filtern.
  const auswahlMitBereich = scopeTyp === 'auswahl' && scopeBereichIds.length > 0

  let query = supabase
    .from('raum_produkte')
    .select(
      auswahlMitBereich
        ? 'id, freigabe_status, produkt_gruppe_id, bereich_id, produkte(name)'
        : 'id, freigabe_status, produkt_gruppe_id, produkte(name)',
    )
    .in('raum_id', raumIds)

  if (scopeTyp === 'raum' && scopeIds[0]) query = query.eq('raum_id', scopeIds[0])
  if (scopeTyp === 'auswahl' && scopeIds.length > 0 && !auswahlMitBereich) query = query.in('id', scopeIds)

  const { data } = await query
  let rows = ((data ?? []) as unknown as Array<{
    id: string
    freigabe_status: string
    produkt_gruppe_id: string | null
    bereich_id?: string | null
    produkte: { name: string } | null
  }>)

  if (auswahlMitBereich) {
    // Block→Bereich-Map (Bereich eines Blocks liegt auf produkt_gruppen)
    const gIds = Array.from(new Set(rows.map((r) => r.produkt_gruppe_id).filter(Boolean))) as string[]
    const blockBereich = new Map<string, string | null>()
    if (gIds.length > 0) {
      const { data: gb } = await supabase.from('produkt_gruppen').select('id, bereich_id').in('id', gIds).is('deleted_at', null)
      for (const g of ((gb ?? []) as { id: string; bereich_id: string | null }[])) blockBereich.set(g.id, g.bereich_id ?? null)
    }
    rows = rows.filter((r) =>
      istImAuswahlScope(
        { id: r.id, produkt_gruppe_id: r.produkt_gruppe_id, bereich_id: r.bereich_id ?? null },
        scopeIds, scopeBereichIds, blockBereich,
      ),
    )
  }

  return rows.map((rp) => ({
    id:           rp.id,
    freigabe_status: rp.freigabe_status,
    produkt_gruppe_id: rp.produkt_gruppe_id ?? null,
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

  // Projekt laden + Org-Konsistenz prüfen (defense-in-depth) — vor allen Seiteneffekten
  const { data: projekt } = await supabase
    .from('projekte')
    .select('id, name, organisation_id')
    .eq('id', tok.projekt_id)
    .maybeSingle()
  if (!projekt || projekt.organisation_id !== tok.organisation_id) {
    return { fehler: 'Projekt-Zuordnung ungültig.' }
  }

  const scopeTyp: FreigabeScopeTyp = (tok.scope_typ as FreigabeScopeTyp) ?? 'projekt'
  const scopeIds: string[] = (tok.scope_ids as string[]) ?? []
  const scopeBereichIds: string[] = (tok.scope_bereich_ids as string[] | null) ?? []

  const items = await ladeItemsImScope(supabase, tok.projekt_id, scopeTyp, scopeIds, scopeBereichIds)

  if (items.length === 0) return { fehler: 'Keine Produkte im Freigabe-Umfang.' }
  // Gruppen-aware: eine Auswahl-Gruppe gilt als entschieden, sobald EIN Mitglied
  // freigegeben ist. Nicht-gewählte Alternativen (ausstehend) blockieren NICHT.
  const erfuellteGruppen = new Set(
    items.filter((i) => i.produkt_gruppe_id && i.freigabe_status === 'freigegeben').map((i) => i.produkt_gruppe_id),
  )
  const offen = items.filter(
    (i) => i.freigabe_status === 'ausstehend' && (!i.produkt_gruppe_id || !erfuellteGruppen.has(i.produkt_gruppe_id)),
  ).length
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

  // Branding für Mail
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
      .select('freigabe_status, produkt_gruppe_id, raeume!inner(projekt_id)')
      .eq('raeume.projekt_id', tok.projekt_id)

    if (alleItems && alleItems.length > 0) {
      // Gruppen-aware: eine Gruppe gilt als erfüllt, sobald ein Mitglied freigegeben ist.
      // Nicht-gewählte Alternativen (ausstehend) in einer erfüllten Gruppe blockieren nicht;
      // echte ausstehende/abgelehnte Positionen verhindern den Auto-Abschluss weiterhin.
      const erfuellt = new Set(
        (alleItems as Array<{ freigabe_status: string; produkt_gruppe_id: string | null }>)
          .filter((i) => i.produkt_gruppe_id && i.freigabe_status === 'freigegeben')
          .map((i) => i.produkt_gruppe_id),
      )
      const alleFreigegeben = (alleItems as Array<{ freigabe_status: string; produkt_gruppe_id: string | null }>).every(
        (i) =>
          i.freigabe_status === 'freigegeben' ||
          (i.freigabe_status === 'ausstehend' && !!i.produkt_gruppe_id && erfuellt.has(i.produkt_gruppe_id)),
      )
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
// ENTWURF → SAMMEL-ABSENDEN + „In Bearbeitung"-Signal
// ═══════════════════════════════════════════════════════════════

/** Markiert einen Token als „in Bearbeitung" (erster Entwurf-Klick des Kunden).
 *  Fire-and-forget, fail-safe (fehlende Spalte/Token → no-op). */
export async function freigabeBearbeitungMarkieren(token: string): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { data: tok } = await supabase
      .from('freigabe_tokens')
      .select('id, aktiv, deleted_at, abgeschlossen_am, bearbeitung_begonnen_am')
      .eq('token', token)
      .maybeSingle()
    if (!tok || !tok.aktiv || tok.deleted_at || tok.abgeschlossen_am) return
    if ((tok as { bearbeitung_begonnen_am?: string | null }).bearbeitung_begonnen_am) return
    await supabase
      .from('freigabe_tokens')
      .update({ bearbeitung_begonnen_am: new Date().toISOString() })
      .eq('id', tok.id)
  } catch {
    /* fail-safe: Migration 118 fehlt o. Ä. → ignorieren */
  }
}

export interface FreigabeEntscheidung {
  raumProduktId: string
  status: 'ausstehend' | 'freigegeben' | 'abgelehnt' | 'ueberarbeitung'
  kommentar: string | null
  kundeFavorit: boolean
  // Wunsch-Menge des Kunden (Migration 119). NULL = unverändert (geplante Menge gilt).
  menge?: number | null
}

/** Sammelnotiz des Kunden je Auswahl-Block (Migration 119). */
export interface FreigabeBlockNotiz {
  gruppeId: string
  notiz: string | null
}

/** Sammel-Commit: schreibt ALLE Kunden-Entscheidungen in einem Rutsch und
 *  schließt die Freigabe ab. Vollständigkeit wird VOR dem Schreiben geprüft
 *  (kein Teil-Commit). Nur In-Scope-Produkte werden akzeptiert (IDOR-Schutz). */
export async function freigabeAbsenden(
  token: string,
  name: string,
  kommentar: string | null,
  entscheidungen: FreigabeEntscheidung[],
  blockNotizen: FreigabeBlockNotiz[] = [],
): Promise<{ erfolg: true } | { fehler: string }> {
  const supabase = createAdminClient()

  if (!name.trim()) return { fehler: 'Bitte deinen Namen eingeben.' }

  const { data: tok } = await supabase
    .from('freigabe_tokens')
    .select('id, projekt_id, organisation_id, aktiv, deleted_at, abgeschlossen_am, scope_typ, scope_ids, scope_bereich_ids')
    .eq('token', token)
    .maybeSingle()

  if (!tok || !tok.aktiv || tok.deleted_at) return { fehler: 'Ungültiger oder zurückgezogener Link.' }
  if (tok.abgeschlossen_am) return { fehler: 'Diese Freigabe wurde bereits abgeschlossen.' }

  const scopeTyp: FreigabeScopeTyp = (tok.scope_typ as FreigabeScopeTyp) ?? 'projekt'
  const scopeIds: string[] = (tok.scope_ids as string[]) ?? []
  const scopeBereichIds: string[] = (tok.scope_bereich_ids as string[] | null) ?? []

  // In-Scope-Produkte (erlaubte IDs + Block-Zugehörigkeit + Ist-Status)
  const items = await ladeItemsImScope(supabase, tok.projekt_id, scopeTyp, scopeIds, scopeBereichIds)
  if (items.length === 0) return { fehler: 'Keine Produkte im Freigabe-Umfang.' }

  const inScope = new Set(items.map((i) => i.id))
  const gewaehlt = entscheidungen.filter((e) => inScope.has(e.raumProduktId))
  const desired = new Map<string, string>()
  for (const e of gewaehlt) desired.set(e.raumProduktId, e.status)

  // Vollständigkeit VOR dem Schreiben prüfen (gruppen-aware) — kein Teil-Commit
  const erfuellteGruppen = new Set(
    items.filter((i) => i.produkt_gruppe_id && (desired.get(i.id) ?? i.freigabe_status) === 'freigegeben').map((i) => i.produkt_gruppe_id),
  )
  const offen = items.filter((i) => {
    const st = desired.get(i.id) ?? i.freigabe_status
    return st === 'ausstehend' && (!i.produkt_gruppe_id || !erfuellteGruppen.has(i.produkt_gruppe_id))
  }).length
  if (offen > 0) {
    return { fehler: `Noch ${offen} Produkt${offen === 1 ? '' : 'e'} offen — bitte erst alle entscheiden.` }
  }

  // kunde_favorit clear-before-set (Partial-Unique-Index): erst alles im Scope
  // zurücksetzen, dann die gewählten setzen (Client liefert genau 1 pro Block).
  const inScopeIds = items.map((i) => i.id)
  await supabase.from('raum_produkte').update({ kunde_favorit: false }).in('id', inScopeIds)
  const favIds = gewaehlt.filter((e) => e.kundeFavorit).map((e) => e.raumProduktId)
  if (favIds.length > 0) {
    await supabase.from('raum_produkte').update({ kunde_favorit: true }).in('id', favIds)
  }

  // Status + Kommentar je Entscheidung schreiben (inkl. Audit).
  for (const e of gewaehlt) {
    await freigabeStatusSetzen({
      raumProduktId: e.raumProduktId,
      status: e.status,
      kommentar: e.kommentar,
      kanal: 'token',
      kontext: { tokenId: tok.id, geaendertVon: `${name.trim()} (Freigabe-Link)` },
    })
  }

  // Wunsch-Menge je Produkt (Migration 119) — separat + fail-safe (Spalte kann fehlen).
  try {
    for (const e of gewaehlt) {
      if (e.menge === undefined) continue
      const wunsch = e.menge != null && e.menge >= 1 ? Math.round(e.menge) : null
      await supabase.from('raum_produkte').update({ kunde_menge: wunsch }).eq('id', e.raumProduktId)
    }
  } catch { /* kunde_menge-Spalte fehlt → ignorieren */ }

  // Sammelnotiz je Auswahl-Block (Migration 119) — nur In-Scope-Blöcke, fail-safe.
  if (blockNotizen.length > 0) {
    const erlaubteGruppen = new Set(items.map((i) => i.produkt_gruppe_id).filter(Boolean) as string[])
    try {
      for (const bn of blockNotizen) {
        if (!erlaubteGruppen.has(bn.gruppeId)) continue
        await supabase
          .from('produkt_gruppen')
          .update({ kunde_notiz: bn.notiz?.trim() || null })
          .eq('id', bn.gruppeId)
          .eq('organisation_id', tok.organisation_id)
      }
    } catch { /* kunde_notiz-Spalte fehlt → ignorieren */ }
  }

  // ── Unveränderlichen Einreichungs-Beleg schreiben (Migration 125) ──────────
  // Eingefrorener Snapshot ALLER In-Scope-Entscheidungen (Name/Status/Kommentar/
  // gewählte Alternative/Menge/Preis) + Unterzeichner + Zeitstempel. Überlebt
  // spätere Änderungen an den live raum_produkte → späterer Nachweis bleibt erhalten.
  // Fail-safe: fehlt die Tabelle (Migration 125 noch nicht eingespielt), wird der
  // Beleg übersprungen — das Absenden funktioniert trotzdem.
  try {
    const { data: snapRows } = await supabase
      .from('raum_produkte')
      .select('id, menge, verkaufspreis_override, rabatt_prozent, kunde_favorit, kunde_menge, produkt_gruppe_id, bereich_id, freigabe_status, freigabe_kommentar, produkte(name, einheit, verkaufspreis), raeume(name)')
      .in('id', inScopeIds)
    const rows = (snapRows ?? []) as unknown as Array<{
      id: string; menge: number; verkaufspreis_override: number | null; rabatt_prozent: number | null
      kunde_favorit: boolean | null; kunde_menge: number | null; produkt_gruppe_id: string | null; bereich_id: string | null
      freigabe_status: string; freigabe_kommentar: string | null
      produkte: { name: string; einheit: string | null; verkaufspreis: number | null } | null
      raeume: { name: string } | null
    }>
    const blockIds = Array.from(new Set(rows.map((r) => r.produkt_gruppe_id).filter(Boolean))) as string[]
    const bereichIds = Array.from(new Set(rows.map((r) => r.bereich_id).filter(Boolean))) as string[]
    const blockName = new Map<string, string>()
    const bereichName = new Map<string, string>()
    if (blockIds.length > 0) {
      const { data } = await supabase.from('produkt_gruppen').select('id, name').in('id', blockIds)
      for (const g of (data ?? []) as { id: string; name: string }[]) blockName.set(g.id, g.name)
    }
    if (bereichIds.length > 0) {
      const { data } = await supabase.from('produkt_bereiche').select('id, name').in('id', bereichIds)
      for (const b of (data ?? []) as { id: string; name: string }[]) bereichName.set(b.id, b.name)
    }
    const positionen = rows.map((r) => ({
      raum_produkt_id: r.id,
      produkt_name: r.produkte?.name ?? '',
      einheit: r.produkte?.einheit ?? null,
      raum_name: r.raeume?.name ?? null,
      bereich_name: r.bereich_id ? (bereichName.get(r.bereich_id) ?? null) : null,
      block_name: r.produkt_gruppe_id ? (blockName.get(r.produkt_gruppe_id) ?? null) : null,
      status: r.freigabe_status,
      kommentar: r.freigabe_kommentar,
      ist_kundenwahl: !!r.kunde_favorit,
      menge: r.kunde_menge ?? r.menge,
      einzelpreis_netto: effektiverVpNetto(
        { verkaufspreis_override: r.verkaufspreis_override, rabatt_prozent: r.rabatt_prozent ?? null },
        r.produkte?.verkaufspreis ?? null,
      ),
    }))
    const summen = {
      gesamt: positionen.length,
      freigegeben: positionen.filter((p) => p.status === 'freigegeben').length,
      abgelehnt: positionen.filter((p) => p.status === 'abgelehnt').length,
      ueberarbeitung: positionen.filter((p) => p.status === 'ueberarbeitung').length,
      ausstehend: positionen.filter((p) => p.status === 'ausstehend').length,
      summe_freigegeben_netto: positionen
        .filter((p) => p.status === 'freigegeben')
        .reduce((s, p) => s + (p.einzelpreis_netto ?? 0) * (p.menge || 1), 0),
    }
    const { count } = await supabase
      .from('freigabe_einreichungen')
      .select('id', { count: 'exact', head: true })
      .eq('projekt_id', tok.projekt_id)
    const contentHash = createHash('sha256').update(JSON.stringify(positionen)).digest('hex')
    await supabase.from('freigabe_einreichungen').insert({
      organisation_id:       tok.organisation_id,
      projekt_id:            tok.projekt_id,
      freigabe_token_id:     tok.id,
      lfd_nr:                (count ?? 0) + 1,
      unterzeichner_name:    name.trim(),
      abgesendet_am:         new Date().toISOString(),
      allgemeiner_kommentar: kommentar?.trim() || null,
      scope_typ:             scopeTyp,
      scope_ids:             scopeIds,
      scope_bereich_ids:     scopeBereichIds,
      positionen,
      summen,
      content_hash:          contentHash,
    })
  } catch (e) {
    console.error('[freigabeAbsenden] Einreichungs-Snapshot fehlgeschlagen (fail-safe):', e)
  }

  // Abschluss: re-validiert, Gate (passt jetzt), markiert Token, Mail,
  // Timeline-Event, Auto-Projektstatus — alles bestehend, 1:1 wiederverwendet.
  return freigabeAbschliessen(token, { name, kommentar })
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

  // Kunden-Favorit der zurückgesetzten Einträge aufheben — sonst gälte die Gruppe
  // weiter als „gewählt", obwohl der Status auf 'ausstehend' zurückfiel (Mig 114).
  await supabase
    .from('raum_produkte')
    .update({ kunde_favorit: false })
    .in('id', betroffen.map((rp) => rp.id))
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

// ═══════════════════════════════════════════════════════════════
// FREIGABE-BAUM (Projekt-Tab „Freigaben"): Raum → Bereich → Block → Produkt
// ═══════════════════════════════════════════════════════════════

type RpBaumRow = {
  id: string
  raum_id: string
  produkt_gruppe_id: string | null
  bereich_id: string | null
  freigabe_status: string | null
  kunde_favorit: boolean | null
  freigegeben_am?: string | null
  freigegeben_von?: string | null
  produkte: { name: string; bild_url: string | null; deleted_at: string | null } | null
}

/**
 * Lädt für ein Projekt die Blöcke/Gruppen-Struktur je Raum (Bereich → Block → Produkt)
 * inkl. Freigabe-Status + Stempel (Mig 135). Für den Projekt-Tab „Freigaben", damit man
 * die Blöcke/Gruppen sieht „wie bei den Räumen". Org-scoped + komplett fail-safe (jeder
 * Fehler → {} → Panel fällt auf die reine Raum-Liste zurück). Block-first Bereich-Auflösung
 * (Block-Bereich gewinnt), soft-gelöschte Produkte werden gefiltert. raum_produkte hat KEIN
 * deleted_at — niemals darauf filtern.
 */
export async function getFreigabeBaum(projektId: string): Promise<Record<string, FreigabeBaumBereich[]>> {
  try {
    const supabase = await createClient()
    const orgId = await getOrganisationId()

    const { data: raeumeData } = await supabase
      .from('raeume').select('id').eq('projekt_id', projektId).eq('organisation_id', orgId).is('deleted_at', null)
    const raumIds = (raeumeData ?? []).map((r) => r.id as string)
    if (raumIds.length === 0) return {}

    // raum_produkte — Stempel-Spalten fail-safe (fehlen vor Mig 135 → Fallback-Select)
    const RP_VOLL = 'id, raum_id, produkt_gruppe_id, bereich_id, freigabe_status, kunde_favorit, freigegeben_am, freigegeben_von, produkte(name, bild_url, deleted_at)'
    const RP_BASIS = 'id, raum_id, produkt_gruppe_id, bereich_id, freigabe_status, kunde_favorit, produkte(name, bild_url, deleted_at)'
    let rpData: unknown
    const richRp = await supabase.from('raum_produkte').select(RP_VOLL).in('raum_id', raumIds).order('reihenfolge')
    if (richRp.error) {
      rpData = (await supabase.from('raum_produkte').select(RP_BASIS).in('raum_id', raumIds).order('reihenfolge')).data
    } else {
      rpData = richRp.data
    }
    const rpRows = ((rpData ?? []) as RpBaumRow[]).filter((r) => r.produkte && r.produkte.deleted_at == null)

    // Bereich-/Block-Namen (ohne deleted_at-Filter — Zugehörigkeit folgt raum_produkte, S90)
    const [berRes, grpRes] = await Promise.all([
      supabase.from('produkt_bereiche').select('id, raum_id, name, farbe').in('raum_id', raumIds).order('reihenfolge').order('name'),
      supabase.from('produkt_gruppen').select('id, raum_id, name, bereich_id').in('raum_id', raumIds).order('name'),
    ])
    const bereichMeta = new Map<string, { raum_id: string; name: string; farbe: string | null }>(
      (berRes.data ?? []).map((b) => [b.id as string, { raum_id: b.raum_id as string, name: b.name as string, farbe: (b.farbe as string | null) ?? null }]),
    )
    const blockMeta = new Map<string, { raum_id: string; name: string; bereich_id: string | null }>(
      (grpRes.data ?? []).map((g) => [g.id as string, { raum_id: g.raum_id as string, name: g.name as string, bereich_id: (g.bereich_id as string | null) ?? null }]),
    )

    const toProdukt = (r: RpBaumRow): FreigabeBaumProdukt => ({
      id: r.id,
      name: r.produkte!.name,
      bild_url: r.produkte!.bild_url,
      status: (r.freigabe_status ?? 'ausstehend') as ProduktStatus,
      kunde_favorit: !!r.kunde_favorit,
      freigegeben_am: r.freigegeben_am ?? null,
      freigegeben_von: r.freigegeben_von ?? null,
    })

    // Pro Raum: Bereich (block-first) → Block → Produkt; „lose" = ohne Block.
    const baum: Record<string, FreigabeBaumBereich[]> = {}
    for (const raumId of raumIds) {
      const zeilen = rpRows.filter((r) => r.raum_id === raumId)
      if (zeilen.length === 0) continue

      // Reihenfolge der Bereiche dieses Raums (echte zuerst, dann synthetisch „Ohne Gruppe")
      const bereichReihen: string[] = (berRes.data ?? []).filter((b) => b.raum_id === raumId).map((b) => b.id as string)
      const bereiche = new Map<string, FreigabeBaumBereich>()
      const blockIndex = new Map<string, FreigabeBaumBlock>()  // key = `${bereichKey}::${blockId}`

      const holeBereich = (key: string): FreigabeBaumBereich => {
        let b = bereiche.get(key)
        if (!b) {
          const meta = key === '__lose__' ? null : bereichMeta.get(key)
          b = { id: key, name: meta?.name ?? 'Ohne Gruppe', farbe: meta?.farbe ?? null, bloecke: [], lose: [] }
          bereiche.set(key, b)
        }
        return b
      }

      for (const r of zeilen) {
        const block = r.produkt_gruppe_id ? blockMeta.get(r.produkt_gruppe_id) ?? null : null
        const effBereichId = block ? block.bereich_id : r.bereich_id
        const bereichKey = effBereichId && bereichMeta.has(effBereichId) ? effBereichId : '__lose__'
        const bereich = holeBereich(bereichKey)
        if (block && r.produkt_gruppe_id) {
          const bk = `${bereichKey}::${r.produkt_gruppe_id}`
          let blk = blockIndex.get(bk)
          if (!blk) {
            blk = { id: r.produkt_gruppe_id, name: block.name, produkte: [] }
            blockIndex.set(bk, blk)
            bereich.bloecke.push(blk)
          }
          blk.produkte.push(toProdukt(r))
        } else {
          bereich.lose.push(toProdukt(r))
        }
      }

      // Geordnete Ausgabe: echte Bereiche in DB-Reihenfolge, „Ohne Gruppe" zuletzt.
      const geordnet: FreigabeBaumBereich[] = []
      for (const id of bereichReihen) if (bereiche.has(id)) geordnet.push(bereiche.get(id)!)
      for (const [key, b] of Array.from(bereiche.entries())) if (key !== '__lose__' && !bereichReihen.includes(key)) geordnet.push(b)
      if (bereiche.has('__lose__')) geordnet.push(bereiche.get('__lose__')!)
      baum[raumId] = geordnet
    }

    return baum
  } catch {
    return {}
  }
}
