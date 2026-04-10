import { getEinstellungen } from '@/app/actions/einstellungen'
import { createAdminClient } from '@/lib/supabase/admin'
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
  const [einstellungen, team] = await Promise.all([
    getEinstellungen(),
    getTeamMitglieder(),
  ])

  const kategorien = einstellungen.produktkategorien
    ? einstellungen.produktkategorien.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  return (
    <div className="px-6 py-6 animate-fadeIn">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Einstellungen</h1>
      <EinstellungenTabs
        aktuellerTab={tab}
        einstellungen={einstellungen}
        kategorien={kategorien}
        team={team}
      />
    </div>
  )
}
