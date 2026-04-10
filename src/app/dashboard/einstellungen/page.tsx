import { getEinstellungen } from '@/app/actions/einstellungen'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import EinstellungenTabs from '@/components/EinstellungenTabs'

async function getTeamMitglieder() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) return []
    return data.users
  } catch {
    return []
  }
}

export default async function EinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const tab = tabParam ?? 'allgemein'

  const supabase = await createClient()
  const [{ data: { user } }, einstellungen, team] = await Promise.all([
    supabase.auth.getUser(),
    getEinstellungen(),
    getTeamMitglieder(),
  ])

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Einstellungen</h1>
      <EinstellungenTabs
        aktuellerTab={tab}
        einstellungen={einstellungen}
        team={team}
        userEmail={user?.email ?? ''}
        lastSignIn={user?.last_sign_in_at ?? null}
      />
    </div>
  )
}
