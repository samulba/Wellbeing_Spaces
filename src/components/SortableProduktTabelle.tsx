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
import { produktSoftDelete, updateProduktPositionen, bestellstatusAendern } from '@/app/actions/produkte'
import type { ProduktMitDetails } from '@/lib/supabase/types'
import type { BestellStatus } from '@/lib/supabase/types'

const r2 = (n: number) => Math.round(n * 100) / 100
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

const statusBadge: Record<string, string> = {
  ausstehend:     'bg-gray-100 text-gray-500',
  freigegeben:    'bg-emerald-50 text-emerald-700',
  abgelehnt:      'bg-red-50 text-red-600',
  ueberarbeitung: 'bg-amber-50 text-amber-700',
}
const statusLabel: Record<string, string> = {
  ausstehend:     'Ausstehend',
  freigegeben:    'Freigegeben',
  abgelehnt:      'Abgelehnt',
  ueberarbeitung: 'Überarbeitung',
}

const bestellBadge: Record<BestellStatus, string> = {
  ausstehend:        'bg-gray-100 text-gray-400',
  bestellt:          'bg-blue-50 text-blue-700',
  geliefert:         'bg-emerald-50 text-emerald-700',
  rechnung_erhalten: 'bg-violet-50 text-violet-700',
}

const th = 'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest'
const td = 'px-4 py-3.5 text-gray-600'

interface ZeileProps {
  produkt: ProduktMitDetails
  mwst: number
  projektId: string
  raumId: string
  isLast: boolean
  onBestellstatusChange: (id: string, status: BestellStatus) => void
}

function SortableProduktZeile({ produkt: p, mwst, projektId, raumId, isLast, onBestellstatusChange }: ZeileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: p.id })

  const vpBrutto     = r2((p.verkaufspreis ?? 0) * (1 + mwst))
  const gesamtNetto  = r2((p.verkaufspreis ?? 0) * p.menge)
  const provisionEur = r2((p.verkaufspreis ?? 0) * ((p.provision_prozent ?? 0) / 100))
  const loeschenAktion = produktSoftDelete.bind(null, p.id, raumId, projektId)
  const status = p.produktstatus?.status ?? 'ausstehend'
  const bestellstatus = (p.bestellstatus ?? 'ausstehend') as BestellStatus

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`hover:bg-gray-50 transition-colors group ${!isLast ? 'border-b border-gray-100' : ''}`}
    >
      {/* Drag Handle */}
      <td className="px-2 py-3">
        <button
          {...attributes}
          {...listeners}
          type="button"
          aria-label="Reihenfolge ändern"
          className="text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>

      {/* Thumbnail */}
      <td className="px-3 py-3">
        {p.bild_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.bild_url}
            alt={p.name}
            className="w-8 h-8 rounded-md object-cover border border-gray-200"
          />
        ) : (
          <div className="w-8 h-8 rounded-md bg-gray-100 border border-gray-200" />
        )}
      </td>

      {/* Name + Partner */}
      <td className="px-4 py-3.5">
        <div className="font-medium text-gray-900 leading-snug">{p.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {p.partner && <span className="text-xs text-gray-500">{p.partner.name}</span>}
          {p.kategorie && <span className="text-xs text-gray-400">{p.kategorie}</span>}
          {p.produkt_url && (
            <a
              href={p.produkt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-indigo-600 underline underline-offset-2"
            >
              Link
            </a>
          )}
        </div>
      </td>

      <td className={`${td} text-center`}>{p.menge} {p.einheit}</td>
      <td className={`${td} text-center font-mono text-red-500/70`}>
        {p.einkaufspreis != null ? eur(p.einkaufspreis) : '–'}
      </td>
      <td className={`${td} text-center font-mono text-red-500/70`}>
        {p.marge_prozent != null
          ? new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(p.marge_prozent) + ' %'
          : '–'}
      </td>
      <td className={`${td} text-center font-mono`}>
        {p.verkaufspreis != null ? eur(p.verkaufspreis) : '–'}
      </td>
      <td className={`${td} text-center font-mono font-medium text-gray-900`}>
        {p.verkaufspreis != null ? eur(vpBrutto) : '–'}
      </td>
      <td className={`${td} text-center font-mono text-red-500/70`}>
        {p.provision_prozent != null && p.verkaufspreis != null ? eur(provisionEur) : '–'}
      </td>
      <td className={`${td} text-center font-mono font-semibold text-indigo-600`}>
        {p.verkaufspreis != null ? eur(gesamtNetto) : '–'}
      </td>

      {/* Freigabe-Status */}
      <td className="px-4 py-3.5 text-center">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[status] ?? 'bg-gray-100 text-gray-500'}`}>
          {statusLabel[status] ?? status}
        </span>
      </td>

      {/* Bestellstatus */}
      <td className="px-3 py-3.5 text-center">
        <select
          value={bestellstatus}
          onChange={(e) => onBestellstatusChange(p.id, e.target.value as BestellStatus)}
          className={`text-xs px-2 py-1 rounded-full font-medium cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${bestellBadge[bestellstatus]}`}
        >
          <option value="ausstehend">Offen</option>
          <option value="bestellt">Bestellt</option>
          <option value="geliefert">Geliefert</option>
          <option value="rechnung_erhalten">Rechnung</option>
        </select>
      </td>

      {/* Aktionen */}
      <td className="px-3 py-3.5">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/dashboard/projekte/${projektId}/raeume/${raumId}/produkte/${p.id}/bearbeiten`}
            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors whitespace-nowrap"
          >
            Bearb.
          </Link>
          <ConfirmDeleteButton
            action={loeschenAktion}
            label="✕"
            confirmMessage={`„${p.name}" löschen?`}
            className="text-xs text-red-400/60 hover:text-red-500 transition-colors"
          />
        </div>
      </td>
    </tr>
  )
}

