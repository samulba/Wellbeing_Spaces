'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronRight, Layers, FolderTree, Star, ArrowUpRight } from 'lucide-react'
import type { Raum, RaumGruppe, FreigabeBaumBereich } from '@/lib/supabase/types'
import type { RaumStat } from './SortableRaumListe'
import { stempelText } from '@/lib/freigabe-stempel'

/**
 * Freigabe-Status pro Raum (Projekt-Detail, Tab „Freigaben"). Zeigt je Raum den
 * Anteil freigegebener Produkte mit Fortschrittsbalken, optional nach Räume-Gruppen
 * geclustert (Migration 114). NEU: jeder Raum lässt sich aufklappen und zeigt dann die
 * Blöcke/Gruppen (Bereich → Auswahl-Block → Produkt) mit Freigabe-Status + Stempel —
 * „wie bei den Räumen", direkt im Projekt-Kontext. `baum` ist optional/fail-safe.
 */

const STATUS_DOT: Record<string, string> = {
  ausstehend: 'bg-gray-300', freigegeben: 'bg-emerald-500', abgelehnt: 'bg-red-400', ueberarbeitung: 'bg-amber-400',
}
const STATUS_LABEL: Record<string, string> = {
  ausstehend: 'Offen', freigegeben: 'Freigegeben', abgelehnt: 'Abgelehnt', ueberarbeitung: 'Überarbeitung',
}

function ProduktZeile({ p }: { p: FreigabeBaumBereich['lose'][number] }) {
  return (
    <div className="flex items-start gap-2 px-3 py-1.5">
      <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[p.status] ?? 'bg-gray-300'}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] text-gray-800 truncate">{p.name}</span>
          {p.kunde_favorit && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
              <Star className="w-2.5 h-2.5" /> Kundenwahl
            </span>
          )}
          <span className="text-[10px] text-gray-400 shrink-0">{STATUS_LABEL[p.status] ?? p.status}</span>
        </div>
        {p.status === 'freigegeben' && p.freigegeben_am && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-emerald-600" title={`Freigegeben von ${p.freigegeben_von ?? 'Kunde'}`}>
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            {stempelText(p.freigegeben_am, p.freigegeben_von)}
          </p>
        )}
      </div>
    </div>
  )
}

export default function FreigabeRaumPanel({
  projektId,
  raeume,
  raumStats,
  raumGruppen,
  baum = {},
}: {
  projektId: string
  raeume: Raum[]
  raumStats: Record<string, RaumStat>
  raumGruppen: RaumGruppe[]
  baum?: Record<string, FreigabeBaumBereich[]>
}) {
  const [offen, setOffen] = useState<Record<string, boolean>>({})
  const sortierteGruppen = [...raumGruppen].sort((a, b) => a.reihenfolge - b.reihenfolge)
  const gruppeIds = new Set(sortierteGruppen.map((g) => g.id))
  const ungrouped = raeume.filter((r) => !r.raum_gruppe_id || !gruppeIds.has(r.raum_gruppe_id))

  const RaumZeile = (raum: Raum) => {
    const stat = raumStats[raum.id]
    const total = stat?.produkteAnzahl ?? 0
    const frei = stat?.freigegeben ?? 0
    const pct = total > 0 ? Math.round((frei / total) * 100) : 0
    const fertig = total > 0 && frei === total
    const bereiche = baum[raum.id] ?? []
    const hatStruktur = bereiche.length > 0
    const istOffen = !!offen[raum.id]

    return (
      <div key={raum.id} className="border-b border-gray-50 last:border-0">
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
          <button
            type="button"
            onClick={() => hatStruktur && setOffen((o) => ({ ...o, [raum.id]: !o[raum.id] }))}
            disabled={!hatStruktur}
            aria-label={istOffen ? 'Zuklappen' : 'Aufklappen'}
            className={`shrink-0 p-0.5 rounded transition-colors ${hatStruktur ? 'text-gray-400 hover:text-wellbeing-green hover:bg-wellbeing-green/10' : 'text-transparent cursor-default'}`}
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${istOffen ? 'rotate-90' : ''}`} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{raum.name}</p>
              {hatStruktur && (
                <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 shrink-0">
                  <FolderTree className="w-3 h-3" />
                  {bereiche.length} {bereiche.length === 1 ? 'Gruppe' : 'Gruppen'}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 max-w-[200px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${fertig ? 'bg-emerald-500' : 'bg-wellbeing-green'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] text-gray-400 shrink-0">{frei}/{total} freigegeben</span>
            </div>
          </div>
          {fertig && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          <Link
            href={`/dashboard/projekte/${projektId}/raeume/${raum.id}`}
            title="Raum öffnen"
            aria-label="Raum öffnen"
            className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-wellbeing-green hover:bg-wellbeing-green/10 rounded-md transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Aufgeklappt: Blöcke/Gruppen wie in der Raum-Produkttabelle */}
        {istOffen && hatStruktur && (
          <div className="pb-2 pl-9 pr-4 space-y-2">
            {bereiche.map((b) => (
              <div key={b.id} className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-wellbeing-green/[0.05] border-b border-gray-100">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.farbe || '#94c1a4' }} />
                  <Layers className="w-3.5 h-3.5 text-wellbeing-green shrink-0" />
                  <span className="text-xs font-semibold text-gray-700 truncate">{b.name}</span>
                </div>
                {b.bloecke.map((blk) => (
                  <div key={blk.id} className="bg-wellbeing-cream/30 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-1.5 px-3 py-1 pt-1.5">
                      <FolderTree className="w-3 h-3 text-wellbeing-green-dark shrink-0" />
                      <span className="text-[11px] font-semibold text-gray-600">{blk.name}</span>
                      <span className="text-[10px] text-gray-400">{blk.produkte.length} {blk.produkte.length === 1 ? 'Option' : 'Optionen'}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {blk.produkte.map((p) => <ProduktZeile key={p.id} p={p} />)}
                    </div>
                  </div>
                ))}
                {b.lose.length > 0 && (
                  <div className="divide-y divide-gray-50">
                    {b.lose.map((p) => <ProduktZeile key={p.id} p={p} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
