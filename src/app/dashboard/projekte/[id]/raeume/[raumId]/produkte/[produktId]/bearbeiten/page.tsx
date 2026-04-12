import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProduktFormular from '@/components/ProduktFormular'
import { produktAktualisieren } from '@/app/actions/produkte'
import { getMwstSatz } from '@/app/actions/einstellungen'
import type { Partner, ProduktMitDetails } from '@/lib/supabase/types'
import NotizBlock, { type Notiz } from '@/components/NotizBlock'

async function getPartner(): Promise<Pick<Partner, 'id' | 'name'>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
  return data ?? []
}

async function getProdukt(produktId: string): Promise<ProduktMitDetails | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('produkte')
    .select('*, partner(id, name), produktstatus(status, kommentar)')
    .eq('id', produktId)
    .is('deleted_at', null)
    .single()
  return data as ProduktMitDetails | null
}

async function getProduktNotizen(produktId: string): Promise<Notiz[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notizen')
    .select('id, inhalt, erstellt_von, erstellt_am, bearbeitet_am')
    .eq('typ', 'produkt')
    .eq('referenz_id', produktId)
    .is('deleted_at', null)
    .order('erstellt_am', { ascending: false })
  return (data ?? []) as Notiz[]
}

export default async function ProduktBearbeitenPage({
  params,
}: {
  params: { id: string; raumId: string; produktId: string }
}) {
  const [produkt, partner, notizen, mwst] = await Promise.all([
    getProdukt(params.produktId),
    getPartner(),
    getProduktNotizen(params.produktId),
    getMwstSatz(),
  ])

  if (!produkt) notFound()

  const aktion = produktAktualisieren.bind(null, produkt.id, params.raumId, params.id)
  const zurueck = `/dashboard/projekte/${params.id}/raeume/${params.raumId}`

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="mb-8">
        <Link
          href={zurueck}
          className="text-xs text-gray-400 hover:text-wellbeing-green transition-colors mb-3 inline-block"
        >
          ← Zurück zum Raum
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Produkt bearbeiten</h1>
        <p className="text-sm text-gray-500 mt-0.5">{produkt.name}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <ProduktFormular
          aktion={aktion}
          partner={partner}
          initialData={produkt}
          abbrechen={zurueck}
          mwst={mwst}
        />
      </div>

      <div className="mt-6">
        <NotizBlock typ="produkt" referenzId={produkt.id} initialNotizen={notizen} />
      </div>
    </div>
  )
}
