'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, X, Clock, XCircle, RotateCcw, BarChart2, Layers, Table2,
  Search, ChevronDown, ChevronRight, Undo2, ArrowUpRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { freigabeZuruecksetzenAdmin } from '@/app/actions/freigabe'

// ── Typen ─────────────────────────────────────────────────────
export type FreigabeEintrag = {
  /** raum_produkte.id (nicht produkte.id) — Key für Freigabe-Aktionen seit Migration 076 */
  id: string
  produkt_id: string
  name: string
  kategorie: string | null
  menge: number
  einheit: string
  verkaufspreis: number | null
  bild_url: string | null
  created_at: string
  raeume: {
    id: string
    name: string
    projekt_id: string
    projekte: {
      id: string
      name: string
      kunden: { id: string; name: string } | null
    } | null
  } | null
  produktstatus: { status: string; kommentar: string | null } | null
}

type Tab = 'offen' | 'freigegeben' | 'abgelehnt' | 'ueberarbeitung' | 'alle'

const statusBadge: Record<string, string> = {
  ausstehend:     'bg-gray-100 text-gray-500',
  freigegeben:    'bg-emerald-50 text-emerald-700',
  abgelehnt:      'bg-red-50 text-red-600',
  ueberarbeitung: 'bg-amber-50 text-amber-700',
}
const statusLabel: Record<string, string> = {
  ausstehend: 'Ausstehend', freigegeben: 'Freigegeben',
  abgelehnt: 'Abgelehnt', ueberarbeitung: 'Überarbeitung',
}

function isOffen(status: string) { return status === 'ausstehend' || status === 'ueberarbeitung' }

