'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Sparkles, Search, Calendar, Zap, Wrench, Palette, ShieldCheck,
  Package, Wand2, Rocket, TrendingUp, X,
} from 'lucide-react'
import type { ChangelogEntry, ChangelogPunkt, ChangelogSektion } from '@/lib/changelog'

const SEEN_KEY = 'changelog-last-seen'

type SektionStil = {
  Icon:    React.ComponentType<{ className?: string }>
  iconBg:  string
  iconFg:  string
  tonBg:   string
}

const DEFAULT_STIL: SektionStil = {
  Icon: Sparkles, iconBg: 'bg-wellbeing-green/10', iconFg: 'text-wellbeing-green', tonBg: 'bg-wellbeing-green/40',
}

/**
 * Rät einen passenden Icon + Farb-Stil aus dem Sektions-Titel.
 * Keywords im Titel bestimmen die Kategorisierung.
 */
function sektionStil(titel: string | null): SektionStil {
  if (!titel) return DEFAULT_STIL
  const t = titel.toLowerCase()

  if (t.includes('bug') || t.includes('fix') || t.includes('fehler')) {
    return { Icon: Wrench, iconBg: 'bg-red-50', iconFg: 'text-red-600', tonBg: 'bg-red-400' }
  }
  if (t.includes('design') || t.includes('ui') || t.includes('layout') || t.includes('chrome') || t.includes('styling')) {
    return { Icon: Palette, iconBg: 'bg-purple-50', iconFg: 'text-purple-600', tonBg: 'bg-purple-400' }
  }
  if (t.includes('security') || t.includes('sicherheit') || t.includes('auth')) {
    return { Icon: ShieldCheck, iconBg: 'bg-blue-50', iconFg: 'text-blue-600', tonBg: 'bg-blue-400' }
  }
  if (t.includes('timeline') || t.includes('gantt') || t.includes('kanban')) {
    return { Icon: Calendar, iconBg: 'bg-indigo-50', iconFg: 'text-indigo-600', tonBg: 'bg-indigo-400' }
  }
  if (t.includes('performance') || t.includes('geschwindigkeit')) {
    return { Icon: Zap, iconBg: 'bg-amber-50', iconFg: 'text-amber-600', tonBg: 'bg-amber-400' }
  }
  if (t.includes('partner') || t.includes('vertrag') || t.includes('angebot') || t.includes('produkt')) {
    return { Icon: Package, iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600', tonBg: 'bg-emerald-400' }
  }
  if (t.includes('kunde') || t.includes('portal')) {
    return { Icon: TrendingUp, iconBg: 'bg-blue-50', iconFg: 'text-blue-600', tonBg: 'bg-blue-400' }
  }
  if (t.includes('raum') || t.includes('freigabe') || t.includes('onboarding')) {
    return { Icon: Rocket, iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600', tonBg: 'bg-emerald-400' }
  }
  if (t.includes('editor') || t.includes('vorlag')) {
    return { Icon: Wand2, iconBg: 'bg-violet-50', iconFg: 'text-violet-600', tonBg: 'bg-violet-400' }
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

function sektionMatch(sektion: ChangelogSektion, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  if (sektion.titel?.toLowerCase().includes(q)) return true
  return sektion.punkte.some((p) => textAusPunkt(p).toLowerCase().includes(q))
}

export default function ChangelogTab({ eintraege }: { eintraege: ChangelogEntry[] }) {
  const [query, setQuery] = useState('')
  const [letzterBesuch, setLetzterBesuch] = useState<string | null>(null)

  useEffect(() => {
    try {
      setLetzterBesuch(localStorage.getItem(SEEN_KEY))
    } catch { /* ignore */ }
  }, [])

  // Badge in NavSidebar löschen: letzten Besuch auf neueste Datum setzen
  useEffect(() => {
    if (eintraege.length === 0) return
    const neuestes = eintraege[0].datum
    try {
      localStorage.setItem(SEEN_KEY, neuestes)
      window.dispatchEvent(new CustomEvent('changelog:seen'))
    } catch { /* ignore */ }
  }, [eintraege])

  const gefiltert = useMemo(() => {
    if (!query) return eintraege
    return eintraege
      .map((e) => ({
        ...e,
        sektionen: e.sektionen
          .map((s) => ({
            ...s,
            punkte: s.titel?.toLowerCase().includes(query.toLowerCase())
              ? s.punkte
              : s.punkte.filter((p) => textAusPunkt(p).toLowerCase().includes(query.toLowerCase())),
          }))
          .filter((s) => s.titel?.toLowerCase().includes(query.toLowerCase()) || s.punkte.length > 0),
      }))
      .filter((e) => e.sektionen.length > 0)
  }, [eintraege, query])

  // KPIs
  const heute30 = new Date(); heute30.setDate(heute30.getDate() - 30)
  const updatesLetzte30 = eintraege.filter((e) => new Date(e.datum) >= heute30).length
  const gesamtPunkte    = eintraege.reduce((sum, e) => sum + e.sektionen.reduce((s, sek) => s + sek.punkte.length, 0), 0)

  if (eintraege.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Noch keine Änderungen dokumentiert.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Hero-Band mit Stats */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-wellbeing-green via-wellbeing-green to-wellbeing-green-dark text-white p-6">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-wellbeing-green-light/20 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80">Changelog</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Was ist neu?</h1>
          <p className="text-sm text-white/75 max-w-2xl">
            Alle Updates, Features und Bugfixes chronologisch rückwärts.
            Letzte Aktualisierung: <strong className="text-white">{relativesDatum(eintraege[0].datum)}</strong>.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <HeroStat label="Gesamt-Updates" wert={eintraege.length} />
            <HeroStat label="Letzte 30 Tage" wert={updatesLetzte30} />
            <HeroStat label="Änderungen total" wert={gesamtPunkte} />
          </div>
        </div>
      </div>

      {/* Suche */}
      <div className="mb-5 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="In allen Änderungen suchen..."
          className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
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

      {query && gefiltert.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-1">Nichts gefunden für „{query}“</p>
          <button
            onClick={() => setQuery('')}
            className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark font-medium"
          >
            Suche zurücksetzen
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertikale Linie */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" aria-hidden />

        <div className="space-y-6">
          {gefiltert.map((eintrag) => {
            const istNeu = letzterBesuch ? new Date(eintrag.datum) > new Date(letzterBesuch) : false
            const anzahlPunkte = eintrag.sektionen.reduce((s, sek) => s + sek.punkte.length, 0)
            return (
              <article key={eintrag.datum} className="relative pl-11">
                {/* Datum-Bubble auf der Linie */}
                <div className="absolute left-0 top-1.5 w-8 h-8 rounded-full bg-white border-2 border-wellbeing-green flex items-center justify-center shrink-0 z-10">
                  <Calendar className="w-3.5 h-3.5 text-wellbeing-green" />
                </div>

                {/* Datum-Header */}
                <header className="mb-3 flex items-baseline gap-3 flex-wrap">
                  <h2 className="text-base font-semibold text-gray-900 tracking-tight">
                    {formatDatum(eintrag.datum)}
                  </h2>
                  <span className="text-[11px] text-gray-400">
                    {relativesDatum(eintrag.datum)} · {anzahlPunkte} Änderung{anzahlPunkte === 1 ? '' : 'en'}
                  </span>
                  {istNeu && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                      <Sparkles className="w-2.5 h-2.5" /> Neu
                    </span>
                  )}
                </header>

                {/* Sektionen */}
                <div className="space-y-3">
                  {eintrag.sektionen.filter((s) => sektionMatch(s, query)).map((sek, idx) => {
                    const stil = sektionStil(sek.titel)
                    const Icon = stil.Icon
                    return (
                      <div
                        key={idx}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow hover:border-gray-300 transition-all"
                      >
                        {sek.titel && (
                          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${stil.iconBg} ${stil.iconFg}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 flex-1">{sek.titel}</h3>
                            <span className="text-[10px] text-gray-400 tabular-nums">
                              {sek.punkte.length}
                            </span>
                          </div>
                        )}
                        <ul className="px-4 py-3 space-y-2">
                          {sek.punkte.map((p, i) => (
                            <li key={i} className="flex gap-2.5 text-sm text-gray-600 leading-relaxed">
                              <span className={`w-1 h-1 rounded-full shrink-0 mt-2 ${stil.tonBg}`} />
                              <span className="flex-1">{renderPunkt(p)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* Footer-Hinweis */}
      <div className="mt-10 mb-6 text-center">
        <p className="text-[11px] text-gray-400">
          Automatisch aus <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-500">CHANGELOG.md</code> gepflegt.
        </p>
      </div>
    </div>
  )
}

function HeroStat({ label, wert }: { label: string; wert: number }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-3 py-2.5">
      <p className="text-2xl font-semibold text-white leading-tight tabular-nums">{wert}</p>
      <p className="text-[10px] text-white/70 uppercase tracking-wider font-medium mt-0.5">{label}</p>
    </div>
  )
}
