'use client'

import { useState, useMemo, useTransition } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Package, Plus, Trash2, X, ChevronDown, ChevronRight, FolderPlus,
  Sofa, Armchair, Lamp, Lightbulb, Bed, Table2, Wind,
  Leaf, Flower, TreePine, Sunrise, Droplets, Mountain, Palmtree,
  Home, Building, Building2, Hotel, Layers, Grid, DoorOpen, Bath, BedDouble,
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles, Watch, Glasses,
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud, Thermometer, Wifi,
  Coffee, Utensils, Wine, ChefHat, Dumbbell, Waves,
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map, PenLine, Pencil,
  Box, Archive, Tag, MessageSquare, Truck, Globe, Zap, Shield,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import ConfirmDeleteButton from './ConfirmDeleteButton'
import { ConfirmModal } from './ConfirmModal'
import { raumSoftDelete, updateRaumPositionen } from '@/app/actions/raeume'
import {
  raumGruppeAnlegen,
  raumGruppeUmbenennen,
  raumGruppeLoeschen,
  raumZuGruppeZuordnen,
} from '@/app/actions/raum-gruppen'
import type { Raum, RaumGruppe } from '@/lib/supabase/types'

export interface RaumStat {
  produkteAnzahl: number
  vpSumme: number
  freigegeben: number
}

const ICONS: Record<string, LucideIcon> = {
  Sofa, Armchair, Lamp, Lightbulb, Bed, Table2, Wind,
  Leaf, Flower, TreePine, Sunrise, Droplets, Mountain, Palmtree,
  Home, Building, Building2, Hotel, Layers, Grid, DoorOpen, Bath, BedDouble,
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles, Watch, Glasses,
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud, Thermometer, Wifi,
  Coffee, Utensils, Wine, ChefHat, Dumbbell, Waves,
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map, PenLine, Pencil,
  Package, Box, Archive, Tag, MessageSquare, Truck, Globe, Zap, Shield,
}

function getIcon(name: string | null): LucideIcon {
  return (name && ICONS[name]) ? ICONS[name] : Package
}

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const pct = (n: number, total: number) =>
  total > 0 ? Math.min(Math.round((n / total) * 100), 100) : 0

interface Props {
  projektId: string
  raeume: Raum[]
  raumStats?: Record<string, RaumStat>
  raumGruppen?: RaumGruppe[]
}

function SortableRaumItem({
  raum,
  projektId,
  stat,
  gruppen,
  onMove,
}: {
  raum: Raum
  projektId: string
  stat?: RaumStat
  gruppen: RaumGruppe[]
  onMove: (raumId: string, gruppeId: string | null) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: raum.id })

  const deleteAction = raumSoftDelete.bind(null, raum.id, projektId)
  const Icon = getIcon(raum.icon)

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
        position: 'relative',
      }}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors group bg-white border-b border-gray-50 last:border-0"
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        type="button"
        aria-label="Reihenfolge ändern"
        className="text-gray-200 hover:text-gray-400 transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Room Icon */}
      <div className="w-9 h-9 rounded-xl bg-wellbeing-green/8 border border-wellbeing-green/15 flex items-center justify-center shrink-0 group-hover:bg-wellbeing-green/12 transition-colors">
        <Icon className="w-4 h-4 text-wellbeing-green" />
      </div>

      {/* Info – clickable */}
      <Link
        href={`/dashboard/projekte/${projektId}/raeume/${raum.id}`}
        className="flex-1 min-w-0"
      >
        <p className="text-sm font-semibold text-gray-900 group-hover:text-wellbeing-green transition-colors truncate">
          {raum.name}
        </p>
        {stat ? (
          <>
            <p className="text-xs text-gray-400 mt-0.5">
              {stat.produkteAnzahl} Produkt{stat.produkteAnzahl !== 1 ? 'e' : ''} · {eur(stat.vpSumme)} · {stat.freigegeben} freigegeben
            </p>
            {raum.budget != null && raum.budget > 0 && (
              <div className="mt-1.5">
                {(() => {
                  const p = pct(stat.vpSumme, raum.budget!)
                  const farbe = p >= 100 ? 'bg-red-400' : p >= 80 ? 'bg-amber-400' : 'bg-wellbeing-green'
                  return (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${farbe} transition-all`} style={{ width: `${p}%` }} />
                      </div>
                      <span className={`text-[10px] font-medium shrink-0 ${p >= 100 ? 'text-red-500' : p >= 80 ? 'text-amber-500' : 'text-gray-400'}`}>
                        {p}%
                      </span>
                    </div>
                  )
                })()}
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Budget: {eur(raum.budget!)}
                  {stat.vpSumme > raum.budget! && <span className="text-red-500 ml-1">Überschritten</span>}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">Noch keine Produkte</p>
        )}
      </Link>

      {/* Actions (hover) */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {gruppen.length > 0 && (
          <div className="relative inline-block">
            <select
              value={raum.raum_gruppe_id ?? ''}
              onChange={(e) => onMove(raum.id, e.target.value || null)}
              onClick={(e) => e.stopPropagation()}
              aria-label="Gruppe zuordnen"
              className={`appearance-none text-[11px] font-medium rounded-lg pl-2.5 pr-7 py-1 max-w-[150px] truncate cursor-pointer border transition-colors focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 ${
                raum.raum_gruppe_id
                  ? 'border-wellbeing-green/30 bg-wellbeing-green/5 text-wellbeing-green-dark hover:border-wellbeing-green/50'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              <option value="">Ohne Gruppe</option>
              {gruppen.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
        <Link
          href={`/dashboard/projekte/${projektId}/raeume/${raum.id}`}
          className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark transition-colors font-medium px-2 py-1 rounded-lg hover:bg-wellbeing-green/5"
        >
          Öffnen →
        </Link>
        <ConfirmDeleteButton
          action={deleteAction}
          confirmMessage={`Raum „${raum.name}" löschen?`}
          className="text-xs text-red-400/60 hover:text-red-500 transition-colors px-1 py-1"
        />
      </div>
    </li>
  )
}

function GruppenHeader({
  gruppe,
  anzahl,
  collapsed,
  onToggle,
  onRename,
  onDelete,
}: {
  gruppe: RaumGruppe
  anzahl: number
  collapsed: boolean
  onToggle: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(gruppe.name)
  const [confirm, setConfirm] = useState(false)

  function commit() {
    setEditing(false)
    const t = name.trim()
    if (t && t !== gruppe.name) onRename(t)
    else setName(gruppe.name)
  }

  return (
    <div className="flex items-center gap-2 px-5 py-2 bg-wellbeing-green/[0.04] border-b border-gray-100 group/gh">
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Ausklappen' : 'Einklappen'}
        className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: gruppe.farbe || '#94c1a4' }} />
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setEditing(false); setName(gruppe.name) }
          }}
          className="text-sm font-semibold text-gray-800 px-1.5 py-0.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 w-44"
        />
      ) : (
        <span className="text-sm font-semibold text-gray-700 truncate">{gruppe.name}</span>
      )}
      <span className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shrink-0">{anzahl}</span>
      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/gh:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => { setName(gruppe.name); setEditing(true) }}
          aria-label="Gruppe umbenennen"
          className="p-1 text-gray-400 hover:text-wellbeing-green transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          aria-label="Gruppe löschen"
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <ConfirmModal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); onDelete() }}
        title="Gruppe löschen?"
        message={`Die Gruppe „${gruppe.name}" wird gelöscht. Die Räume bleiben erhalten und werden „Ohne Gruppe" zugeordnet.`}
        confirmText="Löschen"
      />
    </div>
  )
}

