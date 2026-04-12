'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, X, Clock, XCircle, RotateCcw, PieChart as PieIcon, BarChart2, List } from 'lucide-react'
import {
  PieChart, Pie, Cell, Label, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { freigabeZuruecksetzenAdmin } from '@/app/actions/freigabe'

// ── Typen ─────────────────────────────────────────────────────
export type FreigabeEintrag = {
  id: string
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

type Tab = 'offen' | 'freigegeben' | 'abgelehnt' | 'alle'

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
const STATUS_FARBEN: Record<string, string> = {
  freigegeben:    '#10B981',
  ausstehend:     '#F59E0B',
  abgelehnt:      '#EF4444',
  ueberarbeitung: '#6366F1',
}

function isOffen(status: string) { return status === 'ausstehend' || status === 'ueberarbeitung' }

function matchTab(status: string, tab: Tab) {
  if (tab === 'alle') return true
  if (tab === 'offen') return isOffen(status)
  return status === tab
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── Chart: Donut-Mitte Label ──────────────────────────────────
function DonutMitte({ gesamt, viewBox }: { gesamt: number; viewBox?: { cx?: number; cy?: number } }) {
  const cx = viewBox?.cx ?? 0
  const cy = viewBox?.cy ?? 0
  return (
    <g>
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={20} fontWeight="bold" fill="#111827">
        {gesamt}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="hanging" fontSize={9} fill="#9CA3AF">
        Produkte
      </text>
    </g>
  )
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

// ── Chart: Haupt-Komponente ───────────────────────────────────
type ChartView = 'donut' | 'balken' | 'liste'

const LISTE_CFG = [
  { key: 'freigegeben',    label: 'Freigegeben',   icon: CheckCircle2, farbe: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { key: 'ausstehend',     label: 'Ausstehend',    icon: Clock,        farbe: '#F59E0B', bg: 'bg-amber-50',   text: 'text-amber-700'   },
  { key: 'abgelehnt',      label: 'Abgelehnt',     icon: XCircle,      farbe: '#EF4444', bg: 'bg-red-50',     text: 'text-red-600'     },
  { key: 'ueberarbeitung', label: 'Überarbeitung', icon: RotateCcw,    farbe: '#6366F1', bg: 'bg-indigo-50',  text: 'text-indigo-700'  },
]

function FreigabeChart({ eintraege }: { eintraege: FreigabeEintrag[] }) {
  const [view, setView] = useState<ChartView>('donut')

  const counts = useMemo(() => {
    const c: Record<string, number> = { freigegeben: 0, ausstehend: 0, abgelehnt: 0, ueberarbeitung: 0 }
    for (const e of eintraege) {
      const s = e.produktstatus?.status ?? 'ausstehend'
      if (s in c) c[s]++
    }
    return c
  }, [eintraege])

  const donutData = useMemo(() =>
    LISTE_CFG
      .map((cfg) => ({ status: cfg.label, key: cfg.key, count: counts[cfg.key] ?? 0 }))
      .filter((d) => d.count > 0),
    [counts]
  )

  const balkenData = useMemo(() => {
    const map = new Map<string, { name: string; freigegeben: number; ausstehend: number; abgelehnt: number; ueberarbeitung: number }>()
    for (const e of eintraege) {
      const projekt = e.raeume?.projekte
      if (!projekt) continue
      if (!map.has(projekt.id)) {
        const kurz = projekt.name.length > 14 ? projekt.name.slice(0, 14) + '…' : projekt.name
        map.set(projekt.id, { name: kurz, freigegeben: 0, ausstehend: 0, abgelehnt: 0, ueberarbeitung: 0 })
      }
      const s = e.produktstatus?.status ?? 'ausstehend'
      const entry = map.get(projekt.id)!
      if (s === 'freigegeben' || s === 'ausstehend' || s === 'abgelehnt' || s === 'ueberarbeitung') entry[s]++
    }
    return Array.from(map.values())
  }, [eintraege])

  const gesamt = eintraege.length

  if (gesamt === 0) return null

  const switcher: { key: ChartView; label: string; Icon: React.ElementType }[] = [
    { key: 'donut',  label: 'Donut',  Icon: PieIcon   },
    { key: 'balken', label: 'Balken', Icon: BarChart2  },
    { key: 'liste',  label: 'Liste',  Icon: List       },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
      {/* Switcher */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400 font-medium">{gesamt} Produkte gesamt</p>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          {switcher.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                view === key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Views */}
      <div style={{ minHeight: 180 }}>

        {/* Donut-View */}
        {view === 'donut' && (
          <div className="flex items-center gap-8">
            <div className="shrink-0" style={{ width: 200, height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData} cx="50%" cy="50%"
                    innerRadius={58} outerRadius={82}
                    dataKey="count" paddingAngle={2}
                    startAngle={90} endAngle={-270}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_FARBEN[entry.key] ?? '#9CA3AF'} stroke="none" />
                    ))}
                    <Label position="center" content={<DonutMitte gesamt={gesamt} />} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-10 gap-y-3.5">
              {LISTE_CFG.map((cfg) => {
                const count = counts[cfg.key] ?? 0
                return (
                  <div key={cfg.key} className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cfg.farbe }} />
                    <span className="text-sm text-gray-600">{cfg.label}</span>
                    <span className="text-sm font-bold text-gray-900 ml-auto">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Balken-View */}
        {view === 'balken' && (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={balkenData} barCategoryGap="30%" margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={(props) => (
                <BalkenTooltip
                  active={props.active}
                  payload={props.payload as unknown as BarPayloadItem[] | undefined}
                  label={String(props.label ?? '')}
                />
              )} cursor={{ fill: '#F9FAFB' }} />
              <Bar dataKey="freigegeben"    name="Freigegeben"   stackId="a" fill="#10B981" radius={[0,0,0,0]} />
              <Bar dataKey="ausstehend"     name="Ausstehend"    stackId="a" fill="#F59E0B" radius={[0,0,0,0]} />
              <Bar dataKey="abgelehnt"      name="Abgelehnt"     stackId="a" fill="#EF4444" radius={[0,0,0,0]} />
              <Bar dataKey="ueberarbeitung" name="Überarbeitung" stackId="a" fill="#6366F1" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Liste-View */}
        {view === 'liste' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
            {LISTE_CFG.map((cfg) => {
              const count = counts[cfg.key] ?? 0
              const Icon = cfg.icon
              return (
                <div key={cfg.key} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${cfg.bg} border-transparent`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/60`}>
                    <Icon className={`w-4.5 h-4.5 ${cfg.text}`} style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <p className={`text-xl font-bold leading-none ${cfg.text}`}>{count}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{cfg.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}

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
            <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-indigo-400">{kuerzel}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">{eintrag.name}</h3>
            {projekt && (
              <p className="text-xs text-gray-500 mt-0.5">
                <Link href={`/dashboard/projekte/${projekt.id}`}
                  className="hover:text-indigo-600 transition-colors" onClick={onClose}>
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
                className="text-sm text-gray-700 hover:text-indigo-600 transition-colors" onClick={onClose}>
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
      })
    }

    const gruppe = map.get(id)!
    gruppe.eintraege.push(e)
    const status = e.produktstatus?.status ?? 'ausstehend'
    if (isOffen(status)) gruppe.offenCount++
  }

  return Array.from(map.values()).sort((a, b) => b.offenCount - a.offenCount)
}

// ── Komponente ────────────────────────────────────────────────
export default function FreigabenTabelle({ eintraege }: { eintraege: FreigabeEintrag[] }) {
  const [tab, setTab]                   = useState<Tab>('offen')
  const [selectedEintrag, setSelected]  = useState<FreigabeEintrag | null>(null)
  const [isPending, startTransition]    = useTransition()
  const router                          = useRouter()

  const offenCount = eintraege.filter((e) => isOffen(e.produktstatus?.status ?? 'ausstehend')).length

  const gefiltert = eintraege.filter((e) => {
    const status = e.produktstatus?.status ?? 'ausstehend'
    return matchTab(status, tab)
  })

  const gruppen = gruppiereNachProjekt(gefiltert)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'offen',       label: 'Offen' },
    { key: 'freigegeben', label: 'Freigegeben' },
    { key: 'abgelehnt',   label: 'Abgelehnt' },
    { key: 'alle',        label: 'Alle' },
  ]

  function handleReset(produktId: string) {
    startTransition(async () => {
      await freigabeZuruecksetzenAdmin(produktId)
      setSelected(null)
      router.refresh()
    })
  }

  return (
    <div>
      {/* Freigabe-Chart */}
      <FreigabeChart eintraege={eintraege} />

      {/* Tabs */}
      <div className="flex items-center gap-0 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}>
            {t.label}
            {t.key === 'offen' && offenCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {offenCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Leerer Zustand */}
      {gruppen.length === 0 && (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
          {tab === 'offen' ? (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-base font-semibold text-gray-800 mb-1">Alle Freigaben erledigt!</p>
              <p className="text-sm text-gray-400">Keine offenen Freigabeanfragen.</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Keine Einträge in dieser Kategorie.</p>
          )}
        </div>
      )}

      {/* Projekt-Gruppen */}
      <div className="space-y-5">
        {gruppen.map((gruppe) => (
          <div key={gruppe.projektId} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Gruppen-Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{gruppe.projektName}</h3>
                  {gruppe.offenCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                      {gruppe.offenCount}
                    </span>
                  )}
                </div>
                {gruppe.kundeName && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {gruppe.kundeId
                      ? <Link href={`/dashboard/kunden/${gruppe.kundeId}`} className="hover:text-indigo-600 transition-colors">{gruppe.kundeName}</Link>
                      : gruppe.kundeName}
                  </p>
                )}
              </div>
              <Link href={`/dashboard/projekte/${gruppe.projektId}`}
                className="text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors whitespace-nowrap">
                Zum Projekt →
              </Link>
            </div>

            {/* Produkt-Liste */}
            <ul className="divide-y divide-gray-100">
              {gruppe.eintraege.map((e) => {
                const status    = e.produktstatus?.status ?? 'ausstehend'
                const kommentar = e.produktstatus?.kommentar
                const kuerzel   = e.name.slice(0, 2).toUpperCase()
                return (
                  <li key={e.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelected(e)}>
                    {/* Thumbnail */}
                    {e.bild_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.bild_url} alt={e.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 shrink-0 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-indigo-400">{kuerzel}</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{e.name}</p>
                        <span className="text-xs text-gray-400">{e.raeume?.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {statusLabel[status] ?? status}
                        </span>
                      </div>
                      {kommentar && (
                        <p className="text-xs text-amber-600 mt-0.5 truncate max-w-lg" title={kommentar}>
                          {kommentar}
                        </p>
                      )}
                    </div>

                    {/* Datum */}
                    <span className="text-xs text-gray-400 shrink-0">{formatDatum(e.created_at)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

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
  )
}
