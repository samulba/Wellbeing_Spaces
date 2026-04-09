import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import KundeFormular from '@/components/KundeFormular'
import { kundeAktualisieren } from '@/app/actions/kunden'

export default async function KundeBearbeitenPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: kunde } = await supabase
    .from('kunden')
    .select('*')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!kunde) notFound()

  const aktion = kundeAktualisieren.bind(null, kunde.id)

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/dashboard/kunden/${kunde.id}`}
          className="text-xs text-stone-400 hover:text-stone-700 transition-colors mb-3 inline-block"
        >
          ← Zurück zu {kunde.name}
        </Link>
        <h1 className="text-xl font-semibold text-stone-800">Kunde bearbeiten</h1>
      </div>

      <div className="bg-white border border-stone-100 rounded-xl p-6">
        <KundeFormular
          aktion={aktion}
          initialData={kunde}
          abbrechen={`/dashboard/kunden/${kunde.id}`}
        />
      </div>
    </div>
  )
}
