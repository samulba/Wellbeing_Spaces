'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, LayoutGrid, List, MapPin, Banknote, DoorOpen, AlertCircle } from 'lucide-react'

// ── Typen ─────────────────────────────────────────────────────
export type ProjektMitStats = {
  id: string
  name: string
  status: string
  projektart: string | null
  standort: string | null
  gesamtbudget: number | null
  created_at: string
  kunden: { id: string; name: string } | null
  raeumCount: number
  offeneFreigaben: number
  vpGesamt: number
}

// ── Konstanten ────────────────────────────────────────────────
const statusLabel: Record<string, string> = {
  offen: 'Offen', in_bearbeitung: 'In Bearbeitung',
  freigegeben: 'Freigegeben', abgeschlossen: 'Abgeschlossen',
}
const statusFarbe: Record<string, string> = {
  offen:          'bg-gray-100 text-gray-600',
  in_bearbeitung: 'bg-blue-50 text-blue-700',
  freigegeben:    'bg-emerald-50 text-emerald-700',
  abgeschlossen:  'bg-gray-100 text-gray-500',
}

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function BudgetBar({ vp, budget }: { vp: number; budget: number }) {
  if (budget <= 0) return null
  const pct = Math.min(100, Math.round((vp / budget) * 100))
  const farbe = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
        <span>VP-Einsatz</span>
        <span className={pct >= 90 ? 'text-red-500 font-semibold' : pct >= 70 ? 'text-amber-600' : 'text-emerald-600'}>
          {pct} %
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${farbe}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Komponente ────────────────────────────────────────────────
export default function ProjekteGrid({ projekte }: { projekte: ProjektMitStats[] }) {
  const [suche,   setSuche]   = useState('')
  const [tabStatus, setTabStatus] = useState('')
  const [ansicht, setAnsicht] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const s = localStorage.getItem('projekte-ansicht')
    if (s === 'list' || s === 'grid') setAnsicht(s)
  }, [])

  function toggleAnsicht(neu: 'grid' | 'list') {
    setAnsicht(neu)
    localStorage.setItem('projekte-ansicht', neu)
  }

  const statusOptionen = [
    { value: '',               label: 'Alle' },
    { value: 'offen',          label: 'Offen' },
    { value: 'in_bearbeitung', label: 'In Bearbeitung' },
    { value: 'freigegeben',    label: 'Freigegeben' },
    { value: 'abgeschlossen',  label: 'Abgeschlossen' },
  ]

  const counts: Record<string, number> = {}
  for (const p of projekte) {
    counts[p.status] = (counts[p.status] ?? 0) + 1
  }

  const gefiltert = projekte.filter((p) => {
    const matchSuche = !suche.trim() ||
      p.name.toLowerCase().includes(suche.toLowerCase()) ||
      p.kunden?.name.toLowerCase().includes(suche.toLowerCase()) ||
      p.standort?.toLowerCase().includes(suche.toLowerCase())
    const matchFilter = !tabStatus || p.status === tabStatus
    return matchSuche && matchFilter
  })

  return (
    <>
      {/* Status-Tabs */}
      <div className="flex items-center gap-0 mb-5 border-b border-gray-200">
        {statusOptionen.map((opt) => {
          const anzahl = opt.value ? (counts[opt.value] ?? 0) : projekte.length
          const aktiv  = tabStatus === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setTabStatus(opt.value)}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                aktiv
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {opt.label}
              {anzahl > 0 && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  aktiv ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {anzahl}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative w-[340px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Projekt oder Kunde suchen…" value={suche}
            onChange={(e) => setSuche(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition" />
        </div>

        <span className="text-sm text-gray-400">{gefiltert.length} {gefiltert.length === 1 ? 'Eintrag' : 'Einträge'}</span>

        <div className="ml-auto flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => toggleAnsicht('grid')} title="Kachelansicht"
            className={`px-3 py-2 transition-colors ${ansicht === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => toggleAnsicht('list')} title="Listenansicht"
            className={`px-3 py-2 border-l border-gray-200 transition-colors ${ansicht === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <List className="w-4 h-4" /></button>
        </div>
      </div>

      {gefiltert.length === 0 && (suche || tabStatus) && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm text-gray-400">Kein Projekt entspricht den Filtern.</p>
        </div>
      )}

      {/* Grid */}
      {gefiltert.length > 0 && ansicht === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gefiltert.map((p) => (
            <Link key={p.id} href={`/dashboard/projekte/${p.id}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 group block">
              <div className="flex items-start justify-between mb-3 gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusFarbe[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel[p.status] ?? p.status}
                </span>
                {p.projektart && <span className="text-xs text-gray-400 truncate">{p.projektart}</span>}
              </div>

              <h2 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors leading-snug mb-1">{p.name}</h2>
              <p className="text-xs text-gray-500 mb-3">{p.kunden?.name ?? '–'}</p>

              {/* Budget Bar */}
              {p.gesamtbudget != null && p.vpGesamt > 0 && (
                <BudgetBar vp={p.vpGesamt} budget={p.gesamtbudget} />
              )}

              <div className="flex flex-col gap-1 text-xs text-gray-400 border-t border-gray-100 pt-3 mt-3">
                {p.standort && <div className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{p.standort}</span></div>}
                {p.gesamtbudget != null && (
                  <div className="flex items-center gap-1 text-gray-500 font-medium">
                    <Banknote className="w-3 h-3 shrink-0" />{eur(p.gesamtbudget)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <DoorOpen className="w-3.5 h-3.5" />{p.raeumCount}
                </span>
                {p.offeneFreigaben > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />{p.offeneFreigaben} offen
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Liste */}
      {gefiltert.length > 0 && ansicht === 'list' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className={th + ' text-left'}>Projekt</th>
                  <th className={th + ' text-left'}>Kunde</th>
                  <th className={th}>Status</th>
                  <th className={th}>Budget</th>
                  <th className={th}>VP netto</th>
                  <th className={th}>Räume</th>
                  <th className={th}>Offen</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {gefiltert.map((p, i) => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors group ${i < gefiltert.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{p.name}</p>
                      {p.standort && <p className="text-xs text-gray-400 mt-0.5">{p.standort}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{p.kunden?.name ?? '–'}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusFarbe[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {statusLabel[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono text-gray-600">{p.gesamtbudget != null ? eur(p.gesamtbudget) : '–'}</td>
                    <td className="px-4 py-3.5 text-center font-mono text-indigo-600 font-semibold">{p.vpGesamt > 0 ? eur(p.vpGesamt) : '–'}</td>
                    <td className="px-4 py-3.5 text-center text-gray-500">{p.raeumCount}</td>
                    <td className="px-4 py-3.5 text-center">
                      {p.offeneFreigaben > 0
                        ? <span className="text-xs font-medium text-amber-600">{p.offeneFreigaben}</span>
                        : <span className="text-gray-300">–</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      <Link href={`/dashboard/projekte/${p.id}`} className="text-xs text-gray-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap">Öffnen →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

const th = 'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest'
