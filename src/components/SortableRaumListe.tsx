'use client'

import { useState, useTransition } from 'react'
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
  GripVertical, Package,
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
import { raumSoftDelete, updateRaumPositionen } from '@/app/actions/raeume'
import type { Raum } from '@/lib/supabase/types'

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
}

function SortableRaumItem({
  raum,
  projektId,
  stat,
}: {
  raum: Raum
  projektId: string
  stat?: RaumStat
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

export default function SortableRaumListe({ projektId, raeume: initialRaeume, raumStats }: Props) {
  const [raeume, setRaeume] = useState(initialRaeume)
  const [fehlerToast, setFehlerToast] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const vorher = raeume
    setRaeume((prev) => {
      const oldIndex = prev.findIndex((r) => r.id === active.id)
      const newIndex = prev.findIndex((r) => r.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)
      startTransition(async () => {
        const res = await updateRaumPositionen(projektId, next.map((r, i) => ({ id: r.id, reihenfolge: i })))
        if (res?.fehler) {
          setRaeume(vorher)
          setFehlerToast('Sortierung konnte nicht gespeichert werden.')
          setTimeout(() => setFehlerToast(null), 4000)
        }
      })
      return next
    })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={raeume.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <ul>
          {raeume.map((raum) => (
            <SortableRaumItem
              key={raum.id}
              raum={raum}
              projektId={projektId}
              stat={raumStats?.[raum.id]}
            />
          ))}
        </ul>
      </SortableContext>
      {fehlerToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg shadow-md text-sm">
          {fehlerToast}
        </div>
      )}
    </DndContext>
  )
}
