'use client'

import { useId, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useModal } from '@/lib/hooks/useModal'
import { X, Plus, AlertCircle, Loader2 } from 'lucide-react'
import {
  aufgabeAnlegen, getAufgabenVorlagen,
  type AufgabePickerOptionen,
} from '@/app/actions/aufgaben'
import type { AufgabeVorlage } from '@/lib/supabase/types'
import AufgabeVerknuepfungenPicker from '@/components/AufgabeVerknuepfungenPicker'
import AufgabeAssigneePicker from '@/components/AufgabeAssigneePicker'
import AufgabeLabelsPicker from '@/components/AufgabeLabelsPicker'
import type { AufgabeStatus, AufgabePrioritaet } from '@/lib/supabase/types'

const STATI: { id: AufgabeStatus; label: string; klasse: string }[] = [
  { id: 'backlog',   label: 'Offen',     klasse: 'bg-gray-100 text-gray-700' },
  { id: 'in_arbeit', label: 'In Arbeit', klasse: 'bg-blue-50 text-blue-700' },
  { id: 'review',    label: 'Review',    klasse: 'bg-amber-50 text-amber-700' },
  { id: 'erledigt',  label: 'Erledigt',  klasse: 'bg-emerald-50 text-emerald-700' },
]

const PRIOS: { id: AufgabePrioritaet; label: string; punkt: string }[] = [
  { id: 'niedrig',  label: 'Niedrig',  punkt: 'bg-gray-300' },
  { id: 'normal',   label: 'Normal',   punkt: 'bg-blue-400' },
  { id: 'hoch',     label: 'Hoch',     punkt: 'bg-amber-500' },
  { id: 'dringend', label: 'Dringend', punkt: 'bg-red-500' },
]

