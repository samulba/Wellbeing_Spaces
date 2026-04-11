'use client'

import { useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  notizHinzufuegen,
  notizAktualisieren,
  notizLoeschen,
} from '@/app/actions/notizen'

// ── Typen ─────────────────────────────────────────────────────
export type Notiz = {
  id: string
  inhalt: string
  erstellt_von: string | null
  erstellt_am: string
  bearbeitet_am: string
}

type NotizTyp = 'kunde' | 'projekt' | 'partner' | 'produkt'

// ── Helpers ───────────────────────────────────────────────────
function formatDatum(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Submit-Button ─────────────────────────────────────────────
function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors">
      {pending ? '…' : label}
    </button>
  )
}

// ── Einzelne Notiz (inkl. Inline-Edit) ───────────────────────
function NotizEintrag({ notiz, typ, referenzId }: { notiz: Notiz; typ: NotizTyp; referenzId: string }) {
  const [bearbeiten, setBearbeiten] = useState(false)
  const [isPending, startTransition] = useTransition()

  const updateAktion = notizAktualisieren.bind(null, notiz.id, typ, referenzId)
  const [state, formAction] = useFormState(updateAktion, null)

  function handleLoeschen() {
    if (!confirm('Notiz löschen?')) return
    startTransition(() => notizLoeschen(notiz.id, typ, referenzId))
  }

  const bearbeitetGeaendert = notiz.bearbeitet_am !== notiz.erstellt_am

  return (
    <div className="group relative bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all">
      {bearbeiten ? (
        <form action={formAction} onSubmit={() => { if (!state?.fehler) setBearbeiten(false) }} className="space-y-2">
          <textarea
            name="inhalt"
            defaultValue={notiz.inhalt}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white"
            autoFocus
          />
          {state?.fehler && <p className="text-xs text-red-500">{state.fehler}</p>}
          <div className="flex items-center gap-2">
            <SubmitBtn label="Speichern" />
            <button type="button" onClick={() => setBearbeiten(false)}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed pr-16">{notiz.inhalt}</p>
          <div className="flex items-center gap-2 mt-2.5 text-[11px] text-gray-400">
            {notiz.erstellt_von && (
              <span className="font-medium text-gray-500">{notiz.erstellt_von}</span>
            )}
            <span>{formatDatum(notiz.erstellt_am)}</span>
            {bearbeitetGeaendert && (
              <span className="italic">· bearbeitet</span>
            )}
          </div>

          {/* Action-Buttons */}
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setBearbeiten(true)}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Bearbeiten">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleLoeschen} disabled={isPending}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Löschen">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Notiz hinzufügen Form ────────────────────────────────────
function HinzufuegenForm({ typ, referenzId, onClose }: { typ: NotizTyp; referenzId: string; onClose: () => void }) {
  const addAktion = notizHinzufuegen.bind(null, typ, referenzId)
  const [state, formAction] = useFormState(addAktion, null)

  return (
    <form action={formAction}
      onSubmit={(e) => {
        // Reset & close on success (state updates async, so just close)
        const form = e.currentTarget
        setTimeout(() => {
          if (!form.querySelector('[aria-invalid]')) onClose()
        }, 100)
      }}
      className="space-y-2 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
      <textarea
        name="inhalt"
        rows={3}
        placeholder="Notiz eingeben…"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white"
        autoFocus
        required
      />
      {state?.fehler && <p className="text-xs text-red-500">{state.fehler}</p>}
      <div className="flex items-center gap-2">
        <SubmitBtn label="Hinzufügen" />
        <button type="button" onClick={onClose}
          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
          Abbrechen
        </button>
      </div>
    </form>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────
export default function NotizBlock({
  typ,
  referenzId,
  initialNotizen,
}: {
  typ: NotizTyp
  referenzId: string
  initialNotizen: Notiz[]
}) {
  const [hinzufuegen, setHinzufuegen] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Notizen
          {initialNotizen.length > 0 && (
            <span className="ml-2 text-indigo-500 font-bold normal-case tracking-normal">
              {initialNotizen.length}
            </span>
          )}
        </h2>
        {!hinzufuegen && (
          <button onClick={() => setHinzufuegen(true)}
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Hinzufügen
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        {hinzufuegen && (
          <HinzufuegenForm
            typ={typ}
            referenzId={referenzId}
            onClose={() => setHinzufuegen(false)}
          />
        )}

        {initialNotizen.length === 0 && !hinzufuegen && (
          <p className="text-sm text-gray-400 text-center py-3">Noch keine Notizen vorhanden.</p>
        )}

        {initialNotizen.map((n) => (
          <NotizEintrag key={n.id} notiz={n} typ={typ} referenzId={referenzId} />
        ))}
      </div>
    </div>
  )
}
