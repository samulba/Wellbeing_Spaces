import { createClient } from '@/lib/supabase/server'
import { getAlleMoodboards } from '@/app/actions/moodboard'
import StickyPageHeader from '@/components/StickyPageHeader'
import MoodboardsUebersichtClient, { type RaumOhneMoodboard } from './MoodboardsUebersichtClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getRaeumeOhneMoodboard(): Promise<RaumOhneMoodboard[]> {
  const supabase = await createClient()
  const [raeumeQ, mbQ] = await Promise.all([
    supabase
      .from('raeume')
      .select('id, name, projekt_id, projekte!inner(id, name, kunden(id, name))')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('moodboards')
      .select('raum_id, canvas_json'),
  ])
  const mitInhalt = new Set<string>()
  for (const m of (mbQ.data ?? []) as Array<{ raum_id: string; canvas_json: Record<string, unknown> | null }>) {
    if (m.canvas_json && Object.keys(m.canvas_json).length > 0) {
      mitInhalt.add(m.raum_id)
    }
  }
  type RaumRow = {
    id: string
    name: string
    projekt_id: string
    projekte: { id: string; name: string; kunden: { id: string; name: string } | null } | null
  }
  return ((raeumeQ.data ?? []) as unknown as RaumRow[])
    .filter((r) => !mitInhalt.has(r.id) && r.projekte)
    .map((r) => ({
      id: r.id,
      name: r.name,
      projekt_id: r.projekt_id,
      projekt_name: r.projekte!.name,
      kunde_name: r.projekte!.kunden?.name ?? null,
    }))
}

export default async function MoodboardsUebersichtPage() {
  const [eintraege, raeumeOhneMoodboard] = await Promise.all([
    getAlleMoodboards(),
    getRaeumeOhneMoodboard(),
  ])
  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader
        title="Moodboards"
        count={eintraege.length}
        countLabel={eintraege.length === 1 ? 'Board' : 'Boards'}
        subtitle="Stimme den Stil mit deinem Kunden ab — bevor du konkrete Produkte einkaufst."
      />
      <div className="px-6 py-6">
        <MoodboardsUebersichtClient
          eintraege={eintraege}
          raeumeOhneMoodboard={raeumeOhneMoodboard}
        />
      </div>
    </div>
  )
}
