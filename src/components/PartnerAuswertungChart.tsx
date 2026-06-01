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
 * Grafische Partner-Auswertung mit umschaltbarer Ansicht.
 *  - Vergleich: Säulen-Diagramm (füllt die Breite).
 *  - Verteilung: Donut (Ertrag = Marge + Provision) + Umsatz-Zusammensetzung.
 * Rein CSS, keine Chart-Library.
 */
export default function PartnerAuswertungChart({
  umsatz, einkauf, marge, provision, ertrag,
  aktiveBestellungen, offeneLieferungen, produkteAnzahl,
}: Props) {
  const [view, setView] = useState<View>('vergleich')

  const C = {
    umsatz: '#34d399', einkauf: '#94a3b8', marge: '#60a5fa', provision: '#a78bfa', ertrag: '#445c49',
  }
  const metriken = [
    { label: 'Umsatz',    wert: umsatz,    color: C.umsatz },
    { label: 'Einkauf',   wert: einkauf,   color: C.einkauf },
    { label: 'Marge',     wert: marge,     color: C.marge },
    { label: 'Provision', wert: provision, color: C.provision },
    { label: 'Ertrag',    wert: ertrag,    color: C.ertrag },
  ]
  const max = Math.max(1, ...metriken.map((m) => Math.max(0, m.wert)))

  // Donut — Ertrag = Marge + Provision
  const ertragBasis = Math.max(0, marge) + Math.max(0, provision)
  const margeAnteil = ertragBasis > 0 ? (Math.max(0, marge) / ertragBasis) * 100 : 0
  const provAnteil  = Math.max(0, 100 - margeAnteil)
  const donut = ertragBasis > 0
    ? `conic-gradient(${C.marge} 0% ${margeAnteil}%, ${C.provision} ${margeAnteil}% 100%)`
    : 'conic-gradient(#e5e7eb 0% 100%)'

  // Umsatz-Zusammensetzung = Einkauf + Marge
  const ekShare    = umsatz > 0 ? (Math.max(0, einkauf) / umsatz) * 100 : 0
  const margeShare = umsatz > 0 ? (Math.max(0, marge) / umsatz) * 100 : 0
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
      {/* Header */}
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

      {view === 'vergleich' ? (
        /* ── Säulen-Diagramm ── */
        <div>
          <div className="flex items-end gap-3 sm:gap-6 h-48">
            {metriken.map((m) => (
              <div key={m.label} className="flex-1 h-full flex flex-col justify-end items-center">
                <span className="text-[11px] sm:text-xs font-semibold text-gray-700 tabular-nums whitespace-nowrap">{eur0(m.wert)}</span>
                <div
                  className="w-full max-w-[44px] mt-1 rounded-t-md transition-all duration-700"
                  style={{ height: `${Math.max(1, (Math.max(0, m.wert) / max) * 82)}%`, backgroundColor: m.color }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 sm:gap-6 mt-2.5">
            {metriken.map((m) => (
              <span key={m.label} className="flex-1 text-center text-[11px] text-gray-500">{m.label}</span>
            ))}
          </div>
        </div>
      ) : (
        /* ── Donut + Umsatz-Zusammensetzung ── */
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-14">
          {/* Donut + Legende */}
          <div className="flex items-center gap-5 shrink-0">
            <div className="relative w-36 h-36">
              <div className="w-full h-full rounded-full" style={{ background: donut }} />
              <div className="absolute inset-[26%] bg-white rounded-full flex flex-col items-center justify-center">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest">Ertrag</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums leading-tight">{eur0(ertrag)}</span>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: C.marge }} />
                <span className="text-gray-600">Marge</span>
                <span className="ml-auto font-semibold text-gray-800 tabular-nums">{eur0(marge)}</span>
                <span className="text-xs text-gray-400 w-9 text-right tabular-nums">{Math.round(margeAnteil)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: C.provision }} />
                <span className="text-gray-600">Provision</span>
                <span className="ml-auto font-semibold text-gray-800 tabular-nums">{eur0(provision)}</span>
                <span className="text-xs text-gray-400 w-9 text-right tabular-nums">{Math.round(provAnteil)}%</span>
              </div>
            </div>
          </div>

          {/* Umsatz-Zusammensetzung — füllt die restliche Breite */}
          <div className="w-full flex-1">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-gray-500">Umsatz = Einkauf + Marge</p>
              <p className="text-xs text-gray-400">Marge-Quote <span className="font-semibold text-gray-600 tabular-nums">{margeQuote}%</span></p>
            </div>
            <div className="h-7 rounded-lg overflow-hidden flex bg-gray-100">
              {ekShare > 0 && (
                <div className="h-full flex items-center justify-center text-[10px] text-white whitespace-nowrap px-1" style={{ width: `${ekShare}%`, backgroundColor: C.einkauf }}>
                  {ekShare > 14 ? eur0(einkauf) : ''}
                </div>
              )}
              {margeShare > 0 && (
                <div className="h-full flex items-center justify-center text-[10px] text-white font-medium whitespace-nowrap px-1" style={{ width: `${margeShare}%`, backgroundColor: C.marge }}>
                  {margeShare > 14 ? `Marge ${eur0(marge)}` : ''}
                </div>
              )}
            </div>
            <div className="flex items-center gap-5 mt-2 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: C.einkauf }} />Einkauf {eur0(einkauf)}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: C.marge }} />Marge {eur0(marge)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Operativer Footer */}
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
