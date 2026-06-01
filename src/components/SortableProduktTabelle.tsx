'use client'

import { Fragment, useState, useMemo, useTransition, useRef, useEffect } from 'react'
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
import {
  GripVertical, ChevronDown, ChevronRight, Clock, Package, CheckCircle2,
  Receipt, Trash2, X, CalendarDays, Truck, PackageCheck, Pencil,
  XCircle, AlertTriangle, Undo2, RotateCcw,
  Tag, ArrowRight, Calendar, Star, FolderPlus, Plus, Layers, StickyNote,
} from 'lucide-react'
import Link from 'next/link'
import {
  produktAusRaumEntfernen,
  produkteAusRaumEntfernenBulk,
  updateRaumProduktPositionen,
  raumProdukteAktualisieren,
  adminFavoritSetzen,
  adminFavoritEntfernen,
} from '@/app/actions/raum-produkte'
import {
  produktGruppeAnlegen,
  produktGruppeUmbenennen,
  produktGruppeLoeschen,
  raumProduktZuGruppeZuordnen,
} from '@/app/actions/produkt-gruppen'
import {
  produktBereichAnlegen,
  produktBereichUmbenennen,
  produktBereichLoeschen,
  produktGruppeZuBereichZuordnen,
  raumProduktZuBereichZuordnen,
} from '@/app/actions/produkt-bereiche'
import { ConfirmModal } from './ConfirmModal'
import Checkbox from './Checkbox'
import ZuordnungChip from './ZuordnungChip'
import AlternativeModal from './AlternativeModal'
import { bestellstatusAendern, produktDatumAktualisieren, type ProduktDatumFeld } from '@/app/actions/produkte'
import type { RaumProduktMitDetails, BestellStatus, ProduktGruppe, ProduktBereich } from '@/lib/supabase/types'
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh'
import { effektiverVpNetto, basisVpNetto } from '@/lib/preise'
import HinweisBanner from './HinweisBanner'
import ReklamationModal from './ReklamationModal'

const r2 = (n: number) => Math.round(n * 100) / 100
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

const statusBadge: Record<string, string> = {
  ausstehend:     'bg-gray-100 text-gray-600',
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
  ausstehend:        { label: 'Offen',         bg: 'bg-gray-100',    text: 'text-gray-600',    Icon: Clock         },
  bestellt:          { label: 'Bestellt',      bg: 'bg-blue-50',     text: 'text-blue-700',    Icon: Package       },
  teilgeliefert:     { label: 'Teilgeliefert', bg: 'bg-amber-50',    text: 'text-amber-700',   Icon: PackageCheck  },
  geliefert:         { label: 'Geliefert',     bg: 'bg-emerald-50',  text: 'text-emerald-700', Icon: CheckCircle2  },
  mangel_gemeldet:   { label: 'Mangel',        bg: 'bg-orange-50',   text: 'text-orange-700',  Icon: AlertTriangle },
  retoure_unterwegs: { label: 'Retoure unterwegs', bg: 'bg-indigo-50', text: 'text-indigo-700', Icon: Undo2        },
  retoure_erhalten:  { label: 'Retoure erhalten', bg: 'bg-slate-100', text: 'text-slate-700',  Icon: RotateCcw     },
  rechnung_erhalten: { label: 'Rechnung',      bg: 'bg-violet-50',   text: 'text-violet-700',  Icon: Receipt       },
  storniert:         { label: 'Storniert',     bg: 'bg-rose-50',     text: 'text-rose-700',    Icon: XCircle       },
}

// ── Bestell-Status Dropdown ─────────────────────────────────────

