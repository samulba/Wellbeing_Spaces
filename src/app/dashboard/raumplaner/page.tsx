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
}

async function getAlleRaeume(): Promise<RaumMitProjekt[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('raeume')
    .select('id, name, beschreibung, breite_m, laenge_m, hoehe_m, grundriss_json, projekt_id, created_at, updated_at, projekte(id, name, kunden(id, name))')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
  return (data ?? []) as unknown as RaumMitProjekt[]
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
