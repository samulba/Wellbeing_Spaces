import { createClient } from '@/lib/supabase/server'
import RaumplanerUebersichtClient from './RaumplanerUebersichtClient'

export type RaumMitProjekt = {
  id: string
  name: string
  beschreibung: string | null
  breite_m: number | null
  laenge_m: number | null
  hoehe_m: number | null
  grundriss_json: Record<string, unknown> | null
  projekt_id: string
  created_at: string
  updated_at: string
  projekte: {
    id: string
    name: string
    kunden: { id: string; name: string } | null
  } | null
  /** Migration 096: gibt es ein Moodboard fuer diesen Raum? */
  hat_moodboard?: boolean
}

async function getAlleRaeume(): Promise<RaumMitProjekt[]> {
  const supabase = await createClient()
  const [raeumeQ, moodboardsQ] = await Promise.all([
    supabase
      .from('raeume')
      .select('id, name, beschreibung, breite_m, laenge_m, hoehe_m, grundriss_json, projekt_id, created_at, updated_at, projekte(id, name, kunden(id, name))')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
    // Lookup welche Räume ein Moodboard mit Inhalt haben
    supabase
      .from('moodboards')
      .select('raum_id, canvas_json'),
  ])

  const moodboardSet = new Set<string>()
  for (const m of (moodboardsQ.data ?? []) as Array<{ raum_id: string; canvas_json: Record<string, unknown> | null }>) {
    if (m.canvas_json && Object.keys(m.canvas_json).length > 0) {
      moodboardSet.add(m.raum_id)
    }
  }

  const raeume = (raeumeQ.data ?? []) as unknown as RaumMitProjekt[]
  return raeume.map((r) => ({ ...r, hat_moodboard: moodboardSet.has(r.id) }))
}

export default async function RaumplanerUebersichtPage() {
  const raeume = await getAlleRaeume()

  const projekte = Array.from(
    new Map(
      raeume
        .filter((r) => r.projekte)
        .map((r) => [r.projekte!.id, r.projekte!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name, 'de'))

  return (
    <RaumplanerUebersichtClient raeume={raeume} projekte={projekte} />
  )
}
