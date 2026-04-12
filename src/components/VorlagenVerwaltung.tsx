'use client'

import { useState, useTransition } from 'react'
import {
  Plus, Trash2, Edit2, Check, X, GripVertical,
  ChevronDown, ChevronUp, Star,
} from 'lucide-react'
import {
  vorlageErstellen,
  vorlageSpeichern,
  vorlageLoeschen,
} from '@/app/actions/onboarding'
import type { OnboardingVorlage, OnboardingFrage, OnboardingFrageTyp } from '@/lib/supabase/types'

// ── Frage-Typen ───────────────────────────────────────────────
const FRAGE_TYPEN: { wert: OnboardingFrageTyp; label: string }[] = [
  { wert: 'text',             label: 'Kurztext' },
  { wert: 'textarea',         label: 'Langer Text' },
  { wert: 'zahl',             label: 'Zahl' },
  { wert: 'auswahl',          label: 'Einfachauswahl' },
  { wert: 'mehrfachauswahl',  label: 'Mehrfachauswahl' },
  { wert: 'datum',            label: 'Datum' },
]

function neueFrage(): OnboardingFrage {
  return {
    id: crypto.randomUUID(),
    titel: '',
    typ: 'text',
    pflichtfeld: false,
    placeholder: '',
    optionen: [],
  }
}

