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
import { GripVertical } from 'lucide-react'
import Link from 'next/link'
import ConfirmDeleteButton from './ConfirmDeleteButton'
import { raumSoftDelete, updateRaumPositionen } from '@/app/actions/raeume'
import type { Raum } from '@/lib/supabase/types'

interface Props {
  projektId: string
  raeume: Raum[]
}

function SortableRaumItem({ raum, projektId }: { raum: Raum; projektId: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: raum.id })

  const deleteAction = raumSoftDelete.bind(null, raum.id, projektId)

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
      className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group bg-white"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          type="button"
          aria-label="Reihenfolge ändern"
          className="text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
            {raum.name}
          </p>
          {raum.beschreibung && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{raum.beschreibung}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
        <Link
          href={`/dashboard/projekte/${projektId}/raeume/${raum.id}`}
          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors font-medium"
        >
          Öffnen →
        </Link>
        <ConfirmDeleteButton
          action={deleteAction}
          confirmMessage={`Raum „${raum.name}" löschen?`}
          className="text-xs text-red-400/60 hover:text-red-500 transition-colors"
        />
      </div>
    </li>
  )
}

export default function SortableRaumListe({ projektId, raeume: initialRaeume }: Props) {
  const [raeume, setRaeume] = useState(initialRaeume)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setRaeume((prev) => {
      const oldIndex = prev.findIndex((r) => r.id === active.id)
      const newIndex = prev.findIndex((r) => r.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)

      startTransition(() => {
        updateRaumPositionen(
          projektId,
          next.map((r, i) => ({ id: r.id, reihenfolge: i }))
        )
      })

      return next
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={raeume.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <ul className="divide-y divide-gray-100">
          {raeume.map((raum) => (
            <SortableRaumItem key={raum.id} raum={raum} projektId={projektId} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
