'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, LayoutDashboard, PenTool } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import GrundrissVorschau from '@/components/raumplaner/GrundrissVorschau'
import type { RaumMitProjekt } from './page'

type SortBy = 'name' | 'updated' | 'created'

interface Projekt {
  id: string
  name: string
  kunden: { id: string; name: string } | null
}

interface Props {
  raeume: RaumMitProjekt[]
  projekte: Projekt[]
}

export default function RaumplanerUebersichtClient({ raeume, projekte }: Props) {
  const [searchQuery, setSearchQuery]       = useState('')
  const [selectedProjekt, setSelectedProjekt] = useState('')
  const [sortBy, setSortBy]                 = useState<SortBy>('updated')

  const gefiltert = useMemo(() => {
    let result = [...raeume]

    // Suche
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((r) => r.name.toLowerCase().includes(q))
    }

    // Projekt-Filter
    if (selectedProjekt) {
      result = result.filter((r) => r.projekte?.id === selectedProjekt)
    }

    // Sortierung
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'de'))
    } else if (sortBy === 'updated') {
      result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    } else if (sortBy === 'created') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return result
  }, [raeume, searchQuery, selectedProjekt, sortBy])

  const mitGrundriss  = gefiltert.filter((r) => r.grundriss_json)
  const ohneGrundriss = gefiltert.filter((r) => !r.grundriss_json)

  const totalGrundriss = raeume.filter((r) => r.grundriss_json).length

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Raumplaner</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {raeume.length} {raeume.length === 1 ? 'Raum' : 'Räume'} gesamt
          {' · '}
          {totalGrundriss} mit Grundriss
          {' · '}
          {raeume.length - totalGrundriss} ohne Grundriss
        </p>
      </div>

      {/* Suchfeld + Filter + Sortierung */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Suchfeld */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Raum suchen..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445c49]/30 focus:border-[#445c49] transition-colors"
          />
        </div>

        {/* Projekt-Filter */}
        <select
          value={selectedProjekt}
          onChange={(e) => setSelectedProjekt(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#445c49]/30 focus:border-[#445c49] transition-colors"
        >
          <option value="">Alle Projekte</option>
          {projekte.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Sortierung */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#445c49]/30 focus:border-[#445c49] transition-colors"
        >
          <option value="updated">Zuletzt bearbeitet</option>
          <option value="name">Name A–Z</option>
          <option value="created">Erstelldatum</option>
        </select>
      </div>

      {/* Keine Räume insgesamt */}
      {raeume.length === 0 && (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <LayoutDashboard className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Noch keine Räume vorhanden</p>
          <p className="text-xs text-gray-400 mt-1">Lege zuerst ein Projekt mit Räumen an</p>
          <Link
            href="/dashboard/projekte"
            className="inline-block mt-4 text-sm text-[#445c49] underline underline-offset-2"
          >
            Zu den Projekten
          </Link>
        </div>
      )}

      {/* Keine Treffer nach Filter/Suche */}
      {raeume.length > 0 && gefiltert.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Kein Raum entspricht der Suche</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedProjekt('') }}
            className="mt-3 text-sm text-[#445c49] underline underline-offset-2"
          >
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* Räume mit Grundriss */}
      {mitGrundriss.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Grundrisse
            <span className="ml-2 font-normal text-gray-400 normal-case tracking-normal">({mitGrundriss.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mitGrundriss.map((raum) => (
              <RaumCard key={raum.id} raum={raum} />
            ))}
          </div>
        </section>
      )}

      {/* Räume ohne Grundriss */}
      {ohneGrundriss.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Ohne Grundriss
            <span className="ml-2 font-normal text-gray-400 normal-case tracking-normal">({ohneGrundriss.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ohneGrundriss.map((raum) => (
              <RaumCard key={raum.id} raum={raum} />
            ))}
          </div>
        </section>
      )}

      {/* Projekte-Übersicht unten */}
      {projekte.length > 0 && gefiltert.length > 0 && (
        <section className="mt-10 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Projekte
          </h2>
          <div className="flex flex-wrap gap-2">
            {projekte.map((p) => {
              const count = raeume.filter((r) => r.projekte?.id === p.id).length
              return (
                <Link
                  key={p.id}
                  href={`/dashboard/projekte/${p.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-[#445c49] hover:text-[#445c49] transition-colors"
                >
                  {p.name}
                  <span className="text-xs text-gray-400">{count}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

    </div>
  )
}

// ── Karte ──────────────────────────────────────────────────────

function RaumCard({ raum }: { raum: RaumMitProjekt }) {
  const projekt    = raum.projekte
  const planerHref = `/dashboard/projekte/${raum.projekt_id}/raeume/${raum.id}/planer`
  const raumHref   = `/dashboard/projekte/${raum.projekt_id}/raeume/${raum.id}`

  const bearbeitetVor = formatDistanceToNow(new Date(raum.updated_at), {
    addSuffix: true,
    locale: de,
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">

      {/* Vorschau oder Platzhalter */}
      {raum.grundriss_json ? (
        <Link href={planerHref} className="block">
          <div className="p-3 bg-gray-50 flex justify-center border-b border-gray-100">
            <GrundrissVorschau
              grundrissJson={JSON.stringify(raum.grundriss_json)}
              breiteM={raum.breite_m}
              laengeM={raum.laenge_m}
              vorschauBreite={320}
              className="shadow-sm"
            />
          </div>
        </Link>
      ) : (
        <Link href={planerHref} className="block group">
          <div className="h-36 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-dashed border-2 border-gray-200 flex items-center justify-center transition-colors group-hover:border-[#445c49]/30">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:border-[#445c49]/40 transition-colors">
                <PenTool className="w-4 h-4 text-gray-400 group-hover:text-[#445c49]/60 transition-colors" />
              </div>
              <p className="text-xs font-medium text-gray-500">Noch kein Grundriss</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Klicke auf Planer um zu starten</p>
            </div>
          </div>
        </Link>
      )}

      {/* Infos */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={raumHref}
              className="text-sm font-medium text-gray-900 hover:text-[#445c49] transition-colors truncate block"
            >
              {raum.name}
            </Link>
            {projekt && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{projekt.name}</p>
            )}
            <p className="text-[10px] text-gray-400 mt-1">
              Bearbeitet {bearbeitetVor}
            </p>
            {(raum.breite_m || raum.laenge_m) && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {raum.breite_m ?? '?'} m × {raum.laenge_m ?? '?'} m
                {raum.hoehe_m ? ` · H ${raum.hoehe_m} m` : ''}
              </p>
            )}
          </div>
          <Link
            href={planerHref}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#445c49] hover:bg-[#354a3a] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            <LayoutDashboard className="w-3 h-3" />
            Planer
          </Link>
        </div>
      </div>
    </div>
  )
}
