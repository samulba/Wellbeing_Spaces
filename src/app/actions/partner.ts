'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { PartnerKondition, PartnerKonditionTyp, Json } from '@/lib/supabase/types'

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

  const { error } = await supabase.from('partner').insert({
    name: formData.get('name') as string,
    ansprechpartner: (formData.get('ansprechpartner') as string) || null,
    email: (formData.get('email') as string) || null,
    telefon: (formData.get('telefon') as string) || null,
    website: (formData.get('website') as string) || null,
    provisionsmodell,
    provisions_wert:
      provisionsmodell !== 'Individuell' && provisionsWertRaw
        ? parseFloat(provisionsWertRaw)
        : null,
    einkaufskonditionen: (formData.get('einkaufskonditionen') as string) || null,
    notizen: (formData.get('notizen') as string) || null,
    partner_typ: (formData.get('partner_typ') as string) || null,
    zahlungsziel_tage: zahlungszielRaw ? parseInt(zahlungszielRaw) : null,
    iban: (formData.get('iban') as string) || null,
    ust_id: (formData.get('ust_id') as string) || null,
    bewertung: bewertungRaw ? parseInt(bewertungRaw) : null,
    organisation_id: orgId,
  })

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

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

  const { error } = await supabase
    .from('partner')
    .update({
      name: formData.get('name') as string,
      ansprechpartner: (formData.get('ansprechpartner') as string) || null,
      email: (formData.get('email') as string) || null,
      telefon: (formData.get('telefon') as string) || null,
      website: (formData.get('website') as string) || null,
      provisionsmodell,
      provisions_wert:
        provisionsmodell !== 'Individuell' && provisionsWertRaw
          ? parseFloat(provisionsWertRaw)
          : null,
      einkaufskonditionen: (formData.get('einkaufskonditionen') as string) || null,
      notizen: (formData.get('notizen') as string) || null,
      partner_typ: (formData.get('partner_typ') as string) || null,
      zahlungsziel_tage: zahlungszielRaw ? parseInt(zahlungszielRaw) : null,
      iban: (formData.get('iban') as string) || null,
      ust_id: (formData.get('ust_id') as string) || null,
      bewertung: bewertungRaw ? parseInt(bewertungRaw) : null,
    })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/partner')
  revalidatePath(`/dashboard/partner/${id}`)
  redirect(`/dashboard/partner/${id}`)
}

export async function partnerSoftDelete(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('partner')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/dashboard/partner')
  redirect('/dashboard/partner')
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

  const { error } = await supabase
    .from('partner_konditionen')
    .update(daten)
    .eq('id', id)

  if (error) return { fehler: 'Fehler beim Aktualisieren der Kondition.' }

  revalidatePath(`/dashboard/partner/${partnerId}`)
  return {}
}

export async function konditionLoeschen(
  id: string,
  partnerId: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('partner_konditionen')
    .delete()
    .eq('id', id)

  if (error) return { fehler: 'Fehler beim Löschen der Kondition.' }

  revalidatePath(`/dashboard/partner/${partnerId}`)
  return {}
}
