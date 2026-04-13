'use client'

import { useState, useTransition } from 'react'
import { projektStatusAendern } from '@/app/actions/projekte'
import type { ProjektStatus } from '@/lib/supabase/types'

// UI-Mapping: 3 sichtbare Status → DB-Werte
// offen       = "Aktiv"
// freigegeben = "Warten auf Kunde"
// abgeschlossen = "Abgeschlossen"
// in_bearbeitung wird auf "offen" gemappt wenn es als initial status kommt

const STATUS_OPTIONEN: {
  wert: ProjektStatus
  label: string
  aktiv: string
  inaktiv: string
}[] = [
  {
    wert:    'offen',
    label:   'Aktiv',
    aktiv:   'bg-gray-200 text-gray-700 ring-2 ring-offset-1 ring-gray-400',
    inaktiv: 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300 hover:bg-gray-50',
  },
  {
    wert:    'freigegeben',
    label:   'Warten auf Kunde',
    aktiv:   'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-400',
    inaktiv: 'bg-white text-gray-400 border border-gray-200 hover:border-blue-200 hover:bg-blue-50',
  },
  {
    wert:    'abgeschlossen',
    label:   'Abgeschlossen',
    aktiv:   'bg-emerald-100 text-emerald-700 ring-2 ring-offset-1 ring-emerald-400',
    inaktiv: 'bg-white text-gray-400 border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50',
  },
]

function normalisiereStatus(s: ProjektStatus): ProjektStatus {
  // in_bearbeitung → offen für UI-Anzeige
  return s === 'in_bearbeitung' ? 'offen' : s
}

export default function ProjektStatusButtons({
  projektId,
  initialStatus,
  disabled,
}: {
  projektId: string
  initialStatus: ProjektStatus
  disabled?: boolean
}) {
  const [aktuellerStatus, setAktuellerStatus] = useState<ProjektStatus>(normalisiereStatus(initialStatus))
  const [isPending, startTransition] = useTransition()
  const [bestaetigung, setBestaetigung] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<ProjektStatus | null>(null)

  function klick(neuerStatus: ProjektStatus) {
    if (neuerStatus === aktuellerStatus) return
    if (neuerStatus === 'abgeschlossen') {
      setPendingStatus(neuerStatus)
      setBestaetigung(true)
      return
    }
    aendern(neuerStatus)
  }

  function aendern(status: ProjektStatus) {
    const vorheriger = aktuellerStatus
    setAktuellerStatus(status)
    startTransition(async () => {
      try {
        await projektStatusAendern(projektId, status)
      } catch {
        setAktuellerStatus(vorheriger)
      }
    })
  }

  return (
    <>
      {bestaetigung && pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Projekt abschließen?</h2>
            <p className="text-sm text-gray-500 mb-6">
              Das Projekt wird als <strong>Abgeschlossen</strong> markiert. Dieser Status signalisiert, dass alle Arbeiten beendet sind.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setBestaetigung(false); setPendingStatus(null) }}
                className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  setBestaetigung(false)
                  aendern(pendingStatus)
                  setPendingStatus(null)
                }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition"
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`flex items-center gap-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {STATUS_OPTIONEN.map((s) => {
          const istAktiv = aktuellerStatus === s.wert
          return (
            <button
              key={s.wert}
              onClick={() => klick(s.wert)}
              disabled={isPending}
              className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed ${
                istAktiv ? s.aktiv : s.inaktiv
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>
    </>
  )
}