// ── Fragen-Editor ─────────────────────────────────────────────
function FrageEditor({
  frage,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  frage: OnboardingFrage
  index: number
  total: number
  onChange: (f: OnboardingFrage) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hatOptionen = frage.typ === 'auswahl' || frage.typ === 'mehrfachauswahl'

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Kopfzeile */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors leading-none"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors leading-none"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
        <span className="text-xs font-semibold text-gray-400 shrink-0">#{index + 1}</span>
        <p className="flex-1 text-sm text-gray-700 truncate min-w-0">
          {frage.titel || <span className="italic text-gray-400">Neues Feld</span>}
        </p>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
          {FRAGE_TYPEN.find((t) => t.wert === frage.typ)?.label}
        </span>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button
          onClick={onDelete}
          className="text-red-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Detail-Felder */}
      {expanded && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Frage / Label</label>
              <input
                type="text"
                placeholder="z. B. Wie heißen Sie?"
                value={frage.titel}
                onChange={(e) => onChange({ ...frage, titel: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
              <select
                value={frage.typ}
                onChange={(e) =>
                  onChange({ ...frage, typ: e.target.value as OnboardingFrageTyp, optionen: [] })
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
              >
                {FRAGE_TYPEN.map((t) => (
                  <option key={t.wert} value={t.wert}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {(frage.typ === 'text' || frage.typ === 'textarea' || frage.typ === 'zahl') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Platzhalter (optional)</label>
              <input
                type="text"
                placeholder="Beispiel-Eingabe…"
                value={frage.placeholder ?? ''}
                onChange={(e) => onChange({ ...frage, placeholder: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
              />
            </div>
          )}

          {hatOptionen && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Optionen (eine pro Zeile)
              </label>
              <textarea
                rows={4}
                value={(frage.optionen ?? []).join('\n')}
                onChange={(e) =>
                  onChange({
                    ...frage,
                    optionen: e.target.value
                      .split('\n')
                      .map((s) => s.trimEnd())
                      .filter((s) => s.length > 0),
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 resize-none"
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={frage.pflichtfeld}
              onChange={(e) => onChange({ ...frage, pflichtfeld: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-wellbeing-green focus:ring-wellbeing-green/20"
            />
            <span className="text-xs text-gray-600">Pflichtfeld</span>
          </label>
        </div>
      )}
    </div>
  )
}

// ── Vorlage-Karte (Ansicht) ───────────────────────────────────
function VorlageKarte({
  vorlage,
  onEdit,
  onDelete,
}: {
  vorlage: OnboardingVorlage
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-900">{vorlage.name}</p>
          {vorlage.ist_standard && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-wellbeing-green bg-wellbeing-green/10 px-1.5 py-0.5 rounded-full">
              <Star className="w-2.5 h-2.5" />
              Standard
            </span>
          )}
        </div>
        {vorlage.beschreibung && (
          <p className="text-xs text-gray-400 mb-1">{vorlage.beschreibung}</p>
        )}
        <p className="text-xs text-gray-400">{vorlage.fragen.length} Fragen</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Bearbeiten
        </button>
        {!vorlage.ist_standard && (
          <button
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center text-red-300 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Vorlage-Editor-Modal ──────────────────────────────────────
function VorlageEditorModal({
  vorlage,
  onSave,
  onClose,
}: {
  vorlage: OnboardingVorlage | null   // null = neue Vorlage
  onSave: (name: string, beschreibung: string, fragen: OnboardingFrage[]) => void
  onClose: () => void
}) {
  const [name, setName]               = useState(vorlage?.name ?? '')
  const [beschreibung, setBeschreibung] = useState(vorlage?.beschreibung ?? '')
  const [fragen, setFragen]           = useState<OnboardingFrage[]>(
    vorlage?.fragen ?? [neueFrage()]
  )
  const [isPending, startTransition]  = useTransition()

  function addFrage() {
    setFragen((fs) => [...fs, neueFrage()])
  }

  function updateFrage(index: number, f: OnboardingFrage) {
    setFragen((fs) => fs.map((item, i) => (i === index ? f : item)))
  }

  function deleteFrage(index: number) {
    setFragen((fs) => fs.filter((_, i) => i !== index))
  }

  function moveFrage(from: number, to: number) {
    setFragen((fs) => {
      const arr = [...fs]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
  }

  function handleSave() {
    if (!name.trim()) return
    startTransition(async () => {
      const cleanFragen = fragen.filter((f) => f.titel.trim())
      onSave(name.trim(), beschreibung.trim(), cleanFragen)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center py-8 px-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {vorlage ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input
                type="text"
                autoFocus
                placeholder="z. B. Gewerbe-Kunden"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung (optional)</label>
              <input
                type="text"
                placeholder="Kurze Beschreibung…"
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
              />
            </div>
          </div>

          {/* Fragen */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Fragen ({fragen.length})
              </label>
              <button
                onClick={addFrage}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 hover:border-wellbeing-green rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Frage hinzufügen
              </button>
            </div>

            {fragen.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-6 border border-dashed border-gray-200 rounded-xl">
                Noch keine Fragen. Füge eine Frage hinzu.
              </p>
            ) : (
              <div className="space-y-2">
                {fragen.map((f, i) => (
                  <FrageEditor
                    key={f.id}
                    frage={f}
                    index={i}
                    total={fragen.length}
                    onChange={(updated) => updateFrage(i, updated)}
                    onDelete={() => deleteFrage(i)}
                    onMoveUp={() => moveFrage(i, i - 1)}
                    onMoveDown={() => moveFrage(i, i + 1)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition-colors"
          >
            <Check className="w-4 h-4" />
            {isPending ? 'Wird gespeichert…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────
export default function VorlagenVerwaltung({ vorlagen: initVorlagen }: { vorlagen: OnboardingVorlage[] }) {
  const [vorlagen, setVorlagen]         = useState<OnboardingVorlage[]>(initVorlagen)
  const [editorVorlage, setEditorVorlage] = useState<OnboardingVorlage | null | undefined>(undefined)
  // undefined = kein Modal, null = neue Vorlage, OnboardingVorlage = bearbeiten
  const [isPending, startTransition]    = useTransition()

  function handleSave(name: string, beschreibung: string, fragen: OnboardingFrage[]) {
    startTransition(async () => {
      if (editorVorlage === null) {
        // Neu erstellen
        const neu = await vorlageErstellen(name, beschreibung, fragen)
        setVorlagen((vs) => [
          ...vs.filter((v) => v.ist_standard),
          neu,
          ...vs.filter((v) => !v.ist_standard && v.id !== neu.id),
        ])
      } else if (editorVorlage) {
        // Aktualisieren
        await vorlageSpeichern(editorVorlage.id, name, beschreibung, fragen)
        setVorlagen((vs) =>
          vs.map((v) =>
            v.id === editorVorlage.id
              ? { ...v, name, beschreibung: beschreibung || null, fragen }
              : v
          )
        )
      }
      setEditorVorlage(undefined)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await vorlageLoeschen(id)
      setVorlagen((vs) => vs.filter((v) => v.id !== id))
    })
  }

  return (
    <>
      {editorVorlage !== undefined && (
        <VorlageEditorModal
          vorlage={editorVorlage}
          onSave={handleSave}
          onClose={() => setEditorVorlage(undefined)}
        />
      )}

      <div className="space-y-3">
        {vorlagen.map((v) => (
          <VorlageKarte
            key={v.id}
            vorlage={v}
            onEdit={() => setEditorVorlage(v)}
            onDelete={() => handleDelete(v.id)}
          />
        ))}

        <button
          onClick={() => setEditorVorlage(null)}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-wellbeing-green border-2 border-dashed border-wellbeing-green/30 hover:border-wellbeing-green/60 rounded-xl transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Neue Vorlage erstellen
        </button>
      </div>
    </>
  )
}
