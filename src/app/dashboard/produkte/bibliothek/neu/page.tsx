import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import ProduktFormular from '@/components/ProduktFormular'
import { produktInBibliothekAnlegen } from '@/app/actions/produkte'
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

export default async function BibliothekNeuesProduktPage() {
  const [partner, mwst] = await Promise.all([getPartner(), getMwstSatz()])

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="mb-8">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/dashboard/produkte" className="hover:text-wellbeing-green transition-colors">
            Produkte
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-600">Neues Produkt · Bibliothek</span>
        </nav>

        <h1 className="text-xl font-semibold text-gray-900">Neues Produkt – Bibliothek</h1>
        <p className="text-sm text-gray-500 mt-1">
          Wird ohne Projekt-Zuordnung angelegt und kann später einem Raum zugewiesen werden.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <ProduktFormular
          aktion={produktInBibliothekAnlegen}
          partner={partner}
          abbrechen="/dashboard/produkte"
          mwst={mwst}
        />
      </div>
    </div>
  )
}
