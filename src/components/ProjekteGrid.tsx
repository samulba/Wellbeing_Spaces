'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { differenceInCalendarDays } from 'date-fns'
import { Search, LayoutGrid, List, MapPin, DoorOpen, Archive, Clock, CheckCircle2, Package, Truck } from 'lucide-react'

// ── Typen ─────────────────────────────────────────────────────
export type ProjektMitStats = {
  id: string
  name: string
  status: string
  projektart: string | null
  standort: string | null
  gesamtbudget: number | null
  created_at: string
  archiviert: boolean
  archiviert_am: string | null
  deadline: string | null
  kunden: { id: string; name: string; logo_url: string | null } | null
  raeumCount: number
  produkteGesamt: number
  freigegeben: number
  offeneFreigaben: number
  bestellt: number
  geliefert: number
  vpGesamt: number
}

// ── Helpers ───────────────────────────────────────────────────
const avatarFarben = [
  'bg-wellbeing-green', 'bg-violet-500', 'bg-blue-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
]
function avatarFarbe(s: string) { return avatarFarben[(s.charCodeAt(0) || 0) % avatarFarben.length] }
function initials(name: string) { return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) }

function deadlineChip(deadline: string): { label: string; cls: string; Icon: typeof Clock } {
  // deadline ist eine DATE-Spalte (YYYY-MM-DD) → als lokale Mitternacht lesen,
  // sonst erscheint eine heute fällige Deadline morgens als „in 1T" (UTC-Versatz).
  const d        = deadline.length === 10 ? new Date(`${deadline}T00:00:00`) : new Date(deadline)
  const diffDays = differenceInCalendarDays(d, new Date())
  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}T überfällig`, cls: 'bg-red-50 text-red-600 border-red-100', Icon: Clock }
  }
  if (diffDays === 0) {
    return { label: 'Heute fällig', cls: 'bg-red-50 text-red-600 border-red-100', Icon: Clock }
  }
  if (diffDays <= 7) {
    return { label: `in ${diffDays}T`, cls: 'bg-amber-50 text-amber-700 border-amber-100', Icon: Clock }
  }
  if (diffDays <= 30) {
    return { label: `in ${diffDays}T`, cls: 'bg-wellbeing-cream text-wellbeing-green-dark border-wellbeing-cream', Icon: Clock }
  }
  return { label: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }), cls: 'bg-gray-50 text-gray-500 border-gray-100', Icon: Clock }
}

/** Dreistufige Progress-Zeile für Freigabe / Bestellung / Lieferung. */
function ProgressZeile({
  label, done, total, Icon, farbe,
}: {
  label: string
  done: number
  total: number
  Icon: typeof CheckCircle2
  farbe: string
}) {
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <Icon className="w-3 h-3 text-gray-400 shrink-0" />
      <span className="text-gray-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${farbe}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-gray-600 font-medium shrink-0 min-w-[34px] text-right">
        {done}/{total}
      </span>
    </div>
  )
}

// ── Konstanten ────────────────────────────────────────────────
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function BudgetRing({ vp, budget, size = 54 }: { vp: number; budget: number; size?: number }) {
  if (budget <= 0) return null
  const pct = Math.min(100, Math.max(0, Math.round((vp / budget) * 100)))
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  const farbe = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={farbe} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-mono font-semibold"
        style={{ fontSize: Math.max(9, size * 0.22), color: farbe }}
      >
        {pct}%
      </span>
    </div>
  )
}

// ── Komponente ────────────────────────────────────────────────
export default function ProjekteGrid({ projekte }: { projekte: ProjektMitStats[] }) {
  const [suche,      setSuche]      = useState('')
  const [archivAnsicht, setArchivAnsicht] = useState(false)
  const [ansicht,    setAnsicht]    = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const s = localStorage.getItem('projekte-ansicht')
    if (s === 'list' || s === 'grid') setAnsicht(s)
  }, [])

  function toggleAnsicht(neu: 'grid' | 'list') {
    setAnsicht(neu)
    localStorage.setItem('projekte-ansicht', neu)
  }

  const aktiveProjekte    = projekte.filter((p) => !p.archiviert)
  const archivierteProjekte = projekte.filter((p) => p.archiviert)
  const anzeigePool = archivAnsicht ? archivierteProjekte : aktiveProjekte

  const gefiltert = anzeigePool.filter((p) => {
    if (!suche.trim()) return true
    const q = suche.toLowerCase()
    return p.name.toLowerCase().includes(q)
      || (p.kunden?.name.toLowerCase().includes(q) ?? false)
      || (p.standort?.toLowerCase().includes(q) ?? false)
  })

  return (
    <>
      {/* Aktiv / Archiviert Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => { setArchivAnsicht(false) }}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            !archivAnsicht
              ? 'bg-wellbeing-green text-white'
              : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
          }`}
        >
          Aktiv
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            !archivAnsicht ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            {aktiveProjekte.length}
          </span>
        </button>
        <button
          onClick={() => { setArchivAnsicht(true) }}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            archivAnsicht
              ? 'bg-gray-600 text-white'
              : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Archiviert
          {archivierteProjekte.length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              archivAnsicht ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {archivierteProjekte.length}
            </span>
          )}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative w-[340px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Projekt oder Kunde suchen…" value={suche}
            onChange={(e) => setSuche(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition" />
        </div>

        <span className="text-sm text-gray-400">{gefiltert.length} {gefiltert.length === 1 ? 'Eintrag' : 'Einträge'}</span>

        <div className="ml-auto flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => toggleAnsicht('grid')} title="Kachelansicht"
            className={`px-3 py-2 transition-colors ${ansicht === 'grid' ? 'bg-wellbeing-green text-white' : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => toggleAnsicht('list')} title="Listenansicht"
            className={`px-3 py-2 border-l border-gray-200 transition-colors ${ansicht === 'list' ? 'bg-wellbeing-green text-white' : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <List className="w-4 h-4" /></button>
        </div>
      </div>

      {gefiltert.length === 0 && suche && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm text-gray-400">Kein Projekt entspricht der Suche.</p>
        </div>
      )}

      {/* Grid */}
      {gefiltert.length > 0 && ansicht === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {gefiltert.map((p) => {
            const kunde = p.kunden
            const deadline = !p.archiviert && p.deadline ? deadlineChip(p.deadline) : null
            const DeadlineIcon = deadline?.Icon
            const hatProdukte = p.produkteGesamt > 0
            return (
              <Link
                key={p.id}
                href={`/dashboard/projekte/${p.id}`}
                className={`relative bg-white border rounded-2xl overflow-hidden transition-all duration-300 group block ${
                  p.archiviert
                    ? 'border-gray-200 opacity-70 hover:opacity-100'
                    : 'border-gray-200 hover:border-wellbeing-green/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/70'
                }`}
              >
                <div className="p-5">
                  {/* Kopf: Kunden-Avatar + Deadline-Chip (ggf. Archiv-Badge) */}
                  <div className="flex items-start justify-between gap-2 mb-4">
                    {kunde?.logo_url ? (
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-gray-200 bg-white shrink-0">
                        <Image src={kunde.logo_url} alt={kunde.name} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                      </div>
                    ) : (
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarFarbe(kunde?.name ?? '?')}`}>
                        {kunde?.name ? initials(kunde.name) : '–'}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {deadline && DeadlineIcon && !p.archiviert && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${deadline.cls}`}>
                          <DeadlineIcon className="w-2.5 h-2.5" />
                          {deadline.label}
                        </span>
                      )}
                      {p.archiviert && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500">
                          <Archive className="w-2.5 h-2.5" /> Archiviert
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Name + Kunde */}
                  <h2 className="text-[15px] font-semibold text-gray-900 group-hover:text-wellbeing-green transition-colors leading-snug line-clamp-2 mb-0.5 min-h-[40px]">
                    {p.name}
                  </h2>
                  <p className="text-xs text-gray-500 mb-4 truncate">
                    {kunde?.name ?? '–'}
                    {p.projektart && <span className="text-gray-300"> · {p.projektart}</span>}
                  </p>

                  {/* Budget-Ring + Details (Split) */}
                  <div className="flex items-center gap-3 py-3 border-t border-gray-100">
                    {p.gesamtbudget != null && p.gesamtbudget > 0 ? (
                      <>
                        <BudgetRing vp={p.vpGesamt} budget={p.gesamtbudget} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Budget</p>
                          <p className="text-sm font-mono font-semibold text-gray-900 leading-tight">
                            {eur(p.vpGesamt)}
                            <span className="text-gray-400 font-normal"> / {eur(p.gesamtbudget)}</span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">VP-Summe</p>
                        <p className="text-sm font-mono font-semibold text-gray-700">
                          {p.vpGesamt > 0 ? eur(p.vpGesamt) : '—'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Progress-Block: echter Projekt-Fortschritt */}
                  {hatProdukte && (
                    <div className="pt-3 mt-0 border-t border-gray-100 space-y-1.5">
                      <ProgressZeile label="Freigabe"  done={p.freigegeben} total={p.produkteGesamt} Icon={CheckCircle2} farbe="bg-emerald-400" />
                      <ProgressZeile label="Bestellt"  done={p.bestellt}    total={p.produkteGesamt} Icon={Package}      farbe="bg-blue-400" />
                      <ProgressZeile label="Geliefert" done={p.geliefert}   total={p.produkteGesamt} Icon={Truck}        farbe="bg-wellbeing-green" />
                    </div>
                  )}

                  {/* Footer: Räume + Standort */}
                  <div className="flex items-center gap-3 pt-3 mt-3 border-t border-gray-100 text-xs">
                    <span className="inline-flex items-center gap-1 text-gray-500">
                      <DoorOpen className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium">{p.raeumCount}</span>
                      <span className="text-gray-400">{p.raeumCount === 1 ? 'Raum' : 'Räume'}</span>
                    </span>
                    {!hatProdukte && (
                      <span className="text-gray-400">· Noch keine Produkte</span>
                    )}
                    {p.standort && (
                      <span className="inline-flex items-center gap-1 text-gray-400 ml-auto min-w-0">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[110px]">{p.standort}</span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
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
                  <th className={th}>Budget</th>
                  <th className={th}>VP netto</th>
                  <th className={th}>Räume</th>
                  <th className={th}>Freigabe</th>
                  <th className={th}>Bestellt</th>
                  <th className={th}>Geliefert</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {gefiltert.map((p, i) => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors group ${i < gefiltert.length - 1 ? 'border-b border-gray-100' : ''} ${p.archiviert ? 'opacity-60 hover:opacity-100' : ''}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 group-hover:text-wellbeing-green transition-colors">{p.name}</p>
                        {p.archiviert && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            <Archive className="w-2.5 h-2.5" /> Archiv
                          </span>
                        )}
                      </div>
                      {p.standort && <p className="text-xs text-gray-400 mt-0.5">{p.standort}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{p.kunden?.name ?? '–'}</td>
                    <td className="px-4 py-3.5 text-center font-mono text-gray-600">{p.gesamtbudget != null ? eur(p.gesamtbudget) : '–'}</td>
                    <td className="px-4 py-3.5 text-center font-mono text-wellbeing-green font-semibold">{p.vpGesamt > 0 ? eur(p.vpGesamt) : '–'}</td>
                    <td className="px-4 py-3.5 text-center text-gray-500">{p.raeumCount}</td>
                    <td className="px-4 py-3.5 text-center tabular-nums text-gray-600">
                      {p.produkteGesamt > 0 ? `${p.freigegeben}/${p.produkteGesamt}` : <span className="text-gray-300">–</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-nums text-gray-600">
                      {p.produkteGesamt > 0 ? `${p.bestellt}/${p.produkteGesamt}` : <span className="text-gray-300">–</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-nums text-gray-600">
                      {p.produkteGesamt > 0 ? `${p.geliefert}/${p.produkteGesamt}` : <span className="text-gray-300">–</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      <Link href={`/dashboard/projekte/${p.id}`} className="text-xs text-gray-400 hover:text-wellbeing-green transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap">Öffnen →</Link>
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
