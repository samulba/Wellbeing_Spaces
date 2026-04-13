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
        <p className="text-xs text-gray-400 mt-0.5">
          {stat
            ? `${stat.produkteAnzahl} Produkt${stat.produkteAnzahl !== 1 ? 'e' : ''} · ${eur(stat.vpSumme)} · ${stat.freigegeben} freigegeben`
            : 'Noch keine Produkte'}
        </p>
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
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setRaeume((prev) => {
      const oldIndex = prev.findIndex((r) => r.id === active.id)
      const newIndex = prev.findIndex((r) => r.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)
      startTransition(() => {
        updateRaumPositionen(projektId, next.map((r, i) => ({ id: r.id, reihenfolge: i })))
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
    </DndContext>
  )
}
