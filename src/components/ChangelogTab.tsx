'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Sparkles, Search, Calendar, Zap, Wrench, Palette, ShieldCheck,
  Package, Wand2, Rocket, TrendingUp, X, ChevronDown, ChevronRight,
} from 'lucide-react'
import type { ChangelogEntry, ChangelogPunkt } from '@/lib/changelog'

const SEEN_KEY = 'changelog-last-seen'
const DEFAULT_EXPANDED = 2 // Die letzten N Einträge sind default offen

type Kategorie =
  | 'alle' | 'fix' | 'design' | 'feature' | 'security' | 'timeline' | 'partner' | 'kunde' | 'editor'

type SektionStil = {
  Icon:     React.ComponentType<{ className?: string }>
  iconBg:   string
  iconFg:   string
  tonBg:    string
  kategorie: Kategorie
  chipBg:   string
  chipFg:   string
}

const DEFAULT_STIL: SektionStil = {
  Icon: Sparkles, iconBg: 'bg-wellbeing-green/10', iconFg: 'text-wellbeing-green', tonBg: 'bg-wellbeing-green/40',
  kategorie: 'feature', chipBg: 'bg-wellbeing-green/10', chipFg: 'text-wellbeing-green-dark',
}

/** Rät einen passenden Icon + Farb-Stil + Kategorie aus dem Sektions-Titel. */
function sektionStil(titel: string | null): SektionStil {
  if (!titel) return DEFAULT_STIL
  const t = titel.toLowerCase()

  if (t.includes('bug') || t.includes('fix') || t.includes('fehler')) {
    return { Icon: Wrench, iconBg: 'bg-red-50', iconFg: 'text-red-600', tonBg: 'bg-red-400', kategorie: 'fix', chipBg: 'bg-red-50', chipFg: 'text-red-700' }
  }
  if (t.includes('design') || t.includes('ui') || t.includes('layout') || t.includes('chrome') || t.includes('styling')) {
    return { Icon: Palette, iconBg: 'bg-purple-50', iconFg: 'text-purple-600', tonBg: 'bg-purple-400', kategorie: 'design', chipBg: 'bg-purple-50', chipFg: 'text-purple-700' }
  }
  if (t.includes('security') || t.includes('sicherheit') || t.includes('auth')) {
    return { Icon: ShieldCheck, iconBg: 'bg-blue-50', iconFg: 'text-blue-600', tonBg: 'bg-blue-400', kategorie: 'security', chipBg: 'bg-blue-50', chipFg: 'text-blue-700' }
  }
  if (t.includes('timeline') || t.includes('gantt') || t.includes('kanban')) {
    return { Icon: Calendar, iconBg: 'bg-indigo-50', iconFg: 'text-indigo-600', tonBg: 'bg-indigo-400', kategorie: 'timeline', chipBg: 'bg-indigo-50', chipFg: 'text-indigo-700' }
  }
  if (t.includes('performance') || t.includes('geschwindigkeit')) {
    return { Icon: Zap, iconBg: 'bg-amber-50', iconFg: 'text-amber-600', tonBg: 'bg-amber-400', kategorie: 'feature', chipBg: 'bg-amber-50', chipFg: 'text-amber-700' }
  }
  if (t.includes('partner') || t.includes('vertrag') || t.includes('angebot') || t.includes('produkt')) {
    return { Icon: Package, iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600', tonBg: 'bg-emerald-400', kategorie: 'partner', chipBg: 'bg-emerald-50', chipFg: 'text-emerald-700' }
  }
  if (t.includes('kunde') || t.includes('portal')) {
    return { Icon: TrendingUp, iconBg: 'bg-sky-50', iconFg: 'text-sky-600', tonBg: 'bg-sky-400', kategorie: 'kunde', chipBg: 'bg-sky-50', chipFg: 'text-sky-700' }
  }
  if (t.includes('raum') || t.includes('freigabe') || t.includes('onboarding')) {
    return { Icon: Rocket, iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600', tonBg: 'bg-emerald-400', kategorie: 'feature', chipBg: 'bg-emerald-50', chipFg: 'text-emerald-700' }
  }
  if (t.includes('editor') || t.includes('vorlag')) {
    return { Icon: Wand2, iconBg: 'bg-violet-50', iconFg: 'text-violet-600', tonBg: 'bg-violet-400', kategorie: 'editor', chipBg: 'bg-violet-50', chipFg: 'text-violet-700' }
  }
  return DEFAULT_STIL
}

function formatDatum(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function relativesDatum(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const heute = new Date(); heute.setHours(0, 0, 0, 0)
  const diff = Math.round((heute.getTime() - d.getTime()) / 86_400_000)
  if (diff === 0)  return 'Heute'
  if (diff === 1)  return 'Gestern'
  if (diff < 7)    return `vor ${diff} Tagen`
  if (diff < 30)   return `vor ${Math.floor(diff / 7)} Wochen`
  if (diff < 365)  return `vor ${Math.floor(diff / 30)} Monaten`
  return `vor ${Math.floor(diff / 365)} Jahr${Math.floor(diff / 365) === 1 ? '' : 'en'}`
}

function textAusPunkt(p: ChangelogPunkt): string {
  return p.segmente.map((s) => s.text).join('')
}

function renderPunkt(p: ChangelogPunkt): React.ReactNode {
  return p.segmente.map((seg, i) =>
    seg.bold
      ? <strong key={i} className="font-semibold text-gray-800">{seg.text}</strong>
      : <span   key={i}>{seg.text}</span>,
  )
}

const KATEGORIE_FILTER: { key: Kategorie; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'alle',     label: 'Alle',      Icon: Sparkles },
  { key: 'feature',  label: 'Features',  Icon: Rocket },
  { key: 'fix',      label: 'Fixes',     Icon: Wrench },
  { key: 'design',   label: 'Design',    Icon: Palette },
  { key: 'timeline', label: 'Timeline',  Icon: Calendar },
  { key: 'partner',  label: 'Partner',   Icon: Package },
  { key: 'kunde',    label: 'Kunde',     Icon: TrendingUp },
  { key: 'editor',   label: 'Editor',    Icon: Wand2 },
  { key: 'security', label: 'Security',  Icon: ShieldCheck },
]

export default function ChangelogTab({ eintraege }: { eintraege: ChangelogEntry[] }) {
  const [query, setQuery] = useState('')
  const [kategorie, setKategorie] = useState<Kategorie>('alle')
  const [letzterBesuch, setLetzterBesuch] = useState<string | null>(null)
  const [expandiert, setExpandiert] = useState<Set<string>>(
    () => new Set(eintraege.slice(0, DEFAULT_EXPANDED).map((e) => e.datum)),
  )

  useEffect(() => {
    try {
      setLetzterBesuch(localStorage.getItem(SEEN_KEY))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (eintraege.length === 0) return
    const neuestes = eintraege[0].datum
    try {
      localStorage.setItem(SEEN_KEY, neuestes)
      window.dispatchEvent(new CustomEvent('changelog:seen'))
    } catch { /* ignore */ }
  }, [eintraege])

  function toggleDatum(datum: string) {
    setExpandiert((prev) => {
      const next = new Set(prev)
      if (next.has(datum)) next.delete(datum)
      else next.add(datum)
      return next
    })
  }

  // Filterlogik: Query + Kategorie zusammen
  const gefiltert = useMemo(() => {
    const q = query.toLowerCase()
    return eintraege
      .map((e) => ({
        ...e,
        sektionen: e.sektionen.filter((s) => {
          // Kategorie-Filter
          if (kategorie !== 'alle') {
            const stil = sektionStil(s.titel)
            if (stil.kategorie !== kategorie) return false
          }
          // Query-Filter
          if (q) {
            const titelMatch = s.titel?.toLowerCase().includes(q) ?? false
            const punkteMatch = s.punkte.some((p) => textAusPunkt(p).toLowerCase().includes(q))
            return titelMatch || punkteMatch
          }
          return true
        }),
      }))
      .filter((e) => e.sektionen.length > 0)
  }, [eintraege, query, kategorie])

  // Bei aktiver Suche/Filter: alle Treffer aufklappen
  const aktivSuche = query.length > 0 || kategorie !== 'alle'
  const effektivExpandiert = aktivSuche
    ? new Set(gefiltert.map((e) => e.datum))
    : expandiert

  // KPIs
  const heute30 = new Date(); heute30.setDate(heute30.getDate() - 30)
  const updatesLetzte30 = eintraege.filter((e) => new Date(e.datum) >= heute30).length
  const gesamtPunkte    = eintraege.reduce((sum, e) => sum + e.sektionen.reduce((s, sek) => s + sek.punkte.length, 0), 0)

  // Anzahl pro Kategorie (für Chip-Badges)
  const kategorieCount = useMemo(() => {
    const count: Record<Kategorie, number> = {
      alle: 0, fix: 0, design: 0, feature: 0, security: 0, timeline: 0, partner: 0, kunde: 0, editor: 0,
    }
    for (const e of eintraege) {
      for (const s of e.sektionen) {
        const k = sektionStil(s.titel).kategorie
        count[k] += s.punkte.length
        count.alle += s.punkte.length
      }
    }
    return count
  }, [eintraege])

  if (eintraege.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Noch keine Änderungen dokumentiert.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      {/* Hero-Band (kompakt) */}
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-wellbeing-green via-wellbeing-green to-wellbeing-green-dark text-white px-5 py-4">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-wellbeing-green-light/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">Changelog</span>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Was ist neu?</h1>
            <p className="text-xs text-white/70">
              Zuletzt aktualisiert: <strong className="text-white font-medium">{relativesDatum(eintraege[0].datum)}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs tabular-nums">
            <HeroStatKompakt label="Updates" wert={eintraege.length} />
            <HeroStatKompakt label="Letzte 30 Tage" wert={updatesLetzte30} highlight />
            <HeroStatKompakt label="Änderungen" wert={gesamtPunkte} />
          </div>
        </div>
      </div>

      {/* Sticky Filter-Bar: Suche + Kategorien (klebt unter dem Einstellungs-Page-Header) */}
      <div className="sticky top-[60px] z-10 bg-white -mx-6 px-6 py-3 mb-3 border-b border-gray-100">
        <div className="relative mb-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="In allen Änderungen suchen..."
            className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded"
              aria-label="Suche zurücksetzen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Kategorie-Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {KATEGORIE_FILTER.map((k) => {
            const aktiv = kategorie === k.key
            const count = kategorieCount[k.key]
            if (k.key !== 'alle' && count === 0) return null
            const Icon = k.Icon
            return (
              <button
                key={k.key}
                type="button"
                onClick={() => setKategorie(k.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full transition-all ${
                  aktiv
                    ? 'bg-wellbeing-green text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                <Icon className="w-3 h-3" />
                {k.label}
                <span className={`tabular-nums ${aktiv ? 'text-white/80' : 'text-gray-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {query && gefiltert.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-1">Nichts gefunden für „{query}“</p>
          <button
            onClick={() => { setQuery(''); setKategorie('alle') }}
            className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark font-medium"
          >
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" aria-hidden />

        <div className="space-y-2">
          {gefiltert.map((eintrag) => {
            const istNeu = letzterBesuch ? new Date(eintrag.datum) > new Date(letzterBesuch) : false
            const anzahlPunkte = eintrag.sektionen.reduce((s, sek) => s + sek.punkte.length, 0)
            const offen = effektivExpandiert.has(eintrag.datum)
            // Sektions-Stile für die Icon-Vorschau im collapsed State
            const sektStile = eintrag.sektionen.map((s) => sektionStil(s.titel))
            const uniqueIcons = Array.from(
              new Map(sektStile.map((s) => [s.iconFg + s.iconBg, s])).values(),
            ).slice(0, 5)

            return (
              <article key={eintrag.datum} className="relative pl-11">
                {/* Datum-Bubble */}
                <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                  istNeu
                    ? 'bg-emerald-500 border-2 border-white ring-2 ring-emerald-200'
                    : 'bg-white border-2 border-wellbeing-green'
                }`}>
                  <Calendar className={`w-3.5 h-3.5 ${istNeu ? 'text-white' : 'text-wellbeing-green'}`} />
                </div>

                {/* Collapsed Header (ist immer sichtbar, wirkt als Toggle) */}
                <button
                  type="button"
                  onClick={() => toggleDatum(eintrag.datum)}
                  aria-expanded={offen}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left bg-white border rounded-xl transition-all hover:border-wellbeing-green/40 hover:shadow-sm ${
                    offen ? 'border-wellbeing-green/30 shadow-sm' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-baseline gap-2 flex-wrap flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-gray-900 tracking-tight">
                      {formatDatum(eintrag.datum)}
                    </h2>
                    <span className="text-[11px] text-gray-400">
                      {relativesDatum(eintrag.datum)}
                    </span>
                    {istNeu && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                        <Sparkles className="w-2.5 h-2.5" /> Neu
                      </span>
                    )}
                  </div>

                  {/* Icon-Vorschau (collapsed) */}
                  {!offen && (
                    <div className="flex items-center gap-1 shrink-0">
                      {uniqueIcons.map((stil, i) => {
                        const Icon = stil.Icon
                        return (
                          <div
                            key={i}
                            className={`w-5 h-5 rounded flex items-center justify-center ${stil.iconBg} ${stil.iconFg}`}
                          >
                            <Icon className="w-3 h-3" />
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <span className="text-[11px] font-medium text-gray-500 tabular-nums shrink-0">
                    {anzahlPunkte} {anzahlPunkte === 1 ? 'Änderung' : 'Änderungen'}
                  </span>

                  {offen
                    ? <ChevronDown  className="w-4 h-4 text-gray-400 shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>

                {/* Expanded: Sektionen */}
                {offen && (
                  <div className="mt-2 space-y-2 pl-1">
                    {eintrag.sektionen.map((sek, idx) => {
                      const stil = sektionStil(sek.titel)
                      const Icon = stil.Icon
                      return (
                        <div
                          key={idx}
                          className="bg-white border border-gray-100 rounded-lg overflow-hidden"
                        >
                          {sek.titel && (
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 bg-gray-50/50">
                              <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${stil.iconBg} ${stil.iconFg}`}>
                                <Icon className="w-3 h-3" />
                              </div>
                              <h3 className="text-xs font-semibold text-gray-800 flex-1">{sek.titel}</h3>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full tabular-nums ${stil.chipBg} ${stil.chipFg}`}>
                                {sek.punkte.length}
                              </span>
                            </div>
                          )}
                          <ul className="px-3 py-2 space-y-1.5">
                            {sek.punkte.map((p, i) => (
                              <li key={i} className="flex gap-2 text-[13px] text-gray-600 leading-relaxed">
                                <span className={`w-1 h-1 rounded-full shrink-0 mt-2 ${stil.tonBg}`} />
                                <span className="flex-1">{renderPunkt(p)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>

      {/* Footer-Hinweis */}
      <div className="mt-8 mb-6 text-center">
        <p className="text-[11px] text-gray-400">
          Automatisch aus <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-500">CHANGELOG.md</code> gepflegt.
        </p>
      </div>
    </div>
  )
}

function HeroStatKompakt({ label, wert, highlight }: { label: string; wert: number; highlight?: boolean }) {
  return (
    <div className={`px-3 py-1.5 rounded-lg backdrop-blur-sm border transition-colors ${
      highlight
        ? 'bg-white/20 border-white/30'
        : 'bg-white/10 border-white/15'
    }`}>
      <p className="text-lg font-semibold leading-none tabular-nums">{wert}</p>
      <p className="text-[9px] text-white/70 uppercase tracking-wider font-medium mt-1">{label}</p>
    </div>
  )
}

