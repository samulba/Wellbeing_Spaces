import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import PartnerGrid from '@/components/PartnerGrid'
import type { Partner } from '@/lib/supabase/types'

async function getPartner(): Promise<Partner[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('partner').select('*').is('deleted_at', null).order('name')
  return data ?? []
}

export default async function PartnerPage() {
  const partner = await getPartner()

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Partner</h1>
          <p className="text-sm text-gray-500 mt-0.5">{partner.length} Einträge</p>
        </div>
        <Link href="/dashboard/partner/neu"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-medium rounded-lg transition-all duration-200">
          <Plus className="w-4 h-4" />Neuer Partner
        </Link>
      </div>

      {partner.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Noch keine Partner angelegt.</p>
          <Link href="/dashboard/partner/neu" className="inline-block mt-3 text-sm text-wellbeing-green underline underline-offset-2">
            Ersten Partner anlegen
          </Link>
        </div>
      ) : (
        <PartnerGrid partner={partner} />
      )}
    </div>
  )
}
