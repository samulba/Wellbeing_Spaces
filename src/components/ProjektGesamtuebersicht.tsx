'use client'

import { useState } from 'react'
import { ChevronDown, Package, Truck, Layers, Wallet } from 'lucide-react'
import { formatEuro } from '@/lib/geld'
import type { ProjektKalkulation } from '@/lib/projekt-kalkulation'

interface Props {
  kalk:              ProjektKalkulation
  /** Netto-Wert der Servicepauschale, fuer reine Anzeige. */
  serviceKostenNetto: number | null
  /** Produkt-Budget (netto) — Vergleichswert fuer Auslastung. */
  produktBudget:     number | null
}

export default function ProjektGesamtuebersicht({ kalk, serviceKostenNetto, produktBudget }: Props) {
  const [offen, setOffen] = useState(false)

  const mwst         = kalk.mwstSatz
  const eurB = (n: number) => formatEuro(n * (1 + mwst), { dezimalen: 0 })
  const eurN = (n: number) => formatEuro(n, { dezimalen: 0 })

  const budgetPct = produktBudget && produktBudget > 0
    ? Math.round((kalk.budgetVerbrauchtNetto / produktBudget) * 100)
    : null
  const ueberBudget = budgetPct != null && budgetPct >= 100

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Header — immer sichtbar */}
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50/80 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Projekt-Übersicht</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {kalk.produkteAnzahl} Positionen · {kalk.produkteMengeGesamt} Stk · {kalk.raeume.length} Raum{kalk.raeume.length === 1 ? '' : 'e'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p
            className="text-base font-mono font-semibold text-gray-900 tabular-nums"
            title={`Netto: ${eurN(kalk.budgetVerbrauchtNetto)}`}
          >
            {eurB(kalk.budgetVerbrauchtNetto)}
            <span className="text-[10px] text-gray-400 ml-1 font-normal">brutto</span>
          </p>
          {budgetPct != null && (
            <p className={`text-[11px] tabular-nums ${ueberBudget ? 'text-red-500' : budgetPct >= 80 ? 'text-amber-500' : 'text-gray-400'}`}>
              {budgetPct}% von {eurB(produktBudget!)}
            </p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>

      {/* Details — ausklappbar */}
      {offen && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
          {/* 4 KPI-Karten */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <KPI
              icon={<Package className="w-3.5 h-3.5" />}
              label="Produkte"
              wert={eurB(kalk.produkteSummeNetto)}
              tooltip={`Netto: ${eurN(kalk.produkteSummeNetto)}`}
            />
            <KPI
              icon={<Truck className="w-3.5 h-3.5" />}
              label="Zusatzkosten"
              wert={eurB(kalk.zusatzkostenSummeNetto)}
              tooltip={`Netto: ${eurN(kalk.zusatzkostenSummeNetto)}`}
            />
            <KPI
              icon={<Wallet className="w-3.5 h-3.5" />}
              label="Service-Pauschale"
              wert={serviceKostenNetto != null ? eurB(serviceKostenNetto) : '–'}
              tooltip={serviceKostenNetto != null ? `Netto: ${eurN(serviceKostenNetto)}` : undefined}
            />
            <KPI
              icon={<Layers className="w-3.5 h-3.5" />}
              label="Gesamt"
              wert={eurB(kalk.budgetVerbrauchtNetto + (serviceKostenNetto ?? 0))}
              tooltip={`Netto: ${eurN(kalk.budgetVerbrauchtNetto + (serviceKostenNetto ?? 0))}`}
              hervorheben
            />
          </div>

          {/* Aufteilung pro Raum */}
          {kalk.raeume.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Aufteilung pro Raum</p>
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                {kalk.raeume.map((r) => (
                  <li key={r.raumId} className="px-3 py-2 flex items-center gap-3 text-sm">
                    <span className="flex-1 min-w-0 truncate text-gray-700">{r.raumName}</span>
                    <span className="text-[11px] text-gray-400 tabular-nums shrink-0">
                      {r.produkteAnzahl} Pos · {r.produkteMengeGesamt} Stk
                    </span>
                    <span
                      className="text-sm font-mono font-semibold text-gray-900 tabular-nums shrink-0 w-28 text-right"
                      title={`Netto: ${eurN(r.raumSummeNetto)} · Produkte: ${eurN(r.produkteSummeNetto)} · Zusatz: ${eurN(r.zusatzkostenSummeNetto)}`}
                    >
                      {eurB(r.raumSummeNetto)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Wirtschaftlichkeit (nur intern) */}
          {kalk.produkteAnzahl > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Wirtschaftlichkeit · nur intern</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <WirtZelle label="Einkauf (EK)" wert={eurN(kalk.ekSummeNetto)} />
                <WirtZelle label="Marge"        wert={eurN(kalk.margeSummeNetto)} />
                <WirtZelle label="Provision"    wert={eurN(kalk.provisionSummeNetto)} />
                <WirtZelle label="Ertrag"       wert={eurN(kalk.ertragSummeNetto)} hervorheben />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Ertrag = Marge + Provision · alle Werte netto · nicht für Kunden sichtbar.</p>
            </div>
          )}

          {/* Status-Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <StatusZelle label="Ausstehend"    wert={kalk.statusCounts.ausstehend}    farbe="text-gray-500 bg-gray-50" />
            <StatusZelle label="Freigegeben"   wert={kalk.statusCounts.freigegeben}   farbe="text-emerald-600 bg-emerald-50" />
            <StatusZelle label="Abgelehnt"     wert={kalk.statusCounts.abgelehnt}     farbe="text-red-600 bg-red-50" />
            <StatusZelle label="Überarbeitung" wert={kalk.statusCounts.ueberarbeitung} farbe="text-amber-600 bg-amber-50" />
          </div>
        </div>
      )}
    </div>
  )
}

function KPI({ icon, label, wert, tooltip, hervorheben }: {
  icon:        React.ReactNode
  label:       string
  wert:        string
  tooltip?:    string
  hervorheben?: boolean
}) {
  return (
    <div className={`rounded-lg border p-2.5 ${hervorheben ? 'border-wellbeing-green/40 bg-wellbeing-green/5' : 'border-gray-100 bg-gray-50'}`} title={tooltip}>
      <p className="text-[10px] text-gray-500 inline-flex items-center gap-1">{icon}{label}</p>
      <p className={`text-sm font-mono font-semibold mt-1 tabular-nums ${hervorheben ? 'text-wellbeing-green' : 'text-gray-900'}`}>
        {wert}
      </p>
    </div>
  )
}

function StatusZelle({ label, wert, farbe }: { label: string; wert: number; farbe: string }) {
  return (
    <div className={`px-2 py-1.5 rounded-md ${farbe} flex items-center justify-between`}>
      <span>{label}</span>
      <span className="font-mono font-semibold tabular-nums">{wert}</span>
    </div>
  )
}

function WirtZelle({ label, wert, hervorheben }: { label: string; wert: string; hervorheben?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 ${hervorheben ? 'border-wellbeing-green/40 bg-wellbeing-green/5' : 'border-gray-100 bg-gray-50'}`}>
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`text-sm font-mono font-semibold mt-1 tabular-nums ${hervorheben ? 'text-wellbeing-green' : 'text-gray-900'}`}>{wert}</p>
    </div>
  )
}
