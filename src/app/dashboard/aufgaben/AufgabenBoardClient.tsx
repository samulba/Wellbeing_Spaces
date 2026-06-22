'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable,
  closestCorners, type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { Plus, Calendar, AlertTriangle, FolderOpen, Search, X, Check, Archive, ArchiveRestore, LayoutGrid, List, CalendarDays } from 'lucide-react'
import StickyPageHeader from '@/components/StickyPageHeader'
import AufgabeAnlegenModal from '@/components/AufgabeAnlegenModal'
import AufgabenListe from '@/components/AufgabenListe'
import AufgabenKalender from '@/components/AufgabenKalender'
import AufgabenErrorBoundary from '@/components/AufgabenErrorBoundary'
import {
  aufgabeAnlegen, aufgabeReihenfolgeAendern,
  type AufgabePickerOptionen,
} from '@/app/actions/aufgaben'
import AufgabeDetailModal from '@/components/AufgabeDetailModal'
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh'
import type { AufgabeMitDetails, AufgabeStatus, AufgabePrioritaet } from '@/lib/supabase/types'

const SPALTEN: { id: AufgabeStatus; label: string; farbe: string }[] = [
  { id: 'backlog',   label: 'Offen',     farbe: 'bg-gray-100  text-gray-700' },
  { id: 'in_arbeit', label: 'In Arbeit', farbe: 'bg-blue-50   text-blue-700' },
  { id: 'review',    label: 'Review',    farbe: 'bg-amber-50  text-amber-700' },
  { id: 'erledigt',  label: 'Erledigt',  farbe: 'bg-emerald-50 text-emerald-700' },
]

// Linker Akzent-Streifen pro Prio (border-left-color)
const PRIO_BORDER: Record<AufgabePrioritaet, string> = {
  niedrig:  'border-l-gray-200',
  normal:   'border-l-blue-300',
  hoch:     'border-l-amber-400',
  dringend: 'border-l-red-500',
}

type ZeitFilter    = 'alle' | 'mir' | 'heute' | 'woche' | 'ueberfaellig'
type KontextFilter = 'alle' | 'mit_projekt' | 'intern'

const selCls = 'text-sm px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-600 max-w-[160px] focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20'

