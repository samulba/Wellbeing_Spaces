'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

// ── Typen ─────────────────────────────────────────────────────
export type FreigabeEintrag = {
  id: string
  name: string
  kategorie: string | null
  menge: number
  einheit: string
  verkaufspreis: number | null
  bild_url: string | null
  created_at: string
  raeume: {
    id: string
    name: string
    projekt_id: string
    projekte: {
      id: string
      name: string
      kunden: { id: string; name: string } | null
    } | null
  } | null
  produktstatus: { status: string; kommentar: string | null } | null
}

type Tab = 'offen' | 'freigegeben' | 'abgelehnt' | 'alle'

const statusBadge: Record<string, string> = {
  ausstehend:     'bg-gray-100 text-gray-500',
  freigegeben:    'bg-emerald-50 text-emerald-700',
  abgelehnt:      'bg-red-50 text-red-600',
  ueberarbeitung: 'bg-amber-50 text-amber-700',
}
const statusLabel: Record<string, string> = {
  ausstehend: 'Ausstehend', freigegeben: 'Freigegeben',
  abgelehnt: 'Abgelehnt', ueberarbeitung: 'Überarbeitung',
}

function isOffen(status: string) { return status === 'ausstehend' || status === 'ueberarbeitung' }

function matchTab(status: string, tab: Tab) {
  if (tab === 'alle') return true
  if (tab === 'offen') return isOffen(status)
  return status === tab
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── Gruppierung ────────────────────────────────────────────────
type ProjektGruppe = {
  projektId: string
  projektName: string
  kundeName: string | null
  kundeId: string | null
  eintraege: FreigabeEintrag[]
  offenCount: number
}

function gruppiereNachProjekt(eintraege: FreigabeEintrag[]): ProjektGruppe[] {
  const map = new Map<string, ProjektGruppe>()

  for (const e of eintraege) {
    const projekt = e.raeume?.projekte
    if (!projekt) continue
    const id = projekt.id

    if (!map.has(id)) {
      map.set(id, {
        projektId:   id,
        projektName: projekt.name,
        kundeName:   projekt.kunden?.name ?? null,
        kundeId:     projekt.kunden?.id   ?? null,
        eintraege:   [],
        offenCount:  0,
      })
    }

    const gruppe = map.get(id)!
    gruppe.eintraege.push(e)
    const status = e.produktstatus?.status ?? 'ausstehend'
    if (isOffen(status)) gruppe.offenCount++
  }

  return Array.from(map.values()).sort((a, b) => b.offenCount - a.offenCount)
}

// ── Komponente ────────────────────────────────────────────────
export default function FreigabenTabelle({ eintraege }: { eintraege: FreigabeEintrag[] }) {
  const [tab, setTab] = useState<Tab>('offen')

  const offenCount = eintraege.filter((e) => isOffen(e.produktstatus?.status ?? 'ausstehend')).length

  const gefiltert = eintraege.filter((e) => {
    const status = e.produktstatus?.status ?? 'ausstehend'
    return matchTab(status, tab)
  })

  const gruppen = gruppiereNachProjekt(gefiltert)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'offen',       label: 'Offen' },
    { key: 'freigegeben', label: 'Freigegeben' },
    { key: 'abgelehnt',   label: 'Abgelehnt' },
    { key: 'alle',        label: 'Alle' },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-0 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}>
            {t.label}
            {t.key === 'offen' && offenCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {offenCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Leerer Zustand */}
      {gruppen.length === 0 && (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
          {tab === 'offen' ? (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-base font-semibold text-gray-800 mb-1">Alle Freigaben erledigt!</p>
              <p className="text-sm text-gray-400">Keine offenen Freigabeanfragen.</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Keine Einträge in dieser Kategorie.</p>
          )}
        </div>
      )}

      {/* Projekt-Gruppen */}
      <div className="space-y-5">
        {gruppen.map((gruppe) => (
          <div key={gruppe.projektId} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Gruppen-Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{gruppe.projektName}</h3>
                  {gruppe.offenCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                      {gruppe.offenCount}
                    </span>
                  )}
                </div>
                {gruppe.kundeName && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {gruppe.kundeId
                      ? <Link href={`/dashboard/kunden/${gruppe.kundeId}`} className="hover:text-indigo-600 transition-colors">{gruppe.kundeName}</Link>
                      : gruppe.kundeName}
                  </p>
                )}
              </div>
              <Link href={`/dashboard/projekte/${gruppe.projektId}`}
                className="text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors whitespace-nowrap">
                Zum Projekt →
              </Link>
            </div>

            {/* Produkt-Liste */}
            <ul className="divide-y divide-gray-100">
              {gruppe.eintraege.map((e) => {
                const status    = e.produktstatus?.status ?? 'ausstehend'
                const kommentar = e.produktstatus?.kommentar
                const kuerzel   = e.name.slice(0, 2).toUpperCase()
                return (
                  <li key={e.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    {/* Thumbnail */}
                    {e.bild_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.bild_url} alt={e.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 shrink-0 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-indigo-400">{kuerzel}</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{e.name}</p>
                        <span className="text-xs text-gray-400">{e.raeume?.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {statusLabel[status] ?? status}
                        </span>
                      </div>
                      {kommentar && (
                        <p className="text-xs text-amber-600 mt-0.5 truncate max-w-lg" title={kommentar}>
                          {kommentar}
                        </p>
                      )}
                    </div>

                    {/* Datum */}
                    <span className="text-xs text-gray-400 shrink-0">{formatDatum(e.created_at)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
