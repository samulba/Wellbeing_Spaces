'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import type { Zeiterfassung } from '@/lib/supabase/types'
import { zeitEintragen, zeitLoeschen } from '@/app/actions/zeiterfassung'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

interface Props {
  projektId: string
  stundensatz: number
  initialEintraege: Zeiterfassung[]
}

export default function ZeiterfassungBlock({ projektId, stundensatz, initialEintraege }: Props) {
  const [eintraege, setEintraege] = useState(initialEintraege)
  const [formOffen, setFormOffen] = useState(false)
  const [stunden, setStunden] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [abrechenbar, setAbrechenbar] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const abrechenbarStunden = eintraege.filter((e) => e.abrechenbar).reduce((s, e) => s + Number(e.stunden), 0)
  const gesamtStunden      = eintraege.reduce((s, e) => s + Number(e.stunden), 0)
  const serviceKosten      = abrechenbarStunden * stundensatz

  function handleEintragen() {
    const std = parseFloat(stunden)
    if (!std || std <= 0) { setFehler('Bitte eine gültige Stundenanzahl eingeben.'); return }
    setFehler(null)

    startTransition(async () => {
      const res = await zeitEintragen(projektId, std, beschreibung || null, datum, abrechenbar)
      if (res.fehler) { setFehler(res.fehler); return }

      const neuerEintrag: Zeiterfassung = {
        id:              crypto.randomUUID(),
        organisation_id: '',
        projekt_id:      projektId,
        user_id:         null,
        datum,
        stunden:         std,
        beschreibung:    beschreibung || null,
        abrechenbar,
        created_at:      new Date().toISOString(),
      }
      setEintraege((prev) => [neuerEintrag, ...prev])
      setStunden('')
      setBeschreibung('')
      setFormOffen(false)
    })
  }

  function handleLoeschen(id: string) {
    startTransition(async () => {
      const res = await zeitLoeschen(id, projektId)
      if (!res.fehler) setEintraege((prev) => prev.filter((e) => e.id !== id))
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zeiterfassung</p>
        </div>
        <button
          type="button"
          onClick={() => { setFormOffen((v) => !v); setFehler(null) }}
          className="inline-flex items-center gap-1 text-xs text-wellbeing-green hover:text-wellbeing-green-dark font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Zeit erfassen
        </button>
      </div>

      {/* Inline-Formular */}
      {formOffen && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 space-y-3">
          {fehler && (
            <p className="text-xs text-red-500">{fehler}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-medium">Datum</label>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-medium">Stunden</label>
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={stunden}
                onChange={(e) => setStunden(e.target.value)}
                className={`${inp} font-mono`}
                placeholder="1,5"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 font-medium">Beschreibung</label>
            <input
              type="text"
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              className={inp}
              placeholder="Konzept, Beratung, Planung…"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={abrechenbar}
                onChange={(e) => setAbrechenbar(e.target.checked)}
                className="w-3.5 h-3.5 accent-wellbeing-green"
              />
              Abrechenbar
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setFormOffen(false); setFehler(null) }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleEintragen}
                className="px-3 py-1.5 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors"
              >
                Eintragen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summenzeile */}
      {eintraege.length > 0 && (
        <div className="px-4 py-2.5 bg-wellbeing-cream/30 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">
              {abrechenbarStunden.toFixed(2).replace('.', ',')} h abrechenbar
              {gesamtStunden !== abrechenbarStunden && (
                <> · {gesamtStunden.toFixed(2).replace('.', ',')} h gesamt</>
              )}
            </span>
            <span className="text-sm font-mono font-semibold text-wellbeing-green">
              {eur(serviceKosten)}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {abrechenbarStunden.toFixed(2).replace('.', ',')} h × {eur(stundensatz)}/h
          </p>
        </div>
      )}

      {/* Eintrags-Liste */}
      {eintraege.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs text-gray-400">Noch keine Stunden erfasst.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {eintraege.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60 group transition-colors"
            >
              <div className="shrink-0 w-12 text-right">
                <p className="text-xs font-mono font-semibold text-gray-800">
                  {Number(e.stunden).toFixed(2).replace('.', ',')}h
                </p>
                <p className="text-[10px] text-gray-400">
                  {new Date(e.datum + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                {e.beschreibung ? (
                  <p className="text-xs text-gray-700 truncate">{e.beschreibung}</p>
                ) : (
                  <p className="text-xs text-gray-300 italic">–</p>
                )}
                {!e.abrechenbar && (
                  <span className="text-[10px] text-gray-400">nicht abrechenbar</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleLoeschen(e.id)}
                title="Eintrag löschen"
                className="shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inp = 'w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition'
