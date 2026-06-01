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
 * Inhalt ist zentriert + breitenbegrenzt, damit es auf großen Screens
 * ausgewogen statt „gezerrt" wirkt.
 */
export default function PartnerAuswertungChart({
  umsatz, einkauf, marge, provision, ertrag,
  aktiveBestellungen, offeneLieferungen, produkteAnzahl,
}: Props) {
  const [view, setView] = useState<View>('vergleich')

  const C = {
    umsatz: '#34d399',    // emerald-400
    einkauf: '#94a3b8',   // slate-400
    marge: '#60a5fa',     // blue-400
    provision: '#a78bfa', // violet-400
    ertrag: '#445c49',    // wellbeing-green
  }
  const metriken = [
    { label: 'Umsatz',    wert: umsatz,    color: C.umsatz },
    { label: 'Einkauf',   wert: einkauf,   color: C.einkauf },
    { label: 'Marge',     wert: marge,     color: C.marge },
    { label: 'Provision', wert: provision, color: C.provision },
    { label: 'Ertrag',    wert: ertrag,    color: C.ertrag },
  ]
  const max = Math.max(1, ...metriken.map((m) => Math.max(0, m.wert)))

  // Verteilung — Ertrag = Marge + Provision (Donut)
  const ertragBasis = Math.max(0, marge) + Math.max(0, provision)
  const margeAnteil = ertragBasis > 0 ? (Math.max(0, marge) / ertragBasis) * 100 : 0
  const provAnteil  = Math.max(0, 100 - margeAnteil)
  const donut = ertragBasis > 0
    ? `conic-gradient(${C.marge} 0% ${margeAnteil}%, ${C.provision} ${margeAnteil}% 100%)`
    : 'conic-gradient(#e5e7eb 0% 100%)'
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
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6 mb-6">
      {/* Header: Titel + Ertrag-Highlight + Umschalter */}
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
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

      {/* Körper — zentriert + begrenzt für ausgewogene Optik auf breiten Screens */}
      <div className="max-w-2xl mx-auto">
        {view === 'vergleich' ? (
          <div className="space-y-3.5">
            {metriken.map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-gray-500">{m.label}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(Math.max(0, m.wert) / max) * 100}%`, backgroundColor: m.color }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm font-semibold text-gray-700 tabular-nums">{eur0(m.wert)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 py-1">
            {/* Donut */}
            <div className="relative w-40 h-40 shrink-0">
              <div className="w-full h-full rounded-full" style={{ background: donut }} />
              <div className="absolute inset-[27%] bg-white rounded-full flex flex-col items-center justify-center">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest">Ertrag</span>
                <span className="text-base font-bold text-gray-900 tabular-nums leading-tight">{eur0(ertrag)}</span>
              </div>
            </div>

            {/* Aufschlüsselung */}
            <div className="w-full max-w-xs space-y-4">
              {[
                { label: 'Marge',     wert: marge,     pct: margeAnteil, color: C.marge },
                { label: 'Provision', wert: provision, pct: provAnteil,  color: C.provision },
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="text-sm text-gray-600">{r.label}</span>
                    <span className="ml-auto text-sm font-semibold text-gray-800 tabular-nums">{eur0(r.wert)}</span>
                    <span className="text-xs text-gray-400 w-9 text-right tabular-nums">{Math.round(r.pct)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Umsatz <span className="font-semibold text-gray-700 tabular-nums">{eur0(umsatz)}</span></span>
                <span>Einkauf <span className="font-semibold text-gray-700 tabular-nums">{eur0(einkauf)}</span></span>
                <span>Marge-Quote <span className="font-semibold text-gray-700 tabular-nums">{margeQuote}%</span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Operativer Footer — dezent */}
      <div className="mt-6 pt-3.5 border-t border-gray-100 flex items-center justify-center gap-x-6 gap-y-1.5 flex-wrap text-xs text-gray-500">
        <span><span className="font-semibold text-gray-700 tabular-nums">{aktiveBestellungen}</span> aktive Bestellungen</span>
        <span className="text-gray-200">·</span>
        <span><span className="font-semibold text-gray-700 tabular-nums">{offeneLieferungen}</span> offene Lieferungen</span>
        <span className="text-gray-200">·</span>
        <span><span className="font-semibold text-gray-700 tabular-nums">{produkteAnzahl}</span> Produkte im Sortiment</span>
      </div>
    </div>
  )
}
