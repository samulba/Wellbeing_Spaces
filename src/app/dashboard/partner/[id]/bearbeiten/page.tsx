import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PartnerFormular from '@/components/PartnerFormular'
import { partnerAktualisieren } from '@/app/actions/partner'

export default async function PartnerBearbeitenPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: partner } = await supabase
    .from('partner').select('*').eq('id', params.id).is('deleted_at', null).single()

  if (!partner) notFound()

  const aktion = partnerAktualisieren.bind(null, partner.id)

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="mb-8">
        <Link href={`/dashboard/partner/${partner.id}`} className="text-xs text-gray-400 hover:text-wellbeing-green transition-colors mb-3 inline-block">
          ← Zurück zu {partner.name}
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Partner bearbeiten</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <PartnerFormular aktion={aktion} initialData={partner} abbrechen={`/dashboard/partner/${partner.id}`} />
      </div>
    </div>
  )
}
