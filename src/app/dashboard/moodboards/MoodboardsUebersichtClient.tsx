'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, Palette, Share2, FolderOpen, LayoutGrid, List, ExternalLink, Calendar,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import MoodboardVorschau from '@/components/moodboard/MoodboardVorschau'
import type { MoodboardListEintrag } from '@/app/actions/moodboard'

type FilterStatus = 'alle' | 'freigegeben' | 'entwurf'
type ViewMode     = 'grid' | 'list'

interface Props {
  eintraege: MoodboardListEintrag[]
}

export default function MoodboardsUebersichtClient({ eintraege }: Props) {
  const [suche, setSuche] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('alle')
  const [ansicht, setAnsicht] = useState<ViewMode>('grid')

  const counts = useMemo(() => ({
    alle:        eintraege.length,
    freigegeben: eintraege.filter((e) => e.freigabe_aktiv).length,
    entwurf:     eintraege.filter((e) => !e.freigabe_aktiv).length,
  }), [eintraege])

  const gefiltert = useMemo(() => {
    let r = eintraege
    if (filter === 'freigegeben') r = r.filter((e) => e.freigabe_aktiv)
    if (filter === 'entwurf')     r = r.filter((e) => !e.freigabe_aktiv)
    if (suche.trim()) {
      const q = suche.trim().toLowerCase()
      r = r.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.raum_name.toLowerCase().includes(q) ||
          e.projekt_name.toLowerCase().includes(q) ||
          (e.kunde_name?.toLowerCase().includes(q) ?? false),
      )
    }
    return r
  }, [eintraege, filter, suche])

  return (
    <>
      {/* Status-Tabs (Aktiv / Archiviert-Style) */}
      <div className="flex items-center gap-2 mb-4">
        <FilterTab
          active={filter === 'alle'}
          onClick={() => setFilter('alle')}
          count={counts.alle}
          label="Alle"
        />
        <FilterTab
          active={filter === 'freigegeben'}
          onClick={() => setFilter('freigegeben')}
          count={counts.freigegeben}
          label="Freigegeben"
          icon={<Share2 className="w-3.5 h-3.5" />}
        />
        <FilterTab
          active={filter === 'entwurf'}
          onClick={() => setFilter('entwurf')}
          count={counts.entwurf}
          label="Entwurf"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative w-[340px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Moodboard, Raum, Projekt oder Kunde suchen…"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition"
          />
        </div>

        <span className="text-sm text-gray-400">
          {gefiltert.length} {gefiltert.length === 1 ? 'Eintrag' : 'Einträge'}
        </span>

        <div className="ml-auto flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setAnsicht('grid')}
            title="Kachelansicht"
            className={`px-3 py-2 transition-colors ${
              ansicht === 'grid' ? 'bg-wellbeing-green text-white' : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnsicht('list')}
            title="Listenansicht"
            className={`px-3 py-2 border-l border-gray-200 transition-colors ${
              ansicht === 'list' ? 'bg-wellbeing-green text-white' : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {eintraege.length === 0 ? (
        <EmptyState />
      ) : gefiltert.length === 0 ? (
        <NoResults onReset={() => { setSuche(''); setFilter('alle') }} />
      ) : ansicht === 'grid' ? (
        <GridView eintraege={gefiltert} />
      ) : (
        <ListView eintraege={gefiltert} />
      )}
    </>
  )
}

// ── Filter-Tab (im Projekte-Toggle-Stil) ─────────────────────────
function FilterTab({
  active, onClick, count, label, icon,
}: {
  active: boolean
  onClick: () => void
  count: number
  label: string
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-wellbeing-green text-white'
          : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
      }`}
    >
      {icon}
      {label}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        {count}
      </span>
    </button>
  )
}

// ── Hilfs-Funktion: Initialen + konstante Farbe ──────────────────
function projektInitialen(name: string): string {
  return name
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '').join('') || '·'
}

const AVATAR_FARBEN = [
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-orange-100 text-orange-700',
]

function avatarFarbe(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % AVATAR_FARBEN.length
  return AVATAR_FARBEN[hash]
}

// ── GridView (analog ProjekteGrid Cards) ─────────────────────────
function GridView({ eintraege }: { eintraege: MoodboardListEintrag[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {eintraege.map((e) => (
        <MoodboardCard key={e.id} eintrag={e} />
      ))}
    </div>
  )
}

function MoodboardCard({ eintrag }: { eintrag: MoodboardListEintrag }) {
  const farbe = avatarFarbe(eintrag.projekt_id)
  const initialen = projektInitialen(eintrag.projekt_name)

  return (
    <Link
      href={`/dashboard/projekte/${eintrag.projekt_id}/raeume/${eintrag.raum_id}/moodboard`}
      className="group bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all overflow-hidden flex flex-col"
    >
      {/* Vorschau */}
      <div className="relative border-b border-gray-100">
        <MoodboardVorschau canvasJson={eintrag.canvas_json} hoehe={180} />
        {eintrag.freigabe_aktiv && (
          <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 bg-wellbeing-green text-white text-[10px] font-medium rounded-full shadow-sm">
            <Share2 className="w-2.5 h-2.5" />
            Freigabe
          </div>
        )}
      </div>

      {/* Info-Block */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Header-Zeile: Avatar + Titel + Datum */}
        <div className="flex items-start gap-3 mb-2">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0 ${farbe}`}>
            {initialen}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-gray-900 truncate">{eintrag.name}</div>
            <div className="text-xs text-gray-500 truncate mt-0.5">
              {eintrag.projekt_name}
            </div>
          </div>
          <span className="text-[11px] text-gray-400 shrink-0 inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDistanceToNow(new Date(eintrag.updated_at), { addSuffix: true, locale: de })}
          </span>
        </div>

        {/* Footer-Zeile: Raum + Kunde */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 text-xs">
          <span className="inline-flex items-center gap-1 text-gray-500">
            <FolderOpen className="w-3 h-3 text-gray-400" />
            <span className="truncate">Raum: {eintrag.raum_name}</span>
          </span>
          {eintrag.kunde_name && (
            <span className="text-gray-400 truncate ml-2">{eintrag.kunde_name}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── ListView ─────────────────────────────────────────────────────
function ListView({ eintraege }: { eintraege: MoodboardListEintrag[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-100">
        {eintraege.map((e) => {
          const farbe = avatarFarbe(e.projekt_id)
          return (
            <Link
              key={e.id}
              href={`/dashboard/projekte/${e.projekt_id}/raeume/${e.raum_id}/moodboard`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group"
            >
              {/* Mini-Vorschau */}
              <div className="w-20 h-14 shrink-0 rounded-lg border border-gray-200 overflow-hidden">
                <MoodboardVorschau canvasJson={e.canvas_json} hoehe={56} />
              </div>

              {/* Avatar + Info */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${farbe}`}>
                {projektInitialen(e.projekt_name)}
              </div>
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

              <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400 shrink-0">
                <Calendar className="w-3 h-3" />
                {formatDistanceToNow(new Date(e.updated_at), { addSuffix: true, locale: de })}
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-wellbeing-green transition-colors" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Empty / NoResults ────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="w-12 h-12 rounded-xl bg-wellbeing-cream flex items-center justify-center mx-auto mb-3">
        <Palette className="w-6 h-6 text-wellbeing-green-dark" />
      </div>
      <p className="text-gray-500 text-sm font-medium">Noch kein Moodboard erstellt</p>
      <p className="text-xs text-gray-400 mt-1">
        Öffne einen Raum in einem Projekt und klicke dort auf &bdquo;Moodboard&ldquo;.
      </p>
      <Link
        href="/dashboard/projekte"
        className="inline-block mt-4 text-sm text-wellbeing-green underline underline-offset-2"
      >
        Zu den Projekten
      </Link>
    </div>
  )
}

function NoResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
      <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-700 font-medium">Keine Moodboards gefunden</p>
      <p className="text-xs text-gray-500 mt-1">Versuche es mit einem anderen Suchbegriff oder Filter.</p>
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
