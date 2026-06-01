'use client'

import { useState } from 'react'
import { BarChart3, PieChart } from 'lucide-react'

const eur0 = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

type View = 'vergleich' | 'verteilung'

interface Props {
  umsatz: number
  einkauf: number
  marge: number
  provision: number
  ertrag: number
  aktiveBestellungen: number
  offeneLieferungen: number
  produkteAnzahl: number
}

/**
 * Schlanke, grafische Partner-Auswertung mit umschaltbarer Ansicht
 * (Vergleich / Verteilung). Rein CSS — keine Chart-Library.
 * Ersetzt das frühere KPI-Kachel-Band (alles in EINER Karte, weniger „klumpig").
 */
export default function PartnerAuswertungChart({
  umsatz, einkauf, marge, provision, ertrag,
  aktiveBestellungen, offeneLieferungen, produkteAnzahl,
}: Props) {
  const [view, setView] = useState<View>('vergleich')

  const metriken = [
    { label: 'Umsatz',    wert: umsatz,    color: '#34d399' }, // emerald-400
    { label: 'Einkauf',   wert: einkauf,   color: '#94a3b8' }, // slate-400
    { label: 'Marge',     wert: marge,     color: '#60a5fa' }, // blue-400
    { label: 'Provision', wert: provision, color: '#a78bfa' }, // violet-400
    { label: 'Ertrag',    wert: ertrag,    color: '#445c49' }, // wellbeing-green
  ]
  const max = Math.max(1, ...metriken.map((m) => Math.max(0, m.wert)))

  // Verteilung — Ertrag = Marge + Provision (Donut)
  const ertragBasis = Math.max(0, marge) + Math.max(0, provision)
  const margeAnteil = ertragBasis > 0 ? (Math.max(0, marge) / ertragBasis) * 100 : 0
  const provAnteil  = Math.max(0, 100 - margeAnteil)
  const donut = ertragBasis > 0
    ? `conic-gradient(#60a5fa 0% ${margeAnteil}%, #a78bfa ${margeAnteil}% 100%)`
    : 'conic-gradient(#e5e7eb 0% 100%)'

  // Zusammensetzung Umsatz = Einkauf + Marge
  const umsatzBasis = Math.max(1, Math.max(0, einkauf) + Math.max(0, marge))
  const ekPct    = (Math.max(0, einkauf) / umsatzBasis) * 100
  const margePct = (Math.max(0, marge) / umsatzBasis) * 100
  const margeQuote = umsatz > 0 ? Math.round((marge / umsatz) * 100) : 0

  const tab = (v: View, label: string, Icon: typeof BarChart3) => (
    <button
      type="button"
      onClick={() => setView(v)}
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors ${
        view === v ? 'bg-wellbeing-green text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-6">
      {/* Header: Titel + Ertrag-Highlight + Umschalter */}
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Auswertung · nur intern</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-semibold text-gray-900 tabular-nums">{eur0(ertrag)}</span>
            <span className="text-xs text-gray-400">Ertrag · Marge + Provision</span>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {tab('vergleich', 'Vergleich', BarChart3)}
          {tab('verteilung', 'Verteilung', PieChart)}
        </div>
      </div>

      {view === 'vergleich' ? (
        <div className="space-y-3">
          {metriken.map((m) => (
            <div key={m.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-gray-500">{m.label}</span>
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(Math.max(0, m.wert) / max) * 100}%`, backgroundColor: m.color }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-sm font-semibold text-gray-700 tabular-nums">{eur0(m.wert)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 items-center">
          {/* Donut: Ertrag = Marge + Provision */}
          <div className="flex items-center gap-5">
            <div className="relative w-28 h-28 shrink-0">
              <div className="w-full h-full rounded-full" style={{ background: donut }} />
              <div className="absolute inset-[24%] bg-white rounded-full flex flex-col items-center justify-center">
                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Ertrag</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums leading-tight">{eur0(ertrag)}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 shrink-0" />
                <span className="text-gray-600">Marge</span>
                <span className="ml-auto font-semibold text-gray-800 tabular-nums">{eur0(marge)}</span>
                <span className="text-[11px] text-gray-400 w-9 text-right">{Math.round(margeAnteil)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-violet-400 shrink-0" />
                <span className="text-gray-600">Provision</span>
                <span className="ml-auto font-semibold text-gray-800 tabular-nums">{eur0(provision)}</span>
                <span className="text-[11px] text-gray-400 w-9 text-right">{Math.round(provAnteil)}%</span>
              </div>
            </div>
          </div>

          {/* Zusammensetzung Umsatz = Einkauf + Marge */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs text-gray-500">Umsatz = Einkauf + Marge</p>
              <p className="text-[11px] text-gray-400">Marge-Quote <span className="font-semibold text-gray-600">{margeQuote}%</span></p>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden flex bg-gray-100">
              {ekPct > 0 && <div className="h-full bg-slate-400" style={{ width: `${ekPct}%` }} />}
              {margePct > 0 && <div className="h-full bg-blue-400" style={{ width: `${margePct}%` }} />}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-400" />Einkauf {eur0(einkauf)}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400" />Marge {eur0(marge)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Operativer Footer — dezent */}
      <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center gap-x-6 gap-y-1.5 flex-wrap text-xs text-gray-500">
        <span><span className="font-semibold text-gray-700 tabular-nums">{aktiveBestellungen}</span> aktive Bestellungen</span>
        <span className="text-gray-200">·</span>
        <span><span className="font-semibold text-gray-700 tabular-nums">{offeneLieferungen}</span> offene Lieferungen</span>
        <span className="text-gray-200">·</span>
        <span><span className="font-semibold text-gray-700 tabular-nums">{produkteAnzahl}</span> Produkte im Sortiment</span>
      </div>
    </div>
  )
}