export default function AufgabenBoardClient({
  initialeAufgaben,
  pickerOptionen,
  zeigeArchiv = false,
}: {
  initialeAufgaben: AufgabeMitDetails[]
  pickerOptionen?: AufgabePickerOptionen
  zeigeArchiv?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [aufgaben, setAufgaben] = useState<AufgabeMitDetails[]>(initialeAufgaben)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [zeitFilter, setZeitFilter]       = useState<ZeitFilter>('alle')
  const [kontextFilter, setKontextFilter] = useState<KontextFilter>('alle')
  const [suche, setSuche] = useState('')
  const [view, setView] = useState<'board' | 'liste' | 'kalender'>('board')
  // Erweiterte Filter (Zuständig / Label / Projekt) — wirken über das gemeinsame
  // `gefiltert` automatisch in Board, Liste und Kalender.
  const [assigneeFilter, setAssigneeFilter] = useState<string>('alle')  // 'alle' | user_id | 'niemand'
  const [labelFilter, setLabelFilter]       = useState<string>('alle')  // 'alle' | label_id
  const [projektFilter, setProjektFilter]   = useState<string>('alle')  // 'alle' | projekt_id | 'ohne'
  const [neuOffen, setNeuOffen] = useState<AufgabeStatus | null>(null)
  const [neuTitel, setNeuTitel] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [anlegenStatus, setAnlegenStatus] = useState<AufgabeStatus | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Touch: Long-press 200ms gegen Scroll-Konflikt; kleinste Toleranz fuer
    // Scroll-vs-Drag-Disambiguation.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  // Live-Updates: bei jeder Aenderung an aufgaben (durch andere Team-Mitglieder
  // oder durch Auto-Sync-Hooks) wird die Server-Component re-rendered.
  useRealtimeRefresh({
    channelName: 'aufgaben-board',
    table:       'aufgaben',
    debounceMs:  600,
    onChange:    () => router.refresh(),
  })

  // Server-Refresh -> neue initialeAufgaben-Props -> State synchronisieren
  useEffect(() => {
    setAufgaben(initialeAufgaben)
  }, [initialeAufgaben])

  // Bevorzugte Ansicht (Board/Liste/Kalender) merken
  useEffect(() => {
    const v = localStorage.getItem('aufgaben-view')
    if (v === 'board' || v === 'liste' || v === 'kalender') setView(v)
  }, [])
  function setViewGespeichert(v: 'board' | 'liste' | 'kalender') {
    setView(v)
    try { localStorage.setItem('aufgaben-view', v) } catch { /* ignore */ }
  }

  // Filtern (clientseitig fuer schnelle Reaktion)
  const heute = new Date().toISOString().slice(0, 10)
  const inEinerWoche = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const currentUserId = pickerOptionen?.currentUserId ?? null
  const sucheNorm = suche.trim().toLowerCase()
  const gefiltert = useMemo(() => {
    return aufgaben.filter((a) => {
      // Zeit-/Owner-Filter
      if (zeitFilter === 'mir') {
        if (!currentUserId) return false
        if (a.assignee_user_id !== currentUserId) return false
      } else if (zeitFilter === 'heute') {
        if (!(a.faellig_am === heute && a.status !== 'erledigt')) return false
      } else if (zeitFilter === 'woche') {
        if (!a.faellig_am || a.status === 'erledigt') return false
        if (!(a.faellig_am >= heute && a.faellig_am <= inEinerWoche)) return false
      } else if (zeitFilter === 'ueberfaellig') {
        if (!(a.faellig_am && a.faellig_am < heute && a.status !== 'erledigt')) return false
      }
      // Kontext-Filter (unabhaengig kombinierbar)
      if (kontextFilter === 'mit_projekt') {
        if (!a.projekt_id && !a.kunde_id) return false
      } else if (kontextFilter === 'intern') {
        if (a.projekt_id || a.kunde_id) return false
      }
      // Zuständig-Filter
      if (assigneeFilter === 'niemand') {
        if (a.assignee_user_id || a.assignee_kunde) return false
      } else if (assigneeFilter !== 'alle') {
        if (a.assignee_user_id !== assigneeFilter) return false
      }
      // Label-Filter
      if (labelFilter !== 'alle' && !(a.label_ids ?? []).includes(labelFilter)) return false
      // Projekt-Filter
      if (projektFilter === 'ohne') {
        if (a.projekt_id) return false
      } else if (projektFilter !== 'alle') {
        if (a.projekt_id !== projektFilter) return false
      }
      // Volltext-Suche ueber Titel + Beschreibung + Tags + Projekt + Kunde
      if (sucheNorm) {
        const haystack = [
          a.titel, a.beschreibung ?? '',
          ...a.tags,
          a.projekt?.name ?? '',
          a.kunde?.name ?? '',
          a.raum?.name ?? '',
        ].join(' ').toLowerCase()
        if (!haystack.includes(sucheNorm)) return false
      }
      return true
    })
  }, [aufgaben, zeitFilter, kontextFilter, assigneeFilter, labelFilter, projektFilter, heute, inEinerWoche, currentUserId, sucheNorm])

  // Spalten-Mapping
  const spaltenInhalt = useMemo(() => {
    const m: Record<AufgabeStatus, AufgabeMitDetails[]> = {
      backlog: [], in_arbeit: [], review: [], erledigt: [],
    }
    for (const a of gefiltert) m[a.status].push(a)
    for (const k of Object.keys(m) as AufgabeStatus[]) {
      m[k].sort((x, y) => x.reihenfolge - y.reihenfolge)
    }
    return m
  }, [gefiltert])

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function findStatusOf(id: string): AufgabeStatus | null {
    const a = aufgaben.find((x) => x.id === id)
    return a?.status ?? null
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const activeId = String(active.id)
    const overId   = String(over.id)
    const aktuellSt = findStatusOf(activeId)
    if (!aktuellSt) return
    // overId kann eine Karte (Aufgabe-ID) oder eine Spalte (Status-String) sein
    const zielSt: AufgabeStatus | null =
      (SPALTEN.find((s) => s.id === overId)?.id) ?? findStatusOf(overId)
    if (!zielSt || zielSt === aktuellSt) return
    setAufgaben((prev) => prev.map((a) => a.id === activeId ? { ...a, status: zielSt } : a))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const activeId = String(active.id)
    const overId   = String(over.id)
    const draggedNew = aufgaben.find((a) => a.id === activeId)
    if (!draggedNew) return
    const ziel: AufgabeStatus =
      (SPALTEN.find((s) => s.id === overId)?.id) ?? draggedNew.status

    const aktuelleSpalte = aufgaben.filter((a) => a.status === ziel && a.id !== activeId)
                                   .sort((x, y) => x.reihenfolge - y.reihenfolge)
    const overIdx = aktuelleSpalte.findIndex((a) => a.id === overId)
    const insertAt = overIdx === -1 ? aktuelleSpalte.length : overIdx
    const neuSortiert = [
      ...aktuelleSpalte.slice(0, insertAt),
      { ...draggedNew, status: ziel },
      ...aktuelleSpalte.slice(insertAt),
    ].map((a, i) => ({ ...a, reihenfolge: i }))

    // Optimistic UI
    setAufgaben((prev) => {
      const andere = prev.filter((a) => a.status !== ziel)
      return [...andere, ...neuSortiert]
    })

    // Server-Sync (Bulk)
    const updates = neuSortiert.map((a) => ({
      id: a.id, status: a.status, reihenfolge: a.reihenfolge,
    }))
    startTransition(async () => {
      const res = await aufgabeReihenfolgeAendern(updates)
      if (res.fehler) {
        console.error(res.fehler)
        router.refresh()
      }
    })
  }

  async function handleQuickAdd(status: AufgabeStatus) {
    const titel = neuTitel.trim()
    if (!titel) { setNeuOffen(null); return }
    setNeuTitel('')
    setNeuOffen(null)
    const optimisticId = 'tmp-' + Math.random().toString(36).slice(2)
    const optimistic: AufgabeMitDetails = {
      id: optimisticId,
      organisation_id: '',
      titel, beschreibung: null,
      status, reihenfolge: 999,
      prioritaet: 'normal',
      faellig_am: null, erledigt_am: null,
      assignee_user_id: null, assignee_kunde: false,
      sichtbar_fuer_kunde: false, tags: [], label_ids: [],
      archiviert_am: null,
      kunde_id: null, projekt_id: null, raum_id: null,
      raum_produkte_id: null, bestellung_id: null,
      quelle: 'manuell', quelle_id: null,
      checklist: [], anhang_urls: [],
      erstellt_von: null, erstellt_von_kunde: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setAufgaben((prev) => [...prev, optimistic])
    startTransition(async () => {
      const res = await aufgabeAnlegen({ titel, status })
      if (res.fehler || !res.id) {
        setAufgaben((prev) => prev.filter((a) => a.id !== optimisticId))
      } else {
        router.refresh()
      }
    })
  }

  return (
    <>
      <StickyPageHeader
        title={zeigeArchiv ? 'Aufgaben — Archiv' : 'Aufgaben'}
        count={aufgaben.length}
        countLabel={aufgaben.length === 1 ? 'Aufgabe' : 'Aufgaben'}
        subtitle={zeigeArchiv
          ? 'Archivierte Aufgaben — über das Detail wiederherstellen'
          : 'Alle Aufgaben deiner Organisation auf einem Brett'}
        action={
          <div className="flex items-center gap-2">
            {/* View-Toggle: Board / Liste / Kalender */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewGespeichert('board')}
                title="Kanban-Board"
                aria-label="Kanban-Board"
                className={
                  'px-2.5 py-1.5 text-sm transition-colors ' +
                  (view === 'board' ? 'bg-wellbeing-green text-white' : 'text-gray-500 hover:bg-gray-50')
                }
              ><LayoutGrid size={14} /></button>
              <button
                onClick={() => setViewGespeichert('liste')}
                title="Liste"
                aria-label="Liste"
                className={
                  'px-2.5 py-1.5 text-sm transition-colors border-l border-gray-200 ' +
                  (view === 'liste' ? 'bg-wellbeing-green text-white' : 'text-gray-500 hover:bg-gray-50')
                }
              ><List size={14} /></button>
              <button
                onClick={() => setViewGespeichert('kalender')}
                title="Kalender"
                aria-label="Kalender"
                className={
                  'px-2.5 py-1.5 text-sm transition-colors border-l border-gray-200 ' +
                  (view === 'kalender' ? 'bg-wellbeing-green text-white' : 'text-gray-500 hover:bg-gray-50')
                }
              ><CalendarDays size={14} /></button>
            </div>
            <Link
              href={zeigeArchiv ? '/dashboard/aufgaben' : '/dashboard/aufgaben?archiviert=1'}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title={zeigeArchiv ? 'Zurück zum aktiven Board' : 'Archivierte Aufgaben anzeigen'}
            >
              {zeigeArchiv ? <><ArchiveRestore size={14} /> Aktiv</> : <><Archive size={14} /> Archiv</>}
            </Link>
            {pickerOptionen && !zeigeArchiv && (
              <button
                onClick={() => setAnlegenStatus('backlog')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-wellbeing-green text-white rounded-lg hover:bg-wellbeing-green-dark"
              >
                <Plus size={16} /> Neue Aufgabe
              </button>
            )}
          </div>
        }
      />
      <div className="px-6 py-6 space-y-4">
      {/* Filter-Pills + Suche */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zeit-/Owner-Gruppe */}
          {([
            { id: 'alle', label: 'Alle' },
            { id: 'mir',  label: 'Mir' },
            { id: 'heute', label: 'Heute' },
            { id: 'woche', label: 'Diese Woche' },
            { id: 'ueberfaellig', label: 'Überfällig' },
          ] as { id: ZeitFilter; label: string }[]).map((p) => {
            const aktiv = zeitFilter === p.id
            return (
              <button
                key={p.id}
                onClick={() => setZeitFilter(p.id)}
                className={
                  aktiv
                    ? 'px-3 py-1.5 rounded-full text-sm font-medium bg-wellbeing-green text-white'
                    : 'px-3 py-1.5 rounded-full text-sm font-medium bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                }
              >
                {p.label}
              </button>
            )
          })}
          {/* Visueller Trenner zur Kontext-Gruppe */}
          <div className="w-px h-5 bg-gray-200 mx-1" aria-hidden />
          {/* Kontext-Gruppe (unabhaengig kombinierbar) */}
          {([
            { id: 'alle',        label: 'Alle' },
            { id: 'mit_projekt', label: 'Mit Projekt' },
            { id: 'intern',      label: 'Intern' },
          ] as { id: KontextFilter; label: string }[]).map((p) => {
            const aktiv = kontextFilter === p.id
            return (
              <button
                key={p.id}
                onClick={() => setKontextFilter(p.id)}
                className={
                  aktiv
                    ? 'px-3 py-1.5 rounded-full text-sm font-medium bg-wellbeing-green text-white'
                    : 'px-3 py-1.5 rounded-full text-sm font-medium bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                }
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Erweiterte Filter: Zuständig / Label / Projekt */}
        {(!!pickerOptionen?.team?.length || !!pickerOptionen?.labels?.length || !!pickerOptionen?.projekte?.length) && (
          <div className="flex items-center gap-2 flex-wrap">
            {!!pickerOptionen?.team?.length && (
              <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} title="Zuständig" className={selCls}>
                <option value="alle">Alle Zuständigen</option>
                <option value="niemand">Niemand zugewiesen</option>
                {pickerOptionen.team.map((t) => <option key={t.user_id} value={t.user_id}>{t.name}</option>)}
              </select>
            )}
            {!!pickerOptionen?.labels?.length && (
              <select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)} title="Label" className={selCls}>
                <option value="alle">Alle Labels</option>
                {pickerOptionen.labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
            {!!pickerOptionen?.projekte?.length && (
              <select value={projektFilter} onChange={(e) => setProjektFilter(e.target.value)} title="Projekt" className={selCls}>
                <option value="alle">Alle Projekte</option>
                <option value="ohne">Ohne Projekt</option>
                {pickerOptionen.projekte.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
        )}
        <div className="relative flex-1 max-w-[340px] ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Aufgaben durchsuchen…"
            className="w-full text-sm pl-9 pr-8 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
          />
          {suche && (
            <button
              onClick={() => setSuche('')}
              aria-label="Suche zurücksetzen"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 p-1"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {pending && <span className="text-xs text-gray-400">speichert…</span>}
      </div>

      <AufgabenErrorBoundary name="aufgaben-view">
      {view === 'board' ? (
        /* 4-Spalten-Board */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {SPALTEN.map((spalte) => (
              <Spalte
                key={spalte.id}
                spalte={spalte}
                aufgaben={spaltenInhalt[spalte.id]}
                team={pickerOptionen?.team}
                labels={pickerOptionen?.labels}
                onCardClick={(id) => setDetailId(id)}
                quickAddOpen={neuOffen === spalte.id}
                onQuickAddOpen={() => { setNeuOffen(spalte.id); setNeuTitel('') }}
                onQuickAddClose={() => setNeuOffen(null)}
                quickAddTitel={neuTitel}
                onQuickAddTitelChange={setNeuTitel}
                onQuickAddSubmit={() => handleQuickAdd(spalte.id)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeId ? (
              <Karte aufgabe={aufgaben.find((a) => a.id === activeId)!} dragging team={pickerOptionen?.team} labels={pickerOptionen?.labels} />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : view === 'liste' ? (
        /* Listen-Ansicht */
        <AufgabenListe aufgaben={gefiltert} pickerOptionen={pickerOptionen} />
      ) : (
        /* Kalender-Ansicht */
        <AufgabenKalender aufgaben={gefiltert} pickerOptionen={pickerOptionen} />
      )}
      </AufgabenErrorBoundary>

      <AufgabenErrorBoundary name="aufgabe-detail-modal">
      <AufgabeDetailModal
        aufgabe={aufgaben.find((a) => a.id === detailId) ?? null}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        pickerOptionen={pickerOptionen}
      />
      </AufgabenErrorBoundary>
      {pickerOptionen && (
        <AufgabeAnlegenModal
          open={!!anlegenStatus}
          onClose={() => setAnlegenStatus(null)}
          pickerOptionen={pickerOptionen}
          defaultStatus={anlegenStatus ?? 'backlog'}
        />
      )}
      </div>
    </>
  )
}

// ─── Spalte ───────────────────────────────────────────────────
function Spalte({
  spalte, aufgaben, team, labels, onCardClick,
  quickAddOpen, onQuickAddOpen, onQuickAddClose,
  quickAddTitel, onQuickAddTitelChange, onQuickAddSubmit,
}: {
  spalte: { id: AufgabeStatus; label: string; farbe: string }
  aufgaben: AufgabeMitDetails[]
  team?: { user_id: string; name: string; avatarUrl: string | null }[]
  labels?: { id: string; name: string; farbe: string }[]
  onCardClick: (id: string) => void
  quickAddOpen: boolean
  onQuickAddOpen: () => void
  onQuickAddClose: () => void
  quickAddTitel: string
  onQuickAddTitelChange: (t: string) => void
  onQuickAddSubmit: () => void
}) {
  // Spalte selbst ist droppable (via Sortable-Container ueber alle ihre IDs)
  const ids = aufgaben.map((a) => a.id)
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${spalte.farbe}`}>
            {spalte.label}
          </span>
          <span className="text-xs text-gray-400 tabular-nums">{aufgaben.length}</span>
        </div>
        <button
          onClick={onQuickAddOpen}
          aria-label="Aufgabe hinzufuegen"
          className="text-gray-400 hover:text-wellbeing-green p-1 rounded hover:bg-gray-50"
        >
          <Plus size={16} />
        </button>
      </div>
      <SortableContext id={spalte.id} items={ids} strategy={verticalListSortingStrategy}>
        <DroppableSpalte spalteId={spalte.id} istLeer={aufgaben.length === 0}>
          {aufgaben.map((a) => (<KarteSortable key={a.id} aufgabe={a} team={team} labels={labels} onClick={() => onCardClick(a.id)} />))}
          {quickAddOpen && (
            <div className="bg-white border border-wellbeing-green/40 rounded-lg p-2 shadow-sm">
              <textarea
                autoFocus
                rows={2}
                value={quickAddTitel}
                onChange={(e) => onQuickAddTitelChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onQuickAddSubmit() }
                  if (e.key === 'Escape') onQuickAddClose()
                }}
                placeholder="Titel der Aufgabe…"
                className="w-full text-sm border-0 outline-none resize-none p-1"
              />
              <div className="flex items-center justify-end gap-2 mt-1">
                <button
                  onClick={onQuickAddClose}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                >Abbrechen</button>
                <button
                  onClick={onQuickAddSubmit}
                  className="text-xs bg-wellbeing-green text-white px-3 py-1 rounded-md hover:bg-wellbeing-green-dark"
                >Anlegen</button>
              </div>
            </div>
          )}
          {aufgaben.length === 0 && !quickAddOpen && (
            <div className="text-center text-xs text-gray-400 py-8 pointer-events-none">
              Hierher ziehen
            </div>
          )}
        </DroppableSpalte>
      </SortableContext>
    </div>
  )
}

// ─── Droppable-Spalten-Container ──────────────────────────────
// Macht auch leere Spalten zu validen Drop-Targets und gibt visuelles
// Feedback waehrend des Drags.
function DroppableSpalte({
  spalteId, istLeer, children,
}: {
  spalteId: AufgabeStatus
  istLeer:  boolean
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: spalteId })
  return (
    <div
      ref={setNodeRef}
      data-spalte-id={spalteId}
      className={
        'flex-1 p-3 space-y-2 min-h-[160px] transition-colors ' +
        (isOver ? 'bg-wellbeing-green/5 ring-2 ring-wellbeing-green/30 ring-inset rounded-b-xl '
                : (istLeer ? 'rounded-b-xl border-2 border-dashed border-transparent ' : ''))
      }
    >
      {children}
    </div>
  )
}

// ─── Karte ────────────────────────────────────────────────────
function KarteSortable({ aufgabe, team, labels, onClick }: {
  aufgabe: AufgabeMitDetails
  team?: { user_id: string; name: string; avatarUrl: string | null }[]
  labels?: { id: string; name: string; farbe: string }[]
  onClick: () => void
}) {
  const sortable = useSortable({ id: aufgabe.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : 1,
  }
  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      {...sortable.attributes}
      {...sortable.listeners}
      onClick={(e) => {
        // Nur Klick (kein Drag-End) oeffnet Modal — Pointer-Sensor mit
        // distance:6 unterscheidet bereits, sodass click auch bei sortable feuert.
        if (sortable.isDragging) return
        e.stopPropagation()
        onClick()
      }}
    >
      <Karte aufgabe={aufgabe} team={team} labels={labels} />
    </div>
  )
}

function Karte({ aufgabe, dragging, team, labels }: {
  aufgabe: AufgabeMitDetails
  dragging?: boolean
  team?: { user_id: string; name: string; avatarUrl: string | null }[]
  labels?: { id: string; name: string; farbe: string }[]
}) {
  const heute = new Date().toISOString().slice(0, 10)
  const ueberfaellig = aufgabe.faellig_am && aufgabe.faellig_am < heute && aufgabe.status !== 'erledigt'
  const istAuto = aufgabe.quelle !== 'manuell' && aufgabe.quelle !== 'kunde_anfrage'
  const istErledigt = aufgabe.status === 'erledigt'
  const checkErledigt = aufgabe.checklist.filter((c) => c.erledigt).length
  const checkGesamt   = aufgabe.checklist.length
  const checkProzent  = checkGesamt > 0 ? Math.round((checkErledigt / checkGesamt) * 100) : 0
  const assignee = aufgabe.assignee_user_id
    ? team?.find((t) => t.user_id === aufgabe.assignee_user_id)
    : null
  const aktiveLabels = (aufgabe.label_ids ?? [])
    .map((id) => labels?.find((l) => l.id === id))
    .filter((l): l is { id: string; name: string; farbe: string } => !!l)
  const hatFooter = !!aufgabe.faellig_am || checkGesamt > 0
                  || istAuto || aufgabe.assignee_kunde || !!assignee

  return (
    <div className={
      'bg-white border border-gray-200 rounded-xl shadow-sm border-l-[3px] ' +
      'transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 hover:border-wellbeing-green/40 ' +
      'cursor-grab active:cursor-grabbing ' +
      PRIO_BORDER[aufgabe.prioritaet] + ' ' +
      (istErledigt ? 'opacity-70 ' : '') +
      (dragging ? 'shadow-xl ring-2 ring-wellbeing-green/20 ' : '')
    }>
      {/* Body */}
      <div className="px-3 pt-3 pb-2.5">
        {/* Top-Row: Labels + Wiederholung + Auto-Badge */}
        {(aktiveLabels.length > 0 || istAuto || !!aufgabe.wiederholung) && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {aktiveLabels.slice(0, 4).map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                style={{ backgroundColor: l.farbe }}
                title={l.name}
              >{l.name}</span>
            ))}
            {aktiveLabels.length > 4 && (
              <span className="text-[10px] text-gray-400">+{aktiveLabels.length - 4}</span>
            )}
            {aufgabe.wiederholung && (
              <span title="Wiederkehrend" className="inline-flex items-center text-[10px] bg-wellbeing-cream text-wellbeing-green-dark px-1.5 py-0.5 rounded">🔁</span>
            )}
            {istAuto && (
              <span
                title={`Automatisch aus ${aufgabe.quelle}`}
                className="ml-auto inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded"
              >⚡ auto</span>
            )}
          </div>
        )}

        {/* Titel */}
        <p className={
          'text-sm font-medium line-clamp-3 leading-snug ' +
          (istErledigt ? 'line-through text-gray-500' : 'text-gray-900')
        }>{aufgabe.titel}</p>

        {/* Projekt/Kunde oder Intern-Indikator */}
        {(aufgabe.projekt || aufgabe.kunde) ? (
          <div className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1.5 truncate">
            {aufgabe.projekt && (
              <span className="inline-flex items-center gap-1 truncate">
                <FolderOpen size={10} className="shrink-0 text-gray-400" />
                <span className="truncate">{aufgabe.projekt.name}</span>
              </span>
            )}
            {aufgabe.projekt && aufgabe.kunde && <span className="text-gray-300">·</span>}
            {aufgabe.kunde && <span className="truncate">{aufgabe.kunde.name}</span>}
          </div>
        ) : (
          <div className="text-[10px] text-gray-400 mt-1.5 inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-gray-300" /> Intern
          </div>
        )}

        {/* Checklist-Progress */}
        {checkGesamt > 0 && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
              <span className="inline-flex items-center gap-1">
                <Check size={10} /> {checkErledigt}/{checkGesamt}
              </span>
              <span className="tabular-nums">{checkProzent}%</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-wellbeing-green/60 transition-all"
                style={{ width: `${checkProzent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer mit Trennlinie */}
      {hatFooter && (
        <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-2 text-[11px]">
          {aufgabe.faellig_am ? (
            <span className={
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ' +
              (ueberfaellig
                ? 'bg-red-50 text-red-700'
                : aufgabe.faellig_am === heute
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-gray-500')
            }>
              {ueberfaellig ? <AlertTriangle size={10} /> : <Calendar size={10} />}
              {formatDateShort(aufgabe.faellig_am)}
            </span>
          ) : <span className="text-gray-300 inline-flex items-center gap-1"><Calendar size={10} />—</span>}

          <span className="ml-auto inline-flex items-center gap-1.5">
            {aufgabe.assignee_kunde && (
              <span
                title="An Kunde zugewiesen"
                className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-medium"
              >K</span>
            )}
            {assignee && (
              <MiniAvatar name={assignee.name} avatarUrl={assignee.avatarUrl} />
            )}
          </span>
        </div>
      )}
    </div>
  )
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

function MiniAvatar({ name, avatarUrl, size = 20 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initialen = name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl} alt="" title={name}
        width={size} height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      title={name}
      className="rounded-full bg-wellbeing-green/20 text-wellbeing-green-dark flex items-center justify-center font-medium"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >{initialen}</span>
  )
}

// arrayMove wird durch handleDragEnd manuell verwendet — Re-Export-Workaround,
// damit der Import nicht als unused gemeldet wird.
void arrayMove
