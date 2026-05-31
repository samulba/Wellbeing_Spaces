'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import { freigabeAbsenden, type FreigabeEntscheidung } from '@/app/actions/freigaben'

interface Props {
  isOpen: boolean
  onClose: () => void
  onErfolg: () => void
  token: string
  projektName: string
  scopeBeschreibung?: string
  gesamtCount: number
  freigegebenCount: number
  abgelehntCount: number
  brandingPrim?: string
  /** Endzustand aller Produkte — wird beim Absenden in einem Rutsch committet. */
  entscheidungen: FreigabeEntscheidung[]
  /** Admin-Vorschau: blockiert das echte Absenden (es wird nichts geschrieben). */
  vorschau?: boolean
}

export default function FreigabeAbschlussModal({
  isOpen,
  onClose,
  onErfolg,
  token,
  projektName,
  scopeBeschreibung,
  gesamtCount,
  freigegebenCount,
  abgelehntCount,
  brandingPrim = '#445c49',
  entscheidungen,
  vorschau = false,
}: Props) {
  const [name, setName]           = useState('')
  const [kommentar, setKommentar] = useState('')
  const [bestaetigt, setBestaetigt] = useState(false)
  const [fehler, setFehler]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFehler(null)
    if (vorschau) { setFehler('Vorschau-Modus — in der Vorschau wird nichts gesendet.'); return }
    if (!name.trim()) { setFehler('Bitte deinen Namen eingeben.'); return }
    if (!bestaetigt) { setFehler('Bitte die Bestätigung anklicken.'); return }
    startTransition(async () => {
      const result = await freigabeAbsenden(token, name.trim(), kommentar.trim() || null, entscheidungen)
      if ('erfolg' in result) onErfolg()
      else setFehler(result.fehler)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="abschluss-titel">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="abschluss-titel" className="text-base font-semibold text-gray-900">Freigabe abschließen</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Schließen"
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {vorschau && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2.5 text-xs leading-relaxed">
              <span className="mt-0.5">👁</span>
              <span><strong>Vorschau-Modus.</strong> Dies ist nur eine Ansicht zum Testen — beim Absenden wird nichts gespeichert oder versendet.</span>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">{projektName}</p>
            {scopeBeschreibung && <p className="text-[11px] text-gray-400 mb-2">{scopeBeschreibung}</p>}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{gesamtCount}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Gesamt</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">{freigegebenCount}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Freigegeben</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">{abgelehntCount}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Abgelehnt</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Dein Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setFehler(null) }}
              placeholder="Vorname Nachname"
              disabled={isPending}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/30 focus:border-wellbeing-green"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Anmerkungen <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={kommentar}
              onChange={(e) => setKommentar(e.target.value)}
              placeholder="Allgemeine Rückmeldung zum Projekt…"
              disabled={isPending}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-wellbeing-green/30 focus:border-wellbeing-green"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed cursor-pointer">
            <input
              type="checkbox"
              checked={bestaetigt}
              onChange={(e) => { setBestaetigt(e.target.checked); setFehler(null) }}
              disabled={isPending}
              className="mt-0.5 rounded border-gray-300 text-wellbeing-green focus:ring-wellbeing-green/30"
            />
            <span>
              Ich bestätige, dass ich alle {gesamtCount} Position{gesamtCount === 1 ? '' : 'en'} geprüft habe
              und meine Entscheidung verbindlich ist.
            </span>
          </label>

          {fehler && <p className="text-xs text-red-500">{fehler}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              style={{ backgroundColor: brandingPrim }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Check className="w-4 h-4" />
              {vorschau ? 'Vorschau – deaktiviert' : isPending ? 'Wird gesendet…' : 'Jetzt abschließen'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
