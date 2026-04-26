'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Calendar, AlertTriangle, FolderOpen } from 'lucide-react'
import StickyPageHeader from '@/components/StickyPageHeader'
import AufgabeAnlegenModal from '@/components/AufgabeAnlegenModal'
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

const PRIO_FARBE: Record<AufgabePrioritaet, string> = {
  niedrig:  'bg-gray-300',
  normal:   'bg-blue-400',
  hoch:     'bg-amber-500',
  dringend: 'bg-red-500',
}

type Filter = 'alle' | 'mir' | 'heute' | 'woche' | 'ueberfaellig'

export default function AufgabenBoardClient({
  initialeAufgaben,
  pickerOptionen,
}: {
  initialeAufgaben: AufgabeMitDetails[]
  pickerOptionen?: AufgabePickerOptionen
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [aufgaben, setAufgaben] = useState<AufgabeMitDetails[]>(initialeAufgaben)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('alle')
  const [neuOffen, setNeuOffen] = useState<AufgabeStatus | null>(null)
  const [neuTitel, setNeuTitel] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [anlegenStatus, setAnlegenStatus] = useState<AufgabeStatus | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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

  // Filtern (clientseitig fuer schnelle Reaktion)
  const heute = new Date().toISOString().slice(0, 10)
  const inEinerWoche = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const currentUserId = pickerOptionen?.currentUserId ?? null
  const gefiltert = useMemo(() => {
    return aufgaben.filter((a) => {
      if (filter === 'mir') {
        if (!currentUserId) return false
        return a.assignee_user_id === currentUserId
      }
      if (filter === 'heute') return a.faellig_am === heute && a.status !== 'erledigt'
      if (filter === 'woche') {
        if (!a.faellig_am || a.status === 'erledigt') return false
        return a.faellig_am >= heute && a.faellig_am <= inEinerWoche
      }
      if (filter === 'ueberfaellig') {
        return !!a.faellig_am && a.faellig_am < heute && a.status !== 'erledigt'
      }
      return true
    })
  }, [aufgaben, filter, heute, inEinerWoche, currentUserId])

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
      sichtbar_fuer_kunde: false, tags: [],
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
        title="Aufgaben"
        count={aufgaben.length}
        countLabel={aufgaben.length === 1 ? 'Aufgabe' : 'Aufgaben'}
        subtitle="Alle Aufgaben deiner Organisation auf einem Brett"
        action={
          pickerOptionen ? (
            <button
              onClick={() => setAnlegenStatus('backlog')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-wellbeing-green text-white rounded-lg hover:bg-wellbeing-green-dark"
            >
              <Plus size={16} /> Neue Aufgabe
            </button>
          ) : null
        }
      />
      <div className="px-6 py-6 space-y-4">
      {/* Filter-Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { id: 'alle', label: 'Alle' },
          { id: 'mir',  label: 'Mir' },
          { id: 'heute', label: 'Heute' },
          { id: 'woche', label: 'Diese Woche' },
          { id: 'ueberfaellig', label: 'Überfällig' },
        ] as { id: Filter; label: string }[]).map((p) => {
          const aktiv = filter === p.id
          return (
            <button
              key={p.id}
              onClick={() => setFilter(p.id)}
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
        {pending && <span className="text-xs text-gray-400 ml-2">speichert…</span>}
      </div>

      {/* 4-Spalten-Board */}
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
            <Karte aufgabe={aufgaben.find((a) => a.id === activeId)!} dragging team={pickerOptionen?.team} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <AufgabeDetailModal
        aufgabe={aufgaben.find((a) => a.id === detailId) ?? null}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        pickerOptionen={pickerOptionen}
      />
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
  spalte, aufgaben, team, onCardClick,
  quickAddOpen, onQuickAddOpen, onQuickAddClose,
  quickAddTitel, onQuickAddTitelChange, onQuickAddSubmit,
}: {
  spalte: { id: AufgabeStatus; label: string; farbe: string }
  aufgaben: AufgabeMitDetails[]
  team?: { user_id: string; name: string; avatarUrl: string | null }[]
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
        <div
          data-spalte-id={spalte.id}
          id={spalte.id}
          className="flex-1 p-3 space-y-2 min-h-[100px]"
        >
          {aufgaben.map((a) => (<KarteSortable key={a.id} aufgabe={a} team={team} onClick={() => onCardClick(a.id)} />))}
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
            <div className="text-center text-xs text-gray-400 py-8">
              Keine Aufgaben.
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── Karte ────────────────────────────────────────────────────
function KarteSortable({ aufgabe, team, onClick }: {
  aufgabe: AufgabeMitDetails
  team?: { user_id: string; name: string; avatarUrl: string | null }[]
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
      <Karte aufgabe={aufgabe} team={team} />
    </div>
  )
}

function Karte({ aufgabe, dragging, team }: {
  aufgabe: AufgabeMitDetails
  dragging?: boolean
  team?: { user_id: string; name: string; avatarUrl: string | null }[]
}) {
  const heute = new Date().toISOString().slice(0, 10)
  const ueberfaellig = aufgabe.faellig_am && aufgabe.faellig_am < heute && aufgabe.status !== 'erledigt'
  const istAuto = aufgabe.quelle !== 'manuell' && aufgabe.quelle !== 'kunde_anfrage'
  const checkErledigt = aufgabe.checklist.filter((c) => c.erledigt).length
  const checkGesamt   = aufgabe.checklist.length
  const assignee = aufgabe.assignee_user_id
    ? team?.find((t) => t.user_id === aufgabe.assignee_user_id)
    : null
  return (
    <div className={
      'bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-wellbeing-green/40 cursor-grab active:cursor-grabbing transition-shadow ' +
      (dragging ? 'shadow-lg' : '')
    }>
      <div className="flex items-start gap-2">
        <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${PRIO_FARBE[aufgabe.prioritaet]}`} aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 line-clamp-2">{aufgabe.titel}</p>
          {(aufgabe.projekt || aufgabe.kunde) && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 truncate">
              {aufgabe.projekt && (<><FolderOpen size={11} />{aufgabe.projekt.name}</>)}
              {aufgabe.projekt && aufgabe.kunde && <span>·</span>}
              {aufgabe.kunde && <span className="truncate">{aufgabe.kunde.name}</span>}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
            {aufgabe.faellig_am && (
              <span className={ueberfaellig ? 'inline-flex items-center gap-1 text-red-600 font-medium' : 'inline-flex items-center gap-1'}>
                {ueberfaellig ? <AlertTriangle size={11} /> : <Calendar size={11} />}
                {formatDateShort(aufgabe.faellig_am)}
              </span>
            )}
            {checkGesamt > 0 && (
              <span className="text-gray-400">{checkErledigt}/{checkGesamt}</span>
            )}
            {aufgabe.tags.length > 0 && (
              <span className="text-gray-400 truncate">#{aufgabe.tags[0]}</span>
            )}
            {istAuto && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">auto</span>
            )}
            <span className="ml-auto inline-flex items-center gap-1">
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
        </div>
      </div>
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
