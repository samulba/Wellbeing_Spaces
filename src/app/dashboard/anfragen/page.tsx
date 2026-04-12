import { createClient } from '@/lib/supabase/server'
import AnfragenTabelle from '@/components/AnfragenTabelle'
import type { OnboardingAnfrage } from '@/lib/supabase/types'

export default async function AnfragenPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_anfragen')
    .select('*')
    .order('created_at', { ascending: false })

  const anfragen = (data ?? []) as OnboardingAnfrage[]

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <AnfragenTabelle anfragen={anfragen} />
    </div>
  )
}
