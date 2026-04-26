import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getOrCreateMoodboard } from '@/app/actions/moodboard'
import MoodboardEditor from '@/components/moodboard/MoodboardEditor'

interface Props {
  params: { id: string; raumId: string }
}

async function getRaumFuerMoodboard(raumId: string, projektId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('raeume')
    .select('id, name, projekt_id')
    .eq('id', raumId)
    .eq('projekt_id', projektId)
    .is('deleted_at', null)
    .single()
  return data
}

async function getProdukteFuerMoodboard() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('produkte')
    .select('id, name, kategorie, bild_url, verkaufspreis')
    .is('deleted_at', null)
    .order('name')
  return (data ?? []) as Array<{
    id: string
    name: string
    kategorie: string | null
    bild_url: string | null
    verkaufspreis: number | null
  }>
}

export default async function MoodboardPage({ params }: Props) {
  const [raum, moodboard, produkte] = await Promise.all([
    getRaumFuerMoodboard(params.raumId, params.id),
    getOrCreateMoodboard(params.raumId),
    getProdukteFuerMoodboard(),
  ])

  if (!raum || !moodboard) notFound()

  return (
    <div className="flex-1 overflow-hidden flex flex-col" style={{ height: '100vh' }}>
      <MoodboardEditor
        moodboardId={moodboard.id}
        raumId={raum.id}
        projektId={params.id}
        raumName={raum.name}
        boardName={moodboard.name}
        beschreibung={moodboard.beschreibung}
        initialCanvasJson={moodboard.canvas_json}
        freigabeAktiv={moodboard.freigabe_aktiv}
        freigabeKommentareAktiv={moodboard.freigabe_kommentare_aktiv}
        freigabeToken={moodboard.freigabe_token}
        freigabePasswortGesetzt={!!moodboard.freigabe_passwort_hash}
        freigabeAblauf={moodboard.freigabe_ablauf ?? null}
        produkte={produkte}
      />
    </div>
  )
}
