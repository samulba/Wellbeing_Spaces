'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, FolderOpen, Search } from 'lucide-react'

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

  const gefiltert = suche.trim()
    ? kunden.filter((k) =>
        k.name.toLowerCase().includes(suche.toLowerCase()) ||
        k.ansprechpartner?.toLowerCase().includes(suche.toLowerCase()) ||
        k.email?.toLowerCase().includes(suche.toLowerCase())
      )
    : kunden

  return (
    <>
      {/* Suchfeld */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Kunden suchen…"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
        />
      </div>

      {/* Kein Ergebnis */}
      {gefiltert.length === 0 && suche && (
        <div className="text-center py-16 text-gray-400 text-sm">
          Keine Kunden für &bdquo;{suche}&ldquo; gefunden.
        </div>
      )}

      {/* Karten-Grid */}
      {gefiltert.length > 0 && (
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
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center text-[18px] font-bold text-white shrink-0 ${farbe}`}
                  >
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
    </>
  )
}
