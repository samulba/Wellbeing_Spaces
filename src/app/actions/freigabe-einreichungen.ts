'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import type { FreigabeEinreichung } from '@/lib/supabase/types'

/**
 * Unveränderliche Einreichungs-Belege (Migration 125). Read-only — die Belege
 * werden ausschließlich beim Absenden einer Freigabe (freigabeAbsenden) erzeugt
 * und nie verändert. Org-scoped (RLS + expliziter Filter, defense-in-depth).
 */

/** Alle Belege eines Projekts (neueste zuerst). Fail-safe: fehlt die Tabelle → []. */
export async function getFreigabeEinreichungen(projektId: string): Promise<FreigabeEinreichung[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data, error } = await supabase
    .from('freigabe_einreichungen')
    .select('*')
    .eq('projekt_id', projektId)
    .eq('organisation_id', orgId)
    .order('abgesendet_am', { ascending: false })
  if (error) return []
  return (data ?? []) as FreigabeEinreichung[]
}

/** Einzelnen Beleg laden (org-scoped). */
export async function getFreigabeEinreichung(id: string): Promise<FreigabeEinreichung | null> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('freigabe_einreichungen')
    .select('*')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .maybeSingle()
  return (data as FreigabeEinreichung | null) ?? null
}
