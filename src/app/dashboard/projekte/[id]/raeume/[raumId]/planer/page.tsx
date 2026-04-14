import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getMoebelSymbole } from '@/app/actions/raumplaner'
import { getRaumProdukte } from '@/app/actions/raum-produkte'
import RaumplanerEditor from '@/components/raumplaner/RaumplanerEditor'
import type { RaumProduktMitDetails } from '@/lib/supabase/types'

interface Props {
  params: { id: string; raumId: string }
}

async function getRaumFuerPlaner(raumId: string, projektId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('raeume')
    .select('id, name, beschreibung, projekt_id, breite_m, laenge_m, hoehe_m, grundriss_json, freigabe_token, freigabe_aktiv, boden_textur, wandfarbe')
    .eq('id', raumId)
    .eq('projekt_id', projektId)
    .is('deleted_at', null)
    .single()
  return data
}

export default async function RaumplanerPage({ params }: Props) {
  const [raum, moebelSymbole, raumProdukte] = await Promise.all([
    getRaumFuerPlaner(params.raumId, params.id),
    getMoebelSymbole(),
    getRaumProdukte(params.raumId),
  ])

  if (!raum) notFound()

  const initialCanvasJson = raum.grundriss_json
    ? JSON.stringify(raum.grundriss_json)
    : null

  // Nur relevante Produktfelder an den Client (keine internen Preise)
  const produkte: Array<{ id: string; name: string; kategorie: string | null }> =
    (raumProdukte as RaumProduktMitDetails[]).map((rp) => ({
      id: rp.produkte.id,
      name: rp.produkte.name,
      kategorie: rp.produkte.kategorie,
    }))

  return (
    <div className="flex-1 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      <RaumplanerEditor
        raumId={raum.id}
        projektId={params.id}
        raumName={raum.name}
        breiteM={raum.breite_m}
        laengeM={raum.laenge_m}
        hoeheM={raum.hoehe_m}
        initialCanvasJson={initialCanvasJson}
        moebelSymbole={moebelSymbole}
        produkte={produkte}
        freigabeToken={raum.freigabe_token as string | null}
        freigabeAktiv={raum.freigabe_aktiv ?? false}
        bodenTextur={raum.boden_textur ?? 'none'}
        wandfarbe={raum.wandfarbe ?? '#1e293b'}
      />
    </div>
  )
}
