import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProjektFormular from '@/components/ProjektFormular'
import { projektAktualisieren } from '@/app/actions/projekte'
import type { Kunde } from '@/lib/supabase/types'

async function getKunden(): Promise<Pick<Kunde, 'id' | 'name'>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('kunden')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
  return data ?? []
}

export default async function ProjektBearbeitenPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const [{ data: projekt }, kunden] = await Promise.all([
    supabase
      .from('projekte')
      .select('*')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single(),
    getKunden(),
  ])

  if (!projekt) notFound()

  const aktion = projektAktualisieren.bind(null, projekt.id)

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="mb-8">
        <Link
          href={`/dashboard/projekte/${projekt.id}`}
          className="text-xs text-gray-400 hover:text-wellbeing-green transition-colors mb-3 inline-block"
        >
          ← Zurück zu {projekt.name}
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Projekt bearbeiten</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <ProjektFormular
          aktion={aktion}
          kunden={kunden}
          initialData={projekt}
          abbrechen={`/dashboard/projekte/${projekt.id}`}
          istBearbeiten
        />
      </div>
    </div>
  )
}
