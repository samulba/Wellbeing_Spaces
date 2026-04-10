'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Mail, Phone, FolderOpen, Search, LayoutGrid, List } from 'lucide-react'

// ── Typen ─────────────────────────────────────────────────────
export type KundeKarte = {
  id: string
  name: string
  ansprechpartner: string | null
  email: string | null
  telefon: string | null
  projektCount: number
}

// ── Avatar ────────────────────────────────────────────────────
const avatarFarben = [
  'bg-indigo-500', 'bg-violet-500', 'bg-blue-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
]

function avatarFarbe(name: string) {
  return avatarFarben[name.charCodeAt(0) % avatarFarben.length]
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

// ── Komponente ────────────────────────────────────────────────
export default function KundenGrid({ kunden }: { kunden: KundeKarte[] }) {
  const [suche, setSuche] = useState('')
  const [ansicht, setAnsicht] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const gespeichert = localStorage.getItem('kunden-ansicht')
    if (gespeichert === 'list' || gespeichert === 'grid') setAnsicht(gespeichert)
  }, [])

  function toggleAnsicht(neu: 'grid' | 'list') {
    setAnsicht(neu)
    localStorage.setItem('kunden-ansicht', neu)
  }

  const gefiltert = suche.trim()
    ? kunden.filter((k) =>
        k.name.toLowerCase().includes(suche.toLowerCase()) ||
        k.ansprechpartner?.toLowerCase().includes(suche.toLowerCase()) ||
        k.email?.toLowerCase().includes(suche.toLowerCase())
      )
    : kunden

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        {/* Suchfeld */}
        <div className="relative w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Kunden suchen…"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          />
        </div>

        {/* Anzahl */}
        <span className="text-sm text-gray-400">
          {gefiltert.length} {gefiltert.length === 1 ? 'Eintrag' : 'Einträge'}
        </span>

        {/* View Switcher */}
        <div className="ml-auto flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleAnsicht('grid')}
            className={`px-3 py-2 transition-colors ${ansicht === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            title="Kachelansicht"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleAnsicht('list')}
            className={`px-3 py-2 transition-colors border-l border-gray-200 ${ansicht === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            title="Listenansicht"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kein Ergebnis */}
      {gefiltert.length === 0 && suche && (
        <div className="text-center py-16 text-gray-400 text-sm">
          Keine Kunden für &bdquo;{suche}&ldquo; gefunden.
        </div>
      )}

      {/* Karten-Grid */}
      {gefiltert.length > 0 && ansicht === 'grid' && (
        <div className="grid grid-cols-3 gap-5">
          {gefiltert.map((kunde) => {
            const farbe = avatarFarbe(kunde.name)
            const kuerzel = initials(kunde.name)
            return (
              <Link
                key={kunde.id}
                href={`/dashboard/kunden/${kunde.id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200 group flex flex-col gap-4"
              >
                {/* Header: Avatar + Name */}
                <div className="flex items-center gap-3.5">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-[18px] font-bold text-white shrink-0 ${farbe}`}>
                    {kuerzel}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate leading-tight">
                      {kunde.name}
                    </p>
                    {kunde.ansprechpartner && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{kunde.ansprechpartner}</p>
                    )}
                  </div>
                </div>

                {/* Kontaktinfos */}
                <div className="space-y-1.5">
                  {kunde.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{kunde.email}</span>
                    </div>
                  )}
                  {kunde.telefon && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                      <span>{kunde.telefon}</span>
                    </div>
                  )}
                  {!kunde.email && !kunde.telefon && (
                    <p className="text-xs text-gray-300">Keine Kontaktdaten</p>
                  )}
                </div>

                {/* Footer: Projekt-Badge */}
                <div className="pt-1 border-t border-gray-100 flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500 font-medium">
                    {kunde.projektCount === 0
                      ? 'Keine Projekte'
                      : `${kunde.projektCount} Projekt${kunde.projektCount !== 1 ? 'e' : ''}`}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Listen-Ansicht */}
      {gefiltert.length > 0 && ansicht === 'list' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest">Kunde</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest">Ansprechpartner</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest">E-Mail</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest">Telefon</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest">Projekte</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {gefiltert.map((kunde, i) => {
                const farbe = avatarFarbe(kunde.name)
                const kuerzel = initials(kunde.name)
                return (
                  <tr
                    key={kunde.id}
                    className={`hover:bg-gray-50 transition-colors group ${i < gefiltert.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${farbe}`}>
                          {kuerzel}
                        </div>
                        <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{kunde.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{kunde.ansprechpartner ?? '–'}</td>
                    <td className="px-4 py-3.5 text-gray-500">{kunde.email ?? '–'}</td>
                    <td className="px-4 py-3.5 text-gray-500">{kunde.telefon ?? '–'}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                        {kunde.projektCount}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <Link
                        href={`/dashboard/kunden/${kunde.id}`}
                        className="text-xs text-gray-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap"
                      >
                        Öffnen →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
