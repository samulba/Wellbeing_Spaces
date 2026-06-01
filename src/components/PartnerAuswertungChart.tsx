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
}

/**
 * Grafische Partner-Auswertung mit umschaltbarer Ansicht (Vergleich / Verteilung).
 * Rein CSS-basiert (keine Chart-Library) — Balken + Conic-Gradient-Donut.
 */
export default function PartnerAuswertungChart({ umsatz, einkauf, marge, provision, ertrag }: Props) {
  const [view, setView] = useState<View>('vergleich')

  const metriken = [
    { label: 'Umsatz',    wert: umsatz,    color: '#10b981' }, // emerald-500
    { label: 'Einkauf',   wert: einkauf,   color: '#64748b' }, // slate-500
    { label: 'Marge',     wert: marge,     color: '#3b82f6' }, // blue-500
    { label: 'Provision', wert: provision, color: '#8b5cf6' }, // violet-500
    { label: 'Ertrag',    wert: ertrag,    color: '#445c49' }, // wellbeing-green
  ]
  const max = Math.max(1, ...metriken.map((m) => Math.max(0, m.wert)))

  // Verteilung — Ertrag = Marge + Provision (Donut)
  const ertragBasis  = Math.max(0, marge) + Math.max(0, provision)
  const margeAnteil  = ertragBasis > 0 ? (Math.max(0, marge) / ertragBasis) * 100 : 0
  const provAnteil   = Math.max(0, 100 - margeAnteil)
  const donut = ertragBasis > 0
    ? `conic-gradient(#3b82f6 0% ${margeAnteil}%, #8b5cf6 ${margeAnteil}% 100%)`
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
        view === v ? 'bg-wellbeing-green text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Auswertung · grafisch</p>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {tab('vergleich', 'Vergleich', BarChart3)}
          {tab('verteilung', 'Verteilung', PieChart)}
        </div>
      </div>

      {view === 'vergleich' ? (
        <div className="space-y-2.5">
          {metriken.map((m) => (
            <div key={m.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-gray-500">{m.label}</span>
              <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-500"
                  style={{ width: `${(Math.max(0, m.wert) / max) * 100}%`, backgroundColor: m.color, minWidth: m.wert > 0 ? '0.5rem' : 0 }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-sm font-mono font-semibold text-gray-800 tabular-nums">{eur0(m.wert)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 items-center">
          {/* Donut: Ertrag = Marge + Provision */}
          <div className="flex items-center gap-5">
            <div className="relative w-32 h-32 shrink-0">
              <div className="w-full h-full rounded-full" style={{ background: donut }} />
              <div className="absolute inset-[22%] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Ertrag</span>
                <span className="text-base font-bold text-gray-900 tabular-nums leading-tight">{eur0(ertrag)}</span>
              </div>
            </div>
            <div className="space-y-2.5 text-sm min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-blue-500 shrink-0" />
                <span className="text-gray-600">Marge</span>
                <span className="ml-auto font-mono font-semibold text-gray-800 tabular-nums">{eur0(marge)}</span>
                <span className="text-[11px] text-gray-400 w-9 text-right">{Math.round(margeAnteil)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-violet-500 shrink-0" />
                <span className="text-gray-600">Provision</span>
                <span className="ml-auto font-mono font-semibold text-gray-800 tabular-nums">{eur0(provision)}</span>
                <span className="text-[11px] text-gray-400 w-9 text-right">{Math.round(provAnteil)}%</span>
              </div>
            </div>
          </div>

          {/* Zusammensetzung Umsatz = Einkauf + Marge */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs text-gray-500">Zusammensetzung Umsatz</p>
              <p className="text-[11px] text-gray-400">Marge-Quote <span className="font-semibold text-gray-600">{margeQuote}%</span></p>
            </div>
            <div className="h-7 rounded-lg overflow-hidden flex bg-gray-100">
              {ekPct > 0 && <div className="h-full bg-slate-400" style={{ width: `${ekPct}%` }} title={`Einkauf ${eur0(einkauf)}`} />}
              {margePct > 0 && <div className="h-full bg-blue-500" style={{ width: `${margePct}%` }} title={`Marge ${eur0(marge)}`} />}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-400" />Einkauf {eur0(einkauf)}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />Marge {eur0(marge)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
