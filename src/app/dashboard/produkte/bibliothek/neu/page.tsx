import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import ProduktFormular from '@/components/ProduktFormular'
import { produktInBibliothekAnlegen } from '@/app/actions/produkte'
import { getMwstSatz, getKategorien } from '@/app/actions/einstellungen'
import type { Partner, ProduktMitDetails } from '@/lib/supabase/types'

async function getPartner(): Promise<Pick<Partner, 'id' | 'name'>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
  return data ?? []
}

async function getPartnerName(id: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner')
    .select('name')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  return data?.name ?? null
}

export default async function BibliothekNeuesProduktPage({
  searchParams,
}: {
  searchParams: Promise<{ partner_id?: string }>
}) {
  const { partner_id: partnerIdParam } = await searchParams

  const [partner, mwst, kategorienRoh] = await Promise.all([
    getPartner(),
    getMwstSatz(),
    getKategorien('produktkategorie'),
  ])
  const kategorienListe = kategorienRoh.map((k) => ({ name: k.name }))

  // Falls ?partner_id=… gesetzt → Partner vorbelegen (z.B. aus Partner-Detailseite)
  const vorgewaehlterPartner = partnerIdParam
    ? partner.find((p) => p.id === partnerIdParam) ?? null
    : null

  const initialData = vorgewaehlterPartner
    ? ({ partner_id: vorgewaehlterPartner.id } as unknown as ProduktMitDetails)
    : undefined

  // Back-Link: aus Partner-Kontext zurück zum Partner, sonst zur Liste
  const abbrechen = vorgewaehlterPartner
    ? `/dashboard/partner/${vorgewaehlterPartner.id}`
    : '/dashboard/produkte'

  const partnerName = vorgewaehlterPartner
    ? vorgewaehlterPartner.name
    : partnerIdParam ? await getPartnerName(partnerIdParam) : null

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="mb-8">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          {partnerName ? (
            <>
              <Link href="/dashboard/partner" className="hover:text-wellbeing-green transition-colors">
                Partner
              </Link>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/dashboard/partner/${partnerIdParam}`} className="hover:text-wellbeing-green transition-colors">
                {partnerName}
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-600">Neues Produkt</span>
            </>
          ) : (
            <>
              <Link href="/dashboard/produkte" className="hover:text-wellbeing-green transition-colors">
                Produkte
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-600">Neues Produkt · Bibliothek</span>
            </>
          )}
        </nav>

        <h1 className="text-xl font-semibold text-gray-900">
          {partnerName ? `Neues Produkt · ${partnerName}` : 'Neues Produkt – Bibliothek'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {partnerName
            ? `Wird in der Produktbibliothek angelegt und automatisch ${partnerName} zugeordnet.`
            : 'Wird ohne Projekt-Zuordnung angelegt und kann später einem Raum zugewiesen werden.'}
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <ProduktFormular
          aktion={produktInBibliothekAnlegen}
          partner={partner}
          kategorienListe={kategorienListe}
          abbrechen={abbrechen}
          mwst={mwst}
          initialData={initialData}
        />
      </div>
    </div>
  )
}
