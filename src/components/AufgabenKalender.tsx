'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import AufgabeDetailModal from '@/components/AufgabeDetailModal'
import type { AufgabeMitDetails, AufgabePrioritaet } from '@/lib/supabase/types'
import type { AufgabePickerOptionen } from '@/app/actions/aufgaben'

const PRIO_PUNKT: Record<AufgabePrioritaet, string> = {
  niedrig: 'bg-gray-300', normal: 'bg-blue-400',
  hoch: 'bg-amber-500',  dringend: 'bg-red-500',
}

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

export default function AufgabenKalender({
  aufgaben,
  pickerOptionen,
}: {
  aufgaben: AufgabeMitDetails[]
  pickerOptionen?: AufgabePickerOptionen
}) {
  // Aktueller Monat-State
  const [anker, setAnker] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [detailId, setDetailId] = useState<string | null>(null)

  const heuteIso = new Date().toISOString().slice(0, 10)

  // Aufgaben nach Faelligkeitsdatum gruppieren (yyyy-mm-dd → Aufgaben[])
  const aufgabenProTag = useMemo(() => {
    const m = new Map<string, AufgabeMitDetails[]>()
    for (const a of aufgaben) {
      if (!a.faellig_am) continue
      if (!m.has(a.faellig_am)) m.set(a.faellig_am, [])
      m.get(a.faellig_am)!.push(a)
    }
    return m
  }, [aufgaben])

  // Tage des aktuellen Monats berechnen — inkl. fuehrende/folgende Tage
  // anderer Monate, sodass das Grid mit ganzen Wochen anfaengt
  const tage = useMemo(() => {
    const jahr = anker.getFullYear()
    const monat = anker.getMonth()
    const ersterDesMonats = new Date(jahr, monat, 1)
    // Wochentag des ersten (Mo=0, So=6 — JS hat So=0)
    const startTag = (ersterDesMonats.getDay() + 6) % 7
    const startDatum = new Date(jahr, monat, 1 - startTag)
    const tageListe: { datum: Date; iso: string; istAktuellerMonat: boolean }[] = []
    // 6 Wochen = 42 Tage
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDatum)
      d.setDate(startDatum.getDate() + i)
      const iso = isoDatum(d)
      tageListe.push({
        datum: d, iso,
        istAktuellerMonat: d.getMonth() === monat,
      })
    }
    return tageListe
  }, [anker])

  function vor()    { setAnker(new Date(anker.getFullYear(), anker.getMonth() - 1, 1)) }
  function zurueck(){ setAnker(new Date(anker.getFullYear(), anker.getMonth() + 1, 1)) }
  function heute()  {
    const d = new Date()
    setAnker(new Date(d.getFullYear(), d.getMonth(), 1))
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={vor}
            aria-label="Vorheriger Monat"
            className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
          ><ChevronLeft size={16} /></button>
          <h3 className="text-sm font-semibold text-gray-900 min-w-[160px] text-center">
            {MONATE[anker.getMonth()]} {anker.getFullYear()}
          </h3>
          <button
            onClick={zurueck}
            aria-label="Nächster Monat"
            className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
          ><ChevronRight size={16} /></button>
        </div>
        <button
          onClick={heute}
          className="text-xs px-2.5 py-1 text-gray-600 hover:text-wellbeing-green hover:bg-gray-50 rounded"
        >Heute</button>
      </div>

      {/* Kalender-Grid */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Wochentage-Header */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/40 text-xs font-medium text-gray-500 uppercase">
          {WOCHENTAGE.map((w) => (
            <div key={w} className="px-2 py-2 text-center">{w}</div>
          ))}
        </div>
        {/* Tage */}
        <div className="grid grid-cols-7">
          {tage.map((t, i) => {
            const tasks = aufgabenProTag.get(t.iso) ?? []
            const istHeute = t.iso === heuteIso
            const istWochenende = i % 7 === 5 || i % 7 === 6
            return (
              <div
                key={t.iso + i}
                className={
                  'min-h-[110px] border-r border-b border-gray-100 last:border-r-0 p-1.5 ' +
                  (t.istAktuellerMonat ? '' : 'bg-gray-50/60 ') +
                  (istWochenende ? 'bg-gray-50/30 ' : '') +
                  (istHeute ? 'ring-2 ring-wellbeing-green/40 ring-inset ' : '')
                }
              >
                <div className={
                  'text-xs mb-1 inline-block px-1.5 py-0.5 rounded font-medium ' +
                  (istHeute ? 'bg-wellbeing-green text-white'
                    : t.istAktuellerMonat ? 'text-gray-700' : 'text-gray-300')
                }>
                  {t.datum.getDate()}
                </div>
                <div className="space-y-1">
                  {tasks.slice(0, 3).map((a) => {
                    const ueberfaellig = a.faellig_am! < heuteIso && a.status !== 'erledigt'
                    const erledigt = a.status === 'erledigt'
                    return (
                      <button
                        key={a.id}
                        onClick={() => setDetailId(a.id)}
                        className={
                          'w-full text-left text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 truncate transition-colors ' +
                          (erledigt ? 'bg-gray-100 text-gray-400 line-through'
                            : ueberfaellig ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-wellbeing-green/10 text-wellbeing-green-dark hover:bg-wellbeing-green/20')
                        }
                      >
                        <span className={`w-1 h-1 rounded-full shrink-0 ${PRIO_PUNKT[a.prioritaet]}`} />
                        {ueberfaellig && <AlertTriangle size={9} className="shrink-0" />}
                        <span className="truncate flex-1">{a.titel}</span>
                      </button>
                    )
                  })}
                  {tasks.length > 3 && (
                    <button
                      onClick={() => setDetailId(tasks[3].id)}
                      className="w-full text-left text-[10px] text-gray-400 hover:text-wellbeing-green px-1.5"
                    >+{tasks.length - 3} weitere</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <AufgabeDetailModal
        aufgabe={aufgaben.find((a) => a.id === detailId) ?? null}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        pickerOptionen={pickerOptionen}
      />
    </>
  )
}

function isoDatum(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
