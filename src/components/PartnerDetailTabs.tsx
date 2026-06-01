'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Info, Users, Receipt, FileSignature, Package } from 'lucide-react'
import type { ReactNode } from 'react'

export type PartnerTabId = 'uebersicht' | 'kontakte' | 'konditionen' | 'vertraege' | 'produkte'

const TABS: { id: PartnerTabId; label: string; icon: typeof Info }[] = [
  { id: 'uebersicht',  label: 'Übersicht',  icon: Info },
  { id: 'kontakte',    label: 'Kontakte',   icon: Users },
  { id: 'konditionen', label: 'Konditionen', icon: Receipt },
  { id: 'vertraege',   label: 'Verträge',    icon: FileSignature },
  { id: 'produkte',    label: 'Produkte',    icon: Package },
]

export default function PartnerDetailTabs({
  uebersicht,
  kontakte,
  konditionen,
  vertraege,
  produkte,
  badgeKontakte,
  badgeKonditionen,
  badgeVertraege,
  badgeProdukte,
}: {
  uebersicht:  ReactNode
  kontakte:    ReactNode
  konditionen: ReactNode
  vertraege:   ReactNode
  produkte:    ReactNode
  badgeKontakte?:    number
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
    if (id === 'kontakte')    return badgeKontakte
    if (id === 'konditionen') return badgeKonditionen
    if (id === 'vertraege')   return badgeVertraege
    if (id === 'produkte')    return badgeProdukte
    return undefined
  }

  return (
    <div>
      {/* Tab-Leiste — Underline-Style, dezent auf Seiten-Hintergrund (kein weißes Band, kein Scrollbar-Konflikt) */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex items-center gap-0 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => {
            const aktiv = tabIst(id)
            const badge = badgeFor(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => wechsle(id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  aktiv
                    ? 'border-wellbeing-green text-wellbeing-green'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${aktiv ? 'text-wellbeing-green' : 'text-gray-400'}`} />
                {label}
                {badge != null && badge > 0 && (
                  <span
                    className={`ml-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${
                      aktiv ? 'bg-wellbeing-green/10 text-wellbeing-green' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab-Inhalt */}
      {tabIst('uebersicht')  && <div>{uebersicht}</div>}
      {tabIst('kontakte')    && <div>{kontakte}</div>}
      {tabIst('konditionen') && <div>{konditionen}</div>}
      {tabIst('vertraege')   && <div>{vertraege}</div>}
      {tabIst('produkte')    && <div>{produkte}</div>}
    </div>
  )
}
