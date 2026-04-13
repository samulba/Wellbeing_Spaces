import { getEinstellungen } from '@/app/actions/einstellungen'
import { createClient } from '@/lib/supabase/server'
import { teamMitgliederAbrufen, meineRolleAbrufen } from '@/app/actions/team'
import { brandingAbrufen } from '@/app/actions/branding'
import { getVorlagen } from '@/app/actions/vertraege'
import EinstellungenTabs from '@/components/EinstellungenTabs'

export default async function EinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const tab = tabParam ?? 'profil'

  const supabase = await createClient()
  const [{ data: { user } }, einstellungen, team, userRolle, branding, vorlagen] = await Promise.all([
    supabase.auth.getUser(),
    getEinstellungen(),
    teamMitgliederAbrufen(),
    meineRolleAbrufen(),
    brandingAbrufen(),
    getVorlagen(),
  ])

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Einstellungen</h1>
      <EinstellungenTabs
        aktuellerTab={tab}
        einstellungen={einstellungen}
        team={team}
        userRolle={userRolle}
        userEmail={user?.email ?? ''}
        userId={user?.id ?? ''}
        lastSignIn={user?.last_sign_in_at ?? null}
        branding={branding}
        vorlagen={vorlagen}
      />
    </div>
  )
}
