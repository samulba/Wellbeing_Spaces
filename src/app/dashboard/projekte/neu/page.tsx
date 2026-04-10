import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ProjektFormular from '@/components/ProjektFormular'
import { projektAnlegen } from '@/app/actions/projekte'
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

export default async function NeuesProjektPage({
  searchParams,
}: {
  searchParams: { kunde?: string }
}) {
  const kunden = await getKunden()

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="mb-8">
        <Link
          href="/dashboard/projekte"
          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors mb-3 inline-block"
        >
          ← Zurück zu Projekte
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Neues Projekt</h1>
      </div>

      {kunden.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
          Bitte zuerst einen{' '}
          <Link href="/dashboard/kunden/neu" className="underline underline-offset-2">
            Kunden anlegen
          </Link>
          , bevor ein Projekt erstellt werden kann.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <ProjektFormular
            aktion={projektAnlegen}
            kunden={kunden}
            abbrechen="/dashboard/projekte"
            vorausgewaehlterKundeId={searchParams.kunde}
          />
        </div>
      )}
    </div>
  )
}
