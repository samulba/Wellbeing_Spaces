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

  // Wenn jetzt beide unterschrieben → Bestellungs-Entwuerfe anlegen
  if (neuerStatus === 'unterschrieben_beide' && vertrag.projekt_id) {
    void erzeugeBestellungsEntwuerfe(vertrag.projekt_id, supabase)
  }

  if (vertrag.projekt_id) {
    revalidatePath(`/dashboard/projekte/${vertrag.projekt_id}/vertraege`)
  }
  return {}
}

// ── Helper: Vertrag-Hook → Bestellungs-Entwuerfe pro Lieferant ──
/** Erzeugt pro Lieferant einen Bestellungs-Entwurf mit allen freigegebenen
 *  + ausstehenden raum_produkten des Projekts. Idempotent: wenn der Lieferant
 *  schon einen Entwurf bei diesem Projekt hat, wird die Position dort angehaengt. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function erzeugeBestellungsEntwuerfe(projektId: string, supabase: any) {
  try {
    // Alle raum_produkte des Projekts mit Status 'freigegeben' und 'ausstehend' bestellen
    const { data: rps } = await supabase
      .from('raum_produkte')
      .select(`
        id, organisation_id,
        produkte!inner(id, partner_id, einkaufspreis),
        raeume!inner(projekt_id)
      `)
      .eq('raeume.projekt_id', projektId)
      .eq('freigabe_status', 'freigegeben')
      .eq('bestellstatus', 'ausstehend')
      // raum_produkte hat KEINE deleted_at-Spalte (Hard-Delete, Mig 101) → nicht filtern.
    if (!rps || rps.length === 0) return

    // Gruppieren nach Partner-ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byPartner = new Map<string, { orgId: string; positionen: Array<{ raum_produkt_id: string; einkaufspreis: number }> }>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const rp of (rps as any[])) {
      const partnerId = rp.produkte?.partner_id
      if (!partnerId) continue
      const eintrag = byPartner.get(partnerId)
      const pos = { raum_produkt_id: rp.id, einkaufspreis: rp.produkte?.einkaufspreis ?? 0 }
      if (eintrag) eintrag.positionen.push(pos)
      else byPartner.set(partnerId, { orgId: rp.organisation_id, positionen: [pos] })
    }

    // Pro Partner Entwurf anlegen ODER an existierenden anhaengen
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const [partnerId, { orgId, positionen }] of Array.from(byPartner.entries())) {
      // Existierender Entwurf bei diesem Partner+Projekt?
      const { data: existing } = await supabase
        .from('lieferanten_bestellungen')
        .select('id')
        .eq('partner_id', partnerId)
        .eq('projekt_id', projektId)
        .eq('status', 'entwurf')
        .maybeSingle()

      let bestellungId: string | null = existing?.id ?? null

      if (!bestellungId) {
        // Bestellnummer
        const { data: nr } = await supabase.rpc('naechste_bestellnummer', { org_id: orgId })
        const { data: neu } = await supabase
          .from('lieferanten_bestellungen')
          .insert({
            organisation_id: orgId,
            partner_id:      partnerId,
            projekt_id:      projektId,
            bestellnummer:   typeof nr === 'string' ? nr : null,
            status:          'entwurf',
            notizen:         'Auto-Entwurf nach Vertrag-Unterschrift',
          })
          .select('id')
          .single()
        bestellungId = neu?.id ?? null
      }
      if (!bestellungId) continue

      // Positionen einfuegen (ON CONFLICT DO NOTHING simulieren via select-then-insert)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = positionen.map((p) => ({
        organisation_id:    orgId,
        bestellung_id:      bestellungId,
        raum_produkt_id:    p.raum_produkt_id,
        menge:              1,
        einzelpreis_netto:  p.einkaufspreis,
        reihenfolge:        0,
      }))
      await supabase
        .from('lieferanten_bestellung_positionen')
        .upsert(rows, { onConflict: 'bestellung_id,raum_produkt_id', ignoreDuplicates: true })

      // Gesamtsumme rekalkulieren
      const { data: posData } = await supabase
        .from('lieferanten_bestellung_positionen')
        .select('menge, einzelpreis_netto')
        .eq('bestellung_id', bestellungId)
      const summe = (posData ?? []).reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: number, p: any) => s + (Number(p.menge) || 0) * (Number(p.einzelpreis_netto) || 0),
        0,
      )
      await supabase
        .from('lieferanten_bestellungen')
        .update({ gesamtpreis_netto: Math.round(summe * 100) / 100 })
        .eq('id', bestellungId)
    }
  } catch (e) {
    console.error('[erzeugeBestellungsEntwuerfe]', e)
    // never crash main action
  }
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

  // Wenn jetzt beide unterschrieben → Bestellungs-Entwuerfe anlegen
  if (neuerStatus === 'unterschrieben_beide' && vertrag.projekt_id) {
    void erzeugeBestellungsEntwuerfe(vertrag.projekt_id, supabase)
  }

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

  // Timeline-Auto-Sync: Vertrag zur Unterschrift
  if (vertrag.projekt_id) {
    try {
      const { syncAutoEvent } = await import('./timeline')
      const heute = new Date().toISOString().split('T')[0]
      await syncAutoEvent('vertrag', vertragId, vertrag.projekt_id, {
        titel:       `Vertrag zur Unterschrift: ${vertrag.titel}`,
        typ:         'termin',
        start_datum: heute,
        end_datum:   gueltigBis.toISOString().split('T')[0],
      })
    } catch (err) {
      console.error('[signaturTokenErstellen:syncAutoEvent]', err)
    }
  }

  return { token, mailGesendet }
}
