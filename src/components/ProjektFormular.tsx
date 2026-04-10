'use client'

import { useFormState, useFormStatus } from 'react-dom'
import type { ProjektActionState } from '@/app/actions/projekte'
import type { Kunde, Projekt } from '@/lib/supabase/types'

export const PROJEKTARTEN = [
  'Hotel',
  'Büro / Office',
  'Restaurant / Gastronomie',
  'Wohnprojekt / Residential',
  'Spa / Wellness',
  'Einzelhandel / Retail',
  'Sonstige',
]

export const PROJEKT_STATUS = [
  { wert: 'offen', label: 'Offen' },
  { wert: 'in_bearbeitung', label: 'In Bearbeitung' },
  { wert: 'freigegeben', label: 'Freigegeben' },
  { wert: 'abgeschlossen', label: 'Abgeschlossen' },
]

function SpeichernButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {pending ? 'Wird gespeichert…' : 'Speichern'}
    </button>
  )
}

interface Props {
  aktion: (prevState: ProjektActionState, formData: FormData) => Promise<ProjektActionState>
  kunden: Pick<Kunde, 'id' | 'name'>[]
  initialData?: Projekt
  abbrechen: string
  istBearbeiten?: boolean
  vorausgewaehlterKundeId?: string
}

export default function ProjektFormular({
  aktion,
  kunden,
  initialData,
  abbrechen,
  istBearbeiten = false,
  vorausgewaehlterKundeId,
}: Props) {
  const [state, formAction] = useFormState(aktion, null)

  return (
    <form action={formAction} className="space-y-5">
      {state?.fehler && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.fehler}
        </div>
      )}

      {/* Projektname */}
      <div>
        <label htmlFor="name" className={lbl}>
          Projektname <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initialData?.name ?? ''}
          className={inp}
          placeholder="z. B. Hotel Seeblick – Zimmer 101–120"
        />
      </div>

      {/* Kunde */}
      <div>
        <label htmlFor="kunde_id" className={lbl}>
          Kunde <span className="text-red-400">*</span>
        </label>
        <select
          id="kunde_id"
          name="kunde_id"
          required
          defaultValue={initialData?.kunde_id ?? vorausgewaehlterKundeId ?? ''}
          className={inp}
        >
          <option value="" disabled>Kunde auswählen…</option>
          {kunden.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
      </div>

      {/* Standort & Projektart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="standort" className={lbl}>Standort</label>
          <input
            id="standort"
            name="standort"
            type="text"
            defaultValue={initialData?.standort ?? ''}
            className={inp}
            placeholder="z. B. München, Berlin…"
          />
        </div>
        <div>
          <label htmlFor="projektart" className={lbl}>Projektart</label>
          <select
            id="projektart"
            name="projektart"
            defaultValue={initialData?.projektart ?? ''}
            className={inp}
          >
            <option value="">Bitte wählen…</option>
            {PROJEKTARTEN.map((art) => (
              <option key={art} value={art}>{art}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Gesamtbudget */}
      <div>
        <label htmlFor="gesamtbudget" className={lbl}>Gesamtbudget (€)</label>
        <input
          id="gesamtbudget"
          name="gesamtbudget"
          type="number"
          min="0"
          step="0.01"
          defaultValue={initialData?.gesamtbudget ?? ''}
          className={inp}
          placeholder="0.00"
        />
      </div>

      {/* Status (nur beim Bearbeiten) */}
      {istBearbeiten && (
        <div>
          <label htmlFor="status" className={lbl}>Status</label>
          <select
            id="status"
            name="status"
            defaultValue={initialData?.status ?? 'offen'}
            className={inp}
          >
            {PROJEKT_STATUS.map((s) => (
              <option key={s.wert} value={s.wert}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Notizen */}
      <div>
        <label htmlFor="beschreibung" className={lbl}>Notizen</label>
        <textarea
          id="beschreibung"
          name="beschreibung"
          rows={4}
          defaultValue={initialData?.beschreibung ?? ''}
          className={`${inp} resize-none`}
          placeholder="Interne Notizen zum Projekt…"
        />
      </div>

      {/* Aktionen */}
      <div className="flex items-center gap-3 pt-2">
        <SpeichernButton />
        <a
          href={abbrechen}
          className="px-5 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Abbrechen
        </a>
      </div>
    </form>
  )
}

const lbl = 'block text-xs font-medium text-gray-700 mb-1.5'
const inp = 'w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition'
