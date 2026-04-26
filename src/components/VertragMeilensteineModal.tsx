'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useModal } from '@/lib/hooks/useModal'
import {
  X, Plus, AlertCircle, Loader2, Calendar, Trash2, Flag,
} from 'lucide-react'
import {
  getVertragMeilensteine, meilensteinAnlegen,
  meilensteinStatusAendern, meilensteinLoeschen,
} from '@/app/actions/vertrag-meilensteine'
import type { VertragMeilenstein, MeilensteinStatus } from '@/lib/supabase/types'

const STATUS: { id: MeilensteinStatus; label: string; klasse: string }[] = [
  { id: 'offen',       label: 'Offen',       klasse: 'bg-gray-100 text-gray-700' },
  { id: 'in_arbeit',   label: 'In Arbeit',   klasse: 'bg-blue-50 text-blue-700' },
  { id: 'erledigt',    label: 'Erledigt',    klasse: 'bg-emerald-50 text-emerald-700' },
  { id: 'abgerechnet', label: 'Abgerechnet', klasse: 'bg-purple-50 text-purple-700' },
]

export default function VertragMeilensteineModal({
  open, onClose,
  vertragId,
  vertragTitel,
}: {
  open: boolean
  onClose: () => void
  vertragId: string
  vertragTitel: string
}) {
  const router = useRouter()
  const titleId = useId()
  const modalRef = useModal(open, () => onClose())
  const [pending, startTransition] = useTransition()

  const [items, setItems] = useState<VertragMeilenstein[]>([])
  const [neuTitel, setNeuTitel] = useState('')
  const [neuFaellig, setNeuFaellig] = useState('')
  const [neuBetrag, setNeuBetrag] = useState('')
  const [neuProzent, setNeuProzent] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    void getVertragMeilensteine(vertragId).then(setItems)
  }, [open, vertragId])

  if (!open) return null

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const titel = neuTitel.trim()
    if (!titel) { setFehler('Titel darf nicht leer sein.'); return }
    setFehler(null)
    const betrag = neuBetrag ? Number(neuBetrag.replace(',', '.')) : null
    const prozent = neuProzent ? Number(neuProzent.replace(',', '.')) : null
    startTransition(async () => {
      const res = await meilensteinAnlegen({
        vertragId, titel,
        faellig_am: neuFaellig || null,
        betrag,
        prozent,
      })
      if (res.fehler) { setFehler(res.fehler); return }
      setNeuTitel(''); setNeuFaellig(''); setNeuBetrag(''); setNeuProzent('')
      const liste = await getVertragMeilensteine(vertragId)
      setItems(liste)
      router.refresh()
    })
  }

  function handleStatus(id: string, neu: MeilensteinStatus) {
    setItems((prev) => prev.map((m) => m.id === id ? { ...m, status: neu } : m))
    startTransition(async () => {
      const res = await meilensteinStatusAendern(id, neu)
      if (res.fehler) {
        // Rollback
        const liste = await getVertragMeilensteine(vertragId)
        setItems(liste)
      } else {
        router.refresh()
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Meilenstein wirklich loeschen?')) return
    setItems((prev) => prev.filter((m) => m.id !== id))
    startTransition(async () => {
      const res = await meilensteinLoeschen(id)
      if (res.fehler) {
        const liste = await getVertragMeilensteine(vertragId)
        setItems(liste)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[88vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Flag className="w-4 h-4 text-wellbeing-green" /> Meilensteine
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{vertragTitel}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <p className="text-xs text-gray-500">
            Pro Meilenstein wird automatisch eine Aufgabe ins Kanban-Board übernommen.
            Status-Wechsel hier syncen sich mit der Aufgabe.
          </p>

          {/* Liste */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
              Noch keine Meilensteine.
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((m) => {
                const cfg = STATUS.find((s) => s.id === m.status)
                return (
                  <li key={m.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.titel}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        {m.faellig_am && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(m.faellig_am + 'T00:00:00Z').toLocaleDateString('de-DE')}
                          </span>
                        )}
                        {m.betrag != null && <span>{m.betrag.toLocaleString('de-DE')} €</span>}
                        {m.prozent != null && <span>{m.prozent}%</span>}
                      </div>
                    </div>
                    <select
                      value={m.status}
                      onChange={(e) => handleStatus(m.id, e.target.value as MeilensteinStatus)}
                      className={`text-xs border-0 rounded-md px-2 py-1 cursor-pointer ${cfg?.klasse ?? ''}`}
                    >
                      {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <button
                      onClick={() => handleDelete(m.id)}
                      aria-label="Loeschen"
                      className="text-gray-300 hover:text-red-500 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Add-Form */}
          <form onSubmit={handleAdd} className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Neuer Meilenstein</p>
            <input
              value={neuTitel}
              onChange={(e) => setNeuTitel(e.target.value)}
              placeholder="z.B. Anzahlung 30%, Konzept-Praesentation, Schluss-Rechnung"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-wellbeing-green-light"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={neuFaellig}
                onChange={(e) => setNeuFaellig(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-wellbeing-green-light"
              />
              <input
                value={neuBetrag}
                onChange={(e) => setNeuBetrag(e.target.value)}
                placeholder="Betrag (€)"
                inputMode="decimal"
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-wellbeing-green-light"
              />
              <input
                value={neuProzent}
                onChange={(e) => setNeuProzent(e.target.value)}
                placeholder="oder %"
                inputMode="decimal"
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-wellbeing-green-light"
              />
            </div>
            <button
              type="submit"
              disabled={pending || !neuTitel.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-wellbeing-green text-white rounded-lg hover:bg-wellbeing-green-dark disabled:opacity-50"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Meilenstein anlegen
            </button>
            {fehler && (
              <p className="text-xs text-red-500 inline-flex items-center gap-1">
                <AlertCircle size={12} /> {fehler}
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 shrink-0 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
          >Fertig</button>
        </div>
      </div>
    </>
  )
}

