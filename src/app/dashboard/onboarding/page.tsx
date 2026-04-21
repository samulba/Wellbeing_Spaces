import { createClient } from '@/lib/supabase/server'
import { alleVorlagenLaden } from '@/app/actions/onboarding'
import OnboardingTabelle from '@/components/OnboardingTabelle'
import type { OnboardingAnfrage } from '@/lib/supabase/types'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const [{ data }, vorlagen, { data: kunden }] = await Promise.all([
    supabase
      .from('onboarding_anfragen')
      .select('*')
      .order('created_at', { ascending: false }),
    alleVorlagenLaden(),
    supabase
      .from('kunden')
      .select('id, name')
      .is('deleted_at', null)
      .order('name'),
  ])

  const anfragen = (data ?? []) as OnboardingAnfrage[]
  const kundenListe = (kunden ?? []) as { id: string; name: string }[]

  return (
    <div className="flex-1 min-h-0 animate-fadeIn">
      <OnboardingTabelle
        anfragen={anfragen}
        vorlagen={vorlagen}
        kunden={kundenListe}
      />
    </div>
  )
}
