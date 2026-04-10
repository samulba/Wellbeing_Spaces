import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProduktFormular from '@/components/ProduktFormular'
import { produktAktualisieren } from '@/app/actions/produkte'
import type { Partner, ProduktMitDetails } from '@/lib/supabase/types'

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

export default async function ProduktBearbeitenPage({
  params,
}: {
  params: { id: string; raumId: string; produktId: string }
}) {
  const [produkt, partner] = await Promise.all([
    getProdukt(params.produktId),
    getPartner(),
  ])

  if (!produkt) notFound()

  const aktion = produktAktualisieren.bind(null, produkt.id, params.raumId, params.id)
  const zurueck = `/dashboard/projekte/${params.id}/raeume/${params.raumId}`

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href={zurueck}
          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors mb-3 inline-block"
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
        />
      </div>
    </div>
  )
}
