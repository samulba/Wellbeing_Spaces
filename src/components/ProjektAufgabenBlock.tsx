'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, AlertTriangle, Calendar, Check } from 'lucide-react'
import { aufgabeAnlegen, aufgabeStatusAendern, type AufgabePickerOptionen } from '@/app/actions/aufgaben'
import AufgabeDetailModal from '@/components/AufgabeDetailModal'
import type { AufgabeMitDetails, AufgabeStatus, AufgabePrioritaet } from '@/lib/supabase/types'

const STATUS_LABEL: Record<AufgabeStatus, string> = {
  backlog: 'Offen',
  in_arbeit: 'In Arbeit',
  review: 'Review',
  erledigt: 'Erledigt',
}

const STATUS_FARBE: Record<AufgabeStatus, string> = {
  backlog: 'bg-gray-100 text-gray-700',
  in_arbeit: 'bg-blue-50 text-blue-700',
  review: 'bg-amber-50 text-amber-700',
  erledigt: 'bg-emerald-50 text-emerald-700',
}

const PRIO_FARBE: Record<AufgabePrioritaet, string> = {
  niedrig: 'bg-gray-300', normal: 'bg-blue-400',
  hoch: 'bg-amber-500',  dringend: 'bg-red-500',
}

export default function ProjektAufgabenBlock({
  projektId,
  kundeId,
  initialAufgaben,
  pickerOptionen,
}: {
  projektId: string
  kundeId: string | null
  initialAufgaben: AufgabeMitDetails[]
  pickerOptionen?: AufgabePickerOptionen
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [aufgaben, setAufgaben] = useState<AufgabeMitDetails[]>(initialAufgaben)
  const [neuTitel, setNeuTitel] = useState('')
  const [neuOffen, setNeuOffen] = useState(false)
  const [filter, setFilter] = useState<'alle' | 'offen' | 'erledigt'>('offen')
  const [detailId, setDetailId] = useState<string | null>(null)

  const gefiltert =
    filter === 'alle' ? aufgaben
    : filter === 'erledigt' ? aufgaben.filter((a) => a.status === 'erledigt')
    : aufgaben.filter((a) => a.status !== 'erledigt')

  const offenCount    = aufgaben.filter((a) => a.status !== 'erledigt').length
  const erledigtCount = aufgaben.filter((a) => a.status === 'erledigt').length

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const titel = neuTitel.trim()
    if (!titel) return
    setNeuTitel('')
    setNeuOffen(false)
    startTransition(async () => {
      const res = await aufgabeAnlegen({
        titel,
        status: 'backlog',
        projekt_id: projektId,
        kunde_id: kundeId,
      })
      if (res.fehler) console.error(res.fehler)
      router.refresh()
    })
  }

  function handleErledigen(id: string) {
    setAufgaben((prev) => prev.map((a) =>
      a.id === id ? { ...a, status: 'erledigt', erledigt_am: new Date().toISOString() } : a,
    ))
    startTransition(async () => {
      const res = await aufgabeStatusAendern(id, 'erledigt')
      if (res.fehler) {
        // Rollback
        setAufgaben(initialAufgaben)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Aufgaben</h2>
          <div className="flex items-center gap-1">
            {([
              { id: 'offen' as const,    label: `Aktiv ${offenCount}` },
              { id: 'erledigt' as const, label: `Erledigt ${erledigtCount}` },
              { id: 'alle' as const,     label: 'Alle' },
            ]).map((p) => (
              <button
                key={p.id}
                onClick={() => setFilter(p.id)}
                className={
                  'text-xs px-2 py-1 rounded transition-colors ' +
                  (filter === p.id
                    ? 'bg-wellbeing-green text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
                }
              >{p.label}</button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setNeuOffen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm bg-wellbeing-green text-white px-3 py-1.5 rounded-lg hover:bg-wellbeing-green-dark"
        >
          <Plus size={14} /> Aufgabe
        </button>
      </div>

      {neuOffen && (
        <form onSubmit={handleAdd} className="px-5 py-3 border-b border-gray-100 bg-gray-50/40 flex items-center gap-2">
          <input
            autoFocus
            value={neuTitel}
            onChange={(e) => setNeuTitel(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setNeuOffen(false)}
            placeholder="Titel der Aufgabe…"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-wellbeing-green-light"
          />
          <button
            type="submit"
            disabled={pending || !neuTitel.trim()}
            className="text-sm bg-wellbeing-green text-white px-3 py-1.5 rounded-lg hover:bg-wellbeing-green-dark disabled:opacity-50"
          >Anlegen</button>
          <button
            type="button"
            onClick={() => { setNeuOffen(false); setNeuTitel('') }}
            className="text-sm text-gray-500 px-2 py-1.5"
          >Abbrechen</button>
        </form>
      )}

      {gefiltert.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          {filter === 'erledigt' ? 'Noch keine Aufgaben erledigt.'
            : filter === 'offen' ? 'Alles erledigt 🎉'
            : 'Noch keine Aufgaben.'}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {gefiltert.map((a) => {
            const heute = new Date().toISOString().slice(0, 10)
            const ueberfaellig = !!a.faellig_am && a.faellig_am < heute && a.status !== 'erledigt'
            return (
              <li
                key={a.id}
                className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer group"
                onClick={() => setDetailId(a.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); if (a.status !== 'erledigt') handleErledigen(a.id) }}
                  aria-label="Erledigen"
                  disabled={a.status === 'erledigt'}
                  className={
                    'shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ' +
                    (a.status === 'erledigt'
                      ? 'bg-wellbeing-green border-wellbeing-green text-white'
                      : 'border-gray-300 hover:border-wellbeing-green text-transparent hover:text-wellbeing-green')
                  }
                >
                  <Check size={12} />
                </button>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIO_FARBE[a.prioritaet]}`} />
                <div className="flex-1 min-w-0">
                  <p className={
                    'text-sm truncate ' +
                    (a.status === 'erledigt' ? 'line-through text-gray-400' : 'text-gray-900')
                  }>{a.titel}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    {a.faellig_am && (
                      <span className={'inline-flex items-center gap-1 ' + (ueberfaellig ? 'text-red-600' : '')}>
                        {ueberfaellig ? <AlertTriangle size={11} /> : <Calendar size={11} />}
                        {formatDate(a.faellig_am)}
                      </span>
                    )}
                    {a.checklist.length > 0 && (
                      <span>{a.checklist.filter((c) => c.erledigt).length}/{a.checklist.length}</span>
                    )}
                    {a.assignee_kunde && <span className="text-amber-600">Kunde</span>}
                    {a.quelle !== 'manuell' && (
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">auto</span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_FARBE[a.status]}`}>
                  {STATUS_LABEL[a.status]}
                </span>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-wellbeing-green" />
              </li>
            )
          })}
        </ul>
      )}

      <AufgabeDetailModal
        aufgabe={aufgaben.find((a) => a.id === detailId) ?? null}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        pickerOptionen={pickerOptionen}
      />
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}
