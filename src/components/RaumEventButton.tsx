'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Flag, Truck, Clock, Layers } from 'lucide-react'
import { eventErstellen } from '@/app/actions/timeline'
import type { TimelineEventTyp, TimelineEventStatus } from '@/lib/supabase/types'

const heute = new Date().toISOString().split('T')[0]

const TYP_CONFIG: Record<TimelineEventTyp, { label: string; icon: typeof Flag; klasse: string }> = {
  meilenstein: { label: 'Meilenstein', icon: Flag,   klasse: 'text-purple-600 bg-purple-50 border-purple-200' },
  lieferung:   { label: 'Lieferung',   icon: Truck,  klasse: 'text-blue-600 bg-blue-50 border-blue-200' },
  termin:      { label: 'Termin',      icon: Clock,  klasse: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  phase:       { label: 'Phase',       icon: Layers, klasse: 'text-gray-600 bg-gray-50 border-gray-200' },
}

export default function RaumEventButton({
  projektId,
  raumId,
}: {
  projektId: string
  raumId: string
}) {
  const [offen, setOffen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fehler, setFehler] = useState<string | null>(null)
  const router = useRouter()

  const [form, setForm] = useState({
    titel: '',
    typ: 'termin' as TimelineEventTyp,
    start_datum: heute,
    end_datum: '',
    status: 'geplant' as TimelineEventStatus,
    kunde_sichtbar: true,
  })

  function reset() {
    setForm({ titel: '', typ: 'termin', start_datum: heute, end_datum: '', status: 'geplant', kunde_sichtbar: true })
    setFehler(null)
  }

  function speichern() {
    if (!form.titel.trim()) { setFehler('Titel ist erforderlich.'); return }
    startTransition(async () => {
      try {
        await eventErstellen(projektId, {
          titel: form.titel.trim(),
          typ: form.typ,
          start_datum: form.start_datum,
          end_datum: form.end_datum || null,
          status: form.status,
          raum_id: raumId,
          kunde_sichtbar: form.kunde_sichtbar,
          abhaengig_von: [],
        })
        reset()
        setOffen(false)
        router.refresh()
      } catch {
        setFehler('Event konnte nicht gespeichert werden.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-wellbeing-green/30 text-wellbeing-green hover:bg-wellbeing-green/10 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Event hinzufügen
      </button>

      {offen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !isPending && setOffen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="raum-event-titel"
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 id="raum-event-titel" className="text-base font-semibold text-gray-900">Neues Raum-Event</h2>
              <button
                onClick={() => setOffen(false)}
                disabled={isPending}
                aria-label="Schließen"
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Titel *</label>
                <input
                  type="text"
                  value={form.titel}
                  onChange={(e) => setForm((f) => ({ ...f, titel: e.target.value }))}
                  placeholder="z.B. Malerarbeiten Wohnzimmer"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Typ</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(TYP_CONFIG) as [TimelineEventTyp, typeof TYP_CONFIG[TimelineEventTyp]][]).map(([typ, cfg]) => {
                    const Icon = cfg.icon
                    return (
                      <button
                        key={typ}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, typ }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                          form.typ === typ ? cfg.klasse : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Start *</label>
                  <input
                    type="date"
                    value={form.start_datum}
                    onChange={(e) => setForm((f) => ({ ...f, start_datum: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
                  />
                </div>
                {form.typ === 'phase' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Ende</label>
                    <input
                      type="date"
                      value={form.end_datum}
                      min={form.start_datum}
                      onChange={(e) => setForm((f) => ({ ...f, end_datum: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, kunde_sichtbar: !f.kunde_sichtbar }))}
                  className={`shrink-0 mt-0.5 flex items-center p-0 border-0 rounded-full transition-colors cursor-pointer ${
                    form.kunde_sichtbar ? 'bg-wellbeing-green justify-end pr-[3px]' : 'bg-gray-300 justify-start pl-[3px]'
                  }`}
                  style={{ width: 40, height: 22, boxSizing: 'border-box' }}
                  role="switch"
                  aria-checked={form.kunde_sichtbar}
                >
                  <span
                    className="block bg-white rounded-full shadow-sm"
                    style={{ width: 16, height: 16 }}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">Für Kunde im Portal sichtbar</p>
                  <p className="text-xs text-gray-500 mt-0.5">Aus, wenn dieses Event nur intern ist.</p>
                </div>
              </div>

              <p className="text-[11px] text-gray-400">
                Event wird dem Raum zugeordnet und erscheint sowohl in der Raum- als auch der Projekt-Timeline.
              </p>
            </div>

            {fehler && <p className="text-xs text-red-500 mt-3">{fehler}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setOffen(false)}
                disabled={isPending}
                className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={speichern}
                disabled={isPending}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition"
              >
                {isPending ? 'Speichern…' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
