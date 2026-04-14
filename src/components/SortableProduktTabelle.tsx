'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { GripVertical, ChevronDown, Clock, Package, CheckCircle2, Receipt, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import {
  produktAusRaumEntfernen,
  updateRaumProduktPositionen,
} from '@/app/actions/raum-produkte'
import { bestellstatusAendern } from '@/app/actions/produkte'
import type { RaumProduktMitDetails } from '@/lib/supabase/types'
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

const BESTELL_CONFIG: Record<BestellStatus, { label: string; bg: string; text: string; Icon: React.ComponentType<{ className?: string }> }> = {
  ausstehend:        { label: 'Offen',    bg: 'bg-gray-100',     text: 'text-gray-500',   Icon: Clock       },
  bestellt:          { label: 'Bestellt', bg: 'bg-blue-50',      text: 'text-blue-700',   Icon: Package     },
  geliefert:         { label: 'Geliefert',bg: 'bg-emerald-50',   text: 'text-emerald-700',Icon: CheckCircle2},
  rechnung_erhalten: { label: 'Rechnung', bg: 'bg-violet-50',    text: 'text-violet-700', Icon: Receipt     },
}

function BestellStatusDropdown({ status, onChange }: { status: BestellStatus; onChange: (s: BestellStatus) => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleScroll = () => setOpen(false)
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [open])

  function handleOpen() {
    if (!buttonRef.current) return setOpen(o => !o)
    const rect = buttonRef.current.getBoundingClientRect()
    const DROPDOWN_H = 148
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow >= DROPDOWN_H
      ? rect.bottom + 4
      : rect.top - DROPDOWN_H - 4
    setPos({ top, left: rect.right - 130, width: 130 })
    setOpen(o => !o)
  }

  const current = BESTELL_CONFIG[status] ?? BESTELL_CONFIG.ausstehend
  const { Icon } = current

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${current.bg} ${current.text}`}
      >
        <Icon className="w-3 h-3" />
        {current.label}
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && (
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-xl py-1"
        >
          {(Object.entries(BESTELL_CONFIG) as [BestellStatus, typeof BESTELL_CONFIG[BestellStatus]][]).map(([key, cfg]) => {
            const ItemIcon = cfg.Icon
            return (
              <button
                key={key}
                onClick={() => { onChange(key); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${status === key ? 'bg-gray-50 font-medium' : ''}`}
              >
                <ItemIcon className={`w-3.5 h-3.5 ${cfg.text}`} />
                <span className={cfg.text}>{cfg.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

const th = 'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest'
const td = 'px-4 py-3.5 text-gray-600'

interface ZeileProps {
  eintrag: RaumProduktMitDetails
  mwst: number
  projektId: string
  raumId: string
  isLast: boolean
  onBestellstatusChange: (raumProduktId: string, status: BestellStatus) => void
  onDeleteRequest: (id: string, name: string) => void
}

function SortableProduktZeile({ eintrag, mwst, isLast, onBestellstatusChange, onDeleteRequest }: ZeileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: eintrag.id })

  const p = eintrag.produkte
  const effektivVP  = eintrag.verkaufspreis_override ?? p.verkaufspreis
  const vpBrutto    = r2((effektivVP ?? 0) * (1 + mwst))
  const gesamtNetto = r2((effektivVP ?? 0) * eintrag.menge)
  const provisionEur = r2((effektivVP ?? 0) * ((p.provision_prozent ?? 0) / 100))

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
              className="text-xs text-gray-400 hover:text-wellbeing-green underline underline-offset-2"
            >
              Link
            </a>
          )}
          {eintrag.verkaufspreis_override != null && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">
              Preis angepasst
            </span>
          )}
        </div>
      </td>

      <td className={`${td} text-center`}>{eintrag.menge} {p.einheit}</td>
      <td className={`${td} text-center font-mono text-red-500/70`}>
        {p.einkaufspreis != null ? eur(p.einkaufspreis) : '–'}
      </td>
      <td className={`${td} text-center font-mono text-red-500/70`}>
        {p.marge_prozent != null
          ? new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(p.marge_prozent) + ' %'
          : '–'}
      </td>
      <td className={`${td} text-center font-mono`}>
        {effektivVP != null ? eur(effektivVP) : '–'}
      </td>
      <td className={`${td} text-center font-mono font-medium text-gray-900`}>
        {effektivVP != null ? eur(vpBrutto) : '–'}
      </td>
      <td className={`${td} text-center font-mono text-red-500/70`}>
        {p.provision_prozent != null && effektivVP != null ? eur(provisionEur) : '–'}
      </td>
      <td className={`${td} text-center font-mono font-semibold text-wellbeing-green`}>
        {effektivVP != null ? eur(gesamtNetto) : '–'}
      </td>

      {/* Freigabe-Status */}
      <td className="px-4 py-3.5 text-center">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[status] ?? 'bg-gray-100 text-gray-500'}`}>
          {statusLabel[status] ?? status}
        </span>
      </td>

      {/* Bestellstatus */}
      <td className="px-3 py-3.5 text-center">
        <BestellStatusDropdown
          status={bestellstatus}
          onChange={(s) => onBestellstatusChange(eintrag.id, s)}
        />
      </td>

      {/* Aktionen */}
      <td className="px-3 py-3.5">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/dashboard/produkte/${p.id}/bearbeiten`}
            className="text-xs text-gray-400 hover:text-wellbeing-green transition-colors whitespace-nowrap"
          >
            Bearb.
          </Link>
          <button
            type="button"
            onClick={() => onDeleteRequest(eintrag.id, p.name)}
            className="text-xs text-red-400/60 hover:text-red-500 transition-colors"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function SortableProduktTabelle({
  eintraege: initialEintraege,
  mwst,
  projektId,
  raumId,
}: {
  eintraege: RaumProduktMitDetails[]
  mwst: number
  projektId: string
  raumId: string
}) {
  const router = useRouter()
  const [eintraege, setEintraege] = useState(initialEintraege)
  const [, startTransition] = useTransition()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setEintraege((prev) => {
      const oldIndex = prev.findIndex((e) => e.id === active.id)
      const newIndex = prev.findIndex((e) => e.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)

      startTransition(() => {
        updateRaumProduktPositionen(
          raumId,
          projektId,
          next.map((e, i) => ({ id: e.id, reihenfolge: i }))
        )
      })

      return next
    })
  }

  async function handleBestellstatusChange(raumProduktId: string, neuerStatus: BestellStatus) {
    // Optimistisch aktualisieren
    setEintraege((prev) =>
      prev.map((e) =>
        e.id === raumProduktId
          ? { ...e, produkte: { ...e.produkte, bestellstatus: neuerStatus } }
          : e
      )
    )
    const eintrag = eintraege.find((e) => e.id === raumProduktId)
    if (eintrag) {
      await bestellstatusAendern(eintrag.produkt_id, raumId, projektId, neuerStatus)
      startTransition(() => router.refresh())
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)

    // Optimistisch entfernen
    setEintraege((prev) => prev.filter((e) => e.id !== deleteTarget.id))

    await produktAusRaumEntfernen(deleteTarget.id, raumId, projektId)
    setIsDeleting(false)
    setDeleteTarget(null)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={eintraege.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="overflow-x-auto overflow-y-auto max-h-[52vh]">
            <table className="w-full text-sm min-w-[1120px]">
              <thead className="sticky top-0 z-10">
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
                {eintraege.map((e, i) => (
                  <SortableProduktZeile
                    key={e.id}
                    eintrag={e}
                    mwst={mwst}
                    projektId={projektId}
                    raumId={raumId}
                    isLast={i === eintraege.length - 1}
                    onBestellstatusChange={handleBestellstatusChange}
                    onDeleteRequest={(id, name) => setDeleteTarget({ id, name })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>

      {/* ── Lösch-Bestätigungs-Modal ───────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>

            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">
              Produkt entfernen?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              &bdquo;{deleteTarget.name}&ldquo; wird aus diesem Raum entfernt.<br />
              Das Produkt bleibt in der Bibliothek erhalten.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Entferne…
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Entfernen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
