'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { istImAuswahlScope } from '@/lib/freigabe-scope'
import type { ProduktStatus } from '@/lib/supabase/types'

export type FreigabeResult = { fehler: string } | { erfolg: true }

/**
 * Scope-Guard für „auswahl"-Tokens (Migration 081 + 116). Erlaubt den Write,
 * wenn das Produkt direkt in scope_ids ODER über seinen Bereich in
 * scope_bereich_ids liegt. Alles fail-safe (fehlende Migration 116 →
 * scope_bereich_ids leer → nur scope_ids zählt). MUSS exakt der Anzeige-
 * Auflösung in freigabe/[token]/page.tsx entsprechen (geteilter istImAuswahlScope) —
 * sonst IDOR. Es wird ausschließlich AUSGEWEITET, nie verengt.
 */
async function auswahlScopeErlaubt(
  supabase: ReturnType<typeof createAdminClient>,
  token: string,
  raumProduktId: string,
  scopeIds: string[],
): Promise<boolean> {
  if (scopeIds.includes(raumProduktId)) return true

  // scope_bereich_ids fail-safe nachladen (Spalte könnte fehlen → leer → false)
  const { data: sb } = await supabase
    .from('freigabe_tokens')
    .select('scope_bereich_ids')
    .eq('token', token)
    .maybeSingle()
  const scopeBereichIds = (sb?.scope_bereich_ids as string[] | null) ?? []
  if (scopeBereichIds.length === 0) return false

  // Ziel-Bereich auflösen (Block→Bereich bzw. eigener Bereich)
  const { data: rp } = await supabase
    .from('raum_produkte')
    .select('produkt_gruppe_id, bereich_id')
    .eq('id', raumProduktId)
    .maybeSingle()
  const produkt_gruppe_id = (rp?.produkt_gruppe_id as string | null) ?? null
  const bereich_id = (rp?.bereich_id as string | null) ?? null

  const blockBereich = new Map<string, string | null>()
  if (produkt_gruppe_id) {
    const { data: g } = await supabase
      .from('produkt_gruppen')
      .select('bereich_id')
      .eq('id', produkt_gruppe_id)
      .maybeSingle()
    blockBereich.set(produkt_gruppe_id, (g?.bereich_id as string | null) ?? null)
  }

  return istImAuswahlScope(
    { id: raumProduktId, produkt_gruppe_id, bereich_id },
    scopeIds, scopeBereichIds, blockBereich,
  )
}

/**
 * Freigabe-Status auf raum_produkte setzen (Migration 076).
 * Nimmt raumProduktId statt produktId, damit jede Raum↔Produkt-
 * Kombination ihren eigenen Freigabe-Status bekommt.
 */
export async function freigabeStatusAendern(
  token: string,
  raumProduktId: string,
  status: ProduktStatus,
  kommentar: string
): Promise<FreigabeResult> {
  const supabase = createAdminClient()

  // 1. Token validieren (inkl. Abschluss + Soft-Delete + Scope — Mig 081)
  const { data: tokenData } = await supabase
    .from('freigabe_tokens')
    .select('projekt_id, gueltig_bis, aktiv, deleted_at, abgeschlossen_am, scope_typ, scope_ids')
    .eq('token', token)
    .maybeSingle()

  if (!tokenData || !tokenData.aktiv || tokenData.deleted_at) {
    return { fehler: 'Ungültiger oder zurückgezogener Freigabe-Link.' }
  }
  if (tokenData.gueltig_bis && new Date(tokenData.gueltig_bis) < new Date()) {
    return { fehler: 'Dieser Freigabe-Link ist abgelaufen.' }
  }
  // Nach Abschluss keine Änderungen mehr (Manipulationsschutz)
  if (tokenData.abgeschlossen_am) {
    return { fehler: 'Diese Freigabe wurde bereits abgeschlossen.' }
  }

  // 2. raum_produkte-Eintrag gehört zum Projekt des Tokens
  const { data: rpEintrag } = await supabase
    .from('raum_produkte')
    .select('id, raum_id, raeume!inner(projekt_id)')
    .eq('id', raumProduktId)
    .maybeSingle()

  const projektIdDesEintrags = (rpEintrag?.raeume as unknown as { projekt_id: string } | null)?.projekt_id
  if (!rpEintrag || projektIdDesEintrags !== tokenData.projekt_id) {
    return { fehler: 'Zugriff nicht erlaubt.' }
  }

  // 2b. Scope-Guard (Mig 081): raum/auswahl dürfen nur In-Scope ändern (IDOR-Schutz)
  const scopeTyp = (tokenData.scope_typ as 'projekt' | 'raum' | 'auswahl' | null) ?? 'projekt'
  const scopeIds = (tokenData.scope_ids as string[] | null) ?? []
  if (scopeTyp === 'raum' && scopeIds[0] && rpEintrag.raum_id !== scopeIds[0]) {
    return { fehler: 'Dieses Produkt liegt außerhalb des freigegebenen Bereichs.' }
  }
  if (scopeTyp === 'auswahl' && !(await auswahlScopeErlaubt(supabase, token, raumProduktId, scopeIds))) {
    return { fehler: 'Dieses Produkt liegt außerhalb des freigegebenen Bereichs.' }
  }

  // 3. Status auf raum_produkte aktualisieren (per-Raum)
  const { error } = await supabase
    .from('raum_produkte')
    .update({
      freigabe_status:    status,
      freigabe_kommentar: kommentar.trim() || null,
    })
    .eq('id', raumProduktId)

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  return { erfolg: true }
}

