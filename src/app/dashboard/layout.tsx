import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavSidebar from '@/components/NavSidebar'
import MobileGuard from '@/components/MobileGuard'
import { RolleProvider } from '@/lib/RolleContext'
import { meineRolleAbrufen } from '@/app/actions/team'
import type { Rolle } from '@/lib/supabase/types'
import { getChangelog } from '@/lib/changelog'
import { getGlobalUnreadCount } from '@/app/actions/nachrichten'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ── Auth ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Sekundäre Daten – nie crashen ────────────────────────────
  let freigabenCount = 0
  let anfragenCount  = 0
  let nachrichtenCount = 0
  let reklamationenCount = 0
  let aufgabenCount = 0
  let rolle: Rolle   = 'viewer'
  let userAvatarUrl: string | null = null
  let userVorname:   string | null = null
  let userNachname:  string | null = null

  try {
    const heuteIso = new Date().toISOString().slice(0, 10)
    const [freigabenRes, anfragenRes, rolleRes, meRes, nachrichtenRes, reklamationenRes, aufgabenRes] = await Promise.allSettled([
      supabase
        .from('raum_produkte')
        .select('*', { count: 'exact', head: true })
        .eq('freigabe_status', 'ausstehend'),
      supabase
        .from('onboarding_anfragen')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'offen')
        .not('kunde_name', 'is', null),
      meineRolleAbrufen(),
      supabase
        .from('team_mitglieder')
        .select('avatar_url, vorname, nachname')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle(),
      getGlobalUnreadCount(),
      supabase
        .from('produkt_reklamationen')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'geloest'),
      // Ueberfaellige offene Aufgaben des aktuellen Users (Migration 102)
      supabase
        .from('aufgaben')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_user_id', user.id)
        .neq('status', 'erledigt')
        .lt('faellig_am', heuteIso),
    ])

    freigabenCount     = freigabenRes.status     === 'fulfilled' ? (freigabenRes.value.count     ?? 0) : 0
    anfragenCount      = anfragenRes.status      === 'fulfilled' ? (anfragenRes.value.count      ?? 0) : 0
    rolle              = rolleRes.status         === 'fulfilled' ? rolleRes.value : 'viewer'
    nachrichtenCount   = nachrichtenRes.status   === 'fulfilled' ? nachrichtenRes.value : 0
    reklamationenCount = reklamationenRes.status === 'fulfilled' ? (reklamationenRes.value.count ?? 0) : 0
    aufgabenCount      = aufgabenRes.status      === 'fulfilled' ? (aufgabenRes.value.count      ?? 0) : 0
    if (meRes.status === 'fulfilled' && meRes.value.data) {
      userAvatarUrl = (meRes.value.data.avatar_url as string | null) ?? null
      userVorname   = (meRes.value.data.vorname    as string | null) ?? null
      userNachname  = (meRes.value.data.nachname   as string | null) ?? null
    }
  } catch {
    // Fallback: defaults bleiben – Layout wird trotzdem gerendert
  }

  // Anzeigename-Präferenz: Vor+Nachname > user_metadata.full_name > Email-Prefix
  const vollerName = [userVorname, userNachname].filter(Boolean).join(' ')
  const userName = vollerName
    || (user.user_metadata?.full_name as string | undefined)
    || undefined

  // Neuestes Changelog-Datum für "Neu seit..."-Badge
  const changelog = getChangelog()
  const neuestesChangelogDatum = changelog[0]?.datum ?? null

  return (
    <MobileGuard>
      <RolleProvider rolle={rolle}>
      <div className="flex h-screen bg-gray-50">
        <NavSidebar
          userEmail={user.email ?? ''}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
          userRolle={rolle}
          offeneFreigaben={freigabenCount}
          offeneAnfragen={anfragenCount}
          offeneNachrichten={nachrichtenCount}
          offeneReklamationen={reklamationenCount}
          offeneAufgaben={aufgabenCount}
          neuestesChangelogDatum={neuestesChangelogDatum}
        />
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
      </RolleProvider>
    </MobileGuard>
  )
}