function matchTab(status: string, tab: Tab) {
  if (tab === 'alle') return true
  if (tab === 'offen') return isOffen(status)
  if (tab === 'ueberarbeitung') return status === 'ueberarbeitung'
  return status === tab
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── Chart: Tooltip ────────────────────────────────────────────
type BarPayloadItem = { name: string; value: number; color: string }
function BalkenTooltip({ active, payload, label }: { active?: boolean; payload?: BarPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
      {label && <p className="text-xs font-semibold text-gray-900 mb-1.5">{label}</p>}
      {payload.map((p, i) => p.value > 0 && (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── Balken-Chart (Projekt-Verteilung nach Status) ────────────
function BalkenChart({ gruppen }: { gruppen: { projektName: string; freigegebenCount: number; offenCount: number; abgelehntCount: number; ueberarbeitungCount: number }[] }) {
  if (gruppen.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Keine Daten zum Anzeigen.</p>
  }

  const data = gruppen.map((g) => ({
    name: g.projektName.length > 16 ? g.projektName.slice(0, 16) + '…' : g.projektName,
    freigegeben: g.freigegebenCount,
    ausstehend:  g.offenCount - g.ueberarbeitungCount,
    abgelehnt:   g.abgelehntCount,
    ueberarbeitung: g.ueberarbeitungCount,
  }))

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium">Verteilung nach Projekten</p>
        <div className="flex items-center gap-4 flex-wrap">
          {STATUS_CFG.map((cfg) => (
            <div key={cfg.key} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${cfg.dot}`} />
              <span className="text-[11px] text-gray-500">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
        <BarChart data={data} layout="vertical" barCategoryGap="30%" margin={{ top: 4, right: 24, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={140} />
          <Tooltip content={(props) => (
            <BalkenTooltip active={props.active}
              payload={props.payload as unknown as BarPayloadItem[] | undefined}
              label={String(props.label ?? '')} />
          )} cursor={{ fill: '#F9FAFB' }} />
          <Bar dataKey="freigegeben"    name="Freigegeben"   stackId="a" fill="#10B981" />
          <Bar dataKey="ausstehend"     name="Ausstehend"    stackId="a" fill="#F59E0B" />
          <Bar dataKey="abgelehnt"      name="Abgelehnt"     stackId="a" fill="#EF4444" />
          <Bar dataKey="ueberarbeitung" name="Überarbeitung" stackId="a" fill="#8B5CF6" />
        </BarChart>
      </ResponsiveContainer>
    </>
  )
}

// ── Status-Config ─────────────────────────────────────────────
const STATUS_CFG = [
  { key: 'freigegeben',    label: 'Freigegeben',   icon: CheckCircle2, farbe: '#10B981', text: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500', tab: 'freigegeben'    as Tab },
  { key: 'ausstehend',     label: 'Ausstehend',    icon: Clock,        farbe: '#F59E0B', text: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-500',   tab: 'offen'          as Tab },
  { key: 'abgelehnt',      label: 'Abgelehnt',     icon: XCircle,      farbe: '#EF4444', text: 'text-red-600',     bg: 'bg-red-50',     dot: 'bg-red-500',     tab: 'abgelehnt'      as Tab },
  { key: 'ueberarbeitung', label: 'Überarbeitung', icon: RotateCcw,    farbe: '#8B5CF6', text: 'text-violet-700',  bg: 'bg-violet-50',  dot: 'bg-violet-500',  tab: 'ueberarbeitung' as Tab },
] as const

// ── Detail Modal ──────────────────────────────────────────────
function DetailModal({ eintrag, onClose, onReset, isPending }: {
  eintrag: FreigabeEintrag
  onClose: () => void
  onReset: () => void
  isPending: boolean
}) {
  const status    = eintrag.produktstatus?.status ?? 'ausstehend'
  const kommentar = eintrag.produktstatus?.kommentar
  const kuerzel   = eintrag.name.slice(0, 2).toUpperCase()
  const projekt   = eintrag.raeume?.projekte

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      {/* Modal */}
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
          {eintrag.bild_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={eintrag.bild_url} alt={eintrag.name}
              className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-wellbeing-cream border border-wellbeing-cream flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-wellbeing-green-light">{kuerzel}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">{eintrag.name}</h3>
            {projekt && (
              <p className="text-xs text-gray-500 mt-0.5">
                <Link href={`/dashboard/projekte/${projekt.id}`}
                  className="hover:text-wellbeing-green transition-colors" onClick={onClose}>
                  {projekt.name}
                </Link>
                {eintrag.raeume?.name && (
                  <span className="text-gray-400"> › {eintrag.raeume.name}</span>
                )}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3.5">
          <InfoZeile label="Status">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[status] ?? 'bg-gray-100 text-gray-500'}`}>
              {statusLabel[status] ?? status}
            </span>
          </InfoZeile>
          {kommentar && (
            <InfoZeile label="Kommentar">
              <p className="text-sm text-gray-700 leading-relaxed">{kommentar}</p>
            </InfoZeile>
          )}
          <InfoZeile label="Erstellt am">
            <span className="text-sm text-gray-700">{formatDatum(eintrag.created_at)}</span>
          </InfoZeile>
          {eintrag.kategorie && (
            <InfoZeile label="Kategorie">
              <span className="text-sm text-gray-700">{eintrag.kategorie}</span>
            </InfoZeile>
          )}
          <InfoZeile label="Menge">
            <span className="text-sm text-gray-700">{eintrag.menge} {eintrag.einheit}</span>
          </InfoZeile>
          {projekt?.kunden && (
            <InfoZeile label="Kunde">
              <Link href={`/dashboard/kunden/${projekt.kunden.id}`}
                className="text-sm text-gray-700 hover:text-wellbeing-green transition-colors" onClick={onClose}>
                {projekt.kunden.name}
              </Link>
            </InfoZeile>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          {status !== 'ausstehend' ? (
            <button type="button" onClick={onReset} disabled={isPending}
              className="text-xs px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-medium transition-colors disabled:opacity-50">
              {isPending ? 'Wird zurückgesetzt…' : 'Freigabe zurücksetzen'}
            </button>
          ) : <span />}
          <button type="button" onClick={onClose}
            className="text-xs px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg font-medium transition-colors">
            Schließen
          </button>
        </div>
      </div>
    </>
  )
}

function InfoZeile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

// ── Gruppierung ────────────────────────────────────────────────
type ProjektGruppe = {
  projektId: string
  projektName: string
  kundeName: string | null
  kundeId: string | null
  eintraege: FreigabeEintrag[]
  offenCount: number
  freigegebenCount: number
  abgelehntCount: number
  ueberarbeitungCount: number
  vpSumme: number
}

function gruppiereNachProjekt(eintraege: FreigabeEintrag[]): ProjektGruppe[] {
  const map = new Map<string, ProjektGruppe>()

  for (const e of eintraege) {
    const projekt = e.raeume?.projekte
    if (!projekt) continue
    const id = projekt.id

    if (!map.has(id)) {
      map.set(id, {
        projektId:   id,
        projektName: projekt.name,
        kundeName:   projekt.kunden?.name ?? null,
        kundeId:     projekt.kunden?.id   ?? null,
        eintraege:   [],
        offenCount:  0,
        freigegebenCount: 0,
        abgelehntCount: 0,
        ueberarbeitungCount: 0,
        vpSumme: 0,
      })
    }

    const gruppe = map.get(id)!
    gruppe.eintraege.push(e)
    const status = e.produktstatus?.status ?? 'ausstehend'
    if (status === 'ausstehend') gruppe.offenCount++
    else if (status === 'freigegeben') gruppe.freigegebenCount++
    else if (status === 'abgelehnt') gruppe.abgelehntCount++
    else if (status === 'ueberarbeitung') { gruppe.ueberarbeitungCount++; gruppe.offenCount++ }
    gruppe.vpSumme += (e.verkaufspreis ?? 0) * (e.menge ?? 0)
  }

  return Array.from(map.values()).sort((a, b) => b.offenCount - a.offenCount)
}

function eur(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

// ── Komponente ────────────────────────────────────────────────
type ViewMode = 'gruppen' | 'tabelle' | 'balken'

export default function FreigabenTabelle({ eintraege }: { eintraege: FreigabeEintrag[] }) {
  const [tab, setTab]                    = useState<Tab>('offen')
  const [view, setView]                  = useState<ViewMode>('gruppen')
  const [search, setSearch]              = useState('')
  const [projektFilter, setProjektFilter] = useState<string>('alle')
  const [collapsedGroups, setCollapsed]  = useState<Set<string>>(new Set())
  const [selectedEintrag, setSelected]   = useState<FreigabeEintrag | null>(null)
  const [isPending, startTransition]     = useTransition()
  const router                           = useRouter()

  // Globale Status-Counts (für Hero + Chips) — unabhängig vom Tab-Filter
  const counts = useMemo(() => {
    const c = { freigegeben: 0, ausstehend: 0, abgelehnt: 0, ueberarbeitung: 0 }
    for (const e of eintraege) {
      const s = (e.produktstatus?.status ?? 'ausstehend') as keyof typeof c
      if (s in c) c[s]++
    }
    return c
  }, [eintraege])

  const gesamt = eintraege.length
  const entschieden = counts.freigegeben + counts.abgelehnt

  // Liste der Projekte für Projekt-Filter
  const alleProjekte = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of eintraege) {
      const p = e.raeume?.projekte
      if (p) m.set(p.id, p.name)
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [eintraege])

  // Kombinierter Filter: Tab + Projekt + Suche
  const gefiltert = useMemo(() => {
    const q = search.trim().toLowerCase()
    return eintraege.filter((e) => {
      const status = e.produktstatus?.status ?? 'ausstehend'
      if (!matchTab(status, tab)) return false
      if (projektFilter !== 'alle' && e.raeume?.projekte?.id !== projektFilter) return false
      if (q && !(
        e.name.toLowerCase().includes(q) ||
        (e.raeume?.name ?? '').toLowerCase().includes(q) ||
        (e.raeume?.projekte?.name ?? '').toLowerCase().includes(q) ||
        (e.kategorie ?? '').toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [eintraege, tab, projektFilter, search])

  const gruppen = useMemo(() => gruppiereNachProjekt(gefiltert), [gefiltert])

  function handleReset(raumProduktId: string) {
    startTransition(async () => {
      await freigabeZuruecksetzenAdmin(raumProduktId)
      setSelected(null)
      router.refresh()
    })
  }

  function toggleGroup(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Produkt-Zeile (kompakt, Hover-Actions) ──────────────────
  const produktZeile = (e: FreigabeEintrag, withProjekt = false) => {
    const status    = (e.produktstatus?.status ?? 'ausstehend') as keyof typeof counts
    const kommentar = e.produktstatus?.kommentar
    const kuerzel   = e.name.slice(0, 2).toUpperCase()
    const cfg       = STATUS_CFG.find((c) => c.key === status)
    const vp        = (e.verkaufspreis ?? 0) * (e.menge ?? 0)

    return (
      <li
        key={e.id}
        className="group flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setSelected(e)}
      >
        {/* Thumbnail 32px */}
        {e.bild_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={e.bild_url}
            alt={e.name}
            className="w-8 h-8 rounded-lg object-cover border border-gray-200 shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-wellbeing-cream border border-wellbeing-cream shrink-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-wellbeing-green-light">{kuerzel}</span>
          </div>
        )}

        {/* Name + Kontext */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{e.name}</p>
            {e.raeume?.name && (
              <span className="text-[11px] text-gray-400 shrink-0">· {e.raeume.name}</span>
            )}
            {withProjekt && e.raeume?.projekte && (
              <span className="text-[11px] text-gray-400 truncate">· {e.raeume.projekte.name}</span>
            )}
          </div>
          {kommentar && (
            <p className="text-[11px] text-amber-600 mt-0.5 truncate max-w-lg" title={kommentar}>
              &bdquo;{kommentar}&ldquo;
            </p>
          )}
        </div>

        {/* VP-Summe */}
        {vp > 0 && (
          <span className="text-[11px] font-mono text-gray-500 shrink-0 tabular-nums">
            {eur(vp)}
          </span>
        )}

        {/* Status-Pill mit Dot */}
        {cfg && (
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} shrink-0`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        )}

        {/* Datum */}
        <span className="text-[11px] text-gray-400 shrink-0 w-14 text-right tabular-nums">
          {formatDatum(e.created_at)}
        </span>

        {/* Hover-Actions */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {status !== 'ausstehend' && (
            <button
              type="button"
              onClick={(ev) => { ev.stopPropagation(); handleReset(e.id) }}
              disabled={isPending}
              title="Zurücksetzen"
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}
          <Link
            href={`/dashboard/projekte/${e.raeume?.projekte?.id ?? ''}`}
            onClick={(ev) => ev.stopPropagation()}
            title="Zum Projekt"
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-wellbeing-green hover:bg-wellbeing-green/10 rounded-md transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </li>
    )
  }

  return (
    <div className="flex flex-col min-h-0">

      {/* ── Sticky Hero + Filter-Bar ─────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 pt-5 pb-4 space-y-4">

        {/* Titel + Gesamt-Stat */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-syne text-[22px] font-bold text-gray-900 leading-tight tracking-tight">
              Freigaben
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {gesamt > 0 ? (
                <>
                  <span className="font-medium text-gray-700 tabular-nums">{entschieden}</span>
                  <span> von </span>
                  <span className="font-medium text-gray-700 tabular-nums">{gesamt}</span>
                  <span> entschieden · </span>
                  <span className={counts.ausstehend > 0 ? 'text-amber-600 font-medium' : ''}>
                    {counts.ausstehend} offen
                  </span>
                </>
              ) : (
                'Produkt-Freigaben aller Projekte im Überblick'
              )}
            </p>
          </div>
        </div>

        {/* Single Progress-Bar mit farbigen Segmenten */}
        {gesamt > 0 && (
          <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
            {STATUS_CFG.map((cfg) => {
              const count = counts[cfg.key as keyof typeof counts]
              const pct = (count / gesamt) * 100
              if (pct === 0) return null
              return (
                <div
                  key={cfg.key}
                  title={`${count} ${cfg.label}`}
                  style={{ width: `${pct}%`, backgroundColor: cfg.farbe }}
                />
              )
            })}
          </div>
        )}

        {/* Status-Chips (Filter) */}
        <div className="flex items-center flex-wrap gap-1.5">
          {STATUS_CFG.map((cfg) => {
            const count = counts[cfg.key as keyof typeof counts]
            const aktiv = tab === cfg.tab
            return (
              <button
                key={cfg.key}
                type="button"
                onClick={() => setTab(aktiv ? 'alle' : cfg.tab)}
                className={`inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  aktiv
                    ? `${cfg.bg} ${cfg.text} ring-1 ring-current/10`
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="tabular-nums font-semibold">{count}</span>
                <span>{cfg.label}</span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setTab('alle')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === 'alle'
                ? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Alle
          </button>
        </div>

        {/* Action-Bar: Suche + Projekt + View */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              placeholder="Produkt, Raum, Projekt, Kategorie…"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition"
            />
          </div>

          <div className="relative">
            <select
              value={projektFilter}
              onChange={(ev) => setProjektFilter(ev.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 cursor-pointer"
            >
              <option value="alle">Alle Projekte</option>
              {alleProjekte.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <div className="ml-auto flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
            {([
              { key: 'gruppen' as const, label: 'Gruppen', Icon: Layers },
              { key: 'tabelle' as const, label: 'Tabelle', Icon: Table2 },
              { key: 'balken'  as const, label: 'Balken',  Icon: BarChart2 },
            ]).map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                title={label}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === key ? 'bg-wellbeing-green text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollbarer Content ────────────────────────────────── */}
      <div className="px-6 py-5">

        {/* Leerer Zustand */}
        {gefiltert.length === 0 && (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
            {tab === 'offen' && !search && projektFilter === 'alle' ? (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="text-base font-semibold text-gray-800 mb-1">Alle Freigaben erledigt!</p>
                <p className="text-sm text-gray-400">Keine offenen Freigabeanfragen.</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Keine Einträge passen zu diesen Filtern.</p>
            )}
          </div>
        )}

        {/* Gruppen-View */}
        {gefiltert.length > 0 && view === 'gruppen' && (
          <div className="space-y-3">
            {gruppen.map((g) => {
              const isCollapsed = collapsedGroups.has(g.projektId)
              const gesamtInGruppe = g.eintraege.length
              const erledigt = g.freigegebenCount + g.abgelehntCount
              const progressPct = gesamtInGruppe > 0 ? Math.round((erledigt / gesamtInGruppe) * 100) : 0

              return (
                <div key={g.projektId} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.projektId)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{g.projektName}</h3>
                        {g.kundeName && (
                          <span className="text-[11px] text-gray-400">· {g.kundeName}</span>
                        )}
                        {g.offenCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {g.offenCount} offen
                          </span>
                        )}
                      </div>
                      {/* Mini-Progress */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex h-1 rounded-full overflow-hidden bg-gray-100 flex-1 max-w-[240px]">
                          {STATUS_CFG.map((cfg) => {
                            const count = cfg.key === 'ausstehend' ? g.offenCount - g.ueberarbeitungCount
                              : cfg.key === 'freigegeben' ? g.freigegebenCount
                              : cfg.key === 'abgelehnt' ? g.abgelehntCount
                              : g.ueberarbeitungCount
                            const pct = gesamtInGruppe > 0 ? (count / gesamtInGruppe) * 100 : 0
                            if (pct === 0) return null
                            return <div key={cfg.key} style={{ width: `${pct}%`, backgroundColor: cfg.farbe }} />
                          })}
                        </div>
                        <span className="text-[11px] text-gray-400 tabular-nums shrink-0">
                          {erledigt}/{gesamtInGruppe} · {progressPct}%
                        </span>
                      </div>
                    </div>

                    {g.vpSumme > 0 && (
                      <span className="text-[11px] font-mono text-gray-500 tabular-nums shrink-0">
                        {eur(g.vpSumme)}
                      </span>
                    )}

                    <Link
                      href={`/dashboard/projekte/${g.projektId}`}
                      onClick={(ev) => ev.stopPropagation()}
                      className="text-[11px] text-gray-400 hover:text-wellbeing-green transition-colors whitespace-nowrap inline-flex items-center gap-1"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      Projekt
                    </Link>
                  </button>

                  {!isCollapsed && (
                    <ul className="border-t border-gray-100 divide-y divide-gray-50">
                      {g.eintraege.map((e) => produktZeile(e, false))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Tabelle-View (Flachliste mit Projekt in jeder Zeile) */}
        {gefiltert.length > 0 && view === 'tabelle' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50/60 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {gefiltert.length} Einträge
            </div>
            <ul className="divide-y divide-gray-50">
              {gefiltert.map((e) => produktZeile(e, true))}
            </ul>
          </div>
        )}

        {/* Balken-View (Chart) */}
        {gefiltert.length > 0 && view === 'balken' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <BalkenChart gruppen={gruppen} />
          </div>
        )}

        {/* Detail Modal */}
        {selectedEintrag && (
          <DetailModal
            eintrag={selectedEintrag}
            onClose={() => setSelected(null)}
            onReset={() => handleReset(selectedEintrag.id)}
            isPending={isPending}
          />
        )}

      </div>
    </div>
  )
}
