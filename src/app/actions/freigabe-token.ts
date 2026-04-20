'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendMail } from '@/lib/mail'
import { freigabeLinkMail } from '@/lib/mail-templates'

export async function tokenGenerieren(
  projektId: string
): Promise<{ token: string } | { fehler: string }> {
  const supabase = await createClient()

  // Bestehenden aktiven Token zurückgeben falls vorhanden
  const { data: existing } = await supabase
    .from('freigabe_tokens')
    .select('token')
    .eq('projekt_id', projektId)
    .eq('aktiv', true)
    .maybeSingle()

  if (existing) return { token: existing.token }

  const orgId = await getOrganisationId()

  // Neuen Token anlegen (token wird von DB generiert via DEFAULT)
  const { data, error } = await supabase
    .from('freigabe_tokens')
    .insert({ projekt_id: projektId, organisation_id: orgId })
    .select('token')
    .single()

  if (error || !data) return { fehler: 'Token konnte nicht erstellt werden.' }

  revalidatePath(`/dashboard/projekte/${projektId}`)
  return { token: data.token }
}

export async function tokenDeaktivieren(
  tokenId: string,
  projektId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('freigabe_tokens')
    .update({ aktiv: false })
    .eq('id', tokenId)

  revalidatePath(`/dashboard/projekte/${projektId}`)
}

export async function tokenErneuern(
  projektId: string,
  alterTokenId: string
): Promise<{ token: string } | { fehler: string }> {
  const supabase = await createClient()

  // Alten Token deaktivieren
  await supabase
    .from('freigabe_tokens')
    .update({ aktiv: false })
    .eq('id', alterTokenId)

  const orgId = await getOrganisationId()

  // Neuen Token anlegen
  const { data, error } = await supabase
    .from('freigabe_tokens')
    .insert({ projekt_id: projektId, organisation_id: orgId })
    .select('token')
    .single()

  if (error || !data) return { fehler: 'Token konnte nicht erneuert werden.' }

  revalidatePath(`/dashboard/projekte/${projektId}`)
  return { token: data.token }
}


/**
 * Sendet Freigabe-Link per Mail an den Kunden des Projekts.
 * Wird manuell von der UI ausgelöst (nicht automatisch bei tokenGenerieren,
 * weil Designer oft erst prüft bevor der Kunde eine Mail erhalten soll).
 */
export async function freigabeMailVersenden(
  projektId: string,
): Promise<{ mailGesendet: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Aktiven Token laden
  const { data: token } = await supabase
    .from('freigabe_tokens')
    .select('token, gueltig_bis')
    .eq('projekt_id', projektId)
    .eq('organisation_id', orgId)
    .eq('aktiv', true)
    .maybeSingle()

  if (!token) return { mailGesendet: false, fehler: 'Kein aktiver Freigabe-Link vorhanden.' }

  // Projekt + Kunde laden
  const { data: projekt } = await supabase
    .from('projekte')
    .select('name, kunden(name, email)')
    .eq('id', projektId)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)
    .maybeSingle()

  const kundeRaw = projekt?.kunden as unknown as { name: string; email: string | null } | null
  if (!kundeRaw?.email) return { mailGesendet: false, fehler: 'Kunde hat keine E-Mail-Adresse.' }

  // Branding
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