/**
 * Kunde wählt seinen Favoriten innerhalb einer Auswahl-Gruppe (Migration 114).
 * Der gewählte Eintrag wird kunde_favorit=true UND freigegeben; die Geschwister
 * verlieren kunde_favorit und kehren auf 'ausstehend' zurück (NICHT abgelehnt).
 * Status-Änderungen laufen über freigabeStatusSetzen → Audit-Trail (kanal 'token').
 * Öffentlicher Pfad via Admin-Client; Tenancy über Token→Projekt-Ownership + Scope.
 */
export async function freigabeFavoritWaehlen(
  token: string,
  raumProduktId: string,
): Promise<FreigabeResult> {
  const supabase = createAdminClient()

  // 1. Token validieren
  const { data: tokenData } = await supabase
    .from('freigabe_tokens')
    .select('id, projekt_id, gueltig_bis, aktiv, scope_typ, scope_ids, abgeschlossen_am, deleted_at')
    .eq('token', token)
    .single()

  if (!tokenData || !tokenData.aktiv || tokenData.deleted_at) {
    return { fehler: 'Ungültiger oder inaktiver Freigabe-Link.' }
  }
  if (tokenData.gueltig_bis && new Date(tokenData.gueltig_bis) < new Date()) {
    return { fehler: 'Dieser Freigabe-Link ist abgelaufen.' }
  }
  if (tokenData.abgeschlossen_am) {
    return { fehler: 'Diese Freigabe wurde bereits abgeschlossen.' }
  }

  // 2. Zielzeile + Projektzugehörigkeit + Gruppe
  const { data: ziel } = await supabase
    .from('raum_produkte')
    .select('id, raum_id, produkt_gruppe_id, raeume!inner(projekt_id)')
    .eq('id', raumProduktId)
    .maybeSingle()

  const zielProjekt = (ziel?.raeume as unknown as { projekt_id: string } | null)?.projekt_id
  if (!ziel || zielProjekt !== tokenData.projekt_id) {
    return { fehler: 'Zugriff nicht erlaubt.' }
  }
  if (!ziel.produkt_gruppe_id) {
    return { fehler: 'Dieses Produkt gehört zu keiner Auswahl-Gruppe.' }
  }

  // 3. Scope-Guard (Migration 081)
  const scopeTyp = (tokenData.scope_typ as 'projekt' | 'raum' | 'auswahl' | null) ?? 'projekt'
  const scopeIds = (tokenData.scope_ids as string[] | null) ?? []
  if (scopeTyp === 'raum' && scopeIds[0] && ziel.raum_id !== scopeIds[0]) {
    return { fehler: 'Dieses Produkt liegt außerhalb des freigegebenen Bereichs.' }
  }
  if (scopeTyp === 'auswahl' && !(await auswahlScopeErlaubt(supabase, token, raumProduktId, scopeIds))) {
    return { fehler: 'Dieses Produkt liegt außerhalb des freigegebenen Bereichs.' }
  }

  // 4. Geschwister der Gruppe laden
  const { data: geschwister } = await supabase
    .from('raum_produkte')
    .select('id, freigabe_status')
    .eq('produkt_gruppe_id', ziel.produkt_gruppe_id)

  // 5. kunde_favorit clear-before-set (Partial-Unique-Index)
  const { error: clearErr } = await supabase
    .from('raum_produkte')
    .update({ kunde_favorit: false })
    .eq('produkt_gruppe_id', ziel.produkt_gruppe_id)
  if (clearErr) return { fehler: 'Auswahl konnte nicht gespeichert werden.' }

  const { error: setErr } = await supabase
    .from('raum_produkte')
    .update({ kunde_favorit: true })
    .eq('id', raumProduktId)
  if (setErr) return { fehler: 'Auswahl konnte nicht gespeichert werden.' }

  // 6. Freigabe-Kopplung via bestehender Infra (schreibt Audit, kanal 'token')
  const { freigabeStatusSetzen } = await import('./freigaben')
  await freigabeStatusSetzen({
    raumProduktId,
    status: 'freigegeben',
    kommentar: null,
    kanal: 'token',
    kontext: { tokenId: tokenData.id, geaendertVon: 'Kunde (Freigabe-Link)' },
  })

  // 7. Geschwister auf 'ausstehend' zurücksetzen (nicht auto-abgelehnt)
  for (const g of (geschwister ?? []) as { id: string; freigabe_status: string }[]) {
    if (g.id === raumProduktId) continue
    if (g.freigabe_status === 'ausstehend') continue
    await freigabeStatusSetzen({
      raumProduktId: g.id,
      status: 'ausstehend',
      kommentar: 'Andere Alternative gewählt',
      kanal: 'token',
      kontext: { tokenId: tokenData.id, geaendertVon: 'Kunde (Freigabe-Link)' },
    })
  }

  return { erfolg: true }
}

