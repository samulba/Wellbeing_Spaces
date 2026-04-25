'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Info, Receipt, FileSignature, Package } from 'lucide-react'
import type { ReactNode } from 'react'

export type PartnerTabId = 'uebersicht' | 'konditionen' | 'vertraege' | 'produkte'

const TABS: { id: PartnerTabId; label: string; icon: typeof Info }[] = [
  { id: 'uebersicht',  label: 'Übersicht',  icon: Info },
  { id: 'konditionen', label: 'Konditionen', icon: Receipt },
  { id: 'vertraege',   label: 'Verträge',    icon: FileSignature },
  { id: 'produkte',    label: 'Produkte',    icon: Package },
]

export default function PartnerDetailTabs({
  uebersicht,
  konditionen,
  vertraege,
  produkte,
  badgeKonditionen,
  badgeVertraege,
  badgeProdukte,
}: {
  uebersicht:  ReactNode
  konditionen: ReactNode
  vertraege:   ReactNode
  produkte:    ReactNode
  badgeKonditionen?: number
  badgeVertraege?:   number
  badgeProdukte?:    number
}) {
  const router        = useRouter()
  const pathname      = usePathname()
  const searchParams  = useSearchParams()
  const aktiverTab    = (searchParams.get('tab') as PartnerTabId) || 'uebersicht'
  const tabIst        = (id: PartnerTabId) => aktiverTab === id

  function wechsle(id: PartnerTabId) {
    const params = new URLSearchParams(searchParams.toString())
    if (id === 'uebersicht') params.delete('tab')
    else                      params.set('tab', id)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function badgeFor(id: PartnerTabId): number | undefined {
    if (id === 'konditionen') return badgeKonditionen
    if (id === 'vertraege')   return badgeVertraege
    if (id === 'produkte')    return badgeProdukte
    return undefined
  }

  return (
    <div>
      {/* Tab-Leiste */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 px-2 py-1.5 flex flex-wrap gap-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const aktiv = tabIst(id)
          const badge = badgeFor(id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => wechsle(id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm rounded-lg font-medium transition-colors ${
                aktiv
                  ? 'bg-wellbeing-green text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {badge != null && badge > 0 && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${
                    aktiv ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab-Inhalt – kein hidden, damit Browser die Scroll-Position pro Tab vergisst */}
      {tabIst('uebersicht')  && <div>{uebersicht}</div>}
      {tabIst('konditionen') && <div>{konditionen}</div>}
      {tabIst('vertraege')   && <div>{vertraege}</div>}
      {tabIst('produkte')    && <div>{produkte}</div>}
    </div>
  )
}