export default function AufgabeAnlegenModal({
  open, onClose,
  pickerOptionen,
  defaultProjektId = null,
  defaultKundeId   = null,
  defaultRaumId    = null,
  defaultStatus    = 'backlog',
}: {
  open: boolean
  onClose: () => void
  pickerOptionen: AufgabePickerOptionen
  defaultProjektId?: string | null
  defaultKundeId?:   string | null
  defaultRaumId?:    string | null
  defaultStatus?:    AufgabeStatus
}) {
  const router = useRouter()
  const titleId = useId()
  const modalRef = useModal(open, () => onClose())
  const [pending, startTransition] = useTransition()

  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [status, setStatus] = useState<AufgabeStatus>(defaultStatus)
  const [prio, setPrio] = useState<AufgabePrioritaet>('normal')
  const [faelligAm, setFaelligAm] = useState('')
  const [projektId, setProjektId] = useState<string | null>(defaultProjektId)
  const [kundeId, setKundeId] = useState<string | null>(defaultKundeId)
  const [raumId, setRaumId] = useState<string | null>(defaultRaumId)
  const [assigneeUserId, setAssigneeUserId] = useState<string | null>(null)
  const [assigneeKunde, setAssigneeKunde] = useState(false)
  const [sichtbarKunde, setSichtbarKunde] = useState(false)
  const [labelIds, setLabelIds] = useState<string[]>([])
  const [vorlagen, setVorlagen] = useState<AufgabeVorlage[]>([])
  const [fehler, setFehler] = useState<string | null>(null)

  // Beim Oeffnen Defaults zuruecksetzen
  useEffect(() => {
    if (!open) return
    setTitel('')
    setBeschreibung('')
    setStatus(defaultStatus)
    setPrio('normal')
    setFaelligAm('')
    setProjektId(defaultProjektId)
    setKundeId(defaultKundeId)
    setRaumId(defaultRaumId)
    setAssigneeUserId(null)
    setAssigneeKunde(false)
    setSichtbarKunde(false)
    setLabelIds([])
    setFehler(null)
    void getAufgabenVorlagen().then(setVorlagen)
  }, [open, defaultProjektId, defaultKundeId, defaultRaumId, defaultStatus])

  function vorlageAnwenden(v: AufgabeVorlage) {
    setTitel(v.titel)
    setBeschreibung(v.beschreibung ?? '')
    setPrio(v.prioritaet)
    setLabelIds(v.label_ids ?? [])
    setSichtbarKunde(v.sichtbar_fuer_kunde)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = titel.trim()
    if (!t) { setFehler('Titel darf nicht leer sein.'); return }
    startTransition(async () => {
      const res = await aufgabeAnlegen({
        titel: t,
        beschreibung: beschreibung.trim() || null,
        status,
        prioritaet: prio,
        faellig_am:  faelligAm || null,
        projekt_id:  projektId,
        kunde_id:    kundeId,
        raum_id:     raumId,
        assignee_user_id:    assigneeUserId,
        assignee_kunde:      assigneeKunde,
        sichtbar_fuer_kunde: sichtbarKunde,
        label_ids:           labelIds,
      })
      if (res.fehler) setFehler(res.fehler)
      else { onClose(); router.refresh() }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-xl max-h-[95vh] md:max-h-[88vh] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 id={titleId} className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-wellbeing-green" /> Neue Aufgabe
          </h2>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form — scrollbar */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {/* Vorlagen-Quick-Picker */}
            {vorlagen.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Aus Vorlage starten</label>
                <div className="flex flex-wrap gap-1.5">
                  {vorlagen.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => vorlageAnwenden(v)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:border-wellbeing-green hover:bg-wellbeing-green/5 text-gray-700"
                    >
                      📋 {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Titel */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Titel</label>
              <input
                autoFocus
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="Was muss getan werden?"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-wellbeing-green-light focus:ring-2 focus:ring-wellbeing-green/20"
              />
            </div>

            {/* Beschreibung */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Beschreibung (optional)</label>
              <textarea
                rows={3}
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                placeholder="Notizen, Details, Kontext…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-wellbeing-green-light resize-y"
              />
            </div>

            {/* Verknuepfungen */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Verknüpfungen</label>
              <AufgabeVerknuepfungenPicker
                projektId={projektId} kundeId={kundeId} raumId={raumId}
                projekte={pickerOptionen.projekte}
                kunden={pickerOptionen.kunden}
                raeume={pickerOptionen.raeume}
                onChange={(patch) => {
                  if (patch.projekt_id !== undefined) setProjektId(patch.projekt_id)
                  if (patch.kunde_id   !== undefined) setKundeId(patch.kunde_id)
                  if (patch.raum_id    !== undefined) setRaumId(patch.raum_id)
                }}
              />
            </div>

            {/* Labels */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Labels</label>
              <AufgabeLabelsPicker
                selectedIds={labelIds}
                labels={pickerOptionen.labels}
                onChange={setLabelIds}
              />
            </div>

            {/* Status + Prio + Faelligkeit nebeneinander */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AufgabeStatus)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-wellbeing-green-light bg-white"
                >
                  {STATI.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1.5">Priorität</label>
                <select
                  value={prio}
                  onChange={(e) => setPrio(e.target.value as AufgabePrioritaet)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-wellbeing-green-light bg-white"
                >
                  {PRIOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1.5">Fällig</label>
                <input
                  type="date"
                  value={faelligAm}
                  onChange={(e) => setFaelligAm(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-wellbeing-green-light"
                />
              </div>
            </div>

            {/* Zugewiesen an */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Zugewiesen an</label>
              <AufgabeAssigneePicker
                assigneeUserId={assigneeUserId}
                assigneeKunde={assigneeKunde}
                team={pickerOptionen.team}
                currentUserId={pickerOptionen.currentUserId}
                hasKunde={!!kundeId}
                onChange={(patch) => {
                  if (patch.assignee_user_id !== undefined) setAssigneeUserId(patch.assignee_user_id)
                  if (patch.assignee_kunde   !== undefined) setAssigneeKunde(patch.assignee_kunde)
                }}
              />
            </div>

            {/* Sichtbar im Portal (zusaetzlich) */}
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={sichtbarKunde}
                onChange={(e) => setSichtbarKunde(e.target.checked)}
                className="rounded text-wellbeing-green focus:ring-wellbeing-green/20"
              />
              Im Portal sichtbar (zur Info)
            </label>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-100 shrink-0 flex items-center justify-between gap-3 bg-gray-50/40">
            <div className="text-xs">
              {fehler && (
                <span className="inline-flex items-center gap-1 text-red-600"><AlertCircle size={12} /> {fehler}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >Abbrechen</button>
              <button
                type="submit"
                disabled={pending || !titel.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-wellbeing-green text-white rounded-lg hover:bg-wellbeing-green-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Aufgabe anlegen
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
