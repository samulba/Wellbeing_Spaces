'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Vertrag } from '@/lib/supabase/types'
import { randomBytes } from 'crypto'
import { sendMail } from '@/lib/mail'
import { vertragSignaturMail } from '@/lib/mail-templates'

// ── Öffentlich: Vertrag über Signatur-Token laden ─────────────

export interface VertragFuerSignaturResult {
  vertrag: Pick<Vertrag, 'id' | 'titel' | 'inhalt_html' | 'status' | 'signatur_kunde_datum' | 'signatur_firma_datum' | 'signatur_token_gueltig'>
  fehler?: never
}
export interface VertragFuerSignaturFehler {
  fehler: string
  vertrag?: never
}

export async function vertragFuerSignatur(
  token: string
): Promise<VertragFuerSignaturResult | VertragFuerSignaturFehler> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('vertraege')
    .select('id, titel, inhalt_html, status, signatur_kunde_datum, signatur_firma_datum, signatur_token_gueltig')
    .eq('signatur_token', token)
    .single()

  if (error || !data) return { fehler: 'Dieser Signatur-Link ist ungültig.' }

  if (data.signatur_token_gueltig && new Date(data.signatur_token_gueltig) < new Date()) {
    return { fehler: 'Dieser Signatur-Link ist abgelaufen.' }
  }

  if (data.signatur_kunde_datum) {
    return { fehler: 'Dieser Vertrag wurde bereits unterschrieben.' }
  }

  return { vertrag: data }
}

// ── Öffentlich: Kunde unterschreibt ──────────────────────────

export async function vertragUnterschreiben(
  token: string,
  signaturDataUrl: string
): Promise<{ fehler?: string }> {
  if (!signaturDataUrl.startsWith('data:image/png;base64,')) {
    return { fehler: 'Ungültiges Signaturformat.' }
  }

  const supabase = createAdminClient()

  // Nochmals prüfen, ob Token valide
  const { data: vertrag, error: ladeErr } = await supabase
    .from('vertraege')
    .select('id, status, signatur_kunde_datum, signatur_firma_datum, signatur_token_gueltig, projekt_id')
    .eq('signatur_token', token)
    .single()

  if (ladeErr || !vertrag) return { fehler: 'Vertrag nicht gefunden.' }
  if (vertrag.signatur_kunde_datum) return { fehler: 'Bereits unterschrieben.' }
  if (vertrag.signatur_token_gueltig && new Date(vertrag.signatur_token_gueltig) < new Date()) {
    return { fehler: 'Link abgelaufen.' }
  }

  const neuerStatus = vertrag.signatur_firma_datum ? 'unterschrieben_beide' : 'unterschrieben_kunde'

  const { error } = await supabase
    .from('vertraege')
    .update({
      signatur_kunde_url: signaturDataUrl,
      signatur_kunde_datum: new Date().toISOString(),
      status: neuerStatus,
    })
    .eq('id', vertrag.id)

  if (error) return { fehler: 'Fehler beim Speichern der Unterschrift.' }

  if (vertrag.projekt_id) {
    revalidatePath(`/dashboard/projekte/${vertrag.projekt_id}/vertraege`)
  }
  return {}
}

// ── Authentifiziert: Firma unterschreibt ─────────────────────

export async function firmaUnterschreiben(
  vertragId: string,
  signaturDataUrl: string
): Promise<{ fehler?: string }> {
  if (!signaturDataUrl.startsWith('data:image/png;base64,')) {
    return { fehler: 'Ungültiges Signaturformat.' }
  }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { data: vertrag, error: ladeErr } = await supabase
    .from('vertraege')
    .select('id, signatur_firma_datum, signatur_kunde_datum, projekt_id')
    .eq('id', vertragId)
    .eq('organisation_id', orgId)
    .single()

  if (ladeErr || !vertrag) return { fehler: 'Vertrag nicht gefunden.' }

  const neuerStatus = vertrag.signatur_kunde_datum ? 'unterschrieben_beide' : 'entwurf'

  const { error } = await supabase
    .from('vertraege')
    .update({
      signatur_firma_url: signaturDataUrl,
      signatur_firma_datum: new Date().toISOString(),
      status: neuerStatus,
    })
    .eq('id', vertragId)
    .eq('organisation_id', orgId)

  if (error) return { fehler: 'Fehler beim Speichern der Unterschrift.' }

  if (vertrag.projekt_id) {
    revalidatePath(`/dashboard/projekte/${vertrag.projekt_id}/vertraege`)
  }
  return {}
}

// ── Authentifiziert: Signatur-Token generieren ────────────────

export async function signaturTokenErstellen(
  vertragId: string
): Promise<{ token?: string; fehler?: string; mailGesendet?: boolean }> {
  const supabase = await createClient()

  const token = randomBytes(32).toString('hex')
  const gueltigBis = new Date()
  gueltigBis.setDate(gueltigBis.getDate() + 30)

  const orgId = await getOrganisationId()

  const { data: vertrag, error: ladeErr } = await supabase
    .from('vertraege')
    .select('id, projekt_id, titel, kunden(name, email)')
    .eq('id', vertragId)
    .eq('organisation_id', orgId)
    .single()

  if (ladeErr || !vertrag) return { fehler: 'Vertrag nicht gefunden.' }

  const { error } = await supabase
    .from('vertraege')
    .update({
      signatur_token: token,
      signatur_token_gueltig: gueltigBis.toISOString(),
      status: 'gesendet',
      gesendet_am: new Date().toISOString(),
    })
    .eq('id', vertragId)
    .eq('organisation_id', orgId)

  if (error) return { fehler: 'Fehler beim Erstellen des Tokens.' }

  if (vertrag.projekt_id) {
    revalidatePath(`/dashboard/projekte/${vertrag.projekt_id}/vertraege`)
  }

  // Mail an Kunde mit Signatur-Link
  let mailGesendet = false
  const kundeRaw = vertrag.kunden as unknown as { name: string; email: string | null } | null
  if (kundeRaw?.email) {
    const { data: branding } = await supabase
      .from('branding')
      .select('firmenname, primary_color')
      .maybeSingle()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const tpl = vertragSignaturMail({
      empfaengerName: kundeRaw.name,
      vertragTitel:   vertrag.titel,
      linkUrl:        `${baseUrl}/vertrag/${token}`,
      gueltigBis:     gueltigBis.toISOString(),
      branding:       branding ?? undefined,
    })
    const res = await sendMail({ to: kundeRaw.email, subject: tpl.subject, html: tpl.html })
    mailGesendet = res.sent
  }

  return { token, mailGesendet }
}
