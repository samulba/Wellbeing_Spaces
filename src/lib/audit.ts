'use server'

/**
 * Audit-Log-Helper.
 *
 * Schreibt einen Eintrag in die org-scoped audit_log-Tabelle (Migration 036).
 * Wird in wichtigen Server-Actions aufgerufen — Lösch-/Archiv-Vorgänge,
 * Status-Wechsel, Team-Aktionen, Vertrag-Unterzeichnung etc.
 *
 * Failsafe: Niemals die Haupt-Action crashen wegen Audit-Fehler.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getOrganisationIdOrNull } from '@/lib/supabase/server'

export type AuditAktion =
  // Kunde
  | 'kunde_angelegt' | 'kunde_aktualisiert' | 'kunde_archiviert' | 'kunde_geloescht'
  // Projekt
  | 'projekt_angelegt' | 'projekt_aktualisiert'
  | 'projekt_status_geaendert' | 'projekt_archiviert' | 'projekt_geloescht'
  | 'projekt_dupliziert'
  // Partner
  | 'partner_angelegt' | 'partner_aktualisiert' | 'partner_geloescht'
  // Angebot
  | 'angebot_erstellt' | 'angebot_status_geaendert' | 'angebot_geloescht'
  // Vertrag
  | 'vertrag_erstellt' | 'vertrag_status_geaendert' | 'vertrag_geloescht'
  | 'vertrag_unterzeichnet_kunde' | 'vertrag_unterzeichnet_firma'
  // Team
  | 'team_eingeladen' | 'team_rolle_geaendert' | 'team_deaktiviert' | 'team_reaktiviert'
  // Onboarding
  | 'onboarding_link_erstellt' | 'onboarding_eingereicht' | 'onboarding_geloescht'
  // Freigabe (im Admin)
  | 'freigabe_status_geaendert_admin' | 'freigabe_bulk_aktion'
  // Produkt / Bestellstatus (Migration 100)
  | 'produkt_bestellstatus_geaendert' | 'produkt_datum_aktualisiert'
  // Reklamationen (Migration 100)
  | 'reklamation_angelegt' | 'reklamation_status_geaendert' | 'reklamation_geloest' | 'reklamation_geloescht'
  // Lieferanten-Bestellungen (Migration 100)
  | 'bestellung_angelegt' | 'bestellung_aktualisiert' | 'bestellung_versandt'
  | 'bestellung_geliefert' | 'bestellung_storniert' | 'bestellung_geloescht'
  // Aufgaben (Migration 102)
  | 'aufgabe_angelegt' | 'aufgabe_aktualisiert' | 'aufgabe_status_geaendert'
  | 'aufgabe_kunde_zugewiesen' | 'aufgabe_geloescht'

export type AuditEntitaet =
  | 'kunde' | 'projekt' | 'raum' | 'produkt' | 'partner'
  | 'angebot' | 'vertrag' | 'team_mitglied' | 'onboarding' | 'freigabe'
  | 'reklamation' | 'bestellung' | 'aufgabe'

export async function auditLog(params: {
  aktion:        AuditAktion | string
  entitaet_typ:  AuditEntitaet | string
  entitaet_id?:  string | null
  entitaet_name?: string | null
  details?:      Record<string, unknown> | null
}): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = await getOrganisationIdOrNull()
    if (!orgId) return

    const admin = createAdminClient()
    await admin.from('audit_log').insert({
      organisation_id: orgId,
      user_id:         user?.id ?? null,
      user_email:      user?.email ?? null,
      aktion:          params.aktion,
      entitaet_typ:    params.entitaet_typ,
      entitaet_id:     params.entitaet_id ?? null,
      entitaet_name:   params.entitaet_name ?? null,
      details:         params.details ?? null,
    })
  } catch (e) {
    console.error('[auditLog]', e)
    // niemals Haupt-Action crashen
  }
}
