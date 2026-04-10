'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink, ChevronUp, ChevronDown, Search, X } from 'lucide-react'
import type { ProduktStatus } from '@/lib/supabase/types'

export type ProduktZeile = {
  id: string
  name: string
  kategorie: string | null
  menge: number
  einheit: string
  verkaufspreis: number | null
  bild_url: string | null
  produkt_url: string | null
  partnerName: string | null
  partnerId: string | null
  raumId: string
  raumName: string
  projektId: string
  projektName: string
  kundeName: string
  status: ProduktStatus
}

// ── Helpers ───────────────────────────────────────────────────
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

const MWST = 0.19

const STATUS_CFG: Record<ProduktStatus, { label: string; cls: string }> = {
  ausstehend:     { label: 'Ausstehend',    cls: 'bg-gray-100 text-gray-600' },
  freigegeben:    { label: 'Freigegeben',   cls: 'bg-emerald-100 text-emerald-700' },
  abgelehnt:      { label: 'Abgelehnt',     cls: 'bg-red-100 text-red-600' },
  ueberarbeitung: { label: 'Überarbeitung', cls: 'bg-amber-100 text-amber-700' },
}

type SortKey = 'name' | 'verkaufspreis' | 'status' | 'projekt'
type SortDir = 'asc' | 'desc'

