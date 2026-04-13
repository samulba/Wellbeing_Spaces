'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type PartnerActionState = { fehler: string } | null

export async function partnerAnlegen(
  prevState: PartnerActionState,
  formData: FormData
): Promise<PartnerActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const provisionsWertRaw = formData.get('provisions_wert') as string
  const provisionsmodell = (formData.get('provisionsmodell') as string) || null

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
