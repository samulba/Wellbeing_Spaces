import { getEinstellungen } from '@/app/actions/einstellungen'
import { createClient } from '@/lib/supabase/server'
import { teamMitgliederAbrufen, meineRolleAbrufen } from '@/app/actions/team'
import { brandingAbrufen } from '@/app/actions/branding'
import { getVorlagen } from '@/app/actions/vertraege'
import EinstellungenTabs from '@/components/EinstellungenTabs'
import StickyPageHeader from '@/components/StickyPageHeader'
import { getChangelog } from '@/lib/changelog'

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

  const changelog = getChangelog()

  // Avatar-URL + Vor-/Nachname aus team_mitglieder laden (Migrations 061 + 062)
  let userAvatarUrl: string | null = null
  let userVorname:   string | null = null
  let userNachname:  string | null = null
  if (user) {
    const { data: me } = await supabase
      .from('team_mitglieder')
      .select('avatar_url, vorname, nachname')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    userAvatarUrl = (me?.avatar_url as string | null) ?? null
    userVorname   = (me?.vorname    as string | null) ?? null
    userNachname  = (me?.nachname   as string | null) ?? null
  }

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader title="Einstellungen" />
      <div className="px-6 py-6">
        <EinstellungenTabs
          aktuellerTab={tab}
          einstellungen={einstellungen}
          team={team}
          userRolle={userRolle}
          userEmail={user?.email ?? ''}
          userId={user?.id ?? ''}
          userAvatarUrl={userAvatarUrl}
          userVorname={userVorname}
          userNachname={userNachname}
          lastSignIn={user?.last_sign_in_at ?? null}
          branding={branding}
          vorlagen={vorlagen}
          changelog={changelog}
        />
      </div>
    </div>
  )
}
