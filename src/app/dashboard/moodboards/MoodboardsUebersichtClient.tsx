'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, Palette, Share2, FolderOpen, ChevronDown, LayoutGrid, List,
  Calendar, ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import MoodboardVorschau from '@/components/moodboard/MoodboardVorschau'
import type { MoodboardListEintrag } from '@/app/actions/moodboard'

type SortBy   = 'updated' | 'name' | 'projekt'
type ViewMode = 'grid' | 'list'

interface Props {
  eintraege: MoodboardListEintrag[]
}

export default function MoodboardsUebersichtClient({ eintraege }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProjekt, setSelectedProjekt] = useState('')
  const [filterFreigabe, setFilterFreigabe] = useState<'alle' | 'freigegeben' | 'entwurf'>('alle')
  const [sortBy, setSortBy] = useState<SortBy>('updated')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const projekte = useMemo(() => {
    const map = new Map<string, string>()
    eintraege.forEach((e) => map.set(e.projekt_id, e.projekt_name))
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [eintraege])

  const gefiltert = useMemo(() => {
    let r = [...eintraege]
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      r = r.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.raum_name.toLowerCase().includes(q) ||
          e.projekt_name.toLowerCase().includes(q) ||
          (e.kunde_name?.toLowerCase().includes(q) ?? false),
      )
    }
    if (selectedProjekt) r = r.filter((e) => e.projekt_id === selectedProjekt)
    if (filterFreigabe === 'freigegeben') r = r.filter((e) => e.freigabe_aktiv)
    if (filterFreigabe === 'entwurf')     r = r.filter((e) => !e.freigabe_aktiv)

    if (sortBy === 'name') {
      r.sort((a, b) => a.name.localeCompare(b.name, 'de'))
    } else if (sortBy === 'projekt') {
      r.sort((a, b) =>
        a.projekt_name.localeCompare(b.projekt_name, 'de') ||
        a.raum_name.localeCompare(b.raum_name, 'de'),
      )
    } else {
      r.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }
    return r
  }, [eintraege, searchQuery, selectedProjekt, filterFreigabe, sortBy])

  const stats = useMemo(() => ({
    gesamt:       eintraege.length,
    freigegeben:  eintraege.filter((e) => e.freigabe_aktiv).length,
    mitInhalt:    eintraege.filter((e) => e.canvas_json && Object.keys(e.canvas_json).length > 0).length,
  }), [eintraege])

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn bg-gray-50/30">

      {/* Hero-Band */}
      <div className="relative overflow-hidden bg-gradient-to-br from-wellbeing-green via-wellbeing-green-dark to-wellbeing-green border-b border-wellbeing-green-dark/20">
        <div aria-hidden className="absolute -top-20 -right-16 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-wellbeing-sand/10 blur-2xl" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">
                Inspiration & Vibe
              </p>
              <h1 className="text-2xl md:text-3xl font-medium tracking-tight">Moodboards</h1>
              <p className="text-sm text-white/70 mt-1.5 max-w-xl">
                Stimme den Stil mit deinem Kunden ab — bevor du konkrete Produkte einkaufst.
              </p>
            </div>

            {/* Stats-Pills */}
            <div className="flex items-center gap-3">
              <StatPill label="Gesamt"      value={stats.gesamt} />
              <StatPill label="Freigegeben" value={stats.freigegeben} icon={<Share2 className="w-3 h-3" />} />
              <StatPill label="Mit Inhalt"  value={stats.mitInhalt} />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="px-6 lg:px-8 py-3 max-w-[1600px] mx-auto">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Suche */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Moodboard, Raum, Projekt oder Kunde suchen…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/30 focus:border-wellbeing-green transition-colors"
              />
            </div>

            {/* Projekt-Filter */}
            <SelectField
              value={selectedProjekt}
              onChange={setSelectedProjekt}
              options={[{ value: '', label: 'Alle Projekte' }, ...projekte.map((p) => ({ value: p.id, label: p.name }))]}
            />

            {/* Freigabe-Filter */}
            <SelectField
              value={filterFreigabe}
              onChange={(v) => setFilterFreigabe(v as 'alle' | 'freigegeben' | 'entwurf')}
              options={[
                { value: 'alle', label: 'Alle Status' },
                { value: 'freigegeben', label: 'Freigegeben' },
                { value: 'entwurf', label: 'Entwurf' },
              ]}
            />

            {/* Sortierung */}
            <SelectField
              value={sortBy}
              onChange={(v) => setSortBy(v as SortBy)}
              options={[
                { value: 'updated', label: 'Zuletzt bearbeitet' },
                { value: 'name', label: 'Name A–Z' },
                { value: 'projekt', label: 'Nach Projekt' },
              ]}
            />

            {/* View-Toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                title="Kachelansicht"
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="Listenansicht"
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
        {eintraege.length === 0 ? (
          <EmptyState />
        ) : gefiltert.length === 0 ? (
          <NoResults onReset={() => { setSearchQuery(''); setSelectedProjekt(''); setFilterFreigabe('alle') }} />
        ) : viewMode === 'grid' ? (
          <GridView eintraege={gefiltert} />
        ) : (
          <ListView eintraege={gefiltert} />
        )}
      </div>
    </div>
  )
}

// ── StatPill ─────────────────────────────────────────────────────
function StatPill({
  label, value, icon,
}: {
  label: string
  value: number
  icon?: React.ReactNode
}) {
  return (
    <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 min-w-[100px]">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/70 font-medium">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold text-white tabular-nums mt-0.5">{value}</div>
    </div>
  )
}

// ── SelectField ──────────────────────────────────────────────────
function SelectField({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/30 focus:border-wellbeing-green transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}

// ── GridView ─────────────────────────────────────────────────────
function GridView({ eintraege }: { eintraege: MoodboardListEintrag[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {eintraege.map((e) => (
        <MoodboardCard key={e.id} eintrag={e} />
      ))}
    </div>
  )
}

function MoodboardCard({ eintrag }: { eintrag: MoodboardListEintrag }) {
  return (
    <Link
      href={`/dashboard/projekte/${eintrag.projekt_id}/raeume/${eintrag.raum_id}/moodboard`}
      className="group bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden hover:border-wellbeing-green/40 hover:shadow-lg transition-all"
    >
      {/* Vorschau */}
      <div className="relative">
        <MoodboardVorschau canvasJson={eintrag.canvas_json} hoehe={180} />

        {/* Freigabe-Badge */}
        {eintrag.freigabe_aktiv && (
          <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 bg-wellbeing-green text-white text-[10px] font-medium rounded-full shadow-md">
            <Share2 className="w-2.5 h-2.5" />
            Freigabe
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{eintrag.name}</div>
            <div className="text-xs text-gray-500 truncate mt-0.5">
              <span className="text-gray-400">Raum:</span> {eintrag.raum_name}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-[11px] text-gray-400 min-w-0">
            <FolderOpen className="w-3 h-3 shrink-0" />
            <span className="truncate">{eintrag.projekt_name}</span>
          </div>
          <span className="text-[11px] text-gray-400 shrink-0 ml-2">
            {formatDistanceToNow(new Date(eintrag.updated_at), { addSuffix: true, locale: de })}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── ListView ─────────────────────────────────────────────────────
function ListView({ eintraege }: { eintraege: MoodboardListEintrag[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-100">
        {eintraege.map((e) => (
          <Link
            key={e.id}
            href={`/dashboard/projekte/${e.projekt_id}/raeume/${e.raum_id}/moodboard`}
            className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group"
          >
            {/* Mini-Vorschau */}
            <div className="w-20 h-14 shrink-0 rounded-lg border border-gray-200 overflow-hidden">
              <MoodboardVorschau canvasJson={e.canvas_json} hoehe={56} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">{e.name}</span>
                {e.freigabe_aktiv && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-wellbeing-green/10 text-wellbeing-green text-[10px] font-medium rounded-full">
                    <Share2 className="w-2.5 h-2.5" />
                    Freigabe
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">
                {e.projekt_name} · {e.raum_name}
                {e.kunde_name && <span className="text-gray-400"> · {e.kunde_name}</span>}
              </div>
            </div>

            {/* Datum + Pfeil */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400 shrink-0">
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(e.updated_at), { addSuffix: true, locale: de })}
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-wellbeing-green transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Empty / NoResults ────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="bg-white border border-dashed border-gray-300 rounded-2xl px-6 py-20 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-wellbeing-cream flex items-center justify-center">
        <Palette className="w-7 h-7 text-wellbeing-green-dark" />
      </div>
      <h2 className="text-base font-medium text-gray-800">Noch kein Moodboard erstellt</h2>
      <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
        Öffne einen Raum in einem Projekt und klicke dort auf &bdquo;Moodboard&ldquo;. Pro Raum gibt es genau ein Board — du kannst beliebig viele Versionen speichern.
      </p>
      <Link
        href="/dashboard/projekte"
        className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg transition-colors"
      >
        Zu den Projekten
      </Link>
    </div>
  )
}

function NoResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-6 py-16 text-center shadow-sm">
      <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-700 font-medium">Keine Moodboards gefunden</p>
      <p className="text-xs text-gray-500 mt-1">Versuche es mit anderen Filtern oder Suchbegriffen.</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 text-sm text-wellbeing-green hover:underline"
      >
        Filter zurücksetzen
      </button>
    </div>
  )
}
