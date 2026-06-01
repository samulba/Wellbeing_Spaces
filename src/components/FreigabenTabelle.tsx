'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, X, Clock, XCircle, RotateCcw, BarChart2, Layers, Table2,
  Search, ChevronDown, ChevronRight, Undo2, ArrowUpRight, Star,
  AlertTriangle, MessageSquareQuote, Home,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { freigabeZuruecksetzenAdmin, freigabeBulkStatusAendernAdmin } from '@/app/actions/freigabe'
import Checkbox from '@/components/Checkbox'
import StickyPageHeader from '@/components/StickyPageHeader'

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
  // Auswahl-Block + Favoriten (Migration 114) — optional, fail-safe angereichert
  produkt_gruppe_id?: string | null
  gruppe_name?: string | null
  admin_favorit?: boolean
  kunde_favorit?: boolean
  // Bereich/„Gruppe" (Mig 116, effektiv = block-first) + Block-Kundennotiz (Mig 119)
  bereich_id?: string | null
  bereich_name?: string | null
  bereich_farbe?: string | null
  block_kunde_notiz?: string | null
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

// Avatar-Tile (gleiche Palette wie ProjekteGrid/NavSidebar)
const AVATAR_FARBEN = ['bg-wellbeing-green', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500']
function avatarFarbe(s: string) { return AVATAR_FARBEN[(s.charCodeAt(0) || 0) % AVATAR_FARBEN.length] }
function initials(name: string) { return name.split(' ').map((w) => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '–' }

function eur(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
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
            <InfoZeile label="Kundenwunsch">
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

// ── Kundennotiz/-wunsch Karte (geteilter Stil mit SortableProduktTabelle) ──
function KundenNotizKarte({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-1.5 flex items-start gap-2 rounded-lg border border-wellbeing-terracotta/25 bg-wellbeing-cream/60 px-2.5 py-1.5" role="note">
      <MessageSquareQuote className="w-3.5 h-3.5 text-wellbeing-terracotta shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-wellbeing-terracotta/80">{label}</p>
        <p className="text-[12px] leading-snug text-wellbeing-green-dark whitespace-pre-line break-words">{text}</p>
      </div>
    </div>
  )
}

// ── Entscheidungs-Einheiten (Block = 1 Einheit, gespiegelt aus FreigabeClient) ──
type Einheiten = { total: number; freigegeben: number; offen: number; abgelehnt: number; ueberarbeitung: number }

/** Status eines Blocks aus seinen Mitgliedern: freigegeben gewinnt, dann Überarbeitung, dann abgelehnt, sonst offen. */
function blockStatusKey(members: FreigabeEintrag[]): 'freigegeben' | 'ueberarbeitung' | 'abgelehnt' | 'ausstehend' {
  const st = members.map((m) => m.produktstatus?.status ?? 'ausstehend')
  if (st.includes('freigegeben')) return 'freigegeben'
  if (st.includes('ueberarbeitung')) return 'ueberarbeitung'
  if (st.includes('abgelehnt')) return 'abgelehnt'
  return 'ausstehend'
}

function zaehleEinheiten(items: FreigabeEintrag[]): Einheiten {
  const eh: Einheiten = { total: 0, freigegeben: 0, offen: 0, abgelehnt: 0, ueberarbeitung: 0 }
  const blockMap = new Map<string, FreigabeEintrag[]>()
  for (const e of items) {
    if (e.produkt_gruppe_id) {
      const arr = blockMap.get(e.produkt_gruppe_id) ?? []
      arr.push(e); blockMap.set(e.produkt_gruppe_id, arr)
      continue
    }
    eh.total++
    const s = e.produktstatus?.status ?? 'ausstehend'
    if (s === 'freigegeben') eh.freigegeben++
    else if (s === 'abgelehnt') eh.abgelehnt++
    else if (s === 'ueberarbeitung') eh.ueberarbeitung++
    else eh.offen++
  }
  for (const members of Array.from(blockMap.values())) {
    eh.total++
    const k = blockStatusKey(members)
    if (k === 'freigegeben') eh.freigegeben++
    else if (k === 'ueberarbeitung') eh.ueberarbeitung++
    else if (k === 'abgelehnt') eh.abgelehnt++
    else eh.offen++
  }
  return eh
}

// ── Gruppierung (flach, für Balken-Chart) ──────────────────────
type ProjektGruppe = {
  projektName: string
  freigegebenCount: number; offenCount: number; abgelehntCount: number; ueberarbeitungCount: number
}
function gruppiereFuerChart(eintraege: FreigabeEintrag[]): ProjektGruppe[] {
  const map = new Map<string, ProjektGruppe>()
  for (const e of eintraege) {
    const p = e.raeume?.projekte
    if (!p) continue
    let g = map.get(p.id)
    if (!g) { g = { projektName: p.name, freigegebenCount: 0, offenCount: 0, abgelehntCount: 0, ueberarbeitungCount: 0 }; map.set(p.id, g) }
    const s = e.produktstatus?.status ?? 'ausstehend'
    if (s === 'freigegeben') g.freigegebenCount++
    else if (s === 'abgelehnt') g.abgelehntCount++
    else if (s === 'ueberarbeitung') { g.ueberarbeitungCount++; g.offenCount++ }
    else g.offenCount++
  }
  return Array.from(map.values())
}

// ── Strukturierter Baum: Projekt → Raum → Bereich → Block/lose ──
type BlockNode = { blockId: string; blockName: string; kundeNotiz: string | null; members: FreigabeEintrag[] }
type BereichNode = { key: string; bereichId: string | null; name: string; farbe: string | null; bloecke: BlockNode[]; lose: FreigabeEintrag[] }
type RaumNode = { raumId: string; raumName: string; bereiche: BereichNode[] }
type ProjektNode = {
  projektId: string; projektName: string; kundeName: string | null; kundeId: string | null
  eintraege: FreigabeEintrag[]; raeume: RaumNode[]
  einheiten: Einheiten; vpSumme: number; handlungsbedarf: number
}

function baueProjektBaum(items: FreigabeEintrag[]): ProjektNode[] {
  const projMap = new Map<string, ProjektNode>()
  for (const e of items) {
    const p = e.raeume?.projekte
    if (!p || !e.raeume) continue
    let pn = projMap.get(p.id)
    if (!pn) {
      pn = { projektId: p.id, projektName: p.name, kundeName: p.kunden?.name ?? null, kundeId: p.kunden?.id ?? null,
        eintraege: [], raeume: [], einheiten: { total: 0, freigegeben: 0, offen: 0, abgelehnt: 0, ueberarbeitung: 0 }, vpSumme: 0, handlungsbedarf: 0 }
      projMap.set(p.id, pn)
    }
    pn.eintraege.push(e)
  }

  for (const pn of Array.from(projMap.values())) {
    const raumMap = new Map<string, RaumNode>()
    for (const e of pn.eintraege) {
      const r = e.raeume!
      if (!raumMap.has(r.id)) raumMap.set(r.id, { raumId: r.id, raumName: r.name, bereiche: [] })
    }
    for (const rn of Array.from(raumMap.values())) {
      const raumItems = pn.eintraege.filter((e) => e.raeume!.id === rn.raumId)
      const berMap = new Map<string, BereichNode>()
      for (const e of raumItems) {
        const bid = e.bereich_id ?? null
        const key = bid ?? '__ohne__'
        if (!berMap.has(key)) {
          berMap.set(key, { key, bereichId: bid, name: bid ? (e.bereich_name ?? 'Gruppe') : 'Ohne Gruppe', farbe: e.bereich_farbe ?? null, bloecke: [], lose: [] })
        }
      }
      for (const bn of Array.from(berMap.values())) {
        const berItems = raumItems.filter((e) => (e.bereich_id ?? null) === bn.bereichId)
        const blockMap = new Map<string, BlockNode>()
        for (const e of berItems) {
          if (e.produkt_gruppe_id) {
            let bl = blockMap.get(e.produkt_gruppe_id)
            if (!bl) { bl = { blockId: e.produkt_gruppe_id, blockName: e.gruppe_name ?? 'Auswahl-Block', kundeNotiz: e.block_kunde_notiz ?? null, members: [] }; blockMap.set(e.produkt_gruppe_id, bl) }
            bl.members.push(e)
          } else {
            bn.lose.push(e)
          }
        }
        bn.bloecke = Array.from(blockMap.values())
      }
      // Bereiche mit Inhalt: „Ohne Gruppe" ans Ende
      rn.bereiche = Array.from(berMap.values()).sort((a, b) => (a.bereichId ? 0 : 1) - (b.bereichId ? 0 : 1))
    }
    pn.raeume = Array.from(raumMap.values())
    pn.einheiten = zaehleEinheiten(pn.eintraege)
    pn.vpSumme = pn.eintraege.reduce((s, e) => s + (e.verkaufspreis ?? 0) * (e.menge ?? 0), 0)
    pn.handlungsbedarf = pn.eintraege.filter((e) => { const s = e.produktstatus?.status; return s === 'abgelehnt' || s === 'ueberarbeitung' }).length
  }

  // Projekte mit den meisten offenen Einheiten zuerst, dann Handlungsbedarf
  return Array.from(projMap.values()).sort((a, b) => b.einheiten.offen - a.einheiten.offen || b.handlungsbedarf - a.handlungsbedarf)
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
  const [selectedIds, setSelectedIds]    = useState<Set<string>>(new Set())
  const [bulkToast, setBulkToast]        = useState<string | null>(null)
  const [feedOffen, setFeedOffen]        = useState(true)
  const [isPending, startTransition]     = useTransition()
  const router                           = useRouter()

  // Globale Status-Counts (für Pills) — unabhängig vom Tab-Filter
  const counts = useMemo(() => {
    const c = { freigegeben: 0, ausstehend: 0, abgelehnt: 0, ueberarbeitung: 0 }
    for (const e of eintraege) {
      const s = (e.produktstatus?.status ?? 'ausstehend') as keyof typeof c
      if (s in c) c[s]++
    }
    return c
  }, [eintraege])

  // Globale Entscheidungs-Einheiten (für Seitenkopf)
  const globalEinheiten = useMemo(() => zaehleEinheiten(eintraege), [eintraege])
  const handlungsbedarfGesamt = useMemo(
    () => eintraege.filter((e) => { const s = e.produktstatus?.status; return s === 'abgelehnt' || s === 'ueberarbeitung' }).length,
    [eintraege],
  )

  // Liste der Projekte für Projekt-Filter
  const alleProjekte = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of eintraege) {
      const p = e.raeume?.projekte
      if (p) m.set(p.id, p.name)
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [eintraege])

  const passtSuche = (e: FreigabeEintrag, q: string) =>
    !q || (
      e.name.toLowerCase().includes(q) ||
      (e.raeume?.name ?? '').toLowerCase().includes(q) ||
      (e.raeume?.projekte?.name ?? '').toLowerCase().includes(q) ||
      (e.kategorie ?? '').toLowerCase().includes(q) ||
      (e.bereich_name ?? '').toLowerCase().includes(q) ||
      (e.gruppe_name ?? '').toLowerCase().includes(q)
    )

  // Kombinierter Filter: Tab + Projekt + Suche
  const gefiltert = useMemo(() => {
    const q = search.trim().toLowerCase()
    return eintraege.filter((e) => {
      const status = e.produktstatus?.status ?? 'ausstehend'
      if (!matchTab(status, tab)) return false
      if (projektFilter !== 'alle' && e.raeume?.projekte?.id !== projektFilter) return false
      return passtSuche(e, q)
    })
  }, [eintraege, tab, projektFilter, search])

  const projektBaum = useMemo(() => baueProjektBaum(gefiltert), [gefiltert])
  const chartGruppen = useMemo(() => gruppiereFuerChart(gefiltert), [gefiltert])

  // Handlungsbedarf-Feed: abgelehnt/ueberarbeitung (mit Kommentar zuerst). Respektiert Projekt+Suche, nicht den Tab.
  const feedItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return eintraege
      .filter((e) => { const s = e.produktstatus?.status; return s === 'abgelehnt' || s === 'ueberarbeitung' })
      .filter((e) => projektFilter === 'alle' || e.raeume?.projekte?.id === projektFilter)
      .filter((e) => passtSuche(e, q))
      .sort((a, b) => {
        const ak = a.produktstatus?.kommentar ? 0 : 1
        const bk = b.produktstatus?.kommentar ? 0 : 1
        if (ak !== bk) return ak - bk
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [eintraege, projektFilter, search])

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

  // ── Bulk-Auswahl ────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectGroup(groupIds: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const alleDrin = groupIds.every((id) => next.has(id))
      if (alleDrin) groupIds.forEach((id) => next.delete(id))
      else groupIds.forEach((id) => next.add(id))
      return next
    })
  }

  function selectAllVisible() {
    setSelectedIds(new Set(gefiltert.map((e) => e.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function showBulkToast(msg: string) {
    setBulkToast(msg)
    setTimeout(() => setBulkToast(null), 2800)
  }

  function handleBulk(neuerStatus: 'ausstehend' | 'freigegeben' | 'abgelehnt' | 'ueberarbeitung') {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    startTransition(async () => {
      const res = await freigabeBulkStatusAendernAdmin(ids, neuerStatus)
      if (res.erfolg) {
        const label = neuerStatus === 'ausstehend' ? 'zurückgesetzt'
          : neuerStatus === 'freigegeben' ? 'freigegeben'
          : neuerStatus === 'abgelehnt' ? 'abgelehnt'
          : 'zur Überarbeitung markiert'
        showBulkToast(`${res.anzahl} Produkt${res.anzahl === 1 ? '' : 'e'} ${label}`)
        clearSelection()
        router.refresh()
      } else {
        showBulkToast(res.fehler ?? 'Bulk-Aktion fehlgeschlagen')
      }
    })
  }

  // ── Produkt-Zeile (kompakt, Hover-Actions) ──────────────────
  const produktZeile = (e: FreigabeEintrag, withProjekt = false) => {
    const status    = (e.produktstatus?.status ?? 'ausstehend') as keyof typeof counts
    const kommentar = e.produktstatus?.kommentar
    const kuerzel   = e.name.slice(0, 2).toUpperCase()
    const cfg       = STATUS_CFG.find((c) => c.key === status)
    const vp        = (e.verkaufspreis ?? 0) * (e.menge ?? 0)

    const istMarkiert = selectedIds.has(e.id)
    return (
      <li
        key={e.id}
        className={`group px-4 md:px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
          istMarkiert ? 'bg-wellbeing-green/5' : ''
        }`}
        onClick={() => setSelected(e)}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <div className="shrink-0 mt-1">
            <Checkbox
              checked={istMarkiert}
              onChange={() => toggleSelect(e.id)}
              ariaLabel={`${e.name} auswählen`}
              onClick={(ev) => ev.stopPropagation()}
            />
          </div>

          {/* Thumbnail 32px */}
          {e.bild_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={e.bild_url}
              alt={e.name}
              className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-wellbeing-cream border border-wellbeing-cream shrink-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-wellbeing-green-light">{kuerzel}</span>
            </div>
          )}

          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Name + Datum (Datum rechts, immer) */}
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{e.name}</p>
              <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">
                {formatDatum(e.created_at)}
              </span>
            </div>

            {/* Row 2: Raum · Projekt (nur in Tabelle/Feed) */}
            {(e.raeume?.name || (withProjekt && e.raeume?.projekte)) && (
              <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                {e.raeume?.name}
                {withProjekt && e.raeume?.projekte && (
                  <> · {e.raeume.projekte.name}</>
                )}
              </p>
            )}

            {/* Kundenwunsch (wenn Überarbeitung/Abgelehnt mit Kommentar) */}
            {kommentar && (
              <p className="text-[11px] text-wellbeing-terracotta mt-0.5 truncate" title={kommentar}>
                &bdquo;{kommentar}&ldquo;
              </p>
            )}

            {/* Row 3: Status-Pill + Favorit + VP + Actions */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {cfg && (
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} shrink-0`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              )}
              {/* Block: Empfehlung / Kundenwahl / Alternative (Migration 114) */}
              {e.produkt_gruppe_id && (
                <>
                  {e.admin_favorit && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-wellbeing-green/10 text-wellbeing-green-dark shrink-0">
                      <Star className="w-2.5 h-2.5" /> Empfehlung
                    </span>
                  )}
                  {e.kunde_favorit ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Kundenwahl
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
                      Alternative
                    </span>
                  )}
                </>
              )}
              {vp > 0 && (
                <span className="text-[11px] font-mono text-gray-500 tabular-nums">
                  {eur(vp)}
                </span>
              )}
              <div className="ml-auto flex items-center gap-0.5 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {status !== 'ausstehend' && (
                  <button
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); handleReset(e.id) }}
                    disabled={isPending}
                    title="Zurücksetzen"
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                    aria-label="Freigabe zurücksetzen"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <Link
                  href={`/dashboard/projekte/${e.raeume?.projekte?.id ?? ''}/raeume/${e.raeume?.id ?? ''}`}
                  onClick={(ev) => ev.stopPropagation()}
                  title="Im Raum öffnen"
                  aria-label="Im Raum öffnen"
                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-wellbeing-green hover:bg-wellbeing-green/10 rounded-md transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </li>
    )
  }

  // ── Block-Karte (Auswahl-Block innerhalb eines Bereichs) ─────
  const blockKarte = (bl: BlockNode) => {
    const k = blockStatusKey(bl.members)
    return (
      <div key={bl.blockId} className="px-4 md:px-5 py-2.5 border-b border-gray-100 bg-gray-50/40 last:border-b-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Layers className="w-3.5 h-3.5 text-wellbeing-green shrink-0" />
          <span className="text-xs font-semibold text-gray-700">{bl.blockName}</span>
          <span className="text-[10px] text-gray-400">{bl.members.length} {bl.members.length === 1 ? 'Option' : 'Optionen'}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusBadge[k] ?? 'bg-gray-100 text-gray-500'}`}>
            {k === 'ausstehend' ? 'Offen' : statusLabel[k]}
          </span>
        </div>
        {bl.kundeNotiz && bl.kundeNotiz.trim() && (
          <KundenNotizKarte label="Kundennotiz" text={bl.kundeNotiz} />
        )}
        <ul className="mt-1.5 bg-white rounded-lg border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {bl.members.map((e) => produktZeile(e, false))}
        </ul>
      </div>
    )
  }

  // ── Handlungsbedarf-Zeile ────────────────────────────────────
  const feedZeile = (e: FreigabeEintrag) => {
    const status    = e.produktstatus?.status ?? 'ausstehend'
    const kommentar = e.produktstatus?.kommentar
    const kuerzel   = e.name.slice(0, 2).toUpperCase()
    const cfg       = STATUS_CFG.find((c) => c.key === status)
    return (
      <li key={e.id} className="px-4 md:px-5 py-3">
        <div className="flex items-start gap-3">
          {e.bild_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.bild_url} alt={e.name} className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-wellbeing-cream border border-wellbeing-cream shrink-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-wellbeing-green-light">{kuerzel}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{e.name}</p>
              <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">{formatDatum(e.created_at)}</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              {e.raeume?.projekte?.name}
              {e.raeume?.name && <> · {e.raeume.name}</>}
              {e.bereich_name && <> · <span className="text-wellbeing-green">{e.bereich_name}</span></>}
              {e.gruppe_name && <> · {e.gruppe_name}</>}
            </p>
            {kommentar
              ? <KundenNotizKarte label="Kundenwunsch" text={kommentar} />
              : <p className="text-[11px] text-gray-400 italic mt-1">Kein Kommentar hinterlassen.</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {cfg && (
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} shrink-0`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                <Link
                  href={`/dashboard/projekte/${e.raeume?.projekte?.id ?? ''}/raeume/${e.raeume?.id ?? ''}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-wellbeing-green hover:text-wellbeing-green-dark px-2 py-1 rounded-md hover:bg-wellbeing-green/5 transition-colors"
                >
                  Im Raum öffnen <ArrowUpRight className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => handleReset(e.id)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 border border-amber-200 hover:bg-amber-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                >
                  <Undo2 className="w-3 h-3" /> Zurücksetzen
                </button>
              </div>
            </div>
          </div>
        </div>
      </li>
    )
  }

  const subtitle = globalEinheiten.total > 0
    ? `${globalEinheiten.freigegeben} von ${globalEinheiten.total} Entscheidungen freigegeben` +
      (handlungsbedarfGesamt > 0 ? ` · ${handlungsbedarfGesamt} mit Handlungsbedarf` : '')
    : 'Produkt-Freigaben aller Projekte im Überblick'

  return (
    <>
      <StickyPageHeader
        title="Freigaben"
        count={globalEinheiten.offen}
        countLabel="offen"
        subtitle={subtitle}
      />

      <div className="px-6 py-6 space-y-4">

        {/* Filter-Pills (Projekte-Stil) */}
        <div className="flex items-center flex-wrap gap-1.5">
          {STATUS_CFG.map((cfg) => {
            const count = counts[cfg.key as keyof typeof counts]
            const aktiv = tab === cfg.tab
            return (
              <button
                key={cfg.key}
                type="button"
                onClick={() => setTab(aktiv ? 'alle' : cfg.tab)}
                className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  aktiv ? 'bg-wellbeing-green text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
                <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 tabular-nums ${aktiv ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setTab('alle')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'alle' ? 'bg-wellbeing-green text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Alle
          </button>
        </div>

        {/* Toolbar: Suche + Projekt + View */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-[340px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              placeholder="Produkt, Raum, Projekt, Gruppe…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition"
            />
          </div>

          <div className="relative">
            <select
              value={projektFilter}
              onChange={(ev) => setProjektFilter(ev.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 cursor-pointer"
            >
              <option value="alle">Alle Projekte</option>
              {alleProjekte.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <span className="text-xs text-gray-400 tabular-nums hidden md:inline">{gefiltert.length} Einträge</span>

          <div className="ml-auto flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
            {([
              { key: 'gruppen' as const, label: 'Nach Projekt', Icon: Layers },
              { key: 'tabelle' as const, label: 'Tabelle', Icon: Table2 },
              { key: 'balken'  as const, label: 'Balken',  Icon: BarChart2 },
            ]).map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                title={label}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                  view === key ? 'bg-wellbeing-green text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Handlungsbedarf-Feed */}
        {feedItems.length > 0 && (
          <div className="bg-white border border-wellbeing-terracotta/20 rounded-xl shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setFeedOffen((o) => !o)}
              className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-wellbeing-cream/30 transition-colors"
            >
              <span className="w-7 h-7 rounded-lg bg-wellbeing-terracotta/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-wellbeing-terracotta" />
              </span>
              <span className="text-sm font-semibold text-gray-900">Handlungsbedarf</span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-wellbeing-terracotta/10 text-wellbeing-terracotta tabular-nums">
                {feedItems.length}
              </span>
              <span className="text-[11px] text-gray-400 hidden sm:inline">Kundenrückmeldungen, die du bearbeiten solltest</span>
              <ChevronRight className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${feedOffen ? 'rotate-90' : ''}`} />
            </button>
            {feedOffen && (
              <ul className="border-t border-gray-100 divide-y divide-gray-50">
                {feedItems.map((e) => feedZeile(e))}
              </ul>
            )}
          </div>
        )}

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

        {/* Strukturierte „Nach Projekt"-Ansicht: Projekt → Raum → Bereich → Block/lose */}
        {gefiltert.length > 0 && view === 'gruppen' && (
          <div className="space-y-3">
            {projektBaum.map((p) => {
              const isCollapsed = collapsedGroups.has(p.projektId)
              const gruppeIds = p.eintraege.map((e) => e.id)
              const alleMarkiert = gruppeIds.length > 0 && gruppeIds.every((id) => selectedIds.has(id))
              const teilMarkiert = !alleMarkiert && gruppeIds.some((id) => selectedIds.has(id))
              const eh = p.einheiten
              const pct = eh.total > 0 ? Math.round((eh.freigegeben / eh.total) * 100) : 0

              return (
                <div key={p.projektId} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Projekt-Kopf */}
                  <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="shrink-0">
                      <Checkbox
                        checked={alleMarkiert}
                        indeterminate={teilMarkiert}
                        onChange={() => toggleSelectGroup(gruppeIds)}
                        ariaLabel={`Alle Produkte in ${p.projektName} auswählen`}
                        onClick={(ev) => ev.stopPropagation()}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleGroup(p.projektId)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isCollapsed ? '' : 'rotate-90'}`} />
                      <span className={`w-9 h-9 rounded-lg ${avatarFarbe(p.projektName)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {initials(p.projektName)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{p.projektName}</h3>
                          {p.kundeName && <span className="text-[11px] text-gray-400">· {p.kundeName}</span>}
                          {eh.offen > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {eh.offen} offen
                            </span>
                          )}
                          {p.handlungsbedarf > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-wellbeing-terracotta/10 text-wellbeing-terracotta">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {p.handlungsbedarf} Handlungsbedarf
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex h-1 rounded-full overflow-hidden bg-gray-100 flex-1 max-w-[240px]">
                            {([
                              ['freigegeben', eh.freigegeben],
                              ['ausstehend', eh.offen],
                              ['ueberarbeitung', eh.ueberarbeitung],
                              ['abgelehnt', eh.abgelehnt],
                            ] as const).map(([key, n]) => {
                              const segPct = eh.total > 0 ? (n / eh.total) * 100 : 0
                              if (segPct === 0) return null
                              const farbe = STATUS_CFG.find((c) => c.key === key)?.farbe ?? '#d1d5db'
                              return <div key={key} style={{ width: `${segPct}%`, backgroundColor: farbe }} />
                            })}
                          </div>
                          <span className="text-[11px] text-gray-400 tabular-nums shrink-0">
                            {eh.freigegeben}/{eh.total} · {pct}%
                          </span>
                        </div>
                      </div>
                    </button>
                    {p.vpSumme > 0 && (
                      <span className="text-[11px] font-mono text-gray-500 tabular-nums shrink-0 hidden sm:inline">{eur(p.vpSumme)}</span>
                    )}
                    <Link
                      href={`/dashboard/projekte/${p.projektId}`}
                      onClick={(ev) => ev.stopPropagation()}
                      className="text-[11px] text-gray-400 hover:text-wellbeing-green transition-colors whitespace-nowrap inline-flex items-center gap-1 shrink-0"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      <span className="hidden sm:inline">Projekt</span>
                    </Link>
                  </div>

                  {/* Projekt-Körper: Raum → Bereich → Block/lose */}
                  {!isCollapsed && (
                    <div className="border-t border-gray-100">
                      {p.raeume.map((r) => (
                        <div key={r.raumId}>
                          {p.raeume.length > 1 && (
                            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-50/70 border-b border-gray-100">
                              <Home className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{r.raumName}</span>
                            </div>
                          )}
                          {r.bereiche.map((bn) => (
                            <div key={bn.key}>
                              <div className="flex items-center gap-2 px-4 py-1.5 bg-wellbeing-green/[0.03] border-b border-gray-100">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: bn.farbe || (bn.bereichId ? '#94c1a4' : '#d1d5db') }} />
                                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{bn.name}</span>
                              </div>
                              {bn.bloecke.map((bl) => blockKarte(bl))}
                              {bn.lose.length > 0 && (
                                <ul className="divide-y divide-gray-50 border-b border-gray-100 last:border-b-0">
                                  {bn.lose.map((e) => produktZeile(e, false))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
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
            <BalkenChart gruppen={chartGruppen} />
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

      {/* ── Floating Bulk-Action-Bar ────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto flex items-center gap-2 bg-white border border-gray-200 rounded-2xl shadow-xl pl-4 pr-2 py-2 animate-fadeIn flex-wrap justify-center">
            <span className="text-xs font-medium text-gray-700 tabular-nums">
              {selectedIds.size} ausgewählt
            </span>
            <span className="w-px h-5 bg-gray-200 mx-1" />
            <button
              type="button"
              onClick={() => handleBulk('freigegeben')}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Freigeben
            </button>
            <button
              type="button"
              onClick={() => handleBulk('abgelehnt')}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 rounded-lg transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Ablehnen
            </button>
            <button
              type="button"
              onClick={() => handleBulk('ueberarbeitung')}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Überarbeiten
            </button>
            <button
              type="button"
              onClick={() => handleBulk('ausstehend')}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Zurücksetzen
            </button>
            <span className="w-px h-5 bg-gray-200 mx-1" />
            {selectedIds.size < gefiltert.length && (
              <button
                type="button"
                onClick={selectAllVisible}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-wellbeing-green-dark hover:bg-gray-50 rounded-lg transition-colors"
              >
                Alle sichtbaren ({gefiltert.length})
              </button>
            )}
            <button
              type="button"
              onClick={clearSelection}
              title="Auswahl aufheben"
              aria-label="Auswahl aufheben"
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk-Toast */}
      {bulkToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-wellbeing-green text-white text-xs font-medium rounded-lg shadow-lg animate-fadeIn">
          ✓ {bulkToast}
        </div>
      )}
    </>
  )
}