export default function SortableRaumListe({ projektId, raeume: initialRaeume, raumStats, raumGruppen: initialGruppen = [] }: Props) {
  const [raeume, setRaeume] = useState(initialRaeume)
  const [gruppen, setGruppen] = useState<RaumGruppe[]>(initialGruppen)
  const [toast, setToast] = useState<{ text: string; fehler?: boolean } | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [neueOffen, setNeueOffen] = useState(false)
  const [neuerName, setNeuerName] = useState('')
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sortierteGruppen = useMemo(
    () => [...gruppen].sort((a, b) => a.reihenfolge - b.reihenfolge || a.created_at.localeCompare(b.created_at)),
    [gruppen],
  )
  const gruppeIds = useMemo(() => new Set(sortierteGruppen.map((g) => g.id)), [sortierteGruppen])

  function zeigeToast(text: string, fehler = false) {
    setToast({ text, fehler })
    setTimeout(() => setToast(null), 3500)
  }

  function istUngrouped(r: Raum) {
    return !r.raum_gruppe_id || !gruppeIds.has(r.raum_gruppe_id)
  }
  const ungrouped = raeume.filter(istUngrouped)

  // Display-Reihenfolge: Gruppen (sortiert) zuerst, dann Ohne-Gruppe; stabile
  // Reihenfolge innerhalb jeder Gruppe = aktuelle State-Reihenfolge.
  function displayOrder(list: Raum[]): Raum[] {
    const out: Raum[] = []
    for (const g of sortierteGruppen) out.push(...list.filter((r) => r.raum_gruppe_id === g.id))
    out.push(...list.filter(istUngrouped))
    return out
  }

  function handleBucketDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const vorher = raeume
    setRaeume((prev) => {
      const oldIndex = prev.findIndex((r) => r.id === active.id)
      const newIndex = prev.findIndex((r) => r.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      const next = arrayMove(prev, oldIndex, newIndex)
      const ordered = displayOrder(next)
      startTransition(async () => {
        const res = await updateRaumPositionen(projektId, ordered.map((r, i) => ({ id: r.id, reihenfolge: i })))
        if (res?.fehler) {
          setRaeume(vorher)
          zeigeToast('Sortierung konnte nicht gespeichert werden.', true)
        }
      })
      return next
    })
  }

  function moveRoom(raumId: string, gruppeId: string | null) {
    const vorher = raeume
    setRaeume((prev) => prev.map((r) => (r.id === raumId ? { ...r, raum_gruppe_id: gruppeId } : r)))
    startTransition(async () => {
      const res = await raumZuGruppeZuordnen(raumId, gruppeId, projektId)
      if (res?.fehler) { setRaeume(vorher); zeigeToast('Verschieben fehlgeschlagen.', true) }
    })
  }

  function gruppeAnlegen() {
    const name = neuerName.trim()
    if (!name) return
    setNeuerName('')
    setNeueOffen(false)
    startTransition(async () => {
      const res = await raumGruppeAnlegen(projektId, name)
      if ('fehler' in res) { zeigeToast(res.fehler, true); return }
      setGruppen((prev) => [
        ...prev,
        {
          id: res.id, organisation_id: '', projekt_id: projektId, name,
          farbe: null, reihenfolge: prev.length, deleted_at: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        },
      ])
    })
  }

  function gruppeUmbenennen(gruppeId: string, name: string) {
    const vorher = gruppen
    setGruppen((prev) => prev.map((g) => (g.id === gruppeId ? { ...g, name } : g)))
    startTransition(async () => {
      const res = await raumGruppeUmbenennen(gruppeId, projektId, name)
      if (res?.fehler) { setGruppen(vorher); zeigeToast('Umbenennen fehlgeschlagen.', true) }
    })
  }

  function gruppeLoeschen(gruppeId: string) {
    const vorherG = gruppen
    const vorherR = raeume
    setGruppen((prev) => prev.filter((g) => g.id !== gruppeId))
    setRaeume((prev) => prev.map((r) => (r.raum_gruppe_id === gruppeId ? { ...r, raum_gruppe_id: null } : r)))
    startTransition(async () => {
      const res = await raumGruppeLoeschen(gruppeId, projektId)
      if (res?.fehler) { setGruppen(vorherG); setRaeume(vorherR); zeigeToast('Löschen fehlgeschlagen.', true) }
    })
  }

  function toggleCollapse(gid: string) {
    setCollapsed((prev) => {
      const n = new Set(prev)
      if (n.has(gid)) n.delete(gid)
      else n.add(gid)
      return n
    })
  }

  const hatGruppen = sortierteGruppen.length > 0

  function bucketListe(rooms: Raum[]) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBucketDragEnd}>
        <SortableContext items={rooms.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ul>
            {rooms.map((raum) => (
              <SortableRaumItem
                key={raum.id}
                raum={raum}
                projektId={projektId}
                stat={raumStats?.[raum.id]}
                gruppen={sortierteGruppen}
                onMove={moveRoom}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    )
  }

  return (
    <div>
      {/* Gruppen-Toolbar */}
      <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-b border-gray-100 bg-gray-50/40">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <FolderPlus className="w-3.5 h-3.5" />
          Räume-Gruppen
        </div>
        {neueOffen ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={neuerName}
              onChange={(e) => setNeuerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') gruppeAnlegen()
                if (e.key === 'Escape') { setNeueOffen(false); setNeuerName('') }
              }}
              placeholder="Gruppenname…"
              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light w-44"
            />
            <button
              type="button"
              onClick={gruppeAnlegen}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-wellbeing-green text-white hover:bg-wellbeing-green-dark transition-colors"
            >
              Anlegen
            </button>
            <button
              type="button"
              onClick={() => { setNeueOffen(false); setNeuerName('') }}
              aria-label="Abbrechen"
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNeueOffen(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-wellbeing-green hover:text-wellbeing-green-dark px-2 py-1 rounded-lg hover:bg-wellbeing-green/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Gruppe
          </button>
        )}
      </div>

      {/* Gruppen-Buckets */}
      {sortierteGruppen.map((g) => {
        const rooms = raeume.filter((r) => r.raum_gruppe_id === g.id)
        const ist = collapsed.has(g.id)
        return (
          <div key={g.id}>
            <GruppenHeader
              gruppe={g}
              anzahl={rooms.length}
              collapsed={ist}
              onToggle={() => toggleCollapse(g.id)}
              onRename={(n) => gruppeUmbenennen(g.id, n)}
              onDelete={() => gruppeLoeschen(g.id)}
            />
            {!ist && (
              rooms.length === 0 ? (
                <p className="px-5 py-3 text-xs text-gray-300 italic border-b border-gray-50">
                  Keine Räume in dieser Gruppe — über das Gruppen-Auswahlfeld eines Raums zuordnen.
                </p>
              ) : (
                bucketListe(rooms)
              )
            )}
          </div>
        )
      })}

      {/* Ohne Gruppe */}
      {hatGruppen && ungrouped.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-2 bg-gray-50/40 border-b border-gray-100">
          <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
          <span className="text-xs font-medium text-gray-400">Ohne Gruppe</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">{ungrouped.length}</span>
        </div>
      )}
      {ungrouped.length > 0 && bucketListe(ungrouped)}

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-md text-sm border ${toast.fehler ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {toast.text}
        </div>
      )}
    </div>
  )
}
