'use client'

import { useState, useTransition } from 'react'
import { Lock, LockOpen, Copy, Check, Eye, EyeOff } from 'lucide-react'
import { pinSetzen } from '@/app/actions/projekte'

interface Props {
  projektId: string
  hatPin: boolean
}

export default function FreigabePinEinstellung({ projektId, hatPin: initialHatPin }: Props) {
  const [hatPin, setHatPin]         = useState(initialHatPin)
  const [editMode, setEditMode]     = useState(false)
  const [pinInput, setPinInput]     = useState('')
  const [gespeicherterPin, setGespeicherterPin] = useState<string | null>(null)
  const [pinSichtbar, setPinSichtbar] = useState(false)
  const [kopiert, setKopiert]       = useState(false)
  const [fehler, setFehler]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSpeichern() {
    const pin = pinInput.trim()
    if (!/^\d{4,6}$/.test(pin)) {
      setFehler('PIN muss 4–6 Ziffern enthalten.')
      return
    }
    startTransition(async () => {
      await pinSetzen(projektId, pin)
      setHatPin(true)
      setEditMode(false)
      setPinInput('')
      setFehler(null)
      setGespeicherterPin(pin)
      setPinSichtbar(false)
    })
  }

  function handleEntfernen() {
    startTransition(async () => {
      await pinSetzen(projektId, null)
      setHatPin(false)
      setEditMode(false)
      setPinInput('')
      setGespeicherterPin(null)
      setFehler(null)
    })
  }

  function handleKopieren() {
    if (!gespeicherterPin) return
    navigator.clipboard.writeText(gespeicherterPin).then(() => {
      setKopiert(true)
      setTimeout(() => setKopiert(false), 2000)
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          {hatPin
            ? <Lock className="w-3.5 h-3.5 text-wellbeing-green" />
            : <LockOpen className="w-3.5 h-3.5 text-gray-400" />}
          PIN-Schutz
        </h2>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          hatPin
            ? 'bg-wellbeing-green/10 text-wellbeing-green'
            : 'bg-gray-100 text-gray-400'
        }`}>
          {hatPin ? 'Aktiv' : 'Inaktiv'}
        </span>
      </div>

      {!editMode ? (
        <div>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            {hatPin
              ? 'Kunden müssen vor dem Öffnen des Freigabelinks einen PIN eingeben.'
              : 'Optionaler Schutz: Kunden brauchen einen PIN um den Freigabelink zu öffnen.'}
          </p>

          {/* PIN anzeigen nach Speichern */}
          {gespeicherterPin && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-wellbeing-green/5 border border-wellbeing-green/20 rounded-lg">
              <span className="font-mono text-sm font-bold text-wellbeing-green-dark tracking-[0.25em] flex-1">
                {pinSichtbar ? gespeicherterPin : '·'.repeat(gespeicherterPin.length)}
              </span>
              <button
                onClick={() => setPinSichtbar((v) => !v)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={pinSichtbar ? 'PIN verbergen' : 'PIN anzeigen'}
              >
                {pinSichtbar ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleKopieren}
                className="p-1 text-gray-400 hover:text-wellbeing-green transition-colors"
                title="PIN kopieren"
              >
                {kopiert ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setEditMode(true); setFehler(null) }}
              disabled={isPending}
              className="px-3 py-2 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {hatPin ? 'PIN ändern' : 'PIN einrichten'}
            </button>
            {hatPin && (
              <button
                onClick={handleEntfernen}
                disabled={isPending}
                className="px-3 py-2 text-xs font-medium text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? '…' : 'Entfernen'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Neuer PIN (4–6 Ziffern)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '')); setFehler(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSpeichern() }}
              placeholder="z.B. 1234"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light font-mono tracking-[0.3em] text-center"
            />
            {fehler && <p className="text-xs text-red-500 mt-1">{fehler}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSpeichern}
              disabled={isPending}
              className="px-3 py-2 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? '…' : 'Speichern'}
            </button>
            <button
              onClick={() => { setEditMode(false); setPinInput(''); setFehler(null) }}
              disabled={isPending}
              className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
