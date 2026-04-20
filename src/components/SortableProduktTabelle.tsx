'use client'

import { Fragment, useState, useTransition, useRef, useEffect } from 'react'
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
  Tag, ArrowRight, Calendar,
} from 'lucide-react'
import Link from 'next/link'
import {
  produktAusRaumEntfernen,
  updateRaumProduktPositionen,
  raumProdukteAktualisieren,
} from '@/app/actions/raum-produkte'
import { bestellstatusAendern, produktDatumAktualisieren, type ProduktDatumFeld } from '@/app/actions/produkte'
import type { RaumProduktMitDetails, BestellStatus } from '@/lib/supabase/types'
import { effektiverVpNetto, basisVpNetto } from '@/lib/preise'
import HinweisBanner from './HinweisBanner'

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
  ausstehend:        { label: 'Offen',    bg: 'bg-gray-100',   text: 'text-gray-600',    Icon: Clock       },
  bestellt:          { label: 'Bestellt', bg: 'bg-blue-50',    text: 'text-blue-700',    Icon: Package     },
  geliefert:         { label: 'Geliefert',bg: 'bg-emerald-50', text: 'text-emerald-700', Icon: CheckCircle2},
  rechnung_erhalten: { label: 'Rechnung', bg: 'bg-violet-50',  text: 'text-violet-700',  Icon: Receipt     },
}

// ── Bestell-Status Dropdown ─────────────────────────────────────