/**
 * Admin setzt Freigabe für einen einzelnen raum_produkte-Eintrag zurück.
 * (Nimmt jetzt raumProduktId statt produktId.)
 */
export async function freigabeZuruecksetzenAdmin(raumProduktId: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('raum_produkte')
    .update({ freigabe_status: 'ausstehend', freigabe_kommentar: null })
    .eq('id', raumProduktId)
    .eq('organisation_id', orgId)
  revalidatePath('/dashboard/freigaben')
}

/**
 * Bulk-Admin-Action: setzt den Freigabe-Status mehrerer raum_produkte gleichzeitig.
 * Wird aus der Freigaben-Dashboard-Auswahl-Toolbar aufgerufen. Schreibt einen
 * Audit-Eintrag pro Item (Kanal 'admin').
 */
export async function freigabeBulkStatusAendernAdmin(
  raumProduktIds: string[],
  neuerStatus: 'ausstehend' | 'freigegeben' | 'abgelehnt' | 'ueberarbeitung',
): Promise<{ erfolg: boolean; anzahl: number; fehler?: string }> {
  if (raumProduktIds.length === 0) return { erfolg: true, anzahl: 0 }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Aktuelle Rolle + User-Email des Admins (für Audit)
  const { data: { user } } = await supabase.auth.getUser()
  const akteur = user?.email ?? 'admin'

  // Snapshot für Audit-Log (alter Status + organisation_id) — org-scoped (defense-in-depth)
  const { data: vorher } = await supabase
    .from('raum_produkte')
    .select('id, organisation_id, freigabe_status')
    .in('id', raumProduktIds)
    .eq('organisation_id', orgId)

  if (!vorher || vorher.length === 0) {
    return { erfolg: false, anzahl: 0, fehler: 'Keine der ausgewählten Einträge gefunden.' }
  }

  // Bulk-Update
  const { error } = await supabase
    .from('raum_produkte')
    .update({
      freigabe_status:    neuerStatus,
      freigabe_kommentar: neuerStatus === 'ausstehend' ? null : undefined,
    })
    .in('id', raumProduktIds)
    .eq('organisation_id', orgId)

  if (error) return { erfolg: false, anzahl: 0, fehler: 'Bulk-Update fehlgeschlagen: ' + error.message }

  // Bulk-Audit-Insert (ein Eintrag pro Item)
  try {
    const auditRows = vorher.map((v) => ({
      organisation_id: v.organisation_id,
      token_id:        null,
      raum_produkt_id: v.id,
      alter_status:    v.freigabe_status,
      neuer_status:    neuerStatus,
      kommentar:       null,
      geaendert_von:   akteur,
      kanal:           'admin' as const,
    }))
    await supabase.from('freigabe_audit').insert(auditRows)
  } catch (err) {
    console.error('[freigabeBulkStatusAendernAdmin] Audit fehlgeschlagen:', err)
    // Nicht fatal — Update war erfolgreich
  }

  revalidatePath('/dashboard/freigaben')
  return { erfolg: true, anzahl: vorher.length }
}
