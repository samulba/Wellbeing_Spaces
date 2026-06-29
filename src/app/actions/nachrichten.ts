'use server'

/**
 * Admin-seitige Server-Actions für den Kunden-Portal-Chat.
 * Portal-Tabellen werden via createAdminClient() angefasst (RLS-Bypass
 * seit Mig. 068), aber jede Query filtert zusätzlich auf organisation_id
 * als Defense-in-Depth. Org-Scope wird via getOrganisationId() aus dem
 * Auth-Context abgeleitet.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ClientNachricht } from '@/lib/supabase/types'


/** Alle Nachrichten eines Projekts (chronologisch) + org-Check. */
export async function getNachrichtenFuerProjekt(projektId: string): Promise<ClientNachricht[]> {
  let orgId: string
  try { orgId = await getOrganisationId() } catch { return [] }
  const admin = createAdminClient()

  const { data } = await admin
    .from('client_nachrichten')
    .select('*')
    .eq('projekt_id', projektId)
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: true })

  return (data ?? []) as ClientNachricht[]
}


/**
 * Markiert alle Kunden-Nachrichten eines Projekts als vom Admin gelesen.
 * Wird beim Öffnen des ChatBlocks aufgerufen.
 */
export async function adminNachrichtenAlsGelesen(projektId: string): Promise<void> {
  let orgId: string
  try { orgId = await getOrganisationId() } catch { return }
  const admin = createAdminClient()

  await admin
    .from('client_nachrichten')
    .update({ gelesen: true, gelesen_am: new Date().toISOString() })
    .eq('projekt_id', projektId)
    .eq('organisation_id', orgId)
    .eq('von_kunde', true)
    .eq('gelesen', false)

  revalidatePath(`/dashboard/projekte/${projektId}`)
}
