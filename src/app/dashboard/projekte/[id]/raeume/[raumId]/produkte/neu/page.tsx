import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProduktFormular from '@/components/ProduktFormular'
import { produktAnlegen } from '@/app/actions/produkte'
import { getMwstSatz } from '@/app/actions/einstellungen'
import type { Partner } from '@/lib/supabase/types'

async function getPartner(): Promise<Pick<Partner, 'id' | 'name'>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
  return data ?? []
}

async function getRaum(raumId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('raeume')
    .select('id, name, projekte(id, name)')
    .eq('id', raumId)
    .is('deleted_at', null)
    .single()
  return data as { id: string; name: string; projekte: { id: string; name: string } | null } | null
}

export default async function NeuesProduktPage({
  params,
}: {
  params: { id: string; raumId: string }
}) {
  const [raum, partner, mwst] = await Promise.all([
    getRaum(params.raumId),
    getPartner(),
    getMwstSatz(),
  ])

  if (!raum) notFound()

  const projekt = raum.projekte
  const aktion = produktAnlegen.bind(null, params.raumId, params.id)
  const zurueck = `/dashboard/projekte/${params.id}/raeume/${params.raumId}`

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="mb-8">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href={`/dashboard/projekte/${params.id}`} className="hover:text-wellbeing-green transition-colors">
            {projekt?.name ?? 'Projekt'}
          </Link>
          <span>›</span>
          <Link href={zurueck} className="hover:text-wellbeing-green transition-colors">
            {raum.name}
          </Link>
          <span>›</span>
          <span className="text-gray-600">Neues Produkt</span>
        </nav>
        <h1 className="text-xl font-semibold text-gray-900">Neues Produkt</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <ProduktFormular
          aktion={aktion}
          partner={partner}
          abbrechen={zurueck}
          mwst={mwst}
        />
      </div>
    </div>
  )
}