function BestellStatusDropdown({ status, onChange }: { status: BestellStatus; onChange: (s: BestellStatus) => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) setOpen(false)
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
          style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl py-1"
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
  onDatumChange,
  onRabattChange,
}: {
  eintrag: RaumProduktMitDetails
  mwst: number
  isLast: boolean
  expanded: boolean
  onToggleExpand: () => void
  onBestellstatusChange: (raumProduktId: string, status: BestellStatus) => void
  onDeleteRequest: (id: string, name: string) => void
  onDatumChange: (raumProduktId: string, feld: ProduktDatumFeld, wert: string | null) => void
  onRabattChange: (raumProduktId: string, rabatt: number | null) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: eintrag.id })

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

  const status = p.produktstatus?.status ?? 'ausstehend'
  const bestellstatus = (p.bestellstatus ?? 'ausstehend') as BestellStatus

  const zeileKlasse = !isLast || expanded ? 'border-b border-gray-100' : ''

  return (
    <Fragment>
      <tr
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
        className={`hover:bg-gray-50/70 transition-colors group ${zeileKlasse}`}
      >
        {/* Drag Handle */}
        <td className="pl-3 pr-1 py-3 align-middle">
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
            <span className="font-medium text-gray-900 leading-snug">{p.name}</span>
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
        </td>

        {/* Menge */}
        <td className={`${td} text-center whitespace-nowrap`}>
          <span className="text-gray-900 font-medium">{eintrag.menge}</span>
          <span className="text-gray-400 ml-1 text-xs">{p.einheit}</span>
        </td>

        {/* VP Brutto (Stück) */}
        <td className={`${td} text-right font-mono whitespace-nowrap`}>
          {hasEffektivVP ? eur(vpBrutto) : <span className="text-gray-300">–</span>}
        </td>

        {/* Gesamt brutto */}
        <td className={`${td} text-right font-mono font-semibold text-wellbeing-green whitespace-nowrap`}>
          {hasEffektivVP ? eur(gesamtBrutto) : <span className="text-gray-300">–</span>}
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
                if (p.lieferung_erhalten_am) {
                  return <span className="text-[10px] text-gray-400 inline-flex items-center gap-1"><PackageCheck className="w-2.5 h-2.5" /> {fmtDate(p.lieferung_erhalten_am)}</span>
                }
              }
              if (bestellstatus === 'bestellt') {
                if (p.liefertermin) {
                  return <span className="text-[10px] text-gray-400 inline-flex items-center gap-1"><Truck className="w-2.5 h-2.5" /> erw. {fmtDate(p.liefertermin)}</span>
                }
                if (p.bestellt_am) {
                  return <span className="text-[10px] text-gray-400 inline-flex items-center gap-1"><CalendarDays className="w-2.5 h-2.5" /> {fmtDate(p.bestellt_am)}</span>
                }
              }
              return null
            })()}
          </div>
        </td>

        {/* Aktionen */}
        <td className="pr-3 pl-1 py-3.5 align-middle">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <td colSpan={10} className="px-6 py-5 space-y-4">

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
                        value: p.bestellt_am ?? '',
                        onChange: (v) => onDatumChange(eintrag.id, 'bestellt_am', v || null),
                        aktiv: !!p.bestellt_am,
                      },
                      {
                        label: 'Geplante Lieferung',
                        Icon: Truck,
                        value: p.liefertermin ?? '',
                        onChange: (v) => onDatumChange(eintrag.id, 'liefertermin', v || null),
                        aktiv: !!p.liefertermin,
                      },
                      {
                        label: 'Geliefert',
                        Icon: PackageCheck,
                        value: p.lieferung_erhalten_am ?? '',
                        onChange: (v) => onDatumChange(eintrag.id, 'lieferung_erhalten_am', v || null),
                        aktiv: !!p.lieferung_erhalten_am,
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

// ── Tabelle ─────────────────────────────────────────────────────

const th = 'px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest'

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [fehlerToast, setFehlerToast] = useState<string | null>(null)

  // Sync mit Server-Daten NUR wenn sich die ID-Liste oder Reihenfolge ändert
  // (z.B. nach Filter-Wechsel oder Add/Remove). Wir resetten NICHT bei jedem
  // initialEintraege-Reference-Change, weil das den optimistischen Status zurücksetzen würde.
  const initialIdsKey = initialEintraege.map((e) => e.id).join(',')
  useEffect(() => {
    setEintraege(initialEintraege)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIdsKey])

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

    setEintraege((prev) => {
      const oldIndex = prev.findIndex((e) => e.id === active.id)
      const newIndex = prev.findIndex((e) => e.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)

      startTransition(() => {
        updateRaumProduktPositionen(raumId, projektId, next.map((e, i) => ({ id: e.id, reihenfolge: i })))
      })
      return next
    })
  }

  async function handleBestellstatusChange(raumProduktId: string, neuerStatus: BestellStatus) {
    const eintrag = eintraege.find((e) => e.id === raumProduktId)
    if (!eintrag) return
    const alterStatus = (eintrag.produkte.bestellstatus ?? 'ausstehend') as BestellStatus

    // Optimistisch
    setEintraege((prev) =>
      prev.map((e) => (e.id === raumProduktId ? { ...e, produkte: { ...e.produkte, bestellstatus: neuerStatus } } : e))
    )

    const res = await bestellstatusAendern(eintrag.produkt_id, raumId, projektId, neuerStatus)
    if (res?.fehler) {
      // Rollback
      setEintraege((prev) =>
        prev.map((e) => (e.id === raumProduktId ? { ...e, produkte: { ...e.produkte, bestellstatus: alterStatus } } : e))
      )
      setFehlerToast('Bestellstatus konnte nicht gespeichert werden.')
      setTimeout(() => setFehlerToast(null), 4000)
      return
    }
    // Kein router.refresh() hier — sonst überschreibt Server-State unseren optimistischen
    // Update bevor revalidatePath durch ist. Der nächste page-load holt eh frische Daten.
  }

  async function handleDatumChange(raumProduktId: string, feld: ProduktDatumFeld, wert: string | null) {
    setEintraege((prev) =>
      prev.map((e) => (e.id === raumProduktId ? { ...e, produkte: { ...e.produkte, [feld]: wert } } : e))
    )
    const eintrag = eintraege.find((e) => e.id === raumProduktId)
    if (!eintrag) return
    const res = await produktDatumAktualisieren(eintrag.produkt_id, raumId, projektId, feld, wert)
    // Server-Action kann den Bestellstatus automatisch hochsetzen → State synchronisieren
    if (res?.bestellstatus) {
      const neu = res.bestellstatus
      setEintraege((prev) =>
        prev.map((e) =>
          e.id === raumProduktId ? { ...e, produkte: { ...e.produkte, bestellstatus: neu } } : e,
        ),
      )
    }
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

  async function handleConfirmDelete() {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    setEintraege((prev) => prev.filter((e) => e.id !== deleteTarget.id))
    await produktAusRaumEntfernen(deleteTarget.id, raumId, projektId)
    setIsDeleting(false)
    setDeleteTarget(null)
    startTransition(() => router.refresh())
  }

  return (
    <>
      {/* Hint-Strip: erklärt das Expand-Feature */}
      <div className="flex items-center justify-between px-4 py-2 bg-wellbeing-cream/30 border-b border-wellbeing-cream/60 text-[11px] text-wellbeing-green-dark">
        <span className="inline-flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3" />
          Klick auf das Pfeil-Icon einer Zeile zeigt <strong className="font-semibold">Bestell- & Lieferdaten</strong> sowie interne Kalkulation
        </span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={eintraege.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-100 bg-gray-50/90 backdrop-blur">
                  <th className="w-8 px-2 py-3" />
                  <th className="w-8 px-1 py-3" />
                  <th className="w-14 px-3 py-3" />
                  <th className={`${th} text-left`}>Produkt</th>
                  <th className={`${th} text-center`}>Menge</th>
                  <th className={`${th} text-right`}>VP brutto</th>
                  <th className={`${th} text-right`}>Gesamt brutto</th>
                  <th className={`${th} text-center`}>Freigabe</th>
                  <th className={`${th} text-center`}>Bestellung</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {eintraege.map((e, i) => (
                  <SortableProduktZeile
                    key={e.id}
                    eintrag={e}
                    mwst={mwst}
                    isLast={i === eintraege.length - 1}
                    expanded={expanded.has(e.id)}
                    onToggleExpand={() => toggleExpand(e.id)}
                    onBestellstatusChange={handleBestellstatusChange}
                    onDeleteRequest={(id, name) => setDeleteTarget({ id, name })}
                    onDatumChange={handleDatumChange}
                    onRabattChange={handleRabattChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>

      {/* Fehler-Toast */}
      {fehlerToast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-red-600 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-fadeIn">
          <X className="w-4 h-4" />
          {fehlerToast}
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
    </>
  )
}