export default function SortableProduktTabelle({
  produkte: initialProdukte,
  mwst,
  projektId,
  raumId,
}: {
  produkte: ProduktMitDetails[]
  mwst: number
  projektId: string
  raumId: string
}) {
  const [produkte, setProdukte] = useState(initialProdukte)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setProdukte((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id)
      const newIndex = prev.findIndex((p) => p.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)

      startTransition(() => {
        updateProduktPositionen(
          raumId,
          projektId,
          next.map((p, i) => ({ id: p.id, reihenfolge: i }))
        )
      })

      return next
    })
  }

  function handleBestellstatusChange(id: string, neuerStatus: BestellStatus) {
    setProdukte((prev) =>
      prev.map((p) => (p.id === id ? { ...p, bestellstatus: neuerStatus } : p))
    )
    startTransition(() => {
      bestellstatusAendern(id, raumId, projektId, neuerStatus)
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={produkte.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1120px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-8 px-2 py-3" />
                <th className="w-10 px-3 py-3" />
                <th className={th + ' text-left'}>Produkt</th>
                <th className={th}>Menge</th>
                <th className={`${th} text-red-400/70`} title="Intern">EP netto</th>
                <th className={`${th} text-red-400/70`} title="Intern">Marge</th>
                <th className={th}>VP netto</th>
                <th className={th}>VP brutto</th>
                <th className={`${th} text-red-400/70`} title="Intern">Provision</th>
                <th className={th}>Gesamt netto</th>
                <th className={th}>Freigabe</th>
                <th className={th}>Bestellung</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {produkte.map((p, i) => (
                <SortableProduktZeile
                  key={p.id}
                  produkt={p}
                  mwst={mwst}
                  projektId={projektId}
                  raumId={raumId}
                  isLast={i === produkte.length - 1}
                  onBestellstatusChange={handleBestellstatusChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      </SortableContext>
    </DndContext>
  )
}
