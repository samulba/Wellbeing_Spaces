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
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/projekte"
          className="text-xs text-stone-400 hover:text-stone-700 transition-colors mb-3 inline-block"
        >
          ← Zurück zu Projekte
        </Link>
        <h1 className="text-xl font-semibold text-stone-800">Neues Projekt</h1>
      </div>

      {kunden.length === 0 ? (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 text-sm text-amber-700">
          Bitte zuerst einen{' '}
          <Link href="/dashboard/kunden/neu" className="underline underline-offset-2">
            Kunden anlegen
          </Link>
          , bevor ein Projekt erstellt werden kann.
        </div>
      ) : (
        <div className="bg-white border border-stone-100 rounded-xl p-6">
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
