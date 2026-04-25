'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { PartnerKondition, PartnerKonditionTyp, PartnerKontakt, Json } from '@/lib/supabase/types'

export type AltNotizResult = { fehler?: string; erfolg?: boolean }

// ── Auto-Favicon ────────────────────────────────────────────
//
// Wenn der User eine Website hinterlegt aber (noch) kein eigenes Logo hochgeladen
// hat, ziehen wir automatisch das Favicon der Domain als Logo-URL via Google's
// öffentlichen S2-Favicon-Service. Stabil, kein Storage-Upload, sofort sichtbar.
function ableitenFaviconUrl(websiteUrl: string | null | undefined): string | null {
  const w = websiteUrl?.trim()
  if (!w) return null
  try {
    const u = new URL(w.startsWith('http') ? w : `https://${w}`)
    if (!u.hostname) return null
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`
  } catch {
    return null
  }
}

/** Identifiziert URLs, die wir zuvor selbst als Auto-Favicon gesetzt haben. */
function istAutoFavicon(url: string | null | undefined): boolean {
  return !!url && url.startsWith('https://www.google.com/s2/favicons')
}

/**
 * Setzt das Logo automatisch auf das Website-Favicon wenn:
 *  - kein Logo vorhanden, oder
 *  - das vorhandene Logo selbst ein Auto-Favicon ist (Domain könnte sich geändert
 *    haben). Eigene Uploads werden nie überschrieben.
 */
async function applyFaviconIfNeeded(partnerId: string, orgId: string): Promise<void> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('partner')
    .select('logo_url, website')
    .eq('id', partnerId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!row) return

  const aktuell = row.logo_url as string | null
  const website = row.website as string | null

  if (aktuell && !istAutoFavicon(aktuell)) return       // eigenes Logo bewahren
  const favicon = ableitenFaviconUrl(website)
  if (!favicon) return                                  // keine Website → kein Favicon
  if (favicon === aktuell) return                       // schon gleich

  await supabase
    .from('partner')
    .update({ logo_url: favicon })
    .eq('id', partnerId)
    .eq('organisation_id', orgId)
}

export type PartnerActionState = { fehler: string } | null

// ── Partner CRUD ──────────────────────────────────────────────

export async function partnerAnlegen(
  prevState: PartnerActionState,
  formData: FormData
): Promise<PartnerActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const provisionsWertRaw = formData.get('provisions_wert') as string
  const provisionsmodell = (formData.get('provisionsmodell') as string) || null
  const bewertungRaw = formData.get('bewertung') as string
  const zahlungszielRaw = formData.get('zahlungsziel_tage') as string

  // Hinweis: ansprechpartner/email/telefon werden ab Phase B nicht mehr direkt
  // ueber das Formular gepflegt, sondern vom Hauptkontakt im Kontakte-Tab via
  // syncPartnerHauptkontakt() gespiegelt.
  const websiteRaw = (formData.get('website') as string) || null
  const autoFavicon = ableitenFaviconUrl(websiteRaw)
  const { data: angelegt, error } = await supabase.from('partner').insert({
    name: formData.get('name') as string,
    website: websiteRaw,
    logo_url: autoFavicon,
    adresse: (formData.get('adresse') as string) || null,
    provisionsmodell,
    provisions_wert:
      provisionsmodell !== 'Individuell' && provisionsWertRaw
        ? parseFloat(provisionsWertRaw)
        : null,
    einkaufskonditionen: (formData.get('einkaufskonditionen') as string) || null,
    partner_typ: (formData.get('partner_typ') as string) || null,
    zahlungsziel_tage: zahlungszielRaw ? parseInt(zahlungszielRaw) : null,
    iban: (formData.get('iban') as string) || null,
    ust_id: (formData.get('ust_id') as string) || null,
    bewertung: bewertungRaw ? parseInt(bewertungRaw) : null,
    organisation_id: orgId,
  }).select('id').single()

  if (error || !angelegt) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/partner')
  redirect('/dashboard/partner')
}

export async function partnerAktualisieren(
  id: string,
  prevState: PartnerActionState,
  formData: FormData
): Promise<PartnerActionState> {
  const supabase = await createClient()

  const provisionsWertRaw = formData.get('provisions_wert') as string
  const provisionsmodell = (formData.get('provisionsmodell') as string) || null
  const bewertungRaw = formData.get('bewertung') as string
  const zahlungszielRaw = formData.get('zahlungsziel_tage') as string

  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('partner')
    .update({
      name: formData.get('name') as string,
      // ansprechpartner/email/telefon kommen ueber syncPartnerHauptkontakt
      website: (formData.get('website') as string) || null,
      adresse: (formData.get('adresse') as string) || null,
      provisionsmodell,
      provisions_wert:
        provisionsmodell !== 'Individuell' && provisionsWertRaw
          ? parseFloat(provisionsWertRaw)
          : null,
      einkaufskonditionen: (formData.get('einkaufskonditionen') as string) || null,
      partner_typ: (formData.get('partner_typ') as string) || null,
      zahlungsziel_tage: zahlungszielRaw ? parseInt(zahlungszielRaw) : null,
      iban: (formData.get('iban') as string) || null,
      ust_id: (formData.get('ust_id') as string) || null,
      bewertung: bewertungRaw ? parseInt(bewertungRaw) : null,
    })
    .eq('id', id)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  // Auto-Favicon: wenn Website geaendert wurde und kein eigenes Logo gesetzt ist
  await applyFaviconIfNeeded(id, orgId)

  revalidatePath('/dashboard/partner')
  revalidatePath(`/dashboard/partner/${id}`)
  redirect(`/dashboard/partner/${id}`)
}

export async function partnerSoftDelete(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('partner')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)

  revalidatePath('/dashboard/partner')
  redirect('/dashboard/partner')
}

/**
 * Hebt den Inhalt aus dem alten Freitext-Feld `partner.notizen` als regulären
 * Eintrag in die `notizen`-Tabelle und nullt anschliessend das Alt-Feld.
 * Damit verschwindet die "(alt)"-Anzeige ohne Datenverlust.
 */
export async function partnerAltNotizUebernehmen(partnerId: string): Promise<AltNotizResult> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: partner } = await supabase
    .from('partner')
    .select('notizen')
    .eq('id', partnerId)
    .eq('organisation_id', orgId)
    .maybeSingle()

  const inhalt = partner?.notizen?.trim()
  if (!inhalt) return { erfolg: true }

  const { error: insErr } = await supabase.from('notizen').insert({
    typ:             'partner',
    referenz_id:     partnerId,
    inhalt,
    erstellt_von:    user?.email ?? null,
    organisation_id: orgId,
  })
  if (insErr) return { fehler: 'Fehler beim Übernehmen der Notiz.' }

  await supabase
    .from('partner')
    .update({ notizen: null })
    .eq('id', partnerId)
    .eq('organisation_id', orgId)

  revalidatePath(`/dashboard/partner/${partnerId}`)
  return { erfolg: true }
}

// ── Partner-Konditionen ───────────────────────────────────────

export interface KonditionDaten {
  name: string
  typ: PartnerKonditionTyp
  wert: number | null
  staffelung: Json | null
  kategorie_werte: Json | null
  gueltig_von: string | null
  gueltig_bis: string | null
  zahlungsziel_tage: number | null
  skonto_prozent: number | null
  skonto_tage: number | null
  notizen: string | null
  aktiv: boolean
}

export async function getPartnerKonditionen(partnerId: string): Promise<PartnerKondition[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner_konditionen')
    .select('*')
    .eq('partner_id', partnerId)
    .order('aktiv', { ascending: false })
    .order('created_at', { ascending: false })
  return (data ?? []) as PartnerKondition[]
}

export async function konditionAnlegen(
  partnerId: string,
  daten: KonditionDaten
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase.from('partner_konditionen').insert({
    organisation_id: orgId,
    partner_id: partnerId,
    ...daten,
  })

  if (error) return { fehler: 'Fehler beim Anlegen der Kondition.' }

  revalidatePath(`/dashboard/partner/${partnerId}`)
  return {}
}

export async function konditionAktualisieren(
  id: string,
  partnerId: string,
  daten: Partial<KonditionDaten>
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase
    .from('partner_konditionen')
    .update(daten)
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) return { fehler: 'Fehler beim Aktualisieren der Kondition.' }

  revalidatePath(`/dashboard/partner/${partnerId}`)
  return {}
}

export async function konditionLoeschen(
  id: string,
  partnerId: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase
    .from('partner_konditionen')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) return { fehler: 'Fehler beim Löschen der Kondition.' }

  revalidatePath(`/dashboard/partner/${partnerId}`)
  return {}
}

// ── Partner-Kontaktpersonen (Migration 087) ───────────────────

export interface KontaktDaten {
  name:             string
  rolle:            string | null
  email:            string | null
  telefon:          string | null
  mobil:            string | null
  notizen:          string | null
  ist_hauptkontakt: boolean
  reihenfolge?:     number
}

export type KontaktResult = { fehler?: string; erfolg?: boolean }

/**
 * Spiegelt den aktuellen Hauptkontakt in die Legacy-Spalten
 * partner.ansprechpartner / email / telefon zurück, damit Listen-
 * Ansichten und PDFs ohne JOIN funktionieren. Wenn kein Hauptkontakt
 * markiert ist, fällt sie auf den ältesten Kontakt (kleinste Reihenfolge)
 * zurück. Wenn keine Kontakte mehr existieren, werden die Felder genullt.
 */
async function syncPartnerHauptkontakt(partnerId: string, orgId: string): Promise<void> {
  const supabase = await createClient()
  const { data: kontakte } = await supabase
    .from('partner_kontakte')
    .select('name, email, telefon, ist_hauptkontakt, reihenfolge, created_at')
    .eq('partner_id', partnerId)
    .eq('organisation_id', orgId)
    .order('ist_hauptkontakt', { ascending: false })
    .order('reihenfolge', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)

  const primaer = (kontakte ?? [])[0] as { name: string; email: string | null; telefon: string | null } | undefined

  await supabase
    .from('partner')
    .update({
      ansprechpartner: primaer?.name ?? null,
      email:           primaer?.email ?? null,
      telefon:         primaer?.telefon ?? null,
    })
    .eq('id', partnerId)
    .eq('organisation_id', orgId)
}

export async function getPartnerKontakte(partnerId: string): Promise<PartnerKontakt[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner_kontakte')
    .select('*')
    .eq('partner_id', partnerId)
    .order('ist_hauptkontakt', { ascending: false })
    .order('reihenfolge',      { ascending: true })
    .order('created_at',       { ascending: true })
  return (data ?? []) as PartnerKontakt[]
}

export async function kontaktAnlegen(
  partnerId: string,
  daten: KontaktDaten,
): Promise<KontaktResult> {
  if (!daten.name?.trim()) return { fehler: 'Name ist erforderlich.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Wenn Hauptkontakt: vorher alle anderen entmarkieren
  if (daten.ist_hauptkontakt) {
    await supabase
      .from('partner_kontakte')
      .update({ ist_hauptkontakt: false })
      .eq('partner_id', partnerId)
      .eq('organisation_id', orgId)
  }

  const { error } = await supabase.from('partner_kontakte').insert({
    organisation_id: orgId,
    partner_id:      partnerId,
    name:            daten.name.trim(),
    rolle:           daten.rolle?.trim() || null,
    email:           daten.email?.trim() || null,
    telefon:         daten.telefon?.trim() || null,
    mobil:           daten.mobil?.trim() || null,
    notizen:         daten.notizen?.trim() || null,
    ist_hauptkontakt: !!daten.ist_hauptkontakt,
    reihenfolge:     daten.reihenfolge ?? 0,
  })
  if (error) return { fehler: 'Fehler beim Speichern.' }

  await syncPartnerHauptkontakt(partnerId, orgId)
  revalidatePath(`/dashboard/partner/${partnerId}`)
  revalidatePath(`/dashboard/partner`)
  return { erfolg: true }
}

export async function kontaktAktualisieren(
  id: string,
  partnerId: string,
  daten: KontaktDaten,
): Promise<KontaktResult> {
  if (!daten.name?.trim()) return { fehler: 'Name ist erforderlich.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  if (daten.ist_hauptkontakt) {
    await supabase
      .from('partner_kontakte')
      .update({ ist_hauptkontakt: false })
      .eq('partner_id', partnerId)
      .eq('organisation_id', orgId)
      .neq('id', id)
  }

  const { error } = await supabase
    .from('partner_kontakte')
    .update({
      name:             daten.name.trim(),
      rolle:            daten.rolle?.trim() || null,
      email:            daten.email?.trim() || null,
      telefon:          daten.telefon?.trim() || null,
      mobil:            daten.mobil?.trim() || null,
      notizen:          daten.notizen?.trim() || null,
      ist_hauptkontakt: !!daten.ist_hauptkontakt,
      ...(daten.reihenfolge != null ? { reihenfolge: daten.reihenfolge } : {}),
    })
    .eq('id', id)
    .eq('partner_id', partnerId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Aktualisieren.' }

  await syncPartnerHauptkontakt(partnerId, orgId)
  revalidatePath(`/dashboard/partner/${partnerId}`)
  revalidatePath(`/dashboard/partner`)
  return { erfolg: true }
}

export async function kontaktLoeschen(
  id: string,
  partnerId: string,
): Promise<KontaktResult> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase
    .from('partner_kontakte')
    .delete()
    .eq('id', id)
    .eq('partner_id', partnerId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Löschen.' }

  await syncPartnerHauptkontakt(partnerId, orgId)
  revalidatePath(`/dashboard/partner/${partnerId}`)
  revalidatePath(`/dashboard/partner`)
  return { erfolg: true }
}

export async function kontaktAlsHauptkontaktSetzen(
  id: string,
  partnerId: string,
): Promise<KontaktResult> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  await supabase
    .from('partner_kontakte')
    .update({ ist_hauptkontakt: false })
    .eq('partner_id', partnerId)
    .eq('organisation_id', orgId)

  const { error } = await supabase
    .from('partner_kontakte')
    .update({ ist_hauptkontakt: true })
    .eq('id', id)
    .eq('partner_id', partnerId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Setzen.' }

  await syncPartnerHauptkontakt(partnerId, orgId)
  revalidatePath(`/dashboard/partner/${partnerId}`)
  revalidatePath(`/dashboard/partner`)
  return { erfolg: true }
}
