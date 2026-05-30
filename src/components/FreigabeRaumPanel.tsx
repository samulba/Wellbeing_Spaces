import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import type { Raum, RaumGruppe } from '@/lib/supabase/types'
import type { RaumStat } from './SortableRaumListe'

/**
 * Freigabe-Status pro Raum (Projekt-Detail, Tab „Freigaben"). Zeigt je Raum
 * den Anteil freigegebener Produkte mit Fortschrittsbalken, optional nach
 * Räume-Gruppen geclustert (Migration 114). Rein presentational (Server-OK).
 */
export default function FreigabeRaumPanel({
  projektId,
  raeume,
  raumStats,
  raumGruppen,
}: {
  projektId: string
  raeume: Raum[]
  raumStats: Record<string, RaumStat>
  raumGruppen: RaumGruppe[]
}) {
  const sortierteGruppen = [...raumGruppen].sort((a, b) => a.reihenfolge - b.reihenfolge)
  const gruppeIds = new Set(sortierteGruppen.map((g) => g.id))
  const ungrouped = raeume.filter((r) => !r.raum_gruppe_id || !gruppeIds.has(r.raum_gruppe_id))

  const RaumZeile = (raum: Raum) => {
    const stat = raumStats[raum.id]
    const total = stat?.produkteAnzahl ?? 0
    const frei = stat?.freigegeben ?? 0
    const pct = total > 0 ? Math.round((frei / total) * 100) : 0
    const fertig = total > 0 && frei === total
    return (
      <Link
        key={raum.id}
        href={`/dashboard/projekte/${projektId}/raeume/${raum.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 group-hover:text-wellbeing-green transition-colors truncate">{raum.name}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 max-w-[200px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${fertig ? 'bg-emerald-500' : 'bg-wellbeing-green'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-gray-400 shrink-0">{frei}/{total} freigegeben</span>
          </div>
        </div>
        {fertig ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        ) : (
          <span className="text-xs text-wellbeing-green opacity-0 group-hover:opacity-100 transition-opacity shrink-0">Öffnen →</span>
        )}
      </Link>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Freigabe-Status pro Raum</p>
      </div>
      {sortierteGruppen.map((g) => {
        const rooms = raeume.filter((r) => r.raum_gruppe_id === g.id)
        if (rooms.length === 0) return null
        return (
          <div key={g.id}>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-wellbeing-green/[0.04] border-b border-gray-100">
              <span className="w-2 h-2 rounded-full" style={{ background: g.farbe || '#94c1a4' }} />
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{g.name}</span>
            </div>
            {rooms.map(RaumZeile)}
          </div>
        )
      })}
      {ungrouped.length > 0 && (
        <div>
          {sortierteGruppen.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50/60 border-b border-gray-100">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Ohne Gruppe</span>
            </div>
          )}
          {ungrouped.map(RaumZeile)}
        </div>
      )}
    </div>
  )
}
