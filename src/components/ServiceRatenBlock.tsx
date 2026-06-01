'use client'

import { useState, useTransition } from 'react'
import { Plus, Check, Trash2, CalendarDays, FileText } from 'lucide-react'
import {
  serviceRateAnlegen,
  serviceRateAlsBezahltMarkieren,
  serviceRateLoeschen,
} from '@/app/actions/service-raten'
import { parseGeldwert, formatEuro } from '@/lib/geld'
import type { ServiceRate, ServiceRateStatus } from '@/lib/supabase/types'

interface Props {
  projektId:        string
  initial:          ServiceRate[]
  servicePauschale: number | null
}

const STATUS_LABEL: Record<ServiceRateStatus, { label: string; cls: string }> = {
  offen:      { label: 'Offen',          cls: 'bg-gray-100 text-gray-600' },
  gestellt:   { label: 'Rechnung gestellt', cls: 'bg-amber-50 text-amber-700' },
  bezahlt:    { label: 'Bezahlt',        cls: 'bg-emerald-50 text-emerald-700' },
  storniert:  { label: 'Storniert',      cls: 'bg-gray-100 text-gray-400 line-through' },
}

function fmtDatum(d: string | null): string {
  if (!d) return '–'
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ServiceRatenBlock({ projektId, initial, servicePauschale }: Props) {
  const [raten, setRaten]         = useState<ServiceRate[]>(initial)
  const [formOffen, setFormOffen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fehler, setFehler]       = useState<string | null>(null)

  const [betragInput, setBetragInput] = useState('')
  const [faelligAm, setFaelligAm]   = useState('')
  const [notiz, setNotiz]           = useState('')

  // Aggregate
  const aktiv          = raten.filter((r) => r.status !== 'storniert')
  const summeGeplant   = aktiv.reduce((s, r) => s + r.betrag, 0)
  const summeBezahlt   = aktiv.filter((r) => r.status === 'bezahlt').reduce((s, r) => s + r.betrag, 0)
  const anzahlBezahlt  = aktiv.filter((r) => r.status === 'bezahlt').length
  const fortschrittPct = summeGeplant > 0 ? Math.round((summeBezahlt / summeGeplant) * 100) : 0
  const pauschale      = servicePauschale ?? 0
  const offenZuPauschale = pauschale - summeGeplant

  function reset() {
    setBetragInput(''); setFaelligAm(''); setNotiz(''); setFehler(null); setFormOffen(false)
  }

  function anlegen() {
    setFehler(null)
    const betrag = parseGeldwert(betragInput)
    if (betrag == null || betrag <= 0) { setFehler('Bitte einen gültigen Betrag eingeben.'); return }
    startTransition(async () => {
      const res = await serviceRateAnlegen(projektId, {
        betrag, faellig_am: faelligAm || null, notiz,
      })
      if (!res.erfolg || !res.rate) { setFehler(res.fehler ?? 'Fehler beim Speichern.'); return }
      setRaten((prev) => [...prev, res.rate!])
      reset()
    })
  }

  function alsBezahlt(id: string) {
    const vorher = raten
    setRaten((prev) => prev.map((r) => r.id === id ? { ...r, status: 'bezahlt', bezahlt_am: new Date().toISOString().slice(0, 10) } : r))
    startTransition(async () => {
      const res = await serviceRateAlsBezahltMarkieren(id, projektId)
      if (!res.erfolg) { setRaten(vorher); setFehler(res.fehler ?? 'Status-Update fehlgeschlagen.') }
    })
  }

  function loeschen(id: string) {
    const vorher = raten
    setRaten((prev) => prev.filter((r) => r.id !== id))
    startTransition(async () => {
      const res = await serviceRateLoeschen(id, projektId)
      if (!res.erfolg) { setRaten(vorher); setFehler(res.fehler ?? 'Konnte nicht gelöscht werden.') }
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Service-Raten</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Zahlungsplan für die Servicepauschale — separat von Produktbudget.
            </p>
          </div>
          {!formOffen && (
            <button
              type="button"
              onClick={() => setFormOffen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 hover:bg-wellbeing-green/5 rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" /> Rate hinzufuegen
            </button>
          )}
        </div>

        {/* Fortschritt */}
        {aktiv.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                {anzahlBezahlt} von {aktiv.length} Raten bezahlt
              </span>
              <span className="font-mono text-gray-700">
                {formatEuro(summeBezahlt, { dezimalen: 0 })} / {formatEuro(summeGeplant, { dezimalen: 0 })}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-wellbeing-green rounded-full transition-all"
                style={{ width: `${Math.min(fortschrittPct, 100)}%` }}
              />
            </div>
            {pauschale > 0 && Math.abs(offenZuPauschale) > 0.01 && (
              <p className={`text-[11px] ${offenZuPauschale > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {offenZuPauschale > 0
                  ? `${formatEuro(offenZuPauschale, { dezimalen: 0 })} noch nicht in Raten verteilt`
                  : `${formatEuro(-offenZuPauschale, { dezimalen: 0 })} ueber Pauschale`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Formular */}
      {formOffen && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                placeholder="Betrag (z. B. 300)"
                value={betragInput}
                onChange={(e) => setBetragInput(e.target.value)}
                className="w-full px-3 py-2 pr-8 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
            </div>
            <input
              type="date"
              placeholder="Faellig am"
              value={faelligAm}
              onChange={(e) => setFaelligAm(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
            />
            <input
              type="text"
              placeholder="Notiz (optional)"
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
            />
          </div>
          {fehler && <p className="text-xs text-red-600">{fehler}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={anlegen}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-lg transition-colors"
            >
              {isPending ? 'Speichern…' : 'Speichern'}
            </button>
            <button type="button" onClick={reset} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {raten.length === 0 && !formOffen ? (
        <div className="px-4 py-6 text-center text-xs text-gray-400">
          Noch keine Raten angelegt. Tipp: bei 900&nbsp;€ Pauschale z.B. 3 Raten à 300&nbsp;€.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {raten.map((r) => (
            <li key={r.id} className={`px-4 py-3 flex items-center gap-3 group ${r.status === 'storniert' ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-mono font-semibold text-gray-900 tabular-nums">
                    {formatEuro(r.betrag, { dezimalen: 2 })}
                  </p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_LABEL[r.status].cls}`}>
                    {STATUS_LABEL[r.status].label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Fällig: {fmtDatum(r.faellig_am)}
                  </span>
                  {r.rechnungsdatum && (
                    <span className="inline-flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Rechnung: {fmtDatum(r.rechnungsdatum)}
                    </span>
                  )}
                  {r.bezahlt_am && (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <Check className="w-3 h-3" /> Bezahlt: {fmtDatum(r.bezahlt_am)}
                    </span>
                  )}
                  {r.notiz && <span className="truncate">· {r.notiz}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {r.status !== 'bezahlt' && r.status !== 'storniert' && (
                  <button
                    type="button"
                    onClick={() => alsBezahlt(r.id)}
                    title="Diese Rate als bezahlt markieren"
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-md transition-colors whitespace-nowrap"
                  >
                    <Check className="w-3 h-3" /> Als bezahlt markieren
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => loeschen(r.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
                  aria-label="Rate loeschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
