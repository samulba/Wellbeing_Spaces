'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Info, Users, FolderOpen, CalendarDays, MessageSquareText } from 'lucide-react'
import type { ReactNode } from 'react'

export type KundeTabId = 'uebersicht' | 'kontakte' | 'projekte' | 'timeline' | 'kommunikation'

const TABS: { id: KundeTabId; label: string; icon: typeof Info }[] = [
  { id: 'uebersicht',    label: 'Übersicht',     icon: Info },
  { id: 'kontakte',      label: 'Kontakte',      icon: Users },
  { id: 'projekte',      label: 'Projekte',      icon: FolderOpen },
  { id: 'timeline',      label: 'Timeline',      icon: CalendarDays },
  { id: 'kommunikation', label: 'Kommunikation', icon: MessageSquareText },
]

export default function KundeDetailTabs({
  uebersicht,
  kontakte,
  projekte,
  timeline,
  kommunikation,
  badgeKontakte,
  badgeProjekte,
  badgeTimeline,
  badgeKommunikation,
}: {
  uebersicht:    ReactNode
  kontakte:      ReactNode
  projekte:      ReactNode
  timeline:      ReactNode
  kommunikation: ReactNode
  badgeKontakte?:      number
  badgeProjekte?:      number
  badgeTimeline?:      number
  badgeKommunikation?: number
}) {
  const router        = useRouter()
  const pathname      = usePathname()
  const searchParams  = useSearchParams()
  const aktiverTab    = (searchParams.get('tab') as KundeTabId) || 'uebersicht'
  const tabIst        = (id: KundeTabId) => aktiverTab === id

  function wechsle(id: KundeTabId) {
    const params = new URLSearchParams(searchParams.toString())
    if (id === 'uebersicht') params.delete('tab')
    else                      params.set('tab', id)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function badgeFor(id: KundeTabId): number | undefined {
    if (id === 'kontakte')      return badgeKontakte
    if (id === 'projekte')      return badgeProjekte
    if (id === 'timeline')      return badgeTimeline
    if (id === 'kommunikation') return badgeKommunikation
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
      {tabIst('uebersicht')    && <div>{uebersicht}</div>}
      {tabIst('kontakte')      && <div>{kontakte}</div>}
      {tabIst('projekte')      && <div>{projekte}</div>}
      {tabIst('timeline')      && <div>{timeline}</div>}
      {tabIst('kommunikation') && <div>{kommunikation}</div>}
    </div>
  )
}
