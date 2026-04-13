import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import ProduktFormular from '@/components/ProduktFormular'
import { produktAktualisierenBibliothek } from '@/app/actions/produkte'
import { getMwstSatz } from '@/app/actions/einstellungen'
import type { Partner, ProduktMitDetails } from '@/lib/supabase/types'
import type { Notiz } from '@/components/NotizBlock'

async function getPartner(): Promise<Pick<Partner, 'id' | 'name'>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner').select('id, name').is('deleted_at', null).order('name')
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

export default async function BibliothekProduktBearbeitenPage({
  params,
}: {
  params: { id: string }
}) {
  const [produkt, partner, notizen, mwst] = await Promise.all([
    getProdukt(params.id),
    getPartner(),
    getProduktNotizen(params.id),
    getMwstSatz(),
  ])

  if (!produkt) notFound()

  const aktion  = produktAktualisierenBibliothek.bind(null, produkt.id)
  const zurueck = '/dashboard/produkte'

  return (
    <div className="flex-1 overflow-hidden flex flex-col animate-fadeIn">
      {/* Kompakter Header */}
      <div className="shrink-0 px-6 pt-4 pb-3 border-b border-gray-100 flex items-center gap-3">
        <Link
          href={zurueck}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-wellbeing-green transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Bibliothek
        </Link>
        <span className="text-gray-200">/</span>
        <p className="text-sm font-medium text-gray-700 truncate">{produkt.name}</p>
      </div>

      {/* Formular nimmt den Rest der Höhe ein */}
      <div className="flex-1 overflow-hidden bg-white">
        <ProduktFormular
          aktion={aktion}
          partner={partner}
          initialData={produkt}
          abbrechen={zurueck}
          mwst={mwst}
          notizen={notizen}
          produktId={produkt.id}
        />
      </div>
    </div>
  )
}
