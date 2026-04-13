import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getVertraege, getVorlagen } from '@/app/actions/vertraege'
import { ChevronRight, FileText } from 'lucide-react'
import VertraegeClient from './VertraegeClient'
import type { ProjektMitKunde } from '@/lib/supabase/types'

async function getProjekt(id: string): Promise<ProjektMitKunde | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projekte')
    .select('*, kunden(id, name, email, telefon, ansprechpartner)')
    .eq('id', id).is('deleted_at', null).single()
  return data as ProjektMitKunde | null
}

export default async function VertraegePage({ params }: { params: { id: string } }) {
  const [projekt, vertraege, vorlagen] = await Promise.all([
    getProjekt(params.id),
    getVertraege(params.id),
    getVorlagen(),
  ])

  if (!projekt) notFound()

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
        <Link href="/dashboard/projekte" className="hover:text-wellbeing-green transition-colors">Projekte</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/dashboard/projekte/${projekt.id}`} className="hover:text-wellbeing-green transition-colors">
          {projekt.name}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-600">Verträge</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-wellbeing-green/10 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-wellbeing-green" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Verträge</h1>
            <p className="text-xs text-gray-400">{projekt.name}</p>
          </div>
        </div>
      </div>

      <VertraegeClient
        projektId={projekt.id}
        kundeId={projekt.kunde_id}
        initialVertraege={vertraege}
        vorlagen={vorlagen}
      />
    </div>
  )
}