// ── Komponente ────────────────────────────────────────────────
export default function ProdukteTabelle({ produkte }: { produkte: ProduktZeile[] }) {
  const [suche, setSuche]           = useState('')
  const [filterProjekt, setFilterProjekt] = useState('')
  const [filterKategorie, setFilterKategorie] = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterPartner, setFilterPartner]  = useState('')
  const [sortKey, setSortKey]       = useState<SortKey>('name')
  const [sortDir, setSortDir]       = useState<SortDir>('asc')

  // Unique filter options
  const projekte   = useMemo(() => Array.from(new Set(produkte.map((p) => p.projektName))).sort(), [produkte])
  const kategorien = useMemo(() => Array.from(new Set(produkte.map((p) => p.kategorie).filter(Boolean) as string[])).sort(), [produkte])
  const partner    = useMemo(() => Array.from(new Set(produkte.map((p) => p.partnerName).filter(Boolean) as string[])).sort(), [produkte])

  const gefiltert = useMemo(() => {
    let liste = produkte

    if (suche) {
      const q = suche.toLowerCase()
      liste = liste.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.projektName.toLowerCase().includes(q) ||
        p.raumName.toLowerCase().includes(q) ||
        (p.kategorie ?? '').toLowerCase().includes(q) ||
        (p.partnerName ?? '').toLowerCase().includes(q)
      )
    }
    if (filterProjekt)   liste = liste.filter((p) => p.projektName === filterProjekt)
    if (filterKategorie) liste = liste.filter((p) => p.kategorie   === filterKategorie)
    if (filterStatus)    liste = liste.filter((p) => p.status       === filterStatus)
    if (filterPartner)   liste = liste.filter((p) => p.partnerName  === filterPartner)

    liste = [...liste].sort((a, b) => {
      let v = 0
      if (sortKey === 'name')          v = a.name.localeCompare(b.name)
      if (sortKey === 'verkaufspreis') v = (a.verkaufspreis ?? 0) - (b.verkaufspreis ?? 0)
      if (sortKey === 'status')        v = a.status.localeCompare(b.status)
      if (sortKey === 'projekt')       v = a.projektName.localeCompare(b.projektName)
      return sortDir === 'asc' ? v : -v
    })

    return liste
  }, [produkte, suche, filterProjekt, filterKategorie, filterStatus, filterPartner, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-indigo-500" />
      : <ChevronDown className="w-3 h-3 text-indigo-500" />
  }

  const activeFilters = [filterProjekt, filterKategorie, filterStatus, filterPartner].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Suchleiste + Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Suche */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Produkt, Projekt, Raum, Kategorie…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* Filter-Dropdowns */}
        <select value={filterProjekt} onChange={(e) => setFilterProjekt(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">Alle Projekte</option>
          {projekte.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={filterKategorie} onChange={(e) => setFilterKategorie(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">Alle Kategorien</option>
          {kategorien.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">Alle Status</option>
          <option value="ausstehend">Ausstehend</option>
          <option value="freigegeben">Freigegeben</option>
          <option value="abgelehnt">Abgelehnt</option>
          <option value="ueberarbeitung">Überarbeitung</option>
        </select>

        {partner.length > 0 && (
          <select value={filterPartner} onChange={(e) => setFilterPartner(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">Alle Partner</option>
            {partner.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}

        {activeFilters > 0 && (
          <button
            onClick={() => { setFilterProjekt(''); setFilterKategorie(''); setFilterStatus(''); setFilterPartner('') }}
            className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg bg-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Ergebniszeile */}
      <p className="text-xs text-gray-400">{gefiltert.length} von {produkte.length} Produkten</p>

      {/* Tabelle */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs w-10" />
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-700">
                    Produkt <SortIcon col="name" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">
                  <button onClick={() => toggleSort('projekt')} className="flex items-center gap-1 hover:text-gray-700">
                    Projekt → Raum <SortIcon col="projekt" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Kategorie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Partner</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Menge</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">
                  <button onClick={() => toggleSort('verkaufspreis')} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                    VP netto <SortIcon col="verkaufspreis" />
                  </button>
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">VP brutto</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                    Status <SortIcon col="status" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {gefiltert.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                    Keine Produkte gefunden.
                  </td>
                </tr>
              ) : (
                gefiltert.map((p) => {
                  const vpBrutto = p.verkaufspreis != null ? p.verkaufspreis * (1 + MWST) : null
                  const cfg = STATUS_CFG[p.status]
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Thumbnail */}
                      <td className="px-4 py-3">
                        {p.bild_url ? (
                          <Image
                            src={p.bild_url}
                            alt={p.name}
                            width={36}
                            height={36}
                            className="rounded-md object-cover border border-gray-100 shrink-0"
                            unoptimized
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center text-gray-300 text-xs shrink-0">
                            —
                          </div>
                        )}
                      </td>

                      {/* Name + Link */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="flex items-start gap-1.5">
                          <Link
                            href={`/dashboard/projekte/${p.projektId}/raeume/${p.raumId}/produkte/${p.id}/bearbeiten`}
                            className="font-medium text-gray-900 hover:text-indigo-600 truncate transition-colors leading-snug"
                          >
                            {p.name}
                          </Link>
                          {p.produkt_url && (
                            <a href={p.produkt_url} target="_blank" rel="noopener noreferrer"
                              className="shrink-0 mt-0.5 text-gray-300 hover:text-indigo-500 transition-colors">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Projekt → Raum */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <Link href={`/dashboard/projekte/${p.projektId}`}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium truncate block transition-colors">
                          {p.projektName}
                        </Link>
                        <span className="text-xs text-gray-400 truncate block">→ {p.raumName}</span>
                      </td>

                      {/* Kategorie */}
                      <td className="px-4 py-3">
                        {p.kategorie ? (
                          <span className="inline-block px-2 py-0.5 text-[11px] bg-indigo-50 text-indigo-600 rounded-full font-medium whitespace-nowrap">
                            {p.kategorie}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Partner */}
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px]">
                        {p.partnerName ? (
                          <Link href={`/dashboard/partner/${p.partnerId}`}
                            className="hover:text-indigo-600 transition-colors truncate block">
                            {p.partnerName}
                          </Link>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Menge */}
                      <td className="px-4 py-3 text-right text-xs text-gray-600 whitespace-nowrap">
                        {p.menge} {p.einheit}
                      </td>

                      {/* VP netto */}
                      <td className="px-4 py-3 text-right text-xs font-mono text-gray-700 whitespace-nowrap">
                        {p.verkaufspreis != null ? eur(p.verkaufspreis) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* VP brutto */}
                      <td className="px-4 py-3 text-right text-xs font-mono text-gray-500 whitespace-nowrap">
                        {vpBrutto != null ? eur(vpBrutto) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 text-[11px] rounded-full font-medium whitespace-nowrap ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
