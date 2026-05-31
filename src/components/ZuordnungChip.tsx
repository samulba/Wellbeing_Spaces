'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Layers, ChevronDown, X } from 'lucide-react'
import type { RaumProduktMitDetails, ProduktGruppe, ProduktBereich } from '@/lib/supabase/types'

/**
 * Ein einziger „Zuordnen"-Chip pro Produktzeile (ersetzt die zwei gestapelten
 * Selects). Zeigt die aktuelle Zuordnung; Klick öffnet ein kompaktes Popover
 * mit Auswahl-Block + Gruppe. Popover via Portal + position:fixed, damit es
 * nicht von den Scroll-Containern der Tabelle abgeschnitten wird.
 */
export default function ZuordnungChip({
  eintrag,
  gruppen,
  bereiche,
  onGruppeChange,
  onBereichChange,
}: {
  eintrag: RaumProduktMitDetails
  gruppen: ProduktGruppe[]
  bereiche: ProduktBereich[]
  onGruppeChange: (raumProduktId: string, gruppeId: string | null) => void
  onBereichChange: (raumProduktId: string, bereichId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const chipRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const inBlock = !!eintrag.produkt_gruppe_id
  const block = gruppen.find((g) => g.id === eintrag.produkt_gruppe_id)
  const bereich = bereiche.find((b) => b.id === eintrag.bereich_id)
  const istZugeordnet = inBlock || !!bereich
  const label = inBlock ? (block?.name ?? 'Auswahl-Block') : (bereich?.name ?? 'Zuordnen')

  const schliessen = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || chipRef.current?.contains(e.target as Node)) return
      schliessen()
    }
    const onScroll = () => schliessen()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') schliessen() }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, schliessen])

  // Nichts zuzuordnen → kein Chip
  if (gruppen.length === 0 && bereiche.length === 0) return null

  function umschalten(e: React.MouseEvent) {
    e.stopPropagation()
    if (open) { schliessen(); return }
    const r = chipRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, left: r.left })
    setOpen(true)
  }

  return (
    <div className="mt-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <button
        ref={chipRef}
        type="button"
        onClick={umschalten}
        aria-label="Produkt zuordnen"
        className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-lg px-2 py-1 max-w-[220px] border transition-colors focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 ${
          istZugeordnet
            ? 'border-wellbeing-green/30 bg-wellbeing-green/5 text-wellbeing-green-dark hover:border-wellbeing-green/50'
            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
        }`}
      >
        <Layers className="w-3 h-3 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown className="w-3 h-3 shrink-0 text-gray-400" />
      </button>

      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-60 bg-white border border-gray-200 rounded-xl shadow-xl p-3 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zuordnung</span>
            <button type="button" onClick={schliessen} aria-label="Schließen" className="text-gray-300 hover:text-gray-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {gruppen.length > 0 && (
            <label className="block mb-2">
              <span className="text-[11px] font-medium text-gray-600">Auswahl-Block</span>
              <div className="relative mt-1">
                <select
                  value={eintrag.produkt_gruppe_id ?? ''}
                  onChange={(e) => onGruppeChange(eintrag.id, e.target.value || null)}
                  className="appearance-none w-full text-xs rounded-lg border border-gray-200 bg-white pl-2.5 pr-7 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
                >
                  <option value="">Kein Auswahl-Block</option>
                  {gruppen.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </label>
          )}

          {bereiche.length > 0 && (
            inBlock ? (
              <p className="text-[11px] text-gray-400 leading-relaxed">Gruppe folgt dem Auswahl-Block.</p>
            ) : (
              <label className="block">
                <span className="text-[11px] font-medium text-gray-600">Gruppe</span>
                <div className="relative mt-1">
                  <select
                    value={eintrag.bereich_id ?? ''}
                    onChange={(e) => onBereichChange(eintrag.id, e.target.value || null)}
                    className="appearance-none w-full text-xs rounded-lg border border-gray-200 bg-white pl-2.5 pr-7 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
                  >
                    <option value="">Ohne Gruppe</option>
                    {bereiche.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </label>
            )
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