function BestellStatusDropdown({ status, onChange }: { status: BestellStatus; onChange: (s: BestellStatus) => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node
      // Schließen NUR wenn Klick wirklich außerhalb des Buttons UND des Popovers lag.
      // Vorher wurde das Popover beim mousedown geschlossen, bevor der onClick
      // auf dem Item-Button feuern konnte → Status blieb unverändert.
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        (!popoverRef.current || !popoverRef.current.contains(target))
      ) {
        setOpen(false)
      }
    }
    const handleScroll = () => setOpen(false)
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleOpen() {
    if (!buttonRef.current) return setOpen((o) => !o)
    const rect = buttonRef.current.getBoundingClientRect()
    const DROPDOWN_H = 148
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow >= DROPDOWN_H ? rect.bottom + 4 : rect.top - DROPDOWN_H - 4
    setPos({ top, left: rect.right - 140, width: 140 })
    setOpen((o) => !o)
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
          ref={popoverRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl py-1"
        >
          {(Object.entries(BESTELL_CONFIG) as [BestellStatus, typeof BESTELL_CONFIG[BestellStatus]][]).map(([key, cfg]) => {
            const ItemIcon = cfg.Icon
            return (
              <button
                key={key}
                type="button"
                // onMouseDown statt onClick: mousedown feuert VOR dem outside-Handler,
                // so ist der State-Update garantiert, auch falls ein anderer Handler
                // zwischen mousedown und click das Popover unmountet.
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(key)
                  setOpen(false)
                }}
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

// ── Produkt-Zeile ───────────────────────────────────────────────

const td = 'px-4 py-3.5 text-gray-700'

function SortableProduktZeile({
  eintrag,
  mwst,
  isLast,
  expanded,
  onToggleExpand,
  onBestellstatusChange,
  onDeleteRequest,
  onReklamationRequest,
  onDatumChange,
  onRabattChange,
  onMengeChange,
  gruppen,
  istGruppiert,
  onAdminFavoritChange,
  onGruppeChange,
  onAlternativeRequest,
  bereiche,
  onBereichChange,
  istMarkiert,
  onToggleSelect,
}: {
  eintrag: RaumProduktMitDetails
  mwst: number
  isLast: boolean
  expanded: boolean
  onToggleExpand: () => void
  onBestellstatusChange: (raumProduktId: string, status: BestellStatus) => void
  onDeleteRequest: (id: string, name: string) => void
  onReklamationRequest: (id: string, name: string) => void
  onDatumChange: (raumProduktId: string, feld: ProduktDatumFeld, wert: string | null) => void
  onRabattChange: (raumProduktId: string, rabatt: number | null) => void
  onMengeChange: (raumProduktId: string, menge: number) => void
  gruppen: ProduktGruppe[]
  istGruppiert: boolean
  onAdminFavoritChange: (raumProduktId: string, aktuellFavorit: boolean) => void
  onGruppeChange: (raumProduktId: string, gruppeId: string | null) => void
  onAlternativeRequest: (eintrag: RaumProduktMitDetails) => void
  bereiche: ProduktBereich[]
  onBereichChange: (raumProduktId: string, bereichId: string | null) => void
  istMarkiert: boolean
  onToggleSelect: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: eintrag.id })

  // Inline-Edit fuer Menge
  const [mengeEdit, setMengeEdit]       = useState(false)
  const [mengeInput, setMengeInput]     = useState(String(eintrag.menge))
  function mengeSpeichern() {
    const num = parseInt(mengeInput, 10)
    if (!Number.isFinite(num) || num < 1) {
      // Reset auf alten Wert
      setMengeInput(String(eintrag.menge))
      setMengeEdit(false)
      return
    }
    if (num !== eintrag.menge) onMengeChange(eintrag.id, num)
    setMengeEdit(false)
  }

  const p = eintrag.produkte
  const effektivVP = effektiverVpNetto(
    { verkaufspreis_override: eintrag.verkaufspreis_override, rabatt_prozent: eintrag.rabatt_prozent ?? null },
    p.verkaufspreis,
  )
  const basisVP = basisVpNetto({ verkaufspreis_override: eintrag.verkaufspreis_override }, p.verkaufspreis)
  const hasEffektivVP = (eintrag.verkaufspreis_override != null) || (p.verkaufspreis != null)
  const vpBrutto = r2(effektivVP * (1 + mwst))
  const gesamtBrutto = r2(vpBrutto * eintrag.menge)
  const gesamtNetto = r2(effektivVP * eintrag.menge)
  const provisionEur = r2(effektivVP * ((p.provision_prozent ?? 0) / 100))

  // Alle Status-Felder liegen seit Migration 076 auf raum_produkte (pro Raum).
  const status = (eintrag.freigabe_status ?? 'ausstehend') as typeof eintrag.freigabe_status
  const bestellstatus = (eintrag.bestellstatus ?? 'ausstehend') as BestellStatus
  const bestelltAm         = eintrag.bestellt_am
  const lieferterminDatum  = eintrag.liefertermin
  const lieferungErhaltenAm = eintrag.lieferung_erhalten_am

  const zeileKlasse = !isLast || expanded ? 'border-b border-gray-100' : ''

  return (
    <Fragment>
      <tr
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
        className={`transition-colors group ${istMarkiert ? 'bg-wellbeing-green/5 hover:bg-wellbeing-green/10' : 'hover:bg-gray-50/70'} ${zeileKlasse}`}
      >
        {/* Auswahl-Checkbox */}
        <td className="pl-3 pr-0 py-3 align-middle">
          <Checkbox
            checked={istMarkiert}
            onChange={() => onToggleSelect(eintrag.id)}
            onClick={(e) => e.stopPropagation()}
            ariaLabel={`${p.name} auswählen`}
          />
        </td>

        {/* Drag Handle */}
        <td className="pl-1 pr-1 py-3 align-middle">
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

        {/* Expand */}
        <td className="px-1 py-3 align-middle">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? 'Details einklappen' : 'Details einblenden'}
            title={expanded ? 'Details einklappen' : 'Bestelldaten & interne Kalkulation anzeigen'}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors border ${
              expanded
                ? 'bg-wellbeing-cream/70 text-wellbeing-green border-wellbeing-green/30'
                : 'text-gray-400 border-transparent hover:bg-gray-100 hover:text-gray-600 hover:border-gray-200'
            }`}
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </td>

        {/* Thumbnail + Produkt-Info */}
        <td className="px-3 py-3 align-middle">
          {p.bild_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.bild_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
              <Package className="w-4 h-4 text-gray-300" />
            </div>
          )}
        </td>

        <td className="px-2 py-3.5 align-middle">
          <div className="flex items-center gap-2 flex-wrap">
            {istGruppiert && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAdminFavoritChange(eintrag.id, !!eintrag.admin_favorit) }}
                aria-label={eintrag.admin_favorit ? 'Favorit entfernen' : 'Als Favorit (Empfehlung) markieren'}
                title={eintrag.admin_favorit ? 'Euer Favorit (Empfehlung) — klicken zum Entfernen' : 'Als Favorit / Empfehlung markieren'}
                className="shrink-0"
              >
                <Star className={`w-4 h-4 transition-colors ${eintrag.admin_favorit ? 'fill-wellbeing-green text-wellbeing-green' : 'text-gray-300 hover:text-wellbeing-green'}`} />
              </button>
            )}
            {p.produkt_url ? (
              <a
                href={p.produkt_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Produktlink in neuem Tab öffnen"
                className="font-medium text-gray-900 leading-snug hover:text-wellbeing-green hover:underline transition-colors"
              >
                {p.name}
              </a>
            ) : (
              <span className="font-medium text-gray-900 leading-snug">{p.name}</span>
            )}
            {p.hinweis_extern && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold"
                title={p.hinweis_extern}
              >
                !
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-0.5 text-[11px] text-gray-400">
            {istGruppiert && (
              eintrag.admin_favorit ? (
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-semibold text-[10px] inline-flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" /> Favorit
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium text-[10px]">
                  Alternative
                </span>
              )
            )}
            {p.partner && <span>{p.partner.name}</span>}
            {p.kategorie && (
              <>
                {p.partner && <span className="text-gray-300">·</span>}
                <span>{p.kategorie}</span>
              </>
            )}
            {p.verfuegbarkeit && (
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium text-[10px]">
                {verfuegbarkeitLabel(p.verfuegbarkeit)}
              </span>
            )}
            {eintrag.verkaufspreis_override != null && (
              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium text-[10px]">
                Preis angepasst
              </span>
            )}
            {eintrag.rabatt_prozent != null && eintrag.rabatt_prozent > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded-full font-semibold text-[10px]">
                −{fmtProzent(eintrag.rabatt_prozent)}
              </span>
            )}
          </div>
          {/* Zuordnung (Gruppe + Auswahl-Block) als ein Chip mit Popover */}
          <ZuordnungChip
            eintrag={eintrag}
            gruppen={gruppen}
            bereiche={bereiche}
            onGruppeChange={onGruppeChange}
            onBereichChange={onBereichChange}
          />
        </td>

        {/* Menge — inline editierbar */}
        <td className={`${td} text-center whitespace-nowrap`}>
          {mengeEdit ? (
            <input
              type="number"
              min={1}
              autoFocus
              value={mengeInput}
              onChange={(e) => setMengeInput(e.target.value)}
              onBlur={mengeSpeichern}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() }
                if (e.key === 'Escape') { setMengeInput(String(eintrag.menge)); setMengeEdit(false) }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-14 px-1.5 py-0.5 text-sm text-center font-medium border border-wellbeing-green-light rounded focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 bg-white"
            />
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMengeInput(String(eintrag.menge)); setMengeEdit(true) }}
              className="inline-flex items-baseline gap-1 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors group/menge"
              title="Klicken zum Bearbeiten"
            >
              <span className="text-gray-900 font-medium group-hover/menge:text-wellbeing-green">{eintrag.menge}</span>
              <span className="text-gray-400 text-xs">{p.einheit}</span>
            </button>
          )}
          {eintrag.kunde_menge != null && eintrag.kunde_menge !== eintrag.menge && (
            <div className="mt-0.5">
              <span
                className="inline-block text-[10px] font-semibold text-wellbeing-terracotta bg-wellbeing-terracotta/10 px-1.5 py-0.5 rounded"
                title="Vom Kunden in der Freigabe gewünschte Menge"
              >
                Kunde: {eintrag.kunde_menge}
              </span>
            </div>
          )}
        </td>

        {/* VP Brutto (Stück) */}
        <td className={`${td} text-right font-mono whitespace-nowrap`}>
          {hasEffektivVP ? eur(vpBrutto) : <span className="text-gray-300">–</span>}
        </td>

        {/* Gesamt brutto */}
        <td className={`${td} text-right font-mono font-semibold text-wellbeing-green whitespace-nowrap`}>
          {hasEffektivVP ? eur(gesamtBrutto) : <span className="text-gray-300">–</span>}
        </td>

        {/* Marge / Provision (intern, kompakt) */}
        <td className={`${td} text-center whitespace-nowrap`} title="Marge · Provision (nur intern sichtbar)">
          {(p.marge_prozent != null || p.provision_prozent != null) ? (
            <div className="inline-flex flex-col items-center gap-0.5 leading-tight">
              <span className="text-[11px] text-gray-600 font-mono tabular-nums">
                {p.marge_prozent != null ? `${p.marge_prozent}%` : '–'}
                <span className="mx-1 text-gray-300">·</span>
                {p.provision_prozent != null ? `${p.provision_prozent}%` : '–'}
              </span>
              {hasEffektivVP && p.provision_prozent != null && (
                <span className="text-[10px] text-gray-400 font-mono tabular-nums">
                  {eur(provisionEur)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-300">–</span>
          )}
        </td>

        {/* Freigabe */}
        <td className="px-3 py-3.5 text-center align-middle">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusBadge[status] ?? 'bg-gray-100 text-gray-500'}`}>
            {statusLabel[status] ?? status}
          </span>
        </td>

        {/* Bestellung + inline Datum */}
        <td className="px-3 py-3.5 text-center align-middle">
          <div className="inline-flex flex-col items-center gap-1">
            <BestellStatusDropdown
              status={bestellstatus}
              onChange={(s) => onBestellstatusChange(eintrag.id, s)}
            />
            {(() => {
              // Zeige das passendste Datum direkt unter dem Badge
              if (bestellstatus === 'geliefert' || bestellstatus === 'rechnung_erhalten') {
                if (lieferungErhaltenAm) {
                  return <span className="text-[10px] text-gray-400 inline-flex items-center gap-1"><PackageCheck className="w-2.5 h-2.5" /> {fmtDate(lieferungErhaltenAm)}</span>
                }
              }
              if (bestellstatus === 'bestellt') {
                if (lieferterminDatum) {
                  return <span className="text-[10px] text-gray-400 inline-flex items-center gap-1"><Truck className="w-2.5 h-2.5" /> erw. {fmtDate(lieferterminDatum)}</span>
                }
                if (bestelltAm) {
                  return <span className="text-[10px] text-gray-400 inline-flex items-center gap-1"><CalendarDays className="w-2.5 h-2.5" /> {fmtDate(bestelltAm)}</span>
                }
              }
              return null
            })()}
          </div>
        </td>

        {/* Aktionen */}
        <td className="pr-3 pl-1 py-3.5 align-middle">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onAlternativeRequest(eintrag)}
              aria-label="Alternative hinzufügen"
              title="Alternative(n) hinzufügen — Auswahl-Gruppe für dieses Produkt"
              className="p-1.5 text-gray-400 hover:text-wellbeing-green rounded-md hover:bg-wellbeing-cream/50 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <Link
              href={`/dashboard/produkte/${p.id}/bearbeiten`}
              aria-label="Produkt bearbeiten"
              title="Bearbeiten"
              className="p-1.5 text-gray-400 hover:text-wellbeing-green rounded-md hover:bg-wellbeing-cream/50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => onReklamationRequest(eintrag.id, p.name)}
              aria-label="Reklamation anlegen"
              title="Reklamation anlegen"
              className="p-1.5 text-gray-400 hover:text-orange-500 rounded-md hover:bg-orange-50 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteRequest(eintrag.id, p.name)}
              aria-label="Produkt entfernen"
              title="Produkt entfernen"
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className={`bg-gray-50/60 ${!isLast ? 'border-b border-gray-100' : ''}`}>
          <td colSpan={12} className="px-6 py-5 space-y-4">

            {p.hinweis_extern && (
              <HinweisBanner
                text={p.hinweis_extern}
                fuerKunden={p.hinweis_extern_sichtbar}
                showSichtbarkeit
              />
            )}

            {/* Preis-Anpassung als eigenständige Karte mit Kalkulations-Flow */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> Preis-Anpassung
                </span>
                {eintrag.rabatt_prozent != null && eintrag.rabatt_prozent > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold">
                    −{fmtProzent(eintrag.rabatt_prozent)} aktiv
                  </span>
                )}
              </div>
              <div className="px-4 py-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Basis-VP</span>
                  <span className="font-mono text-sm text-gray-800">{eur(basisVP)}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Rabatt</span>
                  <RabattField
                    raumProduktId={eintrag.id}
                    initial={eintrag.rabatt_prozent}
                    onChange={(v) => onRabattChange(eintrag.id, v)}
                  />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-wellbeing-green uppercase tracking-wider font-semibold">Effektiver VP</span>
                  <span className="font-mono text-sm font-bold text-wellbeing-green">{eur(effektivVP)}</span>
                </div>
              </div>
            </div>

            {/* 2-Spalten: Bestell-Timeline links, Interne Kalkulation rechts */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">

              {/* Bestellung & Lieferung — als horizontale Timeline */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Truck className="w-3 h-3" /> Bestellung & Lieferung
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {bestellstatusLabel(bestellstatus)}
                  </span>
                </div>
                <div className="px-4 py-4">
                  <TimelineDatumPicker
                    steps={[
                      {
                        label: 'Bestellt',
                        Icon: CalendarDays,
                        value: bestelltAm ?? '',
                        onChange: (v) => onDatumChange(eintrag.id, 'bestellt_am', v || null),
                        aktiv: !!bestelltAm,
                      },
                      {
                        label: 'Geplante Lieferung',
                        Icon: Truck,
                        value: lieferterminDatum ?? '',
                        onChange: (v) => onDatumChange(eintrag.id, 'liefertermin', v || null),
                        aktiv: !!lieferterminDatum,
                      },
                      {
                        label: 'Geliefert',
                        Icon: PackageCheck,
                        value: lieferungErhaltenAm ?? '',
                        onChange: (v) => onDatumChange(eintrag.id, 'lieferung_erhalten_am', v || null),
                        aktiv: !!lieferungErhaltenAm,
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Interne Kalkulation — als KPI-Karten */}
              <div className="bg-white border border-red-100 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-50 bg-red-50/40">
                  <span className="text-[10px] font-bold text-red-500/80 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                    Interne Kalkulation
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold border border-red-100">
                    nur intern
                  </span>
                </div>
                <div className="px-4 py-4 grid grid-cols-2 gap-3">
                  <KpiZelle label="EP netto" wert={p.einkaufspreis != null ? eur(p.einkaufspreis) : '–'} intern />
                  <KpiZelle label="Marge"     wert={p.marge_prozent != null ? fmtProzent(p.marge_prozent) : '–'} intern />
                  <KpiZelle label="VP netto"  wert={hasEffektivVP ? eur(effektivVP) : '–'} />
                  <KpiZelle label="Provision" wert={p.provision_prozent != null && hasEffektivVP ? `${fmtProzent(p.provision_prozent)} · ${eur(provisionEur)}` : '–'} intern />
                  <div className="col-span-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Gesamt netto</span>
                    <span className="font-mono text-base font-bold text-wellbeing-green">
                      {hasEffektivVP ? eur(gesamtNetto) : '–'}
                    </span>
                  </div>
                </div>
                {p.produkt_url && (
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/40">
                    <a
                      href={p.produkt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-wellbeing-green transition-colors"
                    >
                      Produktlink öffnen <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

// ── Sub-Zellen ──────────────────────────────────────────────────

type TimelineStep = {
  label: string
  Icon: React.ComponentType<{ className?: string }>
  value: string
  onChange: (v: string) => void
  aktiv: boolean
}

/**
 * Horizontale Timeline mit drei Date-Pickern (Bestellt → Geplante Lieferung → Geliefert).
 * Verbundene Punkte via Line, Aktiv-Step bekommt wellbeing-green, inaktive grau.
 * Date-Input ist visuell an den Schritt gebunden.
 */
function TimelineDatumPicker({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="relative">
      {/* Verbindungslinie hinter den Bubbles */}
      <div className="hidden sm:block absolute top-[18px] left-[12%] right-[12%] h-[2px] bg-gray-100 rounded-full" aria-hidden />
      <div className="hidden sm:block absolute top-[18px] left-[12%] h-[2px] rounded-full bg-wellbeing-green/70 transition-all"
        style={{
          width: `${(steps.filter((s) => s.aktiv).length / 3) * 76}%`,
        }}
        aria-hidden
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {steps.map((step, i) => (
          <TimelineStepItem key={i} step={step} />
        ))}
      </div>
    </div>
  )
}

function TimelineStepItem({ step }: { step: TimelineStep }) {
  const [local, setLocal] = useState(step.value)
  const [focused, setFocused] = useState(false)
  useEffect(() => setLocal(step.value), [step.value])
  const { Icon } = step

  return (
    <div className="flex flex-col items-center sm:items-start">
      {/* Bubble mit Icon (für Timeline-Visual) */}
      <div className="relative mb-2">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
          step.aktiv
            ? 'bg-wellbeing-green border-wellbeing-green text-white shadow-md shadow-wellbeing-green-light/40'
            : 'bg-white border-gray-200 text-gray-400'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <span className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${step.aktiv ? 'text-wellbeing-green' : 'text-gray-400'}`}>
        {step.label}
      </span>

      <div className={`relative w-full group transition-all ${focused ? 'ring-2 ring-wellbeing-green/20 rounded-lg' : ''}`}>
        <Calendar className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-colors ${
          step.aktiv ? 'text-wellbeing-green' : 'text-gray-300 group-hover:text-gray-500'
        }`} />
        <input
          type="date"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            if (local !== step.value) step.onChange(local)
          }}
          className={`w-full pl-8 pr-2 py-2 text-xs rounded-lg border focus:outline-none transition-colors ${
            step.aktiv
              ? 'bg-wellbeing-cream/40 border-wellbeing-green/30 text-wellbeing-green-dark font-medium'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        />
      </div>
    </div>
  )
}

function RabattField({
  raumProduktId,
  initial,
  onChange,
}: {
  raumProduktId: string
  initial: number | null | undefined
  onChange: (v: number | null) => void
}) {
  const [local, setLocal] = useState(initial != null ? String(initial) : '')
  useEffect(() => { setLocal(initial != null ? String(initial) : '') }, [initial, raumProduktId])

  function commit() {
    if (!local.trim()) {
      if (initial != null) onChange(null)
      return
    }
    const parsed = parseFloat(local.replace(',', '.'))
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      setLocal(initial != null ? String(initial) : '')
      return
    }
    if (parsed !== initial) onChange(parsed)
  }

  const hasValue = local.trim() !== '' && parseFloat(local.replace(',', '.')) > 0

  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        max={100}
        step="0.01"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        placeholder="0"
        className={`w-20 px-2 pr-7 py-1.5 text-right text-sm font-mono rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-rose-200 ${
          hasValue
            ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold focus:border-rose-400'
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 focus:border-wellbeing-green-light'
        }`}
      />
      <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium pointer-events-none ${
        hasValue ? 'text-rose-500' : 'text-gray-400'
      }`}>
        %
      </span>
    </div>
  )
}

function KpiZelle({ label, wert, intern }: { label: string; wert: string; intern?: boolean; span?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 border ${intern ? 'bg-red-50/40 border-red-100' : 'bg-gray-50/60 border-gray-100'}`}>
      <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${intern ? 'text-red-500/80' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`font-mono text-sm font-semibold ${intern ? 'text-red-600/90' : 'text-gray-800'}`}>{wert}</p>
    </div>
  )
}

function fmtProzent(n: number) {
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(n)} %`
}

function bestellstatusLabel(s: BestellStatus): string {
  return BESTELL_CONFIG[s]?.label ?? 'Offen'
}

function verfuegbarkeitLabel(v: string): string {
  switch (v) {
    case 'standard':       return 'Standardmäßig lieferbar'
    case 'lieferzeit_4_6': return 'Lieferbar in 4–6 Wochen'
    case 'saisonal':       return 'Saisonal'
    case 'auf_anfrage':    return 'Auf Anfrage'
    default:               return v
  }
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(d)
}

// ── Produkt-Gruppen-Kopfzeile ───────────────────────────────────

function ProduktGruppeHeader({
  gruppe,
  anzahl,
  hatFavorit,
  onRename,
  onDelete,
  bereiche,
  onBereichChange,
  alleMarkiert,
  teilMarkiert,
  onToggleAlle,
}: {
  gruppe: ProduktGruppe
  anzahl: number
  hatFavorit: boolean
  onRename: (name: string) => void
  onDelete: () => void
  bereiche: ProduktBereich[]
  onBereichChange: (bereichId: string | null) => void
  alleMarkiert: boolean
  teilMarkiert: boolean
  onToggleAlle: () => void
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
    <tr className="bg-wellbeing-cream/40 border-b border-wellbeing-cream/70 group/gh">
      <td className="pl-3 pr-0 py-2 align-middle">
        <Checkbox checked={alleMarkiert} indeterminate={teilMarkiert} onChange={onToggleAlle} ariaLabel={`Alle in ${gruppe.name} auswählen`} />
      </td>
      <td colSpan={11} className="px-4 py-2">
        <div className="flex items-center gap-2">
          <FolderPlus className="w-3.5 h-3.5 text-wellbeing-green shrink-0" />
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
              className="text-xs font-semibold text-wellbeing-green-dark px-1.5 py-0.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 w-48"
            />
          ) : (
            <span className="text-xs font-bold text-wellbeing-green-dark uppercase tracking-wide">{gruppe.name}</span>
          )}
          <span className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shrink-0">
            {anzahl} {anzahl === 1 ? 'Produkt' : 'Produkte'}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0 ${hatFavorit ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            <Star className={`w-2.5 h-2.5 ${hatFavorit ? 'fill-emerald-600 text-emerald-600' : 'text-amber-600'}`} />
            {hatFavorit ? 'Empfehlung gesetzt' : 'Keine Empfehlung'}
          </span>
          {bereiche.length > 0 && (
            <div className="relative inline-flex items-center shrink-0">
              <Layers className={`w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none ${gruppe.bereich_id ? 'text-wellbeing-green' : 'text-gray-400'}`} />
              <select
                value={gruppe.bereich_id ?? ''}
                onChange={(e) => onBereichChange(e.target.value || null)}
                aria-label="Block einer Gruppe zuordnen"
                title="Diesen Auswahl-Block einer Gruppe zuordnen"
                className={`appearance-none text-[11px] font-medium rounded-lg pl-7 pr-6 py-1 max-w-[180px] truncate cursor-pointer border transition-colors focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 ${
                  gruppe.bereich_id
                    ? 'border-wellbeing-green/30 bg-wellbeing-green/5 text-wellbeing-green-dark hover:bg-wellbeing-green/10 hover:border-wellbeing-green/50'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <option value="">Ohne Gruppe</option>
                {bereiche.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/gh:opacity-100 transition-opacity">
            <button type="button" onClick={() => { setName(gruppe.name); setEditing(true) }} aria-label="Auswahl-Block umbenennen" className="p-1 text-gray-400 hover:text-wellbeing-green transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => setConfirm(true)} aria-label="Auswahl-Block löschen" className="p-1 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {gruppe.kunde_notiz && gruppe.kunde_notiz.trim() && (
          <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-wellbeing-terracotta bg-wellbeing-terracotta/10 rounded-md px-2 py-1 max-w-2xl">
            <StickyNote className="w-3 h-3 shrink-0 mt-0.5" />
            <span><span className="font-semibold">Kundennotiz:</span> {gruppe.kunde_notiz}</span>
          </div>
        )}
        <ConfirmModal
          isOpen={confirm}
          onClose={() => setConfirm(false)}
          onConfirm={() => { setConfirm(false); onDelete() }}
          title="Auswahl-Block löschen?"
          message={`Der Auswahl-Block „${gruppe.name}" wird gelöscht. Die Produkte bleiben im Raum, verlieren aber ihre Block- und Favoriten-Markierung.`}
          confirmText="Löschen"
        />
      </td>
    </tr>
  )
}

// ── Bereich-Kopfzeile ("Gruppe", Migration 116) ────────────────
// Organisatorische Ebene oberhalb der Auswahl-Blöcke. Nicht klappbar
// (bewusst einfach gehalten), mit Umbenennen + Löschen.
function BereichHeader({
  bereich,
  anzahl,
  onRename,
  onDelete,
  alleMarkiert,
  teilMarkiert,
  onToggleAlle,
}: {
  bereich: ProduktBereich
  anzahl: number
  onRename: (name: string) => void
  onDelete: () => void
  alleMarkiert: boolean
  teilMarkiert: boolean
  onToggleAlle: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(bereich.name)
  const [confirm, setConfirm] = useState(false)

  function commit() {
    setEditing(false)
    const t = name.trim()
    if (t && t !== bereich.name) onRename(t)
    else setName(bereich.name)
  }

  return (
    <tr className="bg-wellbeing-green/10 border-y border-wellbeing-green/20 group/bh">
      <td className="pl-3 pr-0 py-2 align-middle">
        <Checkbox checked={alleMarkiert} indeterminate={teilMarkiert} onChange={onToggleAlle} ariaLabel={`Alle in ${bereich.name} auswählen`} />
      </td>
      <td colSpan={11} className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/5"
            style={{ backgroundColor: bereich.farbe || '#445c49' }}
          />
          <Layers className="w-3.5 h-3.5 text-wellbeing-green shrink-0" />
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') { setEditing(false); setName(bereich.name) }
              }}
              className="text-sm font-bold text-wellbeing-green-dark px-1.5 py-0.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 w-56"
            />
          ) : (
            <span className="text-sm font-bold text-wellbeing-green-dark tracking-tight">{bereich.name}</span>
          )}
          <span className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shrink-0">
            {anzahl} {anzahl === 1 ? 'Produkt' : 'Produkte'}
          </span>
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/bh:opacity-100 transition-opacity">
            <button type="button" onClick={() => { setName(bereich.name); setEditing(true) }} aria-label="Gruppe umbenennen" className="p-1 text-gray-400 hover:text-wellbeing-green transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => setConfirm(true)} aria-label="Gruppe löschen" className="p-1 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <ConfirmModal
          isOpen={confirm}
          onClose={() => setConfirm(false)}
          onConfirm={() => { setConfirm(false); onDelete() }}
          title="Gruppe löschen?"
          message={`Die Gruppe „${bereich.name}" wird gelöscht. Die Auswahl-Blöcke und Produkte bleiben erhalten und werden „Ohne Gruppe" zugeordnet.`}
          confirmText="Löschen"
        />
      </td>
    </tr>
  )
}

// ── Tabelle ─────────────────────────────────────────────────────

const th = 'px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest'

export default function SortableProduktTabelle({
  eintraege: initialEintraege,
  mwst,
  projektId,
  raumId,
  produktGruppen: initialGruppen = [],
  produktBereiche: initialBereiche = [],
}: {
  eintraege: RaumProduktMitDetails[]
  mwst: number
  projektId: string
  raumId: string
  produktGruppen?: ProduktGruppe[]
  produktBereiche?: ProduktBereich[]
}) {
  const router = useRouter()
  const [eintraege, setEintraege] = useState(initialEintraege)
  const [gruppen, setGruppen] = useState<ProduktGruppe[]>(initialGruppen)
  const [bereiche, setBereiche] = useState<ProduktBereich[]>(initialBereiche)
  const [neueGruppeOffen, setNeueGruppeOffen] = useState(false)
  const [neuerGruppenName, setNeuerGruppenName] = useState('')
  const [neueBereichOffen, setNeueBereichOffen] = useState(false)
  const [neuerBereichName, setNeuerBereichName] = useState('')
  const [, startTransition] = useTransition()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // Reklamations-Modal-Target
  const [reklamationTarget, setReklamationTarget] = useState<{ id: string; name: string } | null>(null)
  // Produkt, zu dem Alternativen hinzugefügt werden ("+ Alternative")
  const [alternativeFuer, setAlternativeFuer] = useState<RaumProduktMitDetails | null>(null)
  // Mehrfachauswahl (Freigaben-Stil)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOffen, setBulkDeleteOffen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Live-Updates: Bestellstatus / Freigabe / Liefertermin werden auch
  // von Kunden-Freigabelinks und anderen Team-Mitgliedern geändert.
  // Filter auf raum_id verhindert, dass Updates aus anderen Räumen
  // unnötig refreshen. Debounce 600 ms damit Bulk-Updates (z. B.
  // Kunden-Freigabe-Bulk) nicht in einem Sturm landen.
  useRealtimeRefresh({
    channelName: `raum-produkte-${raumId}`,
    table:       'raum_produkte',
    filter:      `raum_id=eq.${raumId}`,
    debounceMs:  600,
  })
  const [fehlerToast, setFehlerToast] = useState<string | null>(null)
  const [erfolgToast, setErfolgToast] = useState<string | null>(null)

  // Sync mit Server-Daten NUR wenn sich die ID-Liste oder Reihenfolge ändert
  // (z.B. nach Filter-Wechsel oder Add/Remove). Wir resetten NICHT bei jedem
  // initialEintraege-Reference-Change, weil das den optimistischen Status zurücksetzen würde.
  const initialIdsKey = initialEintraege.map((e) => e.id).join(',')
  useEffect(() => {
    setEintraege(initialEintraege)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIdsKey])

  // Produkt-Gruppen mit Server-Daten synchronisieren (Migration 114)
  const gruppenKey = initialGruppen.map((g) => `${g.id}:${g.name}:${g.bereich_id ?? ''}`).join(',')
  useEffect(() => {
    setGruppen(initialGruppen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppenKey])

  // Bereiche mit Server-Daten synchronisieren (Migration 116)
  const bereicheKey = initialBereiche.map((b) => `${b.id}:${b.name}`).join(',')
  useEffect(() => {
    setBereiche(initialBereiche)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bereicheKey])

  const sortierteGruppen = useMemo(
    () => [...gruppen].sort((a, b) => a.reihenfolge - b.reihenfolge || a.created_at.localeCompare(b.created_at)),
    [gruppen],
  )
  const gruppeIds = useMemo(() => new Set(sortierteGruppen.map((g) => g.id)), [sortierteGruppen])
  const hatGruppen = sortierteGruppen.length > 0
  const istUngrouped = (e: RaumProduktMitDetails) => !e.produkt_gruppe_id || !gruppeIds.has(e.produkt_gruppe_id)

  const sortierteBereiche = useMemo(
    () => [...bereiche].sort((a, b) => a.reihenfolge - b.reihenfolge || a.created_at.localeCompare(b.created_at)),
    [bereiche],
  )
  const bereichIds = useMemo(() => new Set(sortierteBereiche.map((b) => b.id)), [sortierteBereiche])
  const hatBereiche = sortierteBereiche.length > 0

  // Zwei-Ebenen-Layout (Migration 116): Bereich → Auswahl-Blöcke + Einzelprodukte.
  // Ein Block gehört zu einem Bereich via produkt_gruppen.bereich_id; ein
  // Einzelprodukt via raum_produkte.bereich_id. Nicht zugeordnete Items
  // landen im Trailing-Bucket „Ohne Gruppe" (bereich = null).
  type RenderBucket = {
    bereich: ProduktBereich | null
    bloecke: { gruppe: ProduktGruppe; rows: RaumProduktMitDetails[] }[]
    standalone: RaumProduktMitDetails[]
  }
  const layout = useMemo<RenderBucket[]>(() => {
    const rowsOf = (g: ProduktGruppe) => eintraege.filter((e) => e.produkt_gruppe_id === g.id)
    const buckets: RenderBucket[] = []
    for (const b of sortierteBereiche) {
      buckets.push({
        bereich: b,
        bloecke: sortierteGruppen.filter((g) => g.bereich_id === b.id).map((g) => ({ gruppe: g, rows: rowsOf(g) })),
        standalone: eintraege.filter((e) => istUngrouped(e) && e.bereich_id === b.id),
      })
    }
    const ohneBloecke = sortierteGruppen
      .filter((g) => !g.bereich_id || !bereichIds.has(g.bereich_id))
      .map((g) => ({ gruppe: g, rows: rowsOf(g) }))
    const ohneStandalone = eintraege.filter((e) => istUngrouped(e) && (!e.bereich_id || !bereichIds.has(e.bereich_id)))
    if (ohneBloecke.length > 0 || ohneStandalone.length > 0) {
      buckets.push({ bereich: null, bloecke: ohneBloecke, standalone: ohneStandalone })
    }
    return buckets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eintraege, sortierteGruppen, sortierteBereiche, bereichIds])

  // Anzeige-Reihenfolge (= items-Reihenfolge für den SortableContext): je Bucket
  // erst die Block-Zeilen (in Block-Reihenfolge), dann die Einzelprodukte.
  const displayEintraege = useMemo(() => {
    const out: RaumProduktMitDetails[] = []
    for (const bucket of layout) {
      for (const blk of bucket.bloecke) out.push(...blk.rows)
      out.push(...bucket.standalone)
    }
    return out
  }, [layout])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // Drag operiert auf der Anzeige-Reihenfolge (gruppiert)
    const liste = displayEintraege
    const oldIndex = liste.findIndex((e) => e.id === active.id)
    const newIndex = liste.findIndex((e) => e.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const activeGruppe = liste[oldIndex].produkt_gruppe_id ?? null
    const zielGruppe   = liste[newIndex].produkt_gruppe_id ?? null
    const gruppeWechsel = activeGruppe !== zielGruppe

    const vorher = eintraege
    // Drop auf eine Zeile einer anderen Gruppe verschiebt das Produkt in diese
    // Gruppe (Regruppieren per Drag) und löscht dessen Favoriten-Markierung.
    const neu = arrayMove(liste, oldIndex, newIndex).map((e) =>
      e.id === active.id && gruppeWechsel
        ? { ...e, produkt_gruppe_id: zielGruppe, admin_favorit: false, kunde_favorit: false }
        : e,
    )
    setEintraege(neu)

    startTransition(async () => {
      const res = await updateRaumProduktPositionen(
        raumId,
        projektId,
        neu.map((e, i) => ({ id: e.id, reihenfolge: i })),
      )
      let grpFehler: string | undefined
      if (gruppeWechsel) {
        const g = await raumProduktZuGruppeZuordnen(String(active.id), zielGruppe, raumId, projektId)
        grpFehler = g?.fehler
      }
      if (res?.fehler || grpFehler) {
        setEintraege(vorher)
        setFehlerToast('Sortierung konnte nicht gespeichert werden.')
        setTimeout(() => setFehlerToast(null), 4000)
      }
    })
  }

  async function handleBestellstatusChange(raumProduktId: string, neuerStatus: BestellStatus) {
    const eintrag = eintraege.find((e) => e.id === raumProduktId)
    if (!eintrag) return
    const alterStatus = (eintrag.bestellstatus ?? 'ausstehend') as BestellStatus

    // Optimistisch — direkt auf raum_produkte-Ebene (Migration 076)
    setEintraege((prev) =>
      prev.map((e) => (e.id === raumProduktId ? { ...e, bestellstatus: neuerStatus } : e))
    )

    const res = await bestellstatusAendern(eintrag.id, raumId, projektId, neuerStatus)
    if (res?.fehler) {
      // Rollback
      setEintraege((prev) =>
        prev.map((e) => (e.id === raumProduktId ? { ...e, bestellstatus: alterStatus } : e))
      )
      setFehlerToast('Bestellstatus konnte nicht gespeichert werden.')
      setTimeout(() => setFehlerToast(null), 4000)
      return
    }
    if (res?.sync_fehler) {
      setFehlerToast(`Timeline-Sync fehlgeschlagen: ${res.sync_fehler}`)
      setTimeout(() => setFehlerToast(null), 10000)
    } else {
      setErfolgToast('Timeline aktualisiert ✓')
      setTimeout(() => setErfolgToast(null), 2500)
    }
    router.refresh()
  }

  async function handleDatumChange(raumProduktId: string, feld: ProduktDatumFeld, wert: string | null) {
    setEintraege((prev) =>
      prev.map((e) => (e.id === raumProduktId ? { ...e, [feld]: wert } : e))
    )
    const eintrag = eintraege.find((e) => e.id === raumProduktId)
    if (!eintrag) return
    const res = await produktDatumAktualisieren(eintrag.id, raumId, projektId, feld, wert)
    if (res?.fehler) {
      setFehlerToast(res.fehler)
      setTimeout(() => setFehlerToast(null), 6000)
    }
    // Server-Action kann den Bestellstatus automatisch hochsetzen → State synchronisieren
    if (res?.bestellstatus) {
      const neu = res.bestellstatus
      setEintraege((prev) =>
        prev.map((e) =>
          e.id === raumProduktId ? { ...e, bestellstatus: neu } : e,
        ),
      )
    }
    if (res?.sync_fehler) {
      setFehlerToast(`Timeline-Sync fehlgeschlagen: ${res.sync_fehler}`)
      setTimeout(() => setFehlerToast(null), 10000)
    } else if (!res?.fehler) {
      setErfolgToast('Timeline aktualisiert ✓')
      setTimeout(() => setErfolgToast(null), 2500)
    }
    router.refresh()
  }

  async function handleRabattChange(raumProduktId: string, neuerRabatt: number | null) {
    const eintrag = eintraege.find((e) => e.id === raumProduktId)
    if (!eintrag) return
    const alterRabatt = eintrag.rabatt_prozent ?? null
    setEintraege((prev) =>
      prev.map((e) => (e.id === raumProduktId ? { ...e, rabatt_prozent: neuerRabatt } : e))
    )
    const res = await raumProdukteAktualisieren(
      raumProduktId,
      { rabattProzent: neuerRabatt },
      { projektId, raumId },
    )
    if (res?.fehler) {
      setEintraege((prev) =>
        prev.map((e) => (e.id === raumProduktId ? { ...e, rabatt_prozent: alterRabatt } : e))
      )
      setFehlerToast('Rabatt konnte nicht gespeichert werden.')
      setTimeout(() => setFehlerToast(null), 4000)
    }
  }

  async function handleMengeChange(raumProduktId: string, neueMenge: number) {
    const eintrag = eintraege.find((e) => e.id === raumProduktId)
    if (!eintrag) return
    const alteMenge = eintrag.menge
    // Optimistic update
    setEintraege((prev) =>
      prev.map((e) => (e.id === raumProduktId ? { ...e, menge: neueMenge } : e))
    )
    const res = await raumProdukteAktualisieren(
      raumProduktId,
      { menge: neueMenge },
      { projektId, raumId },
    )
    if (res?.fehler) {
      setEintraege((prev) =>
        prev.map((e) => (e.id === raumProduktId ? { ...e, menge: alteMenge } : e))
      )
      setFehlerToast('Menge konnte nicht gespeichert werden.')
      setTimeout(() => setFehlerToast(null), 4000)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    const vorher = eintraege
    setEintraege((prev) => prev.filter((e) => e.id !== deleteTarget.id))
    const res = await produktAusRaumEntfernen(deleteTarget.id, raumId, projektId)
    if (res?.fehler) {
      setEintraege(vorher)
      setFehlerToast('Produkt konnte nicht entfernt werden.')
      setTimeout(() => setFehlerToast(null), 4000)
    }
    setIsDeleting(false)
    setDeleteTarget(null)
    if (!res?.fehler) startTransition(() => router.refresh())
  }

  // ── Auswahl-Gruppen + Admin-Favorit (Migration 114) ───────────
  async function handleAdminFavoritChange(raumProduktId: string, aktuellFavorit: boolean) {
    const eintrag = eintraege.find((e) => e.id === raumProduktId)
    if (!eintrag?.produkt_gruppe_id) return
    const grp = eintrag.produkt_gruppe_id
    const vorher = eintraege

    if (aktuellFavorit) {
      // Favorit entfernen
      setEintraege((prev) => prev.map((e) => (e.id === raumProduktId ? { ...e, admin_favorit: false } : e)))
      const res = await adminFavoritEntfernen(raumProduktId, raumId, projektId)
      if (res?.fehler) { setEintraege(vorher); setFehlerToast(res.fehler); setTimeout(() => setFehlerToast(null), 4000) }
      return
    }
    // Favorit setzen — Geschwister derselben Gruppe lokal clearen
    setEintraege((prev) => prev.map((e) => (e.produkt_gruppe_id === grp ? { ...e, admin_favorit: e.id === raumProduktId } : e)))
    const res = await adminFavoritSetzen(raumProduktId, raumId, projektId)
    if (res?.fehler) { setEintraege(vorher); setFehlerToast(res.fehler); setTimeout(() => setFehlerToast(null), 4000) }
  }

  async function handleGruppeChange(raumProduktId: string, gruppeId: string | null) {
    const vorher = eintraege
    setEintraege((prev) => prev.map((e) => (e.id === raumProduktId ? { ...e, produkt_gruppe_id: gruppeId, admin_favorit: false, kunde_favorit: false } : e)))
    const res = await raumProduktZuGruppeZuordnen(raumProduktId, gruppeId, raumId, projektId)
    if (res?.fehler) { setEintraege(vorher); setFehlerToast('Gruppe konnte nicht geändert werden.'); setTimeout(() => setFehlerToast(null), 4000) }
  }

  function gruppeAnlegen() {
    const name = neuerGruppenName.trim()
    if (!name) return
    setNeuerGruppenName('')
    setNeueGruppeOffen(false)
    startTransition(async () => {
      const res = await produktGruppeAnlegen(raumId, projektId, name)
      if ('fehler' in res) { setFehlerToast(res.fehler); setTimeout(() => setFehlerToast(null), 4000); return }
      setGruppen((prev) => [
        ...prev,
        {
          id: res.id, organisation_id: '', raum_id: raumId, name, beschreibung: null,
          auswahl_modus: 'einzel', reihenfolge: prev.length, bereich_id: null, deleted_at: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        },
      ])
    })
  }

  function gruppeUmbenennen(gruppeId: string, name: string) {
    const vorher = gruppen
    setGruppen((prev) => prev.map((g) => (g.id === gruppeId ? { ...g, name } : g)))
    startTransition(async () => {
      const res = await produktGruppeUmbenennen(gruppeId, raumId, projektId, { name })
      if (res?.fehler) { setGruppen(vorher); setFehlerToast('Umbenennen fehlgeschlagen.'); setTimeout(() => setFehlerToast(null), 4000) }
    })
  }

  function gruppeLoeschen(gruppeId: string) {
    const vorherG = gruppen
    const vorherE = eintraege
    setGruppen((prev) => prev.filter((g) => g.id !== gruppeId))
    setEintraege((prev) => prev.map((e) => (e.produkt_gruppe_id === gruppeId ? { ...e, produkt_gruppe_id: null, admin_favorit: false, kunde_favorit: false } : e)))
    startTransition(async () => {
      const res = await produktGruppeLoeschen(gruppeId, raumId, projektId)
      if (res?.fehler) { setGruppen(vorherG); setEintraege(vorherE); setFehlerToast('Löschen fehlgeschlagen.'); setTimeout(() => setFehlerToast(null), 4000) }
    })
  }

  // ── Bereiche / "Gruppen" (Migration 116) ──────────────────────
  async function handleBlockBereichChange(gruppeId: string, bereichId: string | null) {
    const vorher = gruppen
    setGruppen((prev) => prev.map((g) => (g.id === gruppeId ? { ...g, bereich_id: bereichId } : g)))
    const res = await produktGruppeZuBereichZuordnen(gruppeId, bereichId, raumId, projektId)
    if (res?.fehler) { setGruppen(vorher); setFehlerToast('Gruppe konnte nicht geändert werden.'); setTimeout(() => setFehlerToast(null), 4000) }
  }

  async function handleRowBereichChange(raumProduktId: string, bereichId: string | null) {
    const vorher = eintraege
    setEintraege((prev) => prev.map((e) => (e.id === raumProduktId ? { ...e, bereich_id: bereichId } : e)))
    const res = await raumProduktZuBereichZuordnen(raumProduktId, bereichId, raumId, projektId)
    if (res?.fehler) { setEintraege(vorher); setFehlerToast('Gruppe konnte nicht geändert werden.'); setTimeout(() => setFehlerToast(null), 4000) }
  }

  function bereichAnlegen() {
    const name = neuerBereichName.trim()
    if (!name) return
    setNeuerBereichName('')
    setNeueBereichOffen(false)
    startTransition(async () => {
      const res = await produktBereichAnlegen(raumId, projektId, name)
      if ('fehler' in res) { setFehlerToast(res.fehler); setTimeout(() => setFehlerToast(null), 4000); return }
      setBereiche((prev) => [
        ...prev,
        {
          id: res.id, organisation_id: '', raum_id: raumId, name, beschreibung: null, farbe: null,
          reihenfolge: prev.length, deleted_at: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        },
      ])
    })
  }

  function bereichUmbenennen(bereichId: string, name: string) {
    const vorher = bereiche
    setBereiche((prev) => prev.map((b) => (b.id === bereichId ? { ...b, name } : b)))
    startTransition(async () => {
      const res = await produktBereichUmbenennen(bereichId, raumId, projektId, { name })
      if (res?.fehler) { setBereiche(vorher); setFehlerToast('Umbenennen fehlgeschlagen.'); setTimeout(() => setFehlerToast(null), 4000) }
    })
  }

  function bereichLoeschen(bereichId: string) {
    const vorherB = bereiche
    const vorherG = gruppen
    const vorherE = eintraege
    setBereiche((prev) => prev.filter((b) => b.id !== bereichId))
    setGruppen((prev) => prev.map((g) => (g.bereich_id === bereichId ? { ...g, bereich_id: null } : g)))
    setEintraege((prev) => prev.map((e) => (e.bereich_id === bereichId ? { ...e, bereich_id: null } : e)))
    startTransition(async () => {
      const res = await produktBereichLoeschen(bereichId, raumId, projektId)
      if (res?.fehler) { setBereiche(vorherB); setGruppen(vorherG); setEintraege(vorherE); setFehlerToast('Löschen fehlgeschlagen.'); setTimeout(() => setFehlerToast(null), 4000) }
    })
  }

  // ── Mehrfachauswahl (Freigaben-Stil) ──────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleMany(ids: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const alleDrin = ids.length > 0 && ids.every((id) => next.has(id))
      if (alleDrin) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }
  function selectAllVisible() { setSelectedIds(new Set(displayEintraege.map((e) => e.id))) }
  function clearSelection() { setSelectedIds(new Set()) }

  // Summen NUR der Auswahl (gleiche Formeln wie die Raum-Summenzeile)
  const ausgewaehlte = eintraege.filter((e) => selectedIds.has(e.id))
  const selEP    = ausgewaehlte.reduce((s, e) => s + (e.produkte.einkaufspreis ?? 0) * e.menge, 0)
  const selVpNet = ausgewaehlte.reduce((s, e) => s + effektiverVpNetto(e, e.produkte.verkaufspreis) * e.menge, 0)
  const selVpBr  = r2(selVpNet * (1 + mwst))
  const selProv  = ausgewaehlte.reduce((s, e) => s + r2(effektiverVpNetto(e, e.produkte.verkaufspreis) * ((e.produkte.provision_prozent ?? 0) / 100) * e.menge), 0)

  function handleBulkDelete() {
    if (selectedIds.size === 0 || isBulkDeleting) return
    setIsBulkDeleting(true)
    const ids = Array.from(selectedIds)
    const vorher = eintraege
    setEintraege((prev) => prev.filter((e) => !selectedIds.has(e.id)))
    startTransition(async () => {
      const res = await produkteAusRaumEntfernenBulk(ids, raumId, projektId)
      setIsBulkDeleting(false)
      setBulkDeleteOffen(false)
      if (res?.fehler) {
        setEintraege(vorher)
        setFehlerToast('Produkte konnten nicht entfernt werden.')
        setTimeout(() => setFehlerToast(null), 4000)
        return
      }
      setErfolgToast(`${res.anzahl ?? ids.length} Produkt${(res.anzahl ?? ids.length) === 1 ? '' : 'e'} entfernt`)
      setTimeout(() => setErfolgToast(null), 2800)
      clearSelection()
      router.refresh()
    })
  }

  const renderZeile = (e: RaumProduktMitDetails, istGruppiert: boolean, isLast: boolean) => (
    <SortableProduktZeile
      key={e.id}
      eintrag={e}
      mwst={mwst}
      isLast={isLast}
      expanded={expanded.has(e.id)}
      onToggleExpand={() => toggleExpand(e.id)}
      onBestellstatusChange={handleBestellstatusChange}
      onDeleteRequest={(id, name) => setDeleteTarget({ id, name })}
      onReklamationRequest={(id, name) => setReklamationTarget({ id, name })}
      onDatumChange={handleDatumChange}
      onRabattChange={handleRabattChange}
      onMengeChange={handleMengeChange}
      gruppen={sortierteGruppen}
      istGruppiert={istGruppiert}
      onAdminFavoritChange={handleAdminFavoritChange}
      onGruppeChange={handleGruppeChange}
      onAlternativeRequest={setAlternativeFuer}
      bereiche={sortierteBereiche}
      onBereichChange={handleRowBereichChange}
      istMarkiert={selectedIds.has(e.id)}
      onToggleSelect={toggleSelect}
    />
  )

  // Rendert den Inhalt eines Bereich-Buckets: Auswahl-Blöcke (Header + Zeilen),
  // danach die Einzelprodukte. Wird mit/ohne Bereich-Header verwendet.
  const renderBucket = (bucket: RenderBucket) => (
    <>
      {bucket.bloecke.map(({ gruppe: g, rows }) => {
        const ids = rows.map((r) => r.id)
        const alle = ids.length > 0 && ids.every((id) => selectedIds.has(id))
        const teil = !alle && ids.some((id) => selectedIds.has(id))
        return (
        <Fragment key={g.id}>
          <ProduktGruppeHeader
            gruppe={g}
            anzahl={rows.length}
            hatFavorit={rows.some((r) => r.admin_favorit)}
            onRename={(n) => gruppeUmbenennen(g.id, n)}
            onDelete={() => gruppeLoeschen(g.id)}
            bereiche={sortierteBereiche}
            onBereichChange={(bid) => handleBlockBereichChange(g.id, bid)}
            alleMarkiert={alle}
            teilMarkiert={teil}
            onToggleAlle={() => toggleMany(ids)}
          />
          {rows.length === 0 ? (
            <tr>
              <td colSpan={12} className="px-6 py-3 text-[11px] text-gray-300 italic">
                Noch keine Produkte — beim Hovern über eine Produktzeile erscheint ein Auswahlfeld zum Zuordnen.
              </td>
            </tr>
          ) : (
            rows.map((e) => renderZeile(e, true, false))
          )}
        </Fragment>
      )})}
      {bucket.standalone.length > 0 && (
        <>
          {bucket.bloecke.length > 0 && (
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <td colSpan={12} className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Ohne Auswahl-Block
              </td>
            </tr>
          )}
          {bucket.standalone.map((e) => renderZeile(e, false, false))}
        </>
      )}
    </>
  )

  return (
    <>
      {/* Hint-Strip: erklärt das Expand-Feature + Auswahl-Gruppen anlegen */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-wellbeing-cream/30 border-b border-wellbeing-cream/60 text-[11px] text-wellbeing-green-dark">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="truncate">Pfeil-Icon zeigt <strong className="font-semibold">Bestell- &amp; Lieferdaten</strong>. Über das Ebenen-Icon je Zeile fügst du <strong className="font-semibold">Alternativen</strong> hinzu — ⭐ markiert eure Empfehlung.</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* + Gruppe (Bereich, Migration 116) */}
          {neueBereichOffen ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={neuerBereichName}
                onChange={(e) => setNeuerBereichName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') bereichAnlegen()
                  if (e.key === 'Escape') { setNeueBereichOffen(false); setNeuerBereichName('') }
                }}
                placeholder="Gruppe…"
                className="text-[11px] px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 w-40"
              />
              <button type="button" onClick={bereichAnlegen} className="text-[11px] font-medium px-2 py-1 rounded-lg bg-wellbeing-green text-white hover:bg-wellbeing-green-dark transition-colors">Anlegen</button>
              <button type="button" onClick={() => { setNeueBereichOffen(false); setNeuerBereichName('') }} aria-label="Abbrechen" className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => setNeueBereichOffen(true)} className="inline-flex items-center gap-1 font-medium text-wellbeing-green hover:text-wellbeing-green-dark px-2 py-1 rounded-lg hover:bg-wellbeing-green/10 transition-colors">
              <Layers className="w-3 h-3" /> Gruppe
            </button>
          )}

          {/* + Auswahl-Block (produkt_gruppe, Migration 114) */}
          {neueGruppeOffen ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={neuerGruppenName}
                onChange={(e) => setNeuerGruppenName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') gruppeAnlegen()
                  if (e.key === 'Escape') { setNeueGruppeOffen(false); setNeuerGruppenName('') }
                }}
                placeholder="Auswahl-Block…"
                className="text-[11px] px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 w-40"
              />
              <button type="button" onClick={gruppeAnlegen} className="text-[11px] font-medium px-2 py-1 rounded-lg bg-wellbeing-green text-white hover:bg-wellbeing-green-dark transition-colors">Anlegen</button>
              <button type="button" onClick={() => { setNeueGruppeOffen(false); setNeuerGruppenName('') }} aria-label="Abbrechen" className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => setNeueGruppeOffen(true)} className="inline-flex items-center gap-1 font-medium text-wellbeing-green hover:text-wellbeing-green-dark px-2 py-1 rounded-lg hover:bg-wellbeing-green/10 transition-colors">
              <Plus className="w-3 h-3" /> Auswahl-Block
            </button>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayEintraege.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-100 bg-gray-50/90 backdrop-blur">
                  <th className="w-8 pl-3 pr-0 py-3" />
                  <th className="w-8 px-1 py-3" />
                  <th className="w-8 px-1 py-3" />
                  <th className="w-14 px-3 py-3" />
                  <th className={`${th} text-left`}>Produkt</th>
                  <th className={`${th} text-center`}>Menge</th>
                  <th className={`${th} text-right`}>VP brutto</th>
                  <th className={`${th} text-right`}>Gesamt brutto</th>
                  <th className={`${th} text-center`} title="Nur intern sichtbar">Marge · Prov.</th>
                  <th className={`${th} text-center`}>Freigabe</th>
                  <th className={`${th} text-center`}>Bestellung</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {hatBereiche ? (
                  layout.map((bucket) => {
                    const bIds = [...bucket.bloecke.flatMap((b) => b.rows.map((r) => r.id)), ...bucket.standalone.map((r) => r.id)]
                    const bAlle = bIds.length > 0 && bIds.every((id) => selectedIds.has(id))
                    const bTeil = !bAlle && bIds.some((id) => selectedIds.has(id))
                    return (
                    <Fragment key={bucket.bereich?.id ?? '__ohne__'}>
                      {bucket.bereich ? (
                        <BereichHeader
                          bereich={bucket.bereich}
                          anzahl={bucket.bloecke.reduce((s, b) => s + b.rows.length, 0) + bucket.standalone.length}
                          onRename={(n) => bereichUmbenennen(bucket.bereich!.id, n)}
                          onDelete={() => bereichLoeschen(bucket.bereich!.id)}
                          alleMarkiert={bAlle}
                          teilMarkiert={bTeil}
                          onToggleAlle={() => toggleMany(bIds)}
                        />
                      ) : (
                        <tr className="bg-gray-100/70 border-y border-gray-200">
                          <td className="pl-3 pr-0 py-2 align-middle">
                            <Checkbox checked={bAlle} indeterminate={bTeil} onChange={() => toggleMany(bIds)} ariaLabel="Alle ohne Gruppe auswählen" />
                          </td>
                          <td colSpan={11} className="px-3 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            Ohne Gruppe
                          </td>
                        </tr>
                      )}
                      {renderBucket(bucket)}
                    </Fragment>
                  )})
                ) : hatGruppen ? (
                  layout.length > 0 ? renderBucket(layout[0]) : null
                ) : (
                  eintraege.map((e, i) => renderZeile(e, false, i === eintraege.length - 1))
                )}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>

      {/* Fehler-Toast */}
      {fehlerToast && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-md bg-red-600 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-start gap-2 animate-fadeIn">
          <X className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="break-words">{fehlerToast}</span>
        </div>
      )}

      {/* Erfolgs-Toast */}
      {erfolgToast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {erfolgToast}
        </div>
      )}

      {/* Lösch-Bestätigungs-Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Produkt entfernen?</h3>
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

      {/* Reklamations-Modal */}
      {reklamationTarget && (
        <ReklamationModal
          raumProduktId={reklamationTarget.id}
          produktName={reklamationTarget.name}
          isOpen={true}
          onClose={() => setReklamationTarget(null)}
          onErfolg={() => {
            setErfolgToast('Reklamation angelegt.')
            setTimeout(() => setErfolgToast(null), 3000)
            router.refresh()
          }}
        />
      )}

      {/* "+ Alternative" — Alternativen zu einem Produkt hinzufügen */}
      {alternativeFuer && (
        <AlternativeModal
          haupt={alternativeFuer}
          eintraege={eintraege}
          raumId={raumId}
          projektId={projektId}
          onClose={() => setAlternativeFuer(null)}
        />
      )}

      {/* Schwebende Auswahl-Leiste (Freigaben-Stil) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto flex items-center gap-2 bg-white border border-gray-200 rounded-2xl shadow-xl pl-4 pr-2 py-2 animate-fadeIn max-w-[95vw] overflow-x-auto">
            <span className="text-xs font-medium text-gray-700 tabular-nums shrink-0">{selectedIds.size} ausgewählt</span>
            <span className="w-px h-5 bg-gray-200 mx-1 shrink-0" />
            <div className="flex items-center gap-3 text-[11px] text-gray-500 shrink-0 tabular-nums">
              <span><span className="text-gray-400">EP</span> {eur(r2(selEP))}</span>
              <span><span className="text-gray-400">Prov.</span> {eur(r2(selProv))}</span>
              <span><span className="text-gray-400">VP netto</span> {eur(r2(selVpNet))}</span>
              <span className="font-semibold text-gray-700"><span className="text-gray-400 font-normal">VP brutto</span> {eur(selVpBr)}</span>
            </div>
            <span className="w-px h-5 bg-gray-200 mx-1 shrink-0" />
            <button
              type="button"
              onClick={() => setBulkDeleteOffen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Löschen
            </button>
            {selectedIds.size < displayEintraege.length && (
              <button
                type="button"
                onClick={selectAllVisible}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-wellbeing-green-dark hover:bg-gray-50 rounded-lg transition-colors shrink-0"
              >
                Alle ({displayEintraege.length})
              </button>
            )}
            <button
              type="button"
              onClick={clearSelection}
              title="Auswahl aufheben"
              aria-label="Auswahl aufheben"
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk-Löschen Bestätigung */}
      <ConfirmModal
        isOpen={bulkDeleteOffen}
        onClose={() => { if (!isBulkDeleting) setBulkDeleteOffen(false) }}
        onConfirm={handleBulkDelete}
        title={`${selectedIds.size} Produkt${selectedIds.size === 1 ? '' : 'e'} entfernen?`}
        message="Die Produkte werden aus diesem Raum entfernt. Sie bleiben in der Bibliothek erhalten."
        confirmText="Entfernen"
        variant="danger"
        isLoading={isBulkDeleting}
      />
    </>
  )
}
